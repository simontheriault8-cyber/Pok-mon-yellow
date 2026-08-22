export interface GameBoyRegisters {
  a: number;
  f: number;
  b: number;
  c: number;
  d: number;
  e: number;
  h: number;
  l: number;
  sp: number;
  pc: number;
  ime: boolean;
  halted: boolean;
  stopped: boolean;
}

export interface SaveStateData {
  version: number;
  timestamp: number;
  romName: string;
  romHash: string;
  screenshot: string;
  cpu: {
    a: number;
    f: number;
    b: number;
    c: number;
    d: number;
    e: number;
    h: number;
    l: number;
    sp: number;
    pc: number;
    ime: boolean;
    halted: boolean;
    stopped: boolean;
    cycles: number;
    divTimer: number;
    timerCounter: number;
  };
  mmu: {
    wram: number[];
    vram: number[];
    hram: number[];
    oam: number[];
    sram: number[];
    io: number[];
    cgbWramBank: number;
    cgbVramBank: number;
    romBank: number;
    ramBank: number;
    ramEnabled: boolean;
    mbcMode: number;
    isCGB: boolean;
  };
  ppu: {
    mode: number;
    modeClock: number;
    line: number;
    scx: number;
    scy: number;
    wx: number;
    wy: number;
    lcdc: number;
    stat: number;
    lyc: number;
    cgbBgp: number[];
    cgbObjp: number[];
  };
}

export interface RomItem {
  id: string;
  name: string;
  title: string;
  size: number;
  isCGB: boolean;
  data: Uint8Array;
  lastPlayed?: number;
  playTimeSeconds?: number;
  coverArt?: string;
  isHomebrew?: boolean;
  isPatched?: boolean;
  patchName?: string;
}

export interface KeyBindings {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  a: string[];
  b: string[];
  turboA: string[];
  turboB: string[];
  start: string[];
  select: string[];
  fastForward: string[];
  quickSave: string[];
  quickLoad: string[];
  pause: string[];
}

export type MobileLayoutMode = 'console' | 'arcade';

export type AppTheme =
  | 'atomic-purple'
  | 'teal'
  | 'yellow'
  | 'berry'
  | 'classic-gray'
  | 'midnight-oled'
  | 'neon-pink'
  | 'emerald-green';

export type ConsoleColor = AppTheme;

export type HandMode = 'sides' | 'right' | 'left';

export type DpadType = 'dpad-4way' | 'dpad-8way' | 'dynamic-joystick';

export interface TouchControlsConfig {
  enabled: boolean;
  scale: number; // 0.7 to 1.4
  opacity: number; // 0.2 to 1.0
  haptics: boolean;
  dpadType?: DpadType; // 'dpad-4way' | 'dpad-8way' | 'dynamic-joystick'
  floatingDpad: boolean;
  showTurboButtons: boolean;
  showQuickBar: boolean;
  layoutMode: MobileLayoutMode;
  handMode?: HandMode; // 'right' (D-pad center, A/B right) | 'left' (D-pad left, A/B center)
  dpadPos: { x: number; y: number }; // percentage or offsets
  actionPos: { x: number; y: number };
}

export type VideoFilter = 'clean' | 'lcd-grid' | 'gbc-color' | 'dmg-green' | 'crt-scanlines' | 'smooth';

export type SpeedMultiplier = 1 | 1.5 | 2 | 3 | 4 | 8;
