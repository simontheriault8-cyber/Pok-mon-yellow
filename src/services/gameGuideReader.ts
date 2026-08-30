// Real-Time RAM Guide Reader for Pokémon Yellow / Gen 1
import { resolveAddr, POKEMON_YELLOW_RAM, getRamOffset } from './pokemonYellowRam';
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
    if ((statusByte & 0x07) > 0) return 'Sommeil 💤';
    if ((statusByte & 0x08) > 0) return 'Poison 🟣';
    if ((statusByte & 0x10) > 0) return 'Brûlure 🔥';
    if ((statusByte & 0x20) > 0) return 'Gel ❄️';
    if ((statusByte & 0x40) > 0) return 'Paralysie ⚡';
    return 'Normal';
  }

  /**
   * Categorizes a Gen 1 Map ID into 'city', 'route', 'dungeon', 'pokecenter', or 'indoor'.
   */
  public static categorizeMap(mapId: number, mapName: string): 'route' | 'city' | 'dungeon' | 'pokecenter' | 'indoor' {
    if (mapName.includes('Centre PKMN')) return 'pokecenter';
    if (mapName.startsWith('Route') || mapName.includes('Chenal')) return 'route';
    if (
      mapName.includes('Forêt') ||
      mapName.includes('Mont Sélénite') ||
      mapName.includes('Grotte') ||
      mapName.includes('Cave') ||
      mapName.includes('Îles') ||
      mapName.includes('Centrale')
    ) {
      return 'dungeon';
    }
    if (
      mapId === 0x00 || // Bourg Palette
      mapId === 0x01 || // Jadielle
      mapId === 0x02 || // Argenta
      mapId === 0x03 || // Azuria
      mapId === 0x04 || // Lavanville
      mapId === 0x05 || // Carmin
      mapId === 0x06 || // Céladopole
      mapId === 0x07 || // Parmanie
      mapId === 0x08 || // Cramois'Île
      mapId === 0x09 || // Plateau Indigo
      mapId === 0x0A    // Safrania
    ) {
      return 'city';
    }
    return 'indoor';
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
      const battleTypeRaw = mmu.read(battleTypeAddr);
      const isBattle = battleTypeRaw > 0;

      if (isBattle) {
        // ==========================================
        // 1. COMBAT ACTIF (BATTLE MODE)
        // ==========================================
        const offset = getRamOffset(mmu);

        // ENEMY POKÉMON RAM ADDRESSES:
        // Species: 0xCFE5 (EN) -> resolveAddr(0xCFE5)
        const enemySpeciesAddr = resolveAddr(0xCFE5, mmu);
        const enemyHpBase = resolveAddr(0xCFE6, mmu);
        const enemyStatusAddr = resolveAddr(0xCFE9, mmu);
        const enemyType1Addr = resolveAddr(0xCFEA, mmu);
        const enemyType2Addr = resolveAddr(0xCFEB, mmu);
        const enemyLevelAddr = resolveAddr(0xCFF3, mmu);
        const enemyMaxHpBase = resolveAddr(0xCFF4, mmu);

        const enemySpeciesId = mmu.read(enemySpeciesAddr);
        const enemyCurHp = (mmu.read(enemyHpBase) << 8) | mmu.read(enemyHpBase + 1);
        const enemyMaxHp = Math.max(1, (mmu.read(enemyMaxHpBase) << 8) | mmu.read(enemyMaxHpBase + 1));
        const enemyLevel = mmu.read(enemyLevelAddr);
        const enemyStatus = this.decodeStatusByte(mmu.read(enemyStatusAddr));

        const enemyInfo = GEN1_INTERNAL_POKEMON[enemySpeciesId];
        const rawEnemyType1 = mmu.read(enemyType1Addr);
        const rawEnemyType2 = mmu.read(enemyType2Addr);

        const enemyType1: PokemonType = RAM_TYPE_MAP[rawEnemyType1] || enemyInfo?.type1 || 'Normal';
        const enemyType2: PokemonType | undefined =
          rawEnemyType1 !== rawEnemyType2 && RAM_TYPE_MAP[rawEnemyType2]
            ? RAM_TYPE_MAP[rawEnemyType2]
            : enemyInfo?.type2;

        const enemyMatchup = getDefenderMatchupReport(enemyType1, enemyType2);

        const enemyMonState: BattlingMonState = {
          speciesId: enemySpeciesId,
          name: enemyInfo ? enemyInfo.name : `Pokémon #${enemySpeciesId}`,
          level: enemyLevel > 0 && enemyLevel <= 100 ? enemyLevel : 5,
          curHp: Math.min(enemyCurHp, enemyMaxHp),
          maxHp: enemyMaxHp,
          hpPercent: Math.min(100, Math.max(0, Math.round((enemyCurHp / enemyMaxHp) * 100))),
          type1: enemyType1,
          type2: enemyType2,
          statusStr: enemyStatus,
          matchupReport: enemyMatchup,
        };

        // PLAYER POKÉMON RAM ADDRESSES:
        const playerHpBase = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_HP_EN, mmu);
        const playerMaxHpBase = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MAX_HP_EN, mmu);
        const playerType1Addr = resolveAddr(0xD019, mmu);
        const playerType2Addr = resolveAddr(0xD01A, mmu);
        const playerLevelAddr = resolveAddr(0xD022, mmu);

        // Active mon species from party slot 1 or battle
        const partyMon1SpeciesAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_BASE_EN, mmu);
        const playerSpeciesId = mmu.read(resolveAddr(0xD014, mmu)) || mmu.read(partyMon1SpeciesAddr);
        const playerCurHp = (mmu.read(playerHpBase) << 8) | mmu.read(playerHpBase + 1);
        const playerMaxHp = Math.max(1, (mmu.read(playerMaxHpBase) << 8) | mmu.read(playerMaxHpBase + 1));
        const playerLevel = mmu.read(playerLevelAddr);

        const playerInfo = GEN1_INTERNAL_POKEMON[playerSpeciesId];
        const rawPlayerType1 = mmu.read(playerType1Addr);
        const rawPlayerType2 = mmu.read(playerType2Addr);

        const playerType1: PokemonType = RAM_TYPE_MAP[rawPlayerType1] || playerInfo?.type1 || 'Normal';
        const playerType2: PokemonType | undefined =
          rawPlayerType1 !== rawPlayerType2 && RAM_TYPE_MAP[rawPlayerType2]
            ? RAM_TYPE_MAP[rawPlayerType2]
            : playerInfo?.type2;

        const playerMatchup = getDefenderMatchupReport(playerType1, playerType2);

        const playerMonState: BattlingMonState = {
          speciesId: playerSpeciesId,
          name: playerInfo ? playerInfo.name : 'Mon Pokémon',
          level: playerLevel > 0 && playerLevel <= 100 ? playerLevel : 5,
          curHp: Math.min(playerCurHp, playerMaxHp),
          maxHp: playerMaxHp,
          hpPercent: Math.min(100, Math.max(0, Math.round((playerCurHp / playerMaxHp) * 100))),
          type1: playerType1,
          type2: playerType2,
          statusStr: 'Normal',
          matchupReport: playerMatchup,
        };

        // Tactical Advice formulation:
        const tacticalAdvice: string[] = [];
        if (enemyMatchup.weaknesses.length > 0) {
          const x4Weaknesses = enemyMatchup.weaknesses.filter((w) => w.multiplier >= 4);
          if (x4Weaknesses.length > 0) {
            tacticalAdvice.push(
              `⚡ Double faiblesse (x4) : ${x4Weaknesses.map((w) => w.type).join(', ')} !`
            );
          } else {
            tacticalAdvice.push(
              `💥 Faiblesses (x2) : ${enemyMatchup.weaknesses.slice(0, 3).map((w) => w.type).join(', ')}.`
            );
          }
        }

        if (enemyMatchup.immunities.length > 0) {
          tacticalAdvice.push(
            `🚫 Immunité totale (0x) : Inefficace avec le type ${enemyMatchup.immunities.join(', ')}.`
          );
        }

        return {
          mode: 'battle',
          battleData: {
            isInBattle: true,
            battleType: battleTypeRaw === 1 ? 'wild' : 'trainer',
            playerMon: playerMonState,
            enemyMon: enemyMonState,
            tacticalAdvice,
          },
        };
      } else {
        // ==========================================
        // 2. OVERWORLD EXPLORATION (OVERWORLD MODE)
        // ==========================================
        const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);
        const mapId = mmu.read(mapIdAddr);

        const playerXAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
        const playerYAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
        const playerX = mmu.read(playerXAddr);
        const playerY = mmu.read(playerYAddr);

        const mapName = POKEMON_YELLOW_MAPS[mapId] || `Zone Kanto (ID: 0x${mapId.toString(16).toUpperCase().padStart(2, '0')})`;
        const category = this.categorizeMap(mapId, mapName);

        const wildEncounters = WILD_ENCOUNTERS_BY_MAP[mapId] || undefined;
        const gymLeader = GYM_LEADERS[mapId] || undefined;

        let description = '';
        if (category === 'pokecenter') {
          description = 'Infirmière Joëlle disponible pour soigner gratuitement toute votre équipe.';
        } else if (category === 'city' && !gymLeader) {
          if (mapId === 0x00) description = 'Ville de départ. Laboratoire du Professeur Chen et maison de votre rival.';
          if (mapId === 0x04) description = 'Ville mystique abritant la Tour Pokémon et la Maison des Bénévoles de M. Fuji.';
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
      console.warn('Erreur lecture Guide RAM:', err);
      return null;
    }
  }
}
