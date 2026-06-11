import { ROLE_DEFS, ROLE_NAME, createDistrictDeck } from "./data.js";
import { mulberry32, seededShuffle } from "./utils.js";
 
function createPlayers(config, startingGold = 2) {
  const safeGold = Number.isFinite(startingGold) ? Math.max(0, Math.floor(startingGold)) : 2;
  return config.map((p, idx) => ({
    id: `p${idx + 1}`,
    name: p.name,
    isCpu: p.isCpu,
    gold: safeGold,
    hand: [],
    city: [],
    roleId: null,
    crown: idx === 0,
    builtThisTurn: 0,
  }));
}
 
function drawCard(state) {
  if (!state.deck.length) {
    state.deck = seededShuffle(state.discard.splice(0), state.random);
  }
  return state.deck.pop() || null;
}
 
function drawMany(state, playerId, n) {
  const player = state.players.find((p) => p.id === playerId);
  for (let i = 0; i < n; i += 1) {
    const card = drawCard(state);
    if (card) player.hand.push(card);
  }
}
 
function findCrownHolderIndex(state) {
  return state.players.findIndex((p) => p.crown);
}
 
function roleById(id) {
  return ROLE_DEFS.find((r) => r.id === id);
}
 
function nextDraftPlayerIndex(state) {
  for (let offset = 0; offset < state.players.length; offset += 1) {
    const idx = (state.draftStartIndex + offset) % state.players.length;
    const p = state.players[idx];
    if (!p.roleId) return idx;
  }
  return -1;
}
 
function getRoleTurnOrder(state) {
  return [...ROLE_DEFS].sort((a, b) => a.rank - b.rank).map((r) => r.id);
}
 
function computeScoreBreakdown(player, firstToEight) {
  const districtPoints = player.city.reduce((sum, c) => sum + c.cost, 0);
  const completionBonus = player.city.length >= 8 ? 2 : 0;
  const firstToEightBonus = firstToEight === player.id ? 2 : 0;
  const colors = new Set(player.city.map((c) => c.color));
  const diversityBonus = ["blue", "green", "red", "yellow", "purple"].every((c) => colors.has(c)) ? 3 : 0;
  const total = districtPoints + completionBonus + firstToEightBonus + diversityBonus;
 
  return {
    districtPoints,
    completionBonus,
    firstToEightBonus,
    diversityBonus,
    total,
  };
}
 
function sortScoreEntries(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.cityCount !== a.cityCount) return b.cityCount - a.cityCount;
  if (b.gold !== a.gold) return b.gold - a.gold;
  return b.handCount - a.handCount;
}
 
export function createInitialState(seed = Date.now(), startingGold = 2) {
  const random = mulberry32(typeof seed === "number" ? seed : 1337);
  const players = createPlayers([
    { name: "Player 1", isCpu: false },
    { name: "Player 2", isCpu: false },
    { name: "CPU 1", isCpu: true },
    { name: "CPU 2", isCpu: true },
  ], startingGold);
 
  const deck = seededShuffle(createDistrictDeck(), random);
  const state = {
    seed,
    random,
    round: 1,
    phase: "draft",
    players,
    deck,
    discard: [],
    availableRoles: ROLE_DEFS.map((r) => r.id),
    draftStartIndex: 0,
    draftCurrentIndex: 0,
    roleTurnIndex: 0,
    currentRoleId: null,
    assassinatedRole: null,
    robbedRole: null,
    robOwnerId: null,
    log: ["Game start"],
    winner: null,
    ended: false,
    firstToEight: null,
    buildLimit: 1,
    actionDone: false,
    roleAbilityDone: false,
    revealRequired: true,
    revealedPlayerId: null,
    actionHistory: [],
    pendingDrawChoices: null,
    startingGold: Number.isFinite(startingGold) ? Math.max(0, Math.floor(startingGold)) : 2,
  };
 
  for (const p of state.players) {
    drawMany(state, p.id, 4);
  }
 
  state.draftStartIndex = findCrownHolderIndex(state);
  state.draftCurrentIndex = state.draftStartIndex;
  return state;
}
 
