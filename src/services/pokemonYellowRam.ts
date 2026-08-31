// Pokemon Yellow (Special Pikachu Edition) & Yellow 151 Hack RAM Layout Specification
// This file centralizes memory addresses for Yellow / Yellow 151 (English and French / European offsets).
import { GEN1_INTERNAL_POKEMON } from './pokemonData';

export function getRamOffset(mmu: any): number {
  if (!mmu) return 0;
  // Signature check for Party Count (Standard EN is 0xD163)
  // Check offsets from -5 to +5 to handle ROM hacks (like Yellow 151) and translations
  for (let offset = -5; offset <= 5; offset++) {
    const addr = 0xD163 + offset;
    const count = mmu.read(addr);
    
    // Party size must be between 1 and 6
    if (count >= 1 && count <= 6) {
      const terminator = mmu.read(addr + count + 1);
      // The array of species IDs must end with 0xFF
      if (terminator === 0xFF) {
        let valid = true;
        for (let i = 0; i < count; i++) {
          const id = mmu.read(addr + 1 + i);
          // 0x00 and 0xFF are invalid internal Pokémon IDs
          if (id === 0 || id === 0xFF) {
            valid = false;
            break;
          }
        }
        if (valid) {
          return offset;
        }
      }
    }
  }

  // Fallback to title check if signature fails
  let titleStr = '';
  for (let i = 0x134; i <= 0x142; i++) {
    titleStr += String.fromCharCode(mmu.read(i));
  }
  return titleStr.includes('JAUNE') ? -1 : 0;
}

export function resolveAddr(enAddr: number, mmu: any): number {
  if (enAddr < 0xC000 || enAddr > 0xDFFF) {
    return enAddr;
  }
  return enAddr + getRamOffset(mmu);
}

export interface PartyStatusData {
  isValid: boolean;
  totalMons: number;
  aliveMons: number;
  faintedMons: number;
  monsHp: { slot: number; curHp: number; maxHp: number }[];
}

export function readPartyStatusFromRAM(mmu: any): PartyStatusData {
  if (!mmu) {
    return { isValid: false, totalMons: 1, aliveMons: 1, faintedMons: 0, monsHp: [] };
  }

  const pCountAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_COUNT_EN, mmu);
  const pHpBase = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_HP_EN, mmu);
  const pMaxHpBase = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_MAX_HP_EN, mmu);

  const rawCount = mmu.read(pCountAddr);
  const monsHp: { slot: number; curHp: number; maxHp: number }[] = [];
  let aliveMons = 0;
  let validSlots = 0;

  for (let i = 0; i < 6; i++) {
    const offset = i * POKEMON_YELLOW_RAM.PARTY_STRUCT_SIZE;
    const curHp = (mmu.read(pHpBase + offset) << 8) | mmu.read(pHpBase + offset + 1);
    const maxHp = (mmu.read(pMaxHpBase + offset) << 8) | mmu.read(pMaxHpBase + offset + 1);

    if (maxHp >= 5 && maxHp <= 999 && curHp <= maxHp + 100) {
      validSlots++;
      monsHp.push({ slot: i + 1, curHp, maxHp });
      if (curHp > 0) {
        aliveMons++;
      }
    }
  }

  if (validSlots > 0) {
    const totalMons = (rawCount >= 1 && rawCount <= 6) ? Math.max(validSlots, rawCount) : validSlots;
    return {
      isValid: true,
      totalMons,
      aliveMons,
      faintedMons: Math.max(0, totalMons - aliveMons),
      monsHp,
    };
  }

  return { isValid: false, totalMons: 1, aliveMons: 1, faintedMons: 0, monsHp: [] };
}

export interface PokedexStatusData {
  ownedDexIds: number[];
  seenDexIds: number[];
  ownedCount: number;
  seenCount: number;
}

