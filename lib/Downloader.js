const axios = require('axios');
const https = require("https");
const fs = require('fs');
const os = require('os');
const { formatBytes, formatTime, getLoadingAnimation, parseUrl, log, colorize, getTempFilePath, generateUniqueId, joinPath, getFileName, isDirectory } = require('./utils');
const { COLORS, USER_AGENTS } = require('./constants');

class Downloader {
  /**
   * Creates a new Downloader instance
   */
  constructor() {
    this.debug = false;
    this.sessionId = generateUniqueId();
    this.agent = new https.Agent({ keepAlive: true });
    this.resumeData = new Map();
  }

  /**
   * Sets the debug mode for the downloader
   * @param {boolean} value - Whether to enable debug mode
   */
  setDebug(value) {
    this.debug = value;
  }

  /**
   * Gets a random user agent from the list
   * @returns {string} A random user agent string
   */
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  /**
   * Pauses execution for a specified time
   * @param {number} ms - The number of milliseconds to sleep
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Detects the file type based on its byte signature
   * @param {Buffer} buffer - The buffer containing the file data
   * @returns {string|null} The detected file extension or null if not recognized
   */
  detectFileType(buffer) {
    const signatures = [
      { bytes: [0xFF, 0xD8, 0xFF], ext: 'jpg' },
      { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], ext: 'png' },
      { bytes: [0x47, 0x49, 0x46, 0x38], ext: 'gif' },
      { bytes: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], ext: 'webp' },
      { bytes: [0x3C, 0x3F, 0x78, 0x6D, 0x6C], ext: 'svg' },
      { bytes: [0x42, 0x4D], ext: 'bmp' },
      { bytes: [0x49, 0x49, 0x2A, 0x00], ext: 'tiff' },
      { bytes: [0x4D, 0x4D, 0x00, 0x2A], ext: 'tiff' },
      { bytes: [0x66, 0x74, 0x79, 0x70], ext: 'mp4' },
      { bytes: [0x6D, 0x70, 0x34], ext: 'mp4' },
      { bytes: [0x52, 0x49, 0x46, 0x46], ext: 'avi' },
      { bytes: [0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], ext: 'm4a' },
      { bytes: [0x49, 0x44, 0x33], ext: 'mp3' },
      { bytes: [0xFF, 0xFB], ext: 'mp3' },
    ];

    for (const sig of signatures) {
      if (buffer.slice(0, sig.bytes.length).equals(Buffer.from(sig.bytes))) {
        return sig.ext;
      }
    }

    const isText = buffer.every(byte => byte < 128);
    if (isText) {
      return 'txt';
    }

    return null;
  }

  /**
   * Gets file information from the given URL
   * @param {string} fileUrl - The URL of the file to download
   * @returns {Promise<Object>} An object containing fileSize and filename
   * @throws {Error} If unable to fetch file info
   */
  async getFileInfo(fileUrl) {
    try {
      log(colorize(COLORS.INFO)(`Fetching file info for: ${fileUrl}`), this.debug);
      const response = await axios.head(fileUrl, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        validateStatus: function (status) {
          return status < 500;
        }
      });

      if (response.status !== 200) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const fileSize = response.headers['content-length'] ? parseInt(response.headers['content-length'], 10) : null;
      if (fileSize === null) {
        log(colorize(COLORS.WARNING)(`File size unknown for ${fileUrl}. Proceeding without chunking.`), this.debug);
      }

      let { filename, extension } = parseUrl(fileUrl);

      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          const dispositionFilename = filenameMatch[1];
          const dispositionExtMatch = dispositionFilename.match(/\.([^.]+)$/);
          if (dispositionExtMatch) {
            extension = dispositionExtMatch[1];
          }
          filename = dispositionFilename.slice(0, -extension.length - 1);
        }
      }

      if (!extension) {
        const contentType = response.headers['content-type'];
        if (contentType) {
          const mimeToExt = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg',
            'image/bmp': 'bmp',
            'image/tiff': 'tiff',
            'video/mp4': 'mp4',
            'video/x-msvideo': 'avi',
            'video/avi': 'avi',
            'audio/mp4': 'm4a',
            'audio/x-m4a': 'm4a',
            'audio/mpeg': 'mp3',
            'audio/mp3': 'mp3',
            'text/plain': 'txt',
            'text/html': 'html',
            'text/css': 'css',
            'text/javascript': 'js',
            'application/json': 'json',
            'application/xml': 'xml',
          };
          extension = mimeToExt[contentType.split(';')[0]] || '';
        }
      }

      if (!extension) {
        const contentResponse = await axios.get(fileUrl, {
          headers: { 'User-Agent': this.getRandomUserAgent() },
          responseType: 'arraybuffer',
          maxContentLength: 1024 * 1024,
          timeout: 5000
        });
        extension = this.detectFileType(Buffer.from(contentResponse.data)) || '';
      }

      const fullFilename = `${filename}${extension ? `.${extension}` : ''}`;

      log(colorize(COLORS.INFO)(`File size: ${fileSize !== null ? colorize(COLORS.HIGHLIGHT)(formatBytes(fileSize)) : 'unknown'}`), this.debug);
      log(colorize(COLORS.INFO)(`File name: ${colorize(COLORS.HIGHLIGHT)(fullFilename)}`), this.debug);
      return { fileSize, filename: fullFilename };
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP Error: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('No response received from server');
      } else {
        throw new Error(`Failed to fetch file info: ${error.message}`);
      }
    }
  }

  /**
   * Gets the temporary path for a chunk file
   * @param {number} index - The index of the chunk
   * @returns {string} The temporary file path for the chunk
   */
  getTempChunkPath(index) {
    return joinPath(os.tmpdir(), `nexidyn_${this.sessionId}_chunk_${index}`);
  }

  /**
   * Downloads a chunk of the file with resume capability
   * @param {string} fileUrl - The URL of the file to download
   * @param {number} start - The starting byte of the chunk
   * @param {number} end - The ending byte of the chunk
   * @param {number} index - The index of the chunk
   * @param {Function} progressCallback - Callback function to report progress
   * @param {number} retries - Number of retry attempts
   * @param {number} throttle - Throttle value in milliseconds
   * @param {string} outputFile - The output file path
   * @returns {Promise<string>} The path of the downloaded chunk file
   */
  async downloadChunkWithResume(fileUrl, start, end, index, progressCallback, retries, throttle, outputFile) {
    const chunkFile = this.getTempChunkPath(index);
    let resumePosition = start;

    if (fs.existsSync(chunkFile)) {
      const stats = fs.statSync(chunkFile);
      resumePosition = start + stats.size;
      log(colorize(COLORS.INFO)(`Resuming chunk ${index} from byte ${resumePosition}`), this.debug);
    }

    while (resumePosition <= end) {
      try {
        await this.downloadChunk(fileUrl, resumePosition, end, index, progressCallback, retries, throttle, chunkFile);
        break;
      } catch (error) {
        log(colorize(COLORS.WARNING)(`Connection lost. Retrying chunk ${index} from byte ${resumePosition}`), this.debug);
        await this.sleep(5000);
      }
    }

    return chunkFile;
  }

  /**
   * Downloads a single chunk of the file
   * @param {string} fileUrl - The URL of the file to download
   * @param {number} start - The starting byte of the chunk
   * @param {number} end - The ending byte of the chunk
   * @param {number} index - The index of the chunk
   * @param {Function} progressCallback - Callback function to report progress
   * @param {number} retries - Number of retry attempts
   * @param {number} throttle - Throttle value in milliseconds
   * @param {string} chunkFile - The path to save the chunk file
   * @returns {Promise<string>} The path of the downloaded chunk file
   * @throws {Error} If unable to download the chunk after retries
   */
  async downloadChunk(fileUrl, start, end, index, progressCallback, retries, throttle, chunkFile) {
    log(colorize(COLORS.INFO)(`Downloading chunk ${index}: bytes=${start}-${end}`), this.debug);
    let attempts = 0;
    while (attempts <= retries) {
      try {
        const response = await axios({
          url: fileUrl,
          method: 'GET',
          responseType: 'stream',
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Range': `bytes=${start}-${end}`,
          },
          httpsAgent: this.agent,
        });

        const writer = fs.createWriteStream(chunkFile, { flags: 'a' });
        let downloadedBytes = 0;

        return new Promise((resolve, reject) => {
          response.data.on('data', async (chunk) => {
            downloadedBytes += chunk.length;
            progressCallback(chunk.length);
            writer.write(chunk);

            if (throttle > 0) {
              await this.sleep(throttle);
            }
          });

          response.data.on('end', () => {
            writer.end();
            log(colorize(COLORS.SUCCESS)(`Chunk ${index} downloaded to ${chunkFile}`), this.debug);
            resolve(chunkFile);
          });

          writer.on('error', (err) => {
            log(colorize(COLORS.ERROR)(`Error downloading chunk ${index}: ${err}`), this.debug);
            reject(err);
          });
        });
      } catch (error) {
        attempts++;
        if (attempts > retries) {
          throw new Error(`Failed to download chunk ${index} after ${retries} retries: ${error.message}`);
        }
        log(colorize(COLORS.WARNING)(`Retry ${attempts}/${retries} for chunk ${index}`), this.debug);
        await this.sleep(1000 * attempts);
      }
    }
  }

  /**
   * Merges downloaded chunks into a single file
   * @param {string} outputFile - The path of the output file
   * @param {number} totalChunks - The total number of chunks to merge
   * @returns {Promise<void>}
   */
  async mergeChunks(outputFile, totalChunks) {
    const writer = fs.createWriteStream(outputFile);
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = this.getTempChunkPath(i);
      await new Promise((resolve, reject) => {
        const reader = fs.createReadStream(chunkPath);
        reader.pipe(writer, { end: false });
        reader.on('end', () => {
          fs.unlinkSync(chunkPath);
          resolve();
        });
        reader.on('error', reject);
      });
    }
    writer.end();
  }

  /**
   * Downloads the entire file
   * @param {string} fileUrl - The URL of the file to download
   * @param {string} output - The output file path
   * @param {number} threads - Number of download threads
   * @param {number} retries - Number of retry attempts
   * @param {number} connectionsPerServer - Number of simultaneous connections per server
   * @param {number} parallelServers - Number of parallel servers to use
   * @param {number} throttle - Throttle value in milliseconds
   * @returns {Promise<void>}
   * @throws {Error} If unable to download the file
   */
  async downloadFile(fileUrl, output, threads, retries, connectionsPerServer, parallelServers, throttle) {
    try {
      const { fileSize, filename } = await this.getFileInfo(fileUrl);

      let outputPath;
      if (!output || output === '.') {
        outputPath = joinPath(process.cwd(), filename);
      } else {
        const parts = output.split('/');
        const wildcardIndex = parts.findIndex(part => part.includes('*'));

        if (wildcardIndex !== -1) {
          const baseDir = parts.slice(0, wildcardIndex).join('/');
          const pattern = new RegExp('^' + parts[wildcardIndex].replace(/\*/g, '.*') + '$');

          const matchingDirs = fs.readdirSync(baseDir || '.')
            .filter(item => fs.statSync(joinPath(baseDir, item)).isDirectory())
            .filter(item => pattern.test(item));

          if (matchingDirs.length === 0) {
            throw new Error(`No matching directory found for pattern: ${parts[wildcardIndex]}`);
          }

          const matchedDir = matchingDirs[0];
          const remainingPath = parts.slice(wildcardIndex + 1).join('/');
          outputPath = joinPath(baseDir, matchedDir, remainingPath, filename);
        } else {
          outputPath = joinPath(output, filename);
        }
      }

      const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      log(colorize(COLORS.INFO)(`Output path: ${outputPath}`), this.debug);

      if (fileSize === null) {
        log(colorize(COLORS.INFO)(`Downloading file without chunking due to unknown size.`), this.debug);
        return this.downloadWithoutChunking(fileUrl, outputPath);
      }

      const servers = await this.getParallelServers(fileUrl, parallelServers);
      const chunkSize = Math.ceil(fileSize / (threads * servers.length));
      log(colorize(COLORS.INFO)(`Total threads: ${colorize(COLORS.HIGHLIGHT)(threads)}, Servers: ${colorize(COLORS.HIGHLIGHT)(servers.length)}, Chunk size: ${colorize(COLORS.HIGHLIGHT)(formatBytes(chunkSize))}, Retries: ${colorize(COLORS.HIGHLIGHT)(retries)}, Connections per server: ${colorize(COLORS.HIGHLIGHT)(connectionsPerServer)}`), this.debug);

      const totalDownloaded = { size: 0 };
      const startTime = Date.now();
      let lastUpdateTime = startTime;
      let lastDownloadedSize = 0;
      let lastDetailedLogTime = startTime;

      const getNextAnimationFrame = getLoadingAnimation();

      const downloadPromises = [];
      for (let serverIndex = 0; serverIndex < servers.length; serverIndex++) {
        const serverUrl = servers[serverIndex];
        for (let i = 0; i < threads; i++) {
          const start = (serverIndex * threads + i) * chunkSize;
          const end = Math.min((serverIndex * threads + i + 1) * chunkSize - 1, fileSize - 1);
          downloadPromises.push(
            this.downloadChunkWithResume(serverUrl, start, end, serverIndex * threads + i, (chunkSize) => {
              totalDownloaded.size += chunkSize;
              this.updateProgress(totalDownloaded, fileSize, startTime, lastUpdateTime, lastDownloadedSize, lastDetailedLogTime, getNextAnimationFrame);
              lastUpdateTime = Date.now();
              lastDownloadedSize = totalDownloaded.size;
            }, retries, throttle, outputPath)
          );
        }
      }

      for (let i = 0; i < downloadPromises.length; i += connectionsPerServer) {
        const batch = downloadPromises.slice(i, i + connectionsPerServer);
        await Promise.all(batch);
      }

      console.log();

      await this.mergeChunks(outputPath, downloadPromises.length);

      const totalTime = (Date.now() - startTime) / 1000;
      const averageSpeed = (fileSize / totalTime);

      log(colorize(COLORS.SUCCESS)(`File downloaded successfully to ${outputPath}`), this.debug, true);
      log(colorize(COLORS.INFO)(`Total time: ${colorize(COLORS.HIGHLIGHT)(formatTime(totalTime))}`), this.debug, true);
      log(colorize(COLORS.INFO)(`Average speed: ${colorize(COLORS.HIGHLIGHT)(formatBytes(averageSpeed))}/s`), this.debug, true);
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Gets parallel servers for downloading
   * @param {string} fileUrl - The URL of the file to download
   * @param {number} parallelServers - Number of parallel servers to use
   * @returns {Promise<string[]>} Array of server URLs
   */
  async getParallelServers(fileUrl, parallelServers) {
    if (parallelServers <= 1) {
      return [fileUrl];
    }

    try {
      const response = await axios.get(fileUrl, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        maxRedirects: 5,
      });

      const finalUrl = response.request.res.responseUrl;
      const parsedUrl = new URL(finalUrl);

      const servers = [];
      for (let i = 0; i < parallelServers; i++) {
        const serverUrl = new URL(parsedUrl);
        serverUrl.hostname = `${String.fromCharCode(97 + i)}.${parsedUrl.hostname}`;
        servers.push(serverUrl.toString());
      }

      return servers;
    } catch (error) {
      log(colorize(COLORS.WARNING)(`Failed to get parallel servers: ${error.message}. Using single server.`), this.debug);
      return [fileUrl];
    }
  }

  /**
   * Updates the progress of the download
   * @param {Object} totalDownloaded - Object containing the total downloaded size
   * @param {number} fileSize - The total file size
   * @param {number} startTime - The start time of the download
   * @param {number} lastUpdateTime - The time of the last update
   * @param {number} lastDownloadedSize - The size downloaded at the last update
   * @param {number} lastDetailedLogTime - The time of the last detailed log
   * @param {Function} getNextAnimationFrame - Function to get the next animation frame
   */
  updateProgress(totalDownloaded, fileSize, startTime, lastUpdateTime, lastDownloadedSize, lastDetailedLogTime, getNextAnimationFrame) {
    const currentTime = Date.now();
    const elapsedTimeSinceLastUpdate = (currentTime - lastUpdateTime) / 1000;

    if (elapsedTimeSinceLastUpdate >= 1) {
      const downloadedSinceLastUpdate = totalDownloaded.size - lastDownloadedSize;
      const speed = downloadedSinceLastUpdate / elapsedTimeSinceLastUpdate;
      const formattedSpeed = formatBytes(speed);
      const percent = fileSize ? (totalDownloaded.size / fileSize) * 100 : null;
      const timeRemaining = fileSize ? ((fileSize - totalDownloaded.size) / speed) : null;
      const formattedTimeRemaining = timeRemaining ? formatTime(timeRemaining) : 'unknown';
      const formattedDownloadedSize = formatBytes(totalDownloaded.size);
      const formattedTotalSize = fileSize ? formatBytes(fileSize) : 'unknown';

      const detailedProgress = `${getNextAnimationFrame()} Downloading... ` +
        `${colorize(COLORS.HIGHLIGHT)(formattedDownloadedSize)}/${colorize(COLORS.HIGHLIGHT)(formattedTotalSize)} ${percent !== null ? `(${colorize(COLORS.HIGHLIGHT)(percent.toFixed(2))}%)` : ''}, ` +
        `Speed: ${colorize(COLORS.HIGHLIGHT)(formattedSpeed)}/s, ` +
        `ETA: ${colorize(COLORS.HIGHLIGHT)(formattedTimeRemaining)}`;

      if (this.debug || currentTime - lastDetailedLogTime >= 180000) {
        console.clear();
        console.log(detailedProgress);
        lastDetailedLogTime = currentTime;
      } else {
        process.stdout.write(`\r${detailedProgress}`);
      }
    }
  }

  /**
   * Downloads the file without chunking
   * @param {string} fileUrl - The URL of the file to download
   * @param {string} output - The output file path
   * @returns {Promise<void>}
   */
  async downloadWithoutChunking(fileUrl, output) {
    const response = await axios.get(fileUrl, {
      headers: { 'User-Agent': this.getRandomUserAgent() },
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(output);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        log(colorize(COLORS.SUCCESS)(`File downloaded successfully to ${output}`), this.debug, true);
        resolve();
      });
      writer.on('error', (error) => reject(error));
    });
  }
}

module.exports = Downloader;