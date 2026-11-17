a// Supabase
// klucz anon jest publiczny, dane chroni RLS w bazie
const SUPABASE_URL = 'https://kzvyvbluisghdeajkttd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dnl2Ymx1aXNnaGRlYWprdHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MTE3ODYsImV4cCI6MjA3Nzk4Nzc4Nn0.SS2c25L_NAfgijyt6nmS3bOVqc73Gtmq6aQk91MHZtU';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// Mapa
const map = L.map('map').setView([50.0614, 19.9366], 13);

// podpis wymagany przez licencję OSM
const osmCredit = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

// tryb nocny to filtr CSS na tej samej warstwie
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: osmCredit,
    maxZoom: 19
}).addTo(map);


// Stan aplikacji
let markers = [];
let allPlaces = [];
let lastShownPlaces = [];

let currentUser = null;
let authMode = 'login';

let currentLat, currentLng;

const modal = document.getElementById('addPlaceModal');
const form = document.getElementById('addPlaceForm');


// Funkcje pomocnicze
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

// zabezpieczenie przed wstrzyknięciem HTML
function safeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// jak safeText, ale też do użycia w onclick='...'
function escapeHtml(text) {
    return safeText(text).replace(/'/g, '\\\'');
}
// Odmiana: 1 miejsce, 2 miejsca, 5 miejsc
function plural(n, one, few, many) {
    if (n === 1) return one;
    const r10 = n % 10, r100 = n % 100;
    if (r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14)) return few;
    return many;
}

function setStat(id, n, one, few, many) {
    const el = document.getElementById(id);
    el.textContent = n;
    el.nextElementSibling.textContent = plural(n, one, few, many);
}
function showToast(message, icon = '✅', duration = 3000) {
    const toast = document.getElementById('toast');
    document.querySelector('.toast-icon').textContent = icon;
    document.querySelector('.toast-message').textContent = message;

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// własne okienko zamiast confirm(), zwraca true/false
function showConfirm(title, text, okLabel = 'Usuń') {
    return new Promise(resolve => {
        const confirmModal = document.getElementById('confirmModal');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');

        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmText').textContent = text;
        okBtn.textContent = okLabel;

        confirmModal.classList.add('show');

        function close(result) {
            confirmModal.classList.remove('show');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            confirmModal.onclick = null;
            resolve(result);
        }

        okBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
        confirmModal.onclick = (e) => { if (e.target === confirmModal) close(false); };
    });
}


// Ładowanie i rysowanie miejsc
// song_title z bazy -> songTitle w kodzie
function mapPlace(row) {
    return {
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        songTitle: row.song_title,
        artist: row.artist,
        category: row.category,
        description: row.description,
        spotifyUrl: row.spotify_url,
        albumImage: row.album_image,
        previewUrl: row.preview_url,
        userId: row.user_id,
        deezerId: row.deezer_id
    };
}

async function loadPlaces() {
    const { data, error } = await db
        .from('places')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Błąd ładowania miejsc:', error);
        showToast('❌ Nie udało się załadować miejsc', '⚠️');
        allPlaces = [];
    } else {
        allPlaces = data.map(mapPlace);
    }

    renderMarkers();
}

function buildPopup(place) {
    const color = getCategoryColor(place.category);
    const isMine = currentUser && place.userId === currentUser.id;

    return `
        <div>
            <div class="cover-wrap">
                ${place.albumImage
                    ? `<img src="${place.albumImage}" alt="Okładka">`
                    : `<div class="cover-placeholder">🎵</div>`}
                <button class="cover-play" id="play-btn-${place.id}"
                        onclick="togglePlacePreview(${place.id})" title="Odtwórz fragment">▶</button>
            </div>

            <b style="font-size: 16px;">${safeText(place.songTitle)}</b><br>
            <i style="color: #666;">${safeText(place.artist || '')}</i><br>

            <span style="background: ${color}; color: white; padding: 3px 8px;
                  border-radius: 5px; font-size: 12px; display: inline-block;
                  margin-top: 5px; margin-bottom: 8px;">${getCategoryIcon(place.category)} ${place.category}</span>

            <p style="margin-top: 8px; margin-bottom: 10px;">${safeText(place.description || '')}</p>

            ${place.spotifyUrl ? `
                <a href="${place.spotifyUrl}" target="_blank"
                   style="display: block; text-align: center; background: #1DB954; color: white;
                          padding: 8px 15px; border-radius: 5px; text-decoration: none;
                          font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                    🎵 Otwórz w Spotify
                </a>
            ` : ''}

            <button id="like-btn-${place.id}" onclick="toggleLike(${place.id})"
                    style="background: #e74c3c; color: white; border: none;
                           padding: 8px 15px; border-radius: 5px; cursor: pointer;
                           font-weight: bold; margin-bottom: 10px; width: 100%;">
                🤍 0 polubień
            </button>

            ${isMine ? `
                <button onclick="deletePlace(${place.id})"
                        style="background: #95a5a6; color: white; border: none;
                               padding: 8px 15px; border-radius: 5px; cursor: pointer;
                               font-weight: bold; margin-bottom: 10px; width: 100%;">
                    🗑️ Usuń moje miejsce
                </button>
            ` : ''}

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
    `;
}