export function readPokedexFromRAM(mmu: any): PokedexStatusData {
  if (!mmu || typeof mmu.read !== 'function') {
    return { ownedDexIds: [], seenDexIds: [], ownedCount: 0, seenCount: 0 };
  }

  const ownedSet = new Set<number>();
  const seenSet = new Set<number>();

  const offset = getRamOffset(mmu);
  const ownedBase = resolveAddr(POKEMON_YELLOW_RAM.POKEDEX_OWNED_EN, mmu);
  const seenBase = resolveAddr(POKEMON_YELLOW_RAM.POKEDEX_SEEN_EN, mmu);

  // 1. Read the 19-byte Pokédex bitmask (152 bits for #1..#151)
  for (let byteIdx = 0; byteIdx < 19; byteIdx++) {
    const ownedByte = mmu.read(ownedBase + byteIdx);
    const seenByte = mmu.read(seenBase + byteIdx);

    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const dexNumber = byteIdx * 8 + bitIdx + 1;
      if (dexNumber > 151) break;

      if (((ownedByte >> bitIdx) & 1) === 1) {
        ownedSet.add(dexNumber);
      }
      if (((seenByte >> bitIdx) & 1) === 1) {
        seenSet.add(dexNumber);
      }
    }
  }

  // 2. Also ensure active party Pokémon are recognized as owned & seen
  const partyAddr = 0xD163 + offset;
  const pCount = mmu.read(partyAddr);
  if (pCount >= 1 && pCount <= 6) {
    const terminator = mmu.read(partyAddr + pCount + 1);
    if (terminator === 0xFF) {
      for (let i = 0; i < pCount; i++) {
        const internalId = mmu.read(partyAddr + 1 + i);
        const info = GEN1_INTERNAL_POKEMON[internalId];
        if (info && info.id >= 1 && info.id <= 151) {
          ownedSet.add(info.id);
          seenSet.add(info.id);
        }
      }
    }
  }

  // 3. Also check current active PC Box if populated
  const boxAddr = 0xDA80 + offset;
  const boxCount = mmu.read(boxAddr);
  if (boxCount >= 1 && boxCount <= 20) {
    const terminator = mmu.read(boxAddr + boxCount + 1);
    if (terminator === 0xFF) {
      for (let i = 0; i < boxCount; i++) {
        const internalId = mmu.read(boxAddr + 1 + i);
        const info = GEN1_INTERNAL_POKEMON[internalId];
        if (info && info.id >= 1 && info.id <= 151) {
          ownedSet.add(info.id);
          seenSet.add(info.id);
        }
      }
    }
  }

  const ownedDexIds = Array.from(ownedSet).sort((a, b) => a - b);
  const seenDexIds = Array.from(seenSet).sort((a, b) => a - b);

  return {
    ownedDexIds,
    seenDexIds,
    ownedCount: ownedDexIds.length,
    seenCount: seenDexIds.length,
  };
}