export function createInitialStateFromConfig(config, seed = Date.now(), startingGold = 2) {
  const random = mulberry32(typeof seed === "number" ? seed : 1337);
  const players = createPlayers(config, startingGold);
 
  const deck = seededShuffle(createDistrictDeck(), random);
  const state = {
    seed,
    random,
    round: 1,
    phase: "draft",
    players,
    deck,
    discard: [],
    availableRoles: ROLE_DEFS.map((r) => r.id),
    draftStartIndex: 0,
    draftCurrentIndex: 0,
    roleTurnIndex: 0,
    currentRoleId: null,
    assassinatedRole: null,
    robbedRole: null,
    robOwnerId: null,
    log: ["Game start"],
    winner: null,
    ended: false,
    firstToEight: null,
    buildLimit: 1,
    actionDone: false,
    roleAbilityDone: false,
    revealRequired: true,
    revealedPlayerId: null,
    actionHistory: [],
    pendingDrawChoices: null,
    startingGold: Number.isFinite(startingGold) ? Math.max(0, Math.floor(startingGold)) : 2,
  };
 
  for (const p of state.players) {
    drawMany(state, p.id, 4);
  }
 
  state.draftStartIndex = findCrownHolderIndex(state);
  state.draftCurrentIndex = state.draftStartIndex;
  return state;
}
 
export function appendLog(state, line) {
  state.log.unshift(line);
  state.log = state.log.slice(0, 120);
}
 
export function startRound(state) {
  state.round += 1;
  state.phase = "draft";
  state.availableRoles = ROLE_DEFS.map((r) => r.id);
  for (const p of state.players) {
    p.roleId = null;
    p.builtThisTurn = 0;
  }
  state.assassinatedRole = null;
  state.robbedRole = null;
  state.robOwnerId = null;
  state.roleTurnIndex = 0;
  state.currentRoleId = null;
  state.buildLimit = 1;
  state.actionDone = false;
  state.roleAbilityDone = false;
  state.revealRequired = true;
  state.revealedPlayerId = null;
  state.pendingDrawChoices = null;
  state.draftStartIndex = findCrownHolderIndex(state);
  state.draftCurrentIndex = state.draftStartIndex;
  appendLog(state, `Round ${state.round} begins`);
}
 
export function assignRole(state, playerId, roleId) {
  const idx = state.availableRoles.indexOf(roleId);
  if (idx === -1) return false;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.roleId) return false;
 
  player.roleId = roleId;
  state.availableRoles.splice(idx, 1);
  appendLog(state, `${player.name} drafted ${ROLE_NAME[roleId]}`);
 
  const next = nextDraftPlayerIndex(state);
  if (next === -1) {
    state.phase = "roleTurn";
    state.roleTurnIndex = 0;
    state.currentRoleId = null;
    prepareNextRoleTurn(state);
  } else {
    state.draftCurrentIndex = next;
  }
  return true;
}
 
function activePlayerByRole(state, roleId) {
  return state.players.find((p) => p.roleId === roleId) || null;
}
 
export function prepareNextRoleTurn(state) {
  const order = getRoleTurnOrder(state);
  while (state.roleTurnIndex < order.length) {
    const roleId = order[state.roleTurnIndex];
    state.currentRoleId = roleId;
    state.roleTurnIndex += 1;
 
    const player = activePlayerByRole(state, roleId);
    if (!player) continue;
 
    state.actionDone = false;
    state.roleAbilityDone = false;
    state.pendingDrawChoices = null;
    state.buildLimit = roleId === "architect" ? 3 : 1;
    player.builtThisTurn = 0;
    state.revealRequired = !player.isCpu;
    state.revealedPlayerId = null;
 
    if (state.assassinatedRole === roleId) {
      appendLog(state, `${ROLE_NAME[roleId]} was assassinated and loses turn`);
      continue;
    }
 
    if (state.robbedRole === roleId && state.robOwnerId) {
      const robber = state.players.find((p) => p.id === state.robOwnerId);
      if (robber) {
        const amount = player.gold;
        player.gold = 0;
        robber.gold += amount;
        appendLog(state, `${robber.name} steals ${amount} gold from ${player.name}`);
      }
      state.robbedRole = null;
      state.robOwnerId = null;
    }
 
    applyRoleIncomeBonus(state, player, roleId);
 
    if (roleId === "architect") {
      drawMany(state, player.id, 2);
      appendLog(state, `${player.name} draws 2 cards as Architect`);
    }
 
    return;
  }
 
  if (state.firstToEight) {
    endGame(state);
    return;
  }
 
  startRound(state);
}
 
function applyRoleIncomeBonus(state, player, roleId) {
  if (roleId === "merchant") {
    player.gold += 1;
    appendLog(state, `${player.name} gets 1 bonus gold as Merchant`);
  }
  const role = roleById(roleId);
  if (role && role.color && role.color !== "none") {
    const n = player.city.filter((c) => c.color === role.color).length;
    if (n > 0) {
      player.gold += n;
      appendLog(state, `${player.name} gets ${n} gold from ${ROLE_NAME[roleId]} district bonus`);
    }
  }
}
 
