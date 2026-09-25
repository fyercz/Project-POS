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
    mainWindow.loadURL(process.env.ELECTRON_START_URL).catch(err => {
      console.error('Gagal memuat URL development:', err);
    });
  } else {
    const targetFile = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(targetFile).catch(err => {
      console.error('File dist/index.html belum ditemukan, mencoba fallback localhost:3000:', err);
      mainWindow.loadURL('http://localhost:3000').catch(() => {
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>Sistem Pertashop</title></head>
          <body style="font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;">
            <h1 style="color:#ef4444;margin-bottom:8px;">Aplikasi Perlu Dibuild</h1>
            <p style="color:#94a3b8;max-width:500px;line-height:1.6;">File web belum dikompilasi atau server lokal belum aktif.<br>Silakan jalankan file <b>buat-aplikasi-exe.bat</b> atau <b>run.bat</b> terlebih dahulu.</p>
          </body>
          </html>
        `));
      });
    });
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
