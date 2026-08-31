// Real-Time RAM Guide Reader for Pokémon Yellow / Gen 1 (English Version)
import { resolveAddr, POKEMON_YELLOW_RAM, readPokedexFromRAM, PokedexStatusData } from './pokemonYellowRam';
import {
  GEN1_INTERNAL_POKEMON,
  RAM_TYPE_MAP,
  PokemonType,
  TypeMatchupReport,
  getDefenderMatchupReport,
  GYM_LEADERS,
  GymLeaderInfo,
  WILD_ENCOUNTERS_BY_MAP,
  WildEncounter,
} from './pokemonData';
import { POKEMON_YELLOW_MAPS } from './worldNavigation';

export interface BattlingMonState {
  speciesId: number;
  name: string;
  level: number;
  curHp: number;
  maxHp: number;
  hpPercent: number;
  type1: PokemonType;
  type2?: PokemonType;
  statusStr: string;
  matchupReport: TypeMatchupReport;
}

export interface BattleGuideData {
  isInBattle: boolean;
  battleType: 'wild' | 'trainer' | 'none';
  playerMon: BattlingMonState | null;
  enemyMon: BattlingMonState | null;
  tacticalAdvice: string[];
}

export interface OverworldGuideData {
  mapId: number;
  mapName: string;
  locationCategory: 'route' | 'city' | 'dungeon' | 'pokecenter' | 'indoor';
  playerX: number;
  playerY: number;
  wildEncounters?: WildEncounter[];
  gymLeader?: GymLeaderInfo;
  description?: string;
}

export interface GameGuideSnapshot {
  mode: 'battle' | 'overworld';
  battleData?: BattleGuideData;
  overworldData?: OverworldGuideData;
  pokedexData?: PokedexStatusData;
}

export class GameGuideReader {
  /**
   * Decodes status byte from Gen 1 RAM (0xCFE9 or party status byte)
   * Bit 0-2: Sleep turns (1-7)
   * Bit 3: Poison
   * Bit 4: Burn
   * Bit 5: Freeze
   * Bit 6: Paralyze
   */
  private static decodeStatusByte(statusByte: number): string {
    if (statusByte === 0) return 'Normal';
    if ((statusByte & 0x07) > 0) return 'Sleep 💤';
    if ((statusByte & 0x08) > 0) return 'Poison 🟣';
    if ((statusByte & 0x10) > 0) return 'Burn 🔥';
    if ((statusByte & 0x20) > 0) return 'Freeze ❄️';
    if ((statusByte & 0x40) > 0) return 'Paralyze ⚡';
    return 'Normal';
  }

  /**
   * Categorizes a Gen 1 Map ID into 'city', 'route', 'dungeon', 'pokecenter', or 'indoor'.
   */
  public static categorizeMap(mapId: number, mapName: string): 'route' | 'city' | 'dungeon' | 'pokecenter' | 'indoor' {
    const nameLower = mapName.toLowerCase();
    if (nameLower.includes('centre') || nameLower.includes('center') || nameLower.includes('pkmn')) return 'pokecenter';
    if (nameLower.startsWith('route') || nameLower.includes('water path') || nameLower.includes('channel') || nameLower.includes('chenal')) return 'route';
    if (
      nameLower.includes('forest') ||
      nameLower.includes('forêt') ||
      nameLower.includes('moon') ||
      nameLower.includes('sélénite') ||
      nameLower.includes('cave') ||
      nameLower.includes('grotte') ||
      nameLower.includes('tunnel') ||
      nameLower.includes('island') ||
      nameLower.includes('plant') ||
      nameLower.includes('tower') ||
      nameLower.includes('mansion')
    ) {
      return 'dungeon';
    }
    if (
      mapId === 0x00 || // Pallet Town
      mapId === 0x01 || // Viridian City
      mapId === 0x02 || // Pewter City
      mapId === 0x03 || // Cerulean City
      mapId === 0x04 || // Lavender Town
      mapId === 0x05 || // Vermilion City
      mapId === 0x06 || // Celadon City
      mapId === 0x07 || // Fuchsia City
      mapId === 0x08 || // Cinnabar Island
      mapId === 0x09 || // Indigo Plateau
      mapId === 0x0A    // Saffron City
    ) {
      return 'city';
    }
    return 'indoor';
  }

