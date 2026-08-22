// Pokemon Yellow (Special Pikachu Edition) & Yellow 151 Hack RAM Layout Specification
// This file centralizes memory addresses for Yellow / Yellow 151 (English and French / European offsets).

export function getRamOffset(mmu: any): number {
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
  return titleStr.includes('JAUNE') ? 1 : 0;
}

export function resolveAddr(enAddr: number, mmu: any): number {
  if (enAddr < 0xD000) {
    return enAddr;
  }
  return enAddr + getRamOffset(mmu);
}

export const POKEMON_YELLOW_RAM = {
  // Game / Battle State
  // 0 = Overworld, 1 = Wild Battle, 2 = Trainer Battle
  BATTLE_TYPE_EN: 0xD057,
  BATTLE_TYPE_FR: 0xD056,
  
  // Battle Active Mon HP & Max HP
  // Yellow: wBattleMonHP at 0xD015-0xD016, Max HP at 0xD023-0xD024
  BATTLE_MON_HP_EN: 0xD015,
  BATTLE_MON_MAX_HP_EN: 0xD023,
  BATTLE_MON_HP_FR: 0xD014,
  BATTLE_MON_MAX_HP_FR: 0xD022,

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

  // Overworld Map ID
  MAP_ID_EN: 0xD35E,
  MAP_ID_FR: 0xD35D,
  
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
