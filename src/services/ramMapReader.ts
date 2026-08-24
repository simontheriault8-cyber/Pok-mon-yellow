// Real-time RAM Map & Screen Collision Reader for Pokemon Yellow (Gen 1)
// Reads RAM buffers (wTileMap 0xC3A0, wOverworldMap 0xC6E8, wCurMapTileset, wPlayerCoords)
// and builds an exact 2D collision/walkability matrix for dynamic A* pathfinding.

import { resolveAddr, POKEMON_YELLOW_RAM } from './pokemonYellowRam';

export enum TileClassification {
  WALKABLE = 0,       // Dirt, floor, carpet, open road (Cost 1)
  GRASS = 1,          // High grass / flowers (Cost 2)
  LEDGE_DOWN = 2,     // Hop-down ledge: passable ONLY when moving DOWN from above
  DOOR = 3,           // Building entrance / Warp threshold (Cost 1)
  SOLID = Infinity,   // Tree, cliff, fence, water, wall, roof, counter, NPC
}

export interface LocalMapData {
  mapId: number;
  tileset: number;
  playerX: number;
  playerY: number;
  mapWidth: number;   // in 16x16 steps
  mapHeight: number;  // in 16x16 steps
  standingTile: number;
  collisionGrid: TileClassification[][]; // grid[y][x]
  screenTileGrid: TileClassification[][]; // 9x9 step radar around player
  screenTileHexGrid?: string[][]; // 9x9 hex values "[tl,tr,bl,br]"
}

// Overworld (Tileset 0) Tile Classifications in Gen 1
// Walkable: Dirt paths, light roads, sand/speckled paths, path edges, paved city streets, sidewalks, open spaces
export const OVERWORLD_WALKABLE_8x8 = new Set([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05,
  0x1B, 0x20, 0x21, 0x22, 0x23,
  0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31,
  0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F,
  0x48, 0x49, 0x7E, 0x7F
]);

// Grass tiles in Overworld (Tall wild encounter grass)
export const OVERWORLD_GRASS_8x8 = new Set([
  0x52
]);

// Hop-down Ledges in Overworld (jumpable ridges: 0x1D, 0x27, 0x36, 0x37)
export const OVERWORLD_LEDGE_DOWN_8x8 = new Set<number>([
  0x1D, 0x27, 0x36, 0x37
]);

// Door & entrance tiles in Overworld
export const OVERWORLD_DOOR_8x8 = new Set<number>([
  0x1B, 0x5E
]);

// Known strictly SOLID tiles in Overworld (Trees, mountain walls, fences, bollard posts, building facades, roofs, water)
export const OVERWORLD_SOLID_8x8 = new Set([
  // Trees (standard 4-quadrant tree & small single pine trees & tree tops)
  0x1C, 0x1E, 0x28, 0x29, 0x2A, 0x2B, 0x32, 0x33, 0x34, 0x35, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x4C, 0x4D, 0x4E, 0x4F,
  // Fences, signposts & bollard posts (00000000 barrier posts)
  0x18, 0x19, 0x1A, 0x24, 0x2A, 0x2B,
  0x50, 0x51, 0x53, 0x54, 0x55,
  // Mountain walls & cliff edges
  0x15, 0x16, 0x17, 0x25, 0x26,
  // Water / River / Ocean
  0x14, 0x1F,
  // Building windows, walls, signs (POKé / MART / SHOP) & facades (Pokecenter, Mart, Houses)
  0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
  0x10, 0x11, 0x12, 0x13,
  // Building roofs & solid walls
  0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5F,
  0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
  0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D
]);

// Indoor / Pokecenter (Tileset 1) Tile Classifications
export const POKECENTER_WALKABLE_8x8 = new Set([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x08, 0x0A, 0x15, 0x16, 0x1A, 0x1B, 0x2B, 0x3A, 0x48, 0x49, 0x7E, 0x7F
]);

// House (Tileset 2)
export const HOUSE_WALKABLE_8x8 = new Set([
  0x00, 0x01, 0x02, 0x05, 0x0A, 0x1B, 0x20, 0x22, 0x23, 0x24, 0x32, 0x34, 0x7E, 0x7F
]);

// Viridian Forest (Tileset 3)
export const FOREST_WALKABLE_8x8 = new Set([
  0x00, 0x01, 0x05, 0x0A, 0x0E, 0x0F, 0x1B, 0x20, 0x24, 0x34, 0x35, 0x36, 0x37, 0x52, 0x53, 0x54, 0x55, 0x7E, 0x7F
]);

