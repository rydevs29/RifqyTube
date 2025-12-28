// --- CONFIG API MULTI-SERVER ---
// Daftar server cadangan. Kalau satu mati, dia pindah ke bawahnya.
const SERVERS = [
    'https://api.piped.privacy.com.de', // Server Jerman (Biasanya Stabil)
    'https://pipedapi.kavin.rocks',     // Server Utama (Sering Penuh tapi lengkap)
    'https://pipedapi.drg.li',          // Server Cadangan 1
    'https://api.piped.yt'              // Server Cadangan 2
];

let currentServerIndex = 0; // Mulai dari server pertama
const feedContainer = document.getElementById('video-feed');
const playerOverlay = document.getElementById('player-overlay');
const miniPlayer = document.getElementById('mini-player');
const iframe = document.getElementById('yt-iframe');

// --- INIT ---
window.onload = () => {
    loadTrending();
};

// --- FUNGSI PINTAR: SMART FETCH ---
// Ini fungsi rahasianya. Dia bakal nyoba server satu-satu sampai berhasil.
async function smartFetch(endpoint) {
    for (let i = 0; i < SERVERS.length; i++) {
        // Coba server urutan sekarang (kalau gagal, index digeser di catch)
        let server = SERVERS[(currentServerIndex + i) % SERVERS.length]; 
        try {
            console.log(`Mencoba connect ke: ${server}`);
            const res = await fetch(`${server}${endpoint}`);
            if (!res.ok) throw new Error("Server error");
            return await res.json(); // Kalau berhasil, langsung kembalikan data
        } catch (e) {
            console.warn(`Gagal di ${server}, mencoba server berikutnya...`);
            continue; // Lanjut ke server berikutnya di list
        }
    }
    throw new Error("Semua server sibuk/mati.");
}

// --- LOGIKA UTAMA ---
async function loadTrending() {
    feedContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        // Kita pakai smartFetch, bukan fetch biasa
        const data = await smartFetch(`/trending?region=ID`);
        renderVideos(data);
    } catch (e) {
        feedContainer.innerHTML = `
            <div style="text-align:center; padding:20px; color:#aaa;">
                <p>⚠️ Semua server sedang sibuk.</p>
                <button onclick="loadTrending()" style="margin-top:10px; padding:5px 10px; cursor:pointer;">Coba Lagi</button>
            </div>
        `;
    }
}

async function performSearch() {
    const query = document.getElementById('search-input').value;
    if(!query) return;

    feedContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const data = await smartFetch(`/search?q=${encodeURIComponent(query)}&filter=videos`);
        renderVideos(data.items);
    } catch (e) {
        feedContainer.innerHTML = '<p style="text-align:center; color:red;">Pencarian gagal di semua server.</p>';
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
    
    if(!videos || videos.length === 0) {
        feedContainer.innerHTML = '<p style="text-align:center;">Tidak ada video ditemukan.</p>';
        return;
    }

    videos.forEach(video => {
        // Filter: Hanya ambil yang punya URL (Video Valid)
        if (!video.url) return;
        const videoId = video.url.split('v=')[1];
        if(!videoId) return;

        const div = document.createElement('div');
        div.className = 'video-card';
        div.onclick = () => openPlayer(videoId, video);
        
        div.innerHTML = `
            <img src="${video.thumbnail}" class="thumbnail" loading="lazy" onerror="this.src='https://via.placeholder.com/300x169?text=Error+Img'">
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

    // Kita pakai domain embed yang berbeda agar lebih universal
    iframe.src = `https://piped.video/embed/${videoId}?autoplay=1`;

    // Set Info Sementara
    document.getElementById('video-title').innerText = metaData.title;
    document.getElementById('channel-name').innerText = metaData.uploaderName;
    document.getElementById('video-views').innerText = formatViews(metaData.views);
    document.getElementById('channel-img').src = metaData.uploaderAvatar || '';

    // Ambil Deskripsi (Optional, pakai smartFetch juga)
    try {
        const detail = await smartFetch(`/streams/${videoId}`);
        document.getElementById('video-desc').innerText = detail.description || "Tidak ada deskripsi.";
    } catch (e) {
        console.log("Deskripsi skip dulu");
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

function formatViews(num) {
    if(num >= 1000000) return (num/1000000).toFixed(1) + 'Jt';
    if(num >= 1000) return (num/1000).toFixed(1) + 'Rb';
    return num || '0';
}
