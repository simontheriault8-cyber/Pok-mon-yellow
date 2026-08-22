import { Cartridge } from './cartridge';
import { PPU } from './ppu';
import { APU } from './apu';

export class MemoryBus {
  public cart: Cartridge | null = null;
  public ppu: PPU | null = null;
  public apu: APU | null = null;

  // CGB mode flags
  public isCGB: boolean = false;
  public doubleSpeed: boolean = false;
  public prepareSpeedSwitch: boolean = false;

  // RAM banks
  public vram: Uint8Array = new Uint8Array(16384); // 2 banks of 8KB (CGB)
  public vramBank: number = 0;

  public wram: Uint8Array = new Uint8Array(32768); // 8 banks of 4KB (CGB)
  public wramBank: number = 1;

  public hram: Uint8Array = new Uint8Array(128);
  public oam: Uint8Array = new Uint8Array(160);
  public io: Uint8Array = new Uint8Array(128);

  public ie: number = 0; // $FFFF Interrupt Enable
  public if: number = 0; // $FF0F Interrupt Flag

  // Joypad state
  // bit 0: A/Right, bit 1: B/Left, bit 2: Select/Up, bit 3: Start/Down
  public joypadButtons: number = 0x0f;
  public joypadDirection: number = 0x0f;

  // Timers
  public div: number = 0; // Internal 16-bit DIV counter
  public tima: number = 0;
  public tma: number = 0;
  public tac: number = 0;
  public timerCounter: number = 0;

  // Serial
  public sb: number = 0;
  public sc: number = 0;

  // HDMA (CGB)
  public hdmaSource: number = 0;
  public hdmaDest: number = 0;
  public hdmaActive: boolean = false;
  public hdmaLength: number = 0;
  public hdmaHBlankMode: boolean = false;

