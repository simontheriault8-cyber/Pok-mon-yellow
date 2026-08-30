// Module 1: World Navigation & Pokécenter Topological Graph for Pokémon Yellow (Gen 1)
import { POKEMON_YELLOW_RAM, resolveAddr } from './pokemonYellowRam';

export interface WarpInfo {
  index: number;
  y: number;
  x: number;
  targetWarpId: number;
  targetMapId: number;
}

export interface PokecenterLocation {
  id: string;
  name: string;
  outdoorMapId: number;
  doorCoords: { x: number; y: number };
  indoorMapId: number;
  nurseCoords: { x: number; y: number }; // Nurse counter position (interact facing UP)
}

export interface NavigationRoute {
  targetPokecenter: PokecenterLocation;
  isAlreadyInside: boolean;
  mapRoute: number[];
  directDistance: number;
  nextStepDescription: string;
}

// Complete Gen 1 / Pokémon Yellow Map Name Directory
export const POKEMON_YELLOW_MAPS: Record<number, string> = {
  0x00: 'Pallet Town',
  0x01: 'Viridian City',
  0x02: 'Pewter City',
  0x03: 'Cerulean City',
  0x04: 'Lavender Town',
  0x05: 'Vermilion City',
  0x06: 'Celadon City',
  0x07: 'Fuchsia City',
  0x08: 'Cinnabar Island',
  0x09: 'Indigo Plateau',
  0x0A: 'Saffron City',
  0x0C: 'Route 1',
  0x0D: 'Route 2',
  0x0E: 'Route 3',
  0x0F: 'Route 4 (Mt. Moon Entrance)',
  0x10: 'Route 5',
  0x11: 'Route 6',
  0x12: 'Route 7',
  0x13: 'Route 8',
  0x14: 'Route 9',
  0x15: 'Route 10 (North)',
  0x16: 'Route 11',
  0x17: 'Route 12',
  0x18: 'Route 10 (South / Rock Tunnel)',
  0x19: 'Route 13',
  0x1A: 'Route 14',
  0x1B: 'Route 15',
  0x1C: 'Route 16',
  0x1D: 'Route 17 (Cycling Road)',
  0x1E: 'Route 18',
  0x1F: 'Route 19 (Water Path)',
  0x20: 'Route 20 (Seafoam Islands)',
  0x21: 'Route 22 (Pokémon League Gate)',
  0x22: 'Route 21 (Water Path)',
  0x23: 'Route 23 (Victory Road Gate)',
  0x24: 'Route 24 (Nugget Bridge)',
  0x25: 'Route 25 (Bill\'s Cottage)',
  0x29: 'Viridian Pokémon Center',
  0x2A: 'Viridian Poké Mart',
  0x2B: 'Viridian Pokémon School',
  0x2C: 'Viridian City House',
  0x33: 'Viridian Forest',
  0x3A: 'Pewter Pokémon Center',
  0x3B: 'Mt. Moon 1F',
  0x44: 'Cerulean Pokémon Center',
  0x54: 'Route 4 Pokémon Center',
  0x58: 'Route 10 Pokémon Center',
  0x5E: 'Vermilion Pokémon Center',
  0x64: 'Lavender Pokémon Center',
  0x68: 'Celadon Pokémon Center',
  0x76: 'Fuchsia Pokémon Center',
  0x87: 'Saffron Pokémon Center',
  0x97: 'Cinnabar Pokémon Center',
  0xAC: 'Indigo Plateau Pokémon Center',
};

