import { MemoryBus } from './memory';

export class PPU {
  public mmu: MemoryBus;

  // Registers
  public lcdc: number = 0x91;
  public stat: number = 0x85;
  public scy: number = 0;
  public scx: number = 0;
  public ly: number = 0;
  public lyc: number = 0;
  public bgp: number = 0xfc;
  public obp0: number = 0xff;
  public obp1: number = 0xff;
  public wy: number = 0;
  public wx: number = 0;

  // CGB Registers
  public bcps: number = 0;
  public bcpd: Uint8Array = new Uint8Array(64); // 8 palettes * 4 colors * 2 bytes
  public ocps: number = 0;
  public ocpd: Uint8Array = new Uint8Array(64);

  // Timing
  public mode: number = 2; // 0: HBlank, 1: VBlank, 2: OAM, 3: Pixel Transfer
  public modeClock: number = 0;
  public windowLine: number = 0;

  // Framebuffer 160x144 pixels (32-bit RGBA)
  public frameBuffer: Uint32Array = new Uint32Array(160 * 144);
  public bgPriority: Uint8Array = new Uint8Array(160); // Priority for sprite ordering
  public frameReady: boolean = false;

  // DMG Palette colors (Greyscale / Classic green)
  public dmgColors: number[] = [
    0xffffffff, // White
    0xffaaaaaa, // Light Gray
    0xff555555, // Dark Gray
    0xff000000  // Black
  ];

  constructor(mmu: MemoryBus) {
    this.mmu = mmu;
    this.initCgbPalettes();
  }

  public initCgbPalettes(): void {
    // Default white / grayscale palettes for CGB initialization
    for (let i = 0; i < 8; i++) {
      this.setCgbPaletteColor(this.bcpd, i, 0, 31, 31, 31);
      this.setCgbPaletteColor(this.bcpd, i, 1, 20, 20, 20);
      this.setCgbPaletteColor(this.bcpd, i, 2, 10, 10, 10);
      this.setCgbPaletteColor(this.bcpd, i, 3, 0, 0, 0);

      this.setCgbPaletteColor(this.ocpd, i, 0, 31, 31, 31);
      this.setCgbPaletteColor(this.ocpd, i, 1, 20, 20, 20);
      this.setCgbPaletteColor(this.ocpd, i, 2, 10, 10, 10);
      this.setCgbPaletteColor(this.ocpd, i, 3, 0, 0, 0);
    }
  }

  private setCgbPaletteColor(array: Uint8Array, pal: number, colorIdx: number, r: number, g: number, b: number): void {
    const raw = (r & 0x1f) | ((g & 0x1f) << 5) | ((b & 0x1f) << 10);
    const offset = (pal * 8) + (colorIdx * 2);
    array[offset] = raw & 0xff;
    array[offset + 1] = (raw >> 8) & 0xff;
  }

  public read(addr: number): number {
    switch (addr) {
      case 0xff40: return this.lcdc;
      case 0xff41: return this.stat | 0x80 | this.mode;
      case 0xff42: return this.scy;
      case 0xff43: return this.scx;
      case 0xff44: return this.ly;
      case 0xff45: return this.lyc;
      case 0xff47: return this.bgp;
      case 0xff48: return this.obp0;
      case 0xff49: return this.obp1;
      case 0xff4a: return this.wy;
      case 0xff4b: return this.wx;
      case 0xff4f: return this.mmu.isCGB ? (this.mmu.vramBank | 0xfe) : 0xff;
      case 0xff68: return this.mmu.isCGB ? (this.bcps | 0x40) : 0xff;
      case 0xff69: return this.mmu.isCGB ? this.bcpd[this.bcps & 0x3f] : 0xff;
      case 0xff6a: return this.mmu.isCGB ? (this.ocps | 0x40) : 0xff;
      case 0xff6b: return this.mmu.isCGB ? this.ocpd[this.ocps & 0x3f] : 0xff;
      default: return 0xff;
    }
  }