// bez argumentu rysuje wszystkie miejsca
function renderMarkers(placesToShow = allPlaces) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    lastShownPlaces = placesToShow;

    placesToShow.forEach(place => {
        const icon = createColoredIcon(getCategoryColor(place.category));
        const marker = L.marker([place.lat, place.lng], { icon: icon }).addTo(map);

        // polubienia i komentarze ładujemy dopiero po otwarciu
        marker.on('popupopen', async () => {
            await updateLikeCount(place.id);
            await loadComments(place.id);
        });

        marker.bindPopup(buildPopup(place), {
            minWidth: 260,
            maxWidth: 280,
            maxHeight: 380,
            autoPanPadding: [30, 30]
        });

        markers.push(marker);
    });

    updateStats(allPlaces);
}

function findMarker(place) {
    return markers.find(m => {
        const ll = m.getLatLng();
        return Math.abs(ll.lat - place.lat) < 0.0001 && Math.abs(ll.lng - place.lng) < 0.0001;
    });
}

function goToPlace(placeId) {
    const place = allPlaces.find(p => Number(p.id) === Number(placeId));
    if (!place) {
        showToast('Tego miejsca nie ma teraz na mapie', '⚠️');
        return;
    }

    if (window.innerWidth < 768) closeProfile(); // na telefonie panel zasłania mapę
    map.flyTo([place.lat, place.lng], 16, { duration: 1.2 });

    setTimeout(() => {
        const marker = findMarker(place);
        if (marker) marker.openPopup();
    }, 1300);
}

function filterByCategory(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const filteredPlaces = category === 'all'
        ? allPlaces
        : allPlaces.filter(place => place.category === category);

    renderMarkers(filteredPlaces);
}

function updateStats(places) {
    document.getElementById('totalPlaces').textContent = places.length;

    if (places.length === 0) {
        document.getElementById('topCategory').textContent = '-';
        document.getElementById('topArtists').innerHTML = '<div style="text-align: center; color: #999;">Brak danych</div>';
        updateFilterCounts(places);
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

    document.getElementById('topArtists').innerHTML = sortedArtists.map((artist, index) => `
        <div class="top-artist-item">
            <span class="top-artist-name">${index + 1}. ${safeText(artist[0] || '')}</span>
            <span class="top-artist-count">${artist[1]} ${plural(artist[1], 'miejsce', 'miejsca', 'miejsc')}</span>        </div>
    `).join('');

    updateFilterCounts(places);
}

function updateFilterCounts(places) {
    const categoryCount = {};
    places.forEach(place => {
        categoryCount[place.category] = (categoryCount[place.category] || 0) + 1;
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        const category = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        const count = category === 'all' ? places.length : (categoryCount[category] || 0);

        const btnText = btn.textContent.split('(')[0].trim();
        btn.textContent = `${btnText} (${count})`;
    });
}


// Dodawanie miejsc
function openAddPlaceForm(latlng) {
    if (!currentUser) {
        showToast('Zaloguj się, żeby dodać miejsce', '🔒');
        openAuthModal();
        return;
    }

    currentLat = latlng.lat;
    currentLng = latlng.lng;
    modal.style.display = 'block';
}

function closeAddPlaceModal() {
    stopPreview();
    modal.style.display = 'none';
    form.reset();
}

// dwuklik na komputerze
map.on('dblclick', function(e) {
    openAddPlaceForm(e.latlng);
});

// przycisk + (głównie na telefonie): najpierw tryb wybierania, potem stuknięcie w mapę
let addPlaceMode = false;

function toggleAddPlaceMode() {
    if (!addPlaceMode && !currentUser) {
        showToast('Zaloguj się, żeby dodać miejsce', '🔒');
        openAuthModal();
        return;
    }

    addPlaceMode = !addPlaceMode;
    document.getElementById('addPlaceBtn').classList.toggle('active', addPlaceMode);
    document.getElementById('map').classList.toggle('picking', addPlaceMode);

    if (addPlaceMode) {
        map.closePopup();
        showToast('Stuknij na mapie miejsce, które chcesz dodać', '📍', 4000);
    }
}

map.on('click', function(e) {
    if (!addPlaceMode) return;
    toggleAddPlaceMode();
    openAddPlaceForm(e.latlng);
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAddPlaceModal();
});

function selectCategory(value) {
    document.getElementById('category').value = value;
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.value === value);
    });
}

document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => selectCategory(chip.dataset.value));
});

form.addEventListener('reset', () => {
    setTimeout(() => selectCategory('bieganie'), 0);
});

