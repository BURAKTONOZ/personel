const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();

const configPath = path.join(app.getPath('userData'), 'dbconfig.json');
const defaultNetworkDir = '\\\\192.168.101.194\\Numarataj_tarama\\NUMARATAJ PROGRAMLAR\\PERSONEL YÖNETİM SİSTEMİ';
let dbPath = '';
let db = null;
let isDbConnected = false;
let win = null;

function loadCustomPath() {
  if (fs.existsSync(configPath)) {
    try { return JSON.parse(fs.readFileSync(configPath)).customPath; } catch (e) {}
  }
  return null;
}

function saveCustomPath(newPath) {
  fs.writeFileSync(configPath, JSON.stringify({ customPath: newPath }));
}

async function connectToDB(targetDir) {
  try {
    await fsPromises.access(targetDir); 
  } catch (err) {
    isDbConnected = false;
    return false;
  }
  
  return new Promise((resolve) => {
    dbPath = path.join(targetDir, 'PersonelDB.sqlite');
    db = new sqlite3.Database(dbPath, (err) => {
      if (!err) {
        db.run(`CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)`, () => {
          isDbConnected = true;
          resolve(true);
        });
      } else {
        isDbConnected = false;
        resolve(false);
      }
    });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 450,       
    height: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000', 
    icon: path.join(__dirname, 'icon.png'), // <--- UYGULAMA İKONU BURAYA EKLENDİ
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    resizable: false 
  });

  win.loadFile('desktop.html');

  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-close', () => app.quit());
  
  ipcMain.on('window-maximize-toggle', () => {
    if(win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
  });

  ipcMain.on('maximize-window', () => {
    win.resizable = true;
    win.maximize();
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('check-db-connection', async () => {
  let connected = await connectToDB(defaultNetworkDir);
  if (connected) return { success: true, path: dbPath };

  const customPath = loadCustomPath();
  if (customPath) {
    connected = await connectToDB(customPath);
    if (connected) return { success: true, path: dbPath };
  }
  return { success: false, requirePath: true };
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('backup-database', async () => {
    if(!dbPath || !fs.existsSync(dbPath)) return {success: false, message: "Aktif veritabanı bulunamadı!"};
    
    const result = await dialog.showSaveDialog(win, {
        title: 'Veritabanını Yedekle',
        defaultPath: 'PersonelDB_Yedek.sqlite',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
    });

    if(result.canceled || !result.filePath) return {success: false, message: "İşlem iptal edildi."};

    try {
        fs.copyFileSync(dbPath, result.filePath);
        return {success: true, path: result.filePath};
    } catch(e) {
        return {success: false, message: e.message};
    }
});

ipcMain.handle('set-custom-db-path', async (event, newDir) => {
  const connected = await connectToDB(newDir);
  if (connected) {
    saveCustomPath(newDir);
    return { success: true, path: dbPath };
  }
  return { success: false };
});

ipcMain.handle('get-db-status', () => {
  return { connected: isDbConnected, path: dbPath };
});

ipcMain.handle('get-data', async () => {
  if (!isDbConnected) return { personnel: [], settings: {} };
  return new Promise((resolve) => {
    db.all("SELECT key, value FROM store", [], (err, rows) => {
      let data = { personnel: [], settings: {} };
      if(rows) rows.forEach(row => { try { data[row.key] = JSON.parse(row.value); } catch(e) {} });
      resolve(data);
    });
  });
});

ipcMain.handle('save-personnel', async (event, data) => {
  if (!isDbConnected) return false;
  return new Promise((resolve) => {
    db.run(`REPLACE INTO store (key, value) VALUES ('personnel', ?)`, [JSON.stringify(data)], (err) => resolve(!err));
  });
});

ipcMain.handle('save-settings', async (event, data) => {
  if (!isDbConnected) return false;
  return new Promise((resolve) => {
    db.run(`REPLACE INTO store (key, value) VALUES ('settings', ?)`, [JSON.stringify(data)], (err) => resolve(!err));
  });
});

// Otomatik Sessiz Yedekleme (Çıkışta tetiklenir)
ipcMain.handle('silent-backup', async (event, backupDir) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        if (!currentDbPath || !fs.existsSync(currentDbPath)) return { success: false, message: 'DB bulunamadı.' };
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        // Veritabanını tarih damgasıyla kopyala
        const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const dest = path.join(backupDir, `PersonelDB_${dateStr}.sqlite`);
        fs.copyFileSync(currentDbPath, dest);

        // Kendi Kendini Temizleyen Çöpçü (Sadece son 7 yedeği tutar)
        const files = fs.readdirSync(backupDir).filter(f => f.startsWith('PersonelDB_') && f.endsWith('.sqlite'));
        if (files.length > 7) {
            // Eskiden yeniye sırala
            files.sort((a, b) => {
                return fs.statSync(path.join(backupDir, a)).mtime.getTime() - fs.statSync(path.join(backupDir, b)).mtime.getTime();
            });
            // En eskileri sil
            const toDelete = files.length - 7;
            for(let i=0; i<toDelete; i++) {
                fs.unlinkSync(path.join(backupDir, files[i]));
            }
        }
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});
