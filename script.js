const APP_VERSION = "7.2.0"; 
const FIREBASE_URL = "https://personel-d7ad2-default-rtdb.firebaseio.com/.json";

let currentUserRole = 'admin'; 

function showSpinner(text="İşleniyor...") { 
    document.getElementById("spinnerText").innerText = text;
    document.getElementById("spinner-overlay").style.display = "flex"; 
}

function hideSpinner() { 
    document.getElementById("spinner-overlay").style.display = "none"; 
}

function showToast(msg, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type==='success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} text-lg"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 400); }, 3000);
}

function formatDateTR(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateString;
}

function adjustStickyElements() {
    const header = document.getElementById('main-header');
    const filterPanel = document.getElementById('filter-panel');
    if(header && filterPanel) {
        const headerRect = header.getBoundingClientRect();
        filterPanel.style.top = headerRect.height + 'px';
    }
}
window.addEventListener('resize', adjustStickyElements);
window.addEventListener('scroll', adjustStickyElements);

function openPhotoModal() {
    const src = document.getElementById("pv_foto").src;
    if(!src || src.includes('placeholder') || src.includes('data:image/svg')) return;
    document.getElementById("fullSizePhoto").src = src;
    const m = document.getElementById('photoZoomModal');
    m.style.display = 'flex';
    setTimeout(() => {
        m.classList.remove('opacity-0');
        document.getElementById('fullSizePhoto').classList.remove('scale-95');
        document.getElementById('fullSizePhoto').classList.add('scale-100');
    }, 10);
}

function closePhotoModal() {
    const m = document.getElementById('photoZoomModal');
    m.classList.add('opacity-0');
    document.getElementById('fullSizePhoto').classList.remove('scale-100');
    document.getElementById('fullSizePhoto').classList.add('scale-95');
    setTimeout(() => { m.style.display = 'none'; }, 300);
}

let personnelData = [];
let currentFilteredData = [];
const SYSTEM_TODAY = new Date();
SYSTEM_TODAY.setHours(0,0,0,0);
let selectedUserId = null;
let tlCurrentDate = new Date();
let uploadedBase64Foto = "";
window.tooltipTimeout = null; 

let activeCardId = 'total'; 

const avatarMale = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
const avatarFemale = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/><path d='M12 2C8.69 2 6 4.69 6 8v3c0 .83.67 1.5 1.5 1.5S9 11.83 9 11V8c0-1.65 1.35-3 3-3s3 1.35 3 3v3c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V8c0-3.31-2.69-6-6-6z' opacity='0.6'/></svg>";

function getAvatarUrl(foto, cinsiyet) {
    if(foto && foto.trim() !== "" && !foto.includes("via.placeholder.com")) return foto;
    return (cinsiyet && cinsiyet.toUpperCase() === 'KADIN') ? avatarFemale : avatarMale;
}

window.updateFormSilhouette = function() {
    if(!uploadedBase64Foto) {
        const cin = document.getElementById("f_cinsiyet").value || "ERKEK";
        document.getElementById("previewFoto").src = getAvatarUrl("", cin);
    }
}

function getAge(dateString) {
    if(!dateString) return '-';
    let birthDate = new Date(dateString);
    let age = SYSTEM_TODAY.getFullYear() - birthDate.getFullYear();
    let m = SYSTEM_TODAY.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && SYSTEM_TODAY.getDate() < birthDate.getDate())) age--;
    return age;
}

function compareVersions(v1, v2) {
    let p1 = v1.split('.').map(Number);
    let p2 = v2.split('.').map(Number);
    for(let i=0; i<3; i++) {
        if ((p1[i] || 0) > (p2[i] || 0)) return 1;  
        if ((p1[i] || 0) < (p2[i] || 0)) return -1; 
    }
    return 0; 
}

let systemSettings = {
    version: APP_VERSION,
    dropdowns: {
        cinsiyet: { label: "Cinsiyet", values: ["Erkek", "Kadın"] },
        medeniHal: { label: "Medeni Hal", values: ["Bekar", "Evli"] },
        tahsil: { label: "Tahsil", values: ["İlköğretim", "Lise", "Önlisans", "Lisans", "Yüksek Lisans"] },
        kadroSirket: { label: "Kadro / Şirket", values: ["MEMUR", "BELTAŞ", "BELKA"] },
        unvan: { label: "Ünvanı", values: ["GIDA MÜHENDİSİ", "TEKNİKER", "TEKNİSYEN", "BİLGİSAYAR İŞLETMENİ", "BEKÇİ", "MUTEMET", "VERİ HAZIRLAMA", "HARİTA MÜHENDİSİ", "HARİTA TEKNİKERİ", "VASIFSIZ ELEMAN", "OFİS TEKNİKERİ", "ENGELLİ İŞÇİ", "ŞANTİYE TEKNİKERİ", "ŞANTİYE SÜRVEYANI", "ÇAĞRI MERKEZİ OPERATÖRÜ", "MAKAM PERSONELİ", "BÜRO PERSONELİ", "YARDIMCI PERSONEL", "HALKLA İLİŞKİLER", "OPERATÖR", "USTA", "AĞIR VASITA ŞOFÖRÜ", "KISIM ŞEFİ", "KANTAR İŞÇİSİ", "BİYOLOG"] },
        seflik: { label: "Çalıştığı Şeflik", values: ["MÜDÜR", "NUMARATAJ ŞEFLİĞİ", "BÜRO ŞEFLİĞİ", "ADRES YÖNETİM VE UYGULAMA ŞEFLİĞİ"] },
        bina: { label: "Çalıştığı Bina", values: ["ANA BİNA", "1011 YERLEŞKESİ"] },
        kanGrubu: { label: "Kan Grubu", values: ["Belirtilmemiş", "A Rh+", "A Rh-", "B Rh+", "B Rh-", "AB Rh+", "AB Rh-", "0 Rh+", "0 Rh-"] },
        acilYakinlik: { label: "Yakınlık", values: ["Eşi", "Babası", "Annesi", "Kardeşi", "Çocuğu", "Arkadaşı"] },
        durum: { label: "Çalışma Durumu", values: ["Aktif", "Pasif"] }
    },
    cards: [
        { id: "total", title: "Toplam Personel", type: "all", active: true },
        { id: "active", title: "Aktif Çalışan", type: "durum", value: "Aktif", active: true },
        { id: "passive", title: "Pasif Personel", type: "durum", value: "Pasif", active: false },
        { id: "memur", title: "Kadrolu Memur", type: "kadroSirket", value: "MEMUR", active: true },
        { id: "beltas", title: "Beltaş Personeli", type: "kadroSirket", value: "BELTAŞ", active: true },
        { id: "belka", title: "Belka Personeli", type: "kadroSirket", value: "BELKA", active: true },
        { id: "muhendis", title: "Harita Mühendisleri", type: "unvan", value: "HARİTA MÜHENDİSİ", active: false },
        { id: "numarataj", title: "Numarataj Şefliği", type: "seflik", value: "NUMARATAJ ŞEFLİĞİ", active: false },
        { id: "kadin", title: "Kadın Personel", type: "cinsiyet", value: "Kadın", active: false },
        { id: "erkek", title: "Erkek Personel", type: "cinsiyet", value: "Erkek", active: false },
        { id: "zimmetli", title: "Demirbaş Sahipleri", type: "custom", func: "zimmetli", active: false },
        { id: "izinli", title: "Şu An İzinde", type: "custom", func: "izinli", active: true }
    ]
};

const statColorsAndIcons = {
    "Toplam Personel": { bg: "bg-gradient-to-br from-slate-50 to-white", text: "text-slate-700", border: "border-slate-200", icon: "fa-users", ring: "ring-slate-400" },
    "Aktif Çalışan": { bg: "bg-gradient-to-br from-emerald-50 to-white", text: "text-emerald-600", border: "border-emerald-200", icon: "fa-user-check", ring: "ring-emerald-400" },
    "Pasif Personel": { bg: "bg-gradient-to-br from-rose-50 to-white", text: "text-rose-600", border: "border-rose-200", icon: "fa-user-times", ring: "ring-rose-400" },
    "Kadrolu Memur": { bg: "bg-gradient-to-br from-blue-50 to-white", text: "text-blue-600", border: "border-blue-200", icon: "fa-user-tie", ring: "ring-blue-400" },
    "Beltaş Personeli": { bg: "bg-gradient-to-br from-amber-50 to-white", text: "text-amber-600", border: "border-amber-200", icon: "fa-hard-hat", ring: "ring-amber-400" },
    "Belka Personeli": { bg: "bg-gradient-to-br from-indigo-50 to-white", text: "text-indigo-600", border: "border-indigo-200", icon: "fa-id-badge", ring: "ring-indigo-400" },
    "Harita Mühendisleri": { bg: "bg-gradient-to-br from-violet-50 to-white", text: "text-violet-600", border: "border-violet-200", icon: "fa-drafting-compass", ring: "ring-violet-400" },
    "Numarataj Şefliği": { bg: "bg-gradient-to-br from-fuchsia-50 to-white", text: "text-fuchsia-600", border: "border-fuchsia-200", icon: "fa-sitemap", ring: "ring-fuchsia-400" },
    "Kadın Personel": { bg: "bg-gradient-to-br from-pink-50 to-white", text: "text-pink-600", border: "border-pink-200", icon: "fa-female", ring: "ring-pink-400" },
    "Erkek Personel": { bg: "bg-gradient-to-br from-cyan-50 to-white", text: "text-cyan-600", border: "border-cyan-200", icon: "fa-male", ring: "ring-cyan-400" },
    "Şu An İzinde": { bg: "bg-gradient-to-br from-orange-50 to-white", text: "text-orange-500", border: "border-orange-200", icon: "fa-umbrella-beach", ring: "ring-orange-400" },
    "Demirbaş Sahipleri": { bg: "bg-gradient-to-br from-lime-50 to-white", text: "text-lime-600", border: "border-lime-200", icon: "fa-laptop", ring: "ring-lime-400" }
};

