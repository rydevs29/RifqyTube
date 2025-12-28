// --- CONFIG API (GANTI SERVER BIAR TIDAK ERROR 1002) ---
// Opsi Server Cadangan (Kalau error lagi, ganti URL di bawah):
// 1. https://pipedapi.kavin.rocks (Utama - Sering Penuh)
// 2. https://pipedapi.drg.li (Stabil)
// 3. https://api.piped.privacy.com.de (Cadangan)

// Kita pakai server drg.li yang lebih ngebut:
const API_BASE = 'https://pipedapi.drg.li'; 
const EMBED_BASE = 'https://piped.drg.li/embed'; 
const REGION = 'ID'; 

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
        if (!res.ok) throw new Error("Gagal Connect Server");
        const data = await res.json();
        renderVideos(data);
    } catch (e) {
        console.error(e);
        feedContainer.innerHTML = `
            <div style="text-align:center; padding:20px; color:#aaa;">
                <p>⚠️ Gagal memuat data (Server Sibuk).</p>
                <button onclick="loadTrending()" style="margin-top:10px; padding:5px 10px;">Coba Lagi</button>
            </div>
        `;
    }
}

async function performSearch() {
    const query = document.getElementById('search-input').value;
    if(!query) return;

    feedContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&filter=videos`);
        const data = await res.json();
        renderVideos(data.items);
    } catch (e) {
        console.error(e);
        feedContainer.innerHTML = '<p style="text-align:center; color:red;">Pencarian gagal.</p>';
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
        // Filter biar cuma video yang muncul (bukan channel/playlist)
        if (!video.url && !video.thumbnail) return;

        const videoId = video.url ? video.url.split('v=')[1] : null;
        if(!videoId) return;

        const div = document.createElement('div');
        div.className = 'video-card';
        div.onclick = () => openPlayer(videoId, video);
        
        div.innerHTML = `
            <img src="${video.thumbnail}" class="thumbnail" loading="lazy" onerror="this.src='https://via.placeholder.com/300x169?text=No+Image'">
            <div class="video-meta">
                <img src="${video.uploaderAvatar || 'https://via.placeholder.com/36'}" class="avatar" onerror="this.src='https://via.placeholder.com/36'">
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
    playerOverlay.classList.add('show');
    miniPlayer.classList.add('hidden');

    // FIX: Gunakan domain embed yang sama dengan API agar sinkron
    iframe.src = `${EMBED_BASE}/${videoId}?autoplay=1`;

    // Set Info Sementara
    document.getElementById('video-title').innerText = metaData.title;
    document.getElementById('channel-name').innerText = metaData.uploaderName;
    document.getElementById('video-views').innerText = formatViews(metaData.views);
    document.getElementById('channel-img').src = metaData.uploaderAvatar || '';

    // Ambil Deskripsi
    try {
        const res = await fetch(`${API_BASE}/streams/${videoId}`);
        const detail = await res.json();
        document.getElementById('video-desc').innerText = detail.description || "Tidak ada deskripsi.";
    } catch (e) {
        console.log("Deskripsi tidak dapat dimuat");
    }
}

function minimizePlayer() {
    playerOverlay.classList.remove('show');
    miniPlayer.classList.remove('hidden');
}

function maximizePlayer() {
    playerOverlay.classList.add('show');
    miniPlayer.classList.add('hidden');
}

function closePlayer() {
    iframe.src = ""; 
    miniPlayer.classList.add('hidden');
    playerOverlay.classList.remove('show');
}

// --- UTILS ---
function formatViews(num) {
    if(num >= 1000000) return (num/1000000).toFixed(1) + 'Jt';
    if(num >= 1000) return (num/1000).toFixed(1) + 'Rb';
    return num || '0';
}
