import { MemoryBus } from './memory';

export class CPU {
  public mmu: MemoryBus;

  // Registers
  public a: number = 0x01;
  public f: number = 0xb0;
  public b: number = 0x00;
  public c: number = 0x13;
  public d: number = 0x00;
  public e: number = 0xd8;
  public h: number = 0x01;
  public l: number = 0x4d;
  public sp: number = 0xfffe;
  public pc: number = 0x0100;

  // Interrupts
  public ime: boolean = true; // Interrupt Master Enable
  public imeScheduled: boolean = false;
  public halted: boolean = false;
  public stopped: boolean = false;
  public haltBug: boolean = false;

  constructor(mmu: MemoryBus) {
    this.mmu = mmu;
  }

  public reset(isCGB: boolean = false): void {
    this.a = isCGB ? 0x11 : 0x01;
    this.f = isCGB ? 0x80 : 0xb0;
    this.b = 0x00;
    this.c = 0x13;
    this.d = 0x00;
    this.e = 0xd8;
    this.h = 0x01;
    this.l = 0x4d;
    this.sp = 0xfffe;
    this.pc = 0x0100;
    this.ime = true;
    this.imeScheduled = false;
    this.halted = false;
    this.stopped = false;
    this.haltBug = false;
  }

  // 16-bit register getters / setters
  public get AF(): number { return (this.a << 8) | (this.f & 0xf0); }
  public set AF(val: number) { this.a = (val >> 8) & 0xff; this.f = val & 0xf0; }

  public get BC(): number { return (this.b << 8) | this.c; }
  public set BC(val: number) { this.b = (val >> 8) & 0xff; this.c = val & 0xff; }

  public get DE(): number { return (this.d << 8) | this.e; }
  public set DE(val: number) { this.d = (val >> 8) & 0xff; this.e = val & 0xff; }

  public get HL(): number { return (this.h << 8) | this.l; }
  public set HL(val: number) { this.h = (val >> 8) & 0xff; this.l = val & 0xff; }

  // Flags
  public get flagZ(): boolean { return (this.f & 0x80) !== 0; }
  public set flagZ(v: boolean) { this.f = v ? (this.f | 0x80) : (this.f & ~0x80); }

  public get flagN(): boolean { return (this.f & 0x40) !== 0; }
  public set flagN(v: boolean) { this.f = v ? (this.f | 0x40) : (this.f & ~0x40); }

  public get flagH(): boolean { return (this.f & 0x20) !== 0; }
  public set flagH(v: boolean) { this.f = v ? (this.f | 0x20) : (this.f & ~0x20); }

  public get flagC(): boolean { return (this.f & 0x10) !== 0; }
  public set flagC(v: boolean) { this.f = v ? (this.f | 0x10) : (this.f & ~0x10); }

  public step(): number {
    let cycles = 0;

    // Handle scheduled EI (Interrupts enable after 1 instruction delay)
    if (this.imeScheduled) {
      this.ime = true;
      this.imeScheduled = false;
    }

    // Check interrupts
    const pendingInterrupts = this.mmu.ie & this.mmu.if & 0x1f;
    if (pendingInterrupts !== 0) {
      this.halted = false;
      if (this.ime) {
        this.ime = false;
        cycles += 20;

        // Push PC to stack
        this.sp = (this.sp - 1) & 0xffff;
        this.mmu.write(this.sp, (this.pc >> 8) & 0xff);
        this.sp = (this.sp - 1) & 0xffff;
        this.mmu.write(this.sp, this.pc & 0xff);

        // Jump to interrupt vector
        if (pendingInterrupts & 0x01) { // V-Blank
          this.mmu.if &= ~0x01;
          this.pc = 0x0040;
        } else if (pendingInterrupts & 0x02) { // LCD STAT
          this.mmu.if &= ~0x02;
          this.pc = 0x0048;
        } else if (pendingInterrupts & 0x04) { // Timer
          this.mmu.if &= ~0x04;
          this.pc = 0x0050;
        } else if (pendingInterrupts & 0x08) { // Serial
          this.mmu.if &= ~0x08;
          this.pc = 0x0058;
        } else if (pendingInterrupts & 0x10) { // Joypad
          this.mmu.if &= ~0x10;
          this.pc = 0x0060;
        }

        return cycles;
      }
    }

    if (this.halted) {
      return 4;
    }

    // Fetch opcode
    const opcode = this.mmu.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;

    // Execute opcode
    cycles = this.executeOpcode(opcode);
    return cycles;
  }