// Registered Pokémon Centers across Kanto with exact door warps & nurse positions
export const POKECENTERS: PokecenterLocation[] = [
  {
    id: 'viridian',
    name: 'Centre PKMN Jadielle',
    outdoorMapId: 0x01,
    doorCoords: { x: 23, y: 25 },
    indoorMapId: 0x29,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'pewter',
    name: 'Centre PKMN Argenta',
    outdoorMapId: 0x02,
    doorCoords: { x: 13, y: 25 },
    indoorMapId: 0x3A,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'route4',
    name: 'Centre PKMN Route 4 (Mont Sélénite)',
    outdoorMapId: 0x0F,
    doorCoords: { x: 11, y: 5 },
    indoorMapId: 0x54,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'cerulean',
    name: 'Centre PKMN Azuria',
    outdoorMapId: 0x03,
    doorCoords: { x: 19, y: 17 },
    indoorMapId: 0x44,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'vermilion',
    name: 'Centre PKMN Carmin sur Mer',
    outdoorMapId: 0x05,
    doorCoords: { x: 11, y: 3 },
    indoorMapId: 0x5E,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'route10',
    name: 'Centre PKMN Route 10 (Grotte)',
    outdoorMapId: 0x18,
    doorCoords: { x: 11, y: 19 },
    indoorMapId: 0x58,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'lavender',
    name: 'Centre PKMN Lavanville',
    outdoorMapId: 0x04,
    doorCoords: { x: 5, y: 5 },
    indoorMapId: 0x64,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'celadon',
    name: 'Centre PKMN Céladopole',
    outdoorMapId: 0x06,
    doorCoords: { x: 41, y: 9 },
    indoorMapId: 0x68,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'fuchsia',
    name: 'Centre PKMN Parmanie',
    outdoorMapId: 0x07,
    doorCoords: { x: 19, y: 27 },
    indoorMapId: 0x76,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'saffron',
    name: 'Centre PKMN Safrania',
    outdoorMapId: 0x0A,
    doorCoords: { x: 9, y: 29 },
    indoorMapId: 0x87,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'cinnabar',
    name: 'Centre PKMN Cramois\'Île',
    outdoorMapId: 0x08,
    doorCoords: { x: 11, y: 11 },
    indoorMapId: 0x97,
    nurseCoords: { x: 3, y: 2 },
  },
  {
    id: 'indigo',
    name: 'Centre PKMN Plateau Indigo',
    outdoorMapId: 0x09,
    doorCoords: { x: 9, y: 5 },
    indoorMapId: 0xAC,
    nurseCoords: { x: 3, y: 2 },
  },
];

// World Topological Map Graph (Adjacent map connections for routing)
// Models one-way barriers (e.g. Route 4 East -> Cerulean City, Route 24 -> Cerulean, etc.)
const MAP_ADJACENCY: Record<number, number[]> = {
  0x00: [0x0C, 0x22], // Bourg Palette -> Route 1, Route 21
  0x0C: [0x00, 0x01], // Route 1 -> Bourg Palette, Jadielle
  0x01: [0x0C, 0x0D, 0x21, 0x29], // Jadielle -> Route 1, Route 2, Route 22, Pokécenter
  0x29: [0x01], // Pokécenter Jadielle -> Jadielle
  0x0D: [0x01, 0x02, 0x33], // Route 2 -> Jadielle, Argenta, Forêt de Jade
  0x33: [0x0D], // Forêt de Jade -> Route 2
  0x02: [0x0D, 0x0E, 0x3A], // Argenta -> Route 2, Route 3, Pokécenter
  0x3A: [0x02], // Pokécenter Argenta -> Argenta
  0x0E: [0x02, 0x0F, 0x3B], // Route 3 -> Argenta, Route 4 Ouest, Mt Sélénite
  0x0F: [0x03, 0x0E, 0x54], // Route 4 -> Azuria (East), Route 3 (West), Pokécenter Mt Moon
  0x54: [0x0F], // Pokécenter Mt Moon -> Route 4
  0x03: [0x0F, 0x10, 0x14, 0x24, 0x44], // Azuria -> Route 4, Route 5, Route 9, Route 24, Pokécenter
  0x44: [0x03], // Pokécenter Azuria -> Azuria
  0x24: [0x03, 0x25], // Route 24 -> Azuria, Route 25
  0x25: [0x24], // Route 25 -> Route 24
  0x10: [0x03, 0x0A], // Route 5 -> Azuria, Safrania
  0x0A: [0x10, 0x11, 0x12, 0x13, 0x87], // Safrania
  0x87: [0x0A], // Pokécenter Safrania -> Safrania
  0x11: [0x0A, 0x05], // Route 6 -> Safrania, Carmin
  0x05: [0x11, 0x16, 0x5E], // Carmin -> Route 6, Route 11, Pokécenter
  0x5E: [0x05], // Pokécenter Carmin -> Carmin
  0x12: [0x0A, 0x06], // Route 7 -> Safrania, Céladopole
  0x06: [0x12, 0x1C, 0x68], // Céladopole
  0x68: [0x06], // Pokécenter Céladopole -> Céladopole
  0x13: [0x0A, 0x04], // Route 8 -> Safrania, Lavanville
  0x04: [0x13, 0x17, 0x18, 0x64], // Lavanville -> Route 8, Route 12, Route 10, Pokécenter
  0x64: [0x04], // Pokécenter Lavanville -> Lavanville
  0x14: [0x03, 0x15], // Route 9 -> Azuria, Route 10 Nord
  0x15: [0x14, 0x18], // Route 10 Nord -> Route 9, Route 10 Sud
  0x18: [0x15, 0x04, 0x58], // Route 10 Sud -> Lavanville, Pokécenter Grotte
  0x58: [0x18], // Pokécenter Route 10 -> Route 10
  0x17: [0x04, 0x19], // Route 12 -> Lavanville, Route 13
  0x19: [0x17, 0x1A], // Route 13 -> Route 12, Route 14
  0x1A: [0x19, 0x1B], // Route 14 -> Route 13, Route 15
  0x1B: [0x1A, 0x07], // Route 15 -> Route 14, Parmanie
  0x07: [0x1B, 0x1E, 0x1F, 0x76], // Parmanie -> Route 15, Route 18, Route 19, Pokécenter
  0x76: [0x07], // Pokécenter Parmanie -> Parmanie
  0x1C: [0x06, 0x1D], // Route 16 -> Céladopole, Route 17
  0x1D: [0x1C, 0x1E], // Route 17 -> Route 16, Route 18
  0x1E: [0x1D, 0x07], // Route 18 -> Route 17, Parmanie
  0x1F: [0x07, 0x20], // Route 19 -> Parmanie, Route 20
  0x20: [0x1F, 0x08], // Route 20 -> Route 19, Cramois'Île
  0x08: [0x20, 0x22, 0x97], // Cramois'Île -> Route 20, Route 21, Pokécenter
  0x97: [0x08], // Pokécenter Cramois'Île -> Cramois'Île
  0x22: [0x08, 0x00], // Route 21 -> Cramois'Île, Bourg Palette
  0x21: [0x01, 0x23], // Route 22 -> Jadielle, Route 23
  0x23: [0x21, 0x09], // Route 23 -> Route 22, Plateau Indigo
  0x09: [0x23, 0xAC], // Plateau Indigo -> Route 23, Pokécenter
  0xAC: [0x09], // Pokécenter Plateau Indigo -> Plateau Indigo
};