export const POKEMON_YELLOW_RAM = {
  // Game / Battle State (wIsInBattle)
  // In Pokemon Yellow: 0xD056 (English), 0xD055 (French)
  // In Pokemon Red/Blue: 0xD057
  // Values: 0 = Overworld / No Battle, 1 = Wild Battle, 2 = Trainer Battle, 0xFF = Lost Battle
  BATTLE_TYPE_EN: 0xD056,
  BATTLE_TYPE_FR: 0xD055,
  BATTLE_TYPE_RB: 0xD057,

  // Pokédex Memory Arrays (19 bytes = 152 bits, tracking Pokémon #1..#151)
  // Yellow English: wPokedexOwned = 0xD2F6, wPokedexSeen = 0xD309
  // Yellow French:  wPokedexOwned = 0xD2F5, wPokedexSeen = 0xD308
  // Red/Blue EN:   wPokedexOwned = 0xD2F7, wPokedexSeen = 0xD30A
  POKEDEX_OWNED_EN: 0xD2F6,
  POKEDEX_OWNED_FR: 0xD2F5,
  POKEDEX_OWNED_RB: 0xD2F7,
  POKEDEX_SEEN_EN: 0xD309,
  POKEDEX_SEEN_FR: 0xD308,
  POKEDEX_SEEN_RB: 0xD30A,
  
  // Battle Active Mon HP & Max HP
  // Yellow: wBattleMonHP at 0xD015-0xD016, Max HP at 0xD023-0xD024
  BATTLE_MON_SPECIES_EN: 0xD014,
  BATTLE_MON_HP_EN: 0xD015,
  BATTLE_MON_STATUS_EN: 0xD018,
  BATTLE_MON_TYPE1_EN: 0xD019,
  BATTLE_MON_TYPE2_EN: 0xD01A,
  BATTLE_MON_LEVEL_EN: 0xD022,
  BATTLE_MON_MAX_HP_EN: 0xD023,

  // Enemy Mon Battle Struct (Gen 1 WRAM)
  // Standard Yellow/Red/Blue EN: wEnemyMon starts at 0xCFE8
  // French / shifted ROMs: 0xCFE7
  ENEMY_MON_SPECIES_EN: 0xCFE8,
  ENEMY_MON_HP_EN: 0xCFE9,
  ENEMY_MON_STATUS_EN: 0xCFEC,
  ENEMY_MON_TYPE1_EN: 0xCFED,
  ENEMY_MON_TYPE2_EN: 0xCFEE,
  ENEMY_MON_LEVEL_EN: 0xCFF6,
  ENEMY_MON_MAX_HP_EN: 0xCFF7,
  ENEMY_MON_SPECIES2_EN: 0xCFD8,

  // Party Count (0xD163 in Yellow English, 0xD162 in French)
  PARTY_COUNT_EN: 0xD163,
  PARTY_COUNT_FR: 0xD162,

  // Party Mon Structs in Yellow (Each Pokemon struct is 44 bytes = 0x2C)
  // English:
  // Party Mon 1: starts at 0xD16B (Species), HP at 0xD16C-0xD16D, Max HP at 0xD18D-0xD18E
  PARTY_STRUCT_SIZE: 44,
  PARTY_MON1_BASE_EN: 0xD16B,
  PARTY_MON1_HP_EN: 0xD16C,
  PARTY_MON1_MAX_HP_EN: 0xD18D,

  // French / European (-1 byte shift in Yellow):
  PARTY_MON1_BASE_FR: 0xD16A,
  PARTY_MON1_HP_FR: 0xD16B,
  PARTY_MON1_MAX_HP_FR: 0xD18C,

  // Battle Mon Moves (4 slots)
  // 0xD01C, 0xD01D, 0xD01E, 0xD01F
  BATTLE_MON_MOVES_EN: 0xD01C,
  BATTLE_MON_MOVES_FR: 0xD01B,

  // Battle Mon PP (4 slots, lower 6 bits = PP count, top 2 bits = PP Up count)
  // 0xD02D, 0xD02E, 0xD02F, 0xD030
  BATTLE_MON_PP_EN: 0xD02D,
  BATTLE_MON_PP_FR: 0xD02C,

  // Party Mon 1 Moves & PP (Fallback when battle mon struct is loading)
  PARTY_MON1_MOVES_EN: 0xD173,
  PARTY_MON1_PP_EN: 0xD188,
  PARTY_MON1_MOVES_FR: 0xD172,
  PARTY_MON1_PP_FR: 0xD187,

  // Current Active Battling Mon Index in Party (0-indexed: 0 = Slot 1, 1 = Slot 2, etc.)
  // 0xCC2F in Yellow English, 0xCC2E in French
  PLAYER_MON_NUMBER_EN: 0xCC2F,
  PLAYER_MON_NUMBER_FR: 0xCC2E,

  // Battle Cursor / Menu Position
  // 0xCC26 in Yellow: wCurrentMenuItem (0..3)
  BATTLE_CURSOR_EN: 0xCC26,
  BATTLE_CURSOR_FR: 0xCC25,

  // Overworld Player Coordinates (X, Y)
  // Yellow: 0xD362 (X), 0xD361 (Y)
  PLAYER_X_EN: 0xD362,
  PLAYER_Y_EN: 0xD361,
  PLAYER_X_FR: 0xD361,
  PLAYER_Y_FR: 0xD360,

  // Overworld Map ID (0xD35E in Yellow EN, 0xD35D in FR)
  MAP_ID_EN: 0xD35E,
  MAP_ID_FR: 0xD35D,

  // Player Direction (Sprite 0 facing direction at 0xC109: 0x00=Down, 0x04=Up, 0x08=Left, 0x0C=Right)
  PLAYER_DIR_EN: 0xC109,

  // Current Map Tileset (0xD367 in Yellow EN: 0=Overworld, 1=Pokecenter/Mart, 2=Indoors, 3=Forest/Cave...)
  MAP_TILESET_EN: 0xD367,
  MAP_TILESET_FR: 0xD366,

  // Tile player is currently standing on (0xD35B in Yellow EN)
  TILE_PLAYER_STANDING_EN: 0xD35B,
  TILE_PLAYER_STANDING_FR: 0xD35A,

  // Number of Warps (doors/exits) on current map (0xD3AE in Yellow EN, 0xD3AD in FR)
  WARP_COUNT_EN: 0xD3AE,
  WARP_COUNT_FR: 0xD3AD,

  // Warp table entries start address (0xD3AF in EN, 0xD3AE in FR; each warp is 4 bytes: [Y, X, target_warp_id, target_map_id])
  WARP_ENTRIES_BASE_EN: 0xD3AF,
  WARP_ENTRIES_BASE_FR: 0xD3AE,

  // Map Dimensions in 2x2 blocks (0xD368 = Height, 0xD369 = Width in EN)
  MAP_HEIGHT_EN: 0xD368,
  MAP_HEIGHT_FR: 0xD367,
  MAP_WIDTH_EN: 0xD369,
  MAP_WIDTH_FR: 0xD368,

  // Text box / Menu Joypad input lock status (0 = ready for input, >0 = locked or scrolling)
  JOY_IGNORE_EN: 0xCD6B,
  JOY_IGNORE_FR: 0xCD6A,

  // Tilemap screen buffer (20 columns x 18 rows = 360 tiles, starting at 0xC3A0 in WRAM)
  // Dialogue / Text box spans rows 12..17 (offset: 0xC3A0 + 12*20 = 0xC490 to 0xC507)
  TILEMAP_BASE_EN: 0xC3A0,
  TILEMAP_BASE_FR: 0xC39F,

  // Text box lines:
  // Row 13 (Line 1 of dialogue): 0xC3A0 + 13*20 + 1 = 0xC4A5 (18 chars)
  // Row 15 (Line 2 of dialogue): 0xC3A0 + 15*20 + 1 = 0xC4CD (18 chars)
  TEXTBOX_LINE1_EN: 0xC4A5,
  TEXTBOX_LINE2_EN: 0xC4CD,
  TEXTBOX_LINE1_FR: 0xC4A4,
  TEXTBOX_LINE2_FR: 0xC4CC,

  // Top Menu Item Position & Cursor bounds (wMaxMenuItem at 0xCC28, wTopMenuItemY at 0xCC24, wTopMenuItemX at 0xCC25)
  MAX_MENU_ITEM_EN: 0xCC28,
  MAX_MENU_ITEM_FR: 0xCC27,
  TOP_MENU_Y_EN: 0xCC24,
  TOP_MENU_X_EN: 0xCC25
};