function getVisiblePersonnel() {
    if(currentUserRole === '1011') {
        return personnelData.filter(p => p.bina && (p.bina === '1011 YERLEŞKESİ' || p.bina === '1011 Yerleşkesi'));
    }
    return personnelData;
}

function exportToExcel() {
    if(currentFilteredData.length === 0) {
        showToast("Dışa aktarılacak personel kaydı bulunamadı!", "error");
        return;
    }
    showSpinner("Excel Dosyası Hazırlanıyor...");
    setTimeout(() => {
        const exportData = currentFilteredData.map(p => ({
            "TC Kimlik No": p.tcNo || "",
            "Ad Soyad": p.adSoyad || "",
            "Doğum Tarihi": p.dogumTarihi ? formatDateTR(p.dogumTarihi) : "",
            "Cinsiyet": p.cinsiyet || "",
            "Medeni Hal": p.medeniHal || "",
            "Çocuk Sayısı": p.cocukSayisi || "0",
            "Tahsil Durumu": p.tahsil || "",
            "Cep Telefonu": p.tel || "",
            "Dahili No": p.dahili || "",
            "Kan Grubu": p.kanGrubu || "",
            "Ev Adresi": p.adres || "",
            "Kadro / Şirket": p.kadroSirket || "",
            "Ünvanı": p.unvan || "",
            "Çalıştığı Şeflik": p.seflik || "",
            "Çalıştığı Bina": p.bina || "",
            "Sicil Numarası": p.sicil || "",
            "Fiilen Yaptığı Görev": p.fiiliGorev || "",
            "İşe Başlama Tarihi": p.gelisTarihi ? formatDateTR(p.gelisTarihi) : "",
            "İşten Ayrılış Tarihi": p.ayrilisTarihi ? formatDateTR(p.ayrilisTarihi) : "",
            "Çalışma Durumu": p.durum || "",
            "Acil Durum Kişisi": p.acilKisi || "",
            "Acil Kişi Yakınlık": p.acilYakinlik || "",
            "Acil Kişi Telefonu": p.acilTel || "",
            "Kayıtlı Demirbaş Sayısı": p.zimmetler ? p.zimmetler.length : 0,
            "Kullanılan İzin Sayısı": p.izinler ? p.izinler.length : 0,
            "Personel Notu": p.notlar || ""
        }));

        try {
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Personel_Listesi");
            XLSX.writeFile(workbook, "Personel_Raporu.xlsx");
            hideSpinner();
            showToast("Excel dosyası başarıyla indirildi.", "success");
        } catch (error) {
            hideSpinner();
            showToast("Excel oluşturulurken bir hata meydana geldi.", "error");
        }
    }, 800);
}

async function backupDatabase() {
    if(typeof window.api === 'undefined') {
        showToast("Tarayıcı modunda yedekleme yapılamaz.", "error");
        return;
    }
    showSpinner("Veritabanı Yedekleniyor...");
    const result = await window.api.backupDatabase();
    hideSpinner();
    if(result.success) { showToast("Veritabanı yedeği başarıyla alındı.", "success"); } 
    else if(result.message !== "İşlem iptal edildi.") { showToast("Yedekleme hatası: " + result.message, "error"); }
}

function updateHeaderBadge() {
    const badge = document.getElementById('userBadge');
    badge.style.display = 'inline-block';
    
    if(currentUserRole === 'admin') {
        badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-md border tracking-wider bg-blue-50 text-blue-700 border-blue-200 shadow-sm';
        badge.innerHTML = '👑 ANA KULLANICI';
    } else {
        badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-md border tracking-wider bg-violet-50 text-violet-700 border-violet-200 shadow-sm';
        badge.innerHTML = '📍 1011 YÖNETİCİSİ';
    }
}

async function checkLogin() {
    const pass = document.getElementById('loginPass').value;
    const inputArea = document.getElementById('loginInputArea');
    const statusText = document.getElementById('loginStatusText');
    const lockScreenInfo = document.getElementById('lockScreenInfo');
    const lockMessageText = document.getElementById('lockMessageText');

    if(!pass) { showToast("Şifre boş olamaz!", "error"); return; }
    
    inputArea.style.display = 'none';
    statusText.style.display = 'block';
    statusText.className = 'text-xs font-bold text-slate-600 mt-2 tracking-wide bg-slate-50 border border-slate-200 p-3 rounded-xl animate-pulse';
    statusText.innerHTML = '<i class="fas fa-satellite-dish text-blue-500 mr-2 text-sm"></i> Güvenlik politikaları sunucudan alınıyor...';
    
    try {
        let response = await fetch(FIREBASE_URL);
        let fbData = await response.json();

        let isSystemOpen = fbData && fbData.sistemAcikMi !== undefined ? fbData.sistemAcikMi : true;
        let remotePassword = fbData && fbData.sifre ? fbData.sifre : "numarataj26";
        let remote1011Password = fbData && fbData.sifre1011 ? fbData.sifre1011 : "bin11";
        let lockMsg = fbData && fbData.kilitMesaji ? fbData.kilitMesaji : "Sistem lisansınız sona ermiştir. Lütfen sistem yöneticisi ile görüşün.";

        if (isSystemOpen === false || isSystemOpen === "false") {
            statusText.style.display = 'none';
            lockScreenInfo.style.display = 'flex';
            lockMessageText.innerText = lockMsg;
            return; 
        }

        let loginSuccess = false;

        if(pass === remotePassword) {
            currentUserRole = 'admin';
            loginSuccess = true;
        } else if (pass === remote1011Password) {
            currentUserRole = '1011';
            loginSuccess = true;
        }

        if(loginSuccess) {
            updateHeaderBadge();
            statusText.innerHTML = '<i class="fas fa-circle-notch fa-spin text-blue-500 mr-2 text-sm"></i> Veritabanı aranıyor...';
            
            if (typeof window.api !== 'undefined') {
                const dbCheck = await window.api.checkDatabase();
                if (dbCheck.requirePath) {
                    inputArea.style.display = 'block';
                    statusText.style.display = 'none';
                    document.getElementById('loginPass').value = '';
                    document.getElementById('loginScreen').style.display = 'none';
                    document.getElementById('dbPathModal').style.display = 'flex';
                } else {
                    statusText.innerHTML = '<i class="fas fa-circle-notch fa-spin text-blue-500 mr-2 text-sm"></i> Sürüm kontrol ediliyor...';
                    setTimeout(() => { fetchDataFromLocalDB(); }, 600); 
                }
            } else {
                statusText.className = 'text-xs font-bold text-emerald-700 mt-2 tracking-wide bg-emerald-50 border border-emerald-200 p-3 rounded-xl';
                statusText.innerHTML = '<i class="fas fa-check-circle text-emerald-500 mr-2 text-sm"></i> Tarayıcı Modu Başarılı!';
                setTimeout(() => {
                    document.getElementById('loginScreen').style.display = 'none';
                    document.getElementById('appContainer').style.display = 'flex';
                    showToast("Tarayıcı modundasınız, veritabanına bağlanılamaz.", "error");
                    initSystem();
                }, 800);
            }
        } else {
            statusText.style.display = 'none';
            inputArea.style.display = 'block';
            document.getElementById('loginPass').value = '';
            showToast("Hatalı şifre girdiniz!", "error");
        }

    } catch (error) {
        statusText.style.display = 'none';
        inputArea.style.display = 'block';
        document.getElementById('loginPass').value = '';
        showToast("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.", "error");
    }
}

async function browseFolder() {
    if (typeof window.api === 'undefined') return;
    const folderPath = await window.api.selectFolder();
    if (folderPath) { document.getElementById('selectedDbPath').value = folderPath; }
}

async function saveNewDbPath() {
    const path = document.getElementById('selectedDbPath').value;
    if (!path) return showToast("Lütfen gözat butonuna basarak bir klasör seçin!", "error");
    
    showSpinner("Veritabanı Oluşturuluyor...");
    const result = await window.api.setCustomDbPath(path);
    hideSpinner();
    
    if (result.success) {
        document.getElementById('dbPathModal').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        if (window.api) window.api.maximizeWindow();
        showToast("Veritabanı yolu kaydedildi.", "success");
        fetchDataFromLocalDB();
        startPolling();
    } else {
        showToast("Bu klasöre bağlanılamadı, yazma yetkiniz olmayabilir.", "error");
    }
}

