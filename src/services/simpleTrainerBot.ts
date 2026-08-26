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
    shortDesc: 'Partage d’EXP : switch vers le dernier au T1',
    description: 'Envoie le Pokémon du Slot 1 pour l’EXP, puis switch immédiatement vers le dernier Pokémon de l’équipe pour remporter le combat.'
  }
];

export interface BotLogEntry {
  id: string;
  time: string;
  type: 'info' | 'walk' | 'battle' | 'move' | 'safety' | 'stop';
  message: string;
}

export interface PartyStatus {
  isValid: boolean;
  totalMons: number;
  aliveMons: number;
  faintedMons: number;
  monsHp: { slot: number; curHp: number; maxHp: number }[];
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
  private hasSwitchedToLastMonInCurrentBattle: boolean = false;
  private startTime: number | null = null;

  // Cached Party Status (guarantees safe fallback during RAM transitions)
  private cachedPartyStatus: PartyStatus = {
    isValid: false,
    totalMons: 1,
    aliveMons: 1,
    faintedMons: 0,
    monsHp: [{ slot: 1, curHp: 20, maxHp: 20 }]
  };

  // Live Logs History (Max 200 entries)
  private logs: BotLogEntry[] = [];

  // Callbacks
  public onStateChange?: (isRunning: boolean, state: TrainerBotState) => void;
  public onModeChange?: (mode: TrainerBotMode) => void;
  public onLogsUpdate?: (logs: BotLogEntry[]) => void;

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
    const monsHp: { slot: number; curHp: number; maxHp: number }[] = [];
    let aliveMons = 0;
    let validSlots = 0;

    for (let i = 0; i < 6; i++) {
      const offset = i * POKEMON_YELLOW_RAM.PARTY_STRUCT_SIZE;
      const curHp = (mmu.read(baseHpAddr + offset) << 8) | mmu.read(baseHpAddr + offset + 1);
      const maxHp = (mmu.read(baseMaxHpAddr + offset) << 8) | mmu.read(baseMaxHpAddr + offset + 1);

      // Validate: Gen 1 Pokemon Max HP is between 5 and 999, and curHp cannot exceed maxHp by large margin
      if (maxHp >= 5 && maxHp <= 999 && curHp <= maxHp + 100) {
        validSlots++;
        monsHp.push({ slot: i + 1, curHp, maxHp });
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
      }

      // =========================================================================
      // 2. POKÉMON YELLOW RAM: Party Health & Safety Rule
      // Condition: S'il ne reste qu'un seul Pokémon en vie dans l'équipe -> Arrêt automatique de sécurité
      // =========================================================================
      const partyStatus = this.getPartyStatus(mmu);

      // Synchronize activeMonIndex from Game Boy RAM if available
      if (inBattle) {
      const playerMonAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_MON_NUMBER_EN, mmu);
        const rawActiveMon = mmu.read(playerMonAddr);
        if (rawActiveMon >= 0 && rawActiveMon < 6) {
          this.activeMonIndex = rawActiveMon;
        }
      }

      // Si le Pokémon actif est K.O. en combat, synchroniser immédiatement sa santé à 0
      if (inBattle && curBattleHp === 0 && maxBattleHp > 0) {
        if (partyStatus.monsHp[this.activeMonIndex]) {
          partyStatus.monsHp[this.activeMonIndex].curHp = 0;
          partyStatus.aliveMons = partyStatus.monsHp.filter((m) => m.curHp > 0).length;
          partyStatus.faintedMons = partyStatus.totalMons - partyStatus.aliveMons;
        }
      }

