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


## 💡 Examples

1. Basic download:


```shellscript
nexidyn https://example.com/largefile.zip
```

2. Download with 8 threads and 4 connections:


```shellscript
nexidyn https://example.com/largefile.zip -t 8 -c 4
```

3. Download with custom filename and debug mode:


```shellscript
nexidyn https://example.com/video.mp4 -o myvideo.mp4 --debug
```

4. Download with all options specified:


```shellscript
nexidyn https://example.com/largefile.zip -o myfile.zip -t 6 -c 6 -r 5 -d true
```

5. Update NexiDyn to the latest version:


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
  4   // connections
)
.then(() => console.log('Download complete!'))
.catch(err => console.error('Download failed:', err));
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/mra1k3r0/nexidyn/issues).

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgements

- [Axios](https://github.com/axios/axios) for HTTP requests
- [Chalk](https://github.com/chalk/chalk) for terminal styling


