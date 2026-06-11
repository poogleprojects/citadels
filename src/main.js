import { ROLE_DEFS, ROLE_NAME } from "./data.js";
import {
  activeRolePlayer,
  assignRole,
  buildDistrict,
  createInitialState,
  createInitialStateFromConfig,
  exportSnapshot,
  finishRoleTurn,
  importSnapshot,
  beginIncomeDrawChoice,
  performIncomeAction,
  prepareNextRoleTurn,
  resolveIncomeDrawChoice,
  revealForHuman,
  roleTurnStatusLabel,
  useAssassinAbility,
  useKingAbility,
  useMagicianAbility,
  useThiefAbility,
  useWarlordAbility,
} from "./engine.js";
import {
  chooseAssassinationTarget,
  chooseBuildForCpu,
  chooseMagicianSwapTarget,
  chooseThiefTarget,
  chooseWarlordTarget,
  decideIncomeAction,
  pickRoleForCpu,
} from "./ai.js";
import { getDistrictTexture, getRoleTexture, hasRoleTexture } from "./assetLoader.js";
import { startWebglBackground } from "./webglBg.js";
 
const TARGET_ICON_SRC = {
  assassin: "./assets/icons/dagger.png",
  thief: "./assets/icons/moneybag.png",
};
 
const DEFAULT_CPU_NAMES = [
  "Sir Lagalot",
  "Count Null",
  "Baron Buffer",
  "Queen Segfault",
  "Duke Debug",
  "Lady Cache",
];
 
const ui = {
  playersList: document.querySelector("#players-list"),
  draftArea: document.querySelector("#draft-area"),
  actionArea: document.querySelector("#action-area"),
  handArea: document.querySelector("#hand-area"),
  logArea: document.querySelector("#log-area"),
  phasePill: document.querySelector("#phase-pill"),
  roundPill: document.querySelector("#round-pill"),
  turnBanner: document.querySelector("#turn-banner"),
  humanCount: document.querySelector("#human-count"),
  cpuCount: document.querySelector("#cpu-count"),
  startingGold: document.querySelector("#starting-gold"),
  cpuNames: document.querySelector("#cpu-names"),
  speedRange: document.querySelector("#speed-range"),
  newGameBtn: document.querySelector("#new-game-btn"),
  exportBtn: document.querySelector("#export-btn"),
  importBtn: document.querySelector("#import-btn"),
  importFile: document.querySelector("#import-file"),
  fxLayer: document.querySelector("#fx-layer"),
  rolePreview: document.querySelector("#role-preview"),
  rolePreviewName: document.querySelector("#role-preview-name"),
  rolePreviewImage: document.querySelector("#role-preview-image"),
};
 
let state = createInitialState(20260611);
let cpuDelayMs = Number(ui.speedRange.value) || 500;
let lastSeenLogHead = "";
let fxPlaying = false;
const fxQueue = [];
let renderVersion = 0;
startWebglBackground(document.querySelector("#table-bg"));
 
function playerAtDraftTurn() {
  return state.players[state.draftCurrentIndex] || null;
}
 
function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
 
