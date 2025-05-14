const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3010;
const BASE_PATH = '/ekipman';

// Sabit e-posta adresi
const RECIPIENT_EMAIL = 'selim@vibemedya.com';

// Middleware
app.use(bodyParser.json());

// Statik dosyaları sunma - tüm yolları düzgün yapılandır
app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));

// E-posta göndermek için transporter oluştur
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL kullan
  auth: {
    user: 'selimcanoner16@gmail.com',
    pass: 'txhq rvcp pdth eyop' // Uygulama şifresi
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Data dosyasını oluştur veya oku
const DATA_FILE = path.join(__dirname, 'data', 'equipment.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

// data klasörünü kontrol et ve yoksa oluştur
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Varsayılan ekipman listesi
const defaultEquipment = [
  { id: 1, name: "Sony A6400 Body (Sarı Çanta)", checked: false },
  { id: 2, name: "Sony A6400 3 adet batarya", checked: false },
  { id: 3, name: "Sony 24-70 GMII Lens", checked: false },
  { id: 4, name: "Sony AX100 Kamera", checked: false },
  { id: 5, name: "Polarize & ND Mix Filtre", checked: false },
  { id: 6, name: "DJI Mic", checked: false },
  { id: 7, name: "DJI Air 3 Drone", checked: false },
  { id: 9, name: "Hava Pompası", checked: false },
  { id: 8, name: "SD Kartlıkları (Görüntü aktarımı)", transferChecked: false, checked: false }
];

// Varsayılan ayarlar
const defaultConfig = {
  title: ""
};

// Ekipman verilerini oku veya oluştur
let equipmentData;
try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    equipmentData = JSON.parse(data);
  } else {
    // Derin kopyalama ile yeni instance oluştur
    equipmentData = JSON.parse(JSON.stringify(defaultEquipment));
    fs.writeFileSync(DATA_FILE, JSON.stringify(equipmentData, null, 2));
  }
} catch (err) {
  console.error('Veri dosyası oluşturulurken hata:', err);
  // Derin kopyalama ile yeni instance oluştur
  equipmentData = JSON.parse(JSON.stringify(defaultEquipment));
}

// Ayarları oku veya oluştur
let configData;
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    configData = JSON.parse(data);
  } else {
    // Derin kopyalama ile yeni instance oluştur
    configData = JSON.parse(JSON.stringify(defaultConfig));
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));
  }
} catch (err) {
  console.error('Ayar dosyası oluşturulurken hata:', err);
  // Derin kopyalama ile yeni instance oluştur
  configData = JSON.parse(JSON.stringify(defaultConfig));
}

// API endpoint'leri
// Tüm ekipmanları getir
app.get(`/ekipman/api/equipment`, (req, res) => {
  res.json(equipmentData);
});

// Ayarları getir
app.get(`/ekipman/api/config`, (req, res) => {
  res.json(configData);
});

// Ayarları güncelle
app.post(`/ekipman/api/config`, (req, res) => {
  const { title } = req.body;
  
  if (title !== undefined) {
    configData.title = title;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));
  }
  
  res.json({ success: true, config: configData });
});

// Ekipman durumunu güncelle
app.post(`/ekipman/api/equipment/:id`, (req, res) => {
  const { id } = req.params;
  const { checked, transferChecked } = req.body;
  
  const index = equipmentData.findIndex(item => item.id === parseInt(id));
  
  if (index !== -1) {
    if (checked !== undefined) {
      equipmentData[index].checked = checked;
    }
    
    if (transferChecked !== undefined && equipmentData[index].hasOwnProperty('transferChecked')) {
      equipmentData[index].transferChecked = transferChecked;
    }
    
    // Değişiklikleri kaydet
    fs.writeFileSync(DATA_FILE, JSON.stringify(equipmentData, null, 2));
    res.json({ success: true, equipment: equipmentData[index] });
  } else {
    res.status(404).json({ success: false, message: 'Ekipman bulunamadı' });
  }
});

// Tüm verileri sıfırla
app.post(`/ekipman/api/reset`, (req, res) => {
  // Derin kopyalama ile yeni instance'lar oluştur
  equipmentData = JSON.parse(JSON.stringify(defaultEquipment));
  configData = JSON.parse(JSON.stringify(defaultConfig));
  
  // Dosyaları güncelle
  fs.writeFileSync(DATA_FILE, JSON.stringify(equipmentData, null, 2));
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));
  
  res.json({ success: true, equipment: equipmentData, config: configData });
});

