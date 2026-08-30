// Module: Macro Navigation Graph & Zone Boundary Registry for Kanto (Pokemon Gen 1)
// Maps inter-zone transitions (Route <-> City <-> Building) and determines sequence of boundaries.
// Implements game-aware topology accounting for one-way ledges, cliffs, and impassable routes.

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface ZoneBoundary {
  fromMapId: number;
  toMapId: number;
  fromCoords: { x: number; y: number }; // Exact tile to reach before crossing
  crossingDir: Direction;               // Direction step to trigger map transition
  toCoordsExpected: { x: number; y: number }; // Arrival coordinates on destination map
  description: string;
}

export interface MacroRoutePlan {
  originMapId: number;
  targetPokecenterOutdoorMapId: number;
  targetPokecenterIndoorMapId: number;
  doorCoords: { x: number; y: number };
  boundaries: ZoneBoundary[];
}

export interface PokecenterData {
  name: string;
  outdoorMapId: number;
  indoorMapId: number;
  doorCoords: { x: number; y: number };  // Exact door tile
  standCoords: { x: number; y: number }; // Tile (x, y+1) where player stands facing North
}

// Complete Kanto Pokecenter Registry
export const POKECENTERS_REGISTRY: Record<number, PokecenterData> = {
  // Viridian City Pokecenter (0x01)
  0x01: {
    name: 'Centre PKMN Jadielle',
    outdoorMapId: 0x01,
    indoorMapId: 0x29, // 41 in dec
    doorCoords: { x: 23, y: 25 },
    standCoords: { x: 23, y: 26 },
  },
  // Pewter City Pokecenter (0x02)
  0x02: {
    name: 'Centre PKMN Argenta',
    outdoorMapId: 0x02,
    indoorMapId: 0x3A, // 58 in dec
    doorCoords: { x: 13, y: 25 },
    standCoords: { x: 13, y: 26 },
  },
  // Cerulean City Pokecenter (0x03)
  0x03: {
    name: 'Centre PKMN Azuria',
    outdoorMapId: 0x03,
    indoorMapId: 0x44, // 68 in dec
    doorCoords: { x: 19, y: 17 },
    standCoords: { x: 19, y: 18 },
  },
  // Lavender Town Pokecenter (0x04)
  0x04: {
    name: 'Centre PKMN Lavanville',
    outdoorMapId: 0x04,
    indoorMapId: 0x64, // 100 in dec
    doorCoords: { x: 5, y: 5 },
    standCoords: { x: 5, y: 6 },
  },
  // Vermilion City Pokecenter (0x05)
  0x05: {
    name: 'Centre PKMN Carmin sur Mer',
    outdoorMapId: 0x05,
    indoorMapId: 0x5E, // 94 in dec
    doorCoords: { x: 11, y: 3 },
    standCoords: { x: 11, y: 4 },
  },
  // Celadon City Pokecenter (0x06)
  0x06: {
    name: 'Centre PKMN Céladopole',
    outdoorMapId: 0x06,
    indoorMapId: 0x68, // 104 in dec
    doorCoords: { x: 41, y: 9 },
    standCoords: { x: 41, y: 10 },
  },
  // Fuchsia City Pokecenter (0x07)
  0x07: {
    name: 'Centre PKMN Parmanie',
    outdoorMapId: 0x07,
    indoorMapId: 0x76, // 118 in dec
    doorCoords: { x: 19, y: 27 },
    standCoords: { x: 19, y: 28 },
  },
  // Cinnabar Island Pokecenter (0x08)
  0x08: {
    name: 'Centre PKMN Cramois\'Île',
    outdoorMapId: 0x08,
    indoorMapId: 0x97, // 151 in dec
    doorCoords: { x: 11, y: 11 },
    standCoords: { x: 11, y: 12 },
  },
  // Indigo Plateau Pokecenter (0x09)
  0x09: {
    name: 'Centre PKMN Plateau Indigo',
    outdoorMapId: 0x09,
    indoorMapId: 0xAC, // 172 in dec
    doorCoords: { x: 9, y: 5 },
    standCoords: { x: 9, y: 6 },
  },
  // Saffron City Pokecenter (0x0A)
  0x0A: {
    name: 'Centre PKMN Safrania',
    outdoorMapId: 0x0A,
    indoorMapId: 0x87, // 135 in dec
    doorCoords: { x: 9, y: 29 },
    standCoords: { x: 9, y: 30 },
  },
  // Route 4 Pokecenter (Mt. Moon - West side only) (0x0F)
  0x0F: {
    name: 'Centre PKMN Route 4 (Mont Sélénite)',
    outdoorMapId: 0x0F,
    indoorMapId: 0x54, // 84 in dec
    doorCoords: { x: 11, y: 5 },
    standCoords: { x: 11, y: 6 },
  },
  // Route 10 Pokecenter (Rock Tunnel) (0x18 / 0x15)
  0x18: {
    name: 'Centre PKMN Route 10 (Grotte)',
    outdoorMapId: 0x18,
    indoorMapId: 0x58, // 88 in dec
    doorCoords: { x: 11, y: 19 },
    standCoords: { x: 11, y: 20 },
  },
};

