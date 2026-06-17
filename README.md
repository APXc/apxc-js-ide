# ⚡ APXC JS IDE

A desktop JavaScript/Node.js playground for Windows and Linux — inspired by the TypeScript Playground.

Run code snippets instantly, manage npm packages, and organize your experiments in multiple tabs, without ever creating a project or installing dependencies manually.

---

## Features

- **Monaco Editor** — the same editor engine used in Visual Studio Code, with full syntax highlighting, IntelliSense, and auto-formatting for JavaScript.
- **Multi-tab workspace** — open as many tabs as you need. Each tab has its own independent editor and console output. Rename tabs with a double-click, close them with `×`.
- **Top-level `await` support** — write `await fetch(...)` directly at the top level without wrapping everything in an `async` function.
- **NPM Sandbox** — install any npm package (e.g. `axios`, `lodash`, `dayjs`) directly from the UI. Packages are installed once in an isolated sandbox and persist between sessions.
- **Console output panel** — a styled dark terminal panel on the right shows `stdout` and `stderr` after each run. Error lines are highlighted in red.
- **Persistent sessions** — all tabs and their content are automatically saved and restored on the next launch.
- **Export** — export the current tab's code as a `.js` file and its console output as a `_output.txt` file via a native save dialog.
- **Resizable panels** — drag the divider between the editor and the console to resize them to your liking.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm v10 or later

### Install & Run

```bash
# Clone the repository
git clone https://github.com/your-username/apxc-js-ide.git
cd apxc-js-ide

# Install dependencies
npm install

# Start the application
npm start
```

### Build a distributable package

```bash
# Windows (.exe installer)
npm run dist:win

# Linux (.AppImage + .deb)
npm run dist:linux

# Both platforms
npm run dist
```

Distributable files will be generated in the `release/` folder.

---

## Project Structure

```
apxc-js-ide/
├── main.js              # Electron main process (window, IPC, code execution)
├── src/
│   ├── index.html       # App shell & Monaco AMD loader
│   ├── renderer.ts      # UI logic: tabs, editor, output, packages panel
│   └── preload.js       # Secure IPC bridge (contextBridge)
├── webpack.config.js    # Webpack config (TypeScript + Monaco asset copy)
├── tsconfig.json        # TypeScript config
└── package.json
```

---

## How It Works

When you press **▶ Run**, the code in the active tab is:

1. Automatically wrapped in an `async IIFE` (so top-level `await` always works).
2. Written to a temporary `.js` file inside the **NPM Sandbox** folder (`%APPDATA%/apxc-js-ide/sandbox/`).
3. Executed with `node` as a child process from within the sandbox directory, so any `require('...')` resolves against the sandbox's own `node_modules`.
4. The temporary file is deleted immediately after execution.

This approach is isolated, fast, and does not pollute any global Node.js environment.

---

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Run code | `Ctrl+Enter` *(planned)* |
| Open DevTools | `Ctrl+Shift+I` |
| Format document | `Shift+Alt+F` *(Monaco built-in)* |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron](https://www.electronjs.org/) v28 |
| Code editor | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| UI logic | TypeScript + Webpack |
| Package management | npm sandbox via child_process |
| Packaging | [electron-builder](https://www.electron.build/) |

---

## License

ISC

---

## Made by AI

This application was entirely designed, architected, and implemented by **GitHub Copilot** (powered by **Claude Sonnet 4.5**), in a live pair-programming session with its human collaborator.

From the initial idea — *"I want a Node.js playground like TypeScript Playground, as a desktop app"* — to multi-tab management, npm sandbox, persistent sessions, and release automation, every line of code was written by AI.

> *"The best tools are the ones that get out of your way."*

---

*Built with ❤️ by AI — so you can focus on the code that matters.*