// E-posta gönderme endpoint'i
app.post(`/ekipman/api/send-email`, async (req, res) => {
  const { subject } = req.body;
  
  try {
    // Mevcut ekipman durumunu ve başlığı al
    const equipmentStatus = equipmentData.map(item => {
      if (item.name.includes('SD Kartlıkları')) {
        return `${item.name}: ${item.checked ? 'Toplandı ✓' : 'Toplanmadı ✗'}, Görüntü Aktarımı: ${item.transferChecked ? 'Yapıldı ✓' : 'Yapılmadı ✗'}`;
      }
      return `${item.name}: ${item.checked ? 'Toplandı ✓' : 'Toplanmadı ✗'}`;
    }).join('\n');
    
    // Tarih formatını ayarla (GG.AA.YYYY)
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    
    // Başlık ve tarih birleştirme
    const baseTitle = configData.title || 'Ekipman Takip Listesi';
    const emailTitle = `${baseTitle} - ${formattedDate}`;
    
    // E-posta içeriği
    const mailOptions = {
      from: 'selim@vibemedya.com',
      to: RECIPIENT_EMAIL,
      subject: subject || emailTitle,
      text: `${emailTitle}\n\nEkipman Durumu:\n${equipmentStatus}\n\nTarih: ${new Date().toLocaleString('tr-TR')}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${emailTitle}</title>
          <style>
            @media screen and (max-width: 600px) {
              .responsive-table {
                width: 100% !important;
              }
              .responsive-table td, .responsive-table th {
                display: block !important;
                width: 100% !important;
                text-align: left !important;
              }
              .responsive-table td {
                border-bottom: 1px solid #eee !important;
                padding: 10px !important;
              }
              .responsive-table tr {
                margin-bottom: 15px !important;
                display: block !important;
                border: 1px solid #ddd !important;
              }
              .responsive-table thead {
                display: none !important;
              }
              .responsive-table td:before {
                content: attr(data-label);
                font-weight: bold;
                display: inline-block;
                width: 100%;
                margin-bottom: 5px;
              }
              .status-container {
                text-align: left !important;
                margin-top: 8px !important;
              }
            }
          </style>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; max-width: 600px;">
          <h2 style="color: #333; margin-bottom: 20px; font-size: 18px;">${emailTitle}</h2>
          
          <div style="margin-bottom: 30px;">
            <table class="responsive-table" style="width: 100%; border-collapse: collapse;">
              ${equipmentData.map((item, index) => {
                if (item.name.includes('SD Kartlıkları')) {
                  return `
                    <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#fff'}; border-bottom: 1px solid #eee;">
                      <td data-label="Ekipman:" style="padding: 12px 10px; font-weight: 500;">${item.name}</td>
                      <td data-label="Durum:" style="padding: 12px 10px;">
                        <div class="status-container" style="margin-bottom: 8px;">
                          <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; background-color: ${item.checked ? '#e6f4ea' : '#fce8e6'}; color: ${item.checked ? '#137333' : '#c5221f'}; font-size: 14px;">
                            ${item.checked ? 'Toplandı ✓' : 'Toplanmadı ✗'}
                          </span>
                        </div>
                        <div class="status-container">
                          <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; background-color: ${item.transferChecked ? '#e6f4ea' : '#fce8e6'}; color: ${item.transferChecked ? '#137333' : '#c5221f'}; font-size: 14px;">
                            Görüntü Aktarımı: ${item.transferChecked ? 'Yapıldı ✓' : 'Yapılmadı ✗'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  `;
                }
                return `
                  <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#fff'}; border-bottom: 1px solid #eee;">
                    <td data-label="Ekipman:" style="padding: 12px 10px; font-weight: 500;">${item.name}</td>
                    <td data-label="Durum:" style="padding: 12px 10px;">
                      <div class="status-container">
                        <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; background-color: ${item.checked ? '#e6f4ea' : '#fce8e6'}; color: ${item.checked ? '#137333' : '#c5221f'}; font-size: 14px;">
                          ${item.checked ? 'Toplandı ✓' : 'Toplanmadı ✗'}
                        </span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </table>
          </div>
          
          <p style="color: #5f6368; font-size: 13px; margin-top: 24px; font-style: italic;">Tarih: ${new Date().toLocaleString('tr-TR')}</p>
        </body>
        </html>
      `
    };
    
    // E-postayı gönder
    const info = await transporter.sendMail(mailOptions);
    console.log('E-posta gönderildi:', info.messageId);
    
    res.json({ success: true, message: 'E-posta başarıyla gönderildi' });
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'E-posta gönderilirken hata oluştu', error: error.message });
  }
});

// Ana sayfayı gönder
app.get(`/ekipman`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server'ı başlat
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  console.log(`Uygulama şu adreste çalışıyor: http://localhost:${PORT}/ekipman`);
}); 
