document.addEventListener('DOMContentLoaded', function () {

    let allStations = [];
    let stationMarkers = {}; // Object to hold station markers by UUID
    let activeMarker = null;

    // --- ICON DEFINITIONS ---
    const defaultIcon = L.divIcon({ className: 'radio-station-icon', html: '<div></div>', iconSize: [10, 10] });
    const playingIcon = L.divIcon({ className: 'radio-station-icon-playing', html: '<div></div>', iconSize: [16, 16] });

    // --- MAP INITIALIZATION ---
    const map = L.map('map', { maxBounds: [[-90, -180], [90, 180]] }).setView([51.505, -0.09], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd', maxZoom: 19, noWrap: true
    }).addTo(map);
    const markers = L.markerClusterGroup();

    // --- DOM ELEMENT REFERENCES ---
    const audioPlayer = document.getElementById('audio-player');
    const panelTitle = document.getElementById('panel-title');
    const stationList = document.getElementById('station-list');
    const loadingOverlay = document.getElementById('loading-overlay');
    const splashScreen = document.getElementById('splash-screen');
    const stationMetadata = document.getElementById('station-metadata');

    // --- SPLASH SCREEN --- 
    setTimeout(() => {
        splashScreen.classList.add('hidden');
    }, 2500); // Hide splash screen after 2.5 seconds

    // --- DATA FETCHING & MARKER CREATION ---
    fetch('/api/stations')
        .then(response => response.json())
        .then(stations => {
            if (stations.error) {
                loadingOverlay.innerHTML = '<p>Error loading stations. Please try again later.</p>';
                return;
            }
            allStations = stations;
            allStations.forEach(station => {
                if (station.geo_lat && station.geo_long) {
                    const marker = L.marker([station.geo_lat, station.geo_long], { icon: defaultIcon });
                    marker.bindPopup(`<b>${station.name}</b>`);
                    marker.on('click', () => updateStationList(station));
                    stationMarkers[station.stationuuid] = marker;
                    markers.addLayer(marker);
                }
            });
            map.addLayer(markers);
            // Wait for splash screen to fade before hiding loading screen
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 1000);
        })
        .catch(error => {
            console.error('Failed to fetch or process stations:', error);
            loadingOverlay.innerHTML = '<p>Error loading stations. Please try again later.</p>';
        });

    // --- CORE FUNCTIONS ---
    function playStation(station) {
        if (activeMarker) { activeMarker.setIcon(defaultIcon); }

        const newActiveMarker = stationMarkers[station.stationuuid];
        if (newActiveMarker) {
            newActiveMarker.setIcon(playingIcon);
            activeMarker = newActiveMarker;
        }

        panelTitle.textContent = `Playing: ${station.name}`;
        audioPlayer.src = station.url_resolved;
        audioPlayer.play();
        
        map.panTo([station.geo_lat, station.geo_long], { animate: true, duration: 1 });

        // Update metadata
        let tagsHTML = station.tags ? station.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join(' ') : 'No tags available';
        stationMetadata.innerHTML = `<span>Language: <b>${station.language || 'N/A'}</b></span> | <span>Tags: ${tagsHTML}</span>`;

        // Highlight in list
        document.querySelectorAll('.station-item').forEach(item => {
            item.classList.remove('playing');
            if (item.dataset.stationId === station.stationuuid) {
                item.classList.add('playing');
            }
        });
    }

    function updateStationList(clickedStation) {
        stationList.innerHTML = '';
        const clickedLatLng = L.latLng(clickedStation.geo_lat, clickedStation.geo_long);
        const radius = 0.5; // ~50km

        const nearbyStations = allStations.filter(station => {
            if (!station.geo_lat || !station.geo_long) return false;
            const stationLatLng = L.latLng(station.geo_lat, station.geo_long);
            return clickedLatLng.distanceTo(stationLatLng) < radius * 100000;
        });

        if (nearbyStations.length === 0) { nearbyStations.push(clickedStation); }

        nearbyStations.sort((a, b) => a.name.localeCompare(b.name)).forEach(station => {
            const item = document.createElement('div');
            item.className = 'station-item';
            item.textContent = station.name;
            item.dataset.stationId = station.stationuuid;
            item.addEventListener('click', () => playStation(station));
            stationList.appendChild(item);
        });

        playStation(clickedStation);
    }

    // --- EVENT LISTENERS ---
    audioPlayer.addEventListener('error', () => {
        panelTitle.textContent = 'Error: Stream unavailable';
        stationMetadata.innerHTML = '';
        if (activeMarker) {
            activeMarker.setIcon(defaultIcon);
            activeMarker = null;
        }
    });


});