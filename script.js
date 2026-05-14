console.log('Script.js yüklendi');

// Global Değişkenler
let map = null;
let userMarker = null;
let accuracyCircle = null;
let userLocation = { lat: 0, lng: 0 };
let isLocked = true;
let watchId = null;

// Sabitler
const DEFAULT_LAT = 41.0082;
const DEFAULT_LNG = 28.9784;
const DEFAULT_ZOOM = 14;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// POI İkonları
const ICONS = {
    market: '🏪',
    bar: '🍺',
    camp: '⛺',
    saloon: '🏛️',
    restaurant: '🍖',
    danger: '💀',
    treasure: '💎',
    easter_egg: '🎭'
};

// POI Lokasyonları
const POI_LOCATIONS = [
    { lat: 41.0264, lng: 28.9924, name: 'BİM Market', type: 'market', description: 'Erzincan, Eminönü' },
    { lat: 41.0082, lng: 28.9784, name: 'A101 Market', type: 'market', description: 'Sultanahmet' },
    { lat: 41.0268, lng: 29.0042, name: 'Tesco Kipa', type: 'market', description: 'Eminönü' },
    { lat: 41.0352, lng: 28.9921, name: 'Vault Bar', type: 'bar', description: 'Şehzadebaşı - RDR2 Easter Egg' },
    { lat: 41.0085, lng: 28.9819, name: 'Red Dead Saloon', type: 'saloon', description: 'Sultanahmet - Gizli Barınak 🎭' },
    { lat: 41.0055, lng: 28.9765, name: 'Traverna Yeşilçam', type: 'restaurant', description: 'Cağaloğlu' },
    { lat: 41.0301, lng: 29.0125, name: 'Kadıköy Kamp', type: 'camp', description: 'RDR2 Stilinde Kamp ⛺' },
    { lat: 41.0429, lng: 28.9887, name: 'Gümrük Kalesi', type: 'danger', description: 'Tehlikeli Bölge 💀' },
    { lat: 41.0105, lng: 28.9804, name: 'Gizli Hazine', type: 'treasure', description: 'Yeraltında 💎 bul' },
    { lat: 41.0211, lng: 28.9656, name: 'Arthur\'s Hide', type: 'easter_egg', description: 'RDR2 Easter Egg 🎭' },
    { lat: 41.0164, lng: 29.0075, name: 'Van der Linde Kampı', type: 'easter_egg', description: 'RDR2 Ana Kamp Referansı' }
];