  public write(addr: number, val: number): void {
    switch (addr) {
      case 0xff40:
        // LCD enable / disable
        if ((this.lcdc & 0x80) !== 0 && (val & 0x80) === 0) {
          this.ly = 0;
          this.mode = 0;
          this.modeClock = 0;
        }
        this.lcdc = val;
        break;
      case 0xff41:
        this.stat = (this.stat & 0x07) | (val & 0x78);
        break;
      case 0xff42: this.scy = val; break;
      case 0xff43: this.scx = val; break;
      case 0xff44: this.ly = 0; break;
      case 0xff45:
        this.lyc = val;
        this.checkLYC();
        break;
      case 0xff47: this.bgp = val; break;
      case 0xff48: this.obp0 = val; break;
      case 0xff49: this.obp1 = val; break;
      case 0xff4a: this.wy = val; break;
      case 0xff4b: this.wx = val; break;
      case 0xff4f:
        if (this.mmu.isCGB) {
          this.mmu.vramBank = val & 0x01;
        }
        break;
      case 0xff68:
        if (this.mmu.isCGB) this.bcps = val;
        break;
      case 0xff69:
        if (this.mmu.isCGB) {
          this.bcpd[this.bcps & 0x3f] = val;
          if (this.bcps & 0x80) {
            this.bcps = (this.bcps & 0x80) | ((this.bcps + 1) & 0x3f);
          }
        }
        break;
      case 0xff6a:
        if (this.mmu.isCGB) this.ocps = val;
        break;
      case 0xff6b:
        if (this.mmu.isCGB) {
          this.ocpd[this.ocps & 0x3f] = val;
          if (this.ocps & 0x80) {
            this.ocps = (this.ocps & 0x80) | ((this.ocps + 1) & 0x3f);
          }
        }
        break;
    }
  }

  private checkLYC(): void {
    if (this.ly === this.lyc) {
      this.stat |= 0x04;
      if (this.stat & 0x40) {
        this.mmu.requestInterrupt(1); // LCD STAT interrupt
      }
    } else {
      this.stat &= ~0x04;
    }
  }

  public step(cycles: number): void {
    if ((this.lcdc & 0x80) === 0) return; // LCD Disabled

    this.modeClock += cycles;

    switch (this.mode) {
      // Mode 2: OAM Search (80 cycles)
      case 2:
        if (this.modeClock >= 80) {
          this.modeClock -= 80;
          this.mode = 3;
        }
        break;

      // Mode 3: Pixel Transfer (172 cycles)
      case 3:
        if (this.modeClock >= 172) {
          this.modeClock -= 172;
          this.mode = 0;
          this.renderScanline();

          // HBlank interrupt
          if (this.stat & 0x08) {
            this.mmu.requestInterrupt(1);
          }

          // CGB HDMA HBlank step
          this.mmu.stepHDMAHBlank();
        }
        break;

      // Mode 0: HBlank (204 cycles)
      case 0:
        if (this.modeClock >= 204) {
          this.modeClock -= 204;
          this.ly++;
          this.checkLYC();

          if (this.ly === 144) {
            // Enter VBlank
            this.mode = 1;
            this.mmu.requestInterrupt(0); // VBlank interrupt
            this.frameReady = true;

            if (this.stat & 0x10) {
              this.mmu.requestInterrupt(1); // STAT VBlank
            }
          } else {
            this.mode = 2;
            if (this.stat & 0x20) {
              this.mmu.requestInterrupt(1); // STAT OAM
            }
          }
        }
        break;

      // Mode 1: VBlank (456 cycles per line for 10 lines)
      case 1:
        if (this.modeClock >= 456) {
          this.modeClock -= 456;
          this.ly++;
          this.checkLYC();

          if (this.ly > 153) {
            // Restart frame
            this.ly = 0;
            this.windowLine = 0;
            this.mode = 2;
            this.checkLYC();
            if (this.stat & 0x20) {
              this.mmu.requestInterrupt(1); // STAT OAM
            }
          }
        }
        break;
    }
  }

  private renderScanline(): void {
    if (this.ly >= 144) return;
    this.bgPriority.fill(0);

    const isCgb = this.mmu.isCGB;

    // 1. Render Background & Window
    if (this.lcdc & 0x01 || isCgb) {
      this.renderBackground();
      if (this.lcdc & 0x20) {
        this.renderWindow();
      }
    } else {
      // Clear line with color 0
      const offset = this.ly * 160;
      for (let x = 0; x < 160; x++) {
        this.frameBuffer[offset + x] = 0xffffffff;
      }
    }

    // 2. Render Sprites
    if (this.lcdc & 0x02) {
      this.renderSprites();
    }
  }

