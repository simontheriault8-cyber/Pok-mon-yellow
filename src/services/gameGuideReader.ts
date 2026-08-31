// Real-Time RAM Guide Reader for Pokémon Yellow / Gen 1 (English Version)
import { resolveAddr, POKEMON_YELLOW_RAM } from './pokemonYellowRam';
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
   * Reads the active Enemy Pokémon in battle with dynamic offset detection and validation scoring.
   */
  private static readEnemyMon(mmu: any): BattlingMonState | null {
    // In Gen 1, wEnemyMon base addresses:
    // Yellow EN: 0xCFE4
    // Yellow FR: 0xCFE3
    // Red/Blue EN: 0xCFE5
    // Red/Blue FR: 0xCFE4
    const resolvedBase = resolveAddr(POKEMON_YELLOW_RAM.ENEMY_MON_SPECIES_EN, mmu);
    const candidateBases = [
      resolvedBase,
      0xCFE4, // Yellow EN standard
      0xCFE3, // Yellow FR standard
      0xCFE5, // Red/Blue EN standard
      0xCFE2,
      0xCFE6,
    ];

    const uniqueBases = Array.from(new Set(candidateBases));
    let bestCandidate: BattlingMonState | null = null;
    let highestScore = -1;

    for (const base of uniqueBases) {
      const speciesId = mmu.read(base);
      const enemyInfo = GEN1_INTERNAL_POKEMON[speciesId];
      if (!enemyInfo || speciesId === 0 || speciesId > 190) continue;

      const level = mmu.read(base + 14);
      const maxHp = (mmu.read(base + 15) << 8) | mmu.read(base + 16);
      const curHp = (mmu.read(base + 1) << 8) | mmu.read(base + 2);
      const rawType1 = mmu.read(base + 5);
      const rawType2 = mmu.read(base + 6);
      const statusByte = mmu.read(base + 4);

      // Sanity checks on battle struct values
      if (level < 1 || level > 100) continue;
      if (maxHp < 5 || maxHp > 1200) continue;
      if (curHp > maxHp + 20) continue;

      // Scoring criteria to avoid false matches
      let score = 20;

      const mappedType1 = RAM_TYPE_MAP[rawType1];
      const mappedType2 = RAM_TYPE_MAP[rawType2];

      if (mappedType1) score += 15;
      if (mappedType2) score += 15;

      if (mappedType1 === enemyInfo.type1 || mappedType1 === enemyInfo.type2) {
        score += 30;
      }
      if (mappedType2 === enemyInfo.type2 || mappedType2 === enemyInfo.type1) {
        score += 20;
      }

      // Check wEnemyMonSpecies2 (opponent species indicator at 0xCFD8 in Yellow EN / 0xCFD7 in FR)
      const oppSpecies1 = mmu.read(0xCFD8);
      const oppSpecies2 = mmu.read(0xCFD7);
      if (oppSpecies1 === speciesId || oppSpecies2 === speciesId) {
        score += 40;
      }

      if (curHp <= maxHp) {
        score += 10;
      }

      if (score > highestScore) {
        highestScore = score;
        const type1: PokemonType = mappedType1 || enemyInfo.type1;
        const type2: PokemonType | undefined =
          mappedType1 !== mappedType2 && mappedType2 ? mappedType2 : enemyInfo.type2;
        const matchupReport = getDefenderMatchupReport(type1, type2);

        bestCandidate = {
          speciesId,
          name: enemyInfo.name,
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

    if (bestCandidate && highestScore >= 30) {
      return bestCandidate;
    }

    // 2. Fallback: Check auxiliary opponent species RAM locations (e.g. wEnemyMonSpecies2 / wCurOpponent)
    const fallbackAddrs = [resolveAddr(POKEMON_YELLOW_RAM.ENEMY_MON_SPECIES2_EN, mmu), 0xCFD8, 0xCFD7];
    for (const addr of fallbackAddrs) {
      const speciesId = mmu.read(addr);
      const enemyInfo = GEN1_INTERNAL_POKEMON[speciesId];
      if (enemyInfo && speciesId > 0 && speciesId <= 190) {
        const type1 = enemyInfo.type1;
        const type2 = enemyInfo.type2;
        const matchupReport = getDefenderMatchupReport(type1, type2);

        return {
          speciesId,
          name: enemyInfo.name,
          level: 5,
          curHp: 20,
          maxHp: 20,
          hpPercent: 100,
          type1,
          type2,
          statusStr: 'Normal',
          matchupReport,
        };
      }
    }

    return null;
  }

  /**
   * Reads the active Player Pokémon in battle with dynamic offset detection.
   */
  private static readPlayerMon(mmu: any): BattlingMonState | null {
    const resolvedBase = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_SPECIES_EN, mmu);
    const candidateBases = [
      resolvedBase,
      0xD014, // Yellow EN
      0xD013, // Yellow FR
      0xD015, // Red/Blue EN
      0xD012,
      0xD016,
    ];

    const uniqueBases = Array.from(new Set(candidateBases));
    let bestCandidate: BattlingMonState | null = null;
    let highestScore = -1;

    for (const base of uniqueBases) {
      const speciesId = mmu.read(base);
      const playerInfo = GEN1_INTERNAL_POKEMON[speciesId];
      if (!playerInfo || speciesId === 0 || speciesId > 190) continue;

      const level = mmu.read(base + 14);
      const maxHp = (mmu.read(base + 15) << 8) | mmu.read(base + 16);
      const curHp = (mmu.read(base + 1) << 8) | mmu.read(base + 2);
      const rawType1 = mmu.read(base + 5);
      const rawType2 = mmu.read(base + 6);
      const statusByte = mmu.read(base + 4);

      if (level < 1 || level > 100) continue;
      if (maxHp < 5 || maxHp > 1200) continue;
      if (curHp > maxHp + 20) continue;

      let score = 20;
      const mappedType1 = RAM_TYPE_MAP[rawType1];
      const mappedType2 = RAM_TYPE_MAP[rawType2];

      if (mappedType1) score += 15;
      if (mappedType2) score += 15;

      if (mappedType1 === playerInfo.type1 || mappedType1 === playerInfo.type2) {
        score += 30;
      }
      if (mappedType2 === playerInfo.type2 || mappedType2 === playerInfo.type1) {
        score += 20;
      }

      if (curHp <= maxHp) {
        score += 10;
      }

      if (score > highestScore) {
        highestScore = score;
        const type1: PokemonType = mappedType1 || playerInfo.type1;
        const type2: PokemonType | undefined =
          mappedType1 !== mappedType2 && mappedType2 ? mappedType2 : playerInfo.type2;
        const matchupReport = getDefenderMatchupReport(type1, type2);

        bestCandidate = {
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

    if (bestCandidate && highestScore >= 30) {
      return bestCandidate;
    }

    // 2. Fallback to Party Mon 1
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
      const battleTypeAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_TYPE_EN, mmu);
      const battleTypeVal = mmu.read(battleTypeAddr);
      // In Pokémon Gen 1 (Yellow / Red / Blue), wIsInBattle (0xD057 in EN, 0xD056 in FR):
      // 0 = Overworld (not in combat)
      // 1 = Wild Pokémon battle
      // 2 = Trainer battle
      const isBattle = battleTypeVal === 1 || battleTypeVal === 2;

      if (isBattle) {
        // ==========================================
        // 1. ACTIVE BATTLE MODE
        // ==========================================
        const enemyMonState = this.readEnemyMon(mmu);
        const playerMonState = this.readPlayerMon(mmu);

        // Tactical Advice formulation:
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

        return {
          mode: 'battle',
          battleData: {
            isInBattle: true,
            battleType: battleTypeVal === 1 ? 'wild' : 'trainer',
            playerMon: playerMonState,
            enemyMon: enemyMonState,
            tacticalAdvice,
          },
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
        };
      }
    } catch (err) {
      console.warn('Guide RAM read error:', err);
      return null;
    }
  }
}
