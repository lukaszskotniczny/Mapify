
const SUPABASE_URL = 'https://kzvyvbluisghdeajkttd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dnl2Ymx1aXNnaGRlYWprdHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MTE3ODYsImV4cCI6MjA3Nzk4Nzc4Nn0.SS2c25L_NAfgijyt6nmS3bOVqc73Gtmq6aQk91MHZtU';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const map = L.map('map', {
    attributionControl: false
}).setView([50.0614, 19.9366], 13);

// DODAJ WARSTWY OD RAZU NA POCZĄTKU
const lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '',
    maxZoom: 19
});

const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '',
    maxZoom: 19
});

// Sprawdź zapisany motyw PRZED inicjalizacją
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    darkLayer.addTo(map);
    document.body.classList.add('dark-mode');
} else {
    lightLayer.addTo(map);
}

let markers = [];
let allPlaces = [];
let currentFilter = 'all';


const modal = document.getElementById('addPlaceModal');
const closeBtn = document.getElementsByClassName('close')[0];
const form = document.getElementById('addPlaceForm');
let currentLat, currentLng;

function getCategoryColor(category) {
    const colors = {
        'bieganie': '#3498db',
        'randka': '#e74c3c',
        'nostalgiczne': '#9b59b6',
        'trening': '#2ecc71',
        'relaks': '#1abc9c',
        'impreza': '#f39c12',
        'inne': '#95a5a6'
    };
    return colors[category] || '#95a5a6';
}

function createColoredIcon(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 25px; height: 25px; 
               border-radius: 50% 50% 50% 0; transform: rotate(-45deg); 
               border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
               <div style="width: 10px; height: 10px; background: white; 
               border-radius: 50%; position: absolute; top: 50%; left: 50%; 
               transform: translate(-50%, -50%);"></div></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 25]
    });
}

function getCategoryIcon(category) {
    const icons = {
        'bieganie': '🏃',
        'randka': '❤️',
        'nostalgiczne': '😌',
        'trening': '💪',
        'relaks': '🧘',
        'impreza': '🎉',
        'inne': '📌'
    };
    return icons[category] || '📌';
}

function loadPlaces() {
    console.log('=== START loadPlaces() ===');
    
    // Spróbuj załadować z backendu
    fetch('http://localhost:5000/api/places')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Backend niedostępny');
            }
        })
        .then(places => {
            console.log('Załadowano z backendu:', places.length, 'miejsc');
            allPlaces = places;
            renderMarkers();
        })
        .catch(error => {
            console.log('Backend niedostępny - ładowanie przykładowych miejsc');
            // PRZYKŁADOWE MIEJSCA - tryb demo
            allPlaces = [
                {
                    id: 1,
                    lat: 50.0619,
                    lng: 19.9368,
                    songTitle: "Test Song 1",
                    artist: "Test Artist",
                    category: "nostalgiczne",
                    description: "Testowe miejsce 1",
                    spotifyUrl: null,
                    albumImage: null,
                    previewUrl: null
                },
                {
                    id: 2,
                    lat: 50.0544,
                    lng: 19.9356,
                    songTitle: "Test Song 2",
                    artist: "Test Artist",
                    category: "bieganie",
                    description: "Testowe miejsce 2",
                    spotifyUrl: null,
                    albumImage: null,
                    previewUrl: null
                },
                {
                    id: 3,
                    lat: 50.0537,
                    lng: 19.9370,
                    songTitle: "Test Song 3",
                    artist: "Test Artist",
                    category: "randka",
                    description: "Testowe miejsce 3",
                    spotifyUrl: null,
                    albumImage: null,
                    previewUrl: null
                },
                {
                    id: 4,
                    lat: 50.0663,
                    lng: 19.9456,
                    songTitle: "Test Song 4",
                    artist: "Test Artist",
                    category: "trening",
                    description: "Testowe miejsce 4",
                    spotifyUrl: null,
                    albumImage: null,
                    previewUrl: null
                },
                {
                    id: 5,
                    lat: 50.0575,
                    lng: 19.9345,
                    songTitle: "Test Song 5",
                    artist: "Test Artist",
                    category: "relaks",
                    description: "Testowe miejsce 5",
                    spotifyUrl: null,
                    albumImage: null,
                    previewUrl: null
                },
                {
                    id: 6,
                    lat: 50.0688,
                    lng: 19.9071,
                    songTitle: "Test Song 6",
                    artist: "Test Artist",
                    category: "impreza",
                    description: "Testowe miejsce 6",
                    spotifyUrl: null,
                    albumImage: null,
                    previewUrl: null
                }
            ];
            renderMarkers();
        });
}