  private getColorRGBA(isCgb: boolean, paletteTable: Uint8Array, palIdx: number, colorNum: number, dmgPalReg: number): number {
    if (isCgb) {
      const offset = (palIdx * 8) + (colorNum * 2);
      const raw = paletteTable[offset] | (paletteTable[offset + 1] << 8);
      let r = (raw & 0x1f);
      let g = ((raw >> 5) & 0x1f);
      let b = ((raw >> 10) & 0x1f);

      // Color correction (GBC LCD curve approximation)
      const r8 = Math.floor((r * 26 + g * 4 + b * 2) / 32 * 8);
      const g8 = Math.floor((g * 24 + b * 8) / 32 * 8);
      const b8 = Math.floor((r * 6 + g * 4 + b * 22) / 32 * 8);

      return 0xff000000 | (b8 << 16) | (g8 << 8) | r8;
    } else {
      const shade = (dmgPalReg >> (colorNum * 2)) & 0x03;
      return this.dmgColors[shade];
    }
  }

  private renderBackground(): void {
    const isCgb = this.mmu.isCGB;
    const tileDataSigned = (this.lcdc & 0x10) === 0;
    const tileBase = tileDataSigned ? 0x9000 : 0x8000;
    const mapBase = (this.lcdc & 0x08) ? 0x9c00 : 0x9800;

    const y = (this.ly + this.scy) & 0xff;
    const tileY = Math.floor(y / 8);
    const lineInTile = y % 8;

    const lineOffset = this.ly * 160;

    for (let x = 0; x < 160; x++) {
      const scrolledX = (x + this.scx) & 0xff;
      const tileX = Math.floor(scrolledX / 8);
      const pixelInTileX = scrolledX % 8;

      const mapAddr = mapBase + (tileY * 32) + tileX;
      let tileNum = this.mmu.read(mapAddr);
      let tileAddr = tileDataSigned ? (tileBase + (tileNum >= 128 ? tileNum - 256 : tileNum) * 16) : (tileBase + tileNum * 16);

      let attr = 0;
      let vramBank = 0;
      let pal = 0;
      let xFlip = false;
      let yFlip = false;
      let priority = false;

      if (isCgb) {
        // CGB BG attributes from VRAM Bank 1
        attr = this.mmu.vram[0x2000 + (mapAddr - 0x8000)];
        pal = attr & 0x07;
        vramBank = (attr & 0x08) ? 1 : 0;
        xFlip = (attr & 0x20) !== 0;
        yFlip = (attr & 0x40) !== 0;
        priority = (attr & 0x80) !== 0;
      }

      const row = yFlip ? (7 - lineInTile) : lineInTile;
      const col = xFlip ? (7 - pixelInTileX) : pixelInTileX;

      const vramBankOffset = vramBank * 0x2000;
      const b1 = this.mmu.vram[vramBankOffset + (tileAddr - 0x8000) + (row * 2)];
      const b2 = this.mmu.vram[vramBankOffset + (tileAddr - 0x8000) + (row * 2) + 1];

      const bit = 7 - col;
      const colorNum = ((b1 >> bit) & 1) | (((b2 >> bit) & 1) << 1);

      this.bgPriority[x] = (priority ? 0x80 : 0) | colorNum;
      this.frameBuffer[lineOffset + x] = this.getColorRGBA(isCgb, this.bcpd, pal, colorNum, this.bgp);
    }
  }

