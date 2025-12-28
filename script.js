// --- CONFIG API ---
// Kita gunakan instance Piped publik yang stabil
const API_BASE = 'https://pipedapi.kavin.rocks'; 
const REGION = 'ID'; // Set ke Indonesia

const feedContainer = document.getElementById('video-feed');
const playerOverlay = document.getElementById('player-overlay');
const miniPlayer = document.getElementById('mini-player');
const iframe = document.getElementById('yt-iframe');

// --- INIT ---
window.onload = () => {
    loadTrending();
};

// --- FETCH DATA ---
async function loadTrending() {
    feedContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const res = await fetch(`${API_BASE}/trending?region=${REGION}`);
        const data = await res.json();
        renderVideos(data);
    } catch (e) {
        feedContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">Gagal memuat video. Coba lagi nanti.</p>';
        console.error(e);
    }
}

async function performSearch() {
    const query = document.getElementById('search-input').value;
    if(!query) return;

    feedContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        // Filter: all, videos, channels, playlists
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&filter=videos`);
        const data = await res.json();
        renderVideos(data.items);
    } catch (e) {
        console.error(e);
    }
}

function searchByCat(cat) {
    document.getElementById('search-input').value = cat;
    performSearch();
}

function handleEnter(e) {
    if(e.key === 'Enter') performSearch();
}

// --- RENDER UI ---
function renderVideos(videos) {
    feedContainer.innerHTML = '';
    
    videos.forEach(video => {
        // Piped API kadang mengembalikan stream/channel, kita filter video saja
        if (!video.url && !video.thumbnail) return;

        // Ambil ID Video dari URL (/watch?v=ID)
        const videoId = video.url ? video.url.split('v=')[1] : null;
        if(!videoId) return;

        const div = document.createElement('div');
        div.className = 'video-card';
        div.onclick = () => openPlayer(videoId, video);
        
        div.innerHTML = `
            <img src="${video.thumbnail}" class="thumbnail" loading="lazy">
            <div class="video-meta">
                <img src="${video.uploaderAvatar || 'https://via.placeholder.com/36'}" class="avatar">
                <div class="details">
                    <h3 class="v-title">${video.title}</h3>
                    <p class="v-channel">${video.uploaderName} • ${formatViews(video.views)}</p>
                </div>
            </div>
        `;
        feedContainer.appendChild(div);
    });
}

// --- PLAYER LOGIC ---
async function openPlayer(videoId, metaData) {
    // 1. Tampilkan Overlay
    playerOverlay.classList.add('show');
    miniPlayer.classList.add('hidden');

    // 2. Load Video (Pakai Embed Piped biar BEBAS IKLAN)
    // Kita pakai domain embed yang berbeda biar loadnya cepat
    iframe.src = `https://piped.video/embed/${videoId}?autoplay=1`;

    // 3. Set Info Sementara (dari hasil search)
    document.getElementById('video-title').innerText = metaData.title;
    document.getElementById('channel-name').innerText = metaData.uploaderName;
    document.getElementById('video-views').innerText = formatViews(metaData.views);
    document.getElementById('channel-img').src = metaData.uploaderAvatar || '';

    // 4. Fetch Detail Lengkap (Deskripsi, dll)
    try {
        const res = await fetch(`${API_BASE}/streams/${videoId}`);
        const detail = await res.json();
        document.getElementById('video-desc').innerText = detail.description || "Tidak ada deskripsi.";
    } catch (e) {
        console.log("Gagal ambil detail");
    }
}

function minimizePlayer() {
    playerOverlay.classList.remove('show');
    miniPlayer.classList.remove('hidden');
    // Video tetap jalan karena iframe tidak dihapus, cuma disembunyikan UI-nya
}

function maximizePlayer() {
    playerOverlay.classList.add('show');
    miniPlayer.classList.add('hidden');
}

function closePlayer() {
    iframe.src = ""; // Matikan video
    miniPlayer.classList.add('hidden');
    playerOverlay.classList.remove('show');
}

// --- UTILS ---
function formatViews(num) {
    if(num >= 1000000) return (num/1000000).toFixed(1) + 'Jt';
    if(num >= 1000) return (num/1000).toFixed(1) + 'Rb';
    return num;
}