function renderMarkers() {
    // Usuń wszystkie markery
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Dodaj markery dla wszystkich miejsc
    allPlaces.forEach(place => {
        const color = getCategoryColor(place.category);
        const icon = createColoredIcon(color);
        
        const marker = L.marker([place.lat, place.lng], {icon: icon})
            .addTo(map);
        
        // Załaduj dane social przy otwarciu popup
        marker.on('popupopen', async () => {
            isPopupOpen = true;  // ← DODAJ tę linię
            console.log('Popup otwarty dla miejsca:', place.id);
            await updateLikeCount(place.id);
            await loadComments(place.id);
        });
        
        marker.on('popupclose', () => {
            isPopupOpen = false;  // ← DODAJ ten cały event
        });
        
        marker.bindPopup(`
                <div style="min-width: 260px;">
                    <b style="font-size: 16px;">${place.songTitle}</b><br>
                    <i style="color: #666;">${place.artist}</i><br>
                    
                    <span style="background: ${color}; color: white; padding: 3px 8px; 
                          border-radius: 5px; font-size: 12px; display: inline-block; 
                          margin-top: 5px; margin-bottom: 8px;">${getCategoryIcon(place.category)} ${place.category}</span>
                    
                    <p style="margin-top: 8px; margin-bottom: 10px;">${place.description}</p>
                    
                    <!-- Polubienia -->
                    <button id="like-btn-${place.id}" onclick="toggleLike(${place.id})" 
                            style="background: #e74c3c; color: white; border: none; 
                                   padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                   font-weight: bold; margin-bottom: 10px; width: 100%;">
                        🤍 0 polubień
                    </button>
                    
                    <!-- Komentarze -->
                    <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
                        <strong>💬 Komentarze:</strong>
                        <div id="comments-${place.id}" style="max-height: 150px; overflow-y: auto; margin: 10px 0;">
                            Ładowanie...
                        </div>
                        
                               
                        
                        <textarea id="comment-text-${place.id}" placeholder="Dodaj komentarz..." 
                                  style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 5px; resize: none;" 
                                  rows="2"></textarea>
                        
                        <button onclick="submitComment(${place.id})" 
                                style="background: #3498db; color: white; border: none; 
                                       padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                       font-weight: bold; width: 100%;">
                            📤 Dodaj komentarz
                        </button>
                    </div>
                </div>
            `);
        
        markers.push(marker);
    });
    allPlaces.forEach(async (place) => {
        await updateLikeCount(place.id);
        await loadComments(place.id);
    });
    
    console.log('Dodano markerów:', markers.length);
    updateStats(allPlaces);
    console.log('=== KONIEC loadPlaces() ===');
}

async function addPlace(lat, lng, songTitle, artist, category, description, spotifyUrl, albumImage, previewUrl) {
    try {
        const response = await fetch('http://localhost:5000/api/places', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat: lat,
                lng: lng,
                songTitle: songTitle,
                artist: artist,
                category: category,
                description: description,
                spotifyUrl: spotifyUrl,
                albumImage: albumImage,
                previewUrl: previewUrl
            })
        });
        if (response.ok) {
            showToast('🎉 Miejsce dodane pomyślnie!', '✅');
            
            loadPlaces();
            
            map.flyTo([lat, lng], 15, {
                duration: 1.5,
                easeLinearity: 0.5
            });
            
            setTimeout(() => {
                markers.forEach(marker => {
                    const markerLatLng = marker.getLatLng();
                    if (Math.abs(markerLatLng.lat - lat) < 0.0001 && 
                        Math.abs(markerLatLng.lng - lng) < 0.0001) {
                        marker.openPopup();
                        
                        const el = marker.getElement();
                        if (el) {
                            el.classList.add('marker-pulse');
                            setTimeout(() => el.classList.remove('marker-pulse'), 2000);
                        }
                    }
                });
            }, 1600);
            
            currentFilter = 'all';
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector('.filter-btn').classList.add('active');
        }
    } catch (error) {
        console.error('Błąd dodawania miejsca:', error);
    }
}




map.on('dblclick', function(e) {
    currentLat = e.latlng.lat;
    currentLng = e.latlng.lng;
    modal.style.display = 'block';
});

closeBtn.onclick = function() {
    modal.style.display = 'none';
    form.reset();
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        form.reset();
    }
}

form.onsubmit = function(e) {
    e.preventDefault();
    
    const songTitle = document.getElementById('songTitle').value;
    const artist = document.getElementById('artist').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const spotifyUrl = document.getElementById('spotifyUrl').value;
    const albumImage = document.getElementById('albumImage').value;
    const previewUrl = document.getElementById('previewUrl').value;
    
    addPlace(currentLat, currentLng, songTitle, artist, category, description || 'Brak opisu', spotifyUrl, albumImage, previewUrl);
    
    modal.style.display = 'none';
    form.reset();
}