form.onsubmit = function(e) {
    e.preventDefault();
    stopPreview();

    const songTitle = document.getElementById('songTitle').value;
    const artist = document.getElementById('artist').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const spotifyUrl = document.getElementById('spotifyUrl').value;
    const albumImage = document.getElementById('albumImage').value;
    const previewUrl = document.getElementById('previewUrl').value;
    const trackId = document.getElementById('trackId').value;

    addPlace(currentLat, currentLng, songTitle, artist, category, description || 'Brak opisu',
             spotifyUrl, albumImage, previewUrl, trackId);

    modal.style.display = 'none';
    form.reset();
};

async function addPlace(lat, lng, songTitle, artist, category, description, spotifyUrl, albumImage, previewUrl, trackId) {
    if (!currentUser) {
        showToast('Zaloguj się, żeby dodać miejsce', '🔒');
        openAuthModal();
        return;
    }

    const { error } = await db
        .from('places')
        .insert({
            lat: lat,
            lng: lng,
            song_title: songTitle,
            artist: artist,
            category: category,
            description: description,
            spotify_url: spotifyUrl || null,
            album_image: albumImage || null,
            preview_url: previewUrl || null,
            deezer_id: trackId ? Number(trackId) : null,
            user_id: currentUser.id
        });

    if (error) {
        console.error('Błąd dodawania miejsca:', error);
        showToast('❌ Nie udało się dodać miejsca', '⚠️');
        return;
    }

    showToast('🎉 Miejsce dodane pomyślnie!', '✅');
    await loadPlaces();

    // wracamy na "Wszystkie", żeby było widać nowe miejsce
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn').classList.add('active');

    map.flyTo([lat, lng], 15, { duration: 1.5, easeLinearity: 0.5 });

    setTimeout(() => {
        const marker = findMarker({ lat, lng });
        if (!marker) return;

        marker.openPopup();
        const el = marker.getElement();
        if (el) {
            el.classList.add('marker-pulse');
            setTimeout(() => el.classList.remove('marker-pulse'), 2000);
        }
    }, 1600);
}


// Usuwanie miejsc
async function deletePlace(placeId) {
    if (!currentUser) {
        showToast('Zaloguj się, żeby usuwać miejsca', '🔒');
        openAuthModal();
        return;
    }

    const ok = await showConfirm(
        'Usunąć to miejsce?',
        'Razem z nim znikną jego polubienia i komentarze. Tej operacji nie można cofnąć.'
    );
    if (!ok) return;

    const { data, error } = await db
        .from('places')
        .delete()
        .eq('id', placeId)
        .select();

    if (error) {
        console.error('Błąd usuwania miejsca:', error);
        showToast('❌ Nie udało się usunąć miejsca', '⚠️');
        return;
    }

    // RLS nie zwraca błędu przy cudzym miejscu, po prostu nic nie usuwa
    if (!data || data.length === 0) {
        showToast('Możesz usuwać tylko swoje miejsca', '🔒');
        return;
    }

    map.closePopup();
    await loadPlaces();
    showToast('🗑️ Miejsce zostało usunięte', '✅');

    if (document.getElementById('profilePanel').classList.contains('open')) {
        loadProfile();
    }
}


// Wyszukiwarka utworów (Deezer, przez funkcję music-search w Supabase)
let musicSearchTimeout;
const spotifySearchInput = document.getElementById('spotifySearch');
const spotifyResults = document.getElementById('spotifyResults');

spotifySearchInput.addEventListener('input', function(e) {
    clearTimeout(musicSearchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
        spotifyResults.classList.remove('show');
        spotifyResults.innerHTML = '';
        return;
    }

    musicSearchTimeout = setTimeout(async () => {
        try {
            const { data: tracks, error } = await db.functions.invoke('music-search', {
                body: { q: query }
            });
            if (error) throw error;

            displaySpotifyResults(tracks);
        } catch (error) {
            console.error('Błąd wyszukiwania utworów:', error);
        }
    }, 500);
});

// podgląd po najechaniu na wynik
const previewAudio = new Audio();
previewAudio.volume = 0.4;

function playPreview(url, el) {
    if (!url) return;
    previewAudio.src = url;
    previewAudio.play().catch(() => {});
    el.classList.add('playing');
}

function stopPreview(el) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
    if (el) el.classList.remove('playing');
}

