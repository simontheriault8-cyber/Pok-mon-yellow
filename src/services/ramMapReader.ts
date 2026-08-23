// Real-time RAM Map & Screen Collision Reader for Pokemon Yellow (Gen 1)
// Reads RAM buffers (wTileMap 0xC3A0, wOverworldMap 0xC6E8, wCurMapTileset, wPlayerCoords)
// and builds a 2D collision/walkability matrix for dynamic A* pathfinding.

import { resolveAddr, POKEMON_YELLOW_RAM } from './pokemonYellowRam';

export interface LocalMapData {
  mapId: number;
  tileset: number;
  playerX: number;
  playerY: number;
  mapWidth: number;   // in steps (2 * blockWidth)
  mapHeight: number;  // in steps (2 * blockHeight)
  standingTile: number;
  collisionGrid: number[][]; // grid[y][x]: 0 = Walkable, 1 = Grass, Infinity = Solid Obstacle
  screenTiles: number[][];   // 18 rows x 20 cols
}

// Known Gen 1 Tileset Walkability tables
// Tileset 0 = Overworld (Routes, Pallet, Viridian, etc.)
const OVERWORLD_WALKABLE_TILES = new Set([
  0x00, 0x01, 0x05, 0x0C, 0x0E, 0x0F, 0x1B, 0x2C, 0x2D,
  0x36, 0x37, 0x38, 0x39, 0x3A, 0x3C, 0x3D, 0x52, 0x53, 
  0x54, 0x55, 0x5E, 0x5F, 0x6E, 0x7E, 0x7F
]);

// Grass tiles on Overworld (passable with higher cost to prefer clear roads)
const OVERWORLD_GRASS_TILES = new Set([
  0x52, 0x53, 0x54, 0x55, 0x3C, 0x3D
]);

// Tileset 1 = Pokecenter / Pokemart / Indoor public buildings
const POKECENTER_WALKABLE_TILES = new Set([
  0x00, 0x01, 0x04, 0x05, 0x08, 0x0A, 0x15, 0x16, 0x1A, 0x1B, 0x2B, 0x3A, 0x48, 0x49
]);

// Tileset 2 = House Interior
const HOUSE_WALKABLE_TILES = new Set([
  0x00, 0x01, 0x02, 0x05, 0x0A, 0x1B, 0x20, 0x22, 0x23, 0x24, 0x32, 0x34
]);

// Tileset 3 = Forest (Viridian Forest)
const FOREST_WALKABLE_TILES = new Set([
  0x00, 0x01, 0x05, 0x0A, 0x0E, 0x0F, 0x1B, 0x20, 0x24, 0x34, 0x35, 0x36, 0x37
]);

// Persistent dynamic cache of learned obstacle/walkable coordinates per map
class CollisionMemoryCache {
  private solidTilesPerMap: Map<number, Set<string>> = new Map();
  private walkableTilesPerMap: Map<number, Set<string>> = new Map();

  public markSolid(mapId: number, x: number, y: number): void {
    if (!this.solidTilesPerMap.has(mapId)) {
      this.solidTilesPerMap.set(mapId, new Set());
    }
    this.solidTilesPerMap.get(mapId)!.add(`${x},${y}`);
  }

  public isMarkedSolid(mapId: number, x: number, y: number): boolean {
    return this.solidTilesPerMap.get(mapId)?.has(`${x},${y}`) || false;
  }

  public markWalkable(mapId: number, x: number, y: number): void {
    if (!this.walkableTilesPerMap.has(mapId)) {
      this.walkableTilesPerMap.set(mapId, new Set());
    }
    this.walkableTilesPerMap.get(mapId)!.add(`${x},${y}`);
    // If it was marked solid, unmark it
    this.solidTilesPerMap.get(mapId)?.delete(`${x},${y}`);
  }

  public isMarkedWalkable(mapId: number, x: number, y: number): boolean {
    return this.walkableTilesPerMap.get(mapId)?.has(`${x},${y}`) || false;
  }

  public clear(): void {
    this.solidTilesPerMap.clear();
    this.walkableTilesPerMap.clear();
  }
}

export const collisionCache = new CollisionMemoryCache();

/**
 * Reads RAM and creates a comprehensive collision grid around the player.
 */