async function deletePlace(placeId) {
    if (!confirm('Czy na pewno chcesz usunąć to miejsce?')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:5000/api/places/${placeId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadPlaces();
            showToast('🗑️ Miejsce zostało usunięte', '✅');
        }
    } catch (error) {
        console.error('Błąd usuwania miejsca:', error);
        showToast('❌ Nie udało się usunąć miejsca', '⚠️');
    }
}

function updateStats(places) {
    document.getElementById('totalPlaces').textContent = places.length;
    
    if (places.length === 0) {
        document.getElementById('topCategory').textContent = '-';
        document.getElementById('topArtists').innerHTML = '<div style="text-align: center; color: #999;">Brak danych</div>';
        return;
    }
    
    const categoryCount = {};
    places.forEach(place => {
        categoryCount[place.category] = (categoryCount[place.category] || 0) + 1;
    });
    
    const topCategory = Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b
    );
    
    document.getElementById('topCategory').textContent = 
        `${getCategoryIcon(topCategory)} ${topCategory} (${categoryCount[topCategory]}x)`;
    
    const artistCount = {};
    places.forEach(place => {
        artistCount[place.artist] = (artistCount[place.artist] || 0) + 1;
    });
    
    const sortedArtists = Object.entries(artistCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (sortedArtists.length > 0) {
        const topArtistsHTML = sortedArtists.map((artist, index) => `
            <div class="top-artist-item">
                <span class="top-artist-name">${index + 1}. ${artist[0]}</span>
                <span class="top-artist-count">${artist[1]} ${artist[1] === 1 ? 'miejsce' : 'miejsca'}</span>
            </div>
        `).join('');
        
        document.getElementById('topArtists').innerHTML = topArtistsHTML;
    } else {
        document.getElementById('topArtists').innerHTML = '<div style="text-align: center; color: #999;">Brak danych</div>';
    }
    updateFilterCounts(places);
}

function updateFilterCounts(places) {
    const categoryCount = {};
    
    places.forEach(place => {
        categoryCount[place.category] = (categoryCount[place.category] || 0) + 1;
    });
    
    // Aktualizuj każdy przycisk filtra
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const category = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        const count = category === 'all' ? places.length : (categoryCount[category] || 0);
        
        // Znajdź tekst przycisku i dodaj licznik
        const btnText = btn.textContent.split('(')[0].trim();
        btn.textContent = `${btnText} (${count})`;
    });
}

function filterByCategory(category) {
    currentFilter = category;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    const filteredPlaces = category === 'all' 
        ? allPlaces 
        : allPlaces.filter(place => place.category === category);
    
    filteredPlaces.forEach(place => {
        const color = getCategoryColor(place.category);
        const icon = createColoredIcon(color);
        
        const marker = L.marker([place.lat, place.lng], {icon: icon})
            .addTo(map)
            .bindPopup(`
                <div style="min-width: 260px;">
                    ${place.albumImage ? `<img src="${place.albumImage}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;">` : ''}
                    
                    <b style="font-size: 16px;">${place.songTitle}</b><br>
                    <i style="color: #666;">${place.artist}</i><br>
                    
                    <span style="background: ${color}; color: white; padding: 3px 8px; 
                          border-radius: 5px; font-size: 12px; display: inline-block; 
                          margin-top: 5px; margin-bottom: 8px;">${getCategoryIcon(place.category)} ${place.category}</span>
                    
                    <p style="margin-top: 8px; margin-bottom: 10px;">${place.description}</p>
                    
                    ${place.previewUrl ? `
                        <audio controls style="width: 100%; margin-bottom: 10px;">
                            <source src="${place.previewUrl}" type="audio/mpeg">
                        </audio>
                    ` : '<p style="color: #999; font-size: 12px; margin-bottom: 10px;">Brak preview</p>'}
                    
                    ${place.spotifyUrl ? `
                        <a href="${place.spotifyUrl}" target="_blank" 
                           style="display: inline-block; background: #1DB954; color: white; 
                                  padding: 8px 15px; border-radius: 5px; text-decoration: none; 
                                  font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                            🎵 Otwórz w Spotify
                        </a>
                    ` : ''}
                    
                    <button onclick="deletePlace(${place.id})" 
                            style="background: #e74c3c; color: white; border: none; 
                                   padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                   font-weight: bold; display: block; width: 100%;">
                        🗑️ Usuń miejsce
                    </button>
                </div>
            `);
        markers.push(marker);
    });
    
    updateStats(filteredPlaces);
}

// ===== SPOTIFY INTEGRATION =====

let spotifySearchTimeout;
const spotifySearchInput = document.getElementById('spotifySearch');
const spotifyResults = document.getElementById('spotifyResults');