  /**
   * Decodes a Game Boy character byte to ASCII/Unicode for Gen 1 Pokémon.
   */
  public static decodeChar(byteVal: number): string {
    if (byteVal >= 0x80 && byteVal <= 0x99) {
      return String.fromCharCode(65 + (byteVal - 0x80)); // 'A'..'Z'
    }
    if (byteVal >= 0xA0 && byteVal <= 0xB9) {
      return String.fromCharCode(97 + (byteVal - 0xA0)); // 'a'..'z'
    }
    if (byteVal >= 0xF6 && byteVal <= 0xFF) {
      return String.fromCharCode(48 + (byteVal - 0xF6)); // '0'..'9'
    }
    switch (byteVal) {
      case 0x7F: return ' '; // Space
      case 0xE0: return '\'';
      case 0xE1: return 'PK';
      case 0xE2: return 'MN';
      case 0xE3: return '-';
      case 0xE6: return '!';
      case 0xE7: return '?';
      case 0xE8: return '.';
      case 0xBA: return 'é';
      case 0xF0: return '$';
      case 0xF1: return '×';
      case 0xF2: return '.';
      case 0xF3: return '/';
      case 0xF4: return ',';
      case 0xF5: return '♀';
      case 0xEF: return '♂';
      default: return '';
    }
  }

