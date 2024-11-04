const axios = require('axios');
const fs = require('fs');
const os = require('os');
const { formatBytes, formatTime, getLoadingAnimation, parseUrl, log, colorize, getTempFilePath } = require('./utils');
const { COLORS, USER_AGENT } = require('./constants');

class Downloader {
  constructor() {
    this.debug = false;
  }

  setDebug(value) {
    this.debug = value;

  }


  detectFileType(buffer) {
    const signatures = [
      { bytes: [0xFF, 0xD8, 0xFF], ext: 'jpg' },
      { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], ext: 'png' },
      { bytes: [0x47, 0x49, 0x46, 0x38], ext: 'gif' },
      { bytes: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], ext: 'webp' },
      { bytes: [0x25, 0x50, 0x44, 0x46], ext: 'pdf' },
      { bytes: [0x50, 0x4B, 0x03, 0x04], ext: 'zip' },
      // Add more signatures as needed
    ];

    for (const sig of signatures) {
      if (buffer.slice(0, sig.bytes.length).equals(Buffer.from(sig.bytes))) {
        return sig.ext;
      }
    }

    return null;
  }

  async getFileInfo(fileUrl) {
    try {
      log(colorize(COLORS.INFO)(`Fetching file info for: ${fileUrl}`), this.debug);
      const response = await axios.head(fileUrl, {
        headers: { 'User-Agent': USER_AGENT },
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

      let filename = '';
      let extension = '';

      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
          const extMatch = filename.match(/\.([^.]+)$/);
          if (extMatch) {
            extension = extMatch[1];
          }
        }
      }

      if (!filename) {
        const { filename: parsedFilename } = parseUrl(fileUrl);
        filename = parsedFilename;
        const extMatch = filename.match(/\.([^.]+)$/);
        if (extMatch) {
          extension = extMatch[1];
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
            'application/pdf': 'pdf',
            'application/zip': 'zip',
          };
          extension = mimeToExt[contentType.split(';')[0]] || '';
        }
      }

      if (!extension) {
        const contentResponse = await axios.get(fileUrl, {
          headers: { 'User-Agent': USER_AGENT },
          responseType: 'arraybuffer',
          validateStatus: function (status) {
            return status < 500;
          }
        });
        extension = this.detectFileType(Buffer.from(contentResponse.data)) || '';
      }

      if (!filename) {
        filename = 'downloaded_file';
      }

      if (extension && !filename.endsWith(`.${extension}`)) {
        filename = `${filename}.${extension}`;
      }

      log(colorize(COLORS.INFO)(`File size: ${fileSize !== null ? colorize(COLORS.HIGHLIGHT)(formatBytes(fileSize)) : 'unknown'}`), this.debug);
      log(colorize(COLORS.INFO)(`File name: ${colorize(COLORS.HIGHLIGHT)(filename)}`), this.debug);
      return { fileSize, filename };
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


  async downloadChunk(fileUrl, start, end, index, progressCallback, retries) {
    log(colorize(COLORS.INFO)(`Downloading chunk ${index}: bytes=${start}-${end}`), this.debug);
    let attempts = 0;
    while (attempts <= retries) {
      try {
        const response = await axios({
          url: fileUrl,
          method: 'GET',
          responseType: 'stream',
          headers: {
            'User-Agent': USER_AGENT,
            'Range': `bytes=${start}-${end}`,
          }
        });

        const tempPath = getTempFilePath(index);
        const writer = fs.createWriteStream(tempPath);
        let downloadedBytes = 0;

        return new Promise((resolve, reject) => {
          response.data.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            progressCallback(chunk.length);
          });

          response.data.pipe(writer);
          writer.on('finish', () => {
            log(colorize(COLORS.SUCCESS)(`Chunk ${index} downloaded to ${tempPath}`), this.debug);
            resolve(tempPath);
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
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

  }

  async downloadFile(fileUrl, output, threads, retries, connectionsPerServer) {
    try {
      const { fileSize, filename } = await this.getFileInfo(fileUrl);

      if (!output) {
        output = filename;
      }

      if (fileSize === null) {
        log(colorize(COLORS.INFO)(`Downloading file without chunking due to unknown size.`), this.debug);

        const response = await axios.get(fileUrl, {
          headers: { 'User-Agent': USER_AGENT },
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

      const chunkSize = Math.ceil(fileSize / threads);
      log(colorize(COLORS.INFO)(`Total threads: ${colorize(COLORS.HIGHLIGHT)(threads)}, Chunk size: ${colorize(COLORS.HIGHLIGHT)(formatBytes(chunkSize))}, Retries: ${colorize(COLORS.HIGHLIGHT)(retries)}, Connections per server: ${colorize(COLORS.HIGHLIGHT)(connectionsPerServer)}`), this.debug);

      const totalDownloaded = { size: 0 };
      const startTime = Date.now();
      let lastUpdateTime = startTime;
      let lastDownloadedSize = 0;
      let lastDetailedLogTime = startTime;

      const getNextAnimationFrame = getLoadingAnimation();

      const downloadPromises = [];
      for (let i = 0; i < threads; i++) {
        const start = i * chunkSize;
        const end = i === threads - 1 ? fileSize - 1 : (i + 1) * chunkSize - 1;
        downloadPromises.push(
          this.downloadChunk(fileUrl, start, end, i, (chunkSize) => {
            totalDownloaded.size += chunkSize;

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

              lastUpdateTime = currentTime;
              lastDownloadedSize = totalDownloaded.size;
            }
          }, retries)
        );
      }

      for (let i = 0; i < downloadPromises.length; i += connectionsPerServer) {
        const batch = downloadPromises.slice(i, i + connectionsPerServer);
        await Promise.all(batch);
      }

      console.log();

      const outputPath = `${process.cwd()}/${output}`;
      const writer = fs.createWriteStream(outputPath);
      for (let i = 0; i < threads; i++) {
        const chunkPath = getTempFilePath(i);
        const data = fs.readFileSync(chunkPath);
        writer.write(data);
        fs.unlinkSync(chunkPath);
      }
      writer.end();
      
      const totalTime = (Date.now() - startTime) / 1000;
      const averageSpeed = (fileSize / totalTime);
      log(colorize(COLORS.SUCCESS)(`File downloaded successfully to ${outputPath}`), this.debug, true);
      log(colorize(COLORS.INFO)(`Total time: ${colorize(COLORS.HIGHLIGHT)(formatTime(totalTime))}`), this.debug, true);
      log(colorize(COLORS.INFO)(`Average speed: ${colorize(COLORS.HIGHLIGHT)(formatBytes(averageSpeed))}/s`), this.debug, true);
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }


}

module.exports = Downloader;