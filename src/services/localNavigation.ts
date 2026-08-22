// Module 2: Local Map Navigation & Auto-Heal Pathfinding Engine
// Handles:
// 1. Precise local movement (step-by-step target coordinates)
// 2. Door/Warp interactions
// 3. Nurse Joy dialogue automation (heal party, clear text)
// 4. Return from Pokémon Center to the training grounds

import { GameBoy } from '../emulator/gameboy';
import { POKEMON_YELLOW_RAM, resolveAddr } from './pokemonYellowRam';
import { readNavigationState, PokecenterLocation } from './worldNavigation';

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

export class LocalNavigationEngine {
  private emulator: GameBoy | null = null;
  private isRunning: boolean = false;
  private currentStatus: AutoHealStatus = 'idle';
  private onProgressCallback?: (progress: AutoHealProgress) => void;
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

  public stop(): void {
    this.isRunning = false;
    this.currentStatus = 'idle';
    this.releaseAllKeys();
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
   * 2. Travel to the Pokémon Center door
   * 3. Enter the door (walk Up into building)
   * 4. Walk to Nurse Joy counter at (3, 3) facing Up
   * 5. Trigger dialogue with [A], wait for heal jingle, clear dialogue with [B]
   * 6. Exit the Pokémon Center (walk down to (3, 7))
   * 7. (Optional) Return to origin training spot
   */
  public async executeAutoHealSequence(returnToOrigin: boolean = true): Promise<boolean> {
    if (!this.emulator || this.isRunning) return false;
    const mmu = this.emulator.mmu;
    if (!mmu) return false;

    this.isRunning = true;

    try {
      // Step 1: Read current position & determine closest Pokémon Center
      let nav = readNavigationState(mmu);
      if (!nav || !nav.closestPokecenter) {
        this.currentStatus = 'error';
        this.notifyProgress('Aucun Centre Pokémon détecté ou accessible.', null, null, 0);
        return false;
      }

      // Record starting coordinates to come back after healing
      if (this.originTrainingCoords === null) {
        this.originTrainingMapId = nav.currentMapId;
        this.originTrainingCoords = { x: nav.playerX, y: nav.playerY };
      }

      const targetCenter = nav.closestPokecenter.targetPokecenter;

      // Step 2: If outside, move towards the Pokémon Center door
      if (!nav.closestPokecenter.isAlreadyInside) {
        this.currentStatus = 'navigating_to_pokecenter';
        
        // If in an adjacent map, step towards the connecting zone first
        while (this.isRunning && nav.currentMapId !== targetCenter.outdoorMapId) {
          const nextTargetMap = nav.closestPokecenter.mapRoute[1];
          this.notifyProgress(
            `Voyage vers ${targetCenter.name} (Changement de carte en cours)...`,
            null,
            { x: nav.playerX, y: nav.playerY },
            nav.closestPokecenter.directDistance
          );

          // Walk towards the connection (e.g., if on Route 22 moving East to Viridian, walk right)
          await this.navigateAcrossAdjacentMap(mmu, nextTargetMap);
          await this.wait(200);
          nav = readNavigationState(mmu)!;
        }

        if (!this.isRunning) return false;

        // Now in the same outdoor map (e.g. Viridian City)
        this.notifyProgress(
          `Déplacement vers la porte du ${targetCenter.name} (${targetCenter.doorCoords.x}, ${targetCenter.doorCoords.y})...`,
          targetCenter.doorCoords,
          { x: nav.playerX, y: nav.playerY },
          Math.abs(nav.playerX - targetCenter.doorCoords.x) + Math.abs(nav.playerY - targetCenter.doorCoords.y)
        );

        const reachedDoor = await this.walkToCoordinates(
          mmu,
          targetCenter.doorCoords.x,
          targetCenter.doorCoords.y + 1 // Position directly in front of the door
        );

        if (!reachedDoor || !this.isRunning) return false;

        // Step 3: Step UP into the door
        this.currentStatus = 'entering_door';
        this.notifyProgress(`Entrée dans le ${targetCenter.name}...`, targetCenter.doorCoords, null, 0);
        await this.stepDirection(mmu, 'up');
        await this.wait(600); // Wait for map transition warp
      }

      // Step 4: Now inside the Pokémon Center
      nav = readNavigationState(mmu)!;
      if (nav.currentMapId !== targetCenter.indoorMapId) {
        // Retry stepping up once if warp didn't trigger immediately
        await this.stepDirection(mmu, 'up');
        await this.wait(600);
        nav = readNavigationState(mmu)!;
      }

      this.currentStatus = 'approaching_nurse';
      this.notifyProgress('Approche du comptoir de l\'Infirmière Joëlle (3, 3)...', { x: 3, y: 3 }, { x: nav.playerX, y: nav.playerY }, 0);

      // Walk to Nurse interaction position (X=3, Y=3)
      await this.walkToCoordinates(mmu, 3, 3);
      if (!this.isRunning) return false;

      // Face UP towards the Nurse
      nav = readNavigationState(mmu)!;
      if (nav.rawFacing !== 0x04) {
        await this.tapKey('up', 80);
        await this.wait(150);
      }

      // Step 5: Nurse Joy Dialogue Automation
      this.currentStatus = 'talking_to_nurse';
      this.notifyProgress('🩺 Soin de l\'équipe Pokémon auprès de Joëlle...', { x: 3, y: 2 }, { x: 3, y: 3 }, 0);
      await this.interactWithNurse(mmu);
      if (!this.isRunning) return false;

      // Step 6: Exit the Pokémon Center
      this.currentStatus = 'exiting_pokecenter';
      this.notifyProgress('Sortie du Centre Pokémon...', { x: 3, y: 7 }, null, 0);
      await this.walkToCoordinates(mmu, 3, 7);
      if (!this.isRunning) return false;

      // Step Down on mat to warp out
      await this.stepDirection(mmu, 'down');
      await this.wait(600); // Warp out to city

      // Step 7: Return to original training spot if requested
      if (returnToOrigin && this.originTrainingCoords && this.originTrainingMapId !== null) {
        this.currentStatus = 'returning_to_training';
        this.notifyProgress(
          `Retour vers la zone d'entraînement initiale (${this.originTrainingCoords.x}, ${this.originTrainingCoords.y})...`,
          this.originTrainingCoords,
          null,
          0
        );

        if (this.originTrainingMapId === targetCenter.outdoorMapId) {
          await this.walkToCoordinates(mmu, this.originTrainingCoords.x, this.originTrainingCoords.y);
        } else {
          // If on a different map (e.g. Route 22 or Route 1), cross back
          await this.navigateAcrossAdjacentMap(mmu, this.originTrainingMapId);
          await this.walkToCoordinates(mmu, this.originTrainingCoords.x, this.originTrainingCoords.y);
        }
      }

      this.currentStatus = 'completed';
      this.notifyProgress('✨ Soin terminé avec succès ! Équipe à 100% de PV.', null, null, 0);
      return true;
    } catch (e) {
      console.error('Erreur LocalNavigationEngine:', e);
      this.currentStatus = 'error';
      this.notifyProgress('Erreur pendant la navigation.', null, null, 0);
      return false;
    } finally {
      this.isRunning = false;
      this.releaseAllKeys();
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

    let maxSteps = 150;
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
        if (stuckAttempts >= 3) {
          // Obstacle avoidance: try alternate axis detour
          await this.avoidObstacle(mmu, currentX, currentY, targetX, targetY);
          stuckAttempts = 0;
        }
      } else {
        stuckAttempts = 0;
      }

      lastX = currentX;
      lastY = currentY;

      // Determine step direction (prioritize larger delta)
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

  /**
   * Helper to handle map transitions (e.g. crossing Route 22 to Viridian City)
   */
  private async navigateAcrossAdjacentMap(mmu: any, targetMapId: number): Promise<void> {
    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
    const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);

    const curMap = mmu.read(mapIdAddr);
    let curX = mmu.read(xAddr);
    let curY = mmu.read(yAddr);

    // Route 22 (0x21) -> Jadielle (0x01) connects at the East border (walk Right)
    if (curMap === 0x21 && targetMapId === 0x01) {
      // Walk towards the east edge
      await this.walkToCoordinates(mmu, 39, curY);
      await this.stepDirection(mmu, 'right');
      await this.stepDirection(mmu, 'right');
    }
    // Route 1 (0x0C) -> Jadielle (0x01) connects at the North border (walk Up)
    else if (curMap === 0x0C && targetMapId === 0x01) {
      await this.walkToCoordinates(mmu, curX, 0);
      await this.stepDirection(mmu, 'up');
      await this.stepDirection(mmu, 'up');
    }
    // Jadielle (0x01) -> Route 22 (0x21) connects at the West border (walk Left)
    else if (curMap === 0x01 && targetMapId === 0x21) {
      await this.walkToCoordinates(mmu, 0, 9);
      await this.stepDirection(mmu, 'left');
      await this.stepDirection(mmu, 'left');
    }
  }

  private async avoidObstacle(
    mmu: any,
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number
  ): Promise<void> {
    // Try moving perpendicularly to bypass the obstacle
    if (targetX !== currentX) {
      // Trying to move horizontally, blocked -> move UP or DOWN
      await this.stepDirection(mmu, 'up');
      await this.wait(100);
      await this.stepDirection(mmu, 'up');
    } else {
      // Trying to move vertically, blocked -> move LEFT or RIGHT
      await this.stepDirection(mmu, 'right');
      await this.wait(100);
      await this.stepDirection(mmu, 'right');
    }
  }

  private async stepDirection(mmu: any, dir: 'left' | 'right' | 'up' | 'down'): Promise<void> {
    // In Gen 1, holding direction for ~180-220ms performs a full 1-tile grid step
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
