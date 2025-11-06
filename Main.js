const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Card Garage - Card Master Tools Suite",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Carica la homepage come pagina iniziale
  mainWindow.loadFile('index.html');
}

// Gestisce la navigazione verso i vari tool
ipcMain.handle('navigate-to-tool', (event, toolName) => {
  if (toolName === 'image-crop') {
    mainWindow.loadFile(path.join('tools', 'image-crop', 'index.html'));
  } else if (toolName === 'defect-finder') {
    mainWindow.loadFile(path.join('tools', 'defect-finder', 'index.html'));
  } else if (toolName === 'auto-3d') {
    mainWindow.loadFile(path.join('tools', 'auto-3d', 'index.html'));
  } else if (toolName === 'homepage') {
    mainWindow.loadFile('index.html');
  }
  // Aggiungi qui altri tool quando li crei
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});