import { CPU } from './cpu';
import { MemoryBus } from './memory';
import { PPU } from './ppu';
import { APU } from './apu';
import { Cartridge } from './cartridge';
import { SaveStateData, SpeedMultiplier } from './types';

export class GameBoy {
  public mmu: MemoryBus;
  public cpu: CPU;
  public ppu: PPU;
  public apu: APU;
  public cart: Cartridge | null = null;

  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public speedMultiplier: SpeedMultiplier = 1;

  // Frame timing
  public readonly CYCLES_PER_FRAME = 70224;
  public readonly FRAME_DURATION_MS = 1000 / 59.7275; // 16.743 ms per Game Boy frame
  private animFrameId: number | null = null;
  private lastFrameTimestamp: number = 0;
  private frameAccumulator: number = 0;

  // Turbo button auto-fire tracker
  private turboAInterval: number = 0;
  private turboBInterval: number = 0;
  public turboAPressed: boolean = false;
  public turboBPressed: boolean = false;

  // Callbacks
  public onFrameRender?: (frameBuffer: Uint32Array) => void;
  public onSramModified?: (sram: Uint8Array) => void;

  constructor() {
    this.mmu = new MemoryBus();
    this.cpu = new CPU(this.mmu);
    this.ppu = new PPU(this.mmu);
    this.apu = new APU();

    this.mmu.ppu = this.ppu;
    this.mmu.apu = this.apu;
  }