  // Boot ROM state
  public bootRomLoaded: boolean = false;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.vram.fill(0);
    this.wram.fill(0);
    this.hram.fill(0);
    this.oam.fill(0);
    this.io.fill(0);
    this.ie = 0;
    this.if = 0;
    this.div = 0xabcc;
    this.tima = 0;
    this.tma = 0;
    this.tac = 0;
    this.timerCounter = 0;
    this.vramBank = 0;
    this.wramBank = 1;
    this.doubleSpeed = false;
    this.prepareSpeedSwitch = false;
    this.hdmaActive = false;
  }

  public setJoypad(key: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select', pressed: boolean): void {
    let oldP1 = this.read(0xff00);
    if (pressed) {
      switch (key) {
        case 'right': this.joypadDirection &= ~1; break;
        case 'left': this.joypadDirection &= ~2; break;
        case 'up': this.joypadDirection &= ~4; break;
        case 'down': this.joypadDirection &= ~8; break;
        case 'a': this.joypadButtons &= ~1; break;
        case 'b': this.joypadButtons &= ~2; break;
        case 'select': this.joypadButtons &= ~4; break;
        case 'start': this.joypadButtons &= ~8; break;
      }
    } else {
      switch (key) {
        case 'right': this.joypadDirection |= 1; break;
        case 'left': this.joypadDirection |= 2; break;
        case 'up': this.joypadDirection |= 4; break;
        case 'down': this.joypadDirection |= 8; break;
        case 'a': this.joypadButtons |= 1; break;
        case 'b': this.joypadButtons |= 2; break;
        case 'select': this.joypadButtons |= 4; break;
        case 'start': this.joypadButtons |= 8; break;
      }
    }
    let newP1 = this.read(0xff00);
    if ((oldP1 & 0x0f) !== 0 && (newP1 & 0x0f) === 0) {
      this.requestInterrupt(4); // Joypad interrupt
    }
  }

  public requestInterrupt(bit: number): void {
    this.if |= (1 << bit);
  }

  public stepTimers(cycles: number): void {
    // DIV counter (16384Hz = increments every 256 clock cycles)
    const oldDiv = this.div;
    this.div = (this.div + cycles) & 0xffff;

    // Timer TAC enabled
    if (this.tac & 0x04) {
      const freqs = [1024, 16, 64, 256];
      const threshold = freqs[this.tac & 0x03];
      this.timerCounter += cycles;
      while (this.timerCounter >= threshold) {
        this.timerCounter -= threshold;
        this.tima++;
        if (this.tima > 0xff) {
          this.tima = this.tma;
          this.requestInterrupt(2); // Timer interrupt
        }
      }
    }
  }

  public read(addr: number): number {
    addr &= 0xffff;

    // ROM
    if (addr < 0x8000) {
      return this.cart ? this.cart.readROM(addr) : 0xff;
    }

    // VRAM
    if (addr >= 0x8000 && addr < 0xa000) {
      const bankOffset = (this.isCGB ? this.vramBank : 0) * 0x2000;
      return this.vram[bankOffset + (addr - 0x8000)];
    }

    // Cartridge SRAM
    if (addr >= 0xa000 && addr < 0xc000) {
      return this.cart ? this.cart.readRAM(addr) : 0xff;
    }

    // WRAM Bank 0
    if (addr >= 0xc000 && addr < 0xd000) {
      return this.wram[addr - 0xc000];
    }

    // WRAM Bank 1-7
    if (addr >= 0xd000 && addr < 0xe000) {
      const bank = this.isCGB ? (this.wramBank || 1) : 1;
      return this.wram[(bank * 0x1000) + (addr - 0xd000)];
    }

    // Echo RAM
    if (addr >= 0xe000 && addr < 0xfe00) {
      return this.read(addr - 0x2000);
    }

    // OAM
    if (addr >= 0xfe00 && addr < 0xfea0) {
      return this.oam[addr - 0xfe00];
    }

    // Prohibited
    if (addr >= 0xfea0 && addr < 0xff00) {
      return 0xff;
    }

    // I/O Registers ($FF00 - $FF7F)
    if (addr >= 0xff00 && addr < 0xff80) {
      return this.readIO(addr);
    }

    // HRAM
    if (addr >= 0xff80 && addr < 0xffff) {
      return this.hram[addr - 0xff80];
    }

    // IE register
    if (addr === 0xffff) {
      return this.ie;
    }

    return 0xff;
  }

  public write(addr: number, val: number): void {
    addr &= 0xffff;
    val &= 0xff;

    // ROM
    if (addr < 0x8000) {
      if (this.cart) this.cart.writeROM(addr, val);
      return;
    }

    // VRAM
    if (addr >= 0x8000 && addr < 0xa000) {
      const bankOffset = (this.isCGB ? this.vramBank : 0) * 0x2000;
      this.vram[bankOffset + (addr - 0x8000)] = val;
      return;
    }

    // Cartridge SRAM
    if (addr >= 0xa000 && addr < 0xc000) {
      if (this.cart) this.cart.writeRAM(addr, val);
      return;
    }

    // WRAM Bank 0
    if (addr >= 0xc000 && addr < 0xd000) {
      this.wram[addr - 0xc000] = val;
      return;
    }

    // WRAM Bank 1-7
    if (addr >= 0xd000 && addr < 0xe000) {
      const bank = this.isCGB ? (this.wramBank || 1) : 1;
      this.wram[(bank * 0x1000) + (addr - 0xd000)] = val;
      return;
    }

    // Echo RAM
    if (addr >= 0xe000 && addr < 0xfe00) {
      this.write(addr - 0x2000, val);
      return;
    }

    // OAM
    if (addr >= 0xfe00 && addr < 0xfea0) {
      this.oam[addr - 0xfe00] = val;
      return;
    }

    // Prohibited
    if (addr >= 0xfea0 && addr < 0xff00) {
      return;
    }

    // I/O Registers
    if (addr >= 0xff00 && addr < 0xff80) {
      this.writeIO(addr, val);
      return;
    }

    // HRAM
    if (addr >= 0xff80 && addr < 0xffff) {
      this.hram[addr - 0xff80] = val;
      return;
    }

    // IE register
    if (addr === 0xffff) {
      this.ie = val;
      return;
    }
  }

  private readIO(addr: number): number {
    switch (addr) {
      case 0xff00: { // Joypad
        const p1 = this.io[0x00];
        let res = 0x0f;
        if ((p1 & 0x10) === 0) res &= this.joypadDirection;
        if ((p1 & 0x20) === 0) res &= this.joypadButtons;
        return (p1 & 0x30) | res | 0xc0;
      }
      case 0xff01: return this.sb;
      case 0xff02: return this.sc | 0x7e;
      case 0xff04: return (this.div >> 8) & 0xff;
      case 0xff05: return this.tima;
      case 0xff06: return this.tma;
      case 0xff07: return this.tac | 0xf8;
      case 0xff0f: return this.if | 0xe0;

      // APU registers ($FF10 - $FF3F)
      case 0xff10: case 0xff11: case 0xff12: case 0xff13: case 0xff14:
      case 0xff16: case 0xff17: case 0xff18: case 0xff19:
      case 0xff1a: case 0xff1b: case 0xff1c: case 0xff1d: case 0xff1e:
      case 0xff20: case 0xff21: case 0xff22: case 0xff23:
      case 0xff24: case 0xff25: case 0xff26:
        return this.apu ? this.apu.read(addr) : 0xff;

      // Wave RAM ($FF30 - $FF3F)
      case 0xff30: case 0xff31: case 0xff32: case 0xff33:
      case 0xff34: case 0xff35: case 0xff36: case 0xff37:
      case 0xff38: case 0xff39: case 0xff3a: case 0xff3b:
      case 0xff3c: case 0xff3d: case 0xff3e: case 0xff3f:
        return this.apu ? this.apu.readWave(addr - 0xff30) : 0xff;

      // PPU Registers
      case 0xff40: // LCDC
      case 0xff41: // STAT
      case 0xff42: // SCY
      case 0xff43: // SCX
      case 0xff44: // LY
      case 0xff45: // LYC
      case 0xff47: // BGP
      case 0xff48: // OBP0
      case 0xff49: // OBP1
      case 0xff4a: // WY
      case 0xff4b: // WX
      case 0xff4f: // VBK (CGB VRAM Bank)
      case 0xff68: // BCPS / BGPI
      case 0xff69: // BCPD / BGPD
      case 0xff6a: // OCPS / OBPI
      case 0xff6b: // OCPD / OBPD
        return this.ppu ? this.ppu.read(addr) : 0xff;

      case 0xff4d: // KEY1 - Speed switch
        return this.isCGB ? ((this.doubleSpeed ? 0x80 : 0) | (this.prepareSpeedSwitch ? 1 : 0) | 0x7e) : 0xff;

      case 0xff51: return (this.hdmaSource >> 8) & 0xff;
      case 0xff52: return this.hdmaSource & 0xff;
      case 0xff53: return (this.hdmaDest >> 8) & 0xff;
      case 0xff54: return this.hdmaDest & 0xff;
      case 0xff55: return this.isCGB ? (this.hdmaActive ? (this.hdmaLength - 1) : 0xff) : 0xff;

      case 0xff70: // SVBK (CGB WRAM Bank)
        return this.isCGB ? (this.wramBank | 0xf8) : 0xff;

      default:
        return this.io[addr - 0xff00] !== undefined ? this.io[addr - 0xff00] : 0xff;
    }
  }

  private writeIO(addr: number, val: number): void {
    this.io[addr - 0xff00] = val;

    switch (addr) {
      case 0xff00: // Joypad
        this.io[0x00] = val & 0x30;
        break;
      case 0xff01: this.sb = val; break;
      case 0xff02:
        this.sc = val;
        if ((val & 0x81) === 0x81) {
          // Serial transfer dummy
          this.sb = 0xff;
          this.sc &= ~0x80;
          this.requestInterrupt(3);
        }
        break;
      case 0xff04: this.div = 0; break;
      case 0xff05: this.tima = val; break;
      case 0xff06: this.tma = val; break;
      case 0xff07: this.tac = val & 0x07; break;
      case 0xff0f: this.if = val & 0x1f; break;

      // APU registers
      case 0xff10: case 0xff11: case 0xff12: case 0xff13: case 0xff14:
      case 0xff16: case 0xff17: case 0xff18: case 0xff19:
      case 0xff1a: case 0xff1b: case 0xff1c: case 0xff1d: case 0xff1e:
      case 0xff20: case 0xff21: case 0xff22: case 0xff23:
      case 0xff24: case 0xff25: case 0xff26:
        if (this.apu) this.apu.write(addr, val);
        break;

      // Wave RAM
      case 0xff30: case 0xff31: case 0xff32: case 0xff33:
      case 0xff34: case 0xff35: case 0xff36: case 0xff37:
      case 0xff38: case 0xff39: case 0xff3a: case 0xff3b:
      case 0xff3c: case 0xff3d: case 0xff3e: case 0xff3f:
        if (this.apu) this.apu.writeWave(addr - 0xff30, val);
        break;

      // OAM DMA Transfer ($FF46)
      case 0xff46: {
        const src = val << 8;
        for (let i = 0; i < 160; i++) {
          this.oam[i] = this.read(src + i);
        }
        break;
      }

      // PPU Registers
      case 0xff40:
      case 0xff41:
      case 0xff42:
      case 0xff43:
      case 0xff44:
      case 0xff45:
      case 0xff47:
      case 0xff48:
      case 0xff49:
      case 0xff4a:
      case 0xff4b:
      case 0xff4f:
      case 0xff68:
      case 0xff69:
      case 0xff6a:
      case 0xff6b:
        if (this.ppu) this.ppu.write(addr, val);
        break;

      case 0xff4d: // KEY1
        if (this.isCGB) {
          this.prepareSpeedSwitch = (val & 0x01) !== 0;
        }
        break;

      // HDMA
      case 0xff51: this.hdmaSource = (this.hdmaSource & 0x00ff) | (val << 8); break;
      case 0xff52: this.hdmaSource = (this.hdmaSource & 0xff00) | (val & 0xf0); break;
      case 0xff53: this.hdmaDest = (this.hdmaDest & 0x00ff) | ((val & 0x1f) << 8); break;
      case 0xff54: this.hdmaDest = (this.hdmaDest & 0xff00) | (val & 0xf0); break;
      case 0xff55:
        if (this.isCGB) {
          this.handleHDMA(val);
        }
        break;

      case 0xff70: // SVBK
        if (this.isCGB) {
          let b = val & 0x07;
          if (b === 0) b = 1;
          this.wramBank = b;
        }
        break;
    }
  }

  private handleHDMA(val: number): void {
    if (this.hdmaActive && (val & 0x80) === 0) {
      // Stop HBlank HDMA
      this.hdmaActive = false;
      return;
    }

    this.hdmaLength = ((val & 0x7f) + 1);
    this.hdmaHBlankMode = (val & 0x80) !== 0;

    if (!this.hdmaHBlankMode) {
      // General DMA (execute immediately)
      const bytesToCopy = this.hdmaLength * 16;
      let src = this.hdmaSource & 0xfff0;
      let dst = (this.hdmaDest & 0x1ff0) | 0x8000;

      for (let i = 0; i < bytesToCopy; i++) {
        this.write(dst + i, this.read(src + i));
      }
      this.hdmaSource = (src + bytesToCopy) & 0xffff;
      this.hdmaDest = (dst + bytesToCopy) & 0xffff;
      this.hdmaActive = false;
    } else {
      this.hdmaActive = true;
    }
  }

  public stepHDMAHBlank(): void {
    if (!this.hdmaActive || !this.isCGB) return;
    let src = this.hdmaSource & 0xfff0;
    let dst = (this.hdmaDest & 0x1ff0) | 0x8000;

    for (let i = 0; i < 16; i++) {
      this.write(dst + i, this.read(src + i));
    }
    this.hdmaSource = (src + 16) & 0xffff;
    this.hdmaDest = (dst + 16) & 0xffff;
    this.hdmaLength--;

    if (this.hdmaLength <= 0) {
      this.hdmaActive = false;
    }
  }
}