// Harita Başlatma
function initMap() {
    try {
        console.log('initMap() başladı');

        if (!window.L) {
            throw new Error('Leaflet.js yüklenmemiş!');
        }

        // Harita Oluştur
        map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
        console.log('✅ Harita oluşturuldu');

        // Tile Layer Ekle
        L.tileLayer(TILE_URL, {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        console.log('✅ Tile layer eklendi');

        // Harita Stilini Uygula
        applyMapStyle();

        // POI Marker'larını Ekle
        addPOIMakers();
        console.log('✅ POI markers eklendi');

        // POI Sayısını Göster
        document.getElementById('poiTotal').textContent = POI_LOCATIONS.length;

        // Kontrolleri Kur
        setupControls();

        // GPS Başlat
        startGPS();

        console.log('✅ Harita başarıyla başlatıldı!');
        document.getElementById('status').textContent = '✅ Hazır';

    } catch (error) {
        console.error('Hata:', error.message);
        document.getElementById('status').textContent = '❌ ' + error.message;
    }
}

// POI Marker'larını Ekle
function addPOIMakers() {
    if (!map) {
        console.error('Harita başlatılmamış!');
        return;
    }

    POI_LOCATIONS.forEach((poi) => {
        const icon = ICONS[poi.type] || '📍';

        const customIcon = L.divIcon({
            className: 'poi-marker',
            html: `<div class="poi-icon" style="font-size: 24px; text-align: center; line-height: 40px;">${icon}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        const marker = L.marker([poi.lat, poi.lng], { icon: customIcon })
            .bindPopup(`<b>${poi.name}</b><br>${poi.description}`)
            .addTo(map);

        marker.on('mouseover', () => marker.openPopup());
        marker.on('mouseout', () => marker.closePopup());
    });
}

// Harita Stilini Uygula
function applyMapStyle() {
    const style = document.createElement('style');
    style.textContent = `
        .leaflet-tile {
            filter: sepia(0.25) saturate(0.85) contrast(1.1);
        }

        .leaflet-container {
            background-color: #2a2a2a;
        }

        .leaflet-control-zoom-in,
        .leaflet-control-zoom-out {
            background-color: rgba(139, 115, 85, 0.8) !important;
            color: #d4af37 !important;
            font-weight: bold !important;
        }

        .leaflet-popup-content-wrapper {
            background: rgba(26, 26, 26, 0.95) !important;
            border: 2px solid #d4af37 !important;
            border-radius: 8px !important;
            color: #e0e0e0 !important;
        }

        .leaflet-popup-tip {
            background: rgba(26, 26, 26, 0.95) !important;
            border-top-color: rgba(26, 26, 26, 0.95) !important;
        }

        .leaflet-popup-content {
            color: #e0e0e0 !important;
        }

        .leaflet-popup-content b {
            color: #d4af37 !important;
        }

        .poi-marker {
            background: none !important;
            border: none !important;
        }

        .poi-icon {
            background: rgba(26, 26, 26, 0.85);
            border: 2px solid #d4af37;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 0 8px rgba(212, 175, 55, 0.6);
            transition: all 0.3s ease;
        }

        .poi-icon:hover {
            transform: scale(1.2);
            box-shadow: 0 0 16px rgba(212, 175, 55, 0.9);
        }
    `;
    document.head.appendChild(style);
}

// GPS Başlat
function startGPS() {
    if (!navigator.geolocation) {
        document.getElementById('status').textContent = '❌ GPS desteklenmiyor';
        return;
    }

    document.getElementById('status').textContent = '📍 GPS bağlanıyor...';

    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            userLocation = { lat: latitude, lng: longitude };

            document.getElementById('lat').textContent = latitude.toFixed(6);
            document.getElementById('lon').textContent = longitude.toFixed(6);
            document.getElementById('accuracy').textContent = Math.round(accuracy);

            updateUserMarker(latitude, longitude, accuracy);

            if (isLocked && map) {
                map.setView([latitude, longitude], map.getZoom());
            }

            document.getElementById('status').textContent = '✅ GPS Aktif';
        },
        (error) => {
            console.error('GPS Hatası:', error);
            document.getElementById('status').textContent = '⚠️ GPS Hatası: ' + error.message;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Kullanıcı Marker'ını Güncelle
function updateUserMarker(lat, lng, accuracy) {
    if (!map) return;

    // Doğruluk Çemberi
    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
    }

    accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#d4af37',
        weight: 2,
        opacity: 0.4,
        fill: true,
        fillColor: '#d4af37',
        fillOpacity: 0.1
    }).addTo(map);

    // Konumu Gösteren Marker
    if (!userMarker) {
        userMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'user-marker',
                html: '📍',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            })
        }).addTo(map);
    } else {
        userMarker.setLatLng([lat, lng]);
    }
}

// Kontrol Düğmeleri
function setupControls() {
    document.getElementById('centerBtn').addEventListener('click', () => {
        if (map && userLocation.lat !== 0) {
            map.setView([userLocation.lat, userLocation.lng], 16);
        }
    });

    document.getElementById('lockBtn').addEventListener('click', function() {
        isLocked = !isLocked;
        this.classList.toggle('active');
        this.textContent = isLocked ? '🔒 Takip Et' : '🔓 Takip Etme';
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
        if (map) map.zoomIn();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        if (map) map.zoomOut();
    });

    if (map) {
        map.on('zoomend', () => {
            document.getElementById('zoomLevel').textContent = map.getZoom();
        });
    }
}

// Uygulama Başlat
function startApp() {
    console.log('startApp() çağrıldı');
    console.log('Leaflet var mı?', !!window.L);
    console.log('DOM hazır mı?', document.readyState);

    if (!window.L) {
        console.error('❌ Leaflet.js henüz yüklenmemiş!');
        setTimeout(startApp, 1000);
        return;
    }

    initMap();
}

// DOM Hazır mı Kontrol Et
if (document.readyState === 'loading') {
    console.log('DOM yükleniyor...');
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    console.log('DOM zaten hazır');
    startApp();
}

console.log('Script.js Başlatıldı');
