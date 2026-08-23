// Real-time RAM Map & Screen Collision Reader for Pokemon Yellow (Gen 1)
// Reads RAM buffers (wTileMap 0xC3A0, wOverworldMap 0xC6E8, wCurMapTileset, wPlayerCoords)
// and builds an exact 2D collision/walkability matrix for dynamic A* pathfinding.

import { resolveAddr, POKEMON_YELLOW_RAM } from './pokemonYellowRam';

export enum TileClassification {
  WALKABLE = 0,       // Dirt, floor, carpet, door, open road (Cost 1)
  GRASS = 1,          // High grass / flowers (Cost 2)
  LEDGE_DOWN = 2,     // Hop-down ledge: passable ONLY when moving DOWN from above
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
}

// Overworld (Tileset 0) Tile Classifications in Gen 1
const OVERWORLD_WALKABLE_8x8 = new Set([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x0B, 0x1B, 0x2C, 0x2D, 0x3C, 0x3D, 0x7E, 0x7F
]);

const OVERWORLD_GRASS_8x8 = new Set([
  0x52, 0x53, 0x54, 0x55
]);

const OVERWORLD_LEDGE_DOWN_8x8 = new Set([
  0x36, 0x37, 0x38, 0x39
]);

// Indoor / Pokecenter (Tileset 1) Tile Classifications
const POKECENTER_WALKABLE_8x8 = new Set([
  0x00, 0x01, 0x02, 0x04, 0x05, 0x08, 0x0A, 0x15, 0x16, 0x1A, 0x1B, 0x2B, 0x3A, 0x48, 0x49
]);

// House (Tileset 2)
const HOUSE_WALKABLE_8x8 = new Set([
  0x00, 0x01, 0x02, 0x05, 0x0A, 0x1B, 0x20, 0x22, 0x23, 0x24, 0x32, 0x34
]);

// Viridian Forest (Tileset 3)
const FOREST_WALKABLE_8x8 = new Set([
  0x00, 0x01, 0x05, 0x0A, 0x0E, 0x0F, 0x1B, 0x20, 0x24, 0x34, 0x35, 0x36, 0x37
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

    // Mark current player standing position as 100% walkable
    collisionCache.markWalkable(mapId, playerX, playerY);

    // 2. Initialize map collision grid
    // CRITICAL: Unseen areas default to SOLID (Infinity) to prevent pathfinding through unverified boundaries
    const collisionGrid: TileClassification[][] = [];
    for (let y = 0; y <= mapHeight + 4; y++) {
      const row: TileClassification[] = [];
      for (let x = 0; x <= mapWidth + 4; x++) {
        row.push(TileClassification.SOLID);
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
              collisionGrid[wy][wx] = classification;
            }
          }
        }
      }
    }

    // 4. Populate & refine collision grid using High-Precision Screen Vision (wTileMap at 0xC3A0)
    // Game Boy screen is 20x18 tiles. Player center 16x16 sprite is at columns [8, 9] and rows [8, 9].
    // Each 16x16 step corresponds to 2x2 8x8 BG tiles.
    const screenRadarGrid: TileClassification[][] = [];

    for (let stepOffsetY = -4; stepOffsetY <= 4; stepOffsetY++) {
      const radarRow: TileClassification[] = [];
      for (let stepOffsetX = -4; stepOffsetX <= 4; stepOffsetX++) {
        const targetWorldX = playerX + stepOffsetX;
        const targetWorldY = playerY + stepOffsetY;

        const screenCol = 8 + stepOffsetX * 2;
        const screenRow = 8 + stepOffsetY * 2;

        let classification = TileClassification.SOLID;

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

          classification = evaluate2x2Step(
            tTopLeft,
            tTopRight,
            tBottomLeft,
            tBottomRight,
            tileset,
            standingTile
          );

          // Update main collision grid with high-precision screen vision
          if (
            targetWorldX >= 0 &&
            targetWorldX <= mapWidth &&
            targetWorldY >= 0 &&
            targetWorldY <= mapHeight
          ) {
            collisionGrid[targetWorldY][targetWorldX] = classification;
          }
        }

        radarRow.push(classification);
      }
      screenRadarGrid.push(radarRow);
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
    };
  } catch (err) {
    console.error('Erreur lecture RAM Map:', err);
    return null;
  }
}

/**
 * Evaluates a 16x16 player step consisting of 4 8x8 BG tiles.
 * All 4 sub-tiles must be passable for the step to be walkable!
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

  // Check if any sub-tile is a hop-down ledge
  if (
    OVERWORLD_LEDGE_DOWN_8x8.has(tl) ||
    OVERWORLD_LEDGE_DOWN_8x8.has(tr) ||
    OVERWORLD_LEDGE_DOWN_8x8.has(bl) ||
    OVERWORLD_LEDGE_DOWN_8x8.has(br)
  ) {
    return TileClassification.LEDGE_DOWN;
  }

  // Check if all 4 tiles are grass
  if (
    OVERWORLD_GRASS_8x8.has(tl) ||
    OVERWORLD_GRASS_8x8.has(tr) ||
    OVERWORLD_GRASS_8x8.has(bl) ||
    OVERWORLD_GRASS_8x8.has(br)
  ) {
    // Check that none of the other sub-tiles is a solid tree/wall
    if (
      isTilePassable(tl, tileset) &&
      isTilePassable(tr, tileset) &&
      isTilePassable(bl, tileset) &&
      isTilePassable(br, tileset)
    ) {
      return TileClassification.GRASS;
    }
    return TileClassification.SOLID;
  }

  // Check if ALL 4 tiles are passable road/floor
  if (
    isTilePassable(tl, tileset) &&
    isTilePassable(tr, tileset) &&
    isTilePassable(bl, tileset) &&
    isTilePassable(br, tileset)
  ) {
    return TileClassification.WALKABLE;
  }

  return TileClassification.SOLID;
}

/**
 * Check if an individual 8x8 tile is passable
 */
function isTilePassable(tileId: number, tileset: number): boolean {
  if (tileset === 0) {
    return OVERWORLD_WALKABLE_8x8.has(tileId) || OVERWORLD_GRASS_8x8.has(tileId);
  }
  if (tileset === 1) {
    return POKECENTER_WALKABLE_8x8.has(tileId);
  }
  if (tileset === 2) {
    return HOUSE_WALKABLE_8x8.has(tileId);
  }
  if (tileset === 3) {
    return FOREST_WALKABLE_8x8.has(tileId);
  }
  return tileId <= 0x05 || tileId === 0x1B;
}

/**
 * Check if a 32x32 Overworld block ID in wOverworldMap is solid
 */
function isBlockSolid(blockId: number, tileset: number): boolean {
  if (tileset === 0) {
    // Solid trees, mountain walls, roof blocks, water in Overworld
    const SOLID_OVERWORLD_BLOCKS = new Set([
      0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
      0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A,
      0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B,
      0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
      0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B
    ]);
    return SOLID_OVERWORLD_BLOCKS.has(blockId);
  }
  return false;
}
