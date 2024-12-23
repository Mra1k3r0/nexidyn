<div align="center">
  <h1>⚡️ NexiDyn</h1>
  <p><strong>A lightning-fast, multi-threaded downloader CLI tool built with Node.js</strong></p>
  <p>
    NexiDyn is a powerful CLI downloader that uses Node.js to provide blazing-fast speeds through multi-threading and intelligent chunk management. Perfect for large files and unstable connections, it offers a robust set of features for efficient and reliable downloads.
  </p>

  [![npm version](https://img.shields.io/npm/v/nexidyn.svg?style=flat-square)](https://www.npmjs.org/package/nexidyn)
  [![Build status](https://img.shields.io/github/actions/workflow/status/mra1k3r0/nexidyn/ci.yml?branch=master&label=CI&logo=github&style=flat-square)](https://github.com/mra1k3r0/nexidyn/actions/workflows/ci.yml)
  [![install size](https://img.shields.io/badge/dynamic/json?url=https://packagephobia.com/v2/api.json?p=nexidyn&query=$.install.pretty&label=install%20size&style=flat-square)](https://packagephobia.now.sh/result?p=nexidyn)
  [![minzipped size](https://img.shields.io/bundlephobia/minzip/nexidyn)](https://bundlephobia.com/package/nexidyn)
  [![npm downloads](https://img.shields.io/npm/dm/nexidyn.svg?style=flat-square)](https://npm-stat.com/charts.html?package=nexidyn)
  [![Known Vulnerabilities](https://snyk.io/test/npm/nexidyn/badge.svg)](https://snyk.io/test/npm/nexidyn)

  <p>
    <a href="#-installation">Installation</a> •
    <a href="#-usage">Usage</a> •
    <a href="#-features">Features</a> •
    <a href="#-examples">Examples</a> •
    <a href="#-advanced-usage">Advanced Usage</a> •
    <a href="#-contributing">Contributing</a> •
    <a href="#-license">License</a>
  </p>
</div>

<hr>

## 🚀 Installation

Install NexiDyn globally using npm:

```bash
npm install -g nexidyn
```

## 🎯 Usage

Basic usage:

```shellscript
nexidyn <URL>
```

With options:

```shellscript
nexidyn <URL> [options]
```

### Options

| Option | Description | Default
|-----|-----|-----
| `-o <filename>` | Specify output filename | Detected from URL
| `-t <number>` | Number of download threads | 4
| `-r <number>` | Number of retries for failed chunks | 3
| `-c <number>` | Number of simultaneous connections | 2
| `-p <number>` | Number of parallel servers | 1
| `--throttle <number>` | Throttle download speed (ms delay between chunks) | 0
| `--debug`, `-d` | Enable debug mode (optional: true/false) | false
| `--version`, `-v` | Show version number | -
| `--help`, `-h` | Show help message | -
| `--update`, `-u` | Update nexidyn to latest version | -


## ✨ Features

- 🚄 **Multi-threaded downloads**: Significantly faster than single-threaded downloaders
- 🔁 **Auto-retry**: Automatically retries failed chunks
- 🔌 **Connection control**: Manage the number of simultaneous connections
- 📊 **Real-time progress**: View download progress, speed, and ETA in real-time
- 🔍 **Debug mode**: Detailed logging for troubleshooting
- 📁 **Auto filename detection**: Automatically detects filename from URL or headers
- 🔄 **Self-update**: Easy updating to the latest version
- 💾 **Current directory**: Downloads files to your current working directory
- 🔀 **Parallel servers**: Utilize multiple servers for even faster downloads
- 🐢 **Download throttling**: Control download speed to avoid network congestion
- 📂 **Flexible output paths**: Support for wildcards in directory specification
- 🔁 **Resume capability**: Ability to resume interrupted downloads


## 💡 Examples

1. Basic download:


```shellscript
nexidyn https://example.com/largefile.zip
```

2. Download with 8 threads, 4 connections, and 2 parallel servers:


```shellscript
nexidyn https://example.com/largefile.zip -t 8 -c 4 -p 2
```

3. Download with custom filename, debug mode, and throttling:


```shellscript
nexidyn https://example.com/video.mp4 -o myvideo.mp4 --debug --throttle 50
```

4. Download with wildcard output directory:


```shellscript
nexidyn https://example.com/largefile.zip -o "downloads/*/misc/"
```

5. Download with all options specified:


```shellscript
nexidyn https://example.com/largefile.zip -o myfile.zip -t 6 -c 6 -r 5 -p 3 --throttle 100 -d true
```

6. Update NexiDyn to the latest version:


```shellscript
nexidyn --update
```

## 🔧 Advanced Usage

### As a Node.js module

You can also use NexiDyn programmatically in your Node.js projects:

```javascript
const Downloader = require('nexidyn');

const downloader = new Downloader();
downloader.setDebug(true);

downloader.downloadFile(
  'https://example.com/largefile.zip',
  'output.zip',
  8,  // threads
  3,  // retries
  4,  // connections
  2,  // parallel servers
  50  // throttle
)
.then(() => console.log('Download complete!'))
.catch(err => console.error('Download failed:', err));
```

## 🤝 Contributing

We welcome contributions to NexiDyn! If you have ideas for improvements or have found a bug, please open an issue or submit a pull request on our [GitHub repository](https://github.com/mra1k3r0/nexidyn). Your input helps make NexiDyn better for everyone.


## 📜 License

Distributed under the MIT License. See [`LICENSE`](https://github.com/Mra1k3r0/nexidyn/blob/master/LICENSE) for more information.

## 🙏 Acknowledgements

- [Axios](https://github.com/axios/axios) for HTTP requests
- [Chalk](https://github.com/chalk/chalk) for terminal styling