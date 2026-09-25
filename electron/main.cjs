const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 650,
    title: 'Sistem Manajemen & Laporan Pertashop',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true, // Menyembunyikan menu bar bawaan browser agar tampilan seperti software POS modern
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Memperbolehkan akses file lokal & penyimpanan offline
    }
  });

  // Tampilkan jendela setelah halaman siap agar tidak berkedip putih
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Buka link eksternal (misal bantuan web / whatsapp) di browser default komputer pengguna
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Jalankan file build HTML lokal
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