spotifySearchInput.addEventListener('input', function(e) {
    clearTimeout(spotifySearchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        spotifyResults.classList.remove('show');
        spotifyResults.innerHTML = '';
        return;
    }
    
    spotifySearchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/spotify/search?q=${encodeURIComponent(query)}`);
            const tracks = await response.json();
            
            displaySpotifyResults(tracks);
        } catch (error) {
            console.error('Błąd wyszukiwania Spotify:', error);
        }
    }, 500);
});

function displaySpotifyResults(tracks) {
    if (tracks.length === 0) {
        spotifyResults.innerHTML = '<div style="padding: 12px; text-align: center; color: #666;">Nie znaleziono utworów</div>';
        spotifyResults.classList.add('show');
        return;
    }
    
    spotifyResults.innerHTML = tracks.map(track => `
        <div class="spotify-result-item" onclick="selectSpotifyTrack('${track.id}', '${escapeHtml(track.name)}', '${escapeHtml(track.artist)}', '${track.spotify_url}', '${track.image || ''}', '${track.preview_url || ''}')">
            ${track.image ? `<img src="${track.image}" class="spotify-result-image" alt="Album cover">` : '<div class="spotify-result-image" style="background: #ddd;"></div>'}
            <div class="spotify-result-info">
                <div class="spotify-result-title">${track.name}</div>
                <div class="spotify-result-artist">${track.artist}</div>
            </div>
        </div>
    `).join('');
    
    spotifyResults.classList.add('show');
}

function selectSpotifyTrack(id, name, artist, spotifyUrl, image, previewUrl) {
    document.getElementById('songTitle').value = `${name} - ${artist}`;
    document.getElementById('artist').value = artist;
    document.getElementById('spotifyUrl').value = spotifyUrl;
    document.getElementById('albumImage').value = image;
    document.getElementById('previewUrl').value = previewUrl;
    
    spotifyResults.classList.remove('show');
    spotifyResults.innerHTML = '';
    spotifySearchInput.value = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '\\\'');
}

// Przełącznik motywu
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.querySelector('.theme-icon');

// Ustaw ikonę trybu
if (savedTheme === 'dark') {
    themeIcon.textContent = '☀️';
} else {
    themeIcon.textContent = '🌙';
}

themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
        map.removeLayer(lightLayer);
        darkLayer.addTo(map);
    } else {
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
        map.removeLayer(darkLayer);
        lightLayer.addTo(map);
    }
});

// ===== WYSZUKIWARKA MIEJSC =====

const placeSearchInput = document.getElementById('placeSearch');
let searchTimeout;

placeSearchInput.addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length === 0) {
        loadPlaces();
        return;
    }
    
    searchTimeout = setTimeout(() => {
        const filteredPlaces = allPlaces.filter(place => 
            place.songTitle.toLowerCase().includes(query) ||
            place.artist.toLowerCase().includes(query) ||
            place.description.toLowerCase().includes(query)
        );
        
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        if (filteredPlaces.length === 0) {
            alert('Nie znaleziono miejsc spełniających kryteria');
            return;
        }
        
        filteredPlaces.forEach(place => {
            const color = getCategoryColor(place.category);
            const icon = createColoredIcon(color);
            
            const marker = L.marker([place.lat, place.lng], {icon: icon})
                .addTo(map);
            
            // Załaduj dane social przy otwarciu popup
            marker.on('popupopen', async () => {
                isPopupOpen = true;
                popupClosing = false;
                await updateLikeCount(place.id);
                await loadComments(place.id);
            });
            
            marker.on('popupclose', () => {
                isPopupOpen = false;
                popupClosing = true;
                setTimeout(() => {
                    popupClosing = false;
                }, 100);
            });
            
            marker.bindPopup(`
                <div style="min-width: 260px;">
                        ${place.albumImage ? `<img src="${place.albumImage}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;">` : ''}
                        
                        <b style="font-size: 16px;">${place.songTitle}</b><br>
                        <i style="color: #666;">${place.artist}</i><br>
                        
                        <span style="background: ${color}; color: white; padding: 3px 8px; 
                              border-radius: 5px; font-size: 12px; display: inline-block; 
                              margin-top: 5px; margin-bottom: 8px;">${getCategoryIcon(place.category)} ${place.category}</span>
                        
                        <p style="margin-top: 8px; margin-bottom: 10px;">${place.description}</p>
                        
                        ${place.previewUrl ? `
                            <audio controls style="width: 100%; margin-bottom: 10px;">
                                <source src="${place.previewUrl}" type="audio/mpeg">
                            </audio>
                        ` : '<p style="color: #999; font-size: 12px; margin-bottom: 10px;">Brak preview</p>'}
                        
                        ${place.spotifyUrl ? `
                            <a href="${place.spotifyUrl}" target="_blank" 
                               style="display: inline-block; background: #1DB954; color: white; 
                                      padding: 8px 15px; border-radius: 5px; text-decoration: none; 
                                      font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                                🎵 Otwórz w Spotify
                            </a>
                        ` : ''}
                        
                        <button onclick="deletePlace(${place.id})" 
                                style="background: #e74c3c; color: white; border: none; 
                                       padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                       font-weight: bold; display: block; width: 100%;">
                            🗑️ Usuń miejsce
                        </button>
                    </div>
                `);
            markers.push(marker);
        });
        
        if (filteredPlaces.length === 1) {
            map.flyTo([filteredPlaces[0].lat, filteredPlaces[0].lng], 15, {duration: 1});
        } else {
            const bounds = L.latLngBounds(filteredPlaces.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, {padding: [50, 50]});
        }
        
        updateStats(filteredPlaces);
    }, 500);
});

// ===== LOSOWE MIEJSCE =====

function randomPlace() {
    if (allPlaces.length === 0) {
        alert('Brak miejsc na mapie!');
        return;
    }
    
    const diceModal = document.getElementById('diceModal');
    diceModal.classList.add('show');
    
    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * allPlaces.length);
        const place = allPlaces[randomIndex];
        
        diceModal.classList.remove('show');
        
        map.flyTo([place.lat, place.lng], 16, {
            duration: 1.5,
            easeLinearity: 0.5
        });
        
        setTimeout(() => {
            markers.forEach(marker => {
                const markerLatLng = marker.getLatLng();
                if (Math.abs(markerLatLng.lat - place.lat) < 0.0001 && 
                    Math.abs(markerLatLng.lng - place.lng) < 0.0001) {
                    marker.openPopup();
                    
                    const el = marker.getElement();
                    if (el) {
                        el.classList.add('marker-pulse');
                        setTimeout(() => el.classList.remove('marker-pulse'), 2000);
                    }
                }
            });
        }, 1500);
    }, 2000);
}

// ===== TOAST NOTIFICATIONS =====

function showToast(message, icon = '✅', duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.querySelector('.toast-message');
    const toastIcon = document.querySelector('.toast-icon');
    
    toastIcon.textContent = icon;
    toastMessage.textContent = message;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ===== LOGOWANIE: stan =====
let currentUser = null;
let authMode = 'login'; // 'login' albo 'register'
// Nazwa do wyświetlania: nick, a jak go nie ma, to początek maila
function getDisplayName() {
    if (!currentUser) return '';
    return currentUser.user_metadata?.nickname || currentUser.email.split('@')[0];
}

// Zabezpieczenie przed wstrzyknięciem HTML w komentarzach
function safeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== POLUBIENIA =====
async function toggleLike(placeId) {
    if (!currentUser) {
        showToast('Zaloguj się, żeby polubić miejsce', '🔒');
        openAuthModal();
        return;
    }

    try {
        const { data: existingLike } = await db
            .from('likes')
            .select('id')
            .eq('place_id', placeId)
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (existingLike) {
            await db
                .from('likes')
                .delete()
                .eq('place_id', placeId)
                .eq('user_id', currentUser.id);

            showToast('💔 Usunięto polubienie', '👍');
        } else {
            await db
                .from('likes')
                .insert({ place_id: placeId, user_id: currentUser.id });

            showToast('❤️ Polubiono miejsce!', '👍');
        }

        await updateLikeCount(placeId);

    } catch (error) {
        console.error('Błąd polubienia:', error);
    }
}

async function getLikeCount(placeId) {
    try {
        const { count } = await db
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('place_id', placeId);

        return count || 0;
    } catch (error) {
        console.error('Błąd pobierania polubień:', error);
        return 0;
    }
}

async function isLikedByUser(placeId) {
    if (!currentUser) return false; // gość nigdy nie ma polubień

    try {
        const { data } = await db
            .from('likes')
            .select('id')
            .eq('place_id', placeId)
            .eq('user_id', currentUser.id)
            .maybeSingle();

        return !!data;
    } catch {
        return false;
    }
}

async function updateLikeCount(placeId) {
    const count = await getLikeCount(placeId);
    const isLiked = await isLikedByUser(placeId);

    const likeBtn = document.querySelector(`#like-btn-${placeId}`);
    if (likeBtn) {
        likeBtn.innerHTML = `${isLiked ? '❤️' : '🤍'} ${count} ${count === 1 ? 'polubienie' : 'polubienia'}`;
    }
}

// ===== KOMENTARZE =====
async function addComment(placeId, commentText) {
    try {
        const { error } = await db
            .from('comments')
            .insert({
                place_id: placeId,
                user_id: currentUser.id,
                                user_name: getDisplayName(),
                comment_text: commentText
            });

        if (error) throw error;

        showToast('💬 Komentarz dodany!', '✅');
        await loadComments(placeId);

    } catch (error) {
        console.error('Błąd dodawania komentarza:', error);
        showToast('❌ Błąd dodawania komentarza', '⚠️');
    }
}
async function loadComments(placeId) {
    try {
        const { data: comments } = await db
            .from('comments')
            .select('*')
            .eq('place_id', placeId)
            .order('created_at', { ascending: false });

        const commentsDiv = document.querySelector(`#comments-${placeId}`);
        if (commentsDiv && comments && comments.length > 0) {
            commentsDiv.innerHTML = comments.map(c => `
                <div style="background: #f5f5f5; padding: 8px; border-radius: 5px; margin-bottom: 8px;">
                    <strong>${safeText(c.user_name)}</strong>
                    <p style="margin: 5px 0;">${safeText(c.comment_text)}</p>
                    <small style="color: #999;">${new Date(c.created_at).toLocaleString('pl-PL')}</small>
                </div>
            `).join('');
        } else if (commentsDiv) {
            commentsDiv.innerHTML = '<p style="color: #999; font-size: 12px;">Brak komentarzy</p>';
        }

    } catch (error) {
        console.error('Błąd ładowania komentarzy:', error);
    }
}

async function submitComment(placeId) {
    if (!currentUser) {
        showToast('Zaloguj się, żeby dodać komentarz', '🔒');
        openAuthModal();
        return;
    }

    const textInput = document.getElementById(`comment-text-${placeId}`);
    const commentText = textInput.value.trim();

    if (!commentText) {
        showToast('⚠️ Napisz komentarz!', '⚠️');
        return;
    }

    await addComment(placeId, commentText);
    textInput.value = '';
}

async function getTopPlaces() {
    try {
        const { data: likes } = await db
            .from('likes')
            .select('place_id');

        const likeCounts = {};
        likes.forEach(like => {
            likeCounts[like.place_id] = (likeCounts[like.place_id] || 0) + 1;
        });

        return Object.entries(likeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

    } catch (error) {
        console.error('Błąd pobierania top miejsc:', error);
        return [];
    }
}

// ===== LOGOWANIE: funkcje =====

// Nazwa do wyświetlania: nick, a jak go nie ma, to początek maila
function getDisplayName() {
    if (!currentUser) return '';
    return currentUser.user_metadata?.nickname || currentUser.email.split('@')[0];
}

async function initAuth() {
    const { data } = await db.auth.getSession();
    currentUser = data.session ? data.session.user : null;
    updateAuthUI();

    db.auth.onAuthStateChange((event, session) => {
        currentUser = session ? session.user : null;
        updateAuthUI();
    });
}

function updateAuthUI() {
    const btn = document.getElementById('authBtn');
    const nameSpan = document.getElementById('userEmail');

    if (currentUser) {
        btn.textContent = 'Wyloguj';
        nameSpan.textContent = getDisplayName();
    } else {
        btn.textContent = 'Zaloguj';
        nameSpan.textContent = '';
    }
}

async function handleAuthButton() {
    if (currentUser) {
         closeProfile();
        await db.auth.signOut();
        showAuthSplash('🎵', 'Do zobaczenia!', 'Wylogowano pomyślnie');
    } else {
        openAuthModal();
    }
}

function openAuthModal() {
    document.getElementById('authModal').style.display = 'block';
}

function closeAuthModal() {
    hideAuthError();
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authNickname').value = '';
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
}

function toggleAuthMode() {
    hideAuthError();
    authMode = authMode === 'login' ? 'register' : 'login';
    const isLogin = authMode === 'login';

    document.getElementById('authNickname').style.display = isLogin ? 'none' : 'block';
    document.getElementById('authTitle').textContent = isLogin ? 'Logowanie' : 'Rejestracja';
    document.getElementById('authSubmit').textContent = isLogin ? 'Zaloguj' : 'Zarejestruj';
    document.getElementById('authSwitch').textContent = isLogin
        ? 'Nie masz konta? Zarejestruj się'
        : 'Masz już konto? Zaloguj się';
}

async function submitAuth() {
    const nickname = document.getElementById('authNickname').value.trim();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    hideAuthError();

    if (!email || !password) {
        showAuthError('Podaj email i hasło');
        return;
    }

    let result;

    if (authMode === 'login') {
        result = await db.auth.signInWithPassword({ email, password });
    } else {
        if (!/^[a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]{3,20}$/.test(nickname)) {
            showAuthError('Nick: 3-20 znaków, tylko litery, cyfry, _ i -');
            return;
        }
        result = await db.auth.signUp({
            email,
            password,
            options: { data: { nickname } } // nick trafia do profilu
        });
    }

    if (result.error) {
        showAuthError(translateAuthError(result.error.message));
        return;
    }

    closeAuthModal();
    if (authMode === 'login') {
        showAuthSplash('👋', `Witaj, ${getDisplayName()}!`, 'Zalogowano pomyślnie');
    } else {
        showAuthSplash('🎉', `Witaj w Mapify, ${nickname}!`, 'Konto zostało utworzone');
    }
}

function showAuthError(message) {
    const el = document.getElementById('authError');
    el.textContent = message;
    el.style.display = 'block';
}

function hideAuthError() {
    document.getElementById('authError').style.display = 'none';
}

// Tłumaczenie komunikatów Supabase na polski
function translateAuthError(message) {
    if (message.includes('Database error saving new user')) return 'Ten nick jest już zajęty';
    if (message.includes('Invalid login credentials')) return 'Nieprawidłowy email lub hasło';
    if (message.includes('already registered')) return 'Konto z tym emailem już istnieje';
    if (message.includes('at least 6 characters')) return 'Hasło musi mieć co najmniej 6 znaków';
    if (message.includes('valid email') || message.includes('invalid format')) return 'Podaj poprawny adres email';
    if (message.includes('rate limit')) return 'Za dużo prób. Spróbuj za chwilę';
    return 'Coś poszło nie tak. Spróbuj ponownie';
}

// Enter w okienku logowania = kliknięcie przycisku
['authNickname', 'authEmail', 'authPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitAuth();
    });
});

