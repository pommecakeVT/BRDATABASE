// ✅ Wrapper Carrd-safe : le clic marche même si window.openPopup n'est pas encore chargé
function openPopup(playerId) {
  if (typeof window.openPopup === "function") {
    return window.openPopup(playerId);
  }
  console.warn("⚠️ Popup pas encore chargée (window.openPopup). Réessaie dans 1s.");
}

async function updatePlayerList() {

// ✅ Récupère playerData depuis GitHub RAW
let playerData = await fetch("https://raw.githubusercontent.com/UlriLeVrai/BRDATABASE/refs/heads/main/twitchv2", { cache: "no-store" })
.then(r => r.json());

const clientId = "gp762nuuoqcoxypju8c569th9wz7q5";
const accessToken = "79v1l8ku6pve2me1o9ggjpjorozzcl";
const twitchApiUrl = "https://api.twitch.tv/helix/streams?user_login=";

const chunkSize = 50;
let allLivePlayers = [];

for (let i = 0; i < playerData.length; i += chunkSize) {
let chunk = playerData.slice(i, i + chunkSize);
let usernames = chunk.map(player => player.twitch).join("&user_login=");

try {
let response = await fetch(twitchApiUrl + usernames, {
headers: {
"Client-ID": clientId,
"Authorization": "Bearer " + accessToken
}
});

let data = await response.json();
allLivePlayers = allLivePlayers.concat(data.data || []);
} catch (error) {
console.error("❌ Erreur lors de la récupération des données Twitch :", error);
}
}

// ✅ Mise à jour des statuts et tri
playerData.forEach(player => {
let twitchStatus = allLivePlayers.find(live =>
live.user_login.toLowerCase() === player.twitch.toLowerCase()
);

if (twitchStatus) {
player.isLive = true;
player.game = twitchStatus.game_name || "Autre";
} else {
player.isLive = false;
player.game = "Hors ligne";
}
});

// ✅ Tri
playerData.sort((a, b) => {
if (a.isLive && b.isLive) {
if (a.game.toLowerCase().includes("redemption") && !b.game.toLowerCase().includes("redemption")) return -1;
if (!a.game.toLowerCase().includes("redemption") && b.game.toLowerCase().includes("redemption")) return 1;
}
if (a.isLive && !b.isLive) return -1;
if (!a.isLive && b.isLive) return 1;
return a.twitch.localeCompare(b.twitch);
});

// ✅ Cache des avatars actuels AVANT rebuild (évite fallback à chaque refresh)
const avatarCache = {};
document.querySelectorAll("#playerList img.player-avatar").forEach(img => {
avatarCache[img.id] = img.src;
});

// ✅ Génération HTML
const playerContainer = document.getElementById("playerList");
if (!playerContainer) return;
playerContainer.innerHTML = "";

playerData.forEach(player => {
const fallback = "https://i.ibb.co/NgTXMdDW/twitch-update.gif";
const avatarURL = avatarCache[player.id] || player.avatar || fallback;

const playerHTML =
'<div class="player-wrapper" data-player-id="' + player.id + '">' +
'<div class="player-avatar-container">' +
'<img id="' + player.id + '" class="player-avatar ' + (player.isLive ? 'online' : 'offline') + '"' +
' src="' + avatarURL + '"' +
' onclick="openPopup(\'' + player.id + '\')" />' +
'</div>' +
'<p class="player-name">' + player.twitch + '</p>' +
'</div>';

playerContainer.innerHTML += playerHTML;
});

// ✅ Cache pour le pop-up
window.__playerDataCache = playerData;

console.log("✅ Mise à jour des joueurs terminée !");
}

// ✅ Init
updatePlayerList();
setInterval(updatePlayerList, 60000);

const clientId = 'gp762nuuoqcoxypju8c569th9wz7q5'; // Remplace avec ton vrai Client ID
const accessToken = '79v1l8ku6pve2me1o9ggjpjorozzcl'; // Remplace avec ton vrai OAuth Token
const PLAYERDATA_URL = "https://raw.githubusercontent.com/UlriLeVrai/BRDATABASE/refs/heads/main/twitchv2";