// BFS Pathfinding on Map Topology Graph
export function findShortestMapPath(startMapId: number, goalMapId: number, playerX?: number): number[] | null {
  if (startMapId === goalMapId) return [startMapId];

  // Specific one-way override: If starting on Route 4 East (X >= 24), you CANNOT walk to Route 3 (0x0E) or Mt Moon (0x3B)
  const isRoute4East = startMapId === 0x0F && (playerX === undefined || playerX >= 24);

  const queue: { mapId: number; path: number[] }[] = [{ mapId: startMapId, path: [startMapId] }];
  const visited = new Set<number>([startMapId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    let neighbors = MAP_ADJACENCY[current.mapId] || [];

    // Filter out forbidden edges on split maps
    if (current.mapId === 0x0F && isRoute4East) {
      // From Route 4 East, you can ONLY head East to Cerulean (0x03), NOT to Route 3 (0x0E) or Mt Moon (0x54)
      neighbors = neighbors.filter(n => n === 0x03);
    }

    for (const neighbor of neighbors) {
      if (neighbor === goalMapId) {
        return [...current.path, neighbor];
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ mapId: neighbor, path: [...current.path, neighbor] });
      }
    }
  }
  return null;
}

// Module 1 Core: Find closest Pokécenter relative to current player position
export function findClosestPokecenter(currentMapId: number, playerX: number, playerY: number): NavigationRoute | null {
  // Check if player is already inside a Pokémon Center
  const insideCenter = POKECENTERS.find(c => c.indoorMapId === currentMapId);
  if (insideCenter) {
    const distToNurse = Math.abs(playerX - insideCenter.nurseCoords.x) + Math.abs(playerY - insideCenter.nurseCoords.y);
    return {
      targetPokecenter: insideCenter,
      isAlreadyInside: true,
      mapRoute: [currentMapId],
      directDistance: distToNurse,
      nextStepDescription: `Déjà dans le ${insideCenter.name} -> Approcher de l'infirmière (${distToNurse} pas)`,
    };
  }

  // Handle Route 4 East split (X >= 24): The Mt Moon Pokecenter is impassable due to one-way ledges!
  const isRoute4East = currentMapId === 0x0F && playerX >= 24;

  let bestCenter: PokecenterLocation | null = null;
  let bestPath: number[] = [];
  let bestScore = Infinity;

  for (const center of POKECENTERS) {
    // If on Route 4 East, ignore Route 4 Mt Moon Pokecenter (0x0F) because it is physically unreachable by walking
    if (isRoute4East && center.outdoorMapId === 0x0F) {
      continue;
    }

    const path = findShortestMapPath(currentMapId, center.outdoorMapId, playerX);
    if (!path) continue;

    // Path length in maps (weighted 100 tiles per map transition) + Manhattan distance to door
    const mapHops = path.length - 1;
    const doorDistance = (currentMapId === center.outdoorMapId && !isRoute4East)
      ? (Math.abs(playerX - center.doorCoords.x) + Math.abs(playerY - center.doorCoords.y))
      : (mapHops * 100 + Math.abs(playerX - center.doorCoords.x) + Math.abs(playerY - center.doorCoords.y));

    const totalScore = mapHops * 100 + doorDistance;

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestCenter = center;
      bestPath = path;
    }
  }

  if (!bestCenter) return null;

  const isSameMap = currentMapId === bestCenter.outdoorMapId && !isRoute4East;
  const distToDoor = Math.abs(playerX - bestCenter.doorCoords.x) + Math.abs(playerY - bestCenter.doorCoords.y);

  let nextStepDescription = '';
  if (isSameMap) {
    nextStepDescription = `Porte du ${bestCenter.name} en (${bestCenter.doorCoords.x}, ${bestCenter.doorCoords.y}) - Dist: ${distToDoor} pas`;
  } else {
    const nextMapId = bestPath[1] || bestCenter.outdoorMapId;
    const nextMapName = POKEMON_YELLOW_MAPS[nextMapId] || `Map 0x${nextMapId.toString(16).toUpperCase()}`;
    nextStepDescription = `Rejoindre ${nextMapName} en direction du ${bestCenter.name} (${bestPath.length - 1} zone(s) restante(s))`;
  }

  return {
    targetPokecenter: bestCenter,
    isAlreadyInside: false,
    mapRoute: bestPath,
    directDistance: isSameMap ? distToDoor : bestScore,
    nextStepDescription,
  };
}