// Animacja zalogowania / wylogowania
function showAuthSplash(icon, title, text) {
    const splash = document.getElementById('authSplash');
    document.getElementById('authSplashIcon').textContent = icon;
    document.getElementById('authSplashTitle').textContent = title;
    document.getElementById('authSplashText').textContent = text;

    // restart animacji ikony
    const iconEl = document.getElementById('authSplashIcon');
    iconEl.style.animation = 'none';
    iconEl.offsetHeight;
    iconEl.style.animation = '';

    splash.classList.add('show');
    setTimeout(() => splash.classList.remove('show'), 1800);
}
// ===== PROFIL UŻYTKOWNIKA =====

function openProfile() {
    if (!currentUser) return;
    document.getElementById('profilePanel').classList.add('open');
    switchProfileTab('liked');
    loadProfile();
}

function closeProfile() {
    document.getElementById('profilePanel').classList.remove('open');
}

function switchProfileTab(tab) {
    ['liked', 'comments', 'settings'].forEach(t => {
        document.getElementById(`profileTab-${t}`).style.display = t === tab ? 'block' : 'none';
    });
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
}

// Nazwa miejsca po ID (miejsca są ładowane z backendu do allPlaces)
function getPlaceLabel(placeId) {
    const place = allPlaces.find(p => Number(p.id) === Number(placeId));
    return place
        ? { title: place.songTitle, artist: place.artist }
        : { title: `Miejsce #${placeId}`, artist: 'niedostępne' };
}

