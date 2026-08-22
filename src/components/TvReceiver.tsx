import React, { useEffect, useRef, useState } from 'react';
import { GameBoy } from '../emulator/gameboy';
import { RomItem } from '../emulator/types';
import { CastService } from '../services/cast';
import { StorageService } from '../services/storage';
import { Tv, Smartphone, Maximize2 } from 'lucide-react';

export function TvReceiver() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [emulator, setEmulator] = useState<GameBoy | null>(null);
  const [currentRom, setCurrentRom] = useState<RomItem | null>(null);
  const [showHud, setShowHud] = useState<boolean>(true);

  // Initialize GameBoy Emulator specifically configured for TV Receiver Screen
  useEffect(() => {
    const gb = new GameBoy();

    // Hook Frame Rendering to TV Canvas
    gb.onFrameRender = (framebuffer: Uint32Array) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const imgData = ctx.createImageData(160, 144);
      const data32 = new Uint32Array(imgData.data.buffer);
      data32.set(framebuffer);
      ctx.putImageData(imgData, 0, 0);
    };

    setEmulator(gb);

    // Auto-load last game if available
    const initGame = async () => {
      const roms = await StorageService.getSavedRoms();
      const targetRom = roms.length > 0 ? roms[0] : null;

      if (targetRom) {
        setCurrentRom(targetRom);
        const sram = await StorageService.getSram(targetRom.id);
        gb.loadROM(targetRom.data, sram || undefined);
        gb.start();
        gb.apu.unlockAudio();
      }
    };

    initGame();

    // Fade TV HUD after 5 seconds
    const hudTimer = setTimeout(() => {
      setShowHud(false);
    }, 6000);

    return () => {
      clearTimeout(hudTimer);
      gb.stop();
    };
  }, []);

  // Listen to remote joypad inputs from connected smartphone
  useEffect(() => {
    if (!emulator) return;

    const unsubInputs = CastService.onGamepadInput((button, isDown) => {
      if (isDown) {
        if (button === 'turboA') {
          emulator.setTurbo('a', true);
        } else if (button === 'turboB') {
          emulator.setTurbo('b', true);
        } else {
          emulator.setJoypad(button as any, true);
        }
      } else {
        if (button === 'turboA') {
          emulator.setTurbo('a', false);
        } else if (button === 'turboB') {
          emulator.setTurbo('b', false);
        } else {
          emulator.setJoypad(button as any, false);
        }
      }
      emulator.apu.unlockAudio();
    });

    return () => {
      unsubInputs();
    };
  }, [emulator]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center overflow-hidden select-none"
      onMouseMove={() => setShowHud(true)}
      onClick={() => {
        emulator?.apu.unlockAudio();
        setShowHud(true);
      }}
    >
      {/* Ambient CRT Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Main GBC Framebuffer on TV (160x144 Native Aspect Ratio Scaled Up Crisp 60 FPS) */}
      <div className="relative aspect-[10/9] w-auto h-[96vh] max-w-[96vw] flex items-center justify-center shadow-[0_0_80px_rgba(0,0,0,0.9)]">
        <canvas
          ref={canvasRef}
          width={160}
          height={144}
          className="w-full h-full object-contain bg-black shadow-2xl"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Scanline Filter Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 2px)',
            backgroundSize: '100% 2px'
          }}
        />
      </div>

      {/* Dynamic HUD Header for TV */}
      <div 
        className={`fixed top-6 left-6 right-6 flex items-center justify-between transition-opacity duration-700 pointer-events-auto ${
          showHud ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
      >
        <div className="flex items-center gap-3 bg-[#0a0c16]/90 border border-white/20 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 tracking-wider uppercase">
              <Tv className="w-3.5 h-3.5" />
              <span>TV CONNECTÉE • 60 FPS</span>
            </div>
            <span className="text-[11px] text-zinc-300 font-mono">
              {currentRom?.title || 'Game Boy Color'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-violet-600/20 border border-violet-500/30 px-3.5 py-2 rounded-2xl text-violet-300 text-xs font-semibold backdrop-blur-md">
            <Smartphone className="w-4 h-4" />
            <span>Manette smartphone active</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer backdrop-blur-md"
            title="Plein Écran TV"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
