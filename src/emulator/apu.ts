export class APU {
  public audioCtx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public scriptNode: ScriptProcessorNode | null = null;
  public isMuted: boolean = false;
  public volume: number = 0.5;

  // Frame sequencer (512 Hz)
  private frameSeqStep: number = 0;
  private frameSeqCycles: number = 0;

  // Sound registers state
  private regs: Uint8Array = new Uint8Array(48);
  private waveRam: Uint8Array = new Uint8Array(16);

  // Channel 1: Square with sweep
  private ch1Enabled: boolean = false;
  private ch1Length: number = 0;
  private ch1LengthEnable: boolean = false;
  private ch1Duty: number = 2;
  private ch1DutyStep: number = 0;
  private ch1Timer: number = 0;
  private ch1Frequency: number = 0;
  private ch1Volume: number = 0;
  private ch1EnvInitialVol: number = 0;
  private ch1EnvDir: number = 0;
  private ch1EnvPace: number = 0;
  private ch1EnvTimer: number = 0;
  private ch1SweepTime: number = 0;
  private ch1SweepDir: number = 0;
  private ch1SweepShift: number = 0;
  private ch1SweepTimer: number = 0;
  private ch1SweepShadowFreq: number = 0;
  private ch1SweepEnabled: boolean = false;

  // Channel 2: Square without sweep
  private ch2Enabled: boolean = false;
  private ch2Length: number = 0;
  private ch2LengthEnable: boolean = false;
  private ch2Duty: number = 2;
  private ch2DutyStep: number = 0;
  private ch2Timer: number = 0;
  private ch2Frequency: number = 0;
  private ch2Volume: number = 0;
  private ch2EnvInitialVol: number = 0;
  private ch2EnvDir: number = 0;
  private ch2EnvPace: number = 0;
  private ch2EnvTimer: number = 0;

  // Channel 3: Wave
  private ch3Enabled: boolean = false;
  private ch3Length: number = 0;
  private ch3LengthEnable: boolean = false;
  private ch3Frequency: number = 0;
  private ch3Timer: number = 0;
  private ch3Pos: number = 0;
  private ch3VolShift: number = 0;

  // Channel 4: Noise
  private ch4Enabled: boolean = false;
  private ch4Length: number = 0;
  private ch4LengthEnable: boolean = false;
  private ch4Volume: number = 0;
  private ch4EnvInitialVol: number = 0;
  private ch4EnvDir: number = 0;
  private ch4EnvPace: number = 0;
  private ch4EnvTimer: number = 0;
  private ch4Lfsr: number = 0x7fff;
  private ch4ClockShift: number = 0;
  private ch4WidthMode: boolean = false;
  private ch4DivRatio: number = 0;
  private ch4Timer: number = 0;

  // Duty waveforms (12.5%, 25%, 50%, 75%)
  private readonly DUTY_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0]
  ];

  // Audio sample ring buffer
  private readonly SAMPLE_BUFFER_SIZE = 4096;
  private sampleBufferL: Float32Array = new Float32Array(4096);
  private sampleBufferR: Float32Array = new Float32Array(4096);
  private writeHead: number = 0;
  private readHead: number = 0;
  private sampleTimer: number = 0;

  constructor() {
    this.reset();
  }

  public initAudioContext(): void {
    try {
      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        return;
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioCtx = new AudioCtx({ sampleRate: 44100 });
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);

      this.scriptNode = this.audioCtx.createScriptProcessor(2048, 0, 2);
      this.scriptNode.onaudioprocess = (e) => {
        const outL = e.outputBuffer.getChannelData(0);
        const outR = e.outputBuffer.getChannelData(1);
        const len = outL.length;

        for (let i = 0; i < len; i++) {
          if (this.readHead !== this.writeHead) {
            outL[i] = this.sampleBufferL[this.readHead];
            outR[i] = this.sampleBufferR[this.readHead];
            this.readHead = (this.readHead + 1) % this.SAMPLE_BUFFER_SIZE;
          } else {
            outL[i] = 0;
            outR[i] = 0;
          }
        }
      };

      this.scriptNode.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch {
      // AudioContext blocked or not supported
    }
  }

  public getAudioStream(): MediaStream | null {
    try {
      if (this.audioCtx && this.masterGain && 'createMediaStreamDestination' in this.audioCtx) {
        const dest = this.audioCtx.createMediaStreamDestination();
        this.masterGain.connect(dest);
        return dest.stream;
      }
    } catch {
      // Ignore
    }
    return null;
  }

  public unlockAudio(): void {
    if (!this.audioCtx) {
      this.initAudioContext();
    } else if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
  }

  public reset(): void {
    this.regs.fill(0);
    this.waveRam.fill(0);
    this.sampleBufferL.fill(0);
    this.sampleBufferR.fill(0);
    this.writeHead = 0;
    this.readHead = 0;
    this.sampleTimer = 0;
    this.frameSeqStep = 0;
    this.frameSeqCycles = 0;
    this.ch1Enabled = false;
    this.ch2Enabled = false;
    this.ch3Enabled = false;
    this.ch4Enabled = false;
    this.ch4Lfsr = 0x7fff;
  }

  public read(addr: number): number {
    const offset = addr - 0xff10;
    return this.regs[offset] || 0;
  }

  public readWave(offset: number): number {
    return this.waveRam[offset] || 0;
  }

  public writeWave(offset: number, val: number): void {
    this.waveRam[offset] = val;
  }

  public write(addr: number, val: number): void {
    const offset = addr - 0xff10;
    this.regs[offset] = val;

    switch (addr) {
      // Channel 1
      case 0xff10: // NR10 Sweep
        this.ch1SweepTime = (val >> 4) & 0x07;
        this.ch1SweepDir = (val >> 3) & 0x01;
        this.ch1SweepShift = val & 0x07;
        break;
      case 0xff11: // NR11 Duty & Length
        this.ch1Duty = (val >> 6) & 0x03;
        this.ch1Length = 64 - (val & 0x3f);
        break;
      case 0xff12: // NR12 Volume Envelope
        this.ch1EnvInitialVol = (val >> 4) & 0x0f;
        this.ch1EnvDir = (val >> 3) & 0x01;
        this.ch1EnvPace = val & 0x07;
        if ((val & 0xf8) === 0) this.ch1Enabled = false;
        break;
      case 0xff13: // NR13 Freq low
        this.ch1Frequency = (this.ch1Frequency & 0x0700) | val;
        break;
      case 0xff14: // NR14 Freq high & trigger
        this.ch1Frequency = (this.ch1Frequency & 0x00ff) | ((val & 0x07) << 8);
        this.ch1LengthEnable = (val & 0x40) !== 0;
        if (val & 0x80) this.triggerCh1();
        break;

      // Channel 2
      case 0xff16: // NR21 Duty & Length
        this.ch2Duty = (val >> 6) & 0x03;
        this.ch2Length = 64 - (val & 0x3f);
        break;
      case 0xff17: // NR22 Volume Envelope
        this.ch2EnvInitialVol = (val >> 4) & 0x0f;
        this.ch2EnvDir = (val >> 3) & 0x01;
        this.ch2EnvPace = val & 0x07;
        if ((val & 0xf8) === 0) this.ch2Enabled = false;
        break;
      case 0xff18: // NR23 Freq low
        this.ch2Frequency = (this.ch2Frequency & 0x0700) | val;
        break;
      case 0xff19: // NR24 Freq high & trigger
        this.ch2Frequency = (this.ch2Frequency & 0x00ff) | ((val & 0x07) << 8);
        this.ch2LengthEnable = (val & 0x40) !== 0;
        if (val & 0x80) this.triggerCh2();
        break;

      // Channel 3
      case 0xff1a: // NR30 DAC enable
        if ((val & 0x80) === 0) this.ch3Enabled = false;
        break;
      case 0xff1b: // NR31 Length
        this.ch3Length = 256 - val;
        break;
      case 0xff1c: // NR32 Volume code
        this.ch3VolShift = [4, 0, 1, 2][(val >> 5) & 0x03];
        break;
      case 0xff1d: // NR33 Freq low
        this.ch3Frequency = (this.ch3Frequency & 0x0700) | val;
        break;
      case 0xff1e: // NR34 Freq high & trigger
        this.ch3Frequency = (this.ch3Frequency & 0x00ff) | ((val & 0x07) << 8);
        this.ch3LengthEnable = (val & 0x40) !== 0;
        if (val & 0x80) this.triggerCh3();
        break;

      // Channel 4
      case 0xff20: // NR41 Length
        this.ch4Length = 64 - (val & 0x3f);
        break;
      case 0xff21: // NR42 Envelope
        this.ch4EnvInitialVol = (val >> 4) & 0x0f;
        this.ch4EnvDir = (val >> 3) & 0x01;
        this.ch4EnvPace = val & 0x07;
        if ((val & 0xf8) === 0) this.ch4Enabled = false;
        break;
      case 0xff22: // NR43 Polynomial
        this.ch4ClockShift = (val >> 4) & 0x0f;
        this.ch4WidthMode = (val & 0x08) !== 0;
        this.ch4DivRatio = val & 0x07;
        break;
      case 0xff23: // NR44 Trigger & length enable
        this.ch4LengthEnable = (val & 0x40) !== 0;
        if (val & 0x80) this.triggerCh4();
        break;
    }
  }

  private triggerCh1(): void {
    this.ch1Enabled = true;
    if (this.ch1Length === 0) this.ch1Length = 64;
    this.ch1Timer = (2048 - this.ch1Frequency) * 4;
    this.ch1Volume = this.ch1EnvInitialVol;
    this.ch1EnvTimer = this.ch1EnvPace || 8;
    this.ch1SweepShadowFreq = this.ch1Frequency;
    this.ch1SweepTimer = this.ch1SweepTime || 8;
    this.ch1SweepEnabled = this.ch1SweepTime > 0 || this.ch1SweepShift > 0;
  }

  private triggerCh2(): void {
    this.ch2Enabled = true;
    if (this.ch2Length === 0) this.ch2Length = 64;
    this.ch2Timer = (2048 - this.ch2Frequency) * 4;
    this.ch2Volume = this.ch2EnvInitialVol;
    this.ch2EnvTimer = this.ch2EnvPace || 8;
  }

  private triggerCh3(): void {
    this.ch3Enabled = true;
    if (this.ch3Length === 0) this.ch3Length = 256;
    this.ch3Timer = (2048 - this.ch3Frequency) * 2;
    this.ch3Pos = 0;
  }

  private triggerCh4(): void {
    this.ch4Enabled = true;
    if (this.ch4Length === 0) this.ch4Length = 64;
    this.ch4Lfsr = 0x7fff;
    this.ch4Volume = this.ch4EnvInitialVol;
    this.ch4EnvTimer = this.ch4EnvPace || 8;
  }

  public step(cycles: number, isFastForward: boolean = false): void {
    // 512 Hz Frame Sequencer (4194304 / 512 = 8192 cycles)
    this.frameSeqCycles += cycles;
    while (this.frameSeqCycles >= 8192) {
      this.frameSeqCycles -= 8192;
      this.stepFrameSequencer();
    }

    // Step channel timers
    // Ch1
    this.ch1Timer -= cycles;
    if (this.ch1Timer <= 0) {
      this.ch1Timer += (2048 - this.ch1Frequency) * 4;
      this.ch1DutyStep = (this.ch1DutyStep + 1) & 0x07;
    }

    // Ch2
    this.ch2Timer -= cycles;
    if (this.ch2Timer <= 0) {
      this.ch2Timer += (2048 - this.ch2Frequency) * 4;
      this.ch2DutyStep = (this.ch2DutyStep + 1) & 0x07;
    }

    // Ch3
    this.ch3Timer -= cycles;
    if (this.ch3Timer <= 0) {
      this.ch3Timer += (2048 - this.ch3Frequency) * 2;
      this.ch3Pos = (this.ch3Pos + 1) & 0x1f;
    }

    // Ch4
    this.ch4Timer -= cycles;
    if (this.ch4Timer <= 0) {
      const divisor = this.ch4DivRatio === 0 ? 8 : this.ch4DivRatio * 16;
      this.ch4Timer += (divisor << this.ch4ClockShift);
      const bit = (this.ch4Lfsr & 1) ^ ((this.ch4Lfsr >> 1) & 1);
      this.ch4Lfsr = (this.ch4Lfsr >> 1) | (bit << 14);
      if (this.ch4WidthMode) {
        this.ch4Lfsr = (this.ch4Lfsr & ~0x40) | (bit << 6);
      }
    }

    // Sample audio output at 44100Hz (every ~95 CPU cycles)
    if (!isFastForward) {
      this.sampleTimer += cycles;
      if (this.sampleTimer >= 95) {
        this.sampleTimer -= 95;
        this.generateSample();
      }
    }
  }

  private stepFrameSequencer(): void {
    // Step 0: Length, Step 2: Length + Sweep, Step 4: Length, Step 6: Length + Sweep, Step 7: Envelope
    switch (this.frameSeqStep) {
      case 0:
      case 4:
        this.stepLengths();
        break;
      case 2:
      case 6:
        this.stepLengths();
        this.stepSweep();
        break;
      case 7:
        this.stepEnvelopes();
        break;
    }
    this.frameSeqStep = (this.frameSeqStep + 1) & 0x07;
  }

  private stepLengths(): void {
    if (this.ch1LengthEnable && this.ch1Length > 0) {
      if (--this.ch1Length === 0) this.ch1Enabled = false;
    }
    if (this.ch2LengthEnable && this.ch2Length > 0) {
      if (--this.ch2Length === 0) this.ch2Enabled = false;
    }
    if (this.ch3LengthEnable && this.ch3Length > 0) {
      if (--this.ch3Length === 0) this.ch3Enabled = false;
    }
    if (this.ch4LengthEnable && this.ch4Length > 0) {
      if (--this.ch4Length === 0) this.ch4Enabled = false;
    }
  }

  private stepEnvelopes(): void {
    // Ch1
    if (this.ch1EnvPace > 0 && --this.ch1EnvTimer <= 0) {
      this.ch1EnvTimer = this.ch1EnvPace;
      if (this.ch1EnvDir === 1 && this.ch1Volume < 15) this.ch1Volume++;
      else if (this.ch1EnvDir === 0 && this.ch1Volume > 0) this.ch1Volume--;
    }
    // Ch2
    if (this.ch2EnvPace > 0 && --this.ch2EnvTimer <= 0) {
      this.ch2EnvTimer = this.ch2EnvPace;
      if (this.ch2EnvDir === 1 && this.ch2Volume < 15) this.ch2Volume++;
      else if (this.ch2EnvDir === 0 && this.ch2Volume > 0) this.ch2Volume--;
    }
    // Ch4
    if (this.ch4EnvPace > 0 && --this.ch4EnvTimer <= 0) {
      this.ch4EnvTimer = this.ch4EnvPace;
      if (this.ch4EnvDir === 1 && this.ch4Volume < 15) this.ch4Volume++;
      else if (this.ch4EnvDir === 0 && this.ch4Volume > 0) this.ch4Volume--;
    }
  }

  private stepSweep(): void {
    if (!this.ch1SweepEnabled || this.ch1SweepTime === 0) return;
    if (--this.ch1SweepTimer <= 0) {
      this.ch1SweepTimer = this.ch1SweepTime;
      const delta = this.ch1SweepShadowFreq >> this.ch1SweepShift;
      let newFreq = this.ch1SweepDir === 1 ? this.ch1SweepShadowFreq - delta : this.ch1SweepShadowFreq + delta;

      if (newFreq <= 2047 && this.ch1SweepShift > 0) {
        this.ch1SweepShadowFreq = newFreq;
        this.ch1Frequency = newFreq;
      } else if (newFreq > 2047) {
        this.ch1Enabled = false;
      }
    }
  }

  private generateSample(): void {
    let outCh1 = 0;
    let outCh2 = 0;
    let outCh3 = 0;
    let outCh4 = 0;

    if (this.ch1Enabled && this.ch1Volume > 0) {
      outCh1 = this.DUTY_TABLE[this.ch1Duty][this.ch1DutyStep] ? (this.ch1Volume / 15) : 0;
    }

    if (this.ch2Enabled && this.ch2Volume > 0) {
      outCh2 = this.DUTY_TABLE[this.ch2Duty][this.ch2DutyStep] ? (this.ch2Volume / 15) : 0;
    }

    if (this.ch3Enabled && this.ch3VolShift < 4) {
      const byte = this.waveRam[Math.floor(this.ch3Pos / 2)];
      const sample4Bit = (this.ch3Pos % 2 === 0) ? (byte >> 4) : (byte & 0x0f);
      outCh3 = ((sample4Bit >> this.ch3VolShift) / 15);
    }

    if (this.ch4Enabled && this.ch4Volume > 0) {
      outCh4 = (!(this.ch4Lfsr & 1)) ? (this.ch4Volume / 15) : 0;
    }

    const mixed = (outCh1 + outCh2 + outCh3 + outCh4) * 0.25;

    // Buffer to ring buffer
    const nextHead = (this.writeHead + 1) % this.SAMPLE_BUFFER_SIZE;
    if (nextHead !== this.readHead) {
      this.sampleBufferL[this.writeHead] = mixed;
      this.sampleBufferR[this.writeHead] = mixed;
      this.writeHead = nextHead;
    }
  }
}