  private readImm8(): number {
    const val = this.mmu.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    return val;
  }

  private readImm16(): number {
    const lo = this.readImm8();
    const hi = this.readImm8();
    return (hi << 8) | lo;
  }

  private executeOpcode(op: number): number {
    switch (op) {
      // 0x00 - 0x0F
      case 0x00: return 4; // NOP
      case 0x01: this.BC = this.readImm16(); return 12; // LD BC, d16
      case 0x02: this.mmu.write(this.BC, this.a); return 8; // LD (BC), A
      case 0x03: this.BC = (this.BC + 1) & 0xffff; return 8; // INC BC
      case 0x04: this.b = this.inc8(this.b); return 4; // INC B
      case 0x05: this.b = this.dec8(this.b); return 4; // DEC B
      case 0x06: this.b = this.readImm8(); return 8; // LD B, d8
      case 0x07: { // RLCA
        const c = (this.a >> 7) & 1;
        this.a = ((this.a << 1) | c) & 0xff;
        this.f = c ? 0x10 : 0;
        return 4;
      }
      case 0x08: { // LD (a16), SP
        const addr = this.readImm16();
        this.mmu.write(addr, this.sp & 0xff);
        this.mmu.write(addr + 1, (this.sp >> 8) & 0xff);
        return 20;
      }
      case 0x09: this.addHL(this.BC); return 8; // ADD HL, BC
      case 0x0a: this.a = this.mmu.read(this.BC); return 8; // LD A, (BC)
      case 0x0b: this.BC = (this.BC - 1) & 0xffff; return 8; // DEC BC
      case 0x0c: this.c = this.inc8(this.c); return 4; // INC C
      case 0x0d: this.c = this.dec8(this.c); return 4; // DEC C
      case 0x0e: this.c = this.readImm8(); return 8; // LD C, d8
      case 0x0f: { // RRCA
        const c = this.a & 1;
        this.a = (this.a >> 1) | (c << 7);
        this.f = c ? 0x10 : 0;
        return 4;
      }

      // 0x10 - 0x1F
      case 0x10: { // STOP / Speed switch
        if (this.mmu.isCGB && this.mmu.prepareSpeedSwitch) {
          this.mmu.doubleSpeed = !this.mmu.doubleSpeed;
          this.mmu.prepareSpeedSwitch = false;
        }
        return 4;
      }
      case 0x11: this.DE = this.readImm16(); return 12; // LD DE, d16
      case 0x12: this.mmu.write(this.DE, this.a); return 8; // LD (DE), A
      case 0x13: this.DE = (this.DE + 1) & 0xffff; return 8; // INC DE
      case 0x14: this.d = this.inc8(this.d); return 4; // INC D
      case 0x15: this.d = this.dec8(this.d); return 4; // DEC D
      case 0x16: this.d = this.readImm8(); return 8; // LD D, d8
      case 0x17: { // RLA
        const oldC = this.flagC ? 1 : 0;
        const newC = (this.a >> 7) & 1;
        this.a = ((this.a << 1) | oldC) & 0xff;
        this.f = newC ? 0x10 : 0;
        return 4;
      }
      case 0x18: { // JR r8
        const offset = (this.readImm8() << 24) >> 24;
        this.pc = (this.pc + offset) & 0xffff;
        return 12;
      }
      case 0x19: this.addHL(this.DE); return 8; // ADD HL, DE
      case 0x1a: this.a = this.mmu.read(this.DE); return 8; // LD A, (DE)
      case 0x1b: this.DE = (this.DE - 1) & 0xffff; return 8; // DEC DE
      case 0x1c: this.e = this.inc8(this.e); return 4; // INC E
      case 0x1d: this.e = this.dec8(this.e); return 4; // DEC E
      case 0x1e: this.e = this.readImm8(); return 8; // LD E, d8
      case 0x1f: { // RRA
        const oldC = this.flagC ? 1 : 0;
        const newC = this.a & 1;
        this.a = (this.a >> 1) | (oldC << 7);
        this.f = newC ? 0x10 : 0;
        return 4;
      }

      // 0x20 - 0x2F
      case 0x20: { // JR NZ, r8
        const offset = (this.readImm8() << 24) >> 24;
        if (!this.flagZ) { this.pc = (this.pc + offset) & 0xffff; return 12; }
        return 8;
      }
      case 0x21: this.HL = this.readImm16(); return 12; // LD HL, d16
      case 0x22: this.mmu.write(this.HL, this.a); this.HL = (this.HL + 1) & 0xffff; return 8; // LD (HL+), A
      case 0x23: this.HL = (this.HL + 1) & 0xffff; return 8; // INC HL
      case 0x24: this.h = this.inc8(this.h); return 4; // INC H
      case 0x25: this.h = this.dec8(this.h); return 4; // DEC H
      case 0x26: this.h = this.readImm8(); return 8; // LD H, d8
      case 0x27: this.daa(); return 4; // DAA
      case 0x28: { // JR Z, r8
        const offset = (this.readImm8() << 24) >> 24;
        if (this.flagZ) { this.pc = (this.pc + offset) & 0xffff; return 12; }
        return 8;
      }
      case 0x29: this.addHL(this.HL); return 8; // ADD HL, HL
      case 0x2a: this.a = this.mmu.read(this.HL); this.HL = (this.HL + 1) & 0xffff; return 8; // LD A, (HL+)
      case 0x2b: this.HL = (this.HL - 1) & 0xffff; return 8; // DEC HL
      case 0x2c: this.l = this.inc8(this.l); return 4; // INC L
      case 0x2d: this.l = this.dec8(this.l); return 4; // DEC L
      case 0x2e: this.l = this.readImm8(); return 8; // LD L, d8
      case 0x2f: { // CPL
        this.a ^= 0xff;
        this.flagN = true;
        this.flagH = true;
        return 4;
      }

      // 0x30 - 0x3F
      case 0x30: { // JR NC, r8
        const offset = (this.readImm8() << 24) >> 24;
        if (!this.flagC) { this.pc = (this.pc + offset) & 0xffff; return 12; }
        return 8;
      }
      case 0x31: this.sp = this.readImm16(); return 12; // LD SP, d16
      case 0x32: this.mmu.write(this.HL, this.a); this.HL = (this.HL - 1) & 0xffff; return 8; // LD (HL-), A
      case 0x33: this.sp = (this.sp + 1) & 0xffff; return 8; // INC SP
      case 0x34: { // INC (HL)
        const v = this.inc8(this.mmu.read(this.HL));
        this.mmu.write(this.HL, v);
        return 12;
      }
      case 0x35: { // DEC (HL)
        const v = this.dec8(this.mmu.read(this.HL));
        this.mmu.write(this.HL, v);
        return 12;
      }
      case 0x36: this.mmu.write(this.HL, this.readImm8()); return 12; // LD (HL), d8
      case 0x37: { // SCF
        this.flagN = false;
        this.flagH = false;
        this.flagC = true;
        return 4;
      }
      case 0x38: { // JR C, r8
        const offset = (this.readImm8() << 24) >> 24;
        if (this.flagC) { this.pc = (this.pc + offset) & 0xffff; return 12; }
        return 8;
      }
      case 0x39: this.addHL(this.sp); return 8; // ADD HL, SP
      case 0x3a: this.a = this.mmu.read(this.HL); this.HL = (this.HL - 1) & 0xffff; return 8; // LD A, (HL-)
      case 0x3b: this.sp = (this.sp - 1) & 0xffff; return 8; // DEC SP
      case 0x3c: this.a = this.inc8(this.a); return 4; // INC A
      case 0x3d: this.a = this.dec8(this.a); return 4; // DEC A
      case 0x3e: this.a = this.readImm8(); return 8; // LD A, d8
      case 0x3f: { // CCF
        this.flagN = false;
        this.flagH = false;
        this.flagC = !this.flagC;
        return 4;
      }

      // 0x40 - 0x7F (LD r, r' & HALT)
      case 0x40: return 4; // LD B, B
      case 0x41: this.b = this.c; return 4;
      case 0x42: this.b = this.d; return 4;
      case 0x43: this.b = this.e; return 4;
      case 0x44: this.b = this.h; return 4;
      case 0x45: this.b = this.l; return 4;
      case 0x46: this.b = this.mmu.read(this.HL); return 8;
      case 0x47: this.b = this.a; return 4;

      case 0x48: this.c = this.b; return 4;
      case 0x49: return 4;
      case 0x4a: this.c = this.d; return 4;
      case 0x4b: this.c = this.e; return 4;
      case 0x4c: this.c = this.h; return 4;
      case 0x4d: this.c = this.l; return 4;
      case 0x4e: this.c = this.mmu.read(this.HL); return 8;
      case 0x4f: this.c = this.a; return 4;

      case 0x50: this.d = this.b; return 4;
      case 0x51: this.d = this.c; return 4;
      case 0x52: return 4;
      case 0x53: this.d = this.e; return 4;
      case 0x54: this.d = this.h; return 4;
      case 0x55: this.d = this.l; return 4;
      case 0x56: this.d = this.mmu.read(this.HL); return 8;
      case 0x57: this.d = this.a; return 4;

      case 0x58: this.e = this.b; return 4;
      case 0x59: this.e = this.c; return 4;
      case 0x5a: this.e = this.d; return 4;
      case 0x5b: return 4;
      case 0x5c: this.e = this.h; return 4;
      case 0x5d: this.e = this.l; return 4;
      case 0x5e: this.e = this.mmu.read(this.HL); return 8;
      case 0x5f: this.e = this.a; return 4;

      case 0x60: this.h = this.b; return 4;
      case 0x61: this.h = this.c; return 4;
      case 0x62: this.h = this.d; return 4;
      case 0x63: this.h = this.e; return 4;
      case 0x64: return 4;
      case 0x65: this.h = this.l; return 4;
      case 0x66: this.h = this.mmu.read(this.HL); return 8;
      case 0x67: this.h = this.a; return 4;

      case 0x68: this.l = this.b; return 4;
      case 0x69: this.l = this.c; return 4;
      case 0x6a: this.l = this.d; return 4;
      case 0x6b: this.l = this.e; return 4;
      case 0x6c: this.l = this.h; return 4;
      case 0x6d: return 4;
      case 0x6e: this.l = this.mmu.read(this.HL); return 8;
      case 0x6f: this.l = this.a; return 4;

      case 0x70: this.mmu.write(this.HL, this.b); return 8;
      case 0x71: this.mmu.write(this.HL, this.c); return 8;
      case 0x72: this.mmu.write(this.HL, this.d); return 8;
      case 0x73: this.mmu.write(this.HL, this.e); return 8;
      case 0x74: this.mmu.write(this.HL, this.h); return 8;
      case 0x75: this.mmu.write(this.HL, this.l); return 8;
      case 0x76: this.halted = true; return 4; // HALT
      case 0x77: this.mmu.write(this.HL, this.a); return 8;

      case 0x78: this.a = this.b; return 4;
      case 0x79: this.a = this.c; return 4;
      case 0x7a: this.a = this.d; return 4;
      case 0x7b: this.a = this.e; return 4;
      case 0x7c: this.a = this.h; return 4;
      case 0x7d: this.a = this.l; return 4;
      case 0x7e: this.a = this.mmu.read(this.HL); return 8;
      case 0x7f: return 4;

      // 0x80 - 0xBF (ALU A, r)
      case 0x80: this.add8(this.b); return 4;
      case 0x81: this.add8(this.c); return 4;
      case 0x82: this.add8(this.d); return 4;
      case 0x83: this.add8(this.e); return 4;
      case 0x84: this.add8(this.h); return 4;
      case 0x85: this.add8(this.l); return 4;
      case 0x86: this.add8(this.mmu.read(this.HL)); return 8;
      case 0x87: this.add8(this.a); return 4;

      case 0x88: this.adc8(this.b); return 4;
      case 0x89: this.adc8(this.c); return 4;
      case 0x8a: this.adc8(this.d); return 4;
      case 0x8b: this.adc8(this.e); return 4;
      case 0x8c: this.adc8(this.h); return 4;
      case 0x8d: this.adc8(this.l); return 4;
      case 0x8e: this.adc8(this.mmu.read(this.HL)); return 8;
      case 0x8f: this.adc8(this.a); return 4;

      case 0x90: this.sub8(this.b); return 4;
      case 0x91: this.sub8(this.c); return 4;
      case 0x92: this.sub8(this.d); return 4;
      case 0x93: this.sub8(this.e); return 4;
      case 0x94: this.sub8(this.h); return 4;
      case 0x95: this.sub8(this.l); return 4;
      case 0x96: this.sub8(this.mmu.read(this.HL)); return 8;
      case 0x97: this.sub8(this.a); return 4;

      case 0x98: this.sbc8(this.b); return 4;
      case 0x99: this.sbc8(this.c); return 4;
      case 0x9a: this.sbc8(this.d); return 4;
      case 0x9b: this.sbc8(this.e); return 4;
      case 0x9c: this.sbc8(this.h); return 4;
      case 0x9d: this.sbc8(this.l); return 4;
      case 0x9e: this.sbc8(this.mmu.read(this.HL)); return 8;
      case 0x9f: this.sbc8(this.a); return 4;

      case 0xa0: this.and8(this.b); return 4;
      case 0xa1: this.and8(this.c); return 4;
      case 0xa2: this.and8(this.d); return 4;
      case 0xa3: this.and8(this.e); return 4;
      case 0xa4: this.and8(this.h); return 4;
      case 0xa5: this.and8(this.l); return 4;
      case 0xa6: this.and8(this.mmu.read(this.HL)); return 8;
      case 0xa7: this.and8(this.a); return 4;

      case 0xa8: this.xor8(this.b); return 4;
      case 0xa9: this.xor8(this.c); return 4;
      case 0xaa: this.xor8(this.d); return 4;
      case 0xab: this.xor8(this.e); return 4;
      case 0xac: this.xor8(this.h); return 4;
      case 0xad: this.xor8(this.l); return 4;
      case 0xae: this.xor8(this.mmu.read(this.HL)); return 8;
      case 0xaf: this.xor8(this.a); return 4;

      case 0xb0: this.or8(this.b); return 4;
      case 0xb1: this.or8(this.c); return 4;
      case 0xb2: this.or8(this.d); return 4;
      case 0xb3: this.or8(this.e); return 4;
      case 0xb4: this.or8(this.h); return 4;
      case 0xb5: this.or8(this.l); return 4;
      case 0xb6: this.or8(this.mmu.read(this.HL)); return 8;
      case 0xb7: this.or8(this.a); return 4;

      case 0xb8: this.cp8(this.b); return 4;
      case 0xb9: this.cp8(this.c); return 4;
      case 0xba: this.cp8(this.d); return 4;
      case 0xbb: this.cp8(this.e); return 4;
      case 0xbc: this.cp8(this.h); return 4;
      case 0xbd: this.cp8(this.l); return 4;
      case 0xbe: this.cp8(this.mmu.read(this.HL)); return 8;
      case 0xbf: this.cp8(this.a); return 4;

      // 0xC0 - 0xFF (Control, Jumps, Calls, Extended CB)
      case 0xc0: { // RET NZ
        if (!this.flagZ) { this.popPC(); return 20; }
        return 8;
      }
      case 0xc1: this.BC = this.pop16(); return 12; // POP BC
      case 0xc2: { // JP NZ, a16
        const addr = this.readImm16();
        if (!this.flagZ) { this.pc = addr; return 16; }
        return 12;
      }
      case 0xc3: this.pc = this.readImm16(); return 16; // JP a16
      case 0xc4: { // CALL NZ, a16
        const addr = this.readImm16();
        if (!this.flagZ) { this.pushPC(); this.pc = addr; return 24; }
        return 12;
      }
      case 0xc5: this.push16(this.BC); return 16; // PUSH BC
      case 0xc6: this.add8(this.readImm8()); return 8; // ADD A, d8
      case 0xc7: this.pushPC(); this.pc = 0x0000; return 16; // RST 00H
      case 0xc8: { // RET Z
        if (this.flagZ) { this.popPC(); return 20; }
        return 8;
      }
      case 0xc9: this.popPC(); return 16; // RET
      case 0xca: { // JP Z, a16
        const addr = this.readImm16();
        if (this.flagZ) { this.pc = addr; return 16; }
        return 12;
      }
      case 0xcb: { // CB Extended Prefix
        const cbOp = this.readImm8();
        return this.executeCBOpcode(cbOp);
      }
      case 0xcc: { // CALL Z, a16
        const addr = this.readImm16();
        if (this.flagZ) { this.pushPC(); this.pc = addr; return 24; }
        return 12;
      }
      case 0xcd: { // CALL a16
        const addr = this.readImm16();
        this.pushPC();
        this.pc = addr;
        return 24;
      }
      case 0xce: this.adc8(this.readImm8()); return 8; // ADC A, d8
      case 0xcf: this.pushPC(); this.pc = 0x0008; return 16; // RST 08H

      case 0xd0: { // RET NC
        if (!this.flagC) { this.popPC(); return 20; }
        return 8;
      }
      case 0xd1: this.DE = this.pop16(); return 12; // POP DE
      case 0xd2: { // JP NC, a16
        const addr = this.readImm16();
        if (!this.flagC) { this.pc = addr; return 16; }
        return 12;
      }
      case 0xd4: { // CALL NC, a16
        const addr = this.readImm16();
        if (!this.flagC) { this.pushPC(); this.pc = addr; return 24; }
        return 12;
      }
      case 0xd5: this.push16(this.DE); return 16; // PUSH DE
      case 0xd6: this.sub8(this.readImm8()); return 8; // SUB d8
      case 0xd7: this.pushPC(); this.pc = 0x0010; return 16; // RST 10H
      case 0xd8: { // RET C
        if (this.flagC) { this.popPC(); return 20; }
        return 8;
      }
      case 0xd9: this.popPC(); this.ime = true; return 16; // RETI
      case 0xda: { // JP C, a16
        const addr = this.readImm16();
        if (this.flagC) { this.pc = addr; return 16; }
        return 12;
      }
      case 0xdc: { // CALL C, a16
        const addr = this.readImm16();
        if (this.flagC) { this.pushPC(); this.pc = addr; return 24; }
        return 12;
      }
      case 0xde: this.sbc8(this.readImm8()); return 8; // SBC A, d8
      case 0xdf: this.pushPC(); this.pc = 0x0018; return 16; // RST 18H

      case 0xe0: { // LDH (a8), A
        const offset = this.readImm8();
        this.mmu.write(0xff00 + offset, this.a);
        return 12;
      }
      case 0xe1: this.HL = this.pop16(); return 12; // POP HL
      case 0xe2: this.mmu.write(0xff00 + this.c, this.a); return 8; // LD (C), A
      case 0xe5: this.push16(this.HL); return 16; // PUSH HL
      case 0xe6: this.and8(this.readImm8()); return 8; // AND d8
      case 0xe7: this.pushPC(); this.pc = 0x0020; return 16; // RST 20H
      case 0xe8: { // ADD SP, r8
        const r8 = (this.readImm8() << 24) >> 24;
        this.flagZ = false;
        this.flagN = false;
        this.flagH = ((this.sp & 0x0f) + (r8 & 0x0f)) > 0x0f;
        this.flagC = ((this.sp & 0xff) + (r8 & 0xff)) > 0xff;
        this.sp = (this.sp + r8) & 0xffff;
        return 16;
      }
      case 0xe9: this.pc = this.HL; return 4; // JP (HL)
      case 0xea: this.mmu.write(this.readImm16(), this.a); return 16; // LD (a16), A
      case 0xee: this.xor8(this.readImm8()); return 8; // XOR d8
      case 0xef: this.pushPC(); this.pc = 0x0028; return 16; // RST 28H

      case 0xf0: { // LDH A, (a8)
        const offset = this.readImm8();
        this.a = this.mmu.read(0xff00 + offset);
        return 12;
      }
      case 0xf1: this.AF = this.pop16(); return 12; // POP AF
      case 0xf2: this.a = this.mmu.read(0xff00 + this.c); return 8; // LD A, (C)
      case 0xf3: this.ime = false; return 4; // DI
      case 0xf5: this.push16(this.AF); return 16; // PUSH AF
      case 0xf6: this.or8(this.readImm8()); return 8; // OR d8
      case 0xf7: this.pushPC(); this.pc = 0x0030; return 16; // RST 30H
      case 0xf8: { // LD HL, SP+r8
        const r8 = (this.readImm8() << 24) >> 24;
        this.flagZ = false;
        this.flagN = false;
        this.flagH = ((this.sp & 0x0f) + (r8 & 0x0f)) > 0x0f;
        this.flagC = ((this.sp & 0xff) + (r8 & 0xff)) > 0xff;
        this.HL = (this.sp + r8) & 0xffff;
        return 12;
      }
      case 0xf9: this.sp = this.HL; return 8; // LD SP, HL
      case 0xfa: this.a = this.mmu.read(this.readImm16()); return 16; // LD A, (a16)
      case 0xfb: this.imeScheduled = true; return 4; // EI
      case 0xfe: this.cp8(this.readImm8()); return 8; // CP d8
      case 0xff: this.pushPC(); this.pc = 0x0038; return 16; // RST 38H

      default:
        return 4;
    }
  }