// Memory Inspection: Read Real-Time Navigation State from Game Boy RAM
export function readNavigationState(mmu: any) {
  if (!mmu) return null;

  const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);
  const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
  const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
  const dirAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_DIR_EN, mmu);
  const tilesetAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_TILESET_EN, mmu);
  const standingTileAddr = resolveAddr(POKEMON_YELLOW_RAM.TILE_PLAYER_STANDING_EN, mmu);
  const mapHeightAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_HEIGHT_EN, mmu);
  const mapWidthAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_WIDTH_EN, mmu);
  const warpCountAddr = resolveAddr(POKEMON_YELLOW_RAM.WARP_COUNT_EN, mmu);
  const warpBaseAddr = resolveAddr(POKEMON_YELLOW_RAM.WARP_ENTRIES_BASE_EN, mmu);
  const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);
  const battleTypeAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_TYPE_EN, mmu);

  const currentMapId = mmu.read(mapIdAddr);
  const playerX = mmu.read(xAddr);
  const playerY = mmu.read(yAddr);
  const rawFacing = mmu.read(dirAddr);
  const tileset = mmu.read(tilesetAddr);
  const standingTile = mmu.read(standingTileAddr);
  const mapHeightBlocks = mmu.read(mapHeightAddr);
  const mapWidthBlocks = mmu.read(mapWidthAddr);
  const rawWarpCount = mmu.read(warpCountAddr);
  const joyIgnore = mmu.read(joyIgnoreAddr);
  const battleType = mmu.read(battleTypeAddr);

  // Decode Player Facing Direction
  let facingStr = 'Bas ⬇️';
  if (rawFacing === 0x04) facingStr = 'Haut ⬆️';
  else if (rawFacing === 0x08) facingStr = 'Gauche ⬅️';
  else if (rawFacing === 0x0C) facingStr = 'Droite ➡️';

  // Read Warps (max 32 warps to be safe)
  const warpCount = (rawWarpCount > 0 && rawWarpCount <= 32) ? rawWarpCount : 0;
  const warps: WarpInfo[] = [];
  for (let i = 0; i < warpCount; i++) {
    const entryAddr = warpBaseAddr + i * 4;
    warps.push({
      index: i + 1,
      y: mmu.read(entryAddr),
      x: mmu.read(entryAddr + 1),
      targetWarpId: mmu.read(entryAddr + 2),
      targetMapId: mmu.read(entryAddr + 3),
    });
  }

  const mapName = POKEMON_YELLOW_MAPS[currentMapId] || `Zone inconnue (0x${currentMapId.toString(16).toUpperCase()})`;
  const route = findClosestPokecenter(currentMapId, playerX, playerY);

  return {
    currentMapId,
    mapName,
    playerX,
    playerY,
    facing: facingStr,
    rawFacing,
    tileset,
    standingTile,
    mapWidth: mapWidthBlocks * 2, // 1 block = 2x2 tiles
    mapHeight: mapHeightBlocks * 2,
    mapWidthBlocks,
    mapHeightBlocks,
    warpCount,
    warps,
    joyIgnore,
    battleType,
    closestPokecenter: route,
  };
}
