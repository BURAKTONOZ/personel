const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Kalıcı ayarların tutulacağı yol (Uygulama güncellense bile silinmez)
const configPath = path.join(app.getPath('userData'), 'dbconfig.json');
const defaultNetworkDir = '\\\\192.168.101.55\\Fen_Isleri_Dairesi_Bsk\\BURAK TONOZ';
let dbPath = '';
let db = null;
let isDbConnected = false;

function loadCustomPath() {
  if (fs.existsSync(configPath)) {
    try { return JSON.parse(fs.readFileSync(configPath)).customPath; } catch (e) {}
  }
  return null;
}

function saveCustomPath(newPath) {
  fs.writeFileSync(configPath, JSON.stringify({ customPath: newPath }));
}

function connectToDB(targetDir) {
  return new Promise((resolve) => {
    if (!fs.existsSync(targetDir)) {
      isDbConnected = false;
      resolve(false);
      return;
    }
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
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,           // Çerçeveyi kaldırır
    transparent: true,      // Arka planı şeffaf yapar
    backgroundColor: '#00000000', 
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.maximize(); // Tam ekran başlatır
  win.loadFile('desktop.html');

  // Özel başlık çubuğu için kapat/küçült buton fonksiyonları
  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-close', () => app.quit());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Ön yüz veritabanını kontrol etmek istediğinde çalışır
ipcMain.handle('check-db-connection', async () => {
  // 1. Önce varsayılan ağı dene
  let connected = await connectToDB(defaultNetworkDir);
  if (connected) return { success: true, path: dbPath };

  // 2. Ağ yoksa, kullanıcının daha önce kaydettiği özel yolu dene
  const customPath = loadCustomPath();
  if (customPath) {
    connected = await connectToDB(customPath);
    if (connected) return { success: true, path: dbPath };
  }

  // 3. İkisi de yoksa ön yüze "Yol iste" sinyali gönder
  return { success: false, requirePath: true };
});

// Klasör seçme penceresi (Gözat)
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

// Kullanıcının seçtiği yeni yola bağlanma
ipcMain.handle('set-custom-db-path', async (event, newDir) => {
  const connected = await connectToDB(newDir);
  if (connected) {
    saveCustomPath(newDir);
    return { success: true, path: dbPath };
  }
  return { success: false };
});

// Durum ve Veri çekme işlemleri
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