// Global Inter-Zone Boundaries graph with verified coordinates and one-way topology
export const ZONE_BOUNDARIES: ZoneBoundary[] = [
  // 1. Route 1 (0x0C) <-> Viridian City (0x01)
  {
    fromMapId: 0x0C,
    toMapId: 0x01,
    fromCoords: { x: 10, y: 0 },
    crossingDir: 'up',
    toCoordsExpected: { x: 21, y: 35 },
    description: 'Route 1 vers Jadielle (Frontière Nord)',
  },
  {
    fromMapId: 0x01,
    toMapId: 0x0C,
    fromCoords: { x: 21, y: 35 },
    crossingDir: 'down',
    toCoordsExpected: { x: 10, y: 0 },
    description: 'Jadielle vers Route 1 (Frontière Sud)',
  },

  // 2. Route 22 (0x21) <-> Viridian City (0x01)
  {
    fromMapId: 0x21,
    toMapId: 0x01,
    fromCoords: { x: 39, y: 8 },
    crossingDir: 'right',
    toCoordsExpected: { x: 0, y: 16 },
    description: 'Route 22 vers Jadielle (Frontière Est)',
  },
  {
    fromMapId: 0x01,
    toMapId: 0x21,
    fromCoords: { x: 0, y: 16 },
    crossingDir: 'left',
    toCoordsExpected: { x: 39, y: 8 },
    description: 'Jadielle vers Route 22 (Frontière Ouest)',
  },

  // 3. Pallet Town (0x00) <-> Route 1 (0x0C)
  {
    fromMapId: 0x00,
    toMapId: 0x0C,
    fromCoords: { x: 10, y: 0 },
    crossingDir: 'up',
    toCoordsExpected: { x: 10, y: 35 },
    description: 'Bourg Palette vers Route 1 (Frontière Nord)',
  },
  {
    fromMapId: 0x0C,
    toMapId: 0x00,
    fromCoords: { x: 10, y: 35 },
    crossingDir: 'down',
    toCoordsExpected: { x: 10, y: 0 },
    description: 'Route 1 vers Bourg Palette (Frontière Sud)',
  },

  // 4. Viridian City (0x01) <-> Route 2 South (0x0D)
  {
    fromMapId: 0x01,
    toMapId: 0x0D,
    fromCoords: { x: 21, y: 0 },
    crossingDir: 'up',
    toCoordsExpected: { x: 10, y: 71 },
    description: 'Jadielle vers Route 2 Sud (Frontière Nord)',
  },
  {
    fromMapId: 0x0D,
    toMapId: 0x01,
    fromCoords: { x: 10, y: 71 },
    crossingDir: 'down',
    toCoordsExpected: { x: 21, y: 0 },
    description: 'Route 2 Sud vers Jadielle (Frontière Sud)',
  },

  // 5. Route 2 North (0x0D) <-> Pewter City (0x02)
  {
    fromMapId: 0x0D,
    toMapId: 0x02,
    fromCoords: { x: 10, y: 0 },
    crossingDir: 'up',
    toCoordsExpected: { x: 17, y: 35 },
    description: 'Route 2 Nord vers Argenta (Frontière Nord)',
  },
  {
    fromMapId: 0x02,
    toMapId: 0x0D,
    fromCoords: { x: 17, y: 35 },
    crossingDir: 'down',
    toCoordsExpected: { x: 10, y: 0 },
    description: 'Argenta vers Route 2 (Frontière Sud)',
  },

  // 6. Pewter City (0x02) <-> Route 3 (0x0E)
  {
    fromMapId: 0x02,
    toMapId: 0x0E,
    fromCoords: { x: 39, y: 17 },
    crossingDir: 'right',
    toCoordsExpected: { x: 0, y: 17 },
    description: 'Argenta vers Route 3 (Frontière Est)',
  },
  {
    fromMapId: 0x0E,
    toMapId: 0x02,
    fromCoords: { x: 0, y: 17 },
    crossingDir: 'left',
    toCoordsExpected: { x: 39, y: 17 },
    description: 'Route 3 vers Argenta (Frontière Ouest)',
  },

  // 7. Route 3 (0x0E) <-> Route 4 West (0x0F) [Mt Moon West Side]
  {
    fromMapId: 0x0E,
    toMapId: 0x0F,
    fromCoords: { x: 59, y: 17 },
    crossingDir: 'right',
    toCoordsExpected: { x: 0, y: 5 },
    description: 'Route 3 vers Route 4 Ouest (Mont Sélénite)',
  },
  {
    fromMapId: 0x0F,
    toMapId: 0x0E,
    fromCoords: { x: 0, y: 5 },
    crossingDir: 'left',
    toCoordsExpected: { x: 59, y: 17 },
    description: 'Route 4 Ouest vers Route 3 (Frontière Ouest)',
  },

  // 8. Route 4 East (0x0F) <-> Cerulean City (0x03) [Azuria]
  // On Route 4 East, after exiting Mt Moon, walking East leads directly into Cerulean City at X: 0, Y: 17.
  {
    fromMapId: 0x0F,
    toMapId: 0x03,
    fromCoords: { x: 89, y: 8 },
    crossingDir: 'right',
    toCoordsExpected: { x: 0, y: 17 },
    description: 'Route 4 Est vers Azuria (Frontière Est)',
  },
  {
    fromMapId: 0x03,
    toMapId: 0x0F,
    fromCoords: { x: 0, y: 17 },
    crossingDir: 'left',
    toCoordsExpected: { x: 89, y: 8 },
    description: 'Azuria vers Route 4 Est (Frontière Ouest)',
  },

  // 9. Cerulean City (0x03) <-> Route 24 (0x24) [Pont Pépite]
  {
    fromMapId: 0x03,
    toMapId: 0x24,
    fromCoords: { x: 21, y: 0 },
    crossingDir: 'up',
    toCoordsExpected: { x: 10, y: 35 },
    description: 'Azuria vers Route 24 (Pont Pépite - Nord)',
  },
  {
    fromMapId: 0x24,
    toMapId: 0x03,
    fromCoords: { x: 10, y: 35 },
    crossingDir: 'down',
    toCoordsExpected: { x: 21, y: 0 },
    description: 'Route 24 vers Azuria (Frontière Sud)',
  },

  // 10. Route 24 (0x24) <-> Route 25 (0x25) [Maison de Léo]
  {
    fromMapId: 0x24,
    toMapId: 0x25,
    fromCoords: { x: 19, y: 7 },
    crossingDir: 'right',
    toCoordsExpected: { x: 0, y: 7 },
    description: 'Route 24 vers Route 25 (Frontière Est)',
  },
  {
    fromMapId: 0x25,
    toMapId: 0x24,
    fromCoords: { x: 0, y: 7 },
    crossingDir: 'left',
    toCoordsExpected: { x: 19, y: 7 },
    description: 'Route 25 vers Route 24 (Frontière Ouest)',
  },

  // 11. Cerulean City (0x03) <-> Route 5 (0x10)
  {
    fromMapId: 0x03,
    toMapId: 0x10,
    fromCoords: { x: 21, y: 35 },
    crossingDir: 'down',
    toCoordsExpected: { x: 10, y: 0 },
    description: 'Azuria vers Route 5 (Frontière Sud)',
  },
  {
    fromMapId: 0x10,
    toMapId: 0x03,
    fromCoords: { x: 10, y: 0 },
    crossingDir: 'up',
    toCoordsExpected: { x: 21, y: 35 },
    description: 'Route 5 vers Azuria (Frontière Nord)',
  },

  // 12. Cerulean City (0x03) <-> Route 9 (0x14)
  {
    fromMapId: 0x03,
    toMapId: 0x14,
    fromCoords: { x: 39, y: 17 },
    crossingDir: 'right',
    toCoordsExpected: { x: 0, y: 8 },
    description: 'Azuria vers Route 9 (Frontière Est)',
  },
  {
    fromMapId: 0x14,
    toMapId: 0x03,
    fromCoords: { x: 0, y: 8 },
    crossingDir: 'left',
    toCoordsExpected: { x: 39, y: 17 },
    description: 'Route 9 vers Azuria (Frontière Ouest)',
  },

  // 13. Route 9 (0x14) <-> Route 10 (0x15 / 0x18) [Grotte / Rock Tunnel]
  {
    fromMapId: 0x14,
    toMapId: 0x18,
    fromCoords: { x: 59, y: 8 },
    crossingDir: 'right',
    toCoordsExpected: { x: 0, y: 8 },
    description: 'Route 9 vers Route 10 (Grotte)',
  },
  {
    fromMapId: 0x18,
    toMapId: 0x14,
    fromCoords: { x: 0, y: 8 },
    crossingDir: 'left',
    toCoordsExpected: { x: 59, y: 8 },
    description: 'Route 10 vers Route 9 (Frontière Ouest)',
  },

  // 14. Route 6 (0x11) <-> Vermilion City (0x05) [Carmin sur Mer]
  {
    fromMapId: 0x11,
    toMapId: 0x05,
    fromCoords: { x: 10, y: 35 },
    crossingDir: 'down',
    toCoordsExpected: { x: 15, y: 0 },
    description: 'Route 6 vers Carmin sur Mer (Frontière Sud)',
  },
  {
    fromMapId: 0x05,
    toMapId: 0x11,
    fromCoords: { x: 15, y: 0 },
    crossingDir: 'up',
    toCoordsExpected: { x: 10, y: 35 },
    description: 'Carmin sur Mer vers Route 6 (Frontière Nord)',
  },

  // 15. Vermilion City (0x05) <-> Route 11 (0x16)
  {
    fromMapId: 0x05,
    toMapId: 0x16,
    fromCoords: { x: 39, y: 17 },
    crossingDir: 'right',
    toCoordsExpected: { x: 0, y: 8 },
    description: 'Carmin sur Mer vers Route 11 (Frontière Est)',
  },
  {
    fromMapId: 0x16,
    toMapId: 0x05,
    fromCoords: { x: 0, y: 8 },
    crossingDir: 'left',
    toCoordsExpected: { x: 39, y: 17 },
    description: 'Route 11 vers Carmin sur Mer (Frontière Ouest)',
  },
];