  /**
   * Reads a line of text from the Game Boy tilemap memory buffer.
   */
  public static readTilemapLine(mmu: any, startAddr: number, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.decodeChar(mmu.read(startAddr + i));
    }
    return result.trim();
  }

  /**
   * Scans the battle screen tilemap buffer to extract visible opponent name and level.
   */
  private static scanScreenForEnemy(mmu: any): { name: string; level: number; speciesId?: number } | null {
    const tilemapBase = resolveAddr(POKEMON_YELLOW_RAM.TILEMAP_BASE_EN, mmu);
    
    // Top-left area of screen: Rows 0, 1, 2, columns 0..12
    const row0 = this.readTilemapLine(mmu, tilemapBase + 0 * 20, 12).toUpperCase();
    const row1 = this.readTilemapLine(mmu, tilemapBase + 1 * 20, 12).toUpperCase();
    const row2 = this.readTilemapLine(mmu, tilemapBase + 2 * 20, 12).toUpperCase();
    const combinedTopText = `${row0} ${row1} ${row2}`;

    // 1. Try to find a matching Pokémon name in the top text
    let matchedSpeciesId: number | undefined;
    let matchedName = '';

    for (const [intIdStr, monInfo] of Object.entries(GEN1_INTERNAL_POKEMON)) {
      const pName = monInfo.name.toUpperCase();
      const pNameEn = monInfo.nameEn.toUpperCase();
      if (
        (pName.length >= 3 && combinedTopText.includes(pName)) ||
        (pNameEn.length >= 3 && combinedTopText.includes(pNameEn))
      ) {
        matchedSpeciesId = parseInt(intIdStr, 10);
        matchedName = monInfo.name;
        break;
      }
    }

    // 2. Try to extract the level (e.g., ":L4", "L4", ":L 4", "N4", "LV4")
    let level = 5;
    const levelMatch = combinedTopText.match(/(?:L|LV|N|:L)\s*(\d{1,3})/i);
    if (levelMatch && levelMatch[1]) {
      const parsed = parseInt(levelMatch[1], 10);
      if (parsed >= 1 && parsed <= 100) {
        level = parsed;
      }
    }

    if (matchedSpeciesId && matchedName) {
      return {
        name: matchedName,
        level,
        speciesId: matchedSpeciesId,
      };
    }

    return null;
  }

  /**
   * Reads the active Enemy Pokémon in battle with dynamic offset detection and screen cross-verification.
   */
  private static readEnemyMon(mmu: any): BattlingMonState | null {
    // 0. Screen visual OCR check
    const screenEnemy = this.scanScreenForEnemy(mmu);

    // 1. High-priority scan of the primary wEnemyMon address resolved with ROM offset
    const resolvedEnemyBase = resolveAddr(POKEMON_YELLOW_RAM.ENEMY_MON_SPECIES_EN, mmu);
    const candidateOffsets = [0, -1, 1, -2, 2, -3, 3];

    let bestMon: BattlingMonState | null = null;
    let bestScore = -1;

    for (const offset of candidateOffsets) {
      const base = resolvedEnemyBase + offset;
      const speciesId = mmu.read(base);
      const enemyInfo = GEN1_INTERNAL_POKEMON[speciesId];
      if (!enemyInfo) continue;

      const level = mmu.read(base + 14);
      const maxHp = (mmu.read(base + 15) << 8) | mmu.read(base + 16);
      const curHp = (mmu.read(base + 1) << 8) | mmu.read(base + 2);
      const rawType1 = mmu.read(base + 5);
      const rawType2 = mmu.read(base + 6);
      const statusByte = mmu.read(base + 4);

      // Score this candidate
      let score = 0;

      // Check level validity
      if (level >= 1 && level <= 100) {
        score += 20;
      }

      // Check max HP validity (must be strictly positive and realistic)
      if (maxHp >= 5 && maxHp <= 1500) {
        score += 30;
      }

      // Check cur HP validity (must be <= maxHp)
      if (maxHp > 0 && curHp >= 0 && curHp <= maxHp + 10) {
        score += 25;
      }

      // If matches the name visible on the screen, this is guaranteed to be the exact target
      if (screenEnemy && screenEnemy.speciesId === speciesId) {
        score += 100;
      }

      // If type byte in RAM matches species data
      if (RAM_TYPE_MAP[rawType1] === enemyInfo.type1) {
        score += 15;
      }

      if (score > bestScore && score >= 50) {
        bestScore = score;
        const type1: PokemonType = RAM_TYPE_MAP[rawType1] || enemyInfo.type1;
        const type2: PokemonType | undefined =
          rawType1 !== rawType2 && RAM_TYPE_MAP[rawType2] ? RAM_TYPE_MAP[rawType2] : enemyInfo.type2;
        const matchupReport = getDefenderMatchupReport(type1, type2);

        const safeMaxHp = maxHp >= 1 ? maxHp : (screenEnemy ? 20 : 20);
        const safeCurHp = maxHp >= 1 && curHp <= maxHp + 10 ? Math.min(curHp, safeMaxHp) : safeMaxHp;
        const safeLevel = level >= 1 && level <= 100 ? level : (screenEnemy?.level || 5);

        bestMon = {
          speciesId,
          name: enemyInfo.name,
          level: safeLevel,
          curHp: safeCurHp,
          maxHp: safeMaxHp,
          hpPercent: Math.min(100, Math.max(0, Math.round((safeCurHp / safeMaxHp) * 100))),
          type1,
          type2,
          statusStr: this.decodeStatusByte(statusByte),
          matchupReport,
        };
      }
    }

    if (bestMon) {
      return bestMon;
    }

    // 2. Fallback: If OCR detected enemy on screen, construct verified state
    if (screenEnemy && screenEnemy.speciesId) {
      const enemyInfo = GEN1_INTERNAL_POKEMON[screenEnemy.speciesId];
      if (enemyInfo) {
        return {
          speciesId: screenEnemy.speciesId,
          name: enemyInfo.name,
          level: screenEnemy.level,
          curHp: 20,
          maxHp: 20,
          hpPercent: 100,
          type1: enemyInfo.type1,
          type2: enemyInfo.type2,
          statusStr: 'Normal',
          matchupReport: getDefenderMatchupReport(enemyInfo.type1, enemyInfo.type2),
        };
      }
    }

    // 3. Fallback: Check wCurOpponent (0xD059 in Yellow EN, 0xD058 in FR, 0xD057 in RB)
    const oppSpeciesAddr = resolveAddr(0xD059, mmu);
    const oppSpecies = mmu.read(oppSpeciesAddr);
    if (GEN1_INTERNAL_POKEMON[oppSpecies]) {
      const enemyInfo = GEN1_INTERNAL_POKEMON[oppSpecies];
      const levelAddr = resolveAddr(POKEMON_YELLOW_RAM.ENEMY_MON_LEVEL_EN, mmu);
      const rawLevel = mmu.read(levelAddr);
      const safeLevel = rawLevel >= 1 && rawLevel <= 100 ? rawLevel : 5;

      return {
        speciesId: oppSpecies,
        name: enemyInfo.name,
        level: safeLevel,
        curHp: 20,
        maxHp: 20,
        hpPercent: 100,
        type1: enemyInfo.type1,
        type2: enemyInfo.type2,
        statusStr: 'Normal',
        matchupReport: getDefenderMatchupReport(enemyInfo.type1, enemyInfo.type2),
      };
    }

    return null;
  }

  /**
   * Reads the active Player Pokémon in battle with dynamic offset detection.
   */
  private static readPlayerMon(mmu: any): BattlingMonState | null {
    const resolvedBattleBase = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_SPECIES_EN, mmu);
    const candidateOffsets = [0, -1, 1, -2, 2, -3, 3];
    
    // 1. Scan for the full wBattleMon structure around 0xD014
    for (const offset of candidateOffsets) {
      const base = resolvedBattleBase + offset;
      const speciesId = mmu.read(base);
      const playerInfo = GEN1_INTERNAL_POKEMON[speciesId];
      if (!playerInfo) continue;

      const level = mmu.read(base + 14);
      const maxHp = (mmu.read(base + 15) << 8) | mmu.read(base + 16);
      const curHp = (mmu.read(base + 1) << 8) | mmu.read(base + 2);
      const rawType1 = mmu.read(base + 5);
      const rawType2 = mmu.read(base + 6);
      const statusByte = mmu.read(base + 4);

      if (level >= 1 && level <= 100 && maxHp >= 1 && maxHp <= 1500) {
        const type1: PokemonType = RAM_TYPE_MAP[rawType1] || playerInfo.type1;
        const type2: PokemonType | undefined =
          rawType1 !== rawType2 && RAM_TYPE_MAP[rawType2] ? RAM_TYPE_MAP[rawType2] : playerInfo.type2;
        const matchupReport = getDefenderMatchupReport(type1, type2);

        return {
          speciesId,
          name: playerInfo.name,
          level,
          curHp: Math.min(curHp, maxHp),
          maxHp,
          hpPercent: Math.min(100, Math.max(0, Math.round((curHp / maxHp) * 100))),
          type1,
          type2,
          statusStr: this.decodeStatusByte(statusByte),
          matchupReport,
        };
      }
    }

    // 2. Fallback to active party mon or Party Mon 1
    const p1Base = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_BASE_EN, mmu);
    const p1Species = mmu.read(p1Base);
    const playerInfo = GEN1_INTERNAL_POKEMON[p1Species];
    if (playerInfo) {
      const curHp = (mmu.read(p1Base + 1) << 8) | mmu.read(p1Base + 2);
      const maxHp = (mmu.read(p1Base + 34) << 8) | mmu.read(p1Base + 35) || 20;
      const level = mmu.read(p1Base + 33) || 5;
      const matchupReport = getDefenderMatchupReport(playerInfo.type1, playerInfo.type2);

      return {
        speciesId: p1Species,
        name: playerInfo.name,
        level,
        curHp: Math.min(curHp, maxHp),
        maxHp,
        hpPercent: Math.min(100, Math.max(0, Math.round((curHp / maxHp) * 100))),
        type1: playerInfo.type1,
        type2: playerInfo.type2,
        statusStr: 'Normal',
        matchupReport,
      };
    }

    return null;
  }

  /**
   * Reads complete Guide State from the live Game Boy MMU.
   */
  public static readSnapshot(mmu: any): GameGuideSnapshot | null {
    if (!mmu || typeof mmu.read !== 'function') {
      return null;
    }

    try {
      // wIsInBattle in Gen 1:
      // 0 = Overworld (No battle)
      // 1 = Wild Pokémon battle
      // 2 = Trainer battle
      // (Any other value or 0 means Overworld)
      const battleAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_TYPE_EN, mmu);
      const battleVal = mmu.read(battleAddr);
      
      let battleTypeRaw = 0;
      if (battleVal === 1 || battleVal === 2) {
        battleTypeRaw = battleVal;
      } else {
        // Test Red/Blue (0xD057) or French Yellow (0xD055) or nearby offsets strictly for 1 or 2
        const yellowFrVal = mmu.read(0xD055);
        const redBlueVal = mmu.read(0xD057);
        if (yellowFrVal === 1 || yellowFrVal === 2) {
          battleTypeRaw = yellowFrVal;
        } else if (redBlueVal === 1 || redBlueVal === 2) {
          battleTypeRaw = redBlueVal;
        } else {
          // Scan offsets from -3 to +3 around 0xD056 for a valid battle flag (1 or 2)
          for (let off = -3; off <= 3; off++) {
            const v = mmu.read(0xD056 + off);
            if (v === 1 || v === 2) {
              battleTypeRaw = v;
              break;
            }
          }
        }
      }

      let isBattle = battleTypeRaw === 1 || battleTypeRaw === 2;

      // Auxiliary check: Check if battle screen tilemap indicators are present
      // In Gen 1 battle screen, tilemap (0xC3A0) has battle UI text boxes or cursor
      if (!isBattle) {
        const base = resolveAddr(POKEMON_YELLOW_RAM.TILEMAP_BASE_EN, mmu);
        // Look for battle cursor (0xED) or typical battle text
        const r14Base = base + 14 * 20;
        const r16Base = base + 16 * 20;
        let foundBattleTile = false;
        for (let c = 7; c <= 17; c++) {
          if (mmu.read(r14Base + c) === 0xED || mmu.read(r16Base + c) === 0xED) {
            foundBattleTile = true;
            break;
          }
        }
        if (foundBattleTile) {
          isBattle = true;
          battleTypeRaw = 1;
        }
      }

      // Verify that if in battle, we can read a valid enemy Pokémon
      let enemyMonState: BattlingMonState | null = null;
      let playerMonState: BattlingMonState | null = null;

      if (isBattle) {
        enemyMonState = this.readEnemyMon(mmu);
        playerMonState = this.readPlayerMon(mmu);

        // Even if enemy mon is still loading in RAM, don't drop out of battle mode if battleVal is confirmed
        if (!enemyMonState && (battleTypeRaw === 1 || battleTypeRaw === 2)) {
          // Construct fallback enemy mon state
          enemyMonState = {
            speciesId: 1,
            name: 'Enemy Pokémon',
            level: 5,
            curHp: 20,
            maxHp: 20,
            hpPercent: 100,
            type1: 'Normal',
            statusStr: 'Normal',
            matchupReport: getDefenderMatchupReport('Normal', undefined),
          };
        }
      }

      if (isBattle) {
        // ==========================================
        // 1. ACTIVE BATTLE MODE
        // ==========================================
        const tacticalAdvice: string[] = [];
        if (enemyMonState) {
          const { matchupReport } = enemyMonState;
          if (matchupReport.weaknesses.length > 0) {
            const x4Weaknesses = matchupReport.weaknesses.filter((w) => w.multiplier >= 4);
            if (x4Weaknesses.length > 0) {
              tacticalAdvice.push(
                `⚡ Double weakness (4x): ${x4Weaknesses.map((w) => w.type).join(', ')}!`
              );
            } else {
              tacticalAdvice.push(
                `💥 Key weaknesses (2x): ${matchupReport.weaknesses.slice(0, 3).map((w) => w.type).join(', ')}.`
              );
            }
          }

          if (matchupReport.immunities.length > 0) {
            tacticalAdvice.push(
              `🚫 Total immunity (0x): Ineffective with ${matchupReport.immunities.join(', ')} type.`
            );
          }
        }

        const pokedexData = readPokedexFromRAM(mmu);

        return {
          mode: 'battle',
          battleData: {
            isInBattle: true,
            battleType: battleTypeRaw === 1 ? 'wild' : 'trainer',
            playerMon: playerMonState,
            enemyMon: enemyMonState,
            tacticalAdvice,
          },
          pokedexData,
        };
      } else {
        // ==========================================
        // 2. OVERWORLD EXPLORATION MODE
        // ==========================================
        const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);
        const mapId = mmu.read(mapIdAddr);

        const playerXAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
        const playerYAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
        const playerX = mmu.read(playerXAddr);
        const playerY = mmu.read(playerYAddr);

        const rawMapName = POKEMON_YELLOW_MAPS[mapId];
        const mapName = rawMapName || `Kanto Area (ID: 0x${mapId.toString(16).toUpperCase().padStart(2, '0')})`;
        const category = this.categorizeMap(mapId, mapName);

        const wildEncounters = WILD_ENCOUNTERS_BY_MAP[mapId] || undefined;
        const gymLeader = GYM_LEADERS[mapId] || undefined;

        let description = '';
        if (category === 'pokecenter') {
          description = 'Pokécenter — Speak to Nurse Joy at the counter to fully heal your entire team for free.';
        } else if (category === 'city' && !gymLeader) {
          if (mapId === 0x00) description = 'Starting Town. Home to Professor Oak\'s Research Lab and your Rival\'s house.';
          if (mapId === 0x04) description = 'Mystic Town home to the Pokémon Tower and Mr. Fuji\'s Volunteer House.';
          if (mapId === 0x09) description = 'Indigo Plateau — Headquarters of the Pokémon League and the Elite Four.';
        }

        const pokedexData = readPokedexFromRAM(mmu);

        return {
          mode: 'overworld',
          overworldData: {
            mapId,
            mapName,
            locationCategory: category,
            playerX,
            playerY,
            wildEncounters,
            gymLeader,
            description,
          },
          pokedexData,
        };
      }
    } catch (err) {
      console.warn('Guide RAM read error:', err);
      return null;
    }
  }
}
