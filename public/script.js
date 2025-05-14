document.addEventListener('DOMContentLoaded', () => {
  // DOM elemanlarını seç
  const BASE_PATH = '/ekipman';
  const equipmentList = document.getElementById('equipment-list');
  const resetBtn = document.getElementById('reset-btn');
  const mainTitle = document.getElementById('main-title');
  const titleCharCount = document.getElementById('title-char-count');
  const charCounter = document.querySelector('.char-counter');
  const emailBtn = document.getElementById('email-btn');
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notification-message');
  const notificationClose = document.getElementById('notification-close');
  const clearTitleBtn = document.getElementById('clear-title');
  const confirmDialog = document.getElementById('confirm-dialog');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmOkBtn = document.getElementById('confirm-ok');
  const confirmCancelBtn = document.getElementById('confirm-cancel');
  const MAX_TITLE_LENGTH = 150;
  const NOTIFICATION_DURATION = 2000; // 2 saniye
  
  // Dokunmatik cihaz tespiti
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Dokunmatik cihaz sınıfını body'e ekle
  if (isTouchDevice) {
    document.body.classList.add('touch-device');
  }
  
  // Ekipman listesini ve ayarları yükle
  fetchEquipment();
  fetchConfig();
  
  // Sıfırlama düğmesine olay dinleyici ekle
  resetBtn.addEventListener('click', showResetConfirmation);
  
  // E-posta gönderme butonuna olay dinleyici ekle
  emailBtn.addEventListener('click', sendEmail);
  
  // Bildirim kapatma düğmesine olay dinleyici ekle
  notificationClose.addEventListener('click', hideNotification);
  
  // Başlık temizleme butonuna olay dinleyici ekle
  clearTitleBtn.addEventListener('click', clearTitle);
  
  // Onay dialog butonlarına olay dinleyicileri ekle
  confirmOkBtn.addEventListener('click', () => {
    hideConfirmDialog();
    resetAll();
  });
  
  confirmCancelBtn.addEventListener('click', hideConfirmDialog);
  
  // Dokunmatik deneyim için pasif dinleyiciler ekle
  document.addEventListener('touchstart', function() {}, {passive: true});
  document.addEventListener('touchmove', function() {}, {passive: true});
  
  // Dokunma geri bildirimi yardımcı fonksiyonu
  function vibrateDevice(pattern) {
    if ('vibrate' in navigator && isTouchDevice) {
      navigator.vibrate(pattern);
    }
  }
  
  // Başlığı temizle
  function clearTitle() {
    mainTitle.textContent = '';
    mainTitle.setAttribute('data-empty', 'true');
    titleCharCount.textContent = '0';
    charCounter.classList.remove('limit-near', 'limit-reached');
    saveTitle();
    
    // Dokunsal geri bildirim
    vibrateDevice(20);
  }
  
  // Onay dialogunu göster
  function showResetConfirmation() {
    confirmMessage.textContent = 'Tüm ekipmanları ve başlığı sıfırlamak istediğinizden emin misiniz?';
    confirmDialog.classList.add('show');
    
    // Dokunsal geri bildirim - onay isteği
    vibrateDevice([30, 50, 30]);
  }
  
  // Onay dialogunu gizle
  function hideConfirmDialog() {
    confirmDialog.classList.remove('show');
  }
  
  // Bildirim göster
  function showNotification(message, type = 'success', duration = NOTIFICATION_DURATION) {
    notificationMessage.textContent = message;
    notification.className = 'notification show ' + type;
    
    // Otomatik kapanma
    if (duration > 0) {
      setTimeout(() => {
        hideNotification();
      }, duration);
    }
    
    // Dokunma geri bildirimi (titreşim)
    vibrateDevice(type === 'error' ? [100, 50, 100] : 50);
  }
  
  // Bildirimi gizle
  function hideNotification() {
    notification.classList.remove('show');
  }
  
  // E-posta gönder
  async function sendEmail() {
    try {
      // Başlık kontrolü
      const titleText = mainTitle.textContent.trim();
      if (!titleText) {
        showNotification('Lütfen bir başlık girin!', 'error');
        mainTitle.focus();
        
        // Başlık alanını vurgula
        mainTitle.style.animation = 'none';
        setTimeout(() => {
          mainTitle.style.animation = 'title-required-animation 0.6s ease';
        }, 10);
        
        // Dokunsal geri bildirim - hata
        vibrateDevice([100, 50, 100]);
        return;
      }
      
      emailBtn.disabled = true;
      emailBtn.textContent = 'Gönderiliyor...';
      
      // Dokunsal geri bildirim - işlem başladı
      vibrateDevice(60);
      
      const response = await fetch(`${BASE_PATH}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      // Yanıt kontrolü
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Sunucudan geçersiz yanıt alındı. Lütfen tekrar deneyin.');
      }
      
      const result = await response.json();
      
      if (result.success) {
        showNotification('E-posta başarıyla gönderildi!');
      } else {
        throw new Error(result.message || 'E-posta gönderimi başarısız oldu.');
      }
    } catch (error) {
      showNotification(`Hata: ${error.message}`, 'error');
      console.error('E-posta gönderilirken hata:', error);
    } finally {
      emailBtn.disabled = false;
      emailBtn.textContent = 'E-posta Gönder';
    }
  }
  
  // Başlık değişikliğini dinle
  mainTitle.addEventListener('input', updateTitle);
  mainTitle.addEventListener('blur', saveTitle);
  mainTitle.addEventListener('keydown', checkTitleLength);
  
  // Başlık uzunluğunu kontrol et
  function checkTitleLength(e) {
    const maxLength = MAX_TITLE_LENGTH;
    const currentLength = e.target.textContent.length;
    
    // Eğer maks. uzunluğa ulaştıysa ve yeni karakter eklemeye çalışıyorsa (Delete veya Backspace hariç)
    if (currentLength >= maxLength && 
        e.key.length === 1 && 
        !e.ctrlKey && 
        e.key !== 'Backspace' && 
        e.key !== 'Delete' && 
        e.key !== 'ArrowLeft' && 
        e.key !== 'ArrowRight' && 
        e.key !== 'ArrowUp' && 
        e.key !== 'ArrowDown') {
      e.preventDefault();
    }
  }
  
  // Başlık değişikliğini güncelle
  function updateTitle() {
    const titleText = mainTitle.textContent.trim();
    const currentLength = titleText.length;
    
    // Başlık içeriği boş olmamalı
    if (titleText === '') {
      mainTitle.setAttribute('data-empty', 'true');
    } else {
      mainTitle.removeAttribute('data-empty');
    }
    
    // Karakter sayacını güncelle
    titleCharCount.textContent = currentLength;
    
    // Renk durumunu güncelle
    charCounter.classList.remove('limit-near', 'limit-reached');
    if (currentLength >= MAX_TITLE_LENGTH) {
      charCounter.classList.add('limit-reached');
    } else if (currentLength >= MAX_TITLE_LENGTH * 0.8) {
      charCounter.classList.add('limit-near');
    }
  }
  
  // Başlığı kaydet
  async function saveTitle() {
    const title = mainTitle.textContent.trim();
    
    try {
      await fetch(`${BASE_PATH}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });
    } catch (error) {
      console.error('Başlık kaydedilirken hata oluştu:', error);
      showNotification('Başlık kaydedilirken hata oluştu', 'error');
    }
  }
  
  // Ayarları getir
  async function fetchConfig() {
    try {
      const response = await fetch(`${BASE_PATH}/api/config`);
      const data = await response.json();
      
      if (data.title) {
        mainTitle.textContent = data.title;
        mainTitle.removeAttribute('data-empty');
        // Karakter sayacını güncelle
        titleCharCount.textContent = data.title.length;
        
        // Renk durumunu güncelle
        charCounter.classList.remove('limit-near', 'limit-reached');
        if (data.title.length >= MAX_TITLE_LENGTH) {
          charCounter.classList.add('limit-reached');
        } else if (data.title.length >= MAX_TITLE_LENGTH * 0.8) {
          charCounter.classList.add('limit-near');
        }
        

      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata oluştu:', error);
      showNotification('Ayarlar yüklenirken hata oluştu', 'error');
    }
  }
  
  // Ekipman listesini getir
  async function fetchEquipment() {
    try {
      const response = await fetch(`${BASE_PATH}/api/equipment`);
      const data = await response.json();
      
      renderEquipmentList(data);
    } catch (error) {
      console.error('Ekipmanlar yüklenirken hata oluştu:', error);
      showNotification('Ekipmanlar yüklenirken hata oluştu', 'error');
    }
  }
  
  // Ekipman listesini göster
  function renderEquipmentList(equipment) {
    equipmentList.innerHTML = '';
    
    equipment.forEach(item => {
      const equipmentItem = document.createElement('div');
      equipmentItem.className = 'equipment-item';
      
      // SD Kartlıkları için özel durum (çift kontrol kutusu)
      if (item.name.includes('SD Kartlıkları')) {
        equipmentItem.className += ' sd-card-item';
        
        // SD Kartlıkları başlığı
        const title = document.createElement('h3');
        title.textContent = item.name;
        title.className = 'sd-card-title';
        equipmentItem.appendChild(title);
        
        // Ana ekipman checkbox
        const mainCheckbox = createCheckbox(item.id, item.checked, 'checked', 'Toplandı');
        mainCheckbox.classList.add('clickable-row');
        
        // Tüm ana satıra tıklama işlevi ekle
        mainCheckbox.addEventListener(isTouchDevice ? 'touchend' : 'click', function(e) {
          if (e.target.tagName !== 'INPUT') {
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            const event = new Event('change');
            checkbox.dispatchEvent(event);
            
            // Dokunsal geri bildirim
            vibrateDevice(20);
          }
        });
        
        // Aktarım checkbox
        const transferGroup = document.createElement('div');
        transferGroup.className = 'checkbox-group clickable-row';
        const transferCheckbox = createCheckbox(item.id, item.transferChecked, 'transferChecked', 'Görüntüler aktarıldı');
        
        // Aktarım satırına tıklama işlevi ekle
        transferGroup.addEventListener(isTouchDevice ? 'touchend' : 'click', function(e) {
          if (e.target.tagName !== 'INPUT') {
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            const event = new Event('change');
            checkbox.dispatchEvent(event);
            
            // Dokunsal geri bildirim
            vibrateDevice(20);
          }
        });
        
        // Elemenlere ekle
        equipmentItem.appendChild(mainCheckbox);
        transferGroup.appendChild(transferCheckbox);
        equipmentItem.appendChild(transferGroup);
      } else {
        // Normal ekipman için tek checkbox
        const checkbox = createCheckbox(item.id, item.checked, 'checked', item.name);
        equipmentItem.appendChild(checkbox);
        
        // Tüm satıra tıklama işlevi ekle
        equipmentItem.addEventListener(isTouchDevice ? 'touchend' : 'click', function(e) {
          if (e.target.tagName !== 'INPUT') {
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            const event = new Event('change');
            checkbox.dispatchEvent(event);
            
            // Dokunsal geri bildirim
            vibrateDevice(20);
          }
        });
        
        // Satır için tıklanabilir stil ekle
        equipmentItem.classList.add('clickable-row');
      }
      
      equipmentList.appendChild(equipmentItem);
    });
  }
  
  // Checkbox oluştur
  function createCheckbox(itemId, isChecked, checkType, labelText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-wrapper';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.checked = isChecked;
    checkbox.dataset.id = itemId;
    checkbox.dataset.checkType = checkType;
    
    checkbox.addEventListener('change', handleCheckboxChange);
    
    const label = document.createElement('label');
    label.textContent = labelText;
    
    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    
    return wrapper;
  }
  
  // Checkbox değişikliklerini işle
  async function handleCheckboxChange(event) {
    const checkbox = event.target;
    const itemId = checkbox.dataset.id;
    const checkType = checkbox.dataset.checkType;
    const isChecked = checkbox.checked;
    
    // Dokunsal geri bildirim
    vibrateDevice(isChecked ? 40 : 20);
    
    try {
      const updateData = {};
      updateData[checkType] = isChecked;
      
      const response = await fetch(`${BASE_PATH}/api/equipment/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Güncelleme başarısız oldu');
      }
      
    } catch (error) {
      console.error('Ekipman güncellenirken hata oluştu:', error);
      showNotification('Ekipman güncellenirken hata oluştu', 'error');
      // Hata durumunda checkbox'ı önceki haline getir
      checkbox.checked = !isChecked;
    }
  }
  
  // Tüm verileri sıfırla
  async function resetAll() {
    try {
      // Dokunsal geri bildirim - işlem başladı
      vibrateDevice(60);
      
      const response = await fetch(`${BASE_PATH}/api/reset`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        renderEquipmentList(data.equipment);
        
        // Başlığı temizle
        mainTitle.textContent = '';
        mainTitle.setAttribute('data-empty', 'true');
        
        // Karakter sayacını sıfırla
        titleCharCount.textContent = '0';
        charCounter.classList.remove('limit-near', 'limit-reached');
        
        // Animasyonu temizle
        mainTitle.style.animation = 'none';
        
        showNotification('Tüm veriler sıfırlandı');
      } else {
        throw new Error('Sıfırlama başarısız oldu');
      }
    } catch (error) {
      console.error('Veriler sıfırlanırken hata oluştu:', error);
      showNotification('Veriler sıfırlanırken hata oluştu', 'error');
    }
  }
}); 