export function activeRolePlayer(state) {
  if (!state.currentRoleId) return null;
  return activePlayerByRole(state, state.currentRoleId);
}
 
export function performIncomeAction(state, mode) {
  const player = activeRolePlayer(state);
  if (!player || state.actionDone || state.assassinatedRole === state.currentRoleId) return false;
 
  if (mode === "gold") {
    player.gold += 2;
    appendLog(state, `${player.name} takes 2 gold`);
    state.actionDone = true;
    return true;
  }
 
  const c1 = drawCard(state);
  const c2 = drawCard(state);
  const picks = [c1, c2].filter(Boolean);
  if (!picks.length) return false;
 
  picks.sort((a, b) => b.cost - a.cost);
  const chosen = picks[0];
  const discarded = picks.slice(1);
  player.hand.push(chosen);
  state.discard.push(...discarded);
  appendLog(state, `${player.name} draws cards and keeps ${chosen.name}`);
  state.actionDone = true;
  return true;
}
 
export function beginIncomeDrawChoice(state) {
  const player = activeRolePlayer(state);
  if (!player || state.actionDone || state.assassinatedRole === state.currentRoleId) return false;
 
  const c1 = drawCard(state);
  const c2 = drawCard(state);
  const picks = [c1, c2].filter(Boolean);
  if (!picks.length) return false;
 
  state.pendingDrawChoices = picks;
  appendLog(state, `${player.name} draws ${picks.length} cards and must choose one`);
  return true;
}
 
export function resolveIncomeDrawChoice(state, chosenUid) {
  const player = activeRolePlayer(state);
  if (!player || state.actionDone || !state.pendingDrawChoices || !state.pendingDrawChoices.length) return false;
 
  const idx = state.pendingDrawChoices.findIndex((c) => c.uid === chosenUid);
  if (idx === -1) return false;
 
  const [chosen] = state.pendingDrawChoices.splice(idx, 1);
  player.hand.push(chosen);
  state.discard.push(...state.pendingDrawChoices);
  state.pendingDrawChoices = null;
  state.actionDone = true;
  appendLog(state, `${player.name} keeps ${chosen.name} from draw`);
  return true;
}
 
export function useAssassinAbility(state, targetRoleId) {
  const player = activeRolePlayer(state);
  if (!player || player.roleId !== "assassin" || state.roleAbilityDone) return false;
  if (!targetRoleId || targetRoleId === "assassin") return false;
  state.assassinatedRole = targetRoleId;
  state.roleAbilityDone = true;
  appendLog(state, `${player.name} marked ${ROLE_NAME[targetRoleId]} for assassination`);
  return true;
}
 
export function useThiefAbility(state, targetRoleId) {
  const player = activeRolePlayer(state);
  if (!player || player.roleId !== "thief" || state.roleAbilityDone) return false;
  if (!targetRoleId || targetRoleId === "assassin" || targetRoleId === "thief") return false;
  state.robbedRole = targetRoleId;
  state.robOwnerId = player.id;
  state.roleAbilityDone = true;
  appendLog(state, `${player.name} plans to rob ${ROLE_NAME[targetRoleId]}`);
  return true;
}
 
export function useMagicianAbility(state, targetPlayerId) {
  const player = activeRolePlayer(state);
  if (!player || player.roleId !== "magician" || state.roleAbilityDone) return false;
  if (!targetPlayerId || targetPlayerId === player.id) return false;
  const target = state.players.find((p) => p.id === targetPlayerId);
  if (!target) return false;
 
  const mine = player.hand;
  player.hand = target.hand;
  target.hand = mine;
  state.roleAbilityDone = true;
  appendLog(state, `${player.name} swaps hands with ${target.name}`);
  return true;
}
 
export function useKingAbility(state) {
  const player = activeRolePlayer(state);
  if (!player || player.roleId !== "king" || state.roleAbilityDone) return false;
  for (const p of state.players) p.crown = false;
  player.crown = true;
  state.roleAbilityDone = true;
  appendLog(state, `${player.name} takes the crown`);
  return true;
}
 
