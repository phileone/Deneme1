// ========================================
// GPS & Harita Uygulaması - Game Maps IRL
// ========================================

let map;
let userMarker;
let accuracyCircle;
let userLocation = { lat: 0, lng: 0 };
let isLocked = true;
let watchId = null;
let isFirstLocation = true;
let poiMarkers = [];

// Harita Ayarları
const TILE_LAYER = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; OpenStreetMap contributors';
const DEFAULT_LAT = 41.0082;
const DEFAULT_LNG = 28.9784;
const DEFAULT_ZOOM = 14;

// RDR2 İkon Sistemi
const RDR2_ICONS = {
    market: '🏪',
    bar: '🍺',
    home: '🏠',
    saloon: '🏛️',
    camp: '⛺',
    danger: '💀',
    church: '⛪',
    shop: '🛍️',
    restaurant: '🍖',
    stable: '🐴',
    easter_egg: '🎭',
    treasure: '💎'
};

// POI Lokasyonları
const POI_LOCATIONS = [
    { lat: 41.0264, lng: 28.9924, name: 'BİM Market', type: 'market', description: 'Erzincan, Eminönü' },
    { lat: 41.0082, lng: 28.9784, name: 'A101 Market', type: 'market', description: 'Sultanahmet' },
    { lat: 41.0268, lng: 29.0042, name: 'Tesco Kipa', type: 'shop', description: 'Eminönü' },
    { lat: 41.0352, lng: 28.9921, name: 'Vault Bar', type: 'bar', description: 'Şehzadebaşı - RDR2 Easter Egg' },
    { lat: 41.0085, lng: 28.9819, name: 'Red Dead Saloon', type: 'saloon', description: 'Sultanahmet - Gizli Barınak 🎭' },
    { lat: 41.0055, lng: 28.9765, name: 'Traverna Yeşilçam', type: 'restaurant', description: 'Cağaloğlu' },
    { lat: 41.0301, lng: 29.0125, name: 'Kadıköy Kamp', type: 'camp', description: 'RDR2 Stilinde Kamp ⛺' },
    { lat: 41.0429, lng: 28.9887, name: 'Gümrük Kalesi', type: 'danger', description: 'Tehlikeli Bölge 💀' },
    { lat: 41.0105, lng: 28.9804, name: 'Gizli Hazine', type: 'treasure', description: 'Yeraltında 💎 bul' },
    { lat: 41.0211, lng: 28.9656, name: 'Arthur\'s Hide', type: 'easter_egg', description: 'RDR2 Easter Egg 🎭' },
    { lat: 41.0164, lng: 29.0075, name: 'Van der Linde Kampı', type: 'easter_egg', description: 'RDR2 Ana Kamp Referansı' }
];

// Sayfa Yüklendiğinde Haritayı Başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Yüklendi, harita başlatılıyor...');
    initMap();
});

// Harita Başlatma
function initMap() {
    try {
        console.log('initMap() çağrıldı');

        // Harita oluştur
        map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
        console.log('Leaflet harita oluşturuldu');

        // Tile layer ekle
        L.tileLayer(TILE_LAYER, {
            attribution: ATTRIBUTION,
            maxZoom: 19,
            className: 'rdr2-tiles'
        }).addTo(map);
        console.log('Tile layer eklendi');

        // Harita Stilini Uygula
        applyMapStyle();

        // POI Marker'larını Ekle
        addPOIMarkers();
        console.log('POI markers eklendi:', POI_LOCATIONS.length);

        // GPS Tracking Başlat
        startGPSTracking();

        // Kontrol Düğmelerini Kur
        setupControls();

        // POI sayısını göster
        document.getElementById('poiTotal').textContent = POI_LOCATIONS.length;

        console.log('Harita başarıyla başlatıldı!');
    } catch (error) {
        console.error('Harita başlatma hatası:', error);
        document.getElementById('status').textContent = '❌ Hata: ' + error.message;
    }
}

