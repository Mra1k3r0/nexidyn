const chalk = require('chalk');
const os = require('os');

// Fallback for environments where chalk styling isn't supported
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

// Try to use chalk, fallback to plain text if styling isn't supported
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

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getLoadingAnimation() {
    const spinnerChars = ['|', '/', '-', '\\'];
    let index = 0;
    return () => {
        const char = spinnerChars[index];
        index = (index + 1) % spinnerChars.length;
        return char;
    };
}

function parseUrl(fileUrl) {
    const urlParts = fileUrl.split('/');
    let filename = urlParts[urlParts.length - 1];

    const queryIndex = filename.indexOf('?');
    if (queryIndex !== -1) {
        filename = filename.substring(0, queryIndex);
    }

    return { filename };
}

function log(message, debug = false, forceLog = false) {
    if (debug || forceLog) {
        console.log(message);
    }
}

function colorize(color) {
    return (text) => {
        try {
            return safeChalk.hex(color)(text);
        } catch (error) {
            return text; 
        }
    };
}

function getTempFilePath(index) {
    return `${os.tmpdir()}/chunk-${index}.tmp`;
}

module.exports = {
    formatBytes,
    formatTime,
    getLoadingAnimation,
    parseUrl,
    log,
    colorize,
    getTempFilePath
};