/**
 * Find closest accessible Pokecenter based on current mapId and player coordinates.
 * Strictly respects game design barriers such as one-way ledges, mountain divisions, etc.
 */
export function getClosestPokecenterForMap(
  currentMapId: number,
  playerX?: number,
  playerY?: number
): PokecenterData {
  // If directly inside a city with its own Pokecenter
  if (POKECENTERS_REGISTRY[currentMapId] && currentMapId !== 0x0F) {
    return POKECENTERS_REGISTRY[currentMapId];
  }

  // =========================================================================
  // ROUTE 4 (0x0F) - SPECIFIC TOPOLOGICAL DIVISION (Mt Moon vs Cerulean)
  // Route 4 is divided into two disconnected walkable zones:
  // - West side (X < 24): Outside Mt Moon entrance -> Can reach Route 4 Pokécenter (X: 11, Y: 5)
  // - East side (X >= 24, e.g. training grass X: 70..85): After Mt Moon exit -> One-way ledges
  //   prevent going back West! The only reachable Pokécenter is Cerulean City (Azuria, 0x03).
  // =========================================================================
  if (currentMapId === 0x0F) {
    if (playerX !== undefined && playerX < 24) {
      return POKECENTERS_REGISTRY[0x0F]; // Route 4 Mt Moon Pokecenter
    }
    // Default or X >= 24 (East side / wild grass) -> Cerulean City Pokecenter
    return POKECENTERS_REGISTRY[0x03];
  }

  // Pallet Town (0x00), Route 1 (0x0C), Route 22 (0x21) -> Viridian Center (0x01)
  if (currentMapId === 0x00 || currentMapId === 0x0C || currentMapId === 0x21) {
    return POKECENTERS_REGISTRY[0x01];
  }

  // Route 2 (0x0D) -> Divided by Viridian Forest (South: Viridian 0x01, North: Pewter 0x02)
  if (currentMapId === 0x0D) {
    if (playerY !== undefined && playerY > 36) {
      return POKECENTERS_REGISTRY[0x01]; // Viridian City
    }
    return POKECENTERS_REGISTRY[0x02]; // Pewter City
  }

  // Route 3 (0x0E) -> Pewter Center (0x02) or Mt Moon (0x0F)
  if (currentMapId === 0x0E) {
    if (playerX !== undefined && playerX > 45) {
      return POKECENTERS_REGISTRY[0x0F];
    }
    return POKECENTERS_REGISTRY[0x02];
  }

  // Cerulean City & Northern Routes (Route 24 Pont Pépite 0x24, Route 25 Léo 0x25, Route 5 0x10)
  if (currentMapId === 0x24 || currentMapId === 0x25 || currentMapId === 0x10) {
    return POKECENTERS_REGISTRY[0x03];
  }

  // Vermilion City & Routes (Route 6 0x11, Route 11 0x16)
  if (currentMapId === 0x11 || currentMapId === 0x16) {
    return POKECENTERS_REGISTRY[0x05];
  }

  // Route 9 (0x14) -> Cerulean (West) vs Route 10 Rock Tunnel (East)
  if (currentMapId === 0x14) {
    if (playerX !== undefined && playerX > 30) {
      return POKECENTERS_REGISTRY[0x18] || POKECENTERS_REGISTRY[0x04];
    }
    return POKECENTERS_REGISTRY[0x03];
  }

  // Route 10 (0x15 / 0x18) -> Rock Tunnel Pokecenter or Lavender
  if (currentMapId === 0x15 || currentMapId === 0x18) {
    return POKECENTERS_REGISTRY[0x18] || POKECENTERS_REGISTRY[0x04];
  }

  // Route 8 (0x13), Route 12 (0x17) -> Lavender Town (0x04)
  if (currentMapId === 0x13 || currentMapId === 0x17) {
    return POKECENTERS_REGISTRY[0x04];
  }

  // Route 7 (0x12), Route 16 (0x1C) -> Celadon City (0x06)
  if (currentMapId === 0x12 || currentMapId === 0x1C) {
    return POKECENTERS_REGISTRY[0x06];
  }

  // Route 14, 15, 17, 18 -> Fuchsia City (0x07)
  if (currentMapId === 0x1A || currentMapId === 0x1B || currentMapId === 0x1D || currentMapId === 0x1E) {
    return POKECENTERS_REGISTRY[0x07];
  }

  // Fallback safe default
  return POKECENTERS_REGISTRY[0x01];
}

