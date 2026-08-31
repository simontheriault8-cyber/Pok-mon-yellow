import { get, set, del, keys } from 'idb-keyval';
import { RomItem, SaveStateData, KeyBindings, TouchControlsConfig, ConsoleColor, VideoFilter } from '../emulator/types';

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  a: ['KeyK', 'KeyX', 'Space'],
  b: ['KeyJ', 'KeyZ'],
  turboA: ['KeyI'],
  turboB: ['KeyU'],
  start: ['Enter'],
  select: ['ShiftRight', 'ShiftLeft', 'Backspace'],
  fastForward: ['Tab', 'Backquote'],
  quickSave: ['F1', 'KeyO'],
  quickLoad: ['F3', 'KeyP'],
  pause: ['Escape']
};

export const DEFAULT_TOUCH_CONFIG: TouchControlsConfig = {
  enabled: true,
  scale: 0.9,
  opacity: 0.85,
  haptics: true,
  dpadType: 'dpad-8way',
  floatingDpad: false,
  showTurboButtons: true,
  showQuickBar: false,
  layoutMode: 'console',
  handMode: 'right',
  dpadPos: { x: 50, y: 78 }, // Center D-Pad for Right-Handed mode
  actionPos: { x: 82, y: 78 } // Right Action buttons
};

export interface AppSettings {
  shellColor: ConsoleColor;
  videoFilter: VideoFilter;
  volume: number;
  isMuted: boolean;
  keyBindings: KeyBindings;
  touchConfig: TouchControlsConfig;
  autoSaveBattery: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  shellColor: 'atomic-purple',
  videoFilter: 'lcd-grid',
  volume: 0.7,
  isMuted: false,
  keyBindings: DEFAULT_KEY_BINDINGS,
  touchConfig: DEFAULT_TOUCH_CONFIG,
  autoSaveBattery: true
};

const ROM_PREFIX = 'gbc_rom_';
const SAVE_STATE_PREFIX = 'gbc_state_';
const SRAM_PREFIX = 'gbc_sram_';
const SETTINGS_KEY = 'gbc_settings';

export class StorageService {
  // Settings
  static async loadSettings(): Promise<AppSettings> {
    try {
      const saved = await get(SETTINGS_KEY);
      if (saved) {
        const merged: AppSettings = { ...DEFAULT_SETTINGS, ...saved };
        // Migrate to right-handed defaults if old left-hand layout was loaded without explicit handMode
        if (!merged.touchConfig.handMode) {
          merged.touchConfig.handMode = 'right';
          merged.touchConfig.dpadPos = { x: 50, y: 78 };
          merged.touchConfig.actionPos = { x: 82, y: 78 };
        }
        return merged;
      }
    } catch (e) {
      console.warn('Failed to load settings from IDB', e);
    }
    return DEFAULT_SETTINGS;
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await set(SETTINGS_KEY, settings);
    } catch (e) {
      console.warn('Failed to save settings to IDB', e);
    }
  }

  // ROMs
  static async getSavedRoms(): Promise<RomItem[]> {
    try {
      const allKeys = await keys();
      const romKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(ROM_PREFIX));
      const roms: RomItem[] = [];
      for (const k of romKeys) {
        const item = (await get(k)) as RomItem | undefined;
        if (item) {
          // Clean up / purge legacy built-in demo homebrews that were stored in IDB
          const isLegacyDemo =
            item.isHomebrew ||
            item.id?.startsWith('hb_') ||
            item.title?.toUpperCase().includes('SPACE ODYSSEY') ||
            item.title?.toUpperCase().includes('TACTICAL DEFENSE') ||
            item.title?.toUpperCase().includes('COLOR SQUARES');

          if (isLegacyDemo) {
            await StorageService.deleteRom(item.id);
            continue;
          }
          roms.push(item);
        }
      }
      return roms.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
    } catch (e) {
      console.warn('Failed to get saved ROMs', e);
      return [];
    }
  }

  static async saveRom(rom: RomItem): Promise<void> {
    try {
      await set(`${ROM_PREFIX}${rom.id}`, rom);
    } catch (e) {
      console.warn('Failed to save ROM', e);
    }
  }

  static async deleteRom(romId: string): Promise<void> {
    try {
      await del(`${ROM_PREFIX}${romId}`);
      await del(`${SRAM_PREFIX}${romId}`);
      const allKeys = await keys();
      const prefix = `${SAVE_STATE_PREFIX}${romId}_`;
      const stateKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(prefix));
      for (const k of stateKeys) {
        await del(k);
      }
    } catch (e) {
      console.warn('Failed to delete ROM', e);
    }
  }

  // Save States
  static async getSaveStates(romId: string): Promise<{ slot: number; state: SaveStateData }[]> {
    try {
      const allKeys = await keys();
      const prefix = `${SAVE_STATE_PREFIX}${romId}_`;
      const stateKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(prefix));
      const results: { slot: number; state: SaveStateData }[] = [];

      for (const k of stateKeys) {
        const slotStr = (k as string).replace(prefix, '');
        const slot = parseInt(slotStr, 10);
        const state = await get(k);
        if (state) {
          results.push({ slot, state });
        }
      }
      return results.sort((a, b) => a.slot - b.slot);
    } catch (e) {
      console.warn('Failed to get save states', e);
      return [];
    }
  }

  static async saveSaveState(romId: string, slot: number, state: SaveStateData): Promise<void> {
    try {
      await set(`${SAVE_STATE_PREFIX}${romId}_${slot}`, state);
    } catch (e) {
      console.warn('Failed to save state', e);
    }
  }

  static async deleteSaveState(romId: string, slot: number): Promise<void> {
    try {
      await del(`${SAVE_STATE_PREFIX}${romId}_${slot}`);
    } catch (e) {
      console.warn('Failed to delete state', e);
    }
  }

  // Cartridge Battery SRAM (.sav)
  static async getSram(romId: string): Promise<Uint8Array | null> {
    try {
      const data = await get(`${SRAM_PREFIX}${romId}`);
      if (data) return new Uint8Array(data);
    } catch (e) {
      console.warn('Failed to load SRAM', e);
    }
    return null;
  }

  static async saveSram(romId: string, sramData: Uint8Array): Promise<void> {
    try {
      await set(`${SRAM_PREFIX}${romId}`, sramData);
    } catch (e) {
      console.warn('Failed to save SRAM', e);
    }
  }
}
