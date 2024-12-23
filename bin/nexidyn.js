#!/usr/bin/env node

const Downloader = require('../lib/main');
const { execSync } = require('child_process');
const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, 'utf8'));

const args = process.argv.slice(2);
let fileUrl = '';
let output = '';
let threads = 4;
let retries = 3;
let connectionsPerServer = 2;
let parallelServers = 1;
let throttle = 0;
let debug = false;

function showHelp() {
  console.log(`
Usage: nexidyn <URL> [options]

Options:
  -o <filename>            Specify output filename
  -t <number>              Number of download threads (default: 4)
  -r <number>              Number of retries for failed chunks (default: 3)
  -c <number>              Number of simultaneous connections (default: 2)
  -p <number>              Number of parallel servers (default: 1)
  --throttle <number>      Throttle download speed (ms delay between chunks, default: 0)
  --debug, -d              Enable debug mode (optional: true/false)
  --version, -v            Show version number
  --help, -h               Show this help message
  --update, -u             Update nexidyn to the latest version

Example:
  nexidyn https://example.com/file.zip -o myfile.zip -t 8 -c 4 -r 5 -p 3 --throttle 50 -d true
  `);
}

function showVersion() {
  console.log(`nexidyn version ${packageJson.version}`);
}

async function updateNexidyn() {
  console.log('Checking for updates...');
  try {
    const currentVersion = packageJson.version;
    const latestVersion = execSync('npm view nexidyn@latest version').toString().trim();

    if (currentVersion === latestVersion) {
      console.log('nexidyn is already up to date.');
      return;
    }

    console.log(`Updating nexidyn from ${currentVersion} to ${latestVersion}...`);
    execSync('npm install -g nexidyn@latest', { stdio: 'inherit' });
    console.log('nexidyn has been updated to the latest version.');
  } catch (error) {
    console.error('Failed to update nexidyn:', error.message);
  }
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-o' && i + 1 < args.length) {
    output = args[++i];
  } else if (arg === '-t' && i + 1 < args.length) {
    threads = parseInt(args[++i], 10);
  } else if (arg === '-r' && i + 1 < args.length) {
    retries = parseInt(args[++i], 10);
  } else if (arg === '-c' && i + 1 < args.length) {
    connectionsPerServer = parseInt(args[++i], 10);
  } else if (arg === '-p' && i + 1 < args.length) {
    parallelServers = parseInt(args[++i], 10);
  } else if (arg === '--throttle' && i + 1 < args.length) {
    throttle = parseInt(args[++i], 10);
  } else if (arg === '--debug' || arg === '-d') {
    if (i + 1 < args.length && (args[i + 1] === 'true' || args[i + 1] === 'false')) {
      debug = args[++i] === 'true';
    } else {
      debug = true;
    }
  } else if (arg === '--version' || arg === '-v') {
    showVersion();
    process.exit(0);
  } else if (arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  } else if (arg === '--update' || arg === '-u') {
    updateNexidyn();
    process.exit(0);
  } else if (arg.startsWith("http://") || arg.startsWith("https://")) {
    fileUrl = arg;
  }
}

if (!fileUrl) {
  showHelp();
  process.exit(1);
}

const downloader = new Downloader();
downloader.setDebug(debug);

downloader.downloadFile(fileUrl, output, threads, retries, connectionsPerServer, parallelServers, throttle)
  .catch((err) => {
    console.error("\nDownload failed:", err.message);
    process.exit(1);
  });