/**
 * Generic Macro Graph Search (BFS): Computes the sequence of Zone Boundaries to traverse between any two maps.
 */
export function planMacroRouteBetween(fromMapId: number, toMapId: number): ZoneBoundary[] {
  if (fromMapId === toMapId) {
    return [];
  }

  interface QueueItem {
    mapId: number;
    path: ZoneBoundary[];
  }

  const queue: QueueItem[] = [{ mapId: fromMapId, path: [] }];
  const visited: Set<number> = new Set([fromMapId]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.mapId === toMapId) {
      return current.path;
    }

    const outgoing = ZONE_BOUNDARIES.filter((b) => b.fromMapId === current.mapId);
    for (const b of outgoing) {
      if (!visited.has(b.toMapId)) {
        visited.add(b.toMapId);
        queue.push({
          mapId: b.toMapId,
          path: [...current.path, b],
        });
      }
    }
  }

  return [];
}

/**
 * Macro Graph Search (BFS): Computes the sequence of Zone Boundaries to traverse to reach a Pokecenter,
 * taking player coordinates into account for split maps like Route 4.
 */
export function planMacroRoute(
  originMapId: number,
  playerX?: number,
  playerY?: number,
  targetOutdoorMapId?: number
): MacroRoutePlan | null {
  const targetPokecenter = targetOutdoorMapId
    ? POKECENTERS_REGISTRY[targetOutdoorMapId] || getClosestPokecenterForMap(originMapId, playerX, playerY)
    : getClosestPokecenterForMap(originMapId, playerX, playerY);

  const targetMap = targetPokecenter.outdoorMapId;
  const boundaries = planMacroRouteBetween(originMapId, targetMap);

  return {
    originMapId,
    targetPokecenterOutdoorMapId: targetMap,
    targetPokecenterIndoorMapId: targetPokecenter.indoorMapId,
    doorCoords: targetPokecenter.doorCoords,
    boundaries,
  };
}