function displaySpotifyResults(tracks) {
    if (!tracks || tracks.length === 0) {
        spotifyResults.innerHTML = '<div style="padding: 12px; text-align: center; color: #666;">Nie znaleziono utworów</div>';
        spotifyResults.classList.add('show');
        return;
    }

    spotifyResults.innerHTML = tracks.map(track => `
        <div class="spotify-result-item"
             onmouseenter="playPreview('${track.preview_url || ''}', this)"
             onmouseleave="stopPreview(this)"
             onclick="selectSpotifyTrack('${track.id}', '${escapeHtml(track.name)}', '${escapeHtml(track.artist)}', '${track.spotify_url}', '${track.image || ''}', '${track.preview_url || ''}')">
            ${track.image ? `<img src="${track.image}" class="spotify-result-image" alt="Okładka">` : '<div class="spotify-result-image" style="background: #ddd;"></div>'}
            <div class="spotify-result-info">
                <div class="spotify-result-title">${safeText(track.name)}</div>
                <div class="spotify-result-artist">${safeText(track.artist)}</div>
            </div>
            ${track.preview_url ? '<span class="eq"><i></i><i></i><i></i></span>' : ''}
        </div>
    `).join('');

    spotifyResults.classList.add('show');
}

function selectSpotifyTrack(id, name, artist, spotifyUrl, image, previewUrl) {
    stopPreview();
    document.getElementById('songTitle').value = `${name} - ${artist}`;
    document.getElementById('artist').value = artist;
    document.getElementById('spotifyUrl').value = spotifyUrl;
    document.getElementById('albumImage').value = image;
    document.getElementById('previewUrl').value = previewUrl;
    document.getElementById('trackId').value = id;

    spotifyResults.classList.remove('show');
    spotifyResults.innerHTML = '';
    spotifySearchInput.value = '';
}


// Odtwarzanie fragmentu utworu w popupie
const placeAudio = new Audio();
placeAudio.volume = 0.6;
let playingPlaceId = null;

// linki z Deezera wygasają, więc za każdym razem pobieramy świeży
async function getFreshPreview(place) {
    const body = place.deezerId
        ? { trackId: place.deezerId }
        : { q: `${place.songTitle} ${place.artist || ''}` }; // starsze miejsca nie mają deezer_id
    const { data, error } = await db.functions.invoke('music-search', { body });
    if (error || !data) return null;

    return place.deezerId ? data.preview_url : (data[0]?.preview_url || null);
}

async function togglePlacePreview(placeId) {

    if (playingPlaceId === placeId) {
        stopPlacePreview();
        return;
    }

    stopPlacePreview();

    const place = allPlaces.find(p => Number(p.id) === Number(placeId));
    const btn = document.getElementById(`play-btn-${placeId}`);
    if (!place || !btn) return;

    btn.textContent = '⏳';
    const url = await getFreshPreview(place);

    if (!url) {
        btn.textContent = '▶';
        showToast('Brak podglądu dla tego utworu', '🎵');
        return;
    }

    placeAudio.src = url;
    placeAudio.play().catch(() => {});
    playingPlaceId = placeId;
    btn.textContent = '❚❚';
    btn.classList.add('playing');
}

function stopPlacePreview() {
    placeAudio.pause();
    if (playingPlaceId !== null) {
        const btn = document.getElementById(`play-btn-${playingPlaceId}`);
        if (btn) {
            btn.textContent = '▶';
            btn.classList.remove('playing');
        }
    }
    playingPlaceId = null;
}

placeAudio.addEventListener('ended', stopPlacePreview);
map.on('popupclose', stopPlacePreview);


// Wyszukiwarka dodanych miejsc
const placeSearchInput = document.getElementById('placeSearch');
let searchTimeout;
let searchMatches = [];
let searchIndex = -1;

placeSearchInput.addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();

    searchMatches = [];
    searchIndex = -1;

    if (query.length === 0) {
        renderMarkers();
        return;
    }

    searchTimeout = setTimeout(() => {
        searchMatches = allPlaces.filter(place =>
            (place.songTitle || '').toLowerCase().includes(query) ||
            (place.artist || '').toLowerCase().includes(query) ||
            (place.description || '').toLowerCase().includes(query)
        );

        if (searchMatches.length === 0) {
            showToast('Nie znaleziono pasujących miejsc', '🔍');
            return;
        }

        renderMarkers(searchMatches);

        if (searchMatches.length === 1) {
            showSearchResult(0);
        } else {
            const bounds = L.latLngBounds(searchMatches.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
            const n = searchMatches.length;
            showToast(`Znaleziono ${n} ${plural(n, 'miejsce', 'miejsca', 'miejsc')}. Wciśnij Enter, żeby przejść do kolejnego`, '🔍', 3500);
        }
    }, 500);
});

function showSearchResult(index) {
    searchIndex = index;
    const place = searchMatches[index];
    goToPlace(place.id);

    if (searchMatches.length > 1) {
        showToast(`${index + 1}/${searchMatches.length}: ${place.songTitle}`, '🎵', 2500);
    }
}


// Enter - następne, Shift+Enter - poprzednie
placeSearchInput.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' || searchMatches.length === 0) return;
    e.preventDefault();

    const n = searchMatches.length;
    const next = e.shiftKey
        ? (searchIndex - 1 + n) % n
        : (searchIndex + 1) % n;

    showSearchResult(next);
});


