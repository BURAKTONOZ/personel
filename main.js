const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const networkDir = '\\\\192.168.101.55\\Fen_Isleri_Dairesi_Bsk\\BURAK TONOZ';
let dbPath = path.join(networkDir, 'PersonelDB.sqlite');
let db;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.maximize();
  win.show();
  win.setMenuBarVisibility(false);
  win.loadFile('desktop.html');
}

function initDB() {
  if (!fs.existsSync(networkDir)) {
    console.log("Ağa ulaşılamadı. Lokal test veritabanı kullanılıyor.");
    dbPath = path.join(app.getPath('desktop'), 'PersonelDB_LokalTest.sqlite');
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (!err) {
      db.run(`CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)`);
    }
  });
}

app.whenReady().then(() => {
  initDB();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-data', async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT key, value FROM store", [], (err, rows) => {
      if (err) reject(err);
      let data = { personnel: [], settings: {} };
      if(rows) {
          rows.forEach(row => {
            try { data[row.key] = JSON.parse(row.value); } catch(e) {}
          });
      }
      resolve(data);
    });
  });
});

ipcMain.handle('save-personnel', async (event, personnelData) => {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(personnelData);
    db.run(`REPLACE INTO store (key, value) VALUES ('personnel', ?)`, [jsonStr], function(err) {
      if (err) reject(err); else resolve(true);
    });
  });
});

ipcMain.handle('save-settings', async (event, settingsData) => {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(settingsData);
    db.run(`REPLACE INTO store (key, value) VALUES ('settings', ?)`, [jsonStr], function(err) {
      if (err) reject(err); else resolve(true);
    });
  });
});
