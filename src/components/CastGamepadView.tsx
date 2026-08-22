import { useEffect } from 'react';
import { Tv, Play, Pause, RotateCcw, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { SpeedMultiplier } from '../emulator/types';
import { CastService } from '../services/cast';

export type JoypadKey = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select' | 'turboA' | 'turboB';

interface CastGamepadViewProps {
  onButtonDown: (btn: JoypadKey) => void;
  onButtonUp: (btn: JoypadKey) => void;
  onStopCast: () => void;
  gameTitle?: string;
  speed: SpeedMultiplier;
  isPaused: boolean;
  isMuted: boolean;
  onTogglePlayPause: () => void;
  onCycleSpeed: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  hapticFeedback?: boolean;
}

export function CastGamepadView({
  onButtonDown,
  onButtonUp,
  onStopCast,
  gameTitle = 'Partie en cours',
  speed,
  isPaused,
  isMuted,
  onTogglePlayPause,
  onCycleSpeed,
  onReset,
  onToggleMute,
  hapticFeedback = true,
}: CastGamepadViewProps) {
  // Trigger tactile vibration
  const triggerHaptic = (duration = 25) => {
    if (hapticFeedback && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignored
      }
    }
  };

  // Lock orientation to landscape on mobile
  useEffect(() => {
    if ('screen' in window && 'orientation' in screen && (screen.orientation as any).lock) {
      try {
        (screen.orientation as any).lock('landscape').catch(() => {});
      } catch {
        // Ignore
      }
    }
  }, []);

  const handlePointerDown = (btn: JoypadKey) => {
    triggerHaptic(30);
    onButtonDown(btn);
    CastService.sendGamepadInput(btn, true);
  };

  const handlePointerUp = (btn: JoypadKey) => {
    onButtonUp(btn);
    CastService.sendGamepadInput(btn, false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#07080d] text-white flex flex-col justify-between select-none touch-none p-2.5 sm:p-4 overflow-hidden">
      {/* Background Subtle Tech Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1f38_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Remote Control Header */}
      <div className="relative z-10 flex items-center justify-between w-full bg-white/[0.04] backdrop-blur-xl px-3 sm:px-4 py-2 rounded-2xl border border-white/[0.08] shadow-lg">
        {/* Cast Status */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs sm:text-sm tracking-wide">
            <Tv className="w-4 h-4 text-emerald-400" />
            <span className="hidden xs:inline font-bold">DIFFUSION TV</span>
            <span className="text-zinc-500 font-normal">|</span>
            <span className="text-zinc-300 truncate max-w-[140px] sm:max-w-[220px] font-mono text-xs">
              {gameTitle}
            </span>
          </div>
        </div>

        {/* Quick Remote Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onCycleSpeed}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 font-mono text-xs font-black transition-all cursor-pointer"
            title="Vitesse"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>{speed}x</span>
          </button>

          <button
            onClick={onTogglePlayPause}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] cursor-pointer"
            title={isPaused ? 'Reprendre' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400 fill-current" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] cursor-pointer"
            title={isMuted ? 'Son activé' : 'Son coupé'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] cursor-pointer"
            title="Redémarrer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onStopCast}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all ml-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quitter Cast</span>
          </button>
        </div>
      </div>

      {/* Main Gamepad Body (Split Left & Right Thumb Zones) */}
      <div className="relative z-10 flex-1 grid grid-cols-2 gap-4 items-center px-2 sm:px-8 my-auto">
        {/* Left Side: Large Ergonomic D-Pad */}
        <div className="flex flex-col items-center justify-center h-full">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
            {/* D-Pad Ambient Glow */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/15 blur-2xl pointer-events-none" />

            {/* D-Pad Cross Background Shell */}
            <div className="absolute w-20 h-56 sm:w-24 sm:h-64 bg-[#151624] rounded-3xl border border-white/[0.1] shadow-[0_12px_30px_rgba(0,0,0,0.8)] pointer-events-none" />
            <div className="absolute h-20 w-56 sm:h-24 sm:w-64 bg-[#151624] rounded-3xl border border-white/[0.1] shadow-[0_12px_30px_rgba(0,0,0,0.8)] pointer-events-none" />

            {/* Center Indent Disc */}
            <div className="absolute w-14 h-14 rounded-full bg-[#0d0e17] border border-white/[0.08] shadow-inner pointer-events-none z-10" />

            {/* UP Button */}
            <button
              onPointerDown={() => handlePointerDown('up')}
              onPointerUp={() => handlePointerUp('up')}
              onPointerLeave={() => handlePointerUp('up')}
              className="absolute top-0 w-20 h-20 sm:w-24 sm:h-24 rounded-t-3xl active:bg-violet-600/40 text-zinc-400 active:text-white flex items-start justify-center pt-3 transition-colors cursor-pointer z-20"
            >
              <div className="w-0 h-0 border-x-[10px] border-x-transparent border-b-[14px] border-b-zinc-400 group-active:border-b-white" />
            </button>

            {/* DOWN Button */}
            <button
              onPointerDown={() => handlePointerDown('down')}
              onPointerUp={() => handlePointerUp('down')}
              onPointerLeave={() => handlePointerUp('down')}
              className="absolute bottom-0 w-20 h-20 sm:w-24 sm:h-24 rounded-b-3xl active:bg-violet-600/40 text-zinc-400 active:text-white flex items-end justify-center pb-3 transition-colors cursor-pointer z-20"
            >
              <div className="w-0 h-0 border-x-[10px] border-x-transparent border-t-[14px] border-t-zinc-400" />
            </button>

            {/* LEFT Button */}
            <button
              onPointerDown={() => handlePointerDown('left')}
              onPointerUp={() => handlePointerUp('left')}
              onPointerLeave={() => handlePointerUp('left')}
              className="absolute left-0 w-20 h-20 sm:w-24 sm:h-24 rounded-l-3xl active:bg-violet-600/40 text-zinc-400 active:text-white flex items-center justify-start pl-3 transition-colors cursor-pointer z-20"
            >
              <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[14px] border-r-zinc-400" />
            </button>

            {/* RIGHT Button */}
            <button
              onPointerDown={() => handlePointerDown('right')}
              onPointerUp={() => handlePointerUp('right')}
              onPointerLeave={() => handlePointerUp('right')}
              className="absolute right-0 w-20 h-20 sm:w-24 sm:h-24 rounded-r-3xl active:bg-violet-600/40 text-zinc-400 active:text-white flex items-center justify-end pr-3 transition-colors cursor-pointer z-20"
            >
              <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[14px] border-l-zinc-400" />
            </button>
          </div>
          <span className="text-[11px] font-mono tracking-widest text-zinc-500 mt-2 uppercase font-bold">
            Croix Directionnelle
          </span>
        </div>

        {/* Right Side: Action Buttons A & B + Turbo Buttons */}
        <div className="flex flex-col items-center justify-center h-full">
          <div className="relative flex flex-col items-center gap-3">
            {/* Turbo Row */}
            <div className="flex items-center gap-3">
              <button
                onPointerDown={() => handlePointerDown('turboB')}
                onPointerUp={() => handlePointerUp('turboB')}
                onPointerLeave={() => handlePointerUp('turboB')}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 active:bg-amber-500 active:text-black font-bold font-mono text-sm sm:text-base flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <span>TB</span>
                <span className="text-[8px] uppercase tracking-tighter opacity-80">Turbo</span>
              </button>

              <button
                onPointerDown={() => handlePointerDown('turboA')}
                onPointerUp={() => handlePointerUp('turboA')}
                onPointerLeave={() => handlePointerUp('turboA')}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 active:bg-emerald-500 active:text-black font-bold font-mono text-sm sm:text-base flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <span>TA</span>
                <span className="text-[8px] uppercase tracking-tighter opacity-80">Turbo</span>
              </button>
            </div>

            {/* Primary Action Buttons: B & A Slanted */}
            <div className="flex items-center gap-5 sm:gap-7 -rotate-12 transform">
              {/* Button B */}
              <button
                onPointerDown={() => handlePointerDown('b')}
                onPointerUp={() => handlePointerUp('b')}
                onPointerLeave={() => handlePointerUp('b')}
                className="w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-gradient-to-b from-rose-600 to-rose-800 border-2 border-rose-400/50 text-white font-extrabold font-mono text-2xl sm:text-3xl flex items-center justify-center shadow-[0_12px_28px_rgba(225,29,72,0.45)] active:scale-95 active:from-rose-500 active:to-rose-700 transition-all cursor-pointer select-none"
              >
                B
              </button>

              {/* Button A */}
              <button
                onPointerDown={() => handlePointerDown('a')}
                onPointerUp={() => handlePointerUp('a')}
                onPointerLeave={() => handlePointerUp('a')}
                className="w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-gradient-to-b from-rose-600 to-rose-800 border-2 border-rose-400/50 text-white font-extrabold font-mono text-2xl sm:text-3xl flex items-center justify-center shadow-[0_12px_28px_rgba(225,29,72,0.45)] active:scale-95 active:from-rose-500 active:to-rose-700 transition-all cursor-pointer select-none"
              >
                A
              </button>
            </div>
          </div>
          <span className="text-[11px] font-mono tracking-widest text-zinc-500 mt-2 uppercase font-bold">
            Boutons d'action
          </span>
        </div>
      </div>

      {/* Bottom Center: SELECT & START Pills */}
      <div className="relative z-10 flex items-center justify-center gap-6 pb-2 safe-area-bottom">
        <button
          onPointerDown={() => handlePointerDown('select')}
          onPointerUp={() => handlePointerUp('select')}
          onPointerLeave={() => handlePointerUp('select')}
          className="w-22 sm:w-26 h-8 sm:h-9 rounded-full bg-[#1b1c2b] border border-white/[0.15] text-zinc-300 active:bg-zinc-700 active:text-white -rotate-25 transform shadow-md font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center cursor-pointer"
        >
          SELECT
        </button>

        <button
          onPointerDown={() => handlePointerDown('start')}
          onPointerUp={() => handlePointerUp('start')}
          onPointerLeave={() => handlePointerUp('start')}
          className="w-22 sm:w-26 h-8 sm:h-9 rounded-full bg-[#1b1c2b] border border-white/[0.15] text-zinc-300 active:bg-zinc-700 active:text-white -rotate-25 transform shadow-md font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center cursor-pointer"
        >
          START
        </button>
      </div>
    </div>
  );
}