function downloadText(filename, content, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
 
function createPlayerConfig(humanCount, cpuCount) {
  const userNames = (ui.cpuNames.value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const config = [];
  for (let i = 0; i < humanCount; i += 1) {
    config.push({ name: `Player ${i + 1}`, isCpu: false });
  }
  for (let i = 0; i < cpuCount; i += 1) {
    const name = userNames[i] || DEFAULT_CPU_NAMES[i] || `CPU ${i + 1}`;
    config.push({ name, isCpu: true });
  }
  return config;
}
 
function startNewGameFromControls() {
  const humans = Number(ui.humanCount.value);
  const cpus = Number(ui.cpuCount.value);
  const total = humans + cpus;
 
  if (humans < 1 || total < 4 || total > 7) {
    setBanner("Citadels needs 4 to 7 total players and at least 1 human", true);
    return false;
  }
 
  cpuDelayMs = Number(ui.speedRange.value) || 500;
  const startingGold = Math.max(0, Math.min(20, Number(ui.startingGold.value) || 2));
  ui.startingGold.value = String(startingGold);
  const seed = Date.now();
  const config = createPlayerConfig(humans, cpus);
  state = createInitialStateFromConfig(config, seed, startingGold);
  fxQueue.length = 0;
  fxPlaying = false;
  clearElem(ui.fxLayer);
  hideRolePreview();
  lastSeenLogHead = state.log[0] || "";
  return true;
}
 
function setBanner(msg, show = true) {
  ui.turnBanner.textContent = msg;
  ui.turnBanner.classList.toggle("hidden", !show);
}
 
function clearElem(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
 
function showRolePreview(roleId, anchorRect) {
  if (!roleId) return;
  getRoleTexture(roleId).then((tex) => {
    ui.rolePreviewName.textContent = ROLE_NAME[roleId] || roleId;
    ui.rolePreviewImage.style.backgroundImage = `url(${tex})`;
 
    const left = Math.min(window.innerWidth - 240, Math.max(10, anchorRect.right + 10));
    const top = Math.min(window.innerHeight - 340, Math.max(10, anchorRect.top - 8));
    ui.rolePreview.style.left = `${left}px`;
    ui.rolePreview.style.top = `${top}px`;
    ui.rolePreview.classList.remove("hidden");
  });
}
 
function hideRolePreview() {
  ui.rolePreview.classList.add("hidden");
}
 
function roleRank(roleId) {
  return ROLE_DEFS.find((r) => r.id === roleId)?.rank || 99;
}
 
function hasPlayedTurn(player) {
  if (state.phase !== "roleTurn" || !player.roleId || !state.currentRoleId || state.ended) return false;
  return roleRank(player.roleId) < roleRank(state.currentRoleId);
}
 
function createTargetMarker(type, label, fallback) {
  const marker = document.createElement("div");
  marker.className = `target-marker target-${type}`;
  marker.title = label;
 
  const img = document.createElement("img");
  img.className = "target-marker-icon";
  img.src = TARGET_ICON_SRC[type];
  img.alt = label;
  img.addEventListener("error", () => {
    img.remove();
    marker.textContent = fallback;
  });
 
  marker.appendChild(img);
  return marker;
}
 
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
 
function classifyEffect(logLine) {
  if (!logLine) return null;
  const lower = logLine.toLowerCase();
 
  if (lower.includes("assassination") || lower.includes("assassinated")) {
    return { type: "assassinate", label: "Assassination" };
  }
  if (lower.includes("steals") || lower.includes("rob")) {
    return { type: "rob", label: "Robbery" };
  }
  if (lower.includes("destroys")) {
    return { type: "destroy", label: "Destruction" };
  }
  return null;
}
 
async function playFxQueue() {
  if (fxPlaying || !fxQueue.length) return;
  fxPlaying = true;
 
  while (fxQueue.length) {
    const fx = fxQueue.shift();
    const chip = document.createElement("div");
    chip.className = `fx-chip fx-${fx.type}`;
    chip.textContent = `${fx.label}: ${fx.message}`;
    ui.fxLayer.appendChild(chip);
    await sleep(1120);
    chip.remove();
    await sleep(60);
  }
 
  fxPlaying = false;
}
 
function maybeTriggerFxFromLog() {
  const head = state.log && state.log[0];
  if (!head || head === lastSeenLogHead) return;
  lastSeenLogHead = head;
 
  const fx = classifyEffect(head);
  if (!fx) return;
  fxQueue.push({ ...fx, message: head });
  playFxQueue();
}
 
async function cardNode(card, options = {}) {
  const div = document.createElement("div");
  div.className = "game-card";
  if (options.unavailable) div.classList.add("unavailable");
  let hideOverlayText = false;
 
  if (card.type === "district") {
    const tex = await getDistrictTexture(card.id);
    div.style.backgroundImage = `linear-gradient(150deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02)), url(${tex})`;
    div.style.backgroundSize = "cover";
  } else if (card.type === "role") {
    const tex = await getRoleTexture(card.id);
    div.style.backgroundImage = `linear-gradient(165deg, rgba(3,8,24,0.28), rgba(3,8,24,0.06)), url(${tex})`;
    div.style.backgroundSize = "cover";
    div.style.backgroundPosition = "center";
    hideOverlayText = hasRoleTexture(card.id);
  }
 
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = card.name || ROLE_NAME[card.id] || card.id;
 
  const rank = document.createElement("div");
  rank.className = "role-rank";
  if (card.rank) rank.textContent = `#${card.rank}`;
 
  const cost = document.createElement("div");
  cost.className = "cost";
  cost.textContent = card.cost != null ? `Cost: ${card.cost}` : "";
 
  const kind = document.createElement("div");
  kind.className = "kind";
  kind.textContent = card.type === "district" ? `${card.color.toUpperCase()} district` : "Role";
 
  if (!hideOverlayText) {
    div.append(name, rank, cost, kind);
  }
  return div;
}
 
function renderPlayers() {
  clearElem(ui.playersList);
  const active = activeRolePlayer(state);
  const assassinatedRole = state.assassinatedRole;
  const robbedRole = state.robbedRole;
 
  for (const p of state.players) {
    const tile = document.createElement("div");
    tile.className = "player-tile";
    if (active && active.id === p.id) tile.classList.add("active");
 
    const nameRow = document.createElement("div");
    nameRow.className = "player-name-row";
 
    const name = document.createElement("div");
    name.className = "player-name";
    name.textContent = `${p.name}${p.crown ? " 👑" : ""} ${p.isCpu ? "[CPU]" : "[Human]"}`;
 
    const editName = document.createElement("button");
    editName.className = "name-edit-btn";
    editName.textContent = "Rename";
    editName.addEventListener("click", () => {
      const next = window.prompt("Set player name", p.name);
      if (!next) return;
      p.name = next.trim() || p.name;
      renderAll();
    });
    nameRow.append(name, editName);
 
    const m2 = document.createElement("div");
    m2.className = "player-meta";
    m2.textContent = `Gold ${p.gold} | Hand ${p.hand.length} | City ${p.city.length}`;
 
    const m3 = document.createElement("div");
    m3.className = "player-meta";
    m3.textContent = `Role: Hidden`;
 
    const played = document.createElement("div");
    played.className = "turn-played";
    played.textContent = hasPlayedTurn(p) ? "Turn status: Completed" : "Turn status: Pending";
 
    const city = document.createElement("div");
    city.className = "city-strip";
    for (const d of p.city) {
      const x = document.createElement("span");
      x.className = `city-district city-color-${d.color}`;
      x.textContent = d.name;
      city.appendChild(x);
    }
 
    tile.addEventListener("mouseenter", () => {
      if (p.roleId) showRolePreview(p.roleId, tile.getBoundingClientRect());
      if (!p.hand.length) return;
      const preview = p.hand.slice(0, 4).map((c) => c.name).join(", ");
      m3.textContent = `Role: Hidden | Hand: ${preview}${p.hand.length > 4 ? "..." : ""}`;
    });
    tile.addEventListener("mouseleave", () => {
      hideRolePreview();
      m3.textContent = "Role: Hidden";
    });
 
    if (assassinatedRole && p.roleId === assassinatedRole) {
      tile.appendChild(createTargetMarker("assassin", "Assassination target", "X"));
    }
    if (robbedRole && p.roleId === robbedRole) {
      tile.appendChild(createTargetMarker("thief", "Robbery target", "$"));
    }
 
    tile.append(nameRow, m2, m3, played, city);
    ui.playersList.appendChild(tile);
  }
}
 
function renderLog() {
  clearElem(ui.logArea);
  for (const line of state.log) {
    const row = document.createElement("div");
    row.className = "log-line";
    row.textContent = line;
    ui.logArea.appendChild(row);
  }
  maybeTriggerFxFromLog();
}
 
async function renderDraftArea(version) {
  clearElem(ui.draftArea);
  if (state.phase !== "draft") return;
 
  const drafter = playerAtDraftTurn();
  if (!drafter) return;
 
  const head = document.createElement("div");
  head.textContent = `${drafter.name} chooses a role`;
  ui.draftArea.appendChild(head);
 
  for (const roleId of state.availableRoles) {
    const role = ROLE_DEFS.find((r) => r.id === roleId);
    const node = await cardNode({
      id: role.id,
      rank: role.rank,
      name: ROLE_NAME[role.id],
      type: "role",
      color: "none",
    });
 
    if (version !== renderVersion) return;
    node.classList.add("role-hoverable");
    node.addEventListener("mouseenter", () => {
      showRolePreview(role.id, node.getBoundingClientRect());
    });
    node.addEventListener("mouseleave", () => {
      hideRolePreview();
    });
 
    if (drafter.isCpu) {
      node.classList.add("unavailable");
    } else {
      node.addEventListener("click", async () => {
        assignRole(state, drafter.id, roleId);
        state.actionHistory.push({ type: "draft", playerId: drafter.id, roleId, at: Date.now() });
        renderAll();
        await gameTick();
      });
    }
 
    ui.draftArea.appendChild(node);
  }
}
 
async function renderActionArea() {
  clearElem(ui.actionArea);
  if (state.ended) {
    const winner = document.createElement("div");
    winner.textContent = `Winner: ${state.winner.name} (${state.winner.score})`;
    ui.actionArea.appendChild(winner);
 
    const tieMeta = document.createElement("div");
    tieMeta.textContent = "Tie-break order: total score, city size, gold, hand size";
    ui.actionArea.appendChild(tieMeta);
 
    for (const s of state.scores) {
      const line = document.createElement("div");
      line.textContent = `${s.name}: ${s.score} (district ${s.breakdown.districtPoints} + completion ${s.breakdown.completionBonus} + first8 ${s.breakdown.firstToEightBonus} + diversity ${s.breakdown.diversityBonus})`;
      ui.actionArea.appendChild(line);
    }
    return;
  }
 
  if (state.phase === "draft") {
    const hint = document.createElement("div");
    hint.textContent = "Drafting roles";
    ui.actionArea.appendChild(hint);
    return;
  }
 
  const player = activeRolePlayer(state);
  if (!player) return;
 
  const summary = document.createElement("div");
  summary.textContent = `${player.name} as ${ROLE_NAME[player.roleId]} (Build ${player.builtThisTurn}/${state.buildLimit})`;
  ui.actionArea.appendChild(summary);
 
  if (state.revealRequired) {
    const reveal = document.createElement("button");
    reveal.className = "cta";
    reveal.textContent = `Reveal turn for ${player.name}`;
    reveal.addEventListener("click", async () => {
      revealForHuman(state, player.id);
      renderAll();
      await gameTick();
    });
    ui.actionArea.appendChild(reveal);
    return;
  }
 
  if (!state.actionDone) {
    if (state.pendingDrawChoices && state.pendingDrawChoices.length) {
      const pickLabel = document.createElement("div");
      pickLabel.textContent = "Choose one drawn card to keep:";
      ui.actionArea.appendChild(pickLabel);
 
      for (const drawCard of state.pendingDrawChoices) {
        const cardDiv = await cardNode(drawCard);
        const keepBtn = document.createElement("button");
        keepBtn.className = "cta";
        keepBtn.textContent = "Keep this card";
        keepBtn.onclick = async () => {
          resolveIncomeDrawChoice(state, drawCard.uid);
          state.actionHistory.push({ type: "income-choice", playerId: player.id, chosenUid: drawCard.uid, at: Date.now() });
          await renderAll();
          await gameTick();
        };
        cardDiv.appendChild(keepBtn);
        ui.actionArea.appendChild(cardDiv);
      }
      return;
    }
 
    const btnGold = document.createElement("button");
    btnGold.className = "cta";
    btnGold.textContent = "Take 2 gold";
    btnGold.onclick = async () => {
      performIncomeAction(state, "gold");
      state.actionHistory.push({ type: "income", playerId: player.id, mode: "gold", at: Date.now() });
      await renderAll();
      await gameTick();
    };
 
    const btnDraw = document.createElement("button");
    btnDraw.className = "cta";
    btnDraw.textContent = "Draw cards";
    btnDraw.onclick = async () => {
      if (player.isCpu) {
        performIncomeAction(state, "draw");
      } else {
        beginIncomeDrawChoice(state);
      }
      state.actionHistory.push({ type: "income", playerId: player.id, mode: "draw", at: Date.now() });
      await renderAll();
      await gameTick();
    };
    ui.actionArea.append(btnGold, btnDraw);
    return;
  }
 
  if (!state.roleAbilityDone) {
    await renderRoleAbilityControls(player);
  }
 
  const endBtn = document.createElement("button");
  endBtn.className = "cta warn";
  endBtn.textContent = "End role turn";
  endBtn.onclick = async () => {
    finishRoleTurn(state);
    renderAll();
    await gameTick();
  };
  ui.actionArea.appendChild(endBtn);
}
 
async function renderRoleAbilityControls(player) {
  const roleId = player.roleId;
 
  const roleHeader = document.createElement("div");
  roleHeader.textContent = `Role ability: ${ROLE_NAME[roleId]}`;
  ui.actionArea.appendChild(roleHeader);
 
  if (["bishop", "merchant", "architect"].includes(roleId)) {
    const done = document.createElement("button");
    done.className = "cta";
    done.textContent = "No active ability";
    done.onclick = () => {
      state.roleAbilityDone = true;
      renderAll();
    };
    ui.actionArea.appendChild(done);
    return;
  }
 
  if (roleId === "king") {
    const btn = document.createElement("button");
    btn.className = "cta";
    btn.textContent = "Take crown";
    btn.onclick = () => {
      useKingAbility(state);
      state.actionHistory.push({ type: "ability", playerId: player.id, roleId: "king", at: Date.now() });
      renderAll();
    };
    ui.actionArea.appendChild(btn);
    return;
  }
 
  if (roleId === "assassin") {
    for (const r of ROLE_DEFS.filter((x) => x.id !== "assassin")) {
      const btn = document.createElement("button");
      btn.className = "cta";
      btn.textContent = `Assassinate ${ROLE_NAME[r.id]}`;
      btn.onclick = () => {
        useAssassinAbility(state, r.id);
        state.actionHistory.push({ type: "ability", playerId: player.id, roleId: "assassin", targetRoleId: r.id, at: Date.now() });
        renderAll();
      };
      ui.actionArea.appendChild(btn);
    }
    return;
  }
 
  if (roleId === "thief") {
    for (const r of ROLE_DEFS.filter((x) => x.id !== "assassin" && x.id !== "thief")) {
      const btn = document.createElement("button");
      btn.className = "cta";
      btn.textContent = `Rob ${ROLE_NAME[r.id]}`;
      btn.onclick = () => {
        useThiefAbility(state, r.id);
        state.actionHistory.push({ type: "ability", playerId: player.id, roleId: "thief", targetRoleId: r.id, at: Date.now() });
        renderAll();
      };
      ui.actionArea.appendChild(btn);
    }
    return;
  }
 
  if (roleId === "magician") {
    for (const p of state.players.filter((x) => x.id !== player.id)) {
      const btn = document.createElement("button");
      btn.className = "cta";
      btn.textContent = `Swap hand with ${p.name}`;
      btn.onclick = () => {
        useMagicianAbility(state, p.id);
        state.actionHistory.push({ type: "ability", playerId: player.id, roleId: "magician", targetPlayerId: p.id, at: Date.now() });
        renderAll();
      };
      ui.actionArea.appendChild(btn);
    }
    const skip = document.createElement("button");
    skip.className = "cta";
    skip.textContent = "Skip ability";
    skip.onclick = () => {
      state.roleAbilityDone = true;
      state.actionHistory.push({ type: "ability-skip", playerId: player.id, roleId: "magician", at: Date.now() });
      renderAll();
    };
    ui.actionArea.appendChild(skip);
    return;
  }
 
  if (roleId === "warlord") {
    for (const target of state.players.filter((x) => x.id !== player.id && x.city.length > 0 && x.roleId !== "bishop")) {
      for (const d of target.city) {
        const btn = document.createElement("button");
        btn.className = "cta";
        btn.textContent = `Destroy ${target.name} ${d.name} (${Math.max(1, d.cost - 1)}g)`;
        btn.onclick = () => {
          useWarlordAbility(state, target.id, d.uid);
          state.actionHistory.push({ type: "ability", playerId: player.id, roleId: "warlord", targetPlayerId: target.id, districtUid: d.uid, at: Date.now() });
          renderAll();
        };
        ui.actionArea.appendChild(btn);
      }
    }
    const skip = document.createElement("button");
    skip.className = "cta";
    skip.textContent = "Skip attack";
    skip.onclick = () => {
      state.roleAbilityDone = true;
      state.actionHistory.push({ type: "ability-skip", playerId: player.id, roleId: "warlord", at: Date.now() });
      renderAll();
    };
    ui.actionArea.appendChild(skip);
  }
}
 
async function renderHandArea(version) {
  clearElem(ui.handArea);
  if (state.phase === "draft" || state.ended) return;
 
  const player = activeRolePlayer(state);
  if (!player) return;
 
  if (state.revealRequired) {
    const hidden = document.createElement("div");
    hidden.textContent = "Hand hidden until active player confirms";
    ui.handArea.appendChild(hidden);
    return;
  }
 
  for (const card of player.hand) {
    const unavailable = card.cost > player.gold || player.city.some((d) => d.id === card.id) || player.builtThisTurn >= state.buildLimit;
    const node = await cardNode(card, { unavailable });
    if (version !== renderVersion) return;
    if (!unavailable) {
      node.addEventListener("click", async () => {
        buildDistrict(state, card.uid);
        state.actionHistory.push({ type: "build", playerId: player.id, cardUid: card.uid, at: Date.now() });
        renderAll();
        await gameTick();
      });
    }
    ui.handArea.appendChild(node);
  }
}
 
async function renderAll() {
  renderVersion += 1;
  const version = renderVersion;
  ui.roundPill.textContent = `Round ${state.round}`;
  ui.phasePill.textContent = roleTurnStatusLabel(state);
 
  renderPlayers();
  renderLog();
  await renderDraftArea(version);
  if (version !== renderVersion) return;
  await renderActionArea();
  if (version !== renderVersion) return;
  await renderHandArea(version);
}
 
async function runCpuDraft() {
  while (state.phase === "draft") {
    const p = playerAtDraftTurn();
    if (!p || !p.isCpu) break;
    setBanner(`${p.name} drafting...`, true);
    await pause(Math.max(120, Math.floor(cpuDelayMs * 0.8)));
    const pick = pickRoleForCpu(state, p.id, state.availableRoles);
    assignRole(state, p.id, pick);
    state.actionHistory.push({ type: "draft", playerId: p.id, roleId: pick, at: Date.now() });
    await renderAll();
  }
}
 
function completePassiveAbilityForCpu(player) {
  if (player.roleId === "king") {
    useKingAbility(state);
    return true;
  }
  if (player.roleId === "assassin") {
    useAssassinAbility(state, chooseAssassinationTarget(ROLE_DEFS.map((r) => r.id)));
    return true;
  }
  if (player.roleId === "thief") {
    useThiefAbility(state, chooseThiefTarget(ROLE_DEFS.map((r) => r.id)));
    return true;
  }
  if (player.roleId === "magician") {
    const target = chooseMagicianSwapTarget(state, player.id);
    if (target) {
      useMagicianAbility(state, target);
    } else {
      state.roleAbilityDone = true;
    }
    return true;
  }
  if (player.roleId === "warlord") {
    const target = chooseWarlordTarget(state, player.id);
    if (target) {
      useWarlordAbility(state, target.playerId, target.districtUid);
    } else {
      state.roleAbilityDone = true;
    }
    return true;
  }
  state.roleAbilityDone = true;
  return true;
}
 
async function runCpuRoleTurn() {
  const p = activeRolePlayer(state);
  if (!p || !p.isCpu || state.phase === "draft" || state.ended) return;
 
  setBanner(`${p.name} as ${ROLE_NAME[p.roleId]} is thinking...`, true);
  await pause(cpuDelayMs);
 
  if (!state.actionDone) {
    const incomeMode = decideIncomeAction(state, p.id);
    performIncomeAction(state, incomeMode);
    state.actionHistory.push({ type: "income", playerId: p.id, mode: incomeMode, at: Date.now() });
    await renderAll();
    await pause(Math.max(100, Math.floor(cpuDelayMs * 0.55)));
  }
 
  if (!state.roleAbilityDone) {
    completePassiveAbilityForCpu(p);
    await renderAll();
    await pause(Math.max(100, Math.floor(cpuDelayMs * 0.52)));
  }
 
  while (true) {
    const nextBuild = chooseBuildForCpu(state, p.id, state.buildLimit, p.builtThisTurn);
    if (!nextBuild) break;
    buildDistrict(state, nextBuild);
    state.actionHistory.push({ type: "build", playerId: p.id, cardUid: nextBuild, at: Date.now() });
    await renderAll();
    await pause(Math.max(100, Math.floor(cpuDelayMs * 0.6)));
  }
 
  finishRoleTurn(state);
  await renderAll();
}
 
async function gameTick() {
  if (state.ended) {
    setBanner("Game complete", true);
    return;
  }
 
  if (state.phase === "draft") {
    await runCpuDraft();
    await renderAll();
    return;
  }
 
  const player = activeRolePlayer(state);
  if (!player) {
    prepareNextRoleTurn(state);
    await renderAll();
    await gameTick();
    return;
  }
 
  if (player.isCpu) {
    await runCpuRoleTurn();
    await gameTick();
    return;
  }
 
  if (state.revealRequired) {
    setBanner(`${player.name}: click reveal to take your turn`, true);
    return;
  }
 
  setBanner(`${player.name}: choose actions`, true);
}
 
(async function boot() {
  ui.newGameBtn.addEventListener("click", async () => {
    if (!startNewGameFromControls()) return;
    await renderAll();
    await gameTick();
  });
 
  ui.speedRange.addEventListener("input", () => {
    cpuDelayMs = Number(ui.speedRange.value) || 500;
  });
 
  ui.exportBtn.addEventListener("click", () => {
    const payload = exportSnapshot(state);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(`citadels-save-${stamp}.json`, payload);
    setBanner("Save exported", true);
  });
 
  ui.importBtn.addEventListener("click", () => {
    ui.importFile.click();
  });
 
  ui.importFile.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
 
    try {
      const text = await file.text();
      state = importSnapshot(text);
      cpuDelayMs = Number(ui.speedRange.value) || 500;
      if (state.startingGold != null) {
        ui.startingGold.value = String(state.startingGold);
      }
      fxQueue.length = 0;
      fxPlaying = false;
      clearElem(ui.fxLayer);
      hideRolePreview();
      lastSeenLogHead = state.log[0] || "";
      await renderAll();
      await gameTick();
      setBanner("Save imported", true);
    } catch (error) {
      setBanner("Import failed: invalid save file", true);
    } finally {
      ui.importFile.value = "";
    }
  });
 
  await renderAll();
  await gameTick();
})();