      if (partyStatus.isValid && now > this.switchCooldownUntil) {
        // Arrêt si toute l'équipe est K.O. (ou 1 seul restant en mode entraînement)
        let isKillSwitch = false;
        if (partyStatus.totalMons > 0 && partyStatus.aliveMons === 0) {
          isKillSwitch = true;
        } else if (this.mode === 'train_slot_1' && partyStatus.totalMons > 1 && partyStatus.aliveMons <= 1) {
          isKillSwitch = true;
        }

        if (isKillSwitch) {
          this.consecutiveSafetyCount++;
          if (this.consecutiveSafetyCount >= 4) {
            this.stop(partyStatus.aliveMons === 0 
              ? `Sécurité équipe : Tous les Pokémon sont K.O. (0/${partyStatus.totalMons} vivant).`
              : `Sécurité équipe : 1 seul Pokémon en vie (Slot 1). Arrêt pour le préserver.`);
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
      // Si le Pokémon actif tombe K.O. en combat (PV = 0) et qu'il reste d'autres Pokémon vivants
      // =========================================================================
      if (inBattle && curBattleHp === 0 && maxBattleHp > 0) {
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
          this.hasSwitchedToLastMonInCurrentBattle = false;
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

          if (lastAliveIndex > 0 && this.activeMonIndex === 0) {
            if (!this.isSwitchingPokemon && now > this.switchCooldownUntil) {
              await this.handleManualSwitchToMon(mmu, partyStatus, lastAliveIndex);
            }
            this.scheduleNextTick(150);
            return;
          } else {
            // Aucun autre Pokémon vivant disponible ou déjà swappé
            this.hasSwitchedToLastMonInCurrentBattle = true;
          }
        }

        await this.handleBattle(mmu);
        this.scheduleNextTick(100);
      } else {
        if (this.wasInBattle) {
          this.wasInBattle = false;
          this.hasSwitchedToLastMonInCurrentBattle = false;
          this.activeMonIndex = 0;
          this.lastLoggedSlot = -1;
          this.lastX = -1;
          this.lastY = -1;
          this.stuckCounter = 0;
          this.addLog('info', `🏆 [RAM: 0xD057=0x00] Victoire/Fin du combat -> Attente de la carte (${partyStatus.aliveMons}/${partyStatus.totalMons} Pokémon vivants)`);
          // Nettoyer les dialogues post-combat et attendre la fin du fondu
          await this.handlePostBattle(mmu);
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
          if (partyStatus.monsHp[i].curHp > 0 && i !== this.activeMonIndex) {
            nextAliveIndex = i;
            break;
          }
        }
      } else {
        // Mode continu : du premier au dernier
        for (let i = 0; i < partyStatus.monsHp.length; i++) {
          if (partyStatus.monsHp[i].curHp > 0 && (i !== this.activeMonIndex || partyStatus.monsHp[i].curHp > 0)) {
            nextAliveIndex = i;
            break;
          }
        }
      }

      if (nextAliveIndex === -1) {
        this.stop('Tous les Pokémon de l\'équipe sont K.O.');
        return;
      }

      const cursorAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_CURSOR_EN, mmu);
      const topMenuYAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu);
      const topMenuXAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu);
      const maxItemAddr = resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu);
      const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);

      this.addLog('safety', `💀 Pokémon actif K.O. ! Commande de switch vers Slot ${nextAliveIndex + 1} (${partyStatus.monsHp[nextAliveIndex]?.curHp}/${partyStatus.monsHp[nextAliveIndex]?.maxHp} PV).`);

      // Étape 1 : Attendre et naviguer jusqu'à l'écran de sélection de l'équipe (wTopMenuItemY == 1)
      this.addLog('move', '🔄 Purge du message de K.O... Attente du menu Équipe (RAM)');
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
          const cur = mmu.read(cursorAddr);
          if (cur !== 0) {
            // Positionner sur "OUI" (index 0)
            await this.tapKey('up', 60);
            await this.wait(100);
          }
          await this.tapKey('a', 60);
          await this.wait(200);
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
    const joyIgnore = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu));
    // Si la Game Boy ignore les touches (animation/fondu), le menu n'est pas encore interactif
    if (joyIgnore > 0) return false;

    // Si le sous-menu d'attaques (avec TYPE/) est affiché, ce n'est PAS le menu 2x2
    if (this.isMoveSubMenuVisible(mmu)) {
      return false;
    }

    const topY = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu));
    const topX = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu));
    const maxItem = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu));

    // Dans le menu 2x2, maxItem vaut 1 (2 lignes verticales)
    if (maxItem === 1 && (topY === 12 || topY === 14) && (topX === 9 || topX === 1 || topX === 15 || topX === 8)) {
      return true;
    }

    // Inspection Tilemap de secours pour les mots-clés du menu 2x2
    let hasFight = false;
    let hasPkmn = false;
    for (let r = 12; r <= 17; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (line.includes('FIGHT') || line.includes('ATTAQ')) hasFight = true;
      if (line.includes('PKMN') || line.includes('POKÉMON') || line.includes('POKEMON')) hasPkmn = true;
    }
    return hasFight && hasPkmn;
  }

  /**
   * Helper to check if the 4-moves selection sub-menu is currently open on screen (showing TYPE/ and moves).
   */
  private isMoveSubMenuVisible(mmu: any): boolean {
    const joyIgnore = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu));
    if (joyIgnore > 0) return false;

    // Dans le sous-menu d'attaque, la boîte de dialogue affiche "TYPE/" ou "TYPE" aux lignes 12 ou 13
    for (let r = 12; r <= 14; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (line.includes('TYPE/') || line.includes('TYPE')) {
        return true;
      }
    }

    const topY = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu));
    const maxItem = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu));
    // Si maxItem > 1 (3 pour 4 attaques) et topY est 4 ou 12
    if (maxItem > 1 && (topY === 4 || topY === 12 || topY === 13)) {
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
   *   [Top-Left: FIGHT/ATTAQ]    [Top-Right: PKMN]
   *   [Bottom-Left: ITEM/OBJET]  [Bottom-Right: RUN/FUITE]
   */
  private getBattleMenu2x2Cursor(mmu: any): 'FIGHT' | 'PKMN' | 'ITEM' | 'RUN' | 'UNKNOWN' {
    const base = resolveAddr(POKEMON_YELLOW_RAM.TILEMAP_BASE_EN, mmu);

    // 1. Direct Tilemap inspection for cursor arrow (▶ = 0xED)
    // Rows 13 and 14 (Top row: FIGHT / PKMN)
    for (const r of [13, 14]) {
      const rBase = base + r * 20;
      for (let c = 7; c <= 11; c++) {
        if (mmu.read(rBase + c) === 0xED) return 'FIGHT';
      }
      for (let c = 13; c <= 17; c++) {
        if (mmu.read(rBase + c) === 0xED) return 'PKMN';
      }
    }

    // Rows 15 and 16 (Bottom row: ITEM / RUN)
    for (const r of [15, 16]) {
      const rBase = base + r * 20;
      for (let c = 7; c <= 11; c++) {
        if (mmu.read(rBase + c) === 0xED) return 'ITEM';
      }
      for (let c = 13; c <= 17; c++) {
        if (mmu.read(rBase + c) === 0xED) return 'RUN';
      }
    }

    // 2. RAM coordinates fallback
    const topY = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu));
    const topX = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu));

    if (topY <= 13) {
      return topX >= 13 ? 'PKMN' : 'FIGHT';
    } else {
      return topX >= 13 ? 'RUN' : 'ITEM';
    }
  }

  /**
   * Read the exact cursor position in the Attack / Move selection sub-menu (0..3).
   * In Gen 1 Battle screen:
   *   Row 13: Move 1 (Slot 0)
   *   Row 14: Move 2 (Slot 1)
   *   Row 15: Move 3 (Slot 2)
   *   Row 16: Move 4 (Slot 3)
   * Tile value 0xED is the arrow cursor (▶) located around columns 7..11.
   */
  private getMoveSubMenuCursor(mmu: any): number {
    const base = resolveAddr(POKEMON_YELLOW_RAM.TILEMAP_BASE_EN, mmu);

    // 1. Direct Tilemap inspection on rows 13..16
    for (let slot = 0; slot < 4; slot++) {
      const row = 13 + slot;
      const rBase = base + row * 20;
      for (let col = 7; col <= 11; col++) {
        if (mmu.read(rBase + col) === 0xED) {
          return slot;
        }
      }
    }

    // 2. RAM coordinates fallback (wCurrentMenuItem at 0xCC26)
    const cursor = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.BATTLE_CURSOR_EN, mmu));
    return (cursor >= 0 && cursor <= 3) ? cursor : 0;
  }

  /**
   * Verified Cursor Navigation in 2x2 Battle Menu:
   * Moves the cursor to the specified target ('FIGHT' or 'PKMN') and guarantees
   * that the cursor is STRICTLY on target before returning true.
   * If on ITEM or wrong position, adjusts direction and NEVER validates on ITEM.
   */
  private async ensureBattleMenu2x2Cursor(mmu: any, target: 'FIGHT' | 'PKMN'): Promise<boolean> {
    for (let attempt = 0; attempt < 8; attempt++) {
      // If Item bag is open, cancel back with [B]
      if (this.isItemBagOpen(mmu)) {
        this.addLog('safety', '🛡️ Menu Objets détecté par inadvertance -> Fermeture immédiate [B]');
        await this.tapKey('b', 70);
        await this.wait(140);
        continue;
      }

      // If attack sub-menu is open, cancel back to 2x2 menu with [B]
      const topX = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu));
      if (topX === 4 || topX === 5) {
        await this.tapKey('b', 60);
        await this.wait(100);
        continue;
      }

      const curPos = this.getBattleMenu2x2Cursor(mmu);

      if (curPos === target) {
        // Cursor confirmed on target!
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
        } else {
          // Position indéterminée : tentative vers la droite
          await this.tapKey('right', 50);
          await this.wait(70);
        }
      } else if (target === 'FIGHT') {
        if (curPos === 'PKMN') {
          await this.tapKey('left', 60);
          await this.wait(80);
        } else if (curPos === 'ITEM') {
          await this.tapKey('up', 60);
          await this.wait(80);
        } else if (curPos === 'RUN') {
          await this.tapKey('up', 60);
          await this.wait(60);
          await this.tapKey('left', 60);
          await this.wait(80);
        } else {
          // Position indéterminée : juste une impulsion vers la gauche (JAMAIS vers le HAUT pour éviter les bugs)
          await this.tapKey('left', 50);
          await this.wait(70);
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

        // Vérifier si le menu 2x2 ou l'écran d'équipe est affiché et prêt
        if (this.isPartyScreenVisible(mmu) || this.isBattleMenu2x2Visible(mmu)) {
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

      await this.wait(100);

      // Étape 2 : Si le sous-menu d'attaques est ouvert par inadvertance, revenir au menu principal avec [B]
      const currentTopX = mmu.read(topMenuXAddr);
      if ((currentTopX === 4 || currentTopX === 5) && !this.isPartyScreenVisible(mmu)) {
        await this.tapKey('b', 60);
        await this.wait(120);
      }

      // Étape 3 : Naviguer vers PKMN et ouvrir l'écran d'équipe
      let partyMenuReady = this.isPartyScreenVisible(mmu);
      let navMenuAttempts = 0;

      while (!partyMenuReady && navMenuAttempts < 12) {
        if (this.isPartyScreenVisible(mmu)) {
          partyMenuReady = true;
          break;
        }

        // Si le sac d'objets est ouvert par mégarde, le fermer immédiatement avec [B]
        if (this.isItemBagOpen(mmu)) {
          this.addLog('safety', '🛡️ Fermeture automatique du sac d\'objets [B]');
          await this.tapKey('b', 70);
          await this.wait(140);
        }

        // Vérification et alignement strict du curseur sur PKMN avant d'appuyer sur A
        const isAlignedOnPkmn = await this.ensureBattleMenu2x2Cursor(mmu, 'PKMN');
        if (isAlignedOnPkmn) {
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
   * Attend la fin du fondu (wJoyIgnore == 0) et purge les derniers textes avec [B] / [START] (Pokédex, surnom, dialogues).
   */
  private async handlePostBattle(mmu: any): Promise<void> {
    const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);
    
    let attempts = 0;
    // Attendre que la GameBoy rende la main au joueur (fin des animations/fades)
    while (mmu.read(joyIgnoreAddr) > 0 && attempts < 40) {
      const moveLearn = this.detectMoveLearnPrompt(mmu);
      if (moveLearn.isLearning) {
        this.stop(`Apprentissage d'attaque : ${moveLearn.reason}. Choisissez quelle attaque conserver ou oublier.`);
        return;
      }
      // Tap B while waiting to clear any victory texts
      await this.tapKey('b', 60);
      await this.wait(80);
      attempts++;
    }

    // Purge de sécurité finale (fermeture des textes de victoire des dresseurs, pokédex, surnom)
    for (let i = 0; i < 6; i++) {
      const moveLearn = this.detectMoveLearnPrompt(mmu);
      if (moveLearn.isLearning) {
        this.stop(`Apprentissage d'attaque : ${moveLearn.reason}. Choisissez quelle attaque conserver ou oublier.`);
        return;
      }
      const diag = this.getScreenDialogueText(mmu);
      if (diag.line1.toUpperCase().includes('NICKNAME') || diag.line2.toUpperCase().includes('NICKNAME')) {
        // Si le clavier de surnom est ouvert, valider directement avec START
        await this.tapKey('start', 60);
        await this.wait(150);
      } else {
        await this.tapKey('b', 60);
        await this.wait(100);
      }
    }
  }

  /**
   * Overworld Behavior (Pokemon Yellow RAM coordinates):
   */
  private async handleOverworld(mmu: any): Promise<void> {
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

    // Si des dialogues défilent ou des animations se jouent :
    await this.tapKey('a', 70);
  }

  /**
   * Verified Move Selection in Battle Sub-menu (4 moves vertical list):
   * Guarantees the cursor is strictly on targetSlot (0 = Slot 1, 1 = Slot 2, etc.)
   * before pressing [A]. Never presses UP when already at Slot 0 to prevent menu wrap-around!
   */
  private async selectMoveInSubMenu(mmu: any, targetSlot: number): Promise<void> {
    const currentSlot = this.getMoveSubMenuCursor(mmu);

    if (targetSlot === 0) {
      if (currentSlot === 0) {
        // Déjà positionné sur la 1ère attaque (Slot 1) : Validation immédiate avec [A], aucun appui directionnel !
        await this.tapKey('a', 80);
        await this.wait(150);
        return;
      } else if (currentSlot === 1) {
        await this.tapKey('up', 50);
        await this.wait(80);
      } else if (currentSlot === 2) {
        await this.tapKey('up', 50);
        await this.wait(60);
        await this.tapKey('up', 50);
        await this.wait(80);
      } else if (currentSlot === 3) {
        // Du Slot 4 au Slot 1 : un seul coup vers le bas fait le tour vers le Slot 1
        await this.tapKey('down', 50);
        await this.wait(80);
      }
      await this.tapKey('a', 80);
      await this.wait(150);
      return;
    }

    // Si targetSlot > 0 (ex: Slot 1 n'a plus de PP)
    for (let attempt = 0; attempt < 4; attempt++) {
      const cur = this.getMoveSubMenuCursor(mmu);
      if (cur === targetSlot) {
        break;
      }
      if (cur < targetSlot) {
        await this.tapKey('down', 50);
        await this.wait(70);
      } else if (cur > targetSlot) {
        await this.tapKey('up', 50);
        await this.wait(70);
      }
    }

    // Directly validate move selection with [A]
    await this.tapKey('a', 80);
    await this.wait(150);
  }

  /**
   * Joypad Key Emulation helpers
   */
  private async tapKey(key: 'left' | 'right' | 'up' | 'down' | 'a' | 'b' | 'start' | 'select', durationMs: number = 60): Promise<void> {
    if (!this.emulator) return;
    this.emulator.setJoypad(key, true);
    await new Promise((res) => setTimeout(res, durationMs));
    if (this.emulator) {
      this.emulator.setJoypad(key, false);
    }
    await new Promise((res) => setTimeout(res, 20));
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
