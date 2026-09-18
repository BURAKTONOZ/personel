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

// Asenkron ağ kontrolü (Donmayı engeller)
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
    width: 450,       // İlk açılışta küçük pencere
    height: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000', 
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    resizable: false // Giriş ekranında yeniden boyutlandırmayı kapat
  });

  win.loadFile('desktop.html');

  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-close', () => app.quit());
  
  // Giriş başarılı olunca tam ekrana geçiren komut
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