// POI Marker'larını Ekle
function addPOIMarkers() {
    POI_LOCATIONS.forEach((poi, index) => {
        const icon = RDR2_ICONS[poi.type] || '📍';

        const markerIcon = L.divIcon({
            className: 'poi-marker',
            html: `<div class="poi-icon" data-type="${poi.type}">${icon}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });

        const popupContent = `
            <div class="poi-popup">
                <div class="poi-popup-icon">${icon}</div>
                <h3>${poi.name}</h3>
                <p class="poi-description">${poi.description}</p>
                <p class="poi-coords">📍 ${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)}</p>
            </div>
        `;

        const marker = L.marker([poi.lat, poi.lng], { icon: markerIcon })
            .addTo(map)
            .bindPopup(popupContent);

        marker.on('mouseover', function() {
            this.openPopup();
        });

        marker.on('mouseout', function() {
            this.closePopup();
        });

        poiMarkers.push(marker);
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

        .leaflet-control-attribution {
            background: rgba(26, 26, 26, 0.8) !important;
            color: #999 !important;
            font-size: 11px !important;
        }

        .poi-marker {
            background: none !important;
            border: none !important;
            padding: 0 !important;
        }

        .poi-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            background: rgba(26, 26, 26, 0.85);
            border: 2px solid #d4af37;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            filter: drop-shadow(0 0 3px rgba(212, 175, 55, 0.6));
        }

        .poi-icon:hover {
            transform: scale(1.2);
            background: rgba(139, 115, 85, 0.9);
            box-shadow: 0 0 12px rgba(212, 175, 55, 0.8);
        }

        .poi-icon[data-type="easter_egg"] {
            animation: pulse 1.5s infinite;
        }

        .poi-icon[data-type="treasure"] {
            animation: glow 0.8s infinite alternate;
        }

        .poi-icon[data-type="danger"] {
            border-color: #ff4444 !important;
            animation: warning 0.6s infinite;
        }

        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 8px rgba(212, 175, 55, 0.5); }
            50% { box-shadow: 0 0 16px rgba(212, 175, 55, 0.9); }
        }

        @keyframes glow {
            from { filter: drop-shadow(0 0 4px #ffd700); }
            to { filter: drop-shadow(0 0 12px #ffd700); }
        }

        @keyframes warning {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .leaflet-popup-content-wrapper {
            background: rgba(26, 26, 26, 0.95) !important;
            border: 2px solid #d4af37 !important;
            border-radius: 8px !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7) !important;
        }

        .leaflet-popup-tip {
            border-top-color: rgba(26, 26, 26, 0.95) !important;
        }

        .poi-popup {
            color: #e0e0e0;
            text-align: center;
            padding: 5px;
        }

        .poi-popup-icon {
            font-size: 32px;
            margin-bottom: 8px;
        }

        .poi-popup h3 {
            color: #d4af37;
            margin: 6px 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .poi-description {
            font-size: 11px;
            color: #b0b0b0;
            margin: 4px 0;
            font-style: italic;
        }

        .poi-coords {
            font-size: 10px;
            color: #888;
            margin-top: 8px;
            font-family: monospace;
        }
    `;
    document.head.appendChild(style);
}

// GPS Tracking Başlat
function startGPSTracking() {
    const statusEl = document.getElementById('status');

    if (!navigator.geolocation) {
        statusEl.textContent = '❌ GPS bu cihazda desteklenmez';
        return;
    }

    statusEl.textContent = '📍 GPS bağlanıyor...';

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    watchId = navigator.geolocation.watchPosition(
        onLocationSuccess,
        onLocationError,
        options
    );
}

function onLocationSuccess(position) {
    const { latitude, longitude, accuracy } = position.coords;
    userLocation = { lat: latitude, lng: longitude };

    updateLocationDisplay(latitude, longitude, accuracy);
    updateMarker(latitude, longitude, accuracy);

    document.getElementById('status').textContent = '✅ GPS Aktif';

    if (isFirstLocation) {
        isFirstLocation = false;
        map.setView([latitude, longitude], 16);
    } else if (isLocked) {
        map.setView([latitude, longitude], map.getZoom());
    }
}

function onLocationError(error) {
    const statusEl = document.getElementById('status');

    switch (error.code) {
        case error.PERMISSION_DENIED:
            statusEl.textContent = '❌ GPS izni reddedildi';
            break;
        case error.POSITION_UNAVAILABLE:
            statusEl.textContent = '❌ Konum bilgisi yok';
            break;
        case error.TIMEOUT:
            statusEl.textContent = '⚠️ GPS zaman aşımı';
            break;
        default:
            statusEl.textContent = '❌ GPS hatası';
    }

    console.error('GPS Error:', error);
}

function updateLocationDisplay(lat, lng, accuracy) {
    document.getElementById('lat').textContent = lat.toFixed(6);
    document.getElementById('lon').textContent = lng.toFixed(6);
    document.getElementById('accuracy').textContent = Math.round(accuracy);
}

function updateMarker(lat, lng, accuracy) {
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
        fillOpacity: 0.1,
        dashArray: '5, 5',
        className: 'accuracy-circle'
    }).addTo(map);

    // Konumu Gösteren Marker
    if (!userMarker) {
        userMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '📍',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            })
        }).addTo(map);

        userMarker.bindPopup(`
            <div style="color: #333; font-size: 12px;">
                <strong>Mevcut Konumunuz</strong><br>
                Lat: ${lat.toFixed(6)}<br>
                Lng: ${lng.toFixed(6)}<br>
                Doğruluk: ±${Math.round(accuracy)}m
            </div>
        `);
    } else {
        userMarker.setLatLng([lat, lng]);
    }
}

// Kontrol Düğmeleri
function setupControls() {
    document.getElementById('centerBtn').addEventListener('click', () => {
        if (userLocation.lat !== 0) {
            map.setView([userLocation.lat, userLocation.lng], 16);
            document.getElementById('status').textContent = '✅ Konuma gidildi';
        }
    });

    document.getElementById('lockBtn').addEventListener('click', function() {
        isLocked = !isLocked;
        this.classList.toggle('active');
        const icon = isLocked ? '🔒' : '🔓';
        this.textContent = `${icon} ${isLocked ? 'Takip Et' : 'Takip Etme'}`;
        document.getElementById('status').textContent =
            isLocked ? '✅ Takip Aktif' : '⚪ Takip Deaktif';
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
        map.zoomIn();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        map.zoomOut();
    });

    map.on('zoomend', () => {
        document.getElementById('zoomLevel').textContent = map.getZoom();
    });
}

// Sayfa Kapatılırken Temizle
window.addEventListener('beforeunload', () => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
});
