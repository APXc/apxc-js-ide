const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');

// ── Sandbox ────────────────────────────────────────────────────────────────────
// La sandbox è una cartella isolata in userData con il proprio package.json.
// Tutti i require() nel codice utente vengono risolti da qui.

function getSandboxPath() {
  return path.join(app.getPath('userData'), 'sandbox');
}

function initSandbox() {
  const sandboxPath = getSandboxPath();
  if (!fs.existsSync(sandboxPath)) {
    fs.mkdirSync(sandboxPath, { recursive: true });
  }
  const pkgPath = path.join(sandboxPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'apxc-sandbox', version: '1.0.0', dependencies: {} }, null, 2));
  }
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'APXC JS IDE',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

ipcMain.handle('run-code', async (event, code) => {
  return new Promise((resolve) => {
    const sandboxPath = getSandboxPath();
    const tempFileName = `temp_${Date.now()}.js`;
    const tempFilePath = path.join(sandboxPath, tempFileName);
    // Wrap in async IIFE so top-level await always works
    const wrappedCode = `(async () => {\n${code}\n})().catch(e => { process.stderr.write(String(e)); process.exit(1); });`;
    fs.writeFileSync(tempFilePath, wrappedCode);

    // Esegui dentro la sandbox: node_modules locali vengono risolti correttamente
    exec(`node "${tempFilePath}"`, { cwd: sandboxPath }, (error, stdout, stderr) => {
      fs.unlinkSync(tempFilePath);
      resolve(error ? stderr || stdout : stdout);
    });
  });
});

ipcMain.handle('install-package', async (event, packageName) => {
  return new Promise((resolve) => {
    const sandboxPath = getSandboxPath();
    // Sanifica il nome del pacchetto per sicurezza
    const safeName = packageName.trim().replace(/[^a-zA-Z0-9@._\-\/]/g, '');
    if (!safeName) {
      resolve({ success: false, error: 'Nome pacchetto non valido.' });
      return;
    }
    exec(`npm install ${safeName} --save`, { cwd: sandboxPath }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('list-packages', async () => {
  try {
    const pkgPath = path.join(getSandboxPath(), 'package.json');
    if (!fs.existsSync(pkgPath)) return {};
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.dependencies || {};
  } catch (e) {
    return {};
  }
});

ipcMain.handle('uninstall-package', async (event, packageName) => {
  return new Promise((resolve) => {
    const sandboxPath = getSandboxPath();
    const safeName = packageName.trim().replace(/[^a-zA-Z0-9@._\-\/]/g, '');
    exec(`npm uninstall ${safeName}`, { cwd: sandboxPath }, (error, stdout, stderr) => {
      resolve({ success: !error });
    });
  });
});

// Percorso del file di persistenza dei tab
const dataPath = () => path.join(app.getPath('userData'), 'tabs.json');

ipcMain.handle('load-tabs', async () => {
  try {
    if (fs.existsSync(dataPath())) {
      return JSON.parse(fs.readFileSync(dataPath(), 'utf-8'));
    }
  } catch (e) {}
  return null;
});

ipcMain.handle('save-tabs', async (event, data) => {
  fs.writeFileSync(dataPath(), JSON.stringify(data, null, 2), 'utf-8');
});

ipcMain.handle('export-tab', async (event, { code, output, tabName }) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Esporta tab',
    defaultPath: `${tabName}.js`,
    filters: [
      { name: 'JavaScript', extensions: ['js'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, code, 'utf-8');
  if (output) {
    fs.writeFileSync(filePath.replace(/\.js$/, '') + '_output.txt', output, 'utf-8');
  }
  return true;
});

app.whenReady().then(() => {
  initSandbox();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