function changeDbPathFromSettings() {
    closeModal('settingsModal');
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('dbPathModal').style.display = 'flex';
}

function startPolling() {
    if (typeof window.api === 'undefined') return;
    setInterval(async () => {
        const status = await window.api.getDbStatus();
        const led = document.getElementById('led-indicator');
        const statusText = document.getElementById('db-status-text');
        
        if (status.connected) {
            led.className = 'led green';
            statusText.innerText = 'Bağlı';
            const pathDisplay = document.getElementById('settingsDbPath');
            if (pathDisplay) pathDisplay.innerText = status.path;

            const newData = await window.api.getData();
            if (newData && newData.personnel) {
                let parsedData = Array.isArray(newData.personnel) ? newData.personnel : Object.values(newData.personnel);
                personnelData = parsedData.filter(p => p !== null && typeof p === 'object');
                personnelData.forEach(p => {
                    if(p.izinler && !Array.isArray(p.izinler)) p.izinler = Object.values(p.izinler).filter(i => i !== null);
                    if(p.zimmetler && !Array.isArray(p.zimmetler)) p.zimmetler = Object.values(p.zimmetler).filter(z => z !== null);
                });
                applyFilters(); 
                
                const now = new Date();
                document.getElementById('db-last-update').innerText = `Son Yenileme: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            }
        } else {
            led.className = 'led red';
            statusText.innerText = 'Bağlantı Koptu!';
        }
    }, 5000);
}

function logOut() {
    if(confirm("Sistemden çıkış yapmak istediğinize emin misiniz?")) {
        showSpinner("Çıkış Yapılıyor...");
        setTimeout(() => { location.reload(); }, 500);
    }
}

function fetchDataFromLocalDB() {
    const statusText = document.getElementById('loginStatusText');
    const inputArea = document.getElementById('loginInputArea');

    if(typeof window.api === 'undefined') {
        initSystem();
        return;
    }
    
    window.api.getData().then((data) => {
        
        let dbVersion = "1.0.0";
        if(data && data.settings && data.settings.version) { dbVersion = data.settings.version; }

        if(compareVersions(APP_VERSION, dbVersion) === -1) {
            inputArea.style.display = 'none'; 
            statusText.style.display = 'none';
            document.getElementById('versionError').classList.remove('hidden'); 
            return; 
        } 
        else if(compareVersions(APP_VERSION, dbVersion) === 1) {
            systemSettings.version = APP_VERSION;
            saveSettingsToDatabase();
        } 
        else {
            systemSettings.version = APP_VERSION;
        }

        if(data && data.personnel) {
            let parsedData = Array.isArray(data.personnel) ? data.personnel : Object.values(data.personnel);
            personnelData = parsedData.filter(p => p !== null && typeof p === 'object');
            personnelData.forEach(p => {
                if(p.izinler && !Array.isArray(p.izinler)) p.izinler = Object.values(p.izinler).filter(i => i !== null);
                if(p.zimmetler && !Array.isArray(p.zimmetler)) p.zimmetler = Object.values(p.zimmetler).filter(z => z !== null);
            });
        } else { personnelData = []; }
        
        if(data && data.settings) {
            let dbSettings = data.settings;
            if (dbSettings.dropdowns) systemSettings.dropdowns = dbSettings.dropdowns;
            if (dbSettings.cards) {
                systemSettings.cards = systemSettings.cards.map(defCard => {
                    let found = dbSettings.cards.find(c => c.id === defCard.id);
                    if(found) return { ...defCard, active: found.active };
                    return defCard; 
                });
            }
        }

        statusText.className = 'text-xs font-bold text-emerald-700 mt-2 tracking-wide bg-emerald-50 border border-emerald-200 p-3 rounded-xl';
        statusText.innerHTML = '<i class="fas fa-check-circle text-emerald-500 mr-2 text-sm"></i> Giriş Başarılı!';

        setTimeout(() => {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
            if (window.api) window.api.maximizeWindow(); 
            
            initSystem();
            startPolling();
        }, 800);

    }).catch(e => {
        statusText.style.display = 'none';
        inputArea.style.display = 'block';
        document.getElementById('loginPass').value = '';
        showToast("Ağ klasörüne ulaşılamıyor!", "error");
        console.error(e);
    });
}

function saveToDatabase() { 
    if(typeof window.api !== 'undefined') {
        window.api.savePersonnel(personnelData).catch(e => { showToast("Kayıt hatası: Ağ bağlantınızı kontrol edin.", "error"); });
    }
    return true; 
}

function saveSettingsToDatabase() { 
    if(typeof window.api !== 'undefined') {
        window.api.saveSettings(systemSettings).catch(e => { showToast("Ayarlar kaydedilemedi.", "error"); });
    }
}

function openModal(id) {
    const m = document.getElementById(id);
    m.style.display = "flex";
    setTimeout(() => { m.classList.add('show'); m.querySelector('.modal-content').classList.add('show'); }, 10);
    
    if(id === 'settingsModal') {
        buildSettingsMenu();
        const saveBtn = document.getElementById("settingsSaveBtn");
        if(saveBtn) saveBtn.style.display = (currentUserRole === '1011') ? 'none' : 'flex';
    }
    if(id === 'timelineModal') {
        document.getElementById("timelineMonth").value = `${tlCurrentDate.getFullYear()}-${String(tlCurrentDate.getMonth()+1).padStart(2,'0')}`;
        document.getElementById("timelineSearchInput").value = ""; 
        document.getElementById("btnTopluIzin").style.display = (currentUserRole === '1011') ? 'none' : 'flex';
        generateTimeline();
    }
}

function closeModal(id) {
    const m = document.getElementById(id);
    m.classList.remove('show');
    m.querySelector('.modal-content').classList.remove('show');
    setTimeout(() => { m.style.display = "none"; }, 300);
}

function initSystem() {
    populateSelectOptions();
    applyFilters();
    setTimeout(adjustStickyElements, 100); 
}

function populateSelectOptions() {
    Object.keys(systemSettings.dropdowns).forEach(key => {
        const els = document.querySelectorAll("#f_" + key + ", #filter-" + key);
        els.forEach(el => {
            if (el) {
                let html = el.id.startsWith("filter-") ? `<option value="">TÜMÜ (${systemSettings.dropdowns[key].label.toLocaleUpperCase('tr-TR')})</option>` : "";
                html += systemSettings.dropdowns[key].values.map(v => `<option value="${v}">${v.toLocaleUpperCase('tr-TR')}</option>`).join('');
                el.innerHTML = html;
            }
        });
    });
}

function filterFromCard(cardId) {
    activeCardId = cardId;
    const card = systemSettings.cards.find(c => c.id === cardId);
    if(!card) return;

    ["durum", "kadroSirket", "bina", "seflik"].forEach(id => {
        document.getElementById("filter-" + id).value = "";
    });

    if (card.type !== 'all' && card.type !== 'custom' && card.type !== 'cinsiyet' && card.type !== 'unvan') {
        const drop = document.getElementById("filter-" + card.type);
        if(drop) {
            for(let i=0; i<drop.options.length; i++) {
                if(drop.options[i].value.toLocaleUpperCase('tr-TR') === card.value.toLocaleUpperCase('tr-TR')) {
                    drop.selectedIndex = i;
                    break;
                }
            }
        }
    }
    
    applyFilters();
}

function renderStatsCards() {
    const container = document.getElementById("stats-container");
    container.innerHTML = "";
    
    const baseData = getVisiblePersonnel();

    systemSettings.cards.filter(c => c.active).forEach(card => {
        let count = 0;
        
        if (card.type === "all") {
            count = baseData.length; 
        } 
        else if (card.type === "custom" && card.func === "izinli") {
            count = baseData.filter(p => {
                if (p.durum !== "Aktif" && p.durum !== "AKTİF") return false;
                if (!p.izinler) return false;
                return p.izinler.some(iz => {
                    let b = new Date(iz.baslangic); b.setHours(0,0,0,0);
                    let bit = new Date(iz.bitis); bit.setHours(23,59,59,999);
                    return SYSTEM_TODAY >= b && SYSTEM_TODAY <= bit;
                });
            }).length;
        } else if (card.type === "custom" && card.func === "zimmetli") {
            count = baseData.filter(p => (p.durum === "Aktif" || p.durum === "AKTİF") && p.zimmetler && p.zimmetler.length > 0).length;
        } else {
            count = baseData.filter(p => p[card.type] === card.value || p[card.type] === card.value.toLocaleUpperCase('tr-TR')).length;
        }
        
        const styling = statColorsAndIcons[card.title] || { bg: "bg-white", text: "text-slate-600", border: "border-slate-200", icon: "fa-info-circle", ring: "ring-slate-400" };
        
        const isActive = (activeCardId === card.id);
        const activeClass = isActive ? `ring-2 ${styling.ring} ring-offset-2 scale-105 shadow-md z-10 opacity-100` : `hover:-translate-y-1 hover:shadow-md opacity-90 hover:opacity-100`;

        container.innerHTML += `
            <div onclick="filterFromCard('${card.id}')" class="cursor-pointer ${styling.bg} p-4 rounded-xl border ${styling.border} flex-1 flex flex-col justify-between transition-all duration-300 ${activeClass}">
                <h3 class="text-[10px] font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1.5"><i class="fas ${styling.icon} ${styling.text}"></i> ${card.title}</h3>
                <p class="text-2xl font-black ${styling.text} mt-2 drop-shadow-sm">${count}</p>
            </div>`;
    });
}

function renderTable(data) {
    const tbody = document.getElementById("personnelTableBody");
    tbody.innerHTML = "";

    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-5 py-8 text-center text-slate-500 font-semibold bg-white mt-4">Kayıtlı veya aranan kriterde personel bulunmuyor.</td></tr>`;
        renderStatsCards();
        setTimeout(adjustStickyElements, 50);
        return;
    }

    data.forEach(p => {
        const isAktif = p.durum === "Aktif" || p.durum === "AKTİF";
        let leaveBadge = '<span class="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-md border border-slate-200">GÖREVDE</span>';

        if(isAktif && p.izinler) {
            p.izinler.forEach(iz => {
                let b = new Date(iz.baslangic); b.setHours(0,0,0,0);
                let bit = new Date(iz.bitis); bit.setHours(23,59,59,999);
                
                if(SYSTEM_TODAY >= b && SYSTEM_TODAY <= bit) {
                    let cl = iz.tur.includes('Yıllık') || iz.tur.includes('YILLIK') ? 'izin-y' : 
                             (iz.tur.includes('Rapor') || iz.tur.includes('RAPOR') ? 'izin-r' : 
                             (iz.tur.includes('İdari') || iz.tur.includes('İDARİ') ? 'izin-i' : 
                             (iz.tur.includes('Ücretsiz') || iz.tur.includes('ÜCRETSİZ') ? 'izin-u' : 'izin-s')));
                    
                    let turLabel = iz.tur;
                    leaveBadge = `<span class="px-2.5 py-1 text-[10px] font-bold rounded-md ${cl} uppercase">${turLabel}</span>`;
                }
            });
        }
        
        let zimmetCount = p.zimmetler ? p.zimmetler.length : 0;
        let tarihBilgisi = isAktif ? `🗓️ Başlama: <span class="font-semibold text-slate-600">${formatDateTR(p.gelisTarihi) || '-'}</span>` : `🚪 Ayrılış: <span class="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">${formatDateTR(p.ayrilisTarihi) || 'Belirtilmedi'}</span>`;

        let fUnvan = p.unvan || '-';
        let fSeflik = p.seflik || '-';
        let fKadroSirket = p.kadroSirket || '-';
        let fDahili = p.dahili ? `<span class="text-slate-800 bg-slate-100 px-1.5 rounded border border-slate-200">${p.dahili}</span>` : '-';

        tbody.innerHTML += `
            <tr onclick="openProfileModal(${p.id})" class="row-hover cursor-pointer group ${!isAktif ? 'opacity-70 bg-slate-50 grayscale-[20%]' : ''}">
                <td class="px-5 py-3 border-b border-slate-100">
                    <div class="flex items-center gap-4">
                        <div class="relative"><img src="${getAvatarUrl(p.fotoUrl, p.cinsiyet)}" class="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm bg-slate-100 p-0.5"></div>
                        <div>
                            <div class="font-bold text-slate-800 text-[13px] group-hover:text-blue-600 transition-colors uppercase force-upper">${p.adSoyad}</div>
                            <div class="text-[11px] text-slate-500 font-mono mt-0.5 font-medium">🆔 ${p.tcNo} <span class="mx-1 text-slate-300">•</span> ${p.cinsiyet === 'Erkek' || p.cinsiyet === 'ERKEK'?'Erkek':'Kadın'} <span class="mx-1 text-slate-300">•</span> ${getAge(p.dogumTarihi)} Yaş</div>
                        </div>
                    </div>
                </td>
                <td class="px-5 py-3 border-b border-slate-100">
                    <div class="font-bold text-slate-700 text-xs uppercase">${fUnvan}</div>
                    <div class="text-slate-600 text-[11px] mt-1 font-semibold">💼 <span class="text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">${fSeflik}</span> (${fKadroSirket})</div>
                    <div class="text-[10px] text-slate-500 font-mono mt-1 font-medium flex items-center gap-2 uppercase">🏷️ Sicil: ${p.sicil || '-'} <span class="text-slate-300">|</span> ${tarihBilgisi}</div>
                </td>
                <td class="px-5 py-3 border-b border-slate-100">
                    <div class="font-bold text-slate-700 text-xs flex items-center gap-2">📱 ${p.tel || '-'}</div>
                    <div class="text-[10px] font-bold text-slate-500 mt-1"><i class="fas fa-phone-square-alt"></i> Dahili: ${fDahili}</div>
                    <div class="text-[11px] text-slate-500 mt-1 truncate w-48 font-medium uppercase force-upper" title="${p.adres}">🏠 ${p.adres || '-'}</div>
                </td>
                <td class="px-5 py-3 border-b border-slate-100">
                    <div class="text-[11px] font-bold text-slate-700 whitespace-normal break-words leading-tight uppercase force-upper"><i class="fas fa-ambulance text-rose-500"></i> ${p.acilKisi || '-'} <span class="text-slate-400 font-normal">(${p.acilYakinlik || '-'})</span></div>
                    <div class="text-[11px] text-slate-600 mt-0.5 font-medium mb-1">📞 ${p.acilTel || '-'}</div>
                    <div class="text-[10px] font-bold text-rose-600 inline-flex">🩸 Kan: <span class="bg-rose-50 px-1 ml-1 rounded border border-rose-100 uppercase">${p.kanGrubu || '-'}</span></div>
                </td>
                <td class="px-5 py-3 border-b border-slate-100 text-center">
                    <div class="mb-2"><span class="px-3 py-1 text-[10px] font-bold ${isAktif?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-rose-50 text-rose-700 border border-rose-200'} rounded-md uppercase">${p.durum}</span></div>
                    <div>${leaveBadge}</div>
                    <div class="mt-2 text-[10px] text-slate-400 font-semibold"><i class="fas fa-box text-slate-300"></i> ${zimmetCount} Demirbaş</div>
                </td>
            </tr>
        `;
    });
    
    renderStatsCards();
    setTimeout(adjustStickyElements, 50); 
}

function applyFilters() {
    const search = document.getElementById("filter-search").value.toLocaleUpperCase('tr-TR');
    const baseData = getVisiblePersonnel();

    currentFilteredData = baseData.filter(p => {
        let pAd = p.adSoyad ? p.adSoyad.toLocaleUpperCase('tr-TR') : "";
        let pSicil = p.sicil ? p.sicil.toLocaleUpperCase('tr-TR') : "";
        let pTel = p.tel || "";
        let matchSearch = pAd.includes(search) || (p.tcNo||"").includes(search) || pSicil.includes(search) || pTel.includes(search);
        
        let valDurum = document.getElementById("filter-durum").value.toLocaleUpperCase('tr-TR');
        let mDurum = !valDurum || (p.durum||"").toLocaleUpperCase('tr-TR') === valDurum;

        let valKadroSirket = document.getElementById("filter-kadroSirket").value.toLocaleUpperCase('tr-TR');
        let pKadroSirket = (p.kadroSirket || "").toLocaleUpperCase('tr-TR');
        let mKadroSirket = !valKadroSirket || pKadroSirket === valKadroSirket || pKadroSirket.includes(valKadroSirket);

        let valBina = document.getElementById("filter-bina").value.toLocaleUpperCase('tr-TR');
        let pBina = (p.bina || "").toLocaleUpperCase('tr-TR');
        let mBina = !valBina || pBina === valBina;

        let valSeflik = document.getElementById("filter-seflik").value.toLocaleUpperCase('tr-TR');
        let pSeflik = (p.seflik || "").toLocaleUpperCase('tr-TR');
        let mSeflik = !valSeflik || pSeflik === valSeflik || pSeflik.includes(valSeflik);
        
        let matchCard = true;
        if (activeCardId !== 'total') {
            let c = systemSettings.cards.find(x => x.id === activeCardId);
            if (c) {
                if (c.type === 'custom') {
                    if (c.func === 'izinli') {
                        let izinde = false;
                        if(p.durum === "Aktif" || p.durum === "AKTİF") {
                            if(p.izinler) {
                                izinde = p.izinler.some(iz => {
                                    let b = new Date(iz.baslangic); b.setHours(0,0,0,0);
                                    let bit = new Date(iz.bitis); bit.setHours(23,59,59,999);
                                    return SYSTEM_TODAY >= b && SYSTEM_TODAY <= bit;
                                });
                            }
                        }
                        matchCard = izinde;
                    } else if (c.func === 'zimmetli') {
                        matchCard = (p.durum === "Aktif" || p.durum === "AKTİF") && p.zimmetler && p.zimmetler.length > 0;
                    }
                } else if (c.type === 'cinsiyet') {
                    matchCard = (p.cinsiyet || "").toLocaleUpperCase('tr-TR') === c.value.toLocaleUpperCase('tr-TR');
                } else if (c.type === 'unvan') {
                    matchCard = (p.unvan || "").toLocaleUpperCase('tr-TR') === c.value.toLocaleUpperCase('tr-TR');
                }
            }
        }
        
        return matchSearch && mDurum && mKadroSirket && mBina && mSeflik && matchCard;
    });
    renderTable(currentFilteredData);
}

["filter-search", "filter-durum", "filter-kadroSirket", "filter-bina", "filter-seflik"].forEach(id => {
    document.getElementById(id).addEventListener(id === "filter-search" ? "input" : "change", () => {
        if(id !== "filter-search" && activeCardId !== 'total') activeCardId = 'total'; 
        applyFilters();
    });
});

function openProfileModal(id) {
    const p = personnelData.find(x => x.id === id);
    if(!p) return;
    selectedUserId = id;

    const setVal = (eId, val) => { const el = document.getElementById(eId); if(el) el.innerHTML = val; };

    document.getElementById("pv_foto").src = getAvatarUrl(p.fotoUrl, p.cinsiyet);
    setVal("pv_ad", (p.adSoyad || "").toLocaleUpperCase('tr-TR'));
    
    let fUnvan = p.unvan || "";
    let fSeflik = p.seflik || "";
    setVal("pv_gorev", `${fUnvan} / ${fSeflik}`.toLocaleUpperCase('tr-TR'));
    
    const durumEl = document.getElementById("pv_durum");
    if(durumEl) {
        durumEl.innerText = p.durum;
        durumEl.className = `px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${p.durum === 'Aktif' || p.durum === 'AKTİF' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`;
    }
    setVal("pv_tcHeader", p.tcNo);
    setVal("pv_dogum", `${formatDateTR(p.dogumTarihi) || '-'} <span class="text-slate-400">(${getAge(p.dogumTarihi)} Yaş)</span>`); 
    setVal("pv_medeni", `${(p.medeniHal||"-").toLocaleUpperCase('tr-TR')} (${p.cocukSayisi || 0} Çocuk)`);
    setVal("pv_cinsiyet", (p.cinsiyet||"-").toLocaleUpperCase('tr-TR'));
    setVal("pv_tahsil", (p.tahsil||"-").toLocaleUpperCase('tr-TR')); 
    setVal("pv_anababa", `${(p.anaAdi||"-").toLocaleUpperCase('tr-TR')} / ${(p.babaAdi||"-").toLocaleUpperCase('tr-TR')}`); 
    setVal("pv_tel", p.tel || '-');
    setVal("pv_dahili", p.dahili || '-');
    setVal("pv_kan", (p.kanGrubu||"-").toLocaleUpperCase('tr-TR')); 
    setVal("pv_adres", (p.adres||"-").toLocaleUpperCase('tr-TR')); 
    setVal("pv_acilAd", (p.acilKisi||"-").toLocaleUpperCase('tr-TR'));
    setVal("pv_acilYakinlik", (p.acilYakinlik||"-").toLocaleUpperCase('tr-TR')); 
    setVal("pv_acilTel", p.acilTel || '-'); 
    
    setVal("pv_kadroSirket", (p.kadroSirket || "-").toLocaleUpperCase('tr-TR'));
    setVal("pv_unvan", (p.unvan || "-").toLocaleUpperCase('tr-TR')); 
    setVal("pv_seflik", (p.seflik || "-").toLocaleUpperCase('tr-TR')); 
    setVal("pv_bina", (p.bina||"-").toLocaleUpperCase('tr-TR')); 
    setVal("pv_sicil", (p.sicil||"-").toLocaleUpperCase('tr-TR'));
    setVal("pv_fiiliGorev", (p.fiiliGorev || "-").toLocaleUpperCase('tr-TR')); 
    setVal("pv_baslama", formatDateTR(p.gelisTarihi) || '-'); 
    setVal("pv_ayrilis", formatDateTR(p.ayrilisTarihi) || 'Halen Çalışıyor');

    const notlarInput = document.getElementById("pv_notlar_input");
    if(notlarInput) notlarInput.value = p.notlar || "";

    renderZimmetTable();
    renderIzinTable();
    openModal('profileModal');
    switchTab('genel');
}

function savePersonelNot() {
    const val = document.getElementById("pv_notlar_input").value;
    const p = personnelData.find(x => x.id === selectedUserId);
    if(p) {
        p.notlar = val;
        if(saveToDatabase()) {
            showToast("Not başarıyla kaydedildi.", "success");
        }
    }
}

function switchTab(t) {
    document.querySelectorAll('.tab-panel').forEach(el => { el.classList.add('hidden'); el.classList.remove('animate-fadeIn'); });
    const aT = document.getElementById('tab_' + t); 
    if(aT) { aT.classList.remove('hidden'); aT.classList.add('animate-fadeIn'); }
    
    document.querySelectorAll('.profile-tab-btn').forEach(b => { b.classList.remove('border-blue-600', 'text-blue-600'); b.classList.add('border-transparent', 'text-slate-500'); });
    const aB = document.getElementById('tabBtn_' + t);
    if(aB) { aB.classList.remove('border-transparent', 'text-slate-500'); aB.classList.add('border-blue-600', 'text-blue-600'); }
}

let currentFormTabIdx = 0;
const formTabs = ['kisisel', 'kurum', 'iletisim'];

function switchFormTab(t) {
    currentFormTabIdx = formTabs.indexOf(t);
    document.querySelectorAll('.form-tab-panel').forEach(el => {
        el.classList.add('hidden'); el.classList.remove('animate-fadeIn');
    });
    const aT = document.getElementById('formTab_' + t); 
    if(aT) { aT.classList.remove('hidden'); aT.classList.add('animate-fadeIn'); }
    
    document.querySelectorAll('.form-tab-btn').forEach(b => { 
        b.classList.remove('border-blue-600', 'text-blue-600'); 
        b.classList.add('border-transparent', 'text-slate-500'); 
    });
    const aB = document.getElementById('formTabBtn_' + t);
    if(aB) { 
        aB.classList.remove('border-transparent', 'text-slate-500'); 
        aB.classList.add('border-blue-600', 'text-blue-600'); 
    }

    const btnPrev = document.getElementById('formBtnPrev');
    const btnNext = document.getElementById('formBtnNext');
    if(btnPrev) btnPrev.classList.toggle('hidden', currentFormTabIdx === 0);
    if(btnNext) btnNext.classList.toggle('hidden', currentFormTabIdx === formTabs.length - 1);
}

function navigateFormTab(dir) {
    let newIdx = currentFormTabIdx + dir;
    if(newIdx >= 0 && newIdx < formTabs.length) { switchFormTab(formTabs[newIdx]); }
}

function openZimmetForm() {
    document.getElementById('z_urun').value = '';
    document.getElementById('z_seri').value = '';
    document.getElementById('z_tarih').value = '';
    openModal('addZimmetModal');
}

function openIzinFromTimeline(id) {
    selectedUserId = id;
    openIzinForm();
}

function openIzinForm() {
    document.getElementById('i_tur').selectedIndex = 0;
    document.getElementById('i_bas').value = '';
    document.getElementById('i_bit').value = '';
    document.getElementById('i_aciklama').value = '';
    
    const p = personnelData.find(x => x.id === selectedUserId);
    const titleEl = document.getElementById("addIzinModalTitle");
    if(titleEl && p) {
        titleEl.innerHTML = `<i class="fas fa-plane-departure text-blue-500"></i> İzin İşle <span class="text-[10px] text-slate-400 font-bold ml-1 border-l border-slate-200 pl-2 uppercase">${p.adSoyad.split(' ')[0]}</span>`;
    }
    
    openModal('addIzinModal');
}

function openBulkIzinForm() {
    document.getElementById('bi_tur').selectedIndex = 0;
    document.getElementById('bi_bas').value = '';
    document.getElementById('bi_bit').value = '';
    document.getElementById('bi_aciklama').value = '';
    openModal('addBulkIzinModal');
}

function renderZimmetTable() {
    const tb = document.getElementById("zimmetTableBody"); if(!tb) return; tb.innerHTML = "";
    const p = personnelData.find(x => x.id === selectedUserId);
    if(!p.zimmetler || p.zimmetler.length === 0) { tb.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-500 font-semibold">Kayıtlı demirbaş bulunmuyor.</td></tr>'; return; }
    p.zimmetler.forEach(z => tb.innerHTML += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition"><td class="p-4 font-bold text-slate-700 uppercase">${z.urun}</td><td class="p-4 text-slate-600 uppercase">${z.seri}</td><td class="p-4 text-slate-600 font-semibold">${formatDateTR(z.tarih)}</td><td class="p-4 text-center"><button onclick="deleteZimmet(${z.id})" class="text-rose-500 hover:text-rose-700 bg-white border border-slate-200 hover:bg-rose-50 w-8 h-8 rounded-md transition"><i class="fas fa-trash-alt"></i></button></td></tr>`);
}

function saveZimmet() {
    try {
        const u = document.getElementById("z_urun").value.trim();
        const t = document.getElementById("z_tarih").value;
        if(!u || !t) { showToast("Demirbaş adı ve tarihi zorunludur!", "error"); return; }
        const p = personnelData.find(x => x.id === selectedUserId);
        p.zimmetler = p.zimmetler || []; 
        p.zimmetler.push({ id: Date.now(), urun: u, seri: document.getElementById("z_seri").value, tarih: t });
        
        if(saveToDatabase()) {
            if(document.getElementById("profileModal").classList.contains("show")) renderZimmetTable(); 
            applyFilters(); closeModal('addZimmetModal');
            showToast("Demirbaş başarıyla eklendi.", "success");
        }
    } catch (error) { showToast("Demirbaş eklenirken hata oluştu.", "error"); }
}

function deleteZimmet(id) { 
    try {
        if(confirm("Silmek istediğinize emin misiniz?")) {
            personnelData.find(x => x.id === selectedUserId).zimmetler = personnelData.find(x => x.id === selectedUserId).zimmetler.filter(z => z.id !== id); 
            saveToDatabase(); 
            if(document.getElementById("profileModal").classList.contains("show")) renderZimmetTable(); 
            applyFilters(); 
            showToast("Demirbaş silindi.", "success");
        }
    } catch (error) { showToast("Demirbaş silinirken hata oluştu.", "error"); }
}

function renderIzinTable() {
    const tb = document.getElementById("izinTableBody"); if(!tb) return; tb.innerHTML = "";
    const p = personnelData.find(x => x.id === selectedUserId);
    
    let yillik = 0, rapor = 0, idari = 0, saatlik = 0, ucretsiz = 0;
    const currentYear = SYSTEM_TODAY.getFullYear();

    if(p && p.izinler) {
        p.izinler.forEach(iz => {
            let dBas = new Date(iz.baslangic); dBas.setHours(0,0,0,0);
            let dBit = new Date(iz.bitis); dBit.setHours(23,59,59,999);
            
            let tempDate = new Date(dBas);
            let gunSayisi = 0;
            while(tempDate <= dBit) {
                if(tempDate.getFullYear() === currentYear) gunSayisi++;
                tempDate.setDate(tempDate.getDate() + 1);
            }

            if(gunSayisi > 0) {
                if(iz.tur.includes('Yıllık') || iz.tur.includes('YILLIK')) yillik += gunSayisi;
                else if(iz.tur.includes('Rapor') || iz.tur.includes('RAPOR')) rapor += gunSayisi;
                else if(iz.tur.includes('İdari') || iz.tur.includes('İDARİ')) idari += gunSayisi;
                else if(iz.tur.includes('Saatlik') || iz.tur.includes('SAATLİK')) saatlik += gunSayisi; 
                else if(iz.tur.includes('Ücretsiz') || iz.tur.includes('ÜCRETSİZ')) ucretsiz += gunSayisi; 
            }
        });
    }

    const summaryContainer = document.getElementById("izinSummaryContainer");
    if(summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="bg-rose-50 border border-rose-200 py-3 rounded-lg text-center flex flex-col justify-center"><div class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">${currentYear} YILLIK</div><div class="text-2xl font-black text-rose-700 leading-none">${yillik} <span class="text-[10px] font-semibold text-rose-500">GÜN</span></div></div>
            <div class="bg-emerald-50 border border-emerald-200 py-3 rounded-lg text-center flex flex-col justify-center"><div class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">${currentYear} RAPOR</div><div class="text-2xl font-black text-emerald-800 leading-none">${rapor} <span class="text-[10px] font-semibold text-emerald-600">GÜN</span></div></div>
            <div class="bg-amber-50 border border-amber-200 py-3 rounded-lg text-center flex flex-col justify-center"><div class="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">${currentYear} İDARİ</div><div class="text-2xl font-black text-amber-800 leading-none">${idari} <span class="text-[10px] font-semibold text-amber-600">GÜN</span></div></div>
            <div class="bg-violet-50 border border-violet-200 py-3 rounded-lg text-center flex flex-col justify-center"><div class="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">${currentYear} ÜCRETSİZ</div><div class="text-2xl font-black text-violet-800 leading-none">${ucretsiz} <span class="text-[10px] font-semibold text-violet-600">GÜN</span></div></div>
            <div class="bg-sky-50 border border-sky-200 py-3 rounded-lg text-center flex flex-col justify-center"><div class="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">${currentYear} SAATLİK</div><div class="text-2xl font-black text-sky-800 leading-none">${saatlik} <span class="text-[10px] font-semibold text-sky-600">KEZ</span></div></div>
        `;
    }

    if(!p.izinler || p.izinler.length === 0) { tb.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-500 font-semibold">Kayıtlı izin bulunmuyor.</td></tr>'; return; }
    p.izinler.sort((a,b)=>new Date(b.baslangic)-new Date(a.baslangic)).forEach(iz => {
        let cl = iz.tur.includes('Yıllık') || iz.tur.includes('YILLIK') ? 'izin-y' : 
                 (iz.tur.includes('Rapor') || iz.tur.includes('RAPOR') ? 'izin-r' : 
                 (iz.tur.includes('İdari') || iz.tur.includes('İDARİ') ? 'izin-i' : 
                 (iz.tur.includes('Ücretsiz') || iz.tur.includes('ÜCRETSİZ') ? 'izin-u' : 'izin-s')));
        
        let turLabel = iz.tur;

        tb.innerHTML += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition"><td class="p-4"><span class="px-2 py-1 text-[10px] font-bold rounded ${cl} uppercase">${turLabel}</span></td><td class="p-4 font-semibold text-slate-700">${formatDateTR(iz.baslangic)}</td><td class="p-4 font-semibold text-slate-700">${formatDateTR(iz.bitis)}</td><td class="p-4 text-slate-600 uppercase">${iz.aciklama}</td><td class="p-4 text-center"><button onclick="deleteIzin(${iz.id})" class="text-rose-500 hover:text-rose-700 bg-white border border-slate-200 hover:bg-rose-50 w-8 h-8 rounded-md transition"><i class="fas fa-trash-alt"></i></button></td></tr>`;
    });
}

function saveIzin() {
    try {
        const bas = document.getElementById("i_bas").value;
        const bit = document.getElementById("i_bit").value;
        const acik = document.getElementById("i_aciklama").value.trim();
        if(!bas || !bit || !acik) { showToast("Tarihler ve açıklama zorunludur!", "error"); return; }
        if(new Date(bas) > new Date(bit)) { showToast("Bitiş tarihi başlangıçtan küçük olamaz!", "error"); return; }

        const p = personnelData.find(x => x.id === selectedUserId);
        p.izinler = p.izinler || []; 
        p.izinler.push({ id: Date.now(), tur: document.getElementById("i_tur").value, baslangic: bas, bitis: bit, aciklama: acik });
        
        if(saveToDatabase()) {
            if(document.getElementById("profileModal").classList.contains("show")) {
                renderIzinTable(); 
            }
            applyFilters(); closeModal('addIzinModal'); 
            if(document.getElementById("timelineModal").classList.contains("show")) {
                generateTimeline();
            }
            showToast("İzin kaydı başarıyla eklendi.", "success");
        }
    } catch (error) { showToast("İzin eklenirken hata oluştu.", "error"); }
}

function deleteIzin(id) { 
    try {
        if(confirm("İzni silmek istediğinize emin misiniz?")) {
            personnelData.find(x => x.id === selectedUserId).izinler = personnelData.find(x => x.id === selectedUserId).izinler.filter(i => i.id !== id); 
            saveToDatabase(); 
            if(document.getElementById("profileModal").classList.contains("show")) renderIzinTable(); 
            applyFilters(); 
            if(document.getElementById("timelineModal").classList.contains("show")) generateTimeline(); 
            showToast("İzin silindi.", "success");
        }
    } catch (error) { showToast("İzin silinirken hata oluştu.", "error"); }
}

function saveBulkIzin() {
    const tur = document.getElementById("bi_tur").value;
    const bas = document.getElementById("bi_bas").value;
    const bit = document.getElementById("bi_bit").value;
    const acik = document.getElementById("bi_aciklama").value.trim();

    if(!bas || !bit || !acik) { showToast("Tarihler ve açıklama zorunludur!", "error"); return; }
    if(new Date(bas) > new Date(bit)) { showToast("Bitiş tarihi başlangıçtan küçük olamaz!", "error"); return; }

    const formatBas = formatDateTR(bas);
    const formatBit = formatDateTR(bit);

    if(!confirm(`DİKKAT: Sistemdeki tüm "Aktif" personellere ${formatBas} - ${formatBit} tarihleri arasında "${tur}" işlenecektir. Onaylıyor musunuz?`)) return;

    showSpinner("Toplu İzinler İşleniyor...");
    
    setTimeout(() => {
        let islenenPersonelSayisi = 0;
        personnelData.forEach(p => {
            if(p.durum === "Aktif" || p.durum === "AKTİF") {
                p.izinler = p.izinler || [];
                p.izinler.push({ id: Date.now() + Math.floor(Math.random()*10000), tur: tur, baslangic: bas, bitis: bit, aciklama: acik });
                islenenPersonelSayisi++;
            }
        });

        if(saveToDatabase()) {
            applyFilters();
            closeModal('addBulkIzinModal');
            if(document.getElementById("timelineModal").classList.contains("show")) generateTimeline();
            hideSpinner();
            showToast(`Toplam ${islenenPersonelSayisi} personele izin başarıyla işlendi.`, "success");
        } else { hideSpinner(); }
    }, 500);
}

function changeMonth(dir) {
    tlCurrentDate.setMonth(tlCurrentDate.getMonth() + dir);
    document.getElementById("timelineMonth").value = `${tlCurrentDate.getFullYear()}-${String(tlCurrentDate.getMonth()+1).padStart(2,'0')}`;
    generateTimeline();
}

window.showTooltip = function(e, el) {
    if (window.tooltipTimeout) { clearTimeout(window.tooltipTimeout); window.tooltipTimeout = null; }
    const tt = document.getElementById('global-tooltip');
    if(!tt) return;
    const tur = el.getAttribute('data-tur');
    const tarih = el.getAttribute('data-tarih');
    const desc = el.getAttribute('data-desc');
    const colorClass = el.getAttribute('data-color');
    let colorHex = "#fff";
    if(colorClass === "rose") colorHex = "#fb7185";
    if(colorClass === "emerald") colorHex = "#34d399";
    if(colorClass === "amber") colorHex = "#fbbf24";
    if(colorClass === "sky") colorHex = "#38bdf8";
    if(colorClass === "violet") colorHex = "#a78bfa";

    tt.innerHTML = `<div class='font-bold text-[12px] mb-1.5 flex items-center gap-1.5 uppercase' style='color:${colorHex}'><i class="fas fa-info-circle"></i> ${tur}</div><div class='text-slate-300 font-semibold mb-1.5 border-b border-slate-600 pb-2 text-[10px] uppercase tracking-wide'>Tarih: ${tarih}</div><div class='text-white mt-1 uppercase text-[11px] font-medium'>${desc}</div>`;
    tt.style.display = 'block';
    setTimeout(() => { tt.style.opacity = '1'; }, 10);
    window.updateTooltip(e);
}

window.updateTooltip = function(e) {
    const tt = document.getElementById('global-tooltip');
    if(tt && tt.style.display === 'block') {
        let left = e.clientX + 20; let top = e.clientY + 20;
        if (left + 240 > window.innerWidth) left = e.clientX - 260;
        if (top + 90 > window.innerHeight) top = e.clientY - 100;
        tt.style.left = left + 'px'; tt.style.top = top + 'px';
    }
}

window.hideTooltip = function() { 
    const tt = document.getElementById('global-tooltip');
    if(tt) { 
        tt.style.opacity = '0'; 
        window.tooltipTimeout = setTimeout(() => { tt.style.display = 'none'; }, 200); 
    }
}

function generateTimeline() {
    const inputVal = document.getElementById("timelineMonth").value;
    if(inputVal) {
        const parts = inputVal.split("-");
        tlCurrentDate.setFullYear(parseInt(parts[0]), parseInt(parts[1])-1, 1);
    }
    const y = tlCurrentDate.getFullYear(); const m = tlCurrentDate.getMonth();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const gunIsimleri = ["PZR", "PZT", "SAL", "ÇAR", "PER", "CUM", "CMT"]; 
    
    document.getElementById("timelineCurrentLabel").innerText = `${monthNames[m]} ${y}`.toLocaleUpperCase('tr-TR');

    let searchVal = "";
    const searchInputEl = document.getElementById("timelineSearchInput");
    if(searchInputEl) {
        searchVal = searchInputEl.value.toLocaleUpperCase('tr-TR');
    }

    let html = '<div class="inline-block min-w-full"><div class="tl-row tl-row-header"><div class="tl-name tl-name-header text-center justify-center text-[11px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200 w-[240px] min-w-[240px] shrink-0"><i class="fas fa-users mr-1.5"></i> PERSONEL</div>';
    
    for(let d=1; d<=daysInMonth; d++) {
        let currDate = new Date(y, m, d);
        let isWeek = (currDate.getDay() === 0 || currDate.getDay() === 6);
        let gunAdi = gunIsimleri[currDate.getDay()];
        html += `<div class="tl-cell flex flex-col items-center justify-center py-1.5 ${isWeek?'text-rose-600 bg-rose-50':'text-slate-600 bg-white'} border-b border-slate-200"><span class="text-[9px] font-semibold tracking-wide">${gunAdi}</span><span class="text-xs font-bold leading-tight">${d}</span></div>`;
    }
    html += '</div>';

    let baseData = getVisiblePersonnel(); 
    let activeData = baseData.filter(p => p.durum === "Aktif" || p.durum === "AKTİF");

    if(searchVal) {
        activeData = activeData.filter(p => p.adSoyad && p.adSoyad.toLocaleUpperCase('tr-TR').includes(searchVal));
    }

    activeData.forEach(p => {
        html += `<div class="tl-row hover:bg-slate-50 transition bg-white"><div class="tl-name truncate text-blue-700 font-bold force-upper border-b border-slate-100 cursor-pointer hover:bg-blue-50 flex items-center justify-between pr-2 transition-colors w-[240px] min-w-[240px] shrink-0" title="${p.adSoyad} (Tıkla ve İzin İşle)" onclick="openIzinFromTimeline(${p.id})"><span>${p.adSoyad}</span> <i class="fas fa-plus-circle opacity-50 text-[10px]"></i></div>`;
        for(let d=1; d<=daysInMonth; d++) {
            let cellDate = new Date(y, m, d);
            let isWeek = (cellDate.getDay() === 0 || cellDate.getDay() === 6);
            let cellClass = isWeek ? 'weekend border-b border-slate-100' : 'border-b border-slate-100';
            let content = ''; let tooltipEvents = '';

            if(p.izinler) {
                for(let iz of p.izinler) {
                    let bas = new Date(iz.baslangic); bas.setHours(0,0,0,0);
                    let bit = new Date(iz.bitis); bit.setHours(23,59,59,999);
                    if(cellDate >= bas && cellDate <= bit) {
                        let clColor = "";
                        if(iz.tur.includes("Yıllık") || iz.tur.includes('YILLIK')) { cellClass = "izin-y"; content = "Y"; clColor="rose"; }
                        else if(iz.tur.includes("Rapor") || iz.tur.includes('RAPOR')) { cellClass = "izin-r"; content = "R"; clColor="emerald"; }
                        else if(iz.tur.includes("İdari") || iz.tur.includes('İDARİ')) { cellClass = "izin-i"; content = "İ"; clColor="amber"; }
                        else if(iz.tur.includes("Saatlik") || iz.tur.includes('SAATLİK')) { cellClass = "izin-s"; content = "S"; clColor="sky"; }
                        else if(iz.tur.includes("Ücretsiz") || iz.tur.includes('ÜCRETSİZ')) { cellClass = "izin-u"; content = "Üİ"; clColor="violet"; }
                        
                        let safeDesc = (iz.aciklama || 'Açıklama belirtilmemiş').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
                        let toolTipDate = String(d).padStart(2,'0') + "." + String(m+1).padStart(2,'0') + "." + y;
                        tooltipEvents = `data-tur="${iz.tur}" data-tarih="${toolTipDate}" data-desc="${safeDesc}" data-color="${clColor}" onmouseover="showTooltip(event, this)" onmousemove="updateTooltip(event)" onmouseout="hideTooltip()"`;
                        break;
                    }
                }
            }
            html += `<div class="tl-cell flex items-center justify-center font-bold text-[10px] ${cellClass}" ${tooltipEvents}>${content}</div>`;
        }
        html += `</div>`;
    });
    html += '</div>';
    document.getElementById("timelineContainer").innerHTML = html;
}

function buildSettingsMenu() {
    const is1011 = currentUserRole === '1011';
    
    const tc = document.getElementById("settings-textareas-container"); tc.innerHTML = "";
    Object.keys(systemSettings.dropdowns).forEach(key => {
        if(key !== 'durum') {
            tc.innerHTML += `<div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-2">${systemSettings.dropdowns[key].label}</label>
                <textarea id="set_${key}" rows="4" class="w-full text-xs border border-slate-300 p-2.5 rounded-lg font-semibold text-slate-700 resize-none focus:outline-none focus:border-blue-500 uppercase force-upper ${is1011 ? 'bg-slate-100 opacity-70 cursor-not-allowed' : 'bg-white'}" oninput="this.value = this.value.toLocaleUpperCase('tr-TR')" ${is1011 ? 'readonly' : ''}>${systemSettings.dropdowns[key].values.join('\n')}</textarea>
            </div>`;
        }
    });
    const cc = document.getElementById("settings-cards-container"); cc.innerHTML = "";
    systemSettings.cards.forEach((c, i) => {
        cc.innerHTML += `<div class="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between transition hover:bg-slate-100 ${is1011 ? 'opacity-70' : ''}">
            <span class="text-[11px] font-bold uppercase text-slate-600 truncate mr-2" title="${c.title}">${c.title}</span>
            <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" id="ct_${i}" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-2 border-slate-300 appearance-none transition-all ${is1011 ? 'cursor-not-allowed' : 'cursor-pointer'}" ${c.active?'checked':''} ${is1011 ? 'disabled' : ''}/>
                <label for="ct_${i}" class="toggle-label block overflow-hidden h-5 rounded-full bg-slate-300 transition-colors ${is1011 ? 'cursor-not-allowed' : 'cursor-pointer'}"></label>
            </div></div>`;
    });
}

function saveSettings() {
    Object.keys(systemSettings.dropdowns).forEach(key => {
        if(key !== 'durum') {
            let vals = document.getElementById("set_" + key).value.toLocaleUpperCase('tr-TR').split('\n').map(s=>s.trim()).filter(s=>s!=="");
            if(vals.length === 0) vals = systemSettings.dropdowns[key].values;
            systemSettings.dropdowns[key].values = vals;
        }
    });
    systemSettings.cards.forEach((c, i) => c.active = document.getElementById("ct_" + i).checked);
    saveSettingsToDatabase();
    populateSelectOptions(); applyFilters(); renderStatsCards(); closeModal('settingsModal');
    showToast("Ayarlar başarıyla güncellendi.", "success");
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.match('image.*')) { showToast("Sadece resim dosyası yükleyebilirsiniz.", "error"); return; }
    
    showSpinner("Fotoğraf İşleniyor...");
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400; const MAX_HEIGHT = 400;
            let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
            else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            uploadedBase64Foto = canvas.toDataURL('image/jpeg', 0.75); 
            document.getElementById("previewFoto").src = uploadedBase64Foto;
            hideSpinner();
            showToast("Fotoğraf optimize edildi.", "success");
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function checkDurumStatus() {
    const bas = document.getElementById("f_gelisTarihi").value;
    const ayr = document.getElementById("f_ayrilisTarihi").value;
    const durumEl = document.getElementById("f_durum");
    let targetStatus = "";
    if(ayr) { targetStatus = "PASİF"; } else if (bas) { targetStatus = "AKTİF"; }
    if(targetStatus) {
        for(let i=0; i<durumEl.options.length; i++) {
            if(durumEl.options[i].value.toLocaleUpperCase('tr-TR') === targetStatus) { durumEl.selectedIndex = i; break; }
        }
    }
}

function openPersonnelForm() { 
    document.getElementById("personnelForm").reset(); 
    document.getElementById("formId").value = ""; 
    
    uploadedBase64Foto = ""; 
    const fileInput = document.getElementById("f_fotoFile");
    if(fileInput) fileInput.value = "";

    document.getElementById("formTitle").innerHTML = '<i class="fas fa-user-plus text-blue-600"></i> Yeni Personel Kaydı';
    
    const binaEl = document.getElementById("f_bina");
    if(currentUserRole === '1011') {
        binaEl.value = "1011 YERLEŞKESİ";
        binaEl.disabled = true;
        binaEl.classList.add("bg-slate-100", "text-slate-400", "cursor-not-allowed");
    } else {
        binaEl.disabled = false;
        binaEl.classList.remove("bg-slate-100", "text-slate-400", "cursor-not-allowed");
    }

    switchFormTab('kisisel'); 
    openModal('personnelModal'); 
    setTimeout(() => { updateFormSilhouette(); }, 50); 
}

function editPersonnelFromProfile() { 
    closeModal('profileModal');
    setTimeout(() => {
        const p = personnelData.find(x => x.id === selectedUserId);
        document.getElementById("formId").value = p.id;
        
        uploadedBase64Foto = p.fotoUrl && !p.fotoUrl.includes('data:image/svg') && !p.fotoUrl.includes('placeholder') ? p.fotoUrl : "";
        
        const fileInput = document.getElementById("f_fotoFile");
        if(fileInput) fileInput.value = "";

        document.getElementById("previewFoto").src = getAvatarUrl(p.fotoUrl, p.cinsiyet);
        document.getElementById("formTitle").innerHTML = '<i class="fas fa-user-edit text-blue-600"></i> Personeli Düzenle';
        
        const fieldsMap = {
            tcNo: p.tcNo, adSoyad: p.adSoyad, cinsiyet: p.cinsiyet, dogumTarihi: p.dogumTarihi,
            medeniHal: p.medeniHal, cocukSayisi: p.cocukSayisi, tahsil: p.tahsil,
            anaAdi: p.anaAdi, babaAdi: p.babaAdi, 
            kadroSirket: p.kadroSirket,
            unvan: p.unvan,
            seflik: p.seflik,
            bina: p.bina,
            sicil: p.sicil,
            fiiliGorev: p.fiiliGorev,
            durum: p.durum, gelisTarihi: p.gelisTarihi, ayrilisTarihi: p.ayrilisTarihi,
            tel: p.tel, dahili: p.dahili, kanGrubu: p.kanGrubu, adres: p.adres,
            acilKisi: p.acilKisi, acilYakinlik: p.acilYakinlik, acilTel: p.acilTel
        };

        Object.keys(fieldsMap).forEach(f => {
            let el = document.getElementById("f_"+f);
            if(el) {
                let val = fieldsMap[f] || "";
                if(el.tagName === 'SELECT' && val) {
                    let option = Array.from(el.options).find(o => o.value.toLocaleUpperCase('tr-TR') === val.toLocaleUpperCase('tr-TR'));
                    if (option) el.value = option.value;
                    else el.value = ""; 
                } else { el.value = val; }
            }
        });
        
        const binaEl = document.getElementById("f_bina");
        if(currentUserRole === '1011') {
            binaEl.value = "1011 YERLEŞKESİ";
            binaEl.disabled = true;
            binaEl.classList.add("bg-slate-100", "text-slate-400", "cursor-not-allowed");
        } else {
            binaEl.disabled = false;
            binaEl.classList.remove("bg-slate-100", "text-slate-400", "cursor-not-allowed");
        }

        switchFormTab('kisisel');
        openModal('personnelModal');
    }, 350); 
}

function savePersonnel() {
    try {
        const tc = document.getElementById("f_tcNo").value.trim();
        const ad = document.getElementById("f_adSoyad").value.trim();
        if(!tc || tc.length !== 11 || isNaN(tc)) { showToast("Lütfen 11 haneli sayısal bir TC Kimlik No girin.", "error"); return; }
        if(!ad) { showToast("Ad Soyad alanı zorunludur.", "error"); return; }
        const idVal = document.getElementById("formId").value;
        const exists = personnelData.find(p => p.tcNo === tc && p.id != idVal);
        if(exists) { showToast("Bu TC Kimlik numarasıyla zaten bir kayıt mevcut!", "error"); return; }
        const durumVal = document.getElementById("f_durum").value;
        const ayrilisVal = document.getElementById("f_ayrilisTarihi").value;
        if((durumVal === "Pasif" || durumVal === "PASİF") && !ayrilisVal) {
            showToast("Durumu 'Pasif' olan personel için 'Ayrılış Tarihi' girmek zorunludur!", "error");
            switchFormTab('kurum');
            document.getElementById("f_ayrilisTarihi").focus(); 
            return;
        }
        
        const pData = { id: idVal ? parseInt(idVal) : Date.now(), izinler: [], zimmetler: [], fotoUrl: uploadedBase64Foto || "" };
        const fields = ["tcNo", "adSoyad", "cinsiyet", "dogumTarihi", "medeniHal", "cocukSayisi", "tahsil", "anaAdi", "babaAdi", "kadroSirket", "unvan", "seflik", "bina", "sicil", "fiiliGorev", "durum", "gelisTarihi", "ayrilisTarihi", "tel", "dahili", "kanGrubu", "adres", "acilKisi", "acilYakinlik", "acilTel"];
        
        fields.forEach(f => { 
            let rawVal = document.getElementById("f_"+f).value;
            if(["dogumTarihi", "gelisTarihi", "ayrilisTarihi", "cocukSayisi", "tel", "dahili", "tcNo"].includes(f)) { pData[f] = rawVal; } 
            else { pData[f] = rawVal ? rawVal.toLocaleUpperCase('tr-TR') : ""; }
        });

        if(idVal) {
            const old = personnelData.find(x=>x.id === pData.id);
            pData.izinler = old.izinler || []; pData.zimmetler = old.zimmetler || [];
            pData.notlar = old.notlar || "";
            if(!uploadedBase64Foto) pData.fotoUrl = old.fotoUrl || ""; 
            personnelData[personnelData.findIndex(x=>x.id===pData.id)] = pData;
        } else { personnelData.unshift(pData); }
        
        if(saveToDatabase()) {
            applyFilters(); closeModal('personnelModal');
            showToast(idVal ? "Kayıt başarıyla güncellendi." : "Yeni personel kaydedildi.", "success");
        }
    } catch (error) { showToast("Personel kaydedilirken beklenmeyen bir hata oluştu.", "error"); }
}

function deletePersonnelFromProfile() { 
    if(confirm("Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?")) { 
        personnelData = personnelData.filter(x=>x.id!==selectedUserId); 
        if(saveToDatabase()) {
            closeModal('profileModal'); setTimeout(applyFilters, 350); 
            showToast("Personel kaydı silindi.", "success");
        }
    } 
}