export function readRamMapData(mmu: any): LocalMapData | null {
  if (!mmu) return null;

  try {
    const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);
    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
    const tilesetAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_TILESET_EN, mmu);
    const standingTileAddr = resolveAddr(POKEMON_YELLOW_RAM.TILE_PLAYER_STANDING_EN, mmu);
    const mapWidthAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_WIDTH_EN, mmu);
    const mapHeightAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_HEIGHT_EN, mmu);
    const tilemapBaseAddr = resolveAddr(POKEMON_YELLOW_RAM.TILEMAP_BASE_EN, mmu);

    const mapId = mmu.read(mapIdAddr);
    const playerX = mmu.read(xAddr);
    const playerY = mmu.read(yAddr);
    const tileset = mmu.read(tilesetAddr);
    const standingTile = mmu.read(standingTileAddr);
    const blockWidth = mmu.read(mapWidthAddr);
    const blockHeight = mmu.read(mapHeightAddr);

    // Map dimensions in 16x16 player steps (1 block = 2x2 steps)
    const mapWidth = Math.max(blockWidth * 2, 40);
    const mapHeight = Math.max(blockHeight * 2, 40);

    // 1. Read live screen tilemap buffer (20 columns x 18 rows = 360 tiles at 0xC3A0)
    const screenTiles: number[][] = [];
    for (let r = 0; r < 18; r++) {
      const row: number[] = [];
      for (let c = 0; c < 20; c++) {
        row.push(mmu.read(tilemapBaseAddr + r * 20 + c));
      }
      screenTiles.push(row);
    }

    // Mark current player standing position as 100% walkable
    collisionCache.markWalkable(mapId, playerX, playerY);

    // 2. Build map collision grid
    // Cost values:
    // 0 = Normal clear walkable road / floor
    // 1 = High grass / flower (walkable, slightly higher cost)
    // Infinity = Obstacle / Wall / Tree / Fence / Solid
    const collisionGrid: number[][] = [];
    for (let y = 0; y <= mapHeight + 4; y++) {
      const row: number[] = [];
      for (let x = 0; x <= mapWidth + 4; x++) {
        // Default to walkable road
        row.push(0);
      }
      collisionGrid.push(row);
    }

    // 3. Populate collision grid using Screen Vision (wTileMap at 0xC3A0)
    // On GameBoy 160x144, player is rendered at screen center tile (approx col 8..9, row 8..9)
    // Each 16x16 step is 2x2 8x8 tiles in wTileMap
    const centerScreenCol = 8;
    const centerScreenRow = 8;

    for (let r = 0; r < 18; r += 2) {
      for (let c = 0; c < 20; c += 2) {
        const tileId = screenTiles[r][c];
        const stepOffsetX = Math.floor((c - centerScreenCol) / 2);
        const stepOffsetY = Math.floor((r - centerScreenRow) / 2);

        const targetWorldX = playerX + stepOffsetX;
        const targetWorldY = playerY + stepOffsetY;

        if (targetWorldX >= 0 && targetWorldX <= mapWidth && targetWorldY >= 0 && targetWorldY <= mapHeight) {
          const cost = evaluateTileCost(tileId, tileset, standingTile);
          collisionGrid[targetWorldY][targetWorldX] = cost;
        }
      }
    }

    // 4. Overlay Overworld Map Blocks (0xC6E8 `wOverworldMap`)
    // In Gen 1, wOverworldMap decompresses map blocks. Pitch = (blockWidth + 6)
    const overworldMapBase = 0xC6E8;
    const pitch = blockWidth + 6;

    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        const blockAddr = overworldMapBase + (by + 3) * pitch + (bx + 3);
        const blockId = mmu.read(blockAddr);

        // Convert block to 2x2 player steps
        const stepX = bx * 2;
        const stepY = by * 2;

        // Check if block is known obstacle
        if (isBlockSolid(blockId, tileset)) {
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const wx = stepX + dx;
              const wy = stepY + dy;
              if (wy <= mapHeight && wx <= mapWidth && !collisionCache.isMarkedWalkable(mapId, wx, wy)) {
                collisionGrid[wy][wx] = Infinity;
              }
            }
          }
        }
      }
    }

    // 5. Apply dynamic collision cache overlays (learned obstacles / walked paths)
    for (let y = 0; y <= mapHeight; y++) {
      for (let x = 0; x <= mapWidth; x++) {
        if (collisionCache.isMarkedSolid(mapId, x, y)) {
          collisionGrid[y][x] = Infinity;
        } else if (collisionCache.isMarkedWalkable(mapId, x, y)) {
          if (collisionGrid[y][x] === Infinity) {
            collisionGrid[y][x] = 0;
          }
        }
      }
    }

    // Current player position is always walkable
    if (playerY < collisionGrid.length && playerX < collisionGrid[0].length) {
      collisionGrid[playerY][playerX] = 0;
    }

    return {
      mapId,
      tileset,
      playerX,
      playerY,
      mapWidth,
      mapHeight,
      standingTile,
      collisionGrid,
      screenTiles,
    };
  } catch (err) {
    console.error('Erreur lecture RAM Map:', err);
    return null;
  }
}

/**
 * Determine movement cost for a specific tile ID.
 * Returns:
 * - 0: Free walkable road / floor
 * - 1: High grass (walkable, slightly higher cost)
 * - Infinity: Solid obstacle (tree, fence, wall, water, counter)
 */
function evaluateTileCost(tileId: number, tileset: number, standingTile: number): number {
  // If identical to what player is already standing on, it is 100% walkable
  if (tileId === standingTile) {
    return 0;
  }

  // Overworld (Tileset 0)
  if (tileset === 0) {
    if (OVERWORLD_GRASS_TILES.has(tileId)) {
      return 1; // High grass
    }
    if (OVERWORLD_WALKABLE_TILES.has(tileId)) {
      return 0; // Road / Path / Clear
    }
    return Infinity; // Obstacle / Tree / Fence / Water
  }

  // Pokecenter / Mart (Tileset 1)
  if (tileset === 1) {
    if (POKECENTER_WALKABLE_TILES.has(tileId)) {
      return 0;
    }
    return Infinity;
  }

  // House (Tileset 2)
  if (tileset === 2) {
    if (HOUSE_WALKABLE_TILES.has(tileId)) {
      return 0;
    }
    return Infinity;
  }

  // Forest (Tileset 3)
  if (tileset === 3) {
    if (FOREST_WALKABLE_TILES.has(tileId)) {
      return 0;
    }
    return Infinity;
  }

  // Fallback heuristic: low tile IDs (0x00..0x05) are almost always ground floors
  if (tileId <= 0x05 || tileId === 0x1B) {
    return 0;
  }

  return Infinity;
}

/**
 * Heuristic for overworld block solid check
 */
function isBlockSolid(blockId: number, tileset: number): boolean {
  // Overworld block IDs that are 100% trees, deep water, or solid buildings
  if (tileset === 0) {
    // 0x0A, 0x0B, 0x0C = dense trees/roofs in overworld blocks
    if (blockId === 0x0A || blockId === 0x0B || blockId === 0x14 || blockId === 0x15) {
      return true;
    }
  }
  return false;
}
