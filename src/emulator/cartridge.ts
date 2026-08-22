export class Cartridge {
  public rom: Uint8Array;
  public sram: Uint8Array;
  public sramModified: boolean = false;

  public title: string = 'UNKNOWN';
  public isCGB: boolean = false;
  public cgbOnly: boolean = false;
  public mbcType: number = 0;
  public romSize: number = 0;
  public ramSize: number = 0;
  public numRomBanks: number = 2;
  public numRamBanks: number = 0;

  // Banking state
  public romBank: number = 1;
  public ramBank: number = 0;
  public ramEnabled: boolean = false;
  public mbc1Mode: number = 0; // 0: 16MBit ROM/8KByte RAM, 1: 4MBit ROM/32KByte RAM

  // MBC3 RTC
  public rtcRegisters: number[] = [0, 0, 0, 0, 0]; // S, M, H, DL, DH
  public rtcLatched: number[] = [0, 0, 0, 0, 0];
  public rtcLatchState: number = 0;
  public rtcSelected: number = -1;

  // MBC5
  public mbc5RomBankHigh: number = 0;

  constructor(romData: Uint8Array, initialSram?: Uint8Array) {
    this.rom = romData;
    this.parseHeader();

    // Allocate SRAM
    const ramSizes = [0, 2048, 8192, 32768, 131072, 65536];
    const allocRamSize = ramSizes[this.ramSize] || (this.mbcType === 2 ? 512 : 8192);
    this.sram = new Uint8Array(allocRamSize);

    if (initialSram && initialSram.length > 0) {
      const copyLen = Math.min(this.sram.length, initialSram.length);
      for (let i = 0; i < copyLen; i++) {
        this.sram[i] = initialSram[i];
      }
    }
  }

  private parseHeader() {
    let titleStr = '';
    for (let i = 0x0134; i <= 0x0142; i++) {
      const charCode = this.rom[i];
      if (charCode === 0) break;
      if (charCode >= 32 && charCode <= 126) {
        titleStr += String.fromCharCode(charCode);
      }
    }
    this.title = titleStr.trim() || 'UNTITLED';

    const cgbFlag = this.rom[0x0143];
    this.isCGB = (cgbFlag & 0x80) !== 0 || cgbFlag === 0xc0;
    this.cgbOnly = cgbFlag === 0xc0;

    this.mbcType = this.rom[0x0147];
    this.romSize = this.rom[0x0148];
    this.ramSize = this.rom[0x0149];

    this.numRomBanks = Math.max(2, 2 << this.romSize);
    const ramBanksMap = [0, 1, 1, 4, 16, 8];
    this.numRamBanks = ramBanksMap[this.ramSize] || 0;
  }

  public readROM(addr: number): number {
    if (addr < 0x4000) {
      if (this.mbcType === 1 && this.mbc1Mode === 1) {
        const bank0 = (this.ramBank << 5) % this.numRomBanks;
        return this.rom[(bank0 * 0x4000) + addr] || 0;
      }
      return this.rom[addr] || 0;
    } else if (addr < 0x8000) {
      const offset = addr - 0x4000;
      let bank = this.romBank;
      if (this.mbcType === 5) {
        bank = (this.mbc5RomBankHigh << 8) | this.romBank;
      }
      bank = bank % this.numRomBanks;
      return this.rom[(bank * 0x4000) + offset] || 0;
    }
    return 0xff;
  }

  public writeROM(addr: number, val: number): void {
    // MBC0 (ROM only)
    if (this.mbcType === 0) return;

    // MBC1
    if (this.mbcType >= 1 && this.mbcType <= 3) {
      if (addr < 0x2000) {
        this.ramEnabled = (val & 0x0f) === 0x0a;
      } else if (addr < 0x4000) {
        let b = val & 0x1f;
        if (b === 0) b = 1;
        this.romBank = (this.romBank & 0x60) | b;
      } else if (addr < 0x6000) {
        if (this.mbc1Mode === 0) {
          this.romBank = (this.romBank & 0x1f) | ((val & 0x03) << 5);
        } else {
          this.ramBank = val & 0x03;
        }
      } else if (addr < 0x8000) {
        this.mbc1Mode = val & 0x01;
      }
      return;
    }

    // MBC2
    if (this.mbcType === 5 || this.mbcType === 6) {
      if (addr < 0x4000) {
        if ((addr & 0x0100) === 0) {
          this.ramEnabled = (val & 0x0f) === 0x0a;
        } else {
          let b = val & 0x0f;
          if (b === 0) b = 1;
          this.romBank = b;
        }
      }
      return;
    }

    // MBC3
    if (this.mbcType >= 0x0f && this.mbcType <= 0x13) {
      if (addr < 0x2000) {
        this.ramEnabled = (val & 0x0f) === 0x0a;
      } else if (addr < 0x4000) {
        let b = val & 0x7f;
        if (b === 0) b = 1;
        this.romBank = b;
      } else if (addr < 0x6000) {
        if (val <= 0x03) {
          this.ramBank = val;
          this.rtcSelected = -1;
        } else if (val >= 0x08 && val <= 0x0c) {
          this.rtcSelected = val - 0x08;
        }
      } else if (addr < 0x8000) {
        if (this.rtcLatchState === 0 && val === 1) {
          this.rtcLatched = [...this.rtcRegisters];
        }
        this.rtcLatchState = val;
      }
      return;
    }

    // MBC5
    if (this.mbcType >= 0x19 && this.mbcType <= 0x1e) {
      if (addr < 0x2000) {
        this.ramEnabled = (val & 0x0f) === 0x0a;
      } else if (addr < 0x3000) {
        this.romBank = val;
      } else if (addr < 0x4000) {
        this.mbc5RomBankHigh = val & 0x01;
      } else if (addr < 0x6000) {
        this.ramBank = val & 0x0f;
      }
      return;
    }
  }

  public readRAM(addr: number): number {
    if (!this.ramEnabled) return 0xff;
    if (this.rtcSelected >= 0 && this.rtcSelected < 5) {
      return this.rtcLatched[this.rtcSelected] || 0;
    }
    const offset = addr - 0xa000;
    let bank = this.ramBank;
    if (this.numRamBanks > 0) {
      bank = bank % this.numRamBanks;
    }
    const finalAddr = (bank * 0x2000) + offset;
    if (finalAddr < this.sram.length) {
      return this.sram[finalAddr];
    }
    return 0xff;
  }

  public writeRAM(addr: number, val: number): void {
    if (!this.ramEnabled) return;
    if (this.rtcSelected >= 0 && this.rtcSelected < 5) {
      this.rtcRegisters[this.rtcSelected] = val;
      return;
    }
    const offset = addr - 0xa000;
    let bank = this.ramBank;
    if (this.numRamBanks > 0) {
      bank = bank % this.numRamBanks;
    }
    const finalAddr = (bank * 0x2000) + offset;
    if (finalAddr < this.sram.length) {
      this.sram[finalAddr] = val;
      this.sramModified = true;
    }
  }
}