// ✅ Cache global
let cachedPlayerData = [];
let lastDbFetch = 0;

// ✅ Réglages
const REFRESH_TWITCH_MS = 60000; // toutes les 60s
const REFRESH_DB_MS = 10 * 60 * 1000; // DB toutes les 10 min (modifiable)

async function loadPlayerData(force = false) {
const now = Date.now();
if (!force && cachedPlayerData.length > 0 && (now - lastDbFetch) < REFRESH_DB_MS) {
return cachedPlayerData;
}

try {
const res = await fetch(PLAYERDATA_URL, { cache: "no-store" });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();

if (!Array.isArray(data)) throw new Error("JSON invalide (pas un tableau)");
cachedPlayerData = data;
lastDbFetch = now;

console.log("✅ DB joueurs chargée:", cachedPlayerData.length);
return cachedPlayerData;
} catch (err) {
console.error("❌ Impossible de charger la DB joueurs:", err);

// ✅ Si on a déjà un cache, on continue avec (site pas cassé)
if (cachedPlayerData.length > 0) return cachedPlayerData;

return [];
}
}

async function fetchTwitchData(playerData) {
const chunkSize = 50;
const chunks = [];
for (let i = 0; i < playerData.length; i += chunkSize) {
chunks.push(playerData.slice(i, i + chunkSize));
}

let allStreams = [];
let allUsers = [];

await Promise.all(chunks.map(async (chunk, index) => {
const logins = chunk.map(p => (p.twitch || "").toLowerCase()).filter(Boolean);

if (logins.length === 0) return;

// Streams
const streamUrl = `https://api.twitch.tv/helix/streams?user_login=${logins.join("&user_login=")}`;
const streamRes = await fetch(streamUrl, {
headers: { "Client-ID": clientId, "Authorization": `Bearer ${accessToken}` }
});
if (streamRes.ok) {
const s = await streamRes.json();
allStreams = allStreams.concat(s.data || []);
} else {
console.error(`❌ Streams chunk ${index+1}:`, streamRes.status, await streamRes.text());
}

// Users (PP)
const userUrl = `https://api.twitch.tv/helix/users?${logins.map(u => "login=" + u).join("&")}`;
const userRes = await fetch(userUrl, {
headers: { "Client-ID": clientId, "Authorization": `Bearer ${accessToken}` }
});
if (userRes.ok) {
const u = await userRes.json();
allUsers = allUsers.concat(u.data || []);
} else {
console.error(`❌ Users chunk ${index+1}:`, userRes.status, await userRes.text());
}
}));

return { allStreams, allUsers };
}

function updateCounters(allStreams) {
const totalViewers = allStreams.reduce((sum, stream) => sum + (stream.viewer_count || 0), 0);
const totalParticipants = allStreams.length;

const viewersEl = document.getElementById("totalViewers");
if (viewersEl) animateNumber(viewersEl, totalViewers, 900);

const participantsEl = document.getElementById("totalParticipants");
if (participantsEl) animateNumber(participantsEl, totalParticipants, 700);
}

function updateAvatars(allStreams, allUsers, playerData) {
playerData.forEach(player => {
const img = document.getElementById(player.id);
if (!img) return;

const liveInfo = allStreams.find(s => s.user_name.toLowerCase() === player.twitch.toLowerCase());
const userInfo = allUsers.find(u => u.login.toLowerCase() === player.twitch.toLowerCase());

const isLive = !!liveInfo;
let borderColor = "#B7B3AC"; // offline

if (isLive) {
if (liveInfo.game_id === "493959") borderColor = "#5FAF5F"; // RDR2
else borderColor = "#F2D171"; // autre jeu
}

// ✅ IMPORTANT : on ne touche l'image que si Twitch renvoie une PP valide
if (userInfo && userInfo.profile_image_url) {
img.src = userInfo.profile_image_url;
}

img.parentElement.style.borderColor = borderColor;
img.classList.toggle("online", isLive);
img.classList.toggle("offline", !isLive);
});
}

async function checkLiveStatus() {
const playerData = await loadPlayerData(false);
if (!playerData || playerData.length === 0) {
console.error("🚨 Aucune donnée joueur dispo (DB vide).");
return;
}

console.log("🟢 Refresh Twitch...");
try {
const { allStreams, allUsers } = await fetchTwitchData(playerData);

updateCounters(allStreams);

// (si tu veux garder ton petit délai visuel)
setTimeout(() => {
updateAvatars(allStreams, allUsers, playerData);
}, 2000); // tu peux remettre 2000 si tu veux l'effet “pause”

} catch (err) {
console.error("❌ Erreur checkLiveStatus:", err);
}
}

// ✅ Init
(async () => {
await loadPlayerData(true); // force au chargement
await checkLiveStatus();
setInterval(checkLiveStatus, REFRESH_TWITCH_MS);
})();
// ✅ URLs des BDD réseaux (RAW GitHub)
const SOCIAL_URLS = {
bluesky: "https://raw.githubusercontent.com/UlriLeVrai/BRDATABASE/refs/heads/main/bluesky",
instagram: "https://raw.githubusercontent.com/UlriLeVrai/BRDATABASE/refs/heads/main/instagram",
tiktok: "https://raw.githubusercontent.com/UlriLeVrai/BRDATABASE/refs/heads/main/tiktok",
twitter: "https://raw.githubusercontent.com/UlriLeVrai/BRDATABASE/refs/heads/main/twitter",
youtube: "https://raw.githubusercontent.com/UlriLeVrai/BRDATABASE/refs/heads/main/youtube"
};

// ✅ Cache global (évite 5 fetch à chaque ouverture)
window.__socialCache = window.__socialCache || null;
window.__socialCachePromise = window.__socialCachePromise || null;

async function loadSocialDBs() {
if (window.__socialCache) return window.__socialCache;
if (window.__socialCachePromise) return window.__socialCachePromise;

window.__socialCachePromise = (async () => {
const entries = await Promise.all(
Object.entries(SOCIAL_URLS).map(async ([key, url]) => {
try {
const r = await fetch(url, { cache: "no-store" });
const j = await r.json();
return [key, Array.isArray(j) ? j : []];
} catch (e) {
console.error(`❌ Social DB KO (${key})`, e);
return [key, []];
}
})
);

const obj = Object.fromEntries(entries);
window.__socialCache = obj;
return obj;
})();

return window.__socialCachePromise;
}

// ✅ Fonction pour mettre à jour les liens sociaux (depuis GitHub RAW)
async function updateSocialLinks(playerId) {
console.log("🔗 Mise à jour des réseaux sociaux pour " + playerId);

const db = await loadSocialDBs();

const bluesky = db.bluesky.find(p => p.id === playerId)?.bluesky || "#";
const instagram = db.instagram.find(p => p.id === playerId)?.instagram || "#";
const tiktok = db.tiktok.find(p => p.id === playerId)?.tiktok || "#";
const twitter = db.twitter.find(p => p.id === playerId)?.twitter || "#";
const youtube = db.youtube.find(p => p.id === playerId)?.youtube || "#";

const setBtn = (id, url) => {
const el = document.getElementById(id);
if (!el) return;
el.href = url;
el.style.display = (url && url !== "#") ? "inline-flex" : "none";
};

setBtn("popup-bluesky", bluesky);
setBtn("popup-instagram", instagram);
setBtn("popup-tiktok", tiktok);
setBtn("popup-twitter", twitter);
setBtn("popup-youtube", youtube);
}