// Persistent memory of verified walkable/solid coordinates per map
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
 * Reads live RAM buffers and constructs the exact 2D collision matrix.
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
    const mapHeight = Math.max(blockHeight * 2, 36);

    // 1. Read live screen tilemap buffer (20 columns x 18 rows = 360 tiles at 0xC3A0)
    const screenTiles: number[][] = [];
    for (let r = 0; r < 18; r++) {
      const row: number[] = [];
      for (let c = 0; c < 20; c++) {
        row.push(mmu.read(tilemapBaseAddr + r * 20 + c));
      }
      screenTiles.push(row);
    }

    // 1b. Read live warps on current map from RAM
    const warpCountAddr = resolveAddr(POKEMON_YELLOW_RAM.WARP_COUNT_EN, mmu);
    const warpBaseAddr = resolveAddr(POKEMON_YELLOW_RAM.WARP_ENTRIES_BASE_EN, mmu);
    const warpCount = mmu.read(warpCountAddr);
    const warpsSet = new Set<string>();
    if (warpCount > 0 && warpCount <= 32) {
      for (let i = 0; i < warpCount; i++) {
        const wy = mmu.read(warpBaseAddr + i * 4);
        const wx = mmu.read(warpBaseAddr + i * 4 + 1);
        warpsSet.add(`${wx},${wy}`);
      }
    }

    // Mark current player standing position as 100% walkable
    collisionCache.markWalkable(mapId, playerX, playerY);

    // 2. Initialize map collision grid
    // Within map boundaries (0..mapWidth, 0..mapHeight), initialize as WALKABLE so the player can navigate open roads,
    // and let screen vision (wTileMap) and collision cache detect the exact obstacles (trees, walls, cliffs).
    // Border beyond map boundaries remains SOLID.
    const collisionGrid: TileClassification[][] = [];
    for (let y = 0; y <= mapHeight + 4; y++) {
      const row: TileClassification[] = [];
      for (let x = 0; x <= mapWidth + 4; x++) {
        if (warpsSet.has(`${x},${y}`)) {
          row.push(TileClassification.DOOR);
        } else if (x <= mapWidth && y <= mapHeight) {
          row.push(TileClassification.WALKABLE);
        } else {
          row.push(TileClassification.SOLID);
        }
      }
      collisionGrid.push(row);
    }

    // 3. Decompress Overworld Blocks from wOverworldMap (0xC6E8) if present
    const overworldMapBase = 0xC6E8;
    const pitch = blockWidth + 6;

    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        const blockAddr = overworldMapBase + (by + 3) * pitch + (bx + 3);
        const blockId = mmu.read(blockAddr);

        // Convert block to 2x2 player steps
        const stepX = bx * 2;
        const stepY = by * 2;

        const isSolid = isBlockSolid(blockId, tileset);
        const classification = isSolid ? TileClassification.SOLID : TileClassification.WALKABLE;

        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const wx = stepX + dx;
            const wy = stepY + dy;
            if (wy <= mapHeight && wx <= mapWidth) {
              if (warpsSet.has(`${wx},${wy}`)) {
                collisionGrid[wy][wx] = TileClassification.DOOR;
              } else {
                collisionGrid[wy][wx] = classification;
              }
            }
          }
        }
      }
    }

    // 4. Populate & refine collision grid using High-Precision Screen Vision (wTileMap at 0xC3A0)
    // Game Boy screen is 20x18 tiles. Player center 16x16 sprite is at columns [8, 9] and rows [8, 9].
    // Each 16x16 step corresponds to 2x2 8x8 BG tiles.
    const screenRadarGrid: TileClassification[][] = [];
    const screenRadarHexGrid: string[][] = [];

    for (let stepOffsetY = -4; stepOffsetY <= 4; stepOffsetY++) {
      const radarRow: TileClassification[] = [];
      const hexRow: string[] = [];
      for (let stepOffsetX = -4; stepOffsetX <= 4; stepOffsetX++) {
        const targetWorldX = playerX + stepOffsetX;
        const targetWorldY = playerY + stepOffsetY;

        const screenCol = 8 + stepOffsetX * 2;
        const screenRow = 8 + stepOffsetY * 2;

        let classification = TileClassification.SOLID;
        let hexStr = '??';

        // Check if this world coord is a known door / warp entry
        const isDoorCoordinate = warpsSet.has(`${targetWorldX},${targetWorldY}`);

        // Check if all 4 8x8 sub-tiles are on screen
        if (
          screenRow >= 0 &&
          screenRow + 1 < 18 &&
          screenCol >= 0 &&
          screenCol + 1 < 20
        ) {
          const tTopLeft = screenTiles[screenRow][screenCol];
          const tTopRight = screenTiles[screenRow][screenCol + 1];
          const tBottomLeft = screenTiles[screenRow + 1][screenCol];
          const tBottomRight = screenTiles[screenRow + 1][screenCol + 1];

          hexStr = `0x${tTopLeft.toString(16).padStart(2, '0')}, 0x${tTopRight.toString(16).padStart(2, '0')}, 0x${tBottomLeft.toString(16).padStart(2, '0')}, 0x${tBottomRight.toString(16).padStart(2, '0')}`;

          if (isDoorCoordinate) {
            classification = TileClassification.DOOR;
          } else {
            classification = evaluate2x2Step(
              tTopLeft,
              tTopRight,
              tBottomLeft,
              tBottomRight,
              tileset,
              standingTile
            );
          }

          // Update main collision grid with high-precision screen vision
          if (
            targetWorldX >= 0 &&
            targetWorldX <= mapWidth &&
            targetWorldY >= 0 &&
            targetWorldY <= mapHeight
          ) {
            collisionGrid[targetWorldY][targetWorldX] = classification;
          }
        } else if (isDoorCoordinate) {
          classification = TileClassification.DOOR;
        }

        radarRow.push(classification);
        hexRow.push(hexStr);
      }
      screenRadarGrid.push(radarRow);
      screenRadarHexGrid.push(hexRow);
    }

    // 5. Apply dynamic collision cache overlays (learned obstacles / walked paths)
    for (let y = 0; y <= mapHeight; y++) {
      for (let x = 0; x <= mapWidth; x++) {
        if (collisionCache.isMarkedSolid(mapId, x, y)) {
          collisionGrid[y][x] = TileClassification.SOLID;
        } else if (collisionCache.isMarkedWalkable(mapId, x, y)) {
          if (collisionGrid[y][x] === TileClassification.SOLID) {
            collisionGrid[y][x] = TileClassification.WALKABLE;
          }
        }
      }
    }

    // Current player position is ALWAYS walkable
    if (playerY < collisionGrid.length && playerX < collisionGrid[0].length) {
      collisionGrid[playerY][playerX] = TileClassification.WALKABLE;
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
      screenTileGrid: screenRadarGrid,
      screenTileHexGrid: screenRadarHexGrid,
    };
  } catch (err) {
    console.error('Erreur lecture RAM Map:', err);
    return null;
  }
}