  private pushPC(): void {
    this.sp = (this.sp - 1) & 0xffff;
    this.mmu.write(this.sp, (this.pc >> 8) & 0xff);
    this.sp = (this.sp - 1) & 0xffff;
    this.mmu.write(this.sp, this.pc & 0xff);
  }

  private popPC(): void {
    const lo = this.mmu.read(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    const hi = this.mmu.read(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    this.pc = (hi << 8) | lo;
  }

  private push16(val: number): void {
    this.sp = (this.sp - 1) & 0xffff;
    this.mmu.write(this.sp, (val >> 8) & 0xff);
    this.sp = (this.sp - 1) & 0xffff;
    this.mmu.write(this.sp, val & 0xff);
  }

  private pop16(): number {
    const lo = this.mmu.read(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    const hi = this.mmu.read(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    return (hi << 8) | lo;
  }

  private inc8(val: number): number {
    const res = (val + 1) & 0xff;
    this.flagZ = res === 0;
    this.flagN = false;
    this.flagH = (val & 0x0f) === 0x0f;
    return res;
  }

  private dec8(val: number): number {
    const res = (val - 1) & 0xff;
    this.flagZ = res === 0;
    this.flagN = true;
    this.flagH = (val & 0x0f) === 0x00;
    return res;
  }

  private add8(val: number): void {
    const res = this.a + val;
    this.flagZ = (res & 0xff) === 0;
    this.flagN = false;
    this.flagH = ((this.a & 0x0f) + (val & 0x0f)) > 0x0f;
    this.flagC = res > 0xff;
    this.a = res & 0xff;
  }

  private adc8(val: number): void {
    const c = this.flagC ? 1 : 0;
    const res = this.a + val + c;
    this.flagZ = (res & 0xff) === 0;
    this.flagN = false;
    this.flagH = ((this.a & 0x0f) + (val & 0x0f) + c) > 0x0f;
    this.flagC = res > 0xff;
    this.a = res & 0xff;
  }

  private sub8(val: number): void {
    const res = this.a - val;
    this.flagZ = (res & 0xff) === 0;
    this.flagN = true;
    this.flagH = (this.a & 0x0f) < (val & 0x0f);
    this.flagC = this.a < val;
    this.a = res & 0xff;
  }

  private sbc8(val: number): void {
    const c = this.flagC ? 1 : 0;
    const res = this.a - val - c;
    this.flagZ = (res & 0xff) === 0;
    this.flagN = true;
    this.flagH = (this.a & 0x0f) < ((val & 0x0f) + c);
    this.flagC = this.a < (val + c);
    this.a = res & 0xff;
  }

  private and8(val: number): void {
    this.a &= val;
    this.flagZ = this.a === 0;
    this.flagN = false;
    this.flagH = true;
    this.flagC = false;
  }

  private xor8(val: number): void {
    this.a ^= val;
    this.flagZ = this.a === 0;
    this.flagN = false;
    this.flagH = false;
    this.flagC = false;
  }

  private or8(val: number): void {
    this.a |= val;
    this.flagZ = this.a === 0;
    this.flagN = false;
    this.flagH = false;
    this.flagC = false;
  }

  private cp8(val: number): void {
    this.flagZ = this.a === val;
    this.flagN = true;
    this.flagH = (this.a & 0x0f) < (val & 0x0f);
    this.flagC = this.a < val;
  }

  private addHL(val: number): void {
    const hl = this.HL;
    const res = hl + val;
    this.flagN = false;
    this.flagH = ((hl & 0x0fff) + (val & 0x0fff)) > 0x0fff;
    this.flagC = res > 0xffff;
    this.HL = res & 0xffff;
  }

  private daa(): void {
    let a = this.a;
    let adjust = 0;
    if (this.flagH || (!this.flagN && (a & 0x0f) > 9)) adjust |= 0x06;
    if (this.flagC || (!this.flagN && a > 0x99)) {
      adjust |= 0x60;
      this.flagC = true;
    }
    a = this.flagN ? (a - adjust) : (a + adjust);
    this.a = a & 0xff;
    this.flagZ = this.a === 0;
    this.flagH = false;
  }

  private executeCBOpcode(op: number): number {
    const regIdx = op & 0x07;
    let val = this.getRegVal(regIdx);
    const cycles = regIdx === 6 ? 16 : 8;

    const opType = op >> 6;
    const bit = (op >> 3) & 0x07;

    switch (opType) {
      case 0: { // Shifts / Rotates
        switch ((op >> 3) & 0x07) {
          case 0: { // RLC
            const c = (val >> 7) & 1;
            val = ((val << 1) | c) & 0xff;
            this.flagZ = val === 0;
            this.flagN = false;
            this.flagH = false;
            this.flagC = c !== 0;
            break;
          }
          case 1: { // RRC
            const c = val & 1;
            val = (val >> 1) | (c << 7);
            this.flagZ = val === 0;
            this.flagN = false;
            this.flagH = false;
            this.flagC = c !== 0;
            break;
          }
          case 2: { // RL
            const oldC = this.flagC ? 1 : 0;
            const newC = (val >> 7) & 1;
            val = ((val << 1) | oldC) & 0xff;
            this.flagZ = val === 0;
            this.flagN = false;
            this.flagH = false;
            this.flagC = newC !== 0;
            break;
          }
          case 3: { // RR
            const oldC = this.flagC ? 1 : 0;
            const newC = val & 1;
            val = (val >> 1) | (oldC << 7);
            this.flagZ = val === 0;
            this.flagN = false;
            this.flagH = false;
            this.flagC = newC !== 0;
            break;
          }
          case 4: { // SLA
            const c = (val >> 7) & 1;
            val = (val << 1) & 0xff;
            this.flagZ = val === 0;
            this.flagN = false;
            this.flagH = false;
            this.flagC = c !== 0;
            break;
          }
          case 5: { // SRA
            const c = val & 1;
            val = (val >> 1) | (val & 0x80);
            this.flagZ = val === 0;
            this.flagN = false;
            this.flagH = false;
            this.flagC = c !== 0;
            break;
          }
          case 6: { // SWAP
            val = ((val & 0x0f) << 4) | ((val & 0xf0) >> 4);
            this.flagZ = val === 0;
            this.flagN = false;
            this.flagH = false;
            this.flagC = false;
            break;
          }
          case 7: { // SRL
            const c = val & 1;
            val = (val >> 1) & 0x7f;
            this.flagZ = val === 0;
            this.flagN = false;
            this.flagH = false;
            this.flagC = c !== 0;
            break;
          }
        }
        this.setRegVal(regIdx, val);
        return cycles;
      }
      case 1: { // BIT bit, r
        const bitVal = (val >> bit) & 1;
        this.flagZ = bitVal === 0;
        this.flagN = false;
        this.flagH = true;
        return regIdx === 6 ? 12 : 8;
      }
      case 2: { // RES bit, r
        val &= ~(1 << bit);
        this.setRegVal(regIdx, val);
        return cycles;
      }
      case 3: { // SET bit, r
        val |= (1 << bit);
        this.setRegVal(regIdx, val);
        return cycles;
      }
    }
    return cycles;
  }

  private getRegVal(idx: number): number {
    switch (idx) {
      case 0: return this.b;
      case 1: return this.c;
      case 2: return this.d;
      case 3: return this.e;
      case 4: return this.h;
      case 5: return this.l;
      case 6: return this.mmu.read(this.HL);
      case 7: return this.a;
      default: return 0;
    }
  }

  private setRegVal(idx: number, val: number): void {
    switch (idx) {
      case 0: this.b = val; break;
      case 1: this.c = val; break;
      case 2: this.d = val; break;
      case 3: this.e = val; break;
      case 4: this.h = val; break;
      case 5: this.l = val; break;
      case 6: this.mmu.write(this.HL, val); break;
      case 7: this.a = val; break;
    }
  }
}