export function useWarlordAbility(state, targetPlayerId, districtUid) {
  const player = activeRolePlayer(state);
  if (!player || player.roleId !== "warlord" || state.roleAbilityDone) return false;
  const target = state.players.find((p) => p.id === targetPlayerId);
  if (!target || target.id === player.id) return false;
  if (target.roleId === "bishop") return false;
 
  const idx = target.city.findIndex((d) => d.uid === districtUid);
  if (idx === -1) return false;
  const district = target.city[idx];
  const price = Math.max(1, district.cost - 1);
  if (player.gold < price) return false;
 
  player.gold -= price;
  target.city.splice(idx, 1);
  state.discard.push(district);
  state.roleAbilityDone = true;
  appendLog(state, `${player.name} destroys ${target.name}'s ${district.name} for ${price} gold`);
  return true;
}
 
export function canBuildCard(state, cardUid) {
  const player = activeRolePlayer(state);
  if (!player) return false;
  if (player.builtThisTurn >= state.buildLimit) return false;
 
  const card = player.hand.find((c) => c.uid === cardUid);
  if (!card) return false;
  if (card.cost > player.gold) return false;
  if (player.city.some((d) => d.id === card.id)) return false;
  return true;
}
 
export function buildDistrict(state, cardUid) {
  if (!canBuildCard(state, cardUid)) return false;
  const player = activeRolePlayer(state);
  const idx = player.hand.findIndex((c) => c.uid === cardUid);
  const card = player.hand[idx];
  player.hand.splice(idx, 1);
  player.gold -= card.cost;
  player.city.push(card);
  player.builtThisTurn += 1;
 
  appendLog(state, `${player.name} builds ${card.name}`);
  if (!state.firstToEight && player.city.length >= 8) {
    state.firstToEight = player.id;
    appendLog(state, `${player.name} completed 8 districts first`);
  }
  return true;
}
 
export function finishRoleTurn(state) {
  const player = activeRolePlayer(state);
  if (!player) return;
  appendLog(state, `${player.name} ends turn`);
  prepareNextRoleTurn(state);
}
 
export function revealForHuman(state, playerId) {
  const active = activeRolePlayer(state);
  if (!active || active.id !== playerId || active.isCpu) return false;
  state.revealRequired = false;
  state.revealedPlayerId = playerId;
  appendLog(state, `${active.name} takes control`);
  return true;
}
 
function endGame(state) {
  state.ended = true;
  const scores = state.players.map((p) => {
    const breakdown = computeScoreBreakdown(p, state.firstToEight);
    return {
      playerId: p.id,
      name: p.name,
      score: breakdown.total,
      breakdown,
      cityCount: p.city.length,
      gold: p.gold,
      handCount: p.hand.length,
    };
  });
  scores.sort(sortScoreEntries);
  state.winner = scores[0];
  appendLog(state, `Game over. Winner: ${scores[0].name} (${scores[0].score} points)`);
  state.scores = scores;
}
 
export function exportSnapshot(state) {
  const serial = {
    seed: state.seed,
    round: state.round,
    phase: state.phase,
    players: state.players,
    deck: state.deck,
    discard: state.discard,
    availableRoles: state.availableRoles,
    draftStartIndex: state.draftStartIndex,
    draftCurrentIndex: state.draftCurrentIndex,
    roleTurnIndex: state.roleTurnIndex,
    currentRoleId: state.currentRoleId,
    assassinatedRole: state.assassinatedRole,
    robbedRole: state.robbedRole,
    robOwnerId: state.robOwnerId,
    log: state.log,
    winner: state.winner,
    ended: state.ended,
    firstToEight: state.firstToEight,
    buildLimit: state.buildLimit,
    actionDone: state.actionDone,
    roleAbilityDone: state.roleAbilityDone,
    revealRequired: state.revealRequired,
    revealedPlayerId: state.revealedPlayerId,
    scores: state.scores || null,
    actionHistory: state.actionHistory || [],
    pendingDrawChoices: state.pendingDrawChoices || null,
  };
  return JSON.stringify(serial, null, 2);
}
 
export function importSnapshot(jsonText) {
  const raw = JSON.parse(jsonText);
  const state = {
    ...raw,
    random: mulberry32(typeof raw.seed === "number" ? raw.seed : Date.now()),
    actionHistory: raw.actionHistory || [],
    pendingDrawChoices: raw.pendingDrawChoices || null,
  };
  return state;
}
 
export function roleTurnStatusLabel(state) {
  if (state.phase === "draft") return "Role Draft";
  if (state.ended) return "Game Over";
  const role = state.currentRoleId ? ROLE_NAME[state.currentRoleId] : "Role";
  return `${role} turn`;
}