/**
 * Evaluates a 16x16 player step consisting of 4 8x8 BG tiles.
 * Uses explicit solid detection and fallback walkability so city roads and paths are never blocked!
 */
function evaluate2x2Step(
  tl: number,
  tr: number,
  bl: number,
  br: number,
  tileset: number,
  standingTile: number
): TileClassification {
  // If all 4 tiles match what the player is currently standing on -> 100% Walkable
  if (tl === standingTile && tr === standingTile && bl === standingTile && br === standingTile) {
    return TileClassification.WALKABLE;
  }

  // Check if any sub-tile is explicitly strictly SOLID (Trees, cliff walls, fences, roofs, water)
  if (
    isTileSolid(tl, tileset) ||
    isTileSolid(tr, tileset) ||
    isTileSolid(bl, tileset) ||
    isTileSolid(br, tileset)
  ) {
    return TileClassification.SOLID;
  }

  // Check if any sub-tile is a hop-down ledge
  if (
    OVERWORLD_LEDGE_DOWN_8x8.has(tl) ||
    OVERWORLD_LEDGE_DOWN_8x8.has(tr) ||
    OVERWORLD_LEDGE_DOWN_8x8.has(bl) ||
    OVERWORLD_LEDGE_DOWN_8x8.has(br)
  ) {
    return TileClassification.LEDGE_DOWN;
  }

  // Check if any sub-tile is tall grass
  if (
    OVERWORLD_GRASS_8x8.has(tl) ||
    OVERWORLD_GRASS_8x8.has(tr) ||
    OVERWORLD_GRASS_8x8.has(bl) ||
    OVERWORLD_GRASS_8x8.has(br)
  ) {
    return TileClassification.GRASS;
  }

  // Otherwise, all clear road, pavement, door mat, or floor
  return TileClassification.WALKABLE;
}

/**
 * Check if an individual 8x8 tile is strictly SOLID
 */
function isTileSolid(tileId: number, tileset: number): boolean {
  if (tileset === 0) {
    return OVERWORLD_SOLID_8x8.has(tileId);
  }
  if (tileset === 1) {
    return !POKECENTER_WALKABLE_8x8.has(tileId);
  }
  if (tileset === 2) {
    return !HOUSE_WALKABLE_8x8.has(tileId);
  }
  if (tileset === 3) {
    return !FOREST_WALKABLE_8x8.has(tileId);
  }
  return false;
}

/**
 * Check if an individual 8x8 tile is passable
 */
function isTilePassable(tileId: number, tileset: number): boolean {
  return !isTileSolid(tileId, tileset);
}

/**
 * Check if a 32x32 Overworld block ID in wOverworldMap is solid
 */
function isBlockSolid(blockId: number, tileset: number): boolean {
  if (tileset === 0) {
    // Pure solid blocks only (dense trees clump 0x0D, full water 0x14)
    const STRICT_SOLID_BLOCKS = new Set([0x0D, 0x14]);
    return STRICT_SOLID_BLOCKS.has(blockId);
  }
  return false;
}