  public loadROM(romData: Uint8Array, initialSram?: Uint8Array): void {
    this.stop();
    this.cart = new Cartridge(romData, initialSram);
    this.mmu.cart = this.cart;
    this.mmu.isCGB = this.cart.isCGB;

    this.mmu.reset();
    this.cpu.reset(this.cart.isCGB);
    this.ppu.initCgbPalettes();
    this.ppu.ly = 0;
    this.ppu.mode = 2;
    this.ppu.modeClock = 0;
    this.ppu.frameReady = false;
    this.ppu.frameBuffer.fill(0xffffffff);
    this.apu.reset();

    // Standard I/O startup values
    this.mmu.write(0xff40, 0x91); // LCDC on
    this.mmu.write(0xff47, 0xfc); // BGP
    this.mmu.write(0xff48, 0xff); // OBP0
    this.mmu.write(0xff49, 0xff); // OBP1

    this.start();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.apu.initAudioContext();
    this.lastFrameTimestamp = performance.now();
    this.frameAccumulator = 0;
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public pause(): void {
    this.isPaused = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.apu.initAudioContext();
    this.lastFrameTimestamp = performance.now();
    this.frameAccumulator = 0;
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.frameAccumulator = 0;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public unloadROM(): void {
    this.stop();
    this.cart = null;
    this.mmu.cart = null;
    this.mmu.reset();
    this.apu.reset();
    if (this.onFrameRender) {
      // Clear screen to black
      const emptyBuffer = new Uint32Array(160 * 144);
      this.onFrameRender(emptyBuffer);
    }
  }

  public setSpeed(speed: SpeedMultiplier): void {
    this.speedMultiplier = speed;
  }

  public setJoypad(key: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select', pressed: boolean): void {
    this.mmu.setJoypad(key, pressed);
  }

  public setTurbo(button: 'a' | 'b', pressed: boolean): void {
    if (button === 'a') {
      this.turboAPressed = pressed;
    } else {
      this.turboBPressed = pressed;
    }
  }

  public stepFrame(): void {
    const isDoubleSpeed = this.mmu.doubleSpeed;
    const baseCycles = isDoubleSpeed ? this.CYCLES_PER_FRAME * 2 : this.CYCLES_PER_FRAME;
    let cyclesThisFrame = 0;

    // Handle Turbo rapid-fire button oscillation
    if (this.turboAPressed) {
      this.turboAInterval++;
      this.setJoypad('a', (this.turboAInterval % 4) < 2);
    }
    if (this.turboBPressed) {
      this.turboBInterval++;
      this.setJoypad('b', (this.turboBInterval % 4) < 2);
    }

    const isFast = this.speedMultiplier > 1;

    while (cyclesThisFrame < baseCycles) {
      const cycles = this.cpu.step();
      cyclesThisFrame += cycles;

      // PPU and Timers run in 1x clock domain
      const normalCycles = isDoubleSpeed ? Math.floor(cycles / 2) : cycles;
      this.mmu.stepTimers(normalCycles);
      this.ppu.step(normalCycles);
      this.apu.step(normalCycles, isFast);
    }

    if (this.ppu.frameReady) {
      this.ppu.frameReady = false;
      if (this.onFrameRender) {
        this.onFrameRender(this.ppu.frameBuffer);
      }
    }

    if (this.cart && this.cart.sramModified) {
      this.cart.sramModified = false;
      if (this.onSramModified) {
        this.onSramModified(this.cart.sram);
      }
    }
  }

  private loop = (timestamp: number = performance.now()): void => {
    if (!this.isRunning || this.isPaused) return;

    if (!this.lastFrameTimestamp) {
      this.lastFrameTimestamp = timestamp;
    }

    let delta = timestamp - this.lastFrameTimestamp;
    this.lastFrameTimestamp = timestamp;

    // Clamp huge delta spikes (e.g. background tab or lag hitch) to max 100ms (prevents spiral of death)
    if (delta > 100) delta = 100;
    if (delta < 0) delta = 0;

    this.frameAccumulator += delta * this.speedMultiplier;

    // Step frames based on accumulated real time
    let framesToRun = Math.floor(this.frameAccumulator / this.FRAME_DURATION_MS);
    
    // Safety cap: Never run more than 8 frames in a single animation frame callback
    if (framesToRun > 8) {
      framesToRun = 8;
      this.frameAccumulator = 0;
    } else {
      this.frameAccumulator -= framesToRun * this.FRAME_DURATION_MS;
    }

    // Always run at least 1 frame if speedMultiplier >= 1 and accumulator has progressed
    if (framesToRun === 0 && delta >= this.FRAME_DURATION_MS * 0.75) {
      framesToRun = 1;
      this.frameAccumulator = Math.max(0, this.frameAccumulator - this.FRAME_DURATION_MS);
    }

    for (let i = 0; i < framesToRun; i++) {
      this.stepFrame();
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  // ----------------------------------------------------
  // REAL-TIME SAVE STATE ENGINE
  // ----------------------------------------------------
  public createSaveState(screenshotBase64: string = ''): SaveStateData | null {
    if (!this.cart) return null;

    return {
      version: 1,
      timestamp: Date.now(),
      romName: this.cart.title,
      romHash: `${this.cart.title}_${this.cart.rom.length}_${this.cart.mbcType}`,
      screenshot: screenshotBase64,
      cpu: {
        a: this.cpu.a,
        f: this.cpu.f,
        b: this.cpu.b,
        c: this.cpu.c,
        d: this.cpu.d,
        e: this.cpu.e,
        h: this.cpu.h,
        l: this.cpu.l,
        sp: this.cpu.sp,
        pc: this.cpu.pc,
        ime: this.cpu.ime,
        halted: this.cpu.halted,
        stopped: this.cpu.stopped,
        cycles: 0,
        divTimer: this.mmu.div,
        timerCounter: this.mmu.timerCounter
      },
      mmu: {
        wram: Array.from(this.mmu.wram),
        vram: Array.from(this.mmu.vram),
        hram: Array.from(this.mmu.hram),
        oam: Array.from(this.mmu.oam),
        sram: Array.from(this.cart.sram),
        io: Array.from(this.mmu.io),
        cgbWramBank: this.mmu.wramBank,
        cgbVramBank: this.mmu.vramBank,
        romBank: this.cart.romBank,
        ramBank: this.cart.ramBank,
        ramEnabled: this.cart.ramEnabled,
        mbcMode: this.cart.mbc1Mode,
        isCGB: this.mmu.isCGB
      },
      ppu: {
        mode: this.ppu.mode,
        modeClock: this.ppu.modeClock,
        line: this.ppu.ly,
        scx: this.ppu.scx,
        scy: this.ppu.scy,
        wx: this.ppu.wx,
        wy: this.ppu.wy,
        lcdc: this.ppu.lcdc,
        stat: this.ppu.stat,
        lyc: this.ppu.lyc,
        cgbBgp: Array.from(this.ppu.bcpd),
        cgbObjp: Array.from(this.ppu.ocpd)
      }
    };
  }

  public loadSaveState(state: SaveStateData): boolean {
    if (!this.cart) return false;

    // Restore CPU
    this.cpu.a = state.cpu.a;
    this.cpu.f = state.cpu.f;
    this.cpu.b = state.cpu.b;
    this.cpu.c = state.cpu.c;
    this.cpu.d = state.cpu.d;
    this.cpu.e = state.cpu.e;
    this.cpu.h = state.cpu.h;
    this.cpu.l = state.cpu.l;
    this.cpu.sp = state.cpu.sp;
    this.cpu.pc = state.cpu.pc;
    this.cpu.ime = state.cpu.ime;
    this.cpu.halted = state.cpu.halted;
    this.cpu.stopped = state.cpu.stopped;

    // Restore MMU
    this.mmu.wram.set(new Uint8Array(state.mmu.wram));
    this.mmu.vram.set(new Uint8Array(state.mmu.vram));
    this.mmu.hram.set(new Uint8Array(state.mmu.hram));
    this.mmu.oam.set(new Uint8Array(state.mmu.oam));
    this.mmu.io.set(new Uint8Array(state.mmu.io));
    this.mmu.wramBank = state.mmu.cgbWramBank;
    this.mmu.vramBank = state.mmu.cgbVramBank;
    this.mmu.div = state.cpu.divTimer;
    this.mmu.timerCounter = state.cpu.timerCounter;

    // Restore Cartridge
    this.cart.sram.set(new Uint8Array(state.mmu.sram));
    this.cart.romBank = state.mmu.romBank;
    this.cart.ramBank = state.mmu.ramBank;
    this.cart.ramEnabled = state.mmu.ramEnabled;
    this.cart.mbc1Mode = state.mmu.mbcMode;

    // Restore PPU
    this.ppu.mode = state.ppu.mode;
    this.ppu.modeClock = state.ppu.modeClock;
    this.ppu.ly = state.ppu.line;
    this.ppu.scx = state.ppu.scx;
    this.ppu.scy = state.ppu.scy;
    this.ppu.wx = state.ppu.wx;
    this.ppu.wy = state.ppu.wy;
    this.ppu.lcdc = state.ppu.lcdc;
    this.ppu.stat = state.ppu.stat;
    this.ppu.lyc = state.ppu.lyc;
    if (state.ppu.cgbBgp) this.ppu.bcpd.set(new Uint8Array(state.ppu.cgbBgp));
    if (state.ppu.cgbObjp) this.ppu.ocpd.set(new Uint8Array(state.ppu.cgbObjp));

    return true;
  }

  public getBatterySave(): Uint8Array | null {
    if (!this.cart || this.cart.sram.length === 0) return null;
    return new Uint8Array(this.cart.sram);
  }

  public loadBatterySave(sramData: Uint8Array): void {
    if (!this.cart) return;
    const len = Math.min(this.cart.sram.length, sramData.length);
    for (let i = 0; i < len; i++) {
      this.cart.sram[i] = sramData[i];
    }
  }
}
