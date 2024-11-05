const chalk = require('chalk');
const os = require('os');

/**** 
 * Creates a fallback chalk object for environments where chalk styling isn't supported
 * @returns {Object} An object with no-op functions for hex, red, green, yellow, and blue
 ****/
const createFallbackChalk = () => {
    const noOp = (text) => text;
    return {
        hex: () => noOp,
        red: noOp,
        green: noOp,
        yellow: noOp,
        blue: noOp,
    };
};

/**** 
 * Attempts to use chalk, falls back to plain text if styling isn't supported
 * @returns {Object} Either the chalk object or a fallback object
 ****/
const getChalk = () => {
    try {
        chalk.hex('#ffffff')('test');
        return chalk;
    } catch (error) {
        console.warn('Terminal styling not supported, falling back to plain text');
        return createFallbackChalk();
    }
};

const safeChalk = getChalk();

/**** 
 * Formats bytes to a human-readable string
 * @param {number} bytes - The number of bytes to format
 * @returns {string} The formatted string (e.g., "1.50 MiB")
 ****/
function formatBytes(bytes) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let index = 0;
    let formattedSize = bytes;

    while (formattedSize >= 1024 && index < units.length - 1) {
        formattedSize /= 1024;
        index++;
    }

    return `${formattedSize.toFixed(2)} ${units[index]}`;
}

/**** 
 * Formats seconds to HH:MM:SS
 * @param {number} seconds - The number of seconds to format
 * @returns {string} The formatted time string (e.g., "01:23:45")
 ****/
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**** 
 * Creates a function that returns the next character in a loading animation sequence
 * @returns {Function} A function that returns the next character in the sequence
 ****/
function getLoadingAnimation() {
    const spinnerChars = ['|', '/', '-', '\\'];
    let index = 0;
    return () => {
        const char = spinnerChars[index];
        index = (index + 1) % spinnerChars.length;
        return char;
    };
}

/**** 
 * Parses a URL and extracts relevant information
 * @param {string} fileUrl - The URL to parse
 * @returns {Object} An object containing parsed URL information
 * @property {string} filename - The extracted or generated filename
 * @property {URLSearchParams} searchParams - The URL's search parameters
 * @property {string} protocol - The URL's protocol
 * @property {string} hostname - The URL's hostname
 * @property {string} port - The URL's port
 * @property {string} pathname - The URL's pathname
 * @property {string} search - The URL's search string
 ****/
function parseUrl(fileUrl) {
    try {
        const url = new URL(fileUrl);
        let filename = '';
        let searchParams = url.searchParams;

        if (searchParams.has('download_links')) {
            const innerUrl = new URL(searchParams.get('download_links'));
            if (innerUrl.pathname.toLowerCase() === '/download.php' && innerUrl.searchParams.has('url')) {
                const encodedUrl = innerUrl.searchParams.get('url');
                try {
                    const cleanEncodedUrl = encodedUrl.replace(/[^A-Za-z0-9+/=]/g, '');
                    const decodedUrl = Buffer.from(cleanEncodedUrl, 'base64').toString('utf-8');

                    const filenameMatch = decodedUrl.match(/title=([^&]+)/);
                    if (filenameMatch) {
                        filename = decodeURIComponent(filenameMatch[1]);
                    } else {
                        const pathParts = decodedUrl.split('/');
                        filename = pathParts[pathParts.length - 1].split('?')[0];
                    }
                } catch (error) {
                    console.warn(`Failed to decode inner URL parameter: ${error.message}`);
                }
            }
        }

        if (!filename || !/^[\x20-\x7E]+$/.test(filename)) {
            filename = url.pathname.split('/').pop() || 'downloaded_file';
        }

        filename = filename.replace(/[^a-zA-Z0-9.-_]/g, '_');

        let extension = '.mp4';
        if (filename.includes('.')) {
            extension = filename.substring(filename.lastIndexOf('.'));
            filename = filename.substring(0, filename.lastIndexOf('.'));
        }

        if (!filename) {
            const randomString = Math.random().toString(36).substring(2, 8);
            filename = `downloaded_file_${randomString}${extension}`;
        } else {
            filename = `${filename}${extension}`;
        }

        return {
            filename,
            searchParams,
            protocol: url.protocol.slice(0, -1),
            hostname: url.hostname,
            port: url.port,
            pathname: url.pathname,
            search: url.search
        };
    } catch (error) {
        console.error(`Error parsing URL: ${error.message}`);
        const randomString = Math.random().toString(36).substring(2, 8);
        return { filename: `downloaded_file_${randomString}.mp4`, searchParams: new URLSearchParams() };
    }
}

/**** 
 * Logs a message if debug mode is on or if forced
 * @param {string} message - The message to log
 * @param {boolean} [debug=false] - Whether debug mode is on
 * @param {boolean} [forceLog=false] - Whether to force logging regardless of debug mode
 ****/
function log(message, debug = false, forceLog = false) {
    if (debug || forceLog) {
        console.log(message);
    }
}

/**** 
 * Creates a function that applies a color to text using chalk
 * @param {string} color - The color to apply
 * @returns {Function} A function that applies the specified color to text
 ****/
function colorize(color) {
    return (text) => {
        try {
            return safeChalk.hex(color)(text);
        } catch (error) {
            return text;
        }
    };
}

/**** 
 * Generates a temporary file path for a chunk
 * @param {number} index - The index of the chunk
 * @returns {string} The temporary file path
 ****/
function getTempFilePath(index) {
    return `${os.tmpdir()}/chunk-${index}.tmp`;
}

/**** 
 * Generates a unique ID of specified length
 * @param {number} [length=16] - The length of the ID to generate
 * @returns {string} The generated unique ID
 ****/
function generateUniqueId(length = 16) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

module.exports = {
    formatBytes,
    formatTime,
    getLoadingAnimation,
    parseUrl,
    log,
    colorize,
    getTempFilePath,
    generateUniqueId
};
