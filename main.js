const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Ağ Klasörü Yolu (Kurumdaki Asıl Yol)
const networkDir = '\\\\192.168.101.55\\Fen_Isleri_Dairesi_Bsk\\BURAK TONOZ';
let dbPath = path.join(networkDir, 'PersonelDB.sqlite');

let db;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Yüklenmeden ekranda beyaz patlama yapmasın diye
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.maximize(); // Tam ekran açılır
  win.show();
  win.setMenuBarVisibility(false); // Üstteki rahatsız edici Dosya, Düzenle menüsünü gizler
  win.loadFile('desktop.html');
}

function initDB() {
  // Kurum ağında değilsek (Örn: Evde test ediyorsan) program çökmesin, masaüstüne test dosyası açsın
  if (!fs.existsSync(networkDir)) {
    console.log("Ağ klasörüne ulaşılamadı. Masaüstünde lokal test veritabanı kullanılıyor.");
    dbPath = path.join(app.getPath('desktop'), 'PersonelDB_LokalTest.sqlite');
  } else {
    console.log("Ağ klasörüne başarıyla bağlandı!");
  }

  // SQLite Veritabanını Başlat
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("Veritabanı hatası:", err);
    } else {
      // Firebase'in NoSQL mantığını SQLite'a uyarlayan akıllı tablo (Sadece anahtar-değer tutar)
      db.run(`CREATE TABLE IF NOT EXISTS store (
        key TEXT PRIMARY KEY,
        value TEXT
      )`);
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

// --- ÖN YÜZDEN (HTML) GELEN EMİRLERİ DİNLEYEN KISIM ---

// Verileri Oku
ipcMain.handle('get-data', async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT key, value FROM store", [], (err, rows) => {
      if (err) reject(err);
      let data = { personnel: [], settings: {} };
      rows.forEach(row => {
        try { data[row.key] = JSON.parse(row.value); } catch(e) {}
      });
      resolve(data);
    });
  });
});

// Personeli Kaydet
ipcMain.handle('save-personnel', async (event, personnelData) => {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(personnelData);
    db.run(`REPLACE INTO store (key, value) VALUES ('personnel', ?)`, [jsonStr], function(err) {
      if (err) reject(err);
      else resolve(true);
    });
  });
});

// Ayarları Kaydet
ipcMain.handle('save-settings', async (event, settingsData) => {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(settingsData);
    db.run(`REPLACE INTO store (key, value) VALUES ('settings', ?)`, [jsonStr], function(err) {
      if (err) reject(err);
      else resolve(true);
    });
  });
});