// Wyszukiwarka miejsc na mapie (Photon / OpenStreetMap)
let geoSearchTimeout;
let geoFound = [];
let searchMarker = null;
let searchLatLng = null;

const GeoSearchControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function() {
        const div = L.DomUtil.create('div', 'geo-search');
        div.innerHTML = `
            <input type="text" id="geoSearchInput"
                   placeholder="🔎 Szukaj na mapie (siłownia, ulica, park...)" autocomplete="off">
            <div id="geoSearchResults" class="geo-search-results"></div>
        `;
        // żeby klikanie w wyszukiwarce nie ruszało mapy
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
    }
});
map.addControl(new GeoSearchControl());

const geoInput = document.getElementById('geoSearchInput');
const geoResults = document.getElementById('geoSearchResults');

geoInput.addEventListener('input', () => {
    clearTimeout(geoSearchTimeout);
    const q = geoInput.value.trim();

    if (q.length < 3) {
        geoResults.classList.remove('show');
        geoResults.innerHTML = '';
        if (q.length === 0) clearSearchMarker();
        return;
    }

    geoSearchTimeout = setTimeout(() => searchLocations(q), 400);
});

async function searchLocations(q) {
    try {
        // wyniki bliżej aktualnego widoku są wyżej
        const center = map.getCenter();
        const res = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lat=${center.lat}&lon=${center.lng}`
        );
        const data = await res.json();
        geoFound = data.features || [];

        if (geoFound.length === 0) {
            geoResults.innerHTML = '<div class="geo-empty">Nic nie znaleziono</div>';
            geoResults.classList.add('show');
            return;
        }

        geoResults.innerHTML = geoFound.map((f, i) => {
            const p = f.properties;
            const title = p.name || [p.street, p.housenumber].filter(Boolean).join(' ') || 'Bez nazwy';
            const address = [
                p.name && p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : '',
                p.city || p.county,
                p.country
            ].filter(Boolean).join(', ');

            return `
                <div class="geo-result" onclick="chooseLocation(${i})">
                    <strong>${safeText(title)}</strong>
                    <small>${safeText(address)}</small>
                </div>
            `;
        }).join('');
        geoResults.classList.add('show');

    } catch (error) {
        console.error('Błąd wyszukiwania lokalizacji:', error);
        showToast('Nie udało się wyszukać miejsca', '⚠️');
    }
}

function chooseLocation(index) {
    const f = geoFound[index];
    const [lng, lat] = f.geometry.coordinates; // GeoJSON ma odwrotną kolejność
    const name = f.properties.name || f.properties.street || 'Wybrane miejsce';

    geoResults.classList.remove('show');
    geoInput.value = name;
    searchLatLng = L.latLng(lat, lng);

    if (searchMarker) map.removeLayer(searchMarker);

    searchMarker = L.marker(searchLatLng, {
        icon: L.divIcon({
            className: 'search-pin',
            html: '📍',
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -34]
        })
    }).addTo(map);

    searchMarker.bindPopup(`
        <div style="text-align: center;">
            <strong>${safeText(name)}</strong><br>
            <button class="geo-add-btn" onclick="addHereFromSearch()">＋ Dodaj tu swoją muzykę</button>
        </div>
    `);

    map.once('moveend', () => searchMarker && searchMarker.openPopup());
    map.flyTo(searchLatLng, 17, { duration: 1.2 });
}

function clearSearchMarker() {
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
}

function addHereFromSearch() {
    if (!searchLatLng) return;
    map.closePopup();
    openAddPlaceForm(searchLatLng);
    clearSearchMarker();
    geoInput.value = '';
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.geo-search')) geoResults.classList.remove('show');
});


// Losowe miejsce
function randomPlace() {
    if (allPlaces.length === 0) {
        showToast('Brak miejsc na mapie', '🎲');
        return;
    }

    const diceModal = document.getElementById('diceModal');
    diceModal.classList.add('show');

    setTimeout(() => {
        const place = allPlaces[Math.floor(Math.random() * allPlaces.length)];

        diceModal.classList.remove('show');
        map.flyTo([place.lat, place.lng], 16, { duration: 1.5, easeLinearity: 0.5 });

        setTimeout(() => {
            const marker = findMarker(place);
            if (!marker) return;

            marker.openPopup();
            const el = marker.getElement();
            if (el) {
                el.classList.add('marker-pulse');
                setTimeout(() => el.classList.remove('marker-pulse'), 2000);
            }
        }, 1500);
    }, 2000);
}


// Tryb jasny / nocny
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.querySelector('.theme-icon');

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}
themeIcon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';

themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');

    themeIcon.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});


// Polubienia
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
    if (!currentUser) return false;

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
        likeBtn.innerHTML = `${isLiked ? '❤️' : '🤍'} ${count} ${plural(count, 'polubienie', 'polubienia', 'polubień')}`;
    }
}


// Komentarze
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
            .select('*, profiles(nickname)') // aktualny nick z tabeli profiles
            .eq('place_id', placeId)
            .order('created_at', { ascending: false });

        const commentsDiv = document.querySelector(`#comments-${placeId}`);
        if (!commentsDiv) return;

        if (comments && comments.length > 0) {
            commentsDiv.innerHTML = comments.map(c => `
                <div style="background: #f5f5f5; padding: 8px; border-radius: 5px; margin-bottom: 8px;">
                    <strong>${safeText(c.profiles?.nickname || c.user_name || 'Użytkownik')}</strong>
                    <p style="margin: 5px 0;">${safeText(c.comment_text)}</p>
                    <small style="color: #999;">${new Date(c.created_at).toLocaleString('pl-PL')}</small>
                </div>
            `).join('');
        } else {
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


// Logowanie i rejestracja
// nick, a jak go nie ma to początek maila
function getDisplayName() {
    if (!currentUser) return '';
    return currentUser.user_metadata?.nickname || currentUser.email.split('@')[0];
}

async function initAuth() {
    // wejście z linku aktywacyjnego z maila
    const cameFromSignupLink = window.location.hash.includes('type=signup');

    const { data } = await db.auth.getSession();
    currentUser = data.session ? data.session.user : null;
    updateAuthUI();

    if (cameFromSignupLink && currentUser) {
        showAuthSplash('🎉', 'Konto aktywowane!', `Witaj w Mapify, ${getDisplayName()}!`, 3000);
        history.replaceState(null, '', window.location.pathname);
    }

    db.auth.onAuthStateChange((event, session) => {
        currentUser = session ? session.user : null;
        updateAuthUI();
        renderMarkers(lastShownPlaces); // przycisk usuwania zależy od zalogowania
        // wejście z linku do zmiany hasła
        if (event === 'PASSWORD_RECOVERY') {
            document.getElementById('newPasswordModal').style.display = 'block';
        }
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
        if (addPlaceMode) toggleAddPlaceMode();
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
    document.getElementById('authModal').style.display = 'none';
    ['authNickname', 'authEmail', 'authPassword'].forEach(id => {
        document.getElementById(id).value = '';
    });
    setAuthMode('login');
}

// tryby: login, register, forgot
function setAuthMode(mode) {
    hideAuthError();
    authMode = mode;

    const show = (id, visible) => {
        document.getElementById(id).style.display = visible ? 'block' : 'none';
    };
    show('authNickname', mode === 'register');
    show('authPassword', mode !== 'forgot');
    show('authForgotWrap', mode === 'login');

    const titles   = { login: 'Logowanie', register: 'Rejestracja', forgot: 'Reset hasła' };
    const buttons  = { login: 'Zaloguj', register: 'Zarejestruj', forgot: 'Wyślij link' };
    const switches = {
        login: 'Nie masz konta? Zarejestruj się',
        register: 'Masz już konto? Zaloguj się',
        forgot: 'Wróć do logowania'
    };

    document.getElementById('authTitle').textContent = titles[mode];
    document.getElementById('authSubmit').textContent = buttons[mode];
    document.getElementById('authSwitch').textContent = switches[mode];
}

function toggleAuthMode() {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
}

async function submitAuth() {
    const mode = authMode; // closeAuthModal() przestawia tryb, więc zapamiętujemy
    const nickname = document.getElementById('authNickname').value.trim();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const redirectTo = window.location.origin + window.location.pathname;

    hideAuthError();

    if (mode === 'forgot') {
        if (!email) {
            showAuthError('Podaj adres email');
            return;
        }
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) {
            console.error('Błąd resetu hasła:', error.message);
            showAuthError(translateAuthError(error.message));
            return;
        }
        closeAuthModal();
        showAuthSplash('📧', 'Sprawdź skrzynkę!', 'Jeśli konto istnieje, wysłaliśmy link do zmiany hasła', 4000);
        return;
    }

    if (!email || !password) {
        showAuthError('Podaj email i hasło');
        return;
    }

    let result;

    if (mode === 'login') {
        result = await db.auth.signInWithPassword({ email, password });
    } else {
        if (!/^[a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]{3,20}$/.test(nickname)) {
            showAuthError('Nick: 3-20 znaków, tylko litery, cyfry, _ i -');
            return;
        }
        result = await db.auth.signUp({
            email,
            password,
            options: {
                data: { nickname }, // trigger w bazie zapisze go w profiles
                emailRedirectTo: redirectTo
            }
        });
    }

    if (result.error) {
        console.error('Błąd logowania/rejestracji:', result.error.message);
        showAuthError(translateAuthError(result.error.message));
        return;
    }

    closeAuthModal();
    if (mode === 'login') {
        showAuthSplash('👋', `Witaj, ${getDisplayName()}!`, 'Zalogowano pomyślnie');
    } else if (result.data.session) {

        showAuthSplash('🎉', `Witaj w Mapify, ${nickname}!`, 'Konto zostało utworzone');
    } else {
        // czekamy na potwierdzenie maila
        showAuthSplash('📧', 'Sprawdź skrzynkę!', `Wysłaliśmy link aktywacyjny na ${email}`, 4000);
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

// komunikaty Supabase po polsku
function translateAuthError(message) {
    if (message.includes('Email not confirmed')) return 'Najpierw potwierdź adres email, kliknij link w wiadomości od Mapify';
    if (message.includes('Database error saving new user')) return 'Ten nick jest już zajęty';
    if (message.includes('Invalid login credentials')) return 'Nieprawidłowy email lub hasło';
    if (message.includes('already registered')) return 'Konto z tym emailem już istnieje';
    if (message.includes('at least 6 characters')) return 'Hasło musi mieć co najmniej 6 znaków';
    if (message.includes('valid email') || message.includes('invalid format')) return 'Podaj poprawny adres email';
    if (message.includes('rate limit')) return 'Za dużo prób. Spróbuj za chwilę';
    return 'Coś poszło nie tak. Spróbuj ponownie';
}

['authNickname', 'authEmail', 'authPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitAuth();
    });
});

function showAuthSplash(icon, title, text, duration = 1800) {
    const splash = document.getElementById('authSplash');
    const iconEl = document.getElementById('authSplashIcon');

    iconEl.textContent = icon;
    document.getElementById('authSplashTitle').textContent = title;
    document.getElementById('authSplashText').textContent = text;

    iconEl.style.animation = 'none';
    iconEl.offsetHeight;
    iconEl.style.animation = '';

    splash.classList.add('show');
    setTimeout(() => splash.classList.remove('show'), duration);
}

// nowe hasło po wejściu z linku w mailu
async function saveNewPassword() {
    const pass = document.getElementById('resetPassword').value;
    const repeat = document.getElementById('resetPasswordRepeat').value;
    const errorEl = document.getElementById('resetError');

    const showError = (text) => {
        errorEl.textContent = text;
        errorEl.style.display = 'block';
    };

    if (pass.length < 6) return showError('Hasło musi mieć co najmniej 6 znaków');
    if (pass !== repeat) return showError('Hasła nie są takie same');

    const { error } = await db.auth.updateUser({ password: pass });
    if (error) {
        console.error('Błąd zmiany hasła:', error.message);
        return showError('Nie udało się zmienić hasła. Spróbuj wysłać link jeszcze raz');
    }

    errorEl.style.display = 'none';
    document.getElementById('resetPassword').value = '';
    document.getElementById('resetPasswordRepeat').value = '';
    document.getElementById('newPasswordModal').style.display = 'none';
    history.replaceState(null, '', window.location.pathname);
    showAuthSplash('🔑', 'Hasło zmienione!', 'Jesteś zalogowany', 3000);
}


// Profil
function openProfile() {
    if (!currentUser) return;
    document.getElementById('profilePanel').classList.add('open');
    switchProfileTab('places');
    loadProfile();
}

function closeProfile() {
    document.getElementById('profilePanel').classList.remove('open');
}

function switchProfileTab(tab) {
    ['places', 'liked', 'comments', 'settings'].forEach(t => {
        document.getElementById(`profileTab-${t}`).style.display = t === tab ? 'block' : 'none';
    });
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
}

function getPlaceLabel(placeId) {
    const place = allPlaces.find(p => Number(p.id) === Number(placeId));
    return place
        ? { title: place.songTitle, artist: place.artist }
        : { title: `Miejsce #${placeId}`, artist: 'niedostępne' };
}

async function loadProfile() {
    const nick = getDisplayName();

    document.getElementById('profileAvatar').textContent = nick.charAt(0).toUpperCase();
    document.getElementById('profileNick').textContent = nick;
    const since = new Date(currentUser.created_at)
        .toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
    document.getElementById('profileSince').textContent = `W Mapify od: ${since}`;

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

    // miejsca są już w allPlaces, nie trzeba pytać bazy
    const myPlaces = allPlaces.filter(p => p.userId === currentUser.id);

    setStat('statPlaces', myPlaces.length, 'miejsce', 'miejsca', 'miejsc');
setStat('statLikes', likes ? likes.length : 0, 'polubienie', 'polubienia', 'polubień');
setStat('statComments', comments ? comments.length : 0, 'komentarz', 'komentarze', 'komentarzy');

    const placesDiv = document.getElementById('profileTab-places');
    if (myPlaces.length === 0) {
        placesDiv.innerHTML = `
            <p class="profile-empty">
                Nie dodałeś jeszcze żadnego miejsca 📍<br>
                <small>Kliknij ＋ albo dwukrotnie na mapę, żeby dodać pierwsze!</small>
            </p>`;
    } else {
        placesDiv.innerHTML = myPlaces.map(p => `
            <div class="profile-item" onclick="goToPlace(${p.id})">
                <button class="profile-delete-btn"
                        onclick="event.stopPropagation(); deletePlace(${p.id})">🗑️ Usuń</button>
                <strong>${getCategoryIcon(p.category)} ${safeText(p.songTitle)}</strong><br>
                <small>${safeText(p.artist || '')}</small>
            </div>
        `).join('');
    }

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

async function deleteMyComment(commentId, placeId) {
    const ok = await showConfirm('Usunąć komentarz?', 'Tej operacji nie można cofnąć.');
    if (!ok) return;

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
    loadComments(placeId);
}

function showSettingsMessage(elementId, text, success) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.style.display = 'block';
    el.style.color = success ? '#27ae60' : '#e74c3c';
    el.style.background = success ? '#eafaf1' : '#fdecea';
}

async function changeNickname() {
    const input = document.getElementById('newNickname');
    const nickname = input.value.trim();

    if (!/^[a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]{3,20}$/.test(nickname)) {
        showSettingsMessage('nickMessage', 'Nick: 3-20 znaków, tylko litery, cyfry, _ i -', false);
        return;
    }

    if (nickname === getDisplayName()) {
        showSettingsMessage('nickMessage', 'To jest Twój obecny nick', false);
        return;
    }

    // unikalność nicku pilnuje baza
    const { error } = await db
        .from('profiles')
        .update({ nickname })
        .eq('id', currentUser.id);

    if (error) {
        const text = error.code === '23505' ? 'Ten nick jest już zajęty' : 'Nie udało się zmienić nicku';
        showSettingsMessage('nickMessage', text, false);
        return;
    }

    // getDisplayName czyta nick z danych konta, więc zmieniamy też tam
    const { data } = await db.auth.updateUser({ data: { nickname } });
    if (data && data.user) currentUser = data.user;

    input.value = '';
    updateAuthUI();
    loadProfile();
    showSettingsMessage('nickMessage', 'Nick zmieniony! ✅', true);
}

async function changePassword() {
    const currentInput = document.getElementById('currentPassword');
    const newInput = document.getElementById('newPassword');
    const repeatInput = document.getElementById('newPasswordRepeat');

    const current = currentInput.value;
    const newPass = newInput.value;
    const repeat = repeatInput.value;

    if (!current || !newPass || !repeat) {
        showSettingsMessage('passwordMessage', 'Wypełnij wszystkie pola', false);
        return;
    }
    if (newPass.length < 6) {
        showSettingsMessage('passwordMessage', 'Nowe hasło musi mieć co najmniej 6 znaków', false);
        return;
    }
    if (newPass !== repeat) {
        showSettingsMessage('passwordMessage', 'Nowe hasła nie są takie same', false);
        return;
    }
    if (newPass === current) {
        showSettingsMessage('passwordMessage', 'Nowe hasło musi być inne niż obecne', false);
        return;
    }

    // sprawdzamy obecne hasło logując się ponownie
    const { error: loginError } = await db.auth.signInWithPassword({
        email: currentUser.email,
        password: current
    });
    if (loginError) {
        showSettingsMessage('passwordMessage', 'Obecne hasło jest nieprawidłowe', false);
        return;
    }

    const { error } = await db.auth.updateUser({ password: newPass });
    if (error) {
        showSettingsMessage('passwordMessage', 'Nie udało się zmienić hasła', false);
        return;
    }

    currentInput.value = '';
    newInput.value = '';
    repeatInput.value = '';
    showSettingsMessage('passwordMessage', 'Hasło zostało zmienione! ✅', true);
}

// usuwanie konta (RODO)
async function deleteAccount() {
    const input = document.getElementById('deletePassword');
    const password = input.value;

    if (!password) {
        showSettingsMessage('deleteMessage', 'Podaj hasło', false);
        return;
    }

    const { error: loginError } = await db.auth.signInWithPassword({
        email: currentUser.email,
        password
    });
    if (loginError) {
        showSettingsMessage('deleteMessage', 'Nieprawidłowe hasło', false);
        return;
    }

    const ok = await showConfirm(
        'Usunąć konto na zawsze?',
        'Znikną wszystkie Twoje miejsca, polubienia i komentarze. Tej operacji nie można cofnąć.',
        'Usuń konto'
    );
    if (!ok) return;

    // funkcja delete_own_account w bazie
    const { error } = await db.rpc('delete_own_account');
    if (error) {
        console.error('Błąd usuwania konta:', error);
        showSettingsMessage('deleteMessage', 'Nie udało się usunąć konta', false);
        return;
    }

    input.value = '';
    document.getElementById('deleteMessage').style.display = 'none';
    closeProfile();
    await db.auth.signOut({ scope: 'local' }); // konta już nie ma, czyścimy tylko lokalną sesję
    await loadPlaces();
    showAuthSplash('👋', 'Konto usunięte', 'Dzięki, że byłeś z Mapify', 3000);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfile();
});


// Start aplikacji
initAuth();
loadPlaces();
