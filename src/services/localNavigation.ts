// Module 2: Local Map Navigation & Auto-Heal Pathfinding Engine
// Handles:
// 1. Precise local movement with intelligent waypoints (corridors, fences, ledges)
// 2. Map-to-map transitions (Route 1 <-> Viridian <-> Route 22 <-> Pokécenter)
// 3. Door/Warp interactions
// 4. Nurse Joy dialogue automation (heal party, clear text)
// 5. Safe return from Pokémon Center to the origin training grounds
// 6. Complete diagnostic logging and execution timer

import { GameBoy } from '../emulator/gameboy';
import { POKEMON_YELLOW_RAM, resolveAddr } from './pokemonYellowRam';
import { readNavigationState, POKEMON_YELLOW_MAPS } from './worldNavigation';

export type AutoHealStatus =
  | 'idle'
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
}

export interface NavLogEntry {
  id: string;
  time: string;
  type: 'info' | 'nav' | 'step' | 'door' | 'nurse' | 'heal' | 'return' | 'error' | 'stop';
  message: string;
  coords?: { x: number; y: number };
  mapId?: number;
}

interface Waypoint {
  x: number;
  y: number;
  description?: string;
}

export class LocalNavigationEngine {
  private emulator: GameBoy | null = null;
  private isRunning: boolean = false;
  private startTime: number | null = null;
  private currentStatus: AutoHealStatus = 'idle';
  private logs: NavLogEntry[] = [];
  private onProgressCallback?: (progress: AutoHealProgress) => void;
  public onLogsUpdate?: (logs: NavLogEntry[]) => void;
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
    this.addLog('stop', '⛔ Module 2 arrêté par l\'utilisateur.');
    this.notifyProgress('Navigation arrêtée par l\'utilisateur.', null, null, 0);
  }

  private notifyProgress(
    stepMessage: string,
    targetCoords: { x: number; y: number } | null,
    currentCoords: { x: number; y: number } | null,
    distance: number
  ): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        status: this.currentStatus,
        stepMessage,
        targetCoords,
        currentCoords,
        distance,
      });
    }
  }

  /**
   * Execute full automated Auto-Heal sequence:
   * 1. Save origin coordinates for the return trip
   * 2. Travel to the Pokémon Center door (smart waypoint corridors)
   * 3. Enter the door (walk Up into building)
   * 4. Walk to Nurse Joy counter at (3, 3) facing Up
   * 5. Trigger dialogue with [A], wait for heal jingle, clear dialogue with [B]
   * 6. Exit the Pokémon Center (walk down to (3, 7))
   * 7. Return to origin training spot
   */
  public async executeAutoHealSequence(returnToOrigin: boolean = true): Promise<boolean> {
    if (!this.emulator || this.isRunning) return false;
    const mmu = this.emulator.mmu;
    if (!mmu) return false;

    this.isRunning = true;
    this.startTime = Date.now();
    this.addLog('info', '🚀 Lancement du Module 2 : Séquence d\'Auto-Soin complète');

    try {
      // Step 1: Read current position & determine closest Pokémon Center
      let nav = readNavigationState(mmu);
      if (!nav || !nav.closestPokecenter) {
        this.currentStatus = 'error';
        this.addLog('error', '❌ Aucun Centre Pokémon détecté ou accessible depuis cette position.');
        this.notifyProgress('Aucun Centre Pokémon détecté ou accessible.', null, null, 0);
        return false;
      }

      // Record starting coordinates to come back after healing
      this.originTrainingMapId = nav.currentMapId;
      this.originTrainingCoords = { x: nav.playerX, y: nav.playerY };
      const curMapName = POKEMON_YELLOW_MAPS[nav.currentMapId] || `Map 0x${nav.currentMapId.toString(16)}`;

      this.addLog(
        'nav',
        `📍 Point de départ enregistré : ${curMapName} (${nav.playerX}, ${nav.playerY})`,
        { x: nav.playerX, y: nav.playerY },
        nav.currentMapId
      );

      const targetCenter = nav.closestPokecenter.targetPokecenter;
      this.addLog(
        'info',
        `🎯 Cible : ${targetCenter.name} (Porte en (${targetCenter.doorCoords.x}, ${targetCenter.doorCoords.y}))`
      );

      // Step 2: If outside, navigate to Pokémon Center door using waypoint corridors
      if (!nav.closestPokecenter.isAlreadyInside) {
        this.currentStatus = 'navigating_to_pokecenter';

        // Phase 2a: If on Route 1 (0x0C), navigate North towards Viridian City (0x01)
        if (nav.currentMapId === 0x0C) {
          this.addLog('nav', '🗺️ Navigation sur Route 1 vers le passage Nord (Jadielle)...');
          await this.navigateRoute1ToViridian(mmu);
          if (!this.isRunning) return false;
          nav = readNavigationState(mmu)!;
        }
        // Phase 2b: If on Route 22 (0x21), navigate East towards Viridian City (0x01)
        else if (nav.currentMapId === 0x21) {
          this.addLog('nav', '🗺️ Navigation sur Route 22 vers le passage Est (Jadielle)...');
          await this.navigateRoute22ToViridian(mmu);
          if (!this.isRunning) return false;
          nav = readNavigationState(mmu)!;
        }

        // Phase 2c: In Viridian City (0x01) -> Navigate to Pokémon Center door (23, 26)
        if (nav.currentMapId === targetCenter.outdoorMapId) {
          this.addLog('nav', '🏙️ Navigation dans Jadielle vers le Centre Pokémon...');
          await this.navigateViridianToPokecenterDoor(mmu, targetCenter.doorCoords);
          if (!this.isRunning) return false;
        }

        // Step 3: Enter the door (Step UP)
        this.currentStatus = 'entering_door';
        this.addLog('door', `🚪 Entrée dans le ${targetCenter.name}...`);
        this.notifyProgress(`Entrée dans le ${targetCenter.name}...`, targetCenter.doorCoords, null, 0);
        await this.stepDirection(mmu, 'up');
        await this.wait(700); // Wait for warp fade transition
      }

      // Step 4: Inside the Pokémon Center
      nav = readNavigationState(mmu)!;
      if (nav.currentMapId !== targetCenter.indoorMapId) {
        // Retry stepping up once if warp didn't trigger
        await this.stepDirection(mmu, 'up');
        await this.wait(700);
        nav = readNavigationState(mmu)!;
      }

      this.addLog('nav', `🏥 Arrivée à l'intérieur du ${targetCenter.name} (Map 0x${nav.currentMapId.toString(16)})`);
      this.currentStatus = 'approaching_nurse';
      this.notifyProgress('Approche du comptoir de l\'Infirmière Joëlle (3, 3)...', { x: 3, y: 3 }, { x: nav.playerX, y: nav.playerY }, 0);

      // Walk to Nurse interaction tile (X=3, Y=3)
      this.addLog('step', '🚶 Déplacement vers le guichet de l\'Infirmière Joëlle (3, 3)...');
      await this.walkToCoordinates(mmu, 3, 3);
      if (!this.isRunning) return false;

      // Face UP towards the Nurse
      nav = readNavigationState(mmu)!;
      if (nav.rawFacing !== 0x04) {
        this.addLog('nav', '👀 Orientation vers le haut (face à Joëlle)...');
        await this.tapKey('up', 80);
        await this.wait(150);
      }

      // Step 5: Nurse Joy Dialogue Automation
      this.currentStatus = 'talking_to_nurse';
      this.addLog('nurse', '💬 Début du dialogue avec l\'Infirmière Joëlle [A]...');
      this.notifyProgress('🩺 Soin de l\'équipe Pokémon auprès de Joëlle...', { x: 3, y: 2 }, { x: 3, y: 3 }, 0);
      await this.interactWithNurse(mmu);
      if (!this.isRunning) return false;

      this.addLog('heal', '✨ Équipe Pokémon soignée à 100% de PV !');

      // Step 6: Exit the Pokémon Center
      this.currentStatus = 'exiting_pokecenter';
      this.addLog('step', '🚶 Déplacement vers la sortie du Centre Pokémon (3, 7)...');
      this.notifyProgress('Sortie du Centre Pokémon...', { x: 3, y: 7 }, null, 0);
      await this.walkToCoordinates(mmu, 3, 7);
      if (!this.isRunning) return false;

      // Step Down on mat to warp out
      this.addLog('door', '🚪 Sortie du Centre Pokémon vers Jadielle...');
      await this.stepDirection(mmu, 'down');
      await this.wait(700); // Warp out to city

      // Step 7: Return to original training spot if requested
      if (returnToOrigin && this.originTrainingCoords && this.originTrainingMapId !== null) {
        this.currentStatus = 'returning_to_training';
        const originMapName = POKEMON_YELLOW_MAPS[this.originTrainingMapId] || `Map 0x${this.originTrainingMapId.toString(16)}`;
        this.addLog(
          'return',
          `🔄 Trajet retour vers le spot d'entraînement : ${originMapName} (${this.originTrainingCoords.x}, ${this.originTrainingCoords.y})...`,
          this.originTrainingCoords,
          this.originTrainingMapId
        );

        await this.navigateReturnToOrigin(
          mmu,
          this.originTrainingMapId,
          this.originTrainingCoords.x,
          this.originTrainingCoords.y
        );
      }

      this.currentStatus = 'completed';
      const totalElapsed = this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : '0';
      this.addLog('heal', `🎉 Module 2 terminé avec succès en ${totalElapsed}s ! Prêt pour le combat.`);
      this.notifyProgress('✨ Soin terminé avec succès ! Équipe à 100% de PV.', null, null, 0);
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
   * Route 1 -> Viridian City Corridor Pathfinding
   * Avoids the fences and trees on the east/west side of Route 1.
   */
  private async navigateRoute1ToViridian(mmu: any): Promise<void> {
    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
    const curX = mmu.read(xAddr);
    const curY = mmu.read(yAddr);

    this.addLog('step', `🚶 Alignement sur le couloir central de la Route 1 (Position: ${curX}, ${curY})...`);

    // If near top of Route 1 (Y <= 10, e.g. at (15, 5))
    if (curY <= 10) {
      // 1. Move horizontally to the clear road at X=10 or X=11 at safe Y
      const safeY = Math.max(curY, 4); // Y >= 4 avoids the top fence row at Y <= 3
      if (curY < 4) {
        await this.walkToCoordinates(mmu, curX, 4);
      }
      await this.walkToCoordinates(mmu, 10, safeY);
      // 2. Walk straight North up the road to (10, 0)
      await this.walkToCoordinates(mmu, 10, 0);
    } else {
      // If further south on Route 1, follow the open northbound path around ledges
      await this.walkToCoordinates(mmu, 14, Math.min(curY, 20));
      await this.walkToCoordinates(mmu, 14, 12);
      await this.walkToCoordinates(mmu, 10, 12);
      await this.walkToCoordinates(mmu, 10, 0);
    }

    // Step UP into Viridian City
    this.addLog('nav', '🚪 Franchissement de la frontière Nord vers Jadielle...');
    await this.stepDirection(mmu, 'up');
    await this.stepDirection(mmu, 'up');
    await this.wait(500);
  }

  /**
   * Route 22 -> Viridian City Corridor Pathfinding
   * Exit East at X=39, Y=9 into Viridian City
   */
  private async navigateRoute22ToViridian(mmu: any): Promise<void> {
    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
    const curX = mmu.read(xAddr);
    const curY = mmu.read(yAddr);

    this.addLog('step', `🚶 Alignement sur le chemin Est de la Route 22 (${curX}, ${curY})...`);
    // Align to open path at Y=9
    await this.walkToCoordinates(mmu, curX, 9);
    // Walk to East border (39, 9)
    await this.walkToCoordinates(mmu, 39, 9);

    // Step RIGHT into Viridian City
    this.addLog('nav', '🚪 Franchissement de la frontière Est vers Jadielle...');
    await this.stepDirection(mmu, 'right');
    await this.stepDirection(mmu, 'right');
    await this.wait(500);
  }

  /**
   * Viridian City Main Boulevard to Pokémon Center Door (23, 26)
   */
  private async navigateViridianToPokecenterDoor(mmu: any, doorCoords: { x: number; y: number }): Promise<void> {
    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
    const curX = mmu.read(xAddr);
    const curY = mmu.read(yAddr);

    this.addLog('step', `🚶 Progression sur les avenues de Jadielle (${curX}, ${curY}) ➜ Porte (${doorCoords.x}, ${doorCoords.y})...`);

    // Main north-south street in Viridian City is along X=21..23
    // If coming from Route 22 (West side: X < 20, Y around 8..9)
    if (curX < 20) {
      await this.walkToCoordinates(mmu, 21, 9);
      await this.walkToCoordinates(mmu, 21, 26);
    }
    // If coming from Route 1 (South side: Y > 28, X around 21..22)
    else if (curY > 26) {
      await this.walkToCoordinates(mmu, 21, 26);
    }
    // If somewhere in north/center of city
    else {
      await this.walkToCoordinates(mmu, 21, curY);
      await this.walkToCoordinates(mmu, 21, 26);
    }

    // Move to front of door at (23, 26)
    await this.walkToCoordinates(mmu, doorCoords.x, doorCoords.y + 1);

    // Turn face UP towards door
    await this.tapKey('up', 60);
    await this.wait(100);
  }

  /**
   * Return journey from Viridian City back to the origin spot
   */
  private async navigateReturnToOrigin(
    mmu: any,
    targetMapId: number,
    targetX: number,
    targetY: number
  ): Promise<void> {
    const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);
    let curMap = mmu.read(mapIdAddr);

    // If target is Route 1 (0x0C)
    if (targetMapId === 0x0C) {
      this.addLog('return', '🚶 Trajet vers la sortie Sud de Jadielle vers Route 1...');
      // Walk down main road to South border at (21, 35)
      await this.walkToCoordinates(mmu, 21, 26);
      await this.walkToCoordinates(mmu, 21, 35);
      // Step DOWN into Route 1 (10, 0)
      await this.stepDirection(mmu, 'down');
      await this.stepDirection(mmu, 'down');
      await this.wait(500);

      // Now on Route 1
      this.addLog('return', `🚶 Retour au spot exact sur Route 1 (${targetX}, ${targetY})...`);
      // If target is in north grass (Y <= 10)
      if (targetY <= 10) {
        await this.walkToCoordinates(mmu, 10, Math.max(targetY, 4));
        await this.walkToCoordinates(mmu, targetX, targetY);
      } else {
        await this.walkToCoordinates(mmu, targetX, targetY);
      }
    }
    // If target is Route 22 (0x21)
    else if (targetMapId === 0x21) {
      this.addLog('return', '🚶 Trajet vers la sortie Ouest de Jadielle vers Route 22...');
      // Walk to West exit at (0, 9)
      await this.walkToCoordinates(mmu, 21, 26);
      await this.walkToCoordinates(mmu, 21, 9);
      await this.walkToCoordinates(mmu, 0, 9);
      // Step LEFT into Route 22 (39, 9)
      await this.stepDirection(mmu, 'left');
      await this.stepDirection(mmu, 'left');
      await this.wait(500);

      // Now on Route 22
      this.addLog('return', `🚶 Retour au spot exact sur Route 22 (${targetX}, ${targetY})...`);
      await this.walkToCoordinates(mmu, targetX, targetY);
    }
    // If target was inside Viridian City
    else if (targetMapId === 0x01) {
      this.addLog('return', `🚶 Retour au spot dans Jadielle (${targetX}, ${targetY})...`);
      await this.walkToCoordinates(mmu, targetX, targetY);
    }
  }

  /**
   * Dialogue interaction with Nurse Joy:
   * - Press [A] to initiate conversation
   * - Press [A] / [B] through "Welcome to our Pokémon Center!"
   * - Wait for the Pokéball healing jingle (joypad locked)
   * - Clear closing dialogue "We hope to see you again!"
   */
  private async interactWithNurse(mmu: any): Promise<void> {
    const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);

    // Initial talk trigger
    await this.tapKey('a', 90);
    await this.wait(200);

    let attempts = 0;
    let healed = false;
    this.addLog('nurse', '🎵 Attente de la mélodie de soin des Pokéballs...');

    // Loop through dialogue until joyful heal is completed and control returned
    while (attempts < 60 && this.isRunning) {
      const joyIgnore = mmu.read(joyIgnoreAddr);

      // Advance dialogue
      await this.tapKey('a', 60);
      await this.wait(120);

      // If text box closed and joypad is unlocked, heal is complete
      if (attempts > 15 && joyIgnore === 0) {
        // Clear any residual textbox prompt with [B]
        await this.tapKey('b', 60);
        await this.wait(100);
        healed = true;
        this.addLog('nurse', '🩺 Dialogue avec Joëlle clôturé avec succès.');
        break;
      }

      attempts++;
    }
  }

  /**
   * Move from current coordinates to target coordinates (targetX, targetY)
   * Checks RAM coordinates step-by-step for absolute reliability.
   */
  public async walkToCoordinates(mmu: any, targetX: number, targetY: number): Promise<boolean> {
    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);

    let maxSteps = 160;
    let stuckAttempts = 0;
    let lastX = -1;
    let lastY = -1;

    while (maxSteps > 0 && this.isRunning) {
      const currentX = mmu.read(xAddr);
      const currentY = mmu.read(yAddr);

      if (currentX === targetX && currentY === targetY) {
        return true;
      }

      // Check if stuck against obstacle
      if (currentX === lastX && currentY === lastY) {
        stuckAttempts++;
        if (stuckAttempts >= 2) {
          this.addLog('step', `⚠️ Obstacle en (${currentX}, ${currentY}), contournement...`);
          // Smart detour perpendicular to target
          await this.avoidObstacle(mmu, currentX, currentY, targetX, targetY);
          stuckAttempts = 0;
        }
      } else {
        stuckAttempts = 0;
      }

      lastX = currentX;
      lastY = currentY;

      // Determine step direction (prioritize horizontal if horizontal delta is larger, else vertical)
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) await this.stepDirection(mmu, 'right');
        else if (dx < 0) await this.stepDirection(mmu, 'left');
        else if (dy > 0) await this.stepDirection(mmu, 'down');
        else if (dy < 0) await this.stepDirection(mmu, 'up');
      } else {
        if (dy > 0) await this.stepDirection(mmu, 'down');
        else if (dy < 0) await this.stepDirection(mmu, 'up');
        else if (dx > 0) await this.stepDirection(mmu, 'right');
        else if (dx < 0) await this.stepDirection(mmu, 'left');
      }

      await this.wait(90);
      maxSteps--;
    }

    return false;
  }

  private async avoidObstacle(
    mmu: any,
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number
  ): Promise<void> {
    const dx = targetX - currentX;
    const dy = targetY - currentY;

    // If blocked trying to move horizontally, try moving vertically
    if (Math.abs(dx) > 0) {
      if (dy > 0 || currentY < 10) {
        await this.stepDirection(mmu, 'down');
      } else {
        await this.stepDirection(mmu, 'up');
      }
      await this.wait(120);
    } 
    // If blocked trying to move vertically, try moving horizontally towards open lane
    else {
      if (currentX > 10) {
        await this.stepDirection(mmu, 'left');
      } else {
        await this.stepDirection(mmu, 'right');
      }
      await this.wait(120);
    }
  }

  private async stepDirection(mmu: any, dir: 'left' | 'right' | 'up' | 'down'): Promise<void> {
    // In Gen 1, holding direction for ~190ms performs a clean 1-tile grid step
    await this.tapKey(dir, 190);
  }

  private async tapKey(key: 'left' | 'right' | 'up' | 'down' | 'a' | 'b' | 'start' | 'select', durationMs: number = 60): Promise<void> {
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
}
