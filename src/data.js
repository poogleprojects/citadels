export const ROLE_DEFS = [
  { id: "assassin", rank: 1, color: "none" },
  { id: "thief", rank: 2, color: "none" },
  { id: "magician", rank: 3, color: "none" },
  { id: "king", rank: 4, color: "yellow" },
  { id: "bishop", rank: 5, color: "blue" },
  { id: "merchant", rank: 6, color: "green" },
  { id: "architect", rank: 7, color: "none" },
  { id: "warlord", rank: 8, color: "red" },
];
 
const DISTRICTS = [
  ["temple", "Temple", "blue", 1, 3],
  ["church", "Church", "blue", 2, 3],
  ["monastery", "Monastery", "blue", 3, 2],
  ["watchtower", "Watchtower", "red", 1, 3],
  ["prison", "Prison", "red", 2, 3],
  ["battlefield", "Battlefield", "red", 3, 2],
  ["market", "Market", "green", 2, 3],
  ["tradingPost", "Trading Post", "green", 2, 3],
  ["docks", "Docks", "green", 3, 2],
  ["manor", "Manor", "yellow", 3, 3],
  ["castle", "Castle", "yellow", 4, 3],
  ["palace", "Palace", "yellow", 5, 2],
  ["laboratory", "Laboratory", "purple", 5, 1],
  ["graveyard", "Graveyard", "purple", 5, 1],
  ["dragonGate", "Dragon Gate", "purple", 6, 1],
];
 
export function createDistrictDeck() {
  const deck = [];
  for (const [id, name, color, cost, copies] of DISTRICTS) {
    for (let i = 0; i < copies; i += 1) {
      deck.push({
        uid: `${id}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        id,
        name,
        color,
        cost,
        type: "district",
      });
    }
  }
  return deck;
}
 
export const ROLE_NAME = {
  assassin: "Assassin",
  thief: "Thief",
  magician: "Magician",
  king: "King",
  bishop: "Bishop",
  merchant: "Merchant",
  architect: "Architect",
  warlord: "Warlord",
};