const cache = new Map();
const roleCache = new Map();
let districtAtlasPromise = null;
 
const ROLE_ATLAS_ORDER = [
  "assassin",
  "thief",
  "magician",
  "king",
  "bishop",
  "merchant",
  "architect",
  "warlord",
];
 
const DISTRICT_ATLAS_CONFIG = {
  cols: 4,
  rows: 3,
  sheets: {
    1: "./assets/cards/Districts_1.png",
    2: "./assets/cards/Districts_2.png",
  },
};
 
const DISTRICT_ATLAS_ORDER = {
  manor: { sheet: 1, index: 0 },
  castle: { sheet: 1, index: 1 },
  palace: { sheet: 1, index: 2 },
  temple: { sheet: 1, index: 3 },
  church: { sheet: 1, index: 4 },
  monastery: { sheet: 1, index: 5 },
  cathedral: { sheet: 1, index: 6 },
  tavern: { sheet: 1, index: 7 },
  market: { sheet: 1, index: 8 },
  tradingPost: { sheet: 1, index: 9 },
  docks: { sheet: 1, index: 10 },
  harbor: { sheet: 1, index: 11 },
  townHall: { sheet: 2, index: 0 },
  watchtower: { sheet: 2, index: 1 },
  prison: { sheet: 2, index: 2 },
  battlefield: { sheet: 2, index: 3 },
  fortress: { sheet: 2, index: 4 },
  hauntedCity: { sheet: 2, index: 5 },
  keep: { sheet: 2, index: 6 },
  imperialTreasury: { sheet: 2, index: 7 },
  mapRoom: { sheet: 2, index: 8 },
  laboratory: { sheet: 2, index: 9 },
  observatory: { sheet: 2, index: 10 },
  smithy: { sheet: 2, index: 11 },
};
 
export function hasDistrictTexture(cardId) {
  return Boolean(DISTRICT_ATLAS_ORDER[cardId]);
}
 
export function hasRoleTexture(roleId) {
  return ROLE_ATLAS_ORDER.includes(roleId);
}
 
function districtColor(id) {
  const map = {
    temple: "#5ab1ef",
    church: "#5ab1ef",
    monastery: "#5ab1ef",
    watchtower: "#ef767a",
    prison: "#ef767a",
    battlefield: "#ef767a",
    market: "#73d2de",
    tradingPost: "#73d2de",
    docks: "#73d2de",
    manor: "#ffd166",
    castle: "#ffd166",
    palace: "#ffd166",
    laboratory: "#cdb4db",
    graveyard: "#cdb4db",
    dragonGate: "#cdb4db",
  };
  return map[id] || "#9aa6b2";
}
 
function placeholderDataUrl(cardId) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  const base = districtColor(cardId);
 
  const grad = ctx.createLinearGradient(0, 0, 256, 360);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, base);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 360);
 
  ctx.fillStyle = "rgba(10,16,34,0.86)";
  ctx.fillRect(12, 12, 232, 336);
 
  ctx.fillStyle = "#f6f4ef";
  ctx.font = "bold 22px Segoe UI";
  ctx.fillText("Placeholder", 22, 44);
 
  ctx.fillStyle = base;
  ctx.font = "bold 28px Segoe UI";
  const title = cardId.replace(/([A-Z])/g, " $1");
  ctx.fillText(title.charAt(0).toUpperCase() + title.slice(1), 22, 92);
 
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 118, 210, 200);
 
  return canvas.toDataURL("image/png");
}
 
export async function getDistrictTexture(cardId) {
  if (cache.has(cardId)) return cache.get(cardId);
 
  const slot = DISTRICT_ATLAS_ORDER[cardId];
  if (!slot) {
    const fallback = placeholderDataUrl(cardId);
    cache.set(cardId, fallback);
    return fallback;
  }
 
  const atlases = await loadDistrictAtlases();
  const atlas = atlases[slot.sheet];
  if (!atlas) {
    const fallback = placeholderDataUrl(cardId);
    cache.set(cardId, fallback);
    return fallback;
  }
 
  const frameW = Math.floor(atlas.width / DISTRICT_ATLAS_CONFIG.cols);
  const frameH = Math.floor(atlas.height / DISTRICT_ATLAS_CONFIG.rows);
  const x = (slot.index % DISTRICT_ATLAS_CONFIG.cols) * frameW;
  const y = Math.floor(slot.index / DISTRICT_ATLAS_CONFIG.cols) * frameH;
 
  const canvas = document.createElement("canvas");
  canvas.width = frameW;
  canvas.height = frameH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(atlas, x, y, frameW, frameH, 0, 0, frameW, frameH);
  const url = canvas.toDataURL("image/png");
 
  cache.set(cardId, url);
  return url;
}
 
async function loadDistrictAtlases() {
  if (!districtAtlasPromise) {
    districtAtlasPromise = Promise.all(
      Object.entries(DISTRICT_ATLAS_CONFIG.sheets).map(([sheet, src]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve([sheet, img]);
          img.onerror = () => resolve([sheet, null]);
          img.src = src;
        })
      )
    ).then((entries) => Object.fromEntries(entries));
  }
 
  return districtAtlasPromise;
}
 
function rolePlaceholderDataUrl(roleId) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
 
  const grad = ctx.createLinearGradient(0, 0, 256, 360);
  grad.addColorStop(0, "#2e3f68");
  grad.addColorStop(1, "#0b1022");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 360);
 
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 28px Segoe UI";
  const title = roleId.charAt(0).toUpperCase() + roleId.slice(1);
  ctx.fillText(title, 20, 170);
 
  return canvas.toDataURL("image/png");
}
 
async function loadRoleAtlasImage() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "./assets/roles/roles.png";
  });
}
 
export async function getRoleTexture(roleId) {
  if (roleCache.has(roleId)) return roleCache.get(roleId);
 
  const index = ROLE_ATLAS_ORDER.indexOf(roleId);
  if (index === -1) {
    const fallback = rolePlaceholderDataUrl(roleId);
    roleCache.set(roleId, fallback);
    return fallback;
  }
 
  const atlas = await loadRoleAtlasImage();
  if (!atlas) {
    const fallback = rolePlaceholderDataUrl(roleId);
    roleCache.set(roleId, fallback);
    return fallback;
  }
 
  const cols = 4;
  const rows = 2;
  const frameW = Math.floor(atlas.width / cols);
  const frameH = Math.floor(atlas.height / rows);
  const x = (index % cols) * frameW;
  const y = Math.floor(index / cols) * frameH;
 
  const canvas = document.createElement("canvas");
  canvas.width = frameW;
  canvas.height = frameH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(atlas, x, y, frameW, frameH, 0, 0, frameW, frameH);
  const url = canvas.toDataURL("image/png");
 
  roleCache.set(roleId, url);
  return url;
}