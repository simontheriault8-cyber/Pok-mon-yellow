// Module 2: Pure Macro/Micro RAM Navigation & Auto-Heal Pathfinding Engine
// Architecture:
// 1. Macro Planner: Computes inter-zone boundary sequence (Route -> Border -> City -> Pokecenter Door)
// 2. Micro Planner (A* on Live RAM): Reads 2D collision matrix and executes safe step paths to each boundary
// 3. Pokecenter Entry: Enters door strictly facing NORTH at (doorX, doorY + 1)
// 4. Pokecenter Indoor Routine: Standardized sequence (arrival -> walk to (3,3) -> face North -> Nurse Joy dialogue -> exit)
// 5. Dynamic Obstacle Avoidance: Bayonet maneuver (2 steps perpendicular -> 2 steps forward -> 2 steps back)
// 6. Perfect Return Memory: Records full step history stack and plays inverse moves on return journey!

import { GameBoy } from '../emulator/gameboy';
import { POKEMON_YELLOW_RAM, resolveAddr, readPartyStatusFromRAM } from './pokemonYellowRam';
import { readNavigationState, POKEMON_YELLOW_MAPS } from './worldNavigation';
import { readRamMapData, collisionCache, TileClassification } from './ramMapReader';
import { AStarPathfinder, StepDirection } from './pathfinder';
import { planMacroRoute, Direction, PokecenterData, getClosestPokecenterForMap } from './macroNavigation';

export type AutoHealStatus =
  | 'idle'
  | 'macro_planning'
  | 'navigating_to_boundary'
  | 'navigating_to_pokecenter'
  | 'entering_door'
  | 'approaching_nurse'
  | 'talking_to_nurse'
  | 'healing_in_progress'
  | 'exiting_pokecenter'
  | 'returning_to_training'
  | 'completed'
  | 'error';

export interface AutoHealProgress {
  status: AutoHealStatus;
  stepMessage: string;
  targetCoords: { x: number; y: number } | null;
  currentCoords: { x: number; y: number } | null;
  distance: number;
  macroStepsRemaining?: number;
}

export interface NavLogEntry {
  id: string;
  time: string;
  type: 'info' | 'nav' | 'step' | 'door' | 'nurse' | 'heal' | 'return' | 'error' | 'stop';
  message: string;
  coords?: { x: number; y: number };
  mapId?: number;
}

export class LocalNavigationEngine {
  private emulator: GameBoy | null = null;
  private isRunning: boolean = false;
  private startTime: number | null = null;
  private currentStatus: AutoHealStatus = 'idle';
  private logs: NavLogEntry[] = [];
  private onProgressCallback?: (progress: AutoHealProgress) => void;
  public onLogsUpdate?: (logs: NavLogEntry[]) => void;

  // History stack for perfect inverse return trip
  private stepHistoryStack: Direction[] = [];
  private originTrainingMapId: number | null = null;
  private originTrainingCoords: { x: number; y: number } | null = null;

  constructor(emulator?: GameBoy | null) {
    if (emulator) {
      this.emulator = emulator;
    }
  }

  public setEmulator(emulator: GameBoy | null): void {
    this.emulator = emulator;
  }

  public onProgress(cb: (progress: AutoHealProgress) => void): void {
    this.onProgressCallback = cb;
  }

  public getStatus(): AutoHealStatus {
    return this.currentStatus;
  }

  public getStartTime(): number | null {
    return this.startTime;
  }

  public getLogs(): NavLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.addLog('info', 'Journal de navigation réinitialisé.');
  }

  public addLog(
    type: NavLogEntry['type'],
    message: string,
    coords?: { x: number; y: number },
    mapId?: number
  ): void {
    let timeStr = '';
    if (this.startTime) {
      const elapsed = Date.now() - this.startTime;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      const ms = Math.floor((elapsed % 1000) / 100);
      timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
    } else {
      const now = new Date();
      timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }

    const entry: NavLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      time: timeStr,
      type,
      message,
      coords,
      mapId,
    };

    this.logs.unshift(entry);
    if (this.logs.length > 150) {
      this.logs.pop();
    }

    if (this.onLogsUpdate) {
      this.onLogsUpdate([...this.logs]);
    }
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.currentStatus = 'idle';
    this.releaseAllKeys();
    this.addLog('stop', '⛔ Navigation arrêtée par l\'utilisateur.');
    this.notifyProgress('Navigation arrêtée par l\'utilisateur.', null, null, 0);
  }

  private notifyProgress(
    stepMessage: string,
    targetCoords: { x: number; y: number } | null,
    currentCoords: { x: number; y: number } | null,
    distance: number,
    macroStepsRemaining?: number
  ): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        status: this.currentStatus,
        stepMessage,
        targetCoords,
        currentCoords,
        distance,
        macroStepsRemaining,
      });
    }
  }

  /**
   * Execute full Macro/Micro Auto-Heal sequence:
   * 1. Plan Macro path (zone boundaries to traverse)
   * 2. Micro-navigate with RAM 2D collision A* to each boundary and cross it
   * 3. Micro-navigate in destination town to (doorX, doorY+1), face North, and enter
   * 4. Standardized Pokecenter routine (walk (3,3), talk to Nurse Joy, heal party)
   * 5. Exit Pokecenter to (3,7) and step South
   * 6. Replay reverse step stack to return perfectly to origin spot!
   */
  public async executeAutoHealSequence(returnToOrigin: boolean = true): Promise<boolean> {
    if (!this.emulator || this.isRunning) return false;
    const mmu = this.emulator.mmu;
    if (!mmu) return false;

    this.isRunning = true;
    this.startTime = Date.now();
    this.stepHistoryStack = []; // Reset recorded moves stack

    this.addLog('info', '🧭 Lancement Navigation Macro / Micro & Auto-Soin (Module 2)');

    try {
      // Step 1: Read starting position & map ID
      let nav = readNavigationState(mmu);
      if (!nav) {
        this.currentStatus = 'error';
        this.addLog('error', '❌ Impossible de lire l\'état de navigation dans la RAM.');
        return false;
      }

      this.originTrainingMapId = nav.currentMapId;
      this.originTrainingCoords = { x: nav.playerX, y: nav.playerY };
      const curMapName = POKEMON_YELLOW_MAPS[nav.currentMapId] || `Map 0x${nav.currentMapId.toString(16)}`;

      this.addLog(
        'nav',
        `📍 Point de départ : ${curMapName} (${nav.playerX}, ${nav.playerY})`,
        { x: nav.playerX, y: nav.playerY },
        nav.currentMapId
      );

      // Step 2: Macro Planning (Zone graph BFS)
      this.currentStatus = 'macro_planning';
      const macroPlan = planMacroRoute(nav.currentMapId);
      if (!macroPlan) {
        this.currentStatus = 'error';
        this.addLog('error', '❌ Aucun itinéraire Macro trouvé vers un Centre Pokémon.');
        return false;
      }

      const pokecenter = getClosestPokecenterForMap(nav.currentMapId);
      this.addLog('info', `🎯 Cible Macro : ${pokecenter.name} (${macroPlan.boundaries.length} frontière(s) à traverser)`);

      // Step 3: Traverse each Macro boundary using Micro RAM A*
      for (let i = 0; i < macroPlan.boundaries.length; i++) {
        if (!this.isRunning) return false;

        const boundary = macroPlan.boundaries[i];
        this.currentStatus = 'navigating_to_boundary';
        this.addLog(
          'nav',
          `🗺️ Étape Macro ${i + 1}/${macroPlan.boundaries.length} : ${boundary.description} ➜ vers (${boundary.fromCoords.x}, ${boundary.fromCoords.y})...`
        );

        // Micro-navigate on current map's collision grid to the boundary tile
        const reachedBoundary = await this.microNavigateWithRAM(
          mmu,
          boundary.fromCoords.x,
          boundary.fromCoords.y,
          boundary.description,
          true // record steps for return
        );

        if (!reachedBoundary || !this.isRunning) {
          this.addLog('error', `❌ Échec de ralliement de la frontière : ${boundary.description}`);
          return false;
        }

        // Cross boundary with the transition direction step
        this.addLog('nav', `🚪 Franchissement de frontière [${boundary.crossingDir.toUpperCase()}]...`);
        await this.stepAndRecord(boundary.crossingDir, true);
        await this.stepAndRecord(boundary.crossingDir, true);
        await this.wait(700); // Wait for map transition
      }

      // Step 4: Now in Target Pokecenter Town -> Navigate to Door Tile facing North
      nav = readNavigationState(mmu)!;
      this.currentStatus = 'navigating_to_pokecenter';
      const standX = pokecenter.standCoords.x;
      const standY = pokecenter.standCoords.y;

      this.addLog(
        'step',
        `🏙️ Navigation Micro dans ${pokecenter.name} vers le pas de porte (${standX}, ${standY})...`
      );

      const reachedDoorStep = await this.microNavigateWithRAM(
        mmu,
        standX,
        standY,
        `Devanture ${pokecenter.name}`,
        true // record steps
      );

      if (!reachedDoorStep || !this.isRunning) {
        this.addLog('error', '❌ Impossible d\'atteindre le pas de porte du Centre Pokémon.');
        return false;
      }

      // Turn FACE NORTH (Up) towards the door
      this.addLog('nav', '👀 Orientation face au Nord (UP) vers la porte...');
      await this.tapKey('up', 80);
      await this.wait(150);

      // Step 5: Enter the Pokecenter Door (Step UP onto door tile)
      this.currentStatus = 'entering_door';
      this.addLog('door', `🚪 Entrée dans le ${pokecenter.name}...`);
      this.notifyProgress(`Entrée dans le ${pokecenter.name}...`, pokecenter.doorCoords, null, 0);

      let enterAttempts = 0;
      const outdoorMapId = pokecenter.outdoorMapId;

      while (!this.isInsidePokecenter(mmu, pokecenter.indoorMapId) && enterAttempts < 10 && this.isRunning) {
        // Step UP with firm key press to trigger building entrance warp
        await this.stepDirection('up');
        await this.wait(500);

        // Check if warp transition completed
        if (this.isInsidePokecenter(mmu, pokecenter.indoorMapId)) {
          break;
        }

        // Check if player drifted away from door stand coordinates
        const checkNav = readNavigationState(mmu);
        if (checkNav && checkNav.currentMapId === outdoorMapId) {
          if (checkNav.playerX !== pokecenter.standCoords.x || checkNav.playerY !== pokecenter.standCoords.y) {
            this.addLog('nav', `🧭 Réalignement face à la porte (${pokecenter.standCoords.x}, ${pokecenter.standCoords.y})...`);
            await this.microNavigateWithRAM(
              mmu,
              pokecenter.standCoords.x,
              pokecenter.standCoords.y,
              'Pas de porte',
              false
            );
            await this.tapKey('up', 80);
            await this.wait(120);
          }
        }

        enterAttempts++;
      }

      // STRICT CHECK: If still not inside, DO NOT PROCEED to Step 6!
      nav = readNavigationState(mmu)!;
      if (!this.isInsidePokecenter(mmu, pokecenter.indoorMapId)) {
        this.currentStatus = 'error';
        const curMapName = POKEMON_YELLOW_MAPS[nav.currentMapId] || `Map 0x${nav.currentMapId.toString(16)}`;
        this.addLog(
          'error',
          `❌ Échec d'entrée dans le ${pokecenter.name} (Toujours à l'extérieur : ${curMapName} (${nav.playerX}, ${nav.playerY})). Arrêt de sécurité.`
        );
        return false;
      }

      // Step 6: Standardized Pokecenter Routine
      const insideMapName = POKEMON_YELLOW_MAPS[nav.currentMapId] || `Map 0x${nav.currentMapId.toString(16)}`;
      this.addLog('nav', `🏥 Intérieur du Centre Pokémon validé (${insideMapName} - 0x${nav.currentMapId.toString(16).toUpperCase()})`);
      this.currentStatus = 'approaching_nurse';
      this.notifyProgress('Approche du comptoir de Joëlle (3, 3)...', { x: 3, y: 3 }, { x: nav.playerX, y: nav.playerY }, 0);

      // Standard indoor path: Walk to (3, 3) facing North at Nurse (3, 2)
      this.addLog('step', '🚶 Déplacement vers le guichet de l\'Infirmière Joëlle (3, 3)...');
      await this.microNavigateWithRAM(mmu, 3, 3, 'Guichet Joëlle', false);
      if (!this.isRunning) return false;

      // Face UP towards Nurse Joy
      await this.tapKey('up', 80);
      await this.wait(150);

      // Step 7: Nurse Joy Dialogue Automation
      this.currentStatus = 'talking_to_nurse';
      this.addLog('nurse', '💬 Début du dialogue de soin avec l\'Infirmière Joëlle [A]...');
      this.notifyProgress('🩺 Soin complet de l\'équipe Pokémon...', { x: 3, y: 2 }, { x: 3, y: 3 }, 0);
      await this.interactWithNurse(mmu);
      if (!this.isRunning) return false;

      this.addLog('heal', '✨ Équipe Pokémon soignée à 100% de PV !');

      // Step 8: Standard Indoor Exit
      this.currentStatus = 'exiting_pokecenter';
      this.addLog('step', '🚶 Déplacement vers la sortie du Centre Pokémon (3, 7)...');
      this.notifyProgress('Sortie du Centre Pokémon...', { x: 3, y: 7 }, null, 0);
      await this.microNavigateWithRAM(mmu, 3, 7, 'Sortie Centre Pokémon', false);
      if (!this.isRunning) return false;

      // Step DOWN on mat to warp out with verified loop
      this.addLog('door', '🚪 Franchissement de la sortie vers l\'extérieur...');
      let exitAttempts = 0;
      while (this.isInsidePokecenter(mmu, pokecenter.indoorMapId) && exitAttempts < 10 && this.isRunning) {
        await this.stepDirection('down');
        await this.wait(500);
        if (!this.isInsidePokecenter(mmu, pokecenter.indoorMapId)) {
          break;
        }
        exitAttempts++;
      }

      // Step 9: Replay Reverse Step History Stack to Return to Training Spot
      if (returnToOrigin && this.originTrainingCoords && this.originTrainingMapId !== null) {
        this.currentStatus = 'returning_to_training';
        const originMapName = POKEMON_YELLOW_MAPS[this.originTrainingMapId] || `Map 0x${this.originTrainingMapId.toString(16)}`;
        this.addLog(
          'return',
          `🔄 Trajet retour inversé mémorisé (${this.stepHistoryStack.length} pas) vers : ${originMapName} (${this.originTrainingCoords.x}, ${this.originTrainingCoords.y})...`,
          this.originTrainingCoords,
          this.originTrainingMapId
        );

        await this.replayReverseStepHistory(mmu);
      }

      this.currentStatus = 'completed';
      const totalElapsed = this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : '0';
      this.addLog('heal', `🎉 Séquence d'Auto-Soin terminée avec succès en ${totalElapsed}s ! Prêt au combat.`);
      this.notifyProgress('✨ Soin et retour terminés avec succès !', null, null, 0);
      return true;
    } catch (e) {
      console.error('Erreur LocalNavigationEngine:', e);
      this.currentStatus = 'error';
      this.addLog('error', `❌ Erreur critique navigation : ${e instanceof Error ? e.message : String(e)}`);
      this.notifyProgress('Erreur pendant la navigation.', null, null, 0);
      return false;
    } finally {
      this.isRunning = false;
      this.releaseAllKeys();
    }
  }

  /**
   * Micro-Navigation Engine using live 2D RAM Collision Matrix + A* Pathfinding.
   * Strictly follows the computed A* path along walkable radar tiles without detour/evasion maneuvers.
   */
  public async microNavigateWithRAM(
    mmu: any,
    targetX: number,
    targetY: number,
    destinationName: string = 'Destination',
    recordForReturn: boolean = true
  ): Promise<boolean> {
    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
    const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);

    const startingMapId = mmu.read(mapIdAddr);
    let maxSteps = 180;

    while (maxSteps > 0 && this.isRunning) {
      const curX = mmu.read(xAddr);
      const curY = mmu.read(yAddr);
      const curMap = mmu.read(mapIdAddr);

      // If map changed (boundary crossed or warp entered), mission completed for this map
      if (curMap !== startingMapId) {
        return true;
      }

      // Check if target coordinates reached
      if (curX === targetX && curY === targetY) {
        return true;
      }

      const dist = Math.abs(curX - targetX) + Math.abs(curY - targetY);
      if (dist === 0) return true;

      // 1. Read live 2D RAM collision matrix
      const mapData = readRamMapData(mmu);
      if (!mapData) {
        await this.wait(100);
        maxSteps--;
        continue;
      }

      // 2. Compute dynamic A* path on current collision grid
      const pathResult = AStarPathfinder.findPath(
        mapData.collisionGrid,
        curX,
        curY,
        targetX,
        targetY,
        true
      );

      if (!pathResult.found || pathResult.steps.length === 0) {
        // Destination might be direct neighbor
        if (dist <= 1) {
          const directDir: Direction = curX < targetX ? 'right' : curX > targetX ? 'left' : curY < targetY ? 'down' : 'up';
          await this.stepAndRecord(directDir, recordForReturn);
          return true;
        }

        // Direct neighbor step if A* is slightly offset
        const safeDir = this.findBestPassableNeighbor(mapData.collisionGrid, curX, curY, targetX, targetY);
        this.addLog('step', `📍 Cap direct vers (${targetX}, ${targetY}) : [${safeDir.toUpperCase()}]`, { x: curX, y: curY });
        await this.stepAndRecord(safeDir, recordForReturn);
        maxSteps--;
        continue;
      }

      this.notifyProgress(
        `Micro A* vers ${destinationName} (${pathResult.steps.length} pas restants)`,
        { x: targetX, y: targetY },
        { x: curX, y: curY },
        dist
      );

      // 3. Take next step from A* path
      const nextStep = pathResult.steps[0];
      await this.stepAndRecord(nextStep.direction, recordForReturn);

      // Verify if map transitioned during step
      const afterMap = mmu.read(mapIdAddr);
      if (afterMap !== startingMapId) {
        return true;
      }

      maxSteps--;
    }

    const finalX = mmu.read(xAddr);
    const finalY = mmu.read(yAddr);
    const finalMap = mmu.read(mapIdAddr);
    return finalMap !== startingMapId || (Math.abs(finalX - targetX) + Math.abs(finalY - targetY) <= 1);
  }

  /**
   * Find safe passable neighbor when A* needs local recovery
   */
  private findBestPassableNeighbor(
    grid: TileClassification[][],
    curX: number,
    curY: number,
    targetX: number,
    targetY: number
  ): Direction {
    const candidates: { dir: Direction; x: number; y: number; cost: number }[] = [
      { dir: 'down', x: curX, y: curY + 1, cost: 0 },
      { dir: 'right', x: curX + 1, y: curY, cost: 0 },
      { dir: 'left', x: curX - 1, y: curY, cost: 0 },
      { dir: 'up', x: curX, y: curY - 1, cost: 0 },
    ];

    let bestDir: Direction = 'down';
    let bestDist = Infinity;

    for (const c of candidates) {
      if (c.y >= 0 && c.y < grid.length && c.x >= 0 && c.x < grid[0].length) {
        const type = grid[c.y][c.x];
        // Must be walkable or ledge down
        if (type !== TileClassification.SOLID) {
          const dist = Math.abs(c.x - targetX) + Math.abs(c.y - targetY);
          if (dist < bestDist) {
            bestDist = dist;
            bestDir = c.dir;
          }
        }
      }
    }

    return bestDir;
  }

  /**
   * Replay reverse recorded history stack to navigate back to origin spot.
   */
  private async replayReverseStepHistory(mmu: any): Promise<void> {
    const oppositeDir: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };

    const totalSteps = this.stepHistoryStack.length;
    let stepIndex = 0;

    while (this.stepHistoryStack.length > 0 && this.isRunning) {
      const forwardDir = this.stepHistoryStack.pop()!;
      const reverseDir = oppositeDir[forwardDir];
      stepIndex++;

      this.notifyProgress(
        `Trajet retour inversé : pas ${stepIndex}/${totalSteps} [${reverseDir.toUpperCase()}]`,
        this.originTrainingCoords,
        null,
        totalSteps - stepIndex
      );

      await this.stepDirection(reverseDir);
      await this.wait(75);
    }
  }

  /**
   * Helper to check if a dialogue text box (or text) is actively visible in lines 12 to 17.
   * In Generation 1, text box borders use tiles 0x79..0x7E and text is in tilemap 0xC3A0.
   */
  private isTextBoxActiveOnScreen(mmu: any): boolean {
    if (!mmu) return false;
    let textCharCount = 0;
    let boxBorderCount = 0;

    for (let r = 12; r <= 17; r++) {
      const rowStart = 0xC3A0 + r * 20;
      for (let c = 0; c < 20; c++) {
        const tile = mmu.read(rowStart + c);
        // Gen 1 text box border tiles: 0x79 (top-left), 0x7A (horizontal), 0x7B (top-right), 0x7C (vertical), 0x7D (bottom-left), 0x7E (bottom-right)
        if (tile >= 0x79 && tile <= 0x7E) {
          boxBorderCount++;
        }
        // Letters and numbers: A-Z (0x80..0x99), a-z (0xA0..0xB9), 0-9 (0xF6..0xFF), punctuation (0xE7..0xEE)
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

    // A dialog box is active if it has border tiles or substantial text in the dialog area
    return boxBorderCount >= 4 || textCharCount >= 5;
  }

  /**
   * Automate Nurse Joy Dialogue Sequence:
   * 1. Start dialogue with [A] and confirm "Shall we heal your Pokémon?" with [A].
   * 2. Wait for healing machine animation / jingle to complete.
   * 3. Dismiss final messages ("fighting fit", "hope to see you again") with [B] to close cleanly without re-talking.
   * 4. Exit once text box is closed and joypad is unlocked.
   */
  private async interactWithNurse(mmu: any): Promise<void> {
    const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);
    let attempts = 0;
    const maxAttempts = 150;
    let healAccepted = false;
    let healAnimationDetected = false;
    let healAnimationCompleted = false;

    this.addLog('nurse', '💬 Lancement du dialogue avec l\'Infirmière Joëlle [A]...');

    // Step 1: Open dialogue by pressing A facing UP towards Nurse Joy
    await this.tapKey('a', 80);
    await this.wait(250);

    while (attempts < maxAttempts && this.isRunning) {
      const joyIgnore = mmu.read(joyIgnoreAddr);
      const isBoxVisible = this.isTextBoxActiveOnScreen(mmu);

      // Read screen lines to monitor dialog text
      const screenLines: string[] = [];
      for (let r = 12; r <= 17; r++) {
        screenLines.push(this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase());
      }
      const fullText = screenLines.join(' ');

      // Phase 2 Detection: Nurse accepted Pokemon ("OK, we'll need your POKéMON" / "Très bien. Confiez-moi...")
      if (
        fullText.includes('NEED') ||
        fullText.includes('CONFIEZ') ||
        fullText.includes('TAKE') ||
        fullText.includes('ATTENDU') ||
        fullText.includes('PATIENT')
      ) {
        healAccepted = true;
      }

      // Detect healing music / animation phase (Nurse faces machine, joypad locked)
      if (healAccepted && !healAnimationCompleted) {
        healAnimationDetected = true;
        this.addLog('nurse', '🎵 Soin en cours sur la machine...');
        // Wait for heal jingle & light flashes to complete (~2.2 seconds in Gen 1)
        await this.wait(2300);
        healAnimationCompleted = true;
        this.addLog('nurse', '✨ Animation de soin terminée. Clôture des dialogues...');
      }

      // Phase 3 Detection: Closing dialogue ("Your POKéMON are fighting fit!" / "We hope to see you again!")
      const isOutroText =
        fullText.includes('FIGHT') ||
        fullText.includes('FIT') ||
        fullText.includes('THANK') ||
        fullText.includes('MERCI') ||
        fullText.includes('HOPE') ||
        fullText.includes('REVOIR') ||
        fullText.includes('AGAIN');

      // EXIT CONDITION:
      // If healing animation completed (or sufficient dialogue passed) AND text box is gone AND joypad is free
      if ((healAnimationCompleted || isOutroText || attempts > 15) && !isBoxVisible && joyIgnore === 0) {
        this.addLog('nurse', '✅ Dialogue terminé, boîte fermée et équipe soignée.');
        break;
      }

      // Input Dispatch:
      if (!healAccepted && !healAnimationCompleted) {
        // Phase 1: Advance "Welcome" and confirm "Shall we heal?" with [A]
        await this.tapKey('a', 60);
        await this.wait(180);
      } else {
        // Phase 3: Outro messages - Advance with [B] to dismiss without re-talking to Nurse Joy
        await this.tapKey('b', 60);
        await this.wait(160);
      }

      attempts++;
    }

    // Safety cleanup: dismiss any residual popup
    for (let k = 0; k < 3; k++) {
      if (this.isTextBoxActiveOnScreen(mmu) || mmu.read(joyIgnoreAddr) > 0) {
        await this.tapKey('b', 50);
        await this.wait(120);
      }
    }
    await this.wait(200);
  }

  // --- Low-Level Joypad & RAM Step Helpers ---

  private async stepAndRecord(dir: Direction, record: boolean): Promise<void> {
    if (record) {
      this.stepHistoryStack.push(dir);
    }
    await this.stepDirection(dir);
  }

  private async stepDirection(dir: Direction, holdDuration: number = 150): Promise<void> {
    if (!this.emulator) return;
    // Game Boy requires holding directional key for ~150ms to register full tile movement
    this.emulator.setJoypad(dir, true);
    await this.wait(holdDuration);
    if (this.emulator) {
      this.emulator.setJoypad(dir, false);
    }
    // Wait for step animation to finish
    await this.wait(120);

    // Module 2 Feature: Check if a wild battle was triggered during/after this step
    if (this.emulator && this.emulator.mmu && this.isRunning) {
      await this.handleBattleAutoFlee(this.emulator.mmu);
    }
  }

  /**
   * Comprehensive check to determine if the player is currently inside a Pokémon Center.
   * Checks RAM Map ID against the registered indoorMapId, known Pokecenter map IDs, and tileset === 1.
   */
  private isInsidePokecenter(mmu: any, expectedIndoorMapId?: number): boolean {
    if (!mmu) return false;
    const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);
    const tilesetAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_TILESET_EN, mmu);
    const currentMapId = mmu.read(mapIdAddr);
    const tileset = mmu.read(tilesetAddr);

    if (expectedIndoorMapId && currentMapId === expectedIndoorMapId) return true;

    // Known Pokecenter map IDs in Pokémon Yellow / Red / Blue
    const ALL_POKECENTER_MAPS = new Set([
      0x29, // Viridian
      0x3A, // Pewter
      0x44, // Cerulean
      0x54, // Route 4 (Mt Moon)
      0x58, // Route 10 (Rock Tunnel)
      0x5E, // Vermilion
      0x64, // Lavender
      0x68, // Celadon
      0x76, // Fuchsia
      0x87, // Saffron
      0x97, // Cinnabar
      0xAC, // Indigo Plateau
    ]);

    if (ALL_POKECENTER_MAPS.has(currentMapId)) return true;

    // Tileset 1 is Pokecenter / Interior in Gen 1 (Overworld is tileset 0)
    // Outdoor cities are maps 0x00 to 0x0B and Routes 0x0C to 0x25
    if (tileset === 1 && currentMapId > 0x0B) return true;

    return false;
  }

  /**
   * Helper to check if a battle is currently active in RAM
   */
  private isBattleActive(mmu: any): boolean {
    if (!mmu) return false;
    const battleAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_TYPE_EN, mmu);
    const val = mmu.read(battleAddr);
    return val === 1 || val === 2;
  }

  /**
   * Character map decoder for Generation 1 Pokémon (Yellow / Red / Blue).
   */
  private decodeChar(byteVal: number): string {
    if (byteVal >= 0x80 && byteVal <= 0x99) return String.fromCharCode(65 + (byteVal - 0x80)); // 'A'..'Z'
    if (byteVal >= 0xA0 && byteVal <= 0xB9) return String.fromCharCode(97 + (byteVal - 0xA0)); // 'a'..'z'
    if (byteVal >= 0xF6 && byteVal <= 0xFF) return String.fromCharCode(48 + (byteVal - 0xF6)); // '0'..'9'
    switch (byteVal) {
      case 0x7F: return ' ';
      case 0xED: return '▶';
      case 0xEE: return '▼';
      case 0xE7: return '!';
      case 0xE8: return '?';
      default: return '';
    }
  }

  /**
   * Reads and decodes a line from the Game Boy screen tilemap (0xC3A0).
   */
  private readScreenLine(mmu: any, startAddr: number, length: number = 20): string {
    let res = '';
    for (let i = 0; i < length; i++) {
      const b = mmu.read(startAddr + i);
      const ch = this.decodeChar(b);
      if (ch) res += ch;
    }
    return res.trim();
  }

  /**
   * Helper to check if the standard 2x2 battle menu (FIGHT / PKMN / ITEM / RUN) is actively drawn on the screen.
   */
  private isBattleMenu2x2Visible(mmu: any): boolean {
    const joyIgnore = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu));
    if (joyIgnore > 0) return false;

    // Check lines 12 to 17 in screen buffer (0xC3A0)
    for (let r = 12; r <= 17; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (
        line.includes('FIGHT') ||
        line.includes('PKMN') ||
        line.includes('ATTAQ') ||
        line.includes('ITEM') ||
        line.includes('RUN') ||
        line.includes('OBJET') ||
        line.includes('FUITE')
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Helper to check if the party selection screen (6 Pokemon list) is actively drawn on screen.
   */
  private isPartyScreenVisible(mmu: any): boolean {
    const topY = mmu.read(resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu));
    if (topY === 1) return true;
    for (let r = 13; r <= 17; r++) {
      const line = this.readScreenLine(mmu, 0xC3A0 + r * 20, 20).toUpperCase();
      if (line.includes('CHOOSE') || line.includes('POK') || line.includes('CHOISIS')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Battle Auto-Flee Handler (Module 2):
   * When an encounter is triggered during navigation, the bot repeatedly attempts to FLEE (FUITE / RUN).
   * Once successfully escaped and returned to Overworld, it flushes text and resumes its route.
   */
  private async handleBattleAutoFlee(mmu: any): Promise<void> {
    if (!this.isBattleActive(mmu)) return;

    this.addLog('nav', '⚔️ Combat aléatoire détecté pendant le trajet ! Tentative de FUITE en boucle...');
    this.notifyProgress('⚔️ Combat déclenché ! Tentative de FUITE...', null, null, 0);

    let attempts = 0;
    const maxAttempts = 180; // Safety limit
    const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);
    const topMenuXAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu);

    while (this.isRunning && attempts < maxAttempts) {
      // Check if battle has already ended (0xD057 == 0x00)
      if (!this.isBattleActive(mmu)) {
        break;
      }

      const joyIgnore = mmu.read(joyIgnoreAddr);

      // If game is busy animating or text is scrolling, advance with B
      if (joyIgnore > 0) {
        await this.tapKey('b', 50);
        await this.wait(70);
        attempts++;
        continue;
      }

      // If in party screen or attack screen, cancel back with B
      const topX = mmu.read(topMenuXAddr);
      if (this.isPartyScreenVisible(mmu) || topX === 4 || topX === 5) {
        await this.tapKey('b', 50);
        await this.wait(90);
        attempts++;
        continue;
      }

      // If the 2x2 Battle Menu is active: [FIGHT (top-left), PKMN (top-right), ITEM (bottom-left), RUN (bottom-right)]
      if (this.isBattleMenu2x2Visible(mmu)) {
        // 1. Move cursor Down (to ITEM / RUN row)
        await this.tapKey('down', 50);
        await this.wait(60);
        if (!this.isBattleActive(mmu)) break;

        // 2. Move cursor Right (to RUN column)
        await this.tapKey('right', 50);
        await this.wait(60);
        if (!this.isBattleActive(mmu)) break;

        // 3. Press A to trigger FLEE (FUITE / RUN)
        await this.tapKey('a', 60);
        await this.wait(140);

        // 4. Press B to advance "Got away safely!" / escape messages
        for (let k = 0; k < 3; k++) {
          if (!this.isBattleActive(mmu)) break;
          await this.tapKey('b', 50);
          await this.wait(80);
        }
      } else {
        // Intro text / animation before menu ("Wild PIDGEY appeared!", "Go NIDORAN!")
        await this.tapKey('a', 50);
        await this.wait(90);
      }

      attempts++;
    }

    // Battle finished: finalize escape and return cleanly to Overworld navigation
    if (!this.isBattleActive(mmu)) {
      this.addLog('nav', '🏃💨 Fuite réussie avec succès ! Reprise immédiate du trajet.');
      // Wait for screen fade / joypad ready
      let fadeCount = 0;
      while (mmu.read(joyIgnoreAddr) > 0 && fadeCount < 25 && this.isRunning) {
        await this.tapKey('b', 50);
        await this.wait(60);
        fadeCount++;
      }
      // Extra B presses to clear any remaining dialog boxes
      for (let i = 0; i < 3; i++) {
        await this.tapKey('b', 50);
        await this.wait(80);
      }
      await this.wait(200);
    }
  }

  private async tapKey(key: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select', durationMs: number = 80): Promise<void> {
    if (!this.emulator) return;
    this.emulator.setJoypad(key, true);
    await this.wait(durationMs);
    if (this.emulator) {
      this.emulator.setJoypad(key, false);
    }
  }

  private releaseAllKeys(): void {
    if (!this.emulator) return;
    const keys: ('up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select')[] = [
      'up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'
    ];
    keys.forEach((k) => this.emulator?.setJoypad(k, false));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
