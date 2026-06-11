import { ROLE_DEFS } from "./data.js";
 
function roleById(roleId) {
  return ROLE_DEFS.find((r) => r.id === roleId);
}
 
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
 
function recentRolePenalty(state, playerId, roleId) {
  const recentDrafts = state.actionHistory
    .filter((entry) => entry.type === "draft" && entry.playerId === playerId)
    .slice(0, 4);
 
  let penalty = 0;
  for (const [index, entry] of recentDrafts.entries()) {
    if (entry.roleId === roleId) {
      penalty += index === 0 ? 2.4 : 1.1;
    }
  }
  return penalty;
}
 
function weightedPick(options, random) {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  if (total <= 0) return options[0]?.roleId ?? null;
 
  let threshold = random() * total;
  for (const option of options) {
    threshold -= option.weight;
    if (threshold <= 0) return option.roleId;
  }
 
  return options[options.length - 1]?.roleId ?? null;
}
 
function roleDraftScore(state, player, roleId) {
  const role = roleById(roleId);
  const colorCounts = { blue: 0, green: 0, red: 0, yellow: 0, purple: 0 };
  for (const district of player.city) colorCounts[district.color] += 1;
 
  const legalBuilds = player.hand.filter((card) => card.cost <= player.gold).length;
  const expensiveHand = player.hand.filter((card) => card.cost >= 4).length;
  const opponents = state.players.filter((candidate) => candidate.id !== player.id);
  const richestOpponentGold = opponents.reduce((max, candidate) => Math.max(max, candidate.gold), 0);
  const vulnerableDistricts = opponents.reduce((sum, candidate) => {
    if (candidate.roleId === "bishop") return sum;
    return sum + candidate.city.filter((district) => district.cost <= Math.max(0, player.gold - 1)).length;
  }, 0);
  const cityLead = Math.max(0, ...opponents.map((candidate) => candidate.city.length)) - player.city.length;
  const lacksCrown = !player.crown;
 
  let score = 1;
  if (role.id === "architect") {
    score += 1.4 + player.hand.length * 0.55 + legalBuilds * 0.8 + clamp(cityLead, 0, 3) * 0.6;
    if (player.city.length >= 5) score += 1.2;
    if (player.gold <= 1 && legalBuilds === 0) score -= 0.9;
  }
  if (role.id === "merchant") {
    score += 1.1 + colorCounts.green * 0.9 + expensiveHand * 0.35;
    if (player.gold <= 2) score += 1.2;
  }
  if (role.id === "king") {
    score += 0.8 + colorCounts.yellow * 1.0;
    if (lacksCrown) score += 1.4;
    if (player.city.length >= 6) score += 0.7;
  }
  if (role.id === "bishop") {
    score += 0.7 + colorCounts.blue * 0.85 + Math.max(0, player.city.length - 4) * 0.45;
    if (vulnerableDistricts > 0 && player.city.length >= 5) score += 0.9;
  }
  if (role.id === "warlord") {
    score += 0.8 + colorCounts.red * 0.85 + vulnerableDistricts * 0.45;
    if (player.gold >= 4) score += 1.0;
    if (player.city.length < 3 && player.gold <= 2) score -= 0.4;
  }
  if (role.id === "magician") {
    score += 0.9;
    if (player.hand.length <= 1) score += 1.6;
    if (legalBuilds === 0) score += 1.0;
    if (opponents.some((candidate) => candidate.hand.length >= player.hand.length + 2)) score += 0.9;
  }
  if (role.id === "assassin") {
    score += 0.9 + clamp(cityLead, 0, 3) * 0.35;
    if (player.city.length >= 5) score += 0.5;
  }
  if (role.id === "thief") {
    score += 0.7;
    if (player.gold <= 2) score += 0.9;
    if (richestOpponentGold >= 4) score += 1.0;
  }
 
  score -= recentRolePenalty(state, player.id, roleId);
  score += (state.random ? state.random() : Math.random()) * 0.7;
  return score;
}
 
export function pickRoleForCpu(state, playerId, availableRoleIds) {
  const player = state.players.find((p) => p.id === playerId);
  const first = availableRoleIds[0];
  if (!first) return null;
 
  const scored = availableRoleIds
    .map((roleId) => ({ roleId, score: roleDraftScore(state, player, roleId) }))
    .sort((a, b) => b.score - a.score);
 
  const bestScore = scored[0].score;
  const contenders = scored
    .filter((entry) => bestScore - entry.score <= 1.6)
    .map((entry) => ({
      roleId: entry.roleId,
      weight: Math.max(0.15, entry.score - (bestScore - 1.8)),
    }));
 
  return weightedPick(contenders, state.random || Math.random);
}
 
export function decideIncomeAction(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  const affordable = player.hand.filter((c) => c.cost <= player.gold).length;
  if (player.gold <= 1 || affordable === 0) return "gold";
  if (player.hand.length <= 1) return "draw";
  return player.gold < 3 ? "gold" : "draw";
}
 
export function chooseBuildForCpu(state, playerId, buildLimit, builtThisTurn) {
  const player = state.players.find((p) => p.id === playerId);
  if (builtThisTurn >= buildLimit) return null;
 
  const cityIds = new Set(player.city.map((c) => c.id));
  const legal = player.hand.filter((c) => c.cost <= player.gold && !cityIds.has(c.id));
  if (!legal.length) return null;
 
  legal.sort((a, b) => {
    const priorityA = a.cost + (a.color === "purple" ? 0.7 : 0);
    const priorityB = b.cost + (b.color === "purple" ? 0.7 : 0);
    return priorityB - priorityA;
  });
  return legal[0].uid;
}
 
export function chooseAssassinationTarget(availableRoleIds) {
  const choices = availableRoleIds.filter((r) => r !== "assassin");
  if (!choices.length) return null;
  return choices[choices.length - 1];
}
 
export function chooseThiefTarget(availableRoleIds) {
  const choices = availableRoleIds.filter((r) => r !== "assassin" && r !== "thief");
  if (!choices.length) return null;
  return choices[Math.floor(choices.length / 2)];
}
 
export function chooseMagicianSwapTarget(state, playerId) {
  const me = state.players.find((p) => p.id === playerId);
  const others = state.players.filter((p) => p.id !== playerId);
  others.sort((a, b) => b.hand.length - a.hand.length);
  if (!others.length || others[0].hand.length <= me.hand.length) return null;
  return others[0].id;
}
 
export function chooseWarlordTarget(state, playerId) {
  const me = state.players.find((p) => p.id === playerId);
  const maxCost = Math.max(0, me.gold - 1);
  let best = null;
 
  for (const p of state.players) {
    if (p.id === playerId) continue;
    if (p.roleId === "bishop") continue;
    for (const d of p.city) {
      if (d.cost <= maxCost) {
        if (!best || d.cost > best.card.cost) {
          best = { playerId: p.id, districtUid: d.uid, card: d };
        }
      }
    }
  }
  return best;
}