const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

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
  return new Promise((resolve, reject) => {
    const tempFileName = `temp_${Date.now()}.js`;
    const tempFilePath = path.join(app.getPath('temp'), tempFileName);
    fs.writeFileSync(tempFilePath, code);

    exec(`node "${tempFilePath}"`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFilePath);
      if (error) {
        resolve(stderr);
      } else {
        resolve(stdout);
      }
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
