# Streamyx Chrome Extension

Intercept DRM requests, view logs from EME session and copy ready commands for Streamyx CLI

## Installation

1. Enable **Developer Mode** in [Chrome Extensions](chrome://extensions/)
2. Click on **Load Unpacked**
3. Select folder where you extracted zip downloaded from [Releases](https://github.com/vitalygashkov/streamyx-extension/releases) page
4. Done!

## Features

- **Notifications** about intercepted request with button to **copy Streamyx command** for your shell (run it using Streamyx >= v4.0.0-beta.46 to extract content decryption keys)
- Encrypted Media Extensions (EME) logging in Developer Tools console (**session ID, key ID, PSSH**, etc.)
- Request **blocking** to catch license requests with disposable / one time tokens (you can add your own list of servers to block in `./src/worker.js`)