  private renderWindow(): void {
    if (this.wy > this.ly || this.wx > 166) return;

    const isCgb = this.mmu.isCGB;
    const tileDataSigned = (this.lcdc & 0x10) === 0;
    const tileBase = tileDataSigned ? 0x9000 : 0x8000;
    const mapBase = (this.lcdc & 0x40) ? 0x9c00 : 0x9800;

    const winX = this.wx - 7;
    const tileY = Math.floor(this.windowLine / 8);
    const lineInTile = this.windowLine % 8;
    const lineOffset = this.ly * 160;

    let windowRendered = false;

    for (let x = Math.max(0, winX); x < 160; x++) {
      windowRendered = true;
      const xInWin = x - winX;
      const tileX = Math.floor(xInWin / 8);
      const pixelInTileX = xInWin % 8;

      const mapAddr = mapBase + (tileY * 32) + tileX;
      let tileNum = this.mmu.read(mapAddr);
      let tileAddr = tileDataSigned ? (tileBase + (tileNum >= 128 ? tileNum - 256 : tileNum) * 16) : (tileBase + tileNum * 16);

      let attr = 0;
      let vramBank = 0;
      let pal = 0;
      let xFlip = false;
      let yFlip = false;
      let priority = false;

      if (isCgb) {
        attr = this.mmu.vram[0x2000 + (mapAddr - 0x8000)];
        pal = attr & 0x07;
        vramBank = (attr & 0x08) ? 1 : 0;
        xFlip = (attr & 0x20) !== 0;
        yFlip = (attr & 0x40) !== 0;
        priority = (attr & 0x80) !== 0;
      }

      const row = yFlip ? (7 - lineInTile) : lineInTile;
      const col = xFlip ? (7 - pixelInTileX) : pixelInTileX;

      const vramBankOffset = vramBank * 0x2000;
      const b1 = this.mmu.vram[vramBankOffset + (tileAddr - 0x8000) + (row * 2)];
      const b2 = this.mmu.vram[vramBankOffset + (tileAddr - 0x8000) + (row * 2) + 1];

      const bit = 7 - col;
      const colorNum = ((b1 >> bit) & 1) | (((b2 >> bit) & 1) << 1);

      this.bgPriority[x] = (priority ? 0x80 : 0) | colorNum;
      this.frameBuffer[lineOffset + x] = this.getColorRGBA(isCgb, this.bcpd, pal, colorNum, this.bgp);
    }

    if (windowRendered) {
      this.windowLine++;
    }
  }

  private renderSprites(): void {
    const isCgb = this.mmu.isCGB;
    const spriteHeight = (this.lcdc & 0x04) ? 16 : 8;
    const lineOffset = this.ly * 160;

    let spritesOnLine = 0;

    // Collect up to 10 sprites on this scanline (OAM search order)
    for (let i = 0; i < 40 && spritesOnLine < 10; i++) {
      const oamOffset = i * 4;
      const y = this.mmu.oam[oamOffset] - 16;
      const x = this.mmu.oam[oamOffset + 1] - 8;
      let tile = this.mmu.oam[oamOffset + 2];
      const attr = this.mmu.oam[oamOffset + 3];

      if (this.ly < y || this.ly >= y + spriteHeight) continue;
      spritesOnLine++;

      if (spriteHeight === 16) {
        tile &= 0xfe;
      }

      const yFlip = (attr & 0x40) !== 0;
      const xFlip = (attr & 0x20) !== 0;
      const objPriority = (attr & 0x80) !== 0;
      const vramBank = isCgb && (attr & 0x08) ? 1 : 0;
      const pal = isCgb ? (attr & 0x07) : 0;
      const dmgPal = (attr & 0x10) ? this.obp1 : this.obp0;

      let lineInSprite = this.ly - y;
      if (yFlip) lineInSprite = (spriteHeight - 1) - lineInSprite;

      const tileAddr = 0x8000 + (tile * 16) + (lineInSprite * 2);
      const vramBankOffset = vramBank * 0x2000;
      const b1 = this.mmu.vram[vramBankOffset + (tileAddr - 0x8000)];
      const b2 = this.mmu.vram[vramBankOffset + (tileAddr - 0x8000) + 1];

      for (let px = 0; px < 8; px++) {
        const screenX = x + px;
        if (screenX < 0 || screenX >= 160) continue;

        const col = xFlip ? (7 - px) : px;
        const bit = 7 - col;
        const colorNum = ((b1 >> bit) & 1) | (((b2 >> bit) & 1) << 1);

        // Color 0 is transparent for sprites
        if (colorNum === 0) continue;

        const bgPrio = this.bgPriority[screenX];
        const bgPriorityBit = (bgPrio & 0x80) !== 0;
        const bgColorNum = bgPrio & 0x03;

        // Master priority check (CGB LCDC.0 flag & OAM priority)
        if (isCgb && !(this.lcdc & 0x01)) {
          // Sprites always on top when LCDC.0 = 0
        } else if (bgPriorityBit && bgColorNum !== 0) {
          continue;
        } else if (objPriority && bgColorNum !== 0) {
          continue;
        }

        this.frameBuffer[lineOffset + screenX] = this.getColorRGBA(isCgb, this.ocpd, pal, colorNum, dmgPal);
      }
    }
  }
}
