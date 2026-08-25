// Module: Macro Navigation Graph & Zone Boundary Registry for Kanto (Pokemon Gen 1)
// Maps inter-zone transitions (Route <-> City <-> Building) and determines sequence of boundaries.

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
    indoorMapId: 0x29, // 41 in dec (0x29 is Pokecenter, 0x2A is Mart)
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
  // Lavender Town Pokecenter (0x04)
  0x04: {
    name: 'Centre PKMN Lavanville',
    outdoorMapId: 0x04,
    indoorMapId: 0x64, // 100 in dec
    doorCoords: { x: 5, y: 5 },
    standCoords: { x: 5, y: 6 },
  },
  // Fuchsia City Pokecenter (0x07)
  0x07: {
    name: 'Centre PKMN Parmanie',
    outdoorMapId: 0x07,
    indoorMapId: 0x76, // 118 in dec
    doorCoords: { x: 19, y: 27 },
    standCoords: { x: 19, y: 28 },
  },
  // Saffron City Pokecenter (0x0A)
  0x0A: {
    name: 'Centre PKMN Safrania',
    outdoorMapId: 0x0A,
    indoorMapId: 0x87, // 135 in dec
    doorCoords: { x: 9, y: 29 },
    standCoords: { x: 9, y: 30 },
  },
  // Cinnabar Island Pokecenter (0x08)
  0x08: {
    name: 'Centre PKMN Cramois\'Île',
    outdoorMapId: 0x08,
    indoorMapId: 0x97, // 151 in dec
    doorCoords: { x: 11, y: 11 },
    standCoords: { x: 11, y: 12 },
  },
  // Route 4 Pokecenter (Mt. Moon) (0x0F)
  0x0F: {
    name: 'Centre PKMN Route 4 (Mont Sélénite)',
    outdoorMapId: 0x0F,
    indoorMapId: 0x54, // 84 in dec
    doorCoords: { x: 11, y: 5 },
    standCoords: { x: 11, y: 6 },
  },
  // Indigo Plateau Pokecenter (0x09)
  0x09: {
    name: 'Centre PKMN Plateau Indigo',
    outdoorMapId: 0x09,
    indoorMapId: 0xAC, // 172 in dec
    doorCoords: { x: 9, y: 5 },
    standCoords: { x: 9, y: 6 },
  },
};

// Global Inter-Zone Boundaries graph with verified coordinates
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
  // On Route 22, the East road into Viridian City is at Y = 8 or 9 (X: 39).
  // In Viridian City, the West road into Route 22 arrives at X = 0, Y = 16.
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
];

/**
 * Find closest Pokecenter based on current mapId
 */
export function getClosestPokecenterForMap(currentMapId: number): PokecenterData {
  if (POKECENTERS_REGISTRY[currentMapId]) {
    return POKECENTERS_REGISTRY[currentMapId];
  }

  // Pallet Town (0x00), Route 1 (0x0C), Route 22 (0x21) -> Viridian Center (0x01)
  if (currentMapId === 0x00 || currentMapId === 0x0C || currentMapId === 0x21) {
    return POKECENTERS_REGISTRY[0x01];
  }

  // Route 2 (0x0D), Route 3 (0x0E) -> Pewter Center (0x02) or Viridian
  if (currentMapId === 0x0D || currentMapId === 0x0E) {
    return POKECENTERS_REGISTRY[0x02];
  }

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
 * Macro Graph Search (BFS): Computes the sequence of Zone Boundaries to traverse to reach a Pokecenter.
 */
export function planMacroRoute(originMapId: number, targetOutdoorMapId?: number): MacroRoutePlan | null {
  const targetPokecenter = targetOutdoorMapId ? POKECENTERS_REGISTRY[targetOutdoorMapId] || getClosestPokecenterForMap(originMapId) : getClosestPokecenterForMap(originMapId);
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