async function loadProfile() {
    const nick = getDisplayName();

    // Nagłówek
    document.getElementById('profileAvatar').textContent = nick.charAt(0).toUpperCase();
    document.getElementById('profileNick').textContent = nick;
    const since = new Date(currentUser.created_at)
        .toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
    document.getElementById('profileSince').textContent = `W Mapify od: ${since}`;

    // Dane z bazy
    const { data: likes } = await db
        .from('likes')
        .select('place_id, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    const { data: comments } = await db
        .from('comments')
        .select('id, place_id, comment_text, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    // Statystyki
    document.getElementById('statLikes').textContent = likes ? likes.length : 0;
    document.getElementById('statComments').textContent = comments ? comments.length : 0;

    // Polubione
    const likedDiv = document.getElementById('profileTab-liked');
    if (!likes || likes.length === 0) {
        likedDiv.innerHTML = '<p class="profile-empty">Nie polubiłeś jeszcze żadnego miejsca 🤍</p>';
    } else {
        likedDiv.innerHTML = likes.map(like => {
            const p = getPlaceLabel(like.place_id);
            return `
                <div class="profile-item" onclick="goToPlace(${like.place_id})">
                    <strong>❤️ ${safeText(p.title)}</strong><br>
                    <small>${safeText(p.artist)}</small>
                </div>
            `;
        }).join('');
    }

    // Komentarze
    const commentsDiv = document.getElementById('profileTab-comments');
    if (!comments || comments.length === 0) {
        commentsDiv.innerHTML = '<p class="profile-empty">Nie dodałeś jeszcze żadnego komentarza 💬</p>';
    } else {
        commentsDiv.innerHTML = comments.map(c => {
            const p = getPlaceLabel(c.place_id);
            return `
                <div class="profile-item" onclick="goToPlace(${c.place_id})">
                    <button class="profile-delete-btn"
                            onclick="event.stopPropagation(); deleteMyComment(${c.id}, ${c.place_id})">🗑️ Usuń</button>
                    <strong>${safeText(p.title)}</strong>
                    <p style="margin: 6px 0;">${safeText(c.comment_text)}</p>
                    <small>${new Date(c.created_at).toLocaleString('pl-PL')}</small>
                </div>
            `;
        }).join('');
    }
}

// Lot do miejsca na mapie i otwarcie popupu
function goToPlace(placeId) {
    const place = allPlaces.find(p => Number(p.id) === Number(placeId));
    if (!place) {
        showToast('Tego miejsca nie ma teraz na mapie', '⚠️');
        return;
    }

    if (window.innerWidth < 768) closeProfile(); // na telefonie panel zasłania mapę

    map.flyTo([place.lat, place.lng], 16, { duration: 1.2 });

    setTimeout(() => {
        const marker = markers.find(m => {
            const ll = m.getLatLng();
            return Math.abs(ll.lat - place.lat) < 0.0001 && Math.abs(ll.lng - place.lng) < 0.0001;
        });
        if (marker) marker.openPopup();
    }, 1300);
}

async function deleteMyComment(commentId, placeId) {
    if (!confirm('Usunąć ten komentarz?')) return;

    const { error } = await db
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUser.id);

    if (error) {
        showToast('❌ Nie udało się usunąć komentarza', '⚠️');
        return;
    }

    showToast('🗑️ Komentarz usunięty', '✅');
    loadProfile();
    loadComments(placeId); // odśwież popup, jeśli jest otwarty
}

function showNickMessage(text, success) {
    const el = document.getElementById('nickMessage');
    el.textContent = text;
    el.style.display = 'block';
    el.style.color = success ? '#27ae60' : '#e74c3c';
    el.style.background = success ? '#eafaf1' : '#fdecea';
}

async function changeNickname() {
    const input = document.getElementById('newNickname');
    const nickname = input.value.trim();

    if (!/^[a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]{3,20}$/.test(nickname)) {
        showNickMessage('Nick: 3-20 znaków, tylko litery, cyfry, _ i -', false);
        return;
    }

    if (nickname === getDisplayName()) {
        showNickMessage('To jest Twój obecny nick', false);
        return;
    }

    // 1. Zmiana w tabeli profiles (tu baza pilnuje unikalności)
    const { error } = await db
        .from('profiles')
        .update({ nickname })
        .eq('id', currentUser.id);

    if (error) {
        showNickMessage(error.code === '23505' ? 'Ten nick jest już zajęty' : 'Nie udało się zmienić nicku', false);
        return;
    }

    // 2. Zmiana w danych konta (z nich czyta getDisplayName)
    const { data } = await db.auth.updateUser({ data: { nickname } });
    if (data && data.user) currentUser = data.user;

    input.value = '';
    updateAuthUI();
    loadProfile();
    showNickMessage('Nick zmieniony! ✅', true);
}

// Escape zamyka panel
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfile();
});
function showPasswordMessage(text, success) {
    const el = document.getElementById('passwordMessage');
    el.textContent = text;
    el.style.display = 'block';
    el.style.color = success ? '#27ae60' : '#e74c3c';
    el.style.background = success ? '#eafaf1' : '#fdecea';
}

