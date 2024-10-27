# azot

[![npm version](https://img.shields.io/npm/v/azot?style=flat&color=black)](https://www.npmjs.com/package/azot)
![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/vitalygashkov/azot/latest/total?style=flat&color=black)
[![npm downloads](https://img.shields.io/npm/dt/azot?style=flat&color=black)](https://www.npmjs.com/package/azot)

Azot (Russian word for "nitrogen", pronounced `/azо́t/`) is a set of tools (JavaScript library, command-line utility and browser extension) for diagnosing, researching, and pentesting [Google's](https://about.google/) [Widevine](https://www.widevine.com/about) [DRM](https://www.urbandictionary.com/define.php?term=DRM).

> Azot is still in the early stages of development, so until version 1.0 is released, performance may be unstable and major changes may be made

## Features

- **Network-independent interception**: everything works even with one-time tokens and custom request body/response format.
- **Custom client support**: WVD v2, device_client_id_blob + device_private_key, client_id.bin + private_key.pem
- **Logging** details from EME events in Developer Tools console of current page
- **Manifest V3** compliant browser extension
- **Converting clients** between formats via CLI
- **Encrypted Media Extensions API** compatibility via `requestMediaKeySystemAccess()` method
- **Runtime agnostic** core: works in Node.js, Bun, Deno, browsers and more
- **Minimal** dependencies

## Installation

> JavaScript library and command-line tool installation requires pre-installed JavaScript runtime (e.g. Node.js).

### JavaScript library

```bash
npm install azot
```

### Command-line tool

```bash
npm install -g azot
```

### Browser extension

1. Enable **Developer Mode** in [Chrome Extensions](chrome://extensions/) page
2. Click on **Load Unpacked**
3. Select folder where you extracted zip downloaded from [Releases](https://github.com/vitalygashkov/azot/releases) page
4. Done!

## Usage

### Example with Encrypted Media Extensions API

Source code for example available [here](https://github.com/vitalygashkov/orlan/blob/main/examples/demo/eme.js). It's a minimal example of using `azot` to get a license for Bitmovin's Art of Motion Demo. This example similar to [example from EME](https://www.w3.org/TR/encrypted-media-2/#example-8).

There are some differences from the native EME implementation:

1. You must import your Widevine client to obtain a license.
2. In the `keyStatuses` field, Map's key is not just the key ID (like in EME), but pair with ID and value. For example, if key ID in HEX is `35e7eff366b24121a261832f3368146f` and content key itself is `f01471043a064e039a602346845b690f` then Map's key will be `35e7eff366b24121a261832f3368146f:f01471043a064e039a602346845b690f` (but as binary with `BufferSource` type) instead of just `35e7eff366b24121a261832f3368146f`.