// ✅ Ouvrir le pop-up
window.openPopup = async function(playerId) {
console.log(`Ouverture du pop-up pour ${playerId}`);

// ⚠️ playerData vient maintenant du RAW GitHub (comme ton script avatars)
const playerDataUrl = "https://raw.githubusercontent.com/UlriLeVrai/BRDATABASE/refs/heads/main/twitchv2";

let playerData = [];
try {
playerData = await fetch(playerDataUrl, { cache: "no-store" }).then(r => r.json());
} catch (e) {
console.error("❌ Impossible de charger playerData (twitchv2)", e);
return;
}

const player = playerData.find(p => p.id === playerId);
if (!player) {
console.error(`🚨 Joueur non trouvé : ${playerId}`);
return;
}

// ✅ Met à jour les embeds Twitch
const twitchEmbed = document.getElementById("popup-twitch");
const twitchChat = document.getElementById("popup-chat");

if (player.twitch) {
twitchEmbed.src = `https://player.twitch.tv/?channel=${player.twitch}&parent=blueredemption2.carrd.co`;
twitchChat.src = `https://www.twitch.tv/embed/${player.twitch}/chat?darkpopout&parent=blueredemption2.carrd.co`;
} else {
twitchEmbed.src = "";
twitchChat.src = "";
}

// ✅ Réseaux sociaux (GitHub RAW)
await updateSocialLinks(playerId);

// ✅ Affiche la pop-up
const popup = document.getElementById("popup-player");
const overlay = document.getElementById("modal-overlay");

if (!popup || !overlay) {
console.error("🚨 ERREUR : Impossible de trouver le pop-up !");
return;
}

popup.classList.add("active");
overlay.classList.add("active");
popup.style.display = "block";
overlay.style.display = "block";
};

// ✅ Fermer le pop-up
window.closePopup = function() {
console.log("Fermeture du pop-up");

const popup = document.getElementById("popup-player");
const overlay = document.getElementById("modal-overlay");

if (!popup || !overlay) {
console.error("🚨 ERREUR : Impossible de fermer le pop-up !");
return;
}

popup.classList.remove("active");
overlay.classList.remove("active");

setTimeout(() => {
popup.style.display = "none";
overlay.style.display = "none";
}, 300);

// ✅ Vide les embeds
document.getElementById("popup-twitch").src = "";
document.getElementById("popup-chat").src = "";
};

;
function animateNumber(element, newValue, duration = 800) {
if (!element) return;

const startValue = parseInt(element.textContent.replace(/\D/g, "")) || 0;
const endValue = parseInt(newValue) || 0;

const startTime = performance.now();

function update(now) {
const elapsed = now - startTime;
const progress = Math.min(elapsed / duration, 1);

// ease-out (plus joli qu’un truc linéaire)
const eased = 1 - Math.pow(1 - progress, 3);

const current = Math.round(startValue + (endValue - startValue) * eased);
element.textContent = current.toLocaleString("fr-FR");

if (progress < 1) requestAnimationFrame(update);
}

requestAnimationFrame(update);
}

(function () {
const btns = Array.from(document.querySelectorAll('.carrd-btn'));

function setActiveById(id) {
btns.forEach(b => b.classList.toggle('is-active', b.dataset.target === id));
}

// Détermine la section à partir du hash (#home, #lives, #forms)
function getHashId() {
const h = (window.location.hash || '#home').replace('#', '').trim();
return h || 'home';
}

// Actif au chargement + quand le hash change
function syncFromHash() {
setActiveById(getHashId());
}
window.addEventListener('hashchange', syncFromHash);
syncFromHash();

// Bonus: si tu scrolles (et pas seulement via clic), on met à jour l'actif
// Il faut que tes sections existent bien: #home, #lives, #forms
const targets = ['home', 'lives', 'forms']
.map(id => document.getElementById(id))
.filter(Boolean);

if (targets.length) {
const io = new IntersectionObserver((entries) => {
// on prend la section la plus visible
const visible = entries
.filter(e => e.isIntersecting)
.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
if (visible && visible.target && visible.target.id) {
setActiveById(visible.target.id);
}
}, { threshold: [0.35, 0.5, 0.65] });

targets.forEach(el => io.observe(el));
}

// Scroll doux au clic (au cas où Carrd ne le fait pas)
btns.forEach(b => {
b.addEventListener('click', (e) => {
const id = b.dataset.target;
const el = document.getElementById(id);
if (!el) return; // si Carrd gère déjà le scroll
e.preventDefault();
history.pushState(null, '', '#' + id);
el.scrollIntoView({ behavior: 'smooth', block: 'start' });
setActiveById(id);
});
});
})();