async function changePassword() {
    const currentInput = document.getElementById('currentPassword');
    const newInput = document.getElementById('newPassword');
    const repeatInput = document.getElementById('newPasswordRepeat');

    const current = currentInput.value;
    const newPass = newInput.value;
    const repeat = repeatInput.value;

    if (!current || !newPass || !repeat) {
        showPasswordMessage('Wypełnij wszystkie pola', false);
        return;
    }
    if (newPass.length < 6) {
        showPasswordMessage('Nowe hasło musi mieć co najmniej 6 znaków', false);
        return;
    }
    if (newPass !== repeat) {
        showPasswordMessage('Nowe hasła nie są takie same', false);
        return;
    }
    if (newPass === current) {
        showPasswordMessage('Nowe hasło musi być inne niż obecne', false);
        return;
    }

    // 1. Sprawdź obecne hasło (ponowne logowanie)
    const { error: loginError } = await db.auth.signInWithPassword({
        email: currentUser.email,
        password: current
    });

    if (loginError) {
        showPasswordMessage('Obecne hasło jest nieprawidłowe', false);
        return;
    }

    // 2. Ustaw nowe hasło
    const { error } = await db.auth.updateUser({ password: newPass });

    if (error) {
        showPasswordMessage('Nie udało się zmienić hasła', false);
        return;
    }

    currentInput.value = '';
    newInput.value = '';
    repeatInput.value = '';
    showPasswordMessage('Hasło zostało zmienione! ✅', true);
}
// ===== START =====
initAuth();
loadPlaces();