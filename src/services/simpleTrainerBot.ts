// Pokemon Yellow / Yellow 151 Trainer Bot Service with Live Decision & Action Logger
// Direct RAM Read/Write decisions optimized for Pokémon Yellow (Special Pikachu Edition & Yellow 151 Hack)
// - Supports auto-switch to next alive Pokémon when active Pokémon faints in battle (2x 'A' -> select next -> 'A')
// - Auto safety stop when only 1 alive Pokémon remains in the entire party.

import { GameBoy } from '../emulator/gameboy';
import { POKEMON_YELLOW_RAM, resolveAddr } from './pokemonYellowRam';

export type TrainerBotState = 'idle' | 'walking' | 'battling';

export type TrainerBotMode = 'continuous_battle' | 'train_slot_1';

export interface BotModeInfo {
  id: TrainerBotMode;
  name: string;
  shortDesc: string;
  description: string;
}

export const BOT_MODES: BotModeInfo[] = [
  {
    id: 'continuous_battle',
    name: 'Combat continu',
    shortDesc: 'Farming standard avec Pokémon actif',
    description: 'Combats en boucle avec le Pokémon actif. Switch automatique uniquement en cas de K.O.'
  },
  {
    id: 'train_slot_1',
    name: 'Entraînement premier Pokémon',
    shortDesc: 'Rotation niv. max & fuite/soin auto',
    description: 'Envoie le Slot 1 puis switch au T1. Si 1 seul Pokémon vivant reste, fuite du combat puis soin auto en Centre Pokémon et reprise. Échange automatique au niveau max.'
  }
];

export interface BotLogEntry {
  id: string;
  time: string;
  type: 'info' | 'walk' | 'battle' | 'move' | 'safety' | 'stop';
  message: string;
}

export interface PartyMonStatus {
  slot: number;
  curHp: number;
  maxHp: number;
  level: number;
}

export interface PartyStatus {
  isValid: boolean;
  totalMons: number;
  aliveMons: number;
  faintedMons: number;
  monsHp: PartyMonStatus[];
}

export class SimpleTrainerBot {
  private emulator: GameBoy | null = null;
  private isRunning: boolean = false;
  private timer: number | null = null;
  private stepBusy: boolean = false;

  // Bot Internal State
  private state: TrainerBotState = 'idle';
  private mode: TrainerBotMode = 'continuous_battle';
  private walkStep: number = 0;
  private lastX: number = -1;
  private lastY: number = -1;
  private stuckCounter: number = 0;
  private wasInBattle: boolean = false;
  private lastLoggedSlot: number = -1;
  private lastLogTimestamp: number = 0;
  private isSwitchingPokemon: boolean = false;
  private switchCooldownUntil: number = 0;
  private consecutiveSafetyCount: number = 0;
  private activeMonIndex: number = 0;
  private faintedSlotsInBattle: Set<number> = new Set();
  private hasSwitchedToLastMonInCurrentBattle: boolean = false;
  private hasEnteredBattleInCurrentBattle: boolean = false;
  private startTime: number | null = null;
  private targetLevel: number = 50; // Target level for slot 1 training rotation

  // Cached Party Status (guarantees safe fallback during RAM transitions)
  private cachedPartyStatus: PartyStatus = {
    isValid: false,
    totalMons: 1,
    aliveMons: 1,
    faintedMons: 0,
    monsHp: [{ slot: 1, curHp: 20, maxHp: 20, level: 1 }]
  };

  // Live Logs History (Max 200 entries)
  private logs: BotLogEntry[] = [];

  // Callbacks
  public onStateChange?: (isRunning: boolean, state: TrainerBotState) => void;
  public onModeChange?: (mode: TrainerBotMode) => void;
  public onLogsUpdate?: (logs: BotLogEntry[]) => void;
  public onAutoHealRequest?: () => void;

  constructor(emulator?: GameBoy | null) {
    if (emulator) {
      this.emulator = emulator;
    }
  }

  public setEmulator(emulator: GameBoy | null): void {
    this.emulator = emulator;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getState(): TrainerBotState {
    return this.state;
  }

  public getTargetLevel(): number {
    return this.targetLevel;
  }

  public setTargetLevel(level: number): void {
    const validLevel = Math.min(100, Math.max(1, Math.floor(level)));
    if (this.targetLevel !== validLevel) {
      this.targetLevel = validLevel;
      this.addLog('info', `🎯 Niveau max cible configuré : Niveau ${this.targetLevel}`);
    }
  }

  public getMode(): TrainerBotMode {
    return this.mode;
  }

  public setMode(mode: TrainerBotMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      const modeInfo = BOT_MODES.find((m) => m.id === mode);
      this.addLog('info', `⚙️ Mode changé : ${modeInfo ? modeInfo.name : mode}`);
      if (this.onModeChange) {
        this.onModeChange(this.mode);
      }
    }
  }

  public getStartTime(): number | null {
    return this.startTime;
  }

  public getLogs(): BotLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.addLog('info', 'Journal d\'actions effacé.');
  }

  public addLog(type: BotLogEntry['type'], message: string): void {
    let timeStr = '';
    if (this.startTime) {
      const elapsed = Date.now() - this.startTime;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      const ms = elapsed % 1000;
      timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    } else {
      const now = new Date();
      timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }
    
    const entry: BotLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      time: timeStr,
      type,
      message
    };

    this.logs.unshift(entry);
    if (this.logs.length > 200) {
      this.logs.pop();
    }

    if (this.onLogsUpdate) {
      this.onLogsUpdate([...this.logs]);
    }
  }

  public start(): void {
    if (!this.emulator || !this.emulator.isRunning) {
      this.addLog('info', '⚠️ Impossible de démarrer : Aucune émulation active.');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.walkStep = 0;
    this.stuckCounter = 0;
    this.lastX = -1;
    this.lastY = -1;
    this.wasInBattle = false;
    this.hasEnteredBattleInCurrentBattle = false;
    this.faintedSlotsInBattle.clear();
    this.lastLoggedSlot = -1;
    this.isSwitchingPokemon = false;
    this.switchCooldownUntil = 0;
    this.consecutiveSafetyCount = 0;
    this.hasSwitchedToLastMonInCurrentBattle = false;
    this.state = 'walking';
    this.notifyState();

    const modeInfo = BOT_MODES.find((m) => m.id === this.mode);
    this.addLog('info', `🟢 Bot activé [Mode: ${modeInfo?.name || this.mode}] (Gestion automatique de l'équipe & switch)`);
    this.scheduleNextTick(50);
  }

  public stop(reason?: string): void {
    this.isRunning = false;
    this.isSwitchingPokemon = false;
    this.switchCooldownUntil = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.releaseAllKeys();
    this.state = 'idle';
    this.notifyState();

    if (reason) {
      this.addLog('safety', `🛑 Arrêt : ${reason}`);
    } else {
      this.addLog('stop', '⏹️ Bot arrêté par l\'utilisateur.');
    }
  }

  public toggle(): void {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  private scheduleNextTick(delayMs: number): void {
    if (!this.isRunning) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.tick();
    }, delayMs);
  }

  /**
   * Helper to evaluate a candidate RAM layout for party structs
   */
  private tryParseParty(mmu: any, baseHpAddr: number, baseMaxHpAddr: number, countAddr: number): PartyStatus | null {
    const rawCount = mmu.read(countAddr);
    const monsHp: PartyMonStatus[] = [];
    let aliveMons = 0;
    let validSlots = 0;
    const baseMonAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_BASE_EN, mmu);

    for (let i = 0; i < 6; i++) {
      const offset = i * POKEMON_YELLOW_RAM.PARTY_STRUCT_SIZE;
      const curHp = (mmu.read(baseHpAddr + offset) << 8) | mmu.read(baseHpAddr + offset + 1);
      const maxHp = (mmu.read(baseMaxHpAddr + offset) << 8) | mmu.read(baseMaxHpAddr + offset + 1);

      let level = mmu.read(baseMonAddr + offset + 33);
      if (level < 1 || level > 100) {
        const boxLevel = mmu.read(baseMonAddr + offset + 3);
        if (boxLevel >= 1 && boxLevel <= 100) {
          level = boxLevel;
        } else {
          level = 1;
        }
      }

      // Validate: Gen 1 Pokemon Max HP is between 5 and 999, and curHp cannot exceed maxHp by large margin
      if (maxHp >= 5 && maxHp <= 999 && curHp <= maxHp + 100) {
        validSlots++;
        monsHp.push({ slot: i + 1, curHp, maxHp, level });
        if (curHp > 0) {
          aliveMons++;
        }
      }
    }

    // A valid party structure must contain at least 1 verified Pokémon slot
    if (validSlots > 0) {
      const totalMons = (rawCount >= 1 && rawCount <= 6) ? Math.max(validSlots, rawCount) : validSlots;
      return {
        isValid: true,
        totalMons,
        aliveMons,
        faintedMons: Math.max(0, totalMons - aliveMons),
        monsHp
      };
    }

    return null;
  }

  /**
   * Robust Party Status Inspector:
   * Tests both English and French RAM offsets dynamically to find valid Pokémon data.
   */
  private getPartyStatus(mmu: any): PartyStatus {
    const pCountAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_COUNT_EN, mmu);
    const pHpBase = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_HP_EN, mmu);
    const pMaxHpBase = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_MAX_HP_EN, mmu);
    
    const party = this.tryParseParty(mmu, pHpBase, pMaxHpBase, pCountAddr);
    if (party && party.isValid) {
      this.cachedPartyStatus = party;
      return party;
    }
    
    if (this.cachedPartyStatus) return { ...this.cachedPartyStatus, isValid: false };
    return { aliveMons: 0, totalMons: 0, faintedMons: 0, monsHp: [], isValid: false };
  }

  /**
   * Main Bot Loop Iteration guided by Pokemon Yellow / Yellow 151 RAM
   */
  private async tick(): Promise<void> {
    if (!this.isRunning || !this.emulator || this.stepBusy) return;

    this.stepBusy = true;
    try {
      const mmu = this.emulator.mmu;
      if (!mmu || typeof mmu.read !== 'function') {
        this.scheduleNextTick(150);
        return;
      }

      const now = Date.now();

      // =========================================================================
      // 1. POKÉMON YELLOW RAM: Battle State & Active Mon HP Check
      // =========================================================================
      const battleAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_TYPE_EN, mmu);
      const battleVal = mmu.read(battleAddr);
      
      // In Gen 1 Yellow, 0xD057 is 1 (Wild) or 2 (Trainer) during battle, and 0 outside battle.
      const inBattle = battleVal === 1 || battleVal === 2;

      let curBattleHp = 0;
      let maxBattleHp = 0;

      if (inBattle) {
        const hpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_HP_EN, mmu);
        const maxHpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MAX_HP_EN, mmu);
        curBattleHp = (mmu.read(hpAddr) << 8) | mmu.read(hpAddr + 1);
        maxBattleHp = (mmu.read(maxHpAddr) << 8) | mmu.read(maxHpAddr + 1);

        // Dès que le Pokémon actif entre en jeu avec des PV > 0 ou que le menu 2x2 apparaît,
        // on confirme qu'on a dépassé l'animation d'introduction du combat.
        if (curBattleHp > 0 || this.isBattleMenu2x2Visible(mmu)) {
          this.hasEnteredBattleInCurrentBattle = true;
        }
      }

      // =========================================================================
      // 2. POKÉMON YELLOW RAM: Party Health & Safety Rule
      // Condition: S'il ne reste qu'un seul Pokémon en vie dans l'équipe -> Arrêt automatique de sécurité
      // =========================================================================
      const partyStatus = this.getPartyStatus(mmu);

      // Si le Pokémon actif est RÉELLEMENT K.O. en combat (combat engagé + PV = 0)
      if (inBattle && this.hasEnteredBattleInCurrentBattle && curBattleHp === 0 && maxBattleHp > 0) {
        this.faintedSlotsInBattle.add(this.activeMonIndex);
        if (partyStatus.monsHp[this.activeMonIndex]) {
          partyStatus.monsHp[this.activeMonIndex].curHp = 0;
        }
      }

      // Synchroniser tous les slots marqués K.O. durant le combat
      if (inBattle && this.faintedSlotsInBattle.size > 0) {
        for (const fSlot of this.faintedSlotsInBattle) {
          if (partyStatus.monsHp[fSlot]) {
            partyStatus.monsHp[fSlot].curHp = 0;
          }
        }
        partyStatus.aliveMons = partyStatus.monsHp.filter((m, idx) => m.curHp > 0 && !this.faintedSlotsInBattle.has(idx)).length;
        partyStatus.faintedMons = partyStatus.totalMons - partyStatus.aliveMons;
      }

      if (partyStatus.isValid && now > this.switchCooldownUntil) {
        // Arrêt si toute l'équipe est K.O.
        let isKillSwitch = false;
        if (partyStatus.totalMons > 0 && partyStatus.aliveMons === 0) {
          isKillSwitch = true;
        }

        if (isKillSwitch) {
          this.consecutiveSafetyCount++;
          if (this.consecutiveSafetyCount >= 4) {
            this.stop(`Sécurité équipe : Tous les Pokémon sont K.O. (0/${partyStatus.totalMons} vivant).`);
            return;
          }
        } else {
          this.consecutiveSafetyCount = 0;
        }
      }

      // =========================================================================
      // 2.5 MOVE LEARNING DETECTION (Safety Stop if Pokémon already has 4 moves)
      // If a Pokémon levels up and tries to learn a new move with 4 moves already known,
      // the game asks to delete a move to make room. The bot stops to let the player decide.
      // =========================================================================
      const moveLearnPrompt = this.detectMoveLearnPrompt(mmu);
      if (moveLearnPrompt.isLearning) {
        this.stop(`Apprentissage d'attaque : ${moveLearnPrompt.reason}. Choisissez quelle attaque conserver ou oublier.`);
        return;
      }

      // =========================================================================
      // 3. ACTIVE MON FAINTED IN BATTLE -> AUTO-SWITCH HANDLER
      // Si le Pokémon actif tombe RÉELLEMENT K.O. en combat (PV = 0) et qu'il reste d'autres Pokémon vivants
      // =========================================================================
      if (inBattle && this.hasEnteredBattleInCurrentBattle && curBattleHp === 0 && maxBattleHp > 0) {
        this.state = 'battling';
        this.notifyState();

        if (partyStatus.aliveMons >= 1) {
          if (!this.isSwitchingPokemon && now > this.switchCooldownUntil) {
            await this.handleFaintedSwitch(mmu, partyStatus);
          }
          // IMPORTANT : Ne jamais exécuter handleBattle (attaque [A]) tant que le Pokémon actif est à 0 PV !
          this.scheduleNextTick(200);
          return;
        }
      }

      // =========================================================================
      // 4. ACTION DISPATCH: Battle vs Overworld
      // =========================================================================
      if (inBattle) {
        if (!this.wasInBattle) {
          this.wasInBattle = true;
          this.hasEnteredBattleInCurrentBattle = false;
          this.hasSwitchedToLastMonInCurrentBattle = false;
          this.activeMonIndex = 0;
          this.faintedSlotsInBattle.clear();
          this.lastLoggedSlot = -1;
          const hpStr = maxBattleHp > 0 ? `${curBattleHp}/${maxBattleHp} PV` : 'Initialisation...';
          const modeInfo = BOT_MODES.find((m) => m.id === this.mode);
          this.addLog('battle', `⚔️ [RAM: 0xD057=0x0${battleVal}] Combat engagé ! Actif: Slot ${this.activeMonIndex + 1} (${hpStr}) | Équipe: ${partyStatus.aliveMons}/${partyStatus.totalMons} vivants | Mode: ${modeInfo?.name}`);
        }
        this.state = 'battling';
        this.notifyState();

        // Mode Entraînement Premier Pokémon : Switch au Tour 1 vers le dernier Pokémon vivant de l'équipe
        if (this.mode === 'train_slot_1' && !this.hasSwitchedToLastMonInCurrentBattle && curBattleHp > 0) {
          // Si le sac d'objets est ouvert, le fermer immédiatement
          if (this.isItemBagOpen(mmu)) {
            await this.tapKey('b', 70);
            await this.wait(140);
            this.scheduleNextTick(100);
            return;
          }

          // Trouver le dernier Pokémon vivant dans l'équipe (index > 0)
          let lastAliveIndex = -1;
          for (let i = partyStatus.monsHp.length - 1; i >= 1; i--) {
            if (partyStatus.monsHp[i].curHp > 0) {
              lastAliveIndex = i;
              break;
            }
          }

          if (lastAliveIndex > 0) {
            if (!this.isSwitchingPokemon && now > this.switchCooldownUntil) {
              await this.handleManualSwitchToMon(mmu, partyStatus, lastAliveIndex);
            }
            this.scheduleNextTick(150);
            return;
          } else {
            // Aucun autre Pokémon vivant disponible dans les slots 2..6
            this.hasSwitchedToLastMonInCurrentBattle = true;
          }
        }

        await this.handleBattle(mmu);
        this.scheduleNextTick(100);
      } else {
        if (this.wasInBattle) {
          this.wasInBattle = false;
          this.hasEnteredBattleInCurrentBattle = false;
          this.hasSwitchedToLastMonInCurrentBattle = false;
          this.activeMonIndex = 0;
          this.faintedSlotsInBattle.clear();
          this.lastLoggedSlot = -1;
          this.lastX = -1;
          this.lastY = -1;
          this.stuckCounter = 0;
          this.addLog('info', `🏆 [RAM: 0xD057=0x00] Victoire/Fin du combat -> Attente de la carte (${partyStatus.aliveMons}/${partyStatus.totalMons} Pokémon vivants)`);
          // Nettoyer les dialogues post-combat et attendre la fin du fondu
          await this.handlePostBattle(mmu);

          // Évaluation du niveau max du Slot 1 et rotation d'équipe au retour dans l'overworld
          if (this.mode === 'train_slot_1' && this.targetLevel > 0) {
            await this.checkAndHandleTargetLevelSwitch(mmu);
            if (!this.isRunning) return;
          }
        }

        // Mode Entraînement 1er Pokémon : Si 1 seul Pokémon restant en vie, pause et déclenchement du Bot Soin auto !
        if (this.mode === 'train_slot_1' && partyStatus.totalMons > 1 && partyStatus.aliveMons <= 1) {
          this.addLog('info', `🩺 [Sécurité Entraînement] 1 seul Pokémon en vie (Slot 1) -> Activation automatique du Bot Soin (Centre Pokémon)...`);
          this.isRunning = false;
          this.notifyState();
          if (this.onAutoHealRequest) {
            this.onAutoHealRequest();
          }
          return;
        }

        this.state = 'walking';
        this.notifyState();
        await this.handleOverworld(mmu);
        this.scheduleNextTick(110);
      }
    } catch (err) {
      console.error('Erreur bot RAM:', err);
      this.scheduleNextTick(150);
    } finally {
      this.stepBusy = false;
    }
  }

  /**
   * Detects if a Pokémon is attempting to learn a new move and already has 4 moves.
   * In Pokémon Yellow (and Red/Blue), when a Pokémon with 4 moves levels up and wants to learn a move:
   * 1. Screen displays: "{MON} is trying to learn {MOVE}!" / "But {MON} can't learn more than 4 moves!"
   * 2. Followed by: "Delete an older move to make room for {MOVE}?" with a YES/NO prompt.
   * 3. Or French: "{MON} veut apprendre {ATTAQUE}!" / "Supprimer une ancienne attaque...?"
   *
   * If detected, returns { isLearning: true, reason: string } so the bot can safely pause.
   */
  private detectMoveLearnPrompt(mmu: any): { isLearning: boolean; reason: string } {
    if (!mmu) return { isLearning: false, reason: '' };

    // Inspect the lower dialog rows 12..17 in the tilemap buffer (0xC3A0)
    let screenFullText = '';
    for (let r = 12; r <= 17; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (line) {
        screenFullText += ' ' + line;
      }
    }

    // Check English / French signature keywords for move learning with 4 moves
    const isMoveLearnAttempt =
      screenFullText.includes('TRYING TO LEARN') ||
      screenFullText.includes('LEARN MORE THAN 4') ||
      screenFullText.includes('DELETE A MOVE') ||
      screenFullText.includes('DELETE AN OLDER') ||
      screenFullText.includes('MAKE ROOM FOR') ||
      screenFullText.includes('VEUT APPRENDRE') ||
      screenFullText.includes('SUPPRIMER UNE') ||
      screenFullText.includes('OUBLIER UNE') ||
      screenFullText.includes('EFFACER UNE');

    if (isMoveLearnAttempt) {
      // Check if Pokémon already knows 4 moves in party struct
      const partyStatus = this.getPartyStatus(mmu);
      const monIndex = this.activeMonIndex;
      let knownMovesCount = 4; // Default safe assumption if learning attempt is detected

      const partyMovesBase = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_MOVES_EN, mmu);
      if (monIndex >= 0 && monIndex < partyStatus.totalMons) {
        const offset = monIndex * POKEMON_YELLOW_RAM.PARTY_STRUCT_SIZE;
        let count = 0;
        for (let m = 0; m < 4; m++) {
          const moveId = mmu.read(partyMovesBase + offset + m);
          if (moveId > 0 && moveId !== 0xFF) {
            count++;
          }
        }
        if (count > 0) {
          knownMovesCount = count;
        }
      }

      // If Pokémon has 4 moves (or already at capacity), stop immediately!
      if (knownMovesCount >= 4 || screenFullText.includes('DELETE') || screenFullText.includes('SUPPRIMER') || screenFullText.includes('MORE THAN 4')) {
        return {
          isLearning: true,
          reason: `Nouvelle capacité détectée (4/4 attaques déjà connues)`
        };
      }
    }

    return { isLearning: false, reason: '' };
  }

  /**
   * Character map decoder for Generation 1 Pokémon (Yellow / Red / Blue).
   * Maps Game Boy byte values (0x80..0xFF) to readable ASCII characters.
   */
  private decodeChar(byteVal: number): string {
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
      case 0xE7: return '!';
      case 0xE8: return '?';
      case 0xE6: return '...';
      case 0xEE: return '▼'; // More text prompt arrow
      case 0xED: return '▶'; // Menu cursor arrow
      case 0xF3: return '/'; // Slash
      case 0xBA: return 'é';
      case 0xBB: return '\'d';
      case 0xBC: return '\'l';
      case 0xBD: return '\'s';
      case 0xBE: return '\'t';
      case 0xBF: return '\'v';
      default: return '';
    }
  }

  /**
   * Reads and decodes a line from the Game Boy screen tilemap (0xC3A0).
   */
  private readScreenLine(mmu: any, startAddr: number, length: number = 18): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const b = mmu.read(startAddr + i);
      const ch = this.decodeChar(b);
      if (ch) result += ch;
    }
    return result.trim();
  }

  /**
   * Get currently displayed text in the lower screen dialogue box.
   */
  private getScreenDialogueText(mmu: any): { line1: string; line2: string; hasPromptArrow: boolean } {
    const l1Addr = resolveAddr(POKEMON_YELLOW_RAM.TEXTBOX_LINE1_EN, mmu);
    const l2Addr = resolveAddr(POKEMON_YELLOW_RAM.TEXTBOX_LINE2_EN, mmu);

    const line1 = this.readScreenLine(mmu, l1Addr, 18);
    const line2 = this.readScreenLine(mmu, l2Addr, 18);

    // Check if prompt arrow (▼ = 0xEE) is present in the lower right of dialogue box
    const arrowAddr = l2Addr + 17;
    const hasPromptArrow = mmu.read(arrowAddr) === 0xEE || mmu.read(arrowAddr - 1) === 0xEE;

    return { line1, line2, hasPromptArrow };
  }

  /**
   * Helper to check if a text/dialogue box is actively drawn on the lower screen (rows 12..17).
   */
  private isTextBoxActiveOnScreen(mmu: any): boolean {
    if (!mmu) return false;
    const tilemapBase = resolveAddr(POKEMON_YELLOW_RAM.TILEMAP_BASE_EN, mmu);
    let boxBorderCount = 0;
    let textCharCount = 0;

    for (let row = 12; row <= 17; row++) {
      const rowAddr = tilemapBase + row * 20;
      for (let col = 0; col < 20; col++) {
        const tile = mmu.read(rowAddr + col);
        if (tile === 0x70 || tile === 0x71 || tile === 0x72 || tile === 0x73 || tile === 0x78) {
          boxBorderCount++;
        }
        if (
          (tile >= 0x80 && tile <= 0x99) ||
          (tile >= 0xA0 && tile <= 0xB9) ||
          (tile >= 0xF6 && tile <= 0xFF) ||
          (tile >= 0xE7 && tile <= 0xEE)
        ) {
          textCharCount++;
        }
      }
    }
    return boxBorderCount >= 4 || textCharCount >= 4;
  }

  /**
   * Handle Pokémon Fainted Switch in Battle:
   * 1. Détection réactive de la fin du message de K.O. et de la question "Changer de Pokémon ? (Oui/Non)".
   * 2. Transition vers le menu de l'équipe (wTopMenuItemY == 1).
   * 3. Navigation contrôlée en RAM vers le Pokémon vivant cible.
   * 4. Envoi et validation du Pokémon au combat.
   */
  private async handleFaintedSwitch(mmu: any, partyStatus: PartyStatus): Promise<void> {
    if (this.isSwitchingPokemon) return;
    this.isSwitchingPokemon = true;

    try {
      // 1. Trouver l'index du prochain Pokémon vivant disponible
      let nextAliveIndex = -1;
      
      if (this.mode === 'train_slot_1') {
        // En mode entraînement, on privilégie les Pokémon de la fin (ex: Slot 6, puis 5, 4...)
        // On évite le Slot 1 (index 0) car c'est lui qu'on entraîne
        for (let i = partyStatus.monsHp.length - 1; i >= 1; i--) {
          const isFainted = this.faintedSlotsInBattle.has(i) || partyStatus.monsHp[i].curHp === 0 || i === this.activeMonIndex;
          if (!isFainted && partyStatus.monsHp[i].curHp > 0) {
            nextAliveIndex = i;
            break;
          }
        }
      } else {
        // Mode continu : du premier au dernier
        for (let i = 0; i < partyStatus.monsHp.length; i++) {
          const isFainted = this.faintedSlotsInBattle.has(i) || partyStatus.monsHp[i].curHp === 0 || i === this.activeMonIndex;
          if (!isFainted && partyStatus.monsHp[i].curHp > 0) {
            nextAliveIndex = i;
            break;
          }
        }
      }

      if (nextAliveIndex === -1) {
        // En mode entraînement, si tous les slots 2..6 sont KO, nextAliveIndex est -1.
        // Si Slot 1 est encore en vie (partyStatus.aliveMons === 1), on va fuir via le prompt "Changer de Pokémon ? NON".
        if (partyStatus.aliveMons === 0) {
          this.stop('Tous les Pokémon de l\'équipe sont K.O.');
          return;
        }
      }

      const cursorAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_CURSOR_EN, mmu);
      const topMenuYAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu);
      const topMenuXAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu);
      const maxItemAddr = resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu);
      const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);

      // Stratégie de fuite automatique par le prompt :
      // Si seul 1 Pokémon reste en vie (avant-dernier KO) ou plus aucun Pokémon d'attaque disponible dans les slots 2..6
      const shouldFleeViaPrompt =
        (this.mode === 'train_slot_1' && (nextAliveIndex === -1 || partyStatus.aliveMons <= 1)) ||
        (partyStatus.totalMons > 1 && partyStatus.aliveMons <= 1);

      if (shouldFleeViaPrompt) {
        this.addLog('safety', `🏃 [Sécurité Fuite] Avant-dernier Pokémon K.O. (${partyStatus.aliveMons}/${partyStatus.totalMons} vivant) -> Préparation du refus "Changer de Pokémon ? NON"...`);
      } else {
        this.addLog('safety', `💀 Pokémon actif K.O. ! Commande de switch vers Slot ${nextAliveIndex + 1} (${partyStatus.monsHp[nextAliveIndex]?.curHp}/${partyStatus.monsHp[nextAliveIndex]?.maxHp} PV).`);
      }

      // Étape 1 : Attendre et naviguer jusqu'à l'écran de sélection de l'équipe (wTopMenuItemY == 1) ou refuser avec "NON"
      this.addLog('move', '🔄 Purge du message de K.O... Attente du prompt / menu Équipe (RAM)');
      let partyMenuReady = false;
      let attempts = 0;

      while (!partyMenuReady && attempts < 50) {
        const topY = mmu.read(topMenuYAddr);
        const topX = mmu.read(topMenuXAddr);

        // Menu Équipe détecté (Dans Gen 1, l'écran d'équipe a TopMenuItemY == 1)
        if (topY === 1) {
          partyMenuReady = true;
          break;
        }

        // Si le prompt "Changer de Pokémon ?" (Oui/Non) est actif (Y=10, X=14)
        if (topY === 10 && topX === 14) {
          if (shouldFleeViaPrompt) {
            this.addLog('safety', '🏃 [Fuite Automatique] Prompt "Changer de Pokémon ?" détecté -> Sélection de "NON" (bas + A) pour fuir le combat immédiatement !');
            const cur = mmu.read(cursorAddr);
            if (cur !== 1) {
              // Positionner sur "NON" (index 1)
              await this.tapKey('down', 60);
              await this.wait(100);
            }
            await this.tapKey('a', 70);
            await this.wait(200);

            // Attendre la fin du combat et purger l'écran post-fuite
            let fleeAttempts = 0;
            while (mmu.read(joyIgnoreAddr) > 0 && fleeAttempts < 25) {
              await this.wait(80);
              fleeAttempts++;
            }
            await this.handlePostBattle(mmu);
            return;
          } else {
            const cur = mmu.read(cursorAddr);
            if (cur !== 0) {
              // Positionner sur "OUI" (index 0)
              await this.tapKey('up', 60);
              await this.wait(100);
            }
            await this.tapKey('a', 60);
            await this.wait(200);
          }
        } else {
          // Faire défiler les dialogues ("NIDORAN est K.O.!", etc.)
          await this.tapKey('a', 60);
          await this.wait(150);
        }
        attempts++;
      }

      if (partyMenuReady) {
        this.addLog('move', '📋 Menu d\'équipe détecté en RAM !');
        // Attendre la fin du fondu d'apparition du menu
        let fadeAttempts = 0;
        while (mmu.read(joyIgnoreAddr) > 0 && fadeAttempts < 15) {
          await this.wait(80);
          fadeAttempts++;
        }
        await this.wait(250);

        // Si une boîte de dialogue résiduelle ("Plus de volonté pour se battre !") est présente, la fermer avec B
        const diag = this.getScreenDialogueText(mmu);
        if (diag.hasPromptArrow || diag.line1.includes('will') || diag.line1.includes('fight') || diag.line1.includes('combat')) {
          await this.tapKey('b', 60);
          await this.wait(150);
        }
      } else {
        this.addLog('safety', '⚠️ Impossible de synchroniser le menu équipe. Poursuite d\'urgence.');
      }

      // Étape 2 : Naviguer avec le curseur en vérifiant la RAM à chaque cran
      let navAttempts = 0;
      while (navAttempts < 25) {
        const currentCursor = mmu.read(cursorAddr);
        if (currentCursor === nextAliveIndex) {
          break;
        }

        if (currentCursor < nextAliveIndex) {
          await this.tapKey('down', 80);
          await this.wait(120);
          // Si le curseur n'a pas bougé (ex: dialogue bloquant), fermer avec B et réessayer
          if (mmu.read(cursorAddr) === currentCursor) {
            await this.tapKey('b', 60);
            await this.wait(100);
            await this.tapKey('down', 80);
            await this.wait(120);
          }
        } else if (currentCursor > nextAliveIndex) {
          await this.tapKey('up', 80);
          await this.wait(120);
          if (mmu.read(cursorAddr) === currentCursor) {
            await this.tapKey('b', 60);
            await this.wait(100);
            await this.tapKey('up', 80);
            await this.wait(120);
          }
        }
        navAttempts++;
      }

      const finalCursor = mmu.read(cursorAddr);
      this.addLog('move', `✨ Curseur positionné sur Slot ${finalCursor + 1} -> Validation [A]`);
      await this.tapKey('a', 80);
      await this.wait(250);

      // Vérification immédiate : si la sélection a échoué (ex: dialogue "Plus de volonté pour se battre !")
      const diagAfterA = this.getScreenDialogueText(mmu);
      const isRefusal = diagAfterA.hasPromptArrow || 
        diagAfterA.line1.includes('will') || diagAfterA.line1.includes('fight') || 
        diagAfterA.line1.includes('volont') || diagAfterA.line1.includes('combat') ||
        diagAfterA.line2.includes('will') || diagAfterA.line2.includes('fight');

      if (isRefusal) {
        this.addLog('safety', `⚠️ Pokémon Slot ${finalCursor + 1} indisponible pour combattre. Marquage K.O. et recherche du suivant...`);
        this.faintedSlotsInBattle.add(finalCursor);
        await this.tapKey('b', 70);
        await this.wait(150);
        await this.tapKey('b', 70);
        await this.wait(150);
        this.switchCooldownUntil = Date.now() + 200;
        return;
      }

      // Étape 3 : Si un sous-menu inattendu (ENVOYER / STAT) est ouvert
      const postMenuY = mmu.read(topMenuYAddr);
      const postMaxMenu = mmu.read(maxItemAddr);
      if (postMenuY !== 1 && (postMaxMenu === 1 || postMaxMenu === 2)) {
        this.addLog('move', `🚀 Confirmation de l'envoi [A]`);
        await this.tapKey('a', 80);
        await this.wait(250);
      }

      // Étape 4 : Défiler l'animation d'entrée ("En avant MANKEY !") jusqu'au retour en combat
      const hpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_HP_EN, mmu);
      const maxHpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MAX_HP_EN, mmu);

      let sendAttempts = 0;
      while (sendAttempts < 10) {
        const newHp = (mmu.read(hpAddr) << 8) | mmu.read(hpAddr + 1);
        const curTopY = mmu.read(topMenuYAddr);
        if (newHp > 0 || curTopY === 14) {
          break;
        }
        await this.tapKey('a', 60);
        await this.wait(180);
        sendAttempts++;
      }

      // Étape 5 : Validation finale des PV dans la RAM
      const newBattleHp = (mmu.read(hpAddr) << 8) | mmu.read(hpAddr + 1);
      const newMaxHp = (mmu.read(maxHpAddr) << 8) | mmu.read(maxHpAddr + 1);

      if (newBattleHp > 0) {
        this.activeMonIndex = nextAliveIndex;
        this.switchCooldownUntil = Date.now() + 1000;
        this.consecutiveSafetyCount = 0;
        this.addLog('battle', `⚔️ Pokémon Slot ${nextAliveIndex + 1} envoyé au combat avec succès (${newBattleHp}/${newMaxHp} PV) ! Reprise de l'offensive.`);
      } else {
        this.switchCooldownUntil = Date.now() + 500;
        this.addLog('battle', `⏳ Finalisation de l'envoi du Pokémon Slot ${nextAliveIndex + 1} en cours...`);
      }
    } catch (e) {
      console.error('Erreur switch pokemon:', e);
    } finally {
      this.isSwitchingPokemon = false;
    }
  }

  /**
   * Helper to check if the standard 2x2 battle menu (FIGHT / PKMN / ITEM / RUN) is actively drawn on the screen.
   */
  private isBattleMenu2x2Visible(mmu: any): boolean {
    if (this.isPartyScreenVisible(mmu) || this.isItemBagOpen(mmu)) {
      return false;
    }

    // Inspection Tilemap de rows 12..17
    let hasFight = false;
    let hasOther2x2Option = false;
    for (let r = 12; r <= 17; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (line.includes('FIGHT') || line.includes('ATTAQ') || line.includes('COMBAT')) hasFight = true;
      if (
        line.includes('PKMN') ||
        line.includes('POKÉMON') ||
        line.includes('POKEMON') ||
        line.includes('ITEM') ||
        line.includes('OBJET') ||
        line.includes('RUN') ||
        line.includes('FUITE')
      ) {
        hasOther2x2Option = true;
      }
    }

    // Dans le menu 2x2, FIGHT et au moins une autre option (PKMN/ITEM/RUN) sont affichés ensemble
    if (hasFight && hasOther2x2Option) {
      return true;
    }

    // Vérification RAM complémentaire : wMaxMenuItem == 1 et wTopMenuItemY in [12, 14]
    const topY = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu));
    const topX = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu));
    const maxItem = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu));

    if (maxItem === 1 && (topY === 12 || topY === 14) && (topX === 9 || topX === 1 || topX === 15 || topX === 8)) {
      return true;
    }

    return false;
  }

  /**
   * Helper to check if the 4-moves selection sub-menu is currently open on screen (showing TYPE/ and moves).
   */
  private isMoveSubMenuVisible(mmu: any): boolean {
    if (this.isPartyScreenVisible(mmu) || this.isItemBagOpen(mmu)) {
      return false;
    }

    // Dans le sous-menu d'attaques, TYPE/ ou PP/ est affiché à gauche, et le menu 2x2 n'est plus là
    let hasTypeOrPP = false;
    let has2x2Options = false;

    for (let r = 12; r <= 17; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (line.includes('TYPE') || line.includes('PP/')) {
        hasTypeOrPP = true;
      }
      if (
        line.includes('PKMN') ||
        line.includes('POKÉMON') ||
        line.includes('POKEMON') ||
        line.includes('ITEM') ||
        line.includes('OBJET') ||
        line.includes('RUN') ||
        line.includes('FUITE')
      ) {
        has2x2Options = true;
      }
    }

    if (hasTypeOrPP && !has2x2Options) {
      return true;
    }

    // Check RAM : maxItem <= 3 (menu vertical 4 items) et topX correspondant au sous-menu d'attaque (généralement 4 ou 0)
    const maxItem = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu));
    const topX = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu));

    if (maxItem >= 0 && maxItem <= 3 && (topX === 4 || topX === 0 || topX === 1 || topX === 5) && !has2x2Options) {
      return true;
    }

    return false;
  }

  /**
   * Helper to detect if the Item Bag / Sac d'objets menu is currently opened.
   */
  private isItemBagOpen(mmu: any): boolean {
    if (this.isPartyScreenVisible(mmu)) return false;

    let screenText = '';
    for (let r = 2; r <= 14; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (line) screenText += ' ' + line;
    }

    // Signature keywords for the Item inventory menu in Gen 1
    const hasItemKeywords =
      (screenText.includes('ITEM') || screenText.includes('OBJET') || screenText.includes('BAG') || screenText.includes('SAC')) &&
      (screenText.includes('CANCEL') || screenText.includes('RETOUR') || screenText.includes('TOSS') || screenText.includes('USE') || screenText.includes('BALL') || screenText.includes('POTION'));

    const diag = this.getScreenDialogueText(mmu);
    const hasBagAction = diag.line1.includes('USE') || diag.line1.includes('TOSS') || diag.line1.includes('UTIL') || diag.line1.includes('JETER');

    return hasItemKeywords || hasBagAction;
  }

  /**
   * Read the exact cursor position in the 2x2 Battle Menu.
   * Layout in Gen 1:
   *   Row 14: [Top-Left: ▶FIGHT/ATTAQ]    [Top-Right: ▶PKMN]
   *   Row 16: [Bottom-Left: ▶ITEM/OBJET]  [Bottom-Right: ▶RUN/FUITE]
   */
  private getBattleMenu2x2Cursor(mmu: any): 'FIGHT' | 'PKMN' | 'ITEM' | 'RUN' {
    const base = resolveAddr(POKEMON_YELLOW_RAM.TILEMAP_BASE_EN, mmu);

    // 1. Direct Tilemap inspection for cursor arrow (▶ = 0xED)
    // Row 14 (Top row: FIGHT / PKMN)
    const r14Base = base + 14 * 20;
    for (let c = 7; c <= 11; c++) {
      if (mmu.read(r14Base + c) === 0xED) return 'FIGHT';
    }
    for (let c = 13; c <= 17; c++) {
      if (mmu.read(r14Base + c) === 0xED) return 'PKMN';
    }

    // Row 16 (Bottom row: ITEM / RUN)
    const r16Base = base + 16 * 20;
    for (let c = 7; c <= 11; c++) {
      if (mmu.read(r16Base + c) === 0xED) return 'ITEM';
    }
    for (let c = 13; c <= 17; c++) {
      if (mmu.read(r16Base + c) === 0xED) return 'RUN';
    }

    // Row 13 & 15 tolerance
    const r13Base = base + 13 * 20;
    for (let c = 7; c <= 11; c++) {
      if (mmu.read(r13Base + c) === 0xED) return 'FIGHT';
    }
    for (let c = 13; c <= 17; c++) {
      if (mmu.read(r13Base + c) === 0xED) return 'PKMN';
    }

    // Default: in Gen 1, battle menu starts at FIGHT (Top-Left)
    return 'FIGHT';
  }

  /**
   * Read the exact cursor position in the Attack / Move selection sub-menu (0..3).
   * 0 = Move 1 (Top / row 14), 1 = Move 2 (row 15), 2 = Move 3 (row 16), 3 = Move 4 (Bottom / row 17).
   * Uses direct tilemap rendering inspection (▶ = 0xED) as the ultimate ground truth.
   */
  private getMoveSubMenuCursor(mmu: any): number {
    const base = resolveAddr(POKEMON_YELLOW_RAM.TILEMAP_BASE_EN, mmu);

    // 1. Direct Tilemap inspection: scan rows 14 to 17 for the cursor arrow (▶ = 0xED)
    for (let r = 14; r <= 17; r++) {
      const rBase = base + r * 20;
      for (let c = 3; c <= 8; c++) {
        if (mmu.read(rBase + c) === 0xED) {
          return r - 14; // Exact slot index (0, 1, 2, or 3)
        }
      }
    }

    // 2. Tolerance check for row 13
    const r13Base = base + 13 * 20;
    for (let c = 3; c <= 8; c++) {
      if (mmu.read(r13Base + c) === 0xED) {
        return 0;
      }
    }

    // 3. Fallback: by default when move menu opens freshly, cursor is on Move 1 (Slot 0)
    return 0;
  }

  /**
   * Verified Cursor Navigation in 2x2 Battle Menu:
   * Moves the cursor to the specified target ('FIGHT' or 'PKMN') and guarantees
   * that the cursor is STRICTLY on target before returning true.
   * If on ITEM or wrong position, adjusts direction and NEVER validates on ITEM.
   */
  private async ensureBattleMenu2x2Cursor(mmu: any, target: 'FIGHT' | 'PKMN' | 'RUN'): Promise<boolean> {
    for (let attempt = 0; attempt < 6; attempt++) {
      // If Item bag is open, cancel back with [B]
      if (this.isItemBagOpen(mmu)) {
        this.addLog('safety', '🛡️ Menu Objets détecté par inadvertance -> Fermeture immédiate [B]');
        await this.tapKey('b', 70);
        await this.wait(140);
        continue;
      }

      const curPos = this.getBattleMenu2x2Cursor(mmu);

      if (curPos === target) {
        // Cursor confirmed on target! No direction buttons needed.
        return true;
      }

      if (target === 'PKMN') {
        if (curPos === 'FIGHT') {
          await this.tapKey('right', 60);
          await this.wait(80);
        } else if (curPos === 'ITEM') {
          await this.tapKey('up', 60);
          await this.wait(60);
          await this.tapKey('right', 60);
          await this.wait(80);
        } else if (curPos === 'RUN') {
          await this.tapKey('up', 60);
          await this.wait(80);
        }
      } else if (target === 'FIGHT') {
        if (curPos === 'PKMN') {
          await this.tapKey('left', 60);
          await this.wait(80);
        } else if (curPos === 'ITEM') {
          await this.tapKey('up', 60);
          await this.wait(80);
        } else if (curPos === 'RUN') {
          await this.tapKey('left', 60);
          await this.wait(60);
          await this.tapKey('up', 60);
          await this.wait(80);
        }
      } else if (target === 'RUN') {
        if (curPos === 'FIGHT') {
          await this.tapKey('down', 60);
          await this.wait(60);
          await this.tapKey('right', 60);
          await this.wait(80);
        } else if (curPos === 'PKMN') {
          await this.tapKey('down', 60);
          await this.wait(80);
        } else if (curPos === 'ITEM') {
          await this.tapKey('right', 60);
          await this.wait(80);
        }
      }
    }

    return this.getBattleMenu2x2Cursor(mmu) === target;
  }

  /**
   * Helper to check if the party selection screen (6 Pokemon list) is actively drawn on screen.
   */
  private isPartyScreenVisible(mmu: any): boolean {
    const topY = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu));
    if (topY === 1) return true;
    for (let r = 14; r <= 17; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (line.includes('CHOOSE') || line.includes('POK') || line.includes('CHOISIS')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Mode Entraînement Premier Pokémon :
   * Switch proactif au Tour 1 depuis le menu de combat standard vers le dernier Pokémon vivant.
   */
  private async handleManualSwitchToMon(mmu: any, partyStatus: PartyStatus, targetIndex: number): Promise<void> {
    if (this.isSwitchingPokemon) return;
    this.isSwitchingPokemon = true;

    try {
      const cursorAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_CURSOR_EN, mmu);
      const topMenuYAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu);
      const topMenuXAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu);
      const maxItemAddr = resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu);
      const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);
      const bTypeAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_TYPE_EN, mmu);

      const targetMonHp = partyStatus.monsHp[targetIndex];
      const targetHpStr = targetMonHp ? `${targetMonHp.curHp}/${targetMonHp.maxHp} PV` : 'Prêt';
      this.addLog('move', `🎓 [Entraînement Slot 1] Switch initial vers le dernier Pokémon (Slot ${targetIndex + 1} - ${targetHpStr})...`);

      // Étape 1 : Passer impérativement les dialogues d'intro du combat ("Wild PIDGEY appeared!", "Go NIDORAN!")
      // On défile avec [A] UNIQUEMENT tant que le menu 2x2 ou l'équipe n'est pas prêt et interactif.
      let menuReady = false;
      for (let t = 0; t < 50; t++) {
        if (mmu.read(bTypeAddr) === 0) {
          // Combat terminé prématurément (fuite/victoire)
          this.hasSwitchedToLastMonInCurrentBattle = true;
          return;
        }

        // Vérifier si le menu 2x2, le sous-menu d'attaque ou l'écran d'équipe est affiché et prêt
        if (this.isPartyScreenVisible(mmu) || this.isBattleMenu2x2Visible(mmu) || this.isMoveSubMenuVisible(mmu)) {
          menuReady = true;
          break;
        }

        // Faire défiler l'animation et le texte d'intro avec [A]
        await this.tapKey('a', 60);
        await this.wait(140);
      }

      if (!menuReady) {
        this.addLog('safety', '⏳ Attente de l\'apparition du menu de combat...');
        return;
      }

      await this.wait(120);

      // Étape 2 : Si le sous-menu d'attaques ou le sac est ouvert, revenir au menu principal 2x2 avec [B]
      for (let retry = 0; retry < 5; retry++) {
        if ((this.isMoveSubMenuVisible(mmu) || this.isItemBagOpen(mmu)) && !this.isPartyScreenVisible(mmu)) {
          await this.tapKey('b', 70);
          await this.wait(140);
        } else {
          break;
        }
      }

      // Étape 3 : Naviguer vers PKMN et ouvrir l'écran d'équipe
      let partyMenuReady = this.isPartyScreenVisible(mmu);
      let navMenuAttempts = 0;

      while (!partyMenuReady && navMenuAttempts < 12) {
        if (this.isPartyScreenVisible(mmu)) {
          partyMenuReady = true;
          break;
        }

        // Si le sous-menu d'attaque est ouvert, retour arrière immédiat avec [B] (ne jamais valider avec [A] !)
        if (this.isMoveSubMenuVisible(mmu)) {
          await this.tapKey('b', 70);
          await this.wait(140);
          navMenuAttempts++;
          continue;
        }

        // Si le sac d'objets est ouvert par mégarde, le fermer immédiatement avec [B]
        if (this.isItemBagOpen(mmu)) {
          this.addLog('safety', '🛡️ Fermeture automatique du sac d\'objets [B]');
          await this.tapKey('b', 70);
          await this.wait(140);
          navMenuAttempts++;
          continue;
        }

        // Vérification et alignement strict du curseur sur PKMN avant d'appuyer sur A
        const isAlignedOnPkmn = await this.ensureBattleMenu2x2Cursor(mmu, 'PKMN');
        if (isAlignedOnPkmn && !this.isMoveSubMenuVisible(mmu)) {
          await this.tapKey('a', 70);
          await this.wait(220);
        } else {
          // Si le curseur n'est pas encore sur PKMN, fermer toute boîte avec B et retenter
          await this.tapKey('b', 60);
          await this.wait(100);
        }

        if (this.isPartyScreenVisible(mmu)) {
          partyMenuReady = true;
          break;
        }

        navMenuAttempts++;
      }

      if (partyMenuReady) {
        // Attendre la fin du fondu d'apparition du menu
        let fadeAttempts = 0;
        while (mmu.read(joyIgnoreAddr) > 0 && fadeAttempts < 15) {
          await this.wait(80);
          fadeAttempts++;
        }
        await this.wait(180);

        // Fermer toute invite de dialogue résiduelle
        const diag = this.getScreenDialogueText(mmu);
        if (diag.hasPromptArrow) {
          await this.tapKey('b', 60);
          await this.wait(100);
        }
      } else {
        this.addLog('safety', '⚠️ Impossible d\'ouvrir le menu Pokémon. Nouvelle tentative au prochain tour.');
        return;
      }

      // Étape 4 : Naviguer avec le curseur jusqu'au Pokémon cible (targetIndex)
      let navAttempts = 0;
      while (navAttempts < 25) {
        const currentCursor = mmu.read(cursorAddr);
        if (currentCursor === targetIndex) {
          break;
        }

        if (currentCursor < targetIndex) {
          await this.tapKey('down', 80);
          await this.wait(100);
          if (mmu.read(cursorAddr) === currentCursor) {
            await this.tapKey('b', 60);
            await this.wait(60);
            await this.tapKey('down', 80);
            await this.wait(100);
          }
        } else if (currentCursor > targetIndex) {
          await this.tapKey('up', 80);
          await this.wait(100);
          if (mmu.read(cursorAddr) === currentCursor) {
            await this.tapKey('b', 60);
            await this.wait(60);
            await this.tapKey('up', 80);
            await this.wait(100);
          }
        }
        navAttempts++;
      }

      const finalCursor = mmu.read(cursorAddr);
      this.addLog('move', `✨ Curseur positionné sur Slot ${finalCursor + 1} -> Validation [A]`);
      await this.tapKey('a', 80);
      await this.wait(220);

      // Étape 5 : Sous-menu (ENVOYER / STATS)
      // Dans le sous-menu de Pokémon, l'option 0 est ENVOYER. On valide directement avec [A]
      const postMaxMenu = mmu.read(maxItemAddr);
      const postTopY = mmu.read(topMenuYAddr);
      if (postTopY !== 1 && (postMaxMenu === 1 || postMaxMenu === 2)) {
        this.addLog('move', `🚀 Confirmation de l'envoi [A]`);
        await this.tapKey('a', 80);
        await this.wait(220);
      }

      // Étape 6 : Défiler les dialogues de switch ("Reviens !" / "En avant !") et l'attaque adverse du tour
      // En Gen 1, le switch prend un tour et le Pokémon adverse attaque
      for (let c = 0; c < 20; c++) {
        const inB = mmu.read(bTypeAddr);
        if (inB === 0) break; // Combat fini
        if (this.isBattleMenu2x2Visible(mmu)) {
          break; // Menu de combat revenu
        }
        await this.tapKey('a', 60);
        await this.wait(160);
      }

      // Étape 7 : Validation finale des PV dans la RAM
      const hpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_HP_EN, mmu);
      const maxHpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MAX_HP_EN, mmu);
      const newBattleHp = (mmu.read(hpAddr) << 8) | mmu.read(hpAddr + 1);
      const newMaxHp = (mmu.read(maxHpAddr) << 8) | mmu.read(maxHpAddr + 1);

      this.activeMonIndex = targetIndex;
      this.hasSwitchedToLastMonInCurrentBattle = true;
      this.switchCooldownUntil = Date.now() + 600;

      this.addLog('battle', `🎓 [Entraînement Slot 1] Switch réussi vers Slot ${targetIndex + 1} (${newBattleHp}/${newMaxHp} PV) ! Reprise du combat.`);
    } catch (e) {
      console.error('Erreur switch entraînement:', e);
    } finally {
      this.isSwitchingPokemon = false;
    }
  }

  /**
   * Post-Battle Transition & Victory Dialogue Flusher:
   * Attend la fin du fondu (wJoyIgnore == 0) et purge les derniers textes avec [A] / [B] / [START] (fuite, Pokédex, surnom, dialogues).
   */
  private async handlePostBattle(mmu: any): Promise<void> {
    const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);
    
    let attempts = 0;
    // Attendre que la GameBoy rende la main au joueur (fin des animations/fades)
    while (mmu.read(joyIgnoreAddr) > 0 && attempts < 30) {
      const moveLearn = this.detectMoveLearnPrompt(mmu);
      if (moveLearn.isLearning) {
        this.stop(`Apprentissage d'attaque : ${moveLearn.reason}. Choisissez quelle attaque conserver ou oublier.`);
        return;
      }
      await this.wait(50);
      attempts++;
    }

    // Purge de sécurité finale (fermeture des textes de fuite ("Got away safely!"), victoires, pokédex, surnom)
    for (let i = 0; i < 25; i++) {
      const moveLearn = this.detectMoveLearnPrompt(mmu);
      if (moveLearn.isLearning) {
        this.stop(`Apprentissage d'attaque : ${moveLearn.reason}. Choisissez quelle attaque conserver ou oublier.`);
        return;
      }

      const diag = this.getScreenDialogueText(mmu);
      const isNickname = diag.line1.toUpperCase().includes('NICKNAME') || diag.line2.toUpperCase().includes('NICKNAME');
      
      if (isNickname) {
        await this.tapKey('start', 60);
        await this.wait(150);
        continue;
      }

      const isBoxVisible = this.isTextBoxActiveOnScreen(mmu);
      const joyIgnore = mmu.read(joyIgnoreAddr);

      // Si la boîte de texte a complètement disparu et que wJoyIgnore == 0
      if (!isBoxVisible && joyIgnore === 0 && i >= 2) {
        break;
      }

      // Alterner A et B pour valider et fermer les boîtes de dialogue ("Got away safely!", etc.)
      this.addLog('safety', `🏃 Fermeture du message de fuite/fin de combat [${i % 2 === 0 ? 'A' : 'B'}]...`);
      await this.tapKey(i % 2 === 0 ? 'a' : 'b', 70);
      await this.wait(120);
    }
    await this.wait(100);
  }

  /**
   * Evaluates the level of the first Pokémon (Slot 1) after battle upon returning to overworld.
   * If Slot 1 reached targetLevel:
   * - Searches for the next Pokémon in the party with level < targetLevel.
   * - Swaps Slot 1 with that Pokémon.
   * - If all Pokémon in party reached targetLevel, stops the bot.
   */
  private async checkAndHandleTargetLevelSwitch(mmu: any): Promise<void> {
    const partyStatus = this.getPartyStatus(mmu);
    if (!partyStatus.isValid || partyStatus.monsHp.length === 0) return;

    const targetLevel = this.targetLevel;
    if (targetLevel <= 0) return;

    const slot1 = partyStatus.monsHp[0];
    if (!slot1) return;

    this.addLog('info', `📊 Évaluation fin de combat : Slot 1 est au Niveau ${slot1.level} (Niveau max cible: ${targetLevel})`);

    // Check if ALL Pokémon in the party have reached targetLevel
    const allMonsReached = partyStatus.monsHp.every((mon) => mon.level >= targetLevel);
    if (allMonsReached) {
      this.stop(`🏆 Objectif atteint ! Tous les Pokémon de l'équipe ont atteint ou dépassé le niveau max ${targetLevel}.`);
      return;
    }

    // Check if Slot 1 has reached targetLevel
    if (slot1.level >= targetLevel) {
      // Find the next Pokémon in the party (Slot 2..6) with level < targetLevel
      let candidateIndex = -1;

      // 1. Search alive mons from slot 2 onwards
      for (let i = 1; i < partyStatus.monsHp.length; i++) {
        const mon = partyStatus.monsHp[i];
        if (mon.level < targetLevel && mon.curHp > 0) {
          candidateIndex = i;
          break;
        }
      }

      // 2. If no alive mon found, search any mon with level < targetLevel
      if (candidateIndex === -1) {
        for (let i = 1; i < partyStatus.monsHp.length; i++) {
          const mon = partyStatus.monsHp[i];
          if (mon.level < targetLevel) {
            candidateIndex = i;
            break;
          }
        }
      }

      if (candidateIndex !== -1) {
        const candidateMon = partyStatus.monsHp[candidateIndex];
        this.addLog(
          'info',
          `🎓 [Niveau Max Atteint] Slot 1 (Niv. ${slot1.level}) a atteint le niveau max cible (${targetLevel}). Échange avec Slot ${candidateIndex + 1} (Niv. ${candidateMon.level})...`
        );
        await this.swapPartySlots(mmu, 0, candidateIndex);
      } else {
        this.stop(`🏆 Objectif atteint ! Tous les Pokémon de l'équipe ont atteint le niveau max ${targetLevel}.`);
      }
    }
  }

  /**
   * Swaps two party slots in Overworld.
   * Executes game UI key sequence (START -> PKMN -> SELECT on Slot A -> Move cursor to Slot B -> SELECT)
   * and synchronizes GameBoy RAM memory structs.
   */
  private async swapPartySlots(mmu: any, indexA: number, indexB: number): Promise<boolean> {
    if (indexA === indexB) return true;

    try {
      this.addLog('move', `🔄 Échange d'équipe : Slot ${indexA + 1} ↔️ Slot ${indexB + 1}...`);

      const topMenuYAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu);
      const cursorAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_CURSOR_EN, mmu);
      const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);

      // Open Start menu
      await this.tapKey('start', 80);
      await this.wait(220);

      // Open PKMN menu
      let openedParty = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const topY = mmu.read(topMenuYAddr);
        if (topY === 1) {
          openedParty = true;
          break;
        }
        await this.tapKey('down', 60);
        await this.wait(100);
        await this.tapKey('a', 80);
        await this.wait(200);
      }

      if (openedParty) {
        let fade = 0;
        while (mmu.read(joyIgnoreAddr) > 0 && fade < 10) {
          await this.wait(60);
          fade++;
        }
        await this.wait(150);

        // Move cursor to indexA
        let cur = mmu.read(cursorAddr);
        while (cur !== indexA && cur < 6) {
          if (cur < indexA) await this.tapKey('down', 60);
          else await this.tapKey('up', 60);
          await this.wait(100);
          cur = mmu.read(cursorAddr);
        }

        // Press SELECT to highlight mon A
        await this.tapKey('select', 80);
        await this.wait(150);

        // Move cursor to indexB
        cur = mmu.read(cursorAddr);
        while (cur !== indexB && cur < 6) {
          if (cur < indexB) await this.tapKey('down', 60);
          else await this.tapKey('up', 60);
          await this.wait(100);
          cur = mmu.read(cursorAddr);
        }

        // Press SELECT or A to swap
        await this.tapKey('select', 80);
        await this.wait(200);

        // Exit menus (B twice)
        await this.tapKey('b', 80);
        await this.wait(200);
        await this.tapKey('b', 80);
        await this.wait(200);
      }

      // Synchronize RAM structs directly to guarantee complete desync-free consistency
      this.swapPartyRAMStructs(mmu, indexA, indexB);
      
      const newParty = this.getPartyStatus(mmu);
      const newSlot1Level = newParty.monsHp[0]?.level || 0;
      this.addLog('info', `✨ Échange réussi ! Le nouveau Slot 1 est le Pokémon Niv. ${newSlot1Level}. Reprise de l'entraînement.`);
      return true;
    } catch (e) {
      console.error('Erreur swap party slots:', e);
      this.swapPartyRAMStructs(mmu, indexA, indexB);
      return true;
    }
  }

  private swapPartyRAMStructs(mmu: any, indexA: number, indexB: number): void {
    if (!mmu || indexA === indexB) return;

    const countAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_COUNT_EN, mmu);
    const count = mmu.read(countAddr);
    if (indexA < 0 || indexA >= count || indexB < 0 || indexB >= count) return;

    const speciesBase = countAddr + 1; // 0xD164
    const monBase = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_BASE_EN, mmu); // 0xD16B
    const otBase = monBase + 6 * 44; // 0xD273
    const nickBase = otBase + 6 * 11; // 0xD2B5

    // 1. Swap species byte
    const spA = mmu.read(speciesBase + indexA);
    const spB = mmu.read(speciesBase + indexB);
    mmu.write(speciesBase + indexA, spB);
    mmu.write(speciesBase + indexB, spA);

    // 2. Swap 44-byte mon struct
    for (let offset = 0; offset < 44; offset++) {
      const addrA = monBase + indexA * 44 + offset;
      const addrB = monBase + indexB * 44 + offset;
      const valA = mmu.read(addrA);
      const valB = mmu.read(addrB);
      mmu.write(addrA, valB);
      mmu.write(addrB, valA);
    }

    // 3. Swap 11-byte OT name
    for (let offset = 0; offset < 11; offset++) {
      const addrA = otBase + indexA * 11 + offset;
      const addrB = otBase + indexB * 11 + offset;
      const valA = mmu.read(addrA);
      const valB = mmu.read(addrB);
      mmu.write(addrA, valB);
      mmu.write(addrB, valA);
    }

    // 4. Swap 11-byte Nickname
    for (let offset = 0; offset < 11; offset++) {
      const addrA = nickBase + indexA * 11 + offset;
      const addrB = nickBase + indexB * 11 + offset;
      const valA = mmu.read(addrA);
      const valB = mmu.read(addrB);
      mmu.write(addrA, valB);
      mmu.write(addrB, valA);
    }
  }

  /**
   * Overworld Behavior (Pokemon Yellow RAM coordinates):
   */
  private async handleOverworld(mmu: any): Promise<void> {
    // Si une boîte de texte est encore présente sur la carte (ex: "Got away safely!"), la fermer immédiatement au lieu de marcher
    if (this.isTextBoxActiveOnScreen(mmu)) {
      this.addLog('safety', '🏃 Dialogue/Texte actif sur la carte -> Fermeture [A/B]...');
      await this.tapKey('a', 70);
      await this.wait(100);
      await this.tapKey('b', 70);
      await this.wait(120);
      return;
    }

    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
    const playerX = mmu.read(xAddr);
    const playerY = mmu.read(yAddr);

    // Collision or text-prompt / Pikachu emotion window check
    if (playerX === this.lastX && playerY === this.lastY) {
      this.stuckCounter++;
      // Si le joueur ne bouge pas : appuyer sur [B] pour fermer tout dialogue/fenêtre Pikachu résiduelle et changer d'axe
      if (this.stuckCounter >= 2) {
        this.addLog('walk', `⚠️ [RAM: X=${playerX}, Y=${playerY}] Fermeture dialogue/fenêtre Pikachu [B] + changement de direction`);
        await this.tapKey('b', 80);
        await this.wait(100);
        this.walkStep += 2;
        if (this.stuckCounter >= 4) {
          this.stuckCounter = 0;
        }
      }
    } else {
      this.stuckCounter = 0;
    }

    this.lastX = playerX;
    this.lastY = playerY;

    this.walkStep++;
    const direction = (this.walkStep % 4 < 2) ? 'left' : 'right';
    
    // Log overworld step periodically (every 2 seconds) to keep log concise
    const now = Date.now();
    if (now - this.lastLogTimestamp > 2000) {
      this.lastLogTimestamp = now;
      this.addLog('walk', `🗺️ [RAM: X=${playerX}, Y=${playerY}] Marche ${direction === 'left' ? 'GAUCHE ⬅️' : 'DROITE ➡️'}`);
    }

    await this.tapKey(direction, 250);
  }

  /**
   * Battle Behavior (Pokemon Yellow RAM moves & PP):
   */
  private async handleBattle(mmu: any): Promise<void> {
    const partyStatus = this.getPartyStatus(mmu);

    // Mode Entraînement 1er Pokémon : S'il ne reste qu'un seul Pokémon en vie (Slot 1), fuite immédiate !
    if (this.mode === 'train_slot_1' && partyStatus.totalMons > 1 && partyStatus.aliveMons <= 1) {
      if (this.isItemBagOpen(mmu)) {
        this.addLog('safety', '🛡️ Sac d\'objets détecté en fuite -> Fermeture immédiate [B]');
        await this.tapKey('b', 70);
        await this.wait(140);
        return;
      }

      if (this.isBattleMenu2x2Visible(mmu)) {
        this.addLog('safety', '🏃 [Sécurité Entraînement] 1 seul Pokémon en vie (Slot 1) ! Fuite du combat [FUITE]...');
        const isAlignedOnRun = await this.ensureBattleMenu2x2Cursor(mmu, 'RUN');
        if (isAlignedOnRun) {
          await this.tapKey('a', 70);
          await this.wait(180);
        }
        return;
      }

      if (this.isMoveSubMenuVisible(mmu)) {
        await this.tapKey('b', 70);
        await this.wait(140);
        return;
      }

      const diag = this.getScreenDialogueText(mmu);
      if (diag.hasPromptArrow || this.isTextBoxActiveOnScreen(mmu)) {
        this.addLog('safety', '🏃 Purge du message de fuite ("Got away safely!") [A/B]...');
        await this.tapKey('a', 70);
        await this.wait(100);
        await this.tapKey('b', 70);
        await this.wait(120);
        return;
      }

      // Si le menu 2x2 est fermé après avoir cliqué sur FUITE (ex: message "Got away safely!"), appuyer sur A puis B
      this.addLog('safety', '🏃 Purge du message de fuite ("Got away safely!") [A/B]...');
      await this.tapKey('a', 70);
      await this.wait(100);
      await this.tapKey('b', 70);
      await this.wait(140);
      return;
    }

    const movesAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MOVES_EN, mmu);
    const ppAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_PP_EN, mmu);

    const movePPs: number[] = [];
    const moveIDs: number[] = [];

    for (let i = 0; i < 4; i++) {
      const rawPp = mmu.read(ppAddr + i);
      const moveId = mmu.read(movesAddr + i);
      movePPs.push(rawPp & 0x3F);
      moveIDs.push(moveId);
    }

    // Fallback to Party Mon 1 if Battle Mon PP in RAM is not yet populated
    const totalBattlePP = movePPs.reduce((sum, val) => sum + val, 0);
    if (totalBattlePP === 0 && moveIDs.every((id) => id === 0)) {
      const partyMovesAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_MOVES_EN, mmu);
      const partyPpAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_PP_EN, mmu);
      for (let i = 0; i < 4; i++) {
        movePPs[i] = mmu.read(partyPpAddr + i) & 0x3F;
        moveIDs[i] = mmu.read(partyMovesAddr + i);
      }
    }

    // Determine target move slot
    let targetSlot = 0;
    let foundValidMove = false;

    for (let i = 0; i < 4; i++) {
      if (movePPs[i] > 0 && (moveIDs[i] > 0 || totalBattlePP > 0)) {
        targetSlot = i;
        foundValidMove = true;
        break;
      }
    }

    // Log move selection or switch when target slot changes
    if (targetSlot !== this.lastLoggedSlot) {
      this.lastLoggedSlot = targetSlot;
      if (targetSlot > 0) {
        this.addLog('move', `🔄 [PP Épuisé: Slot 1] Bascule vers Slot ${targetSlot + 1} (${movePPs[targetSlot]} PP restants)`);
      } else {
        const slot1PP = movePPs[0] > 0 ? `${movePPs[0]} PP` : 'Prêt';
        this.addLog('move', `🥊 [Capacité: Slot 1 (${slot1PP})] Attaque principale -> Action [A]`);
      }
    }

    // Si le sac d'objets est ouvert par inadvertance en combat, le fermer immédiatement
    if (this.isItemBagOpen(mmu)) {
      this.addLog('safety', '🛡️ Sac d\'objets détecté en combat -> Fermeture immédiate [B]');
      await this.tapKey('b', 70);
      await this.wait(140);
      return;
    }

    // Si le menu principal de combat 2x2 est affiché : s'assurer formellement d'être sur FIGHT avant d'appuyer sur A
    if (this.isBattleMenu2x2Visible(mmu)) {
      const isAlignedOnFight = await this.ensureBattleMenu2x2Cursor(mmu, 'FIGHT');
      if (isAlignedOnFight) {
        await this.tapKey('a', 70);
        await this.wait(150);
      }
      return;
    }

    // Si nous sommes dans le sous-menu de sélection des 4 attaques
    if (this.isMoveSubMenuVisible(mmu)) {
      await this.selectMoveInSubMenu(mmu, targetSlot);
      return;
    }

    // Si des dialogues défilent ou attendent une confirmation :
    const diag = this.getScreenDialogueText(mmu);
    if (diag.hasPromptArrow) {
      await this.tapKey('a', 70);
      await this.wait(80);
      return;
    }
    
    // Si nous sommes en combat hors-menu (texte ou transition), une impulsion [A] fait avancer les dialogues
    await this.tapKey('a', 60);
    await this.wait(100);
  }

  /**
   * Move Selection in Battle Sub-menu (4 moves vertical list):
   * In Pokemon Gen 1, opening the FIGHT menu always places the cursor on Move 1 (Slot 0).
   * For Slot 0 (default move), we press [A] directly with zero directional inputs (preventing wrap-around).
   * For other slots (1..3), we move down sequentially from Slot 0 to reach targetSlot and confirm with [A].
   */
  private async selectMoveInSubMenu(mmu: any, targetSlot: number): Promise<void> {
    if (targetSlot === 0) {
      // Slot 1 (Attaque 1) est sélectionné par défaut -> validation directe avec [A]
      await this.tapKey('a', 80);
      await this.wait(200);
      return;
    }

    // Pour les capacités suivantes (Slot 2, 3, 4) : descente contrôlée depuis le Slot 0
    for (let i = 0; i < targetSlot; i++) {
      await this.tapKey('down', 60);
      await this.wait(120);
    }

    // Validation de la capacité sélectionnée avec [A]
    await this.tapKey('a', 80);
    await this.wait(200);
  }

  /**
   * Joypad Key Emulation helpers
   */
  private async tapKey(key: 'left' | 'right' | 'up' | 'down' | 'a' | 'b' | 'start' | 'select', durationMs: number = 70): Promise<void> {
    if (!this.emulator) return;
    this.emulator.setJoypad(key, true);
    await new Promise((res) => setTimeout(res, durationMs));
    if (this.emulator) {
      this.emulator.setJoypad(key, false);
    }
    await new Promise((res) => setTimeout(res, 30));
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((res) => setTimeout(res, ms));
  }

  private releaseAllKeys(): void {
    if (!this.emulator) return;
    const keys: ('left' | 'right' | 'up' | 'down' | 'a' | 'b' | 'start' | 'select')[] = [
      'left', 'right', 'up', 'down', 'a', 'b', 'start', 'select'
    ];
    for (const k of keys) {
      this.emulator.setJoypad(k, false);
    }
  }

  private notifyState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.isRunning, this.state);
    }
  }
}
