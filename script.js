// Harita ve GPS Yapılandırması
let map;
let userMarker;
let accuracyCircle;
let userLocation = { lat: 0, lng: 0 };
let isLocked = true;
let watchId = null;
let isFirstLocation = true;

// Harita Katmanları (Custom Tile Layer)
const tileLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = '&copy; OpenStreetMap contributors';

// Başlat
function initMap() {
    // Varsayılan konum (San Francisco - RDR2'nin esinlendiği bölge)
    const defaultLat = 37.7749;
    const defaultLng = -122.4194;

    map = L.map('map').setView([defaultLat, defaultLng], 13);

    // RDR2 Vintage Harita Teması
    L.tileLayer(tileLayer, {
        attribution: attribution,
        maxZoom: 19,
        className: 'rdr2-tiles'
    }).addTo(map);

    // Harita renderi sonrası sepia efekti
    updateMapStyle();

    // GPS İzle
    startGPSTracking();

    // Kontrol Düğmeleri
    setupControls();
}

// GPS İzleme
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

// RDR2 Harita Stili
function updateMapStyle() {
    const filter = document.createElement('style');
    filter.textContent = `
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
    `;
    document.head.appendChild(filter);
}

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', initMap);

// Sayfa Kapatılırken GPS'i Durdur
window.addEventListener('beforeunload', () => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
});
