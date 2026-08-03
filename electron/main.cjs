const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Prevent GPU / sandbox crashes on macOS ARM64 for unsigned builds
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

function createWindow() {
  const windowConfig = {
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    title: 'Numisma - Münzsammlung Manager',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  };

  const iconPath = path.join(__dirname, '../dist/favicon.ico');
  if (fs.existsSync(iconPath)) {
    windowConfig.icon = iconPath;
  }

  const mainWindow = new BrowserWindow(windowConfig);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);
}

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
