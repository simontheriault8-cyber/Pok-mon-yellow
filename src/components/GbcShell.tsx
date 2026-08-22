import React, { useState, useRef, useCallback } from 'react';
import { ConsoleColor } from '../emulator/types';

interface GbcShellProps {
  color: ConsoleColor;
  isPowered: boolean;
  isPaused: boolean;
  isTurbo: boolean;
  onButtonDown: (btn: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select' | 'turboA' | 'turboB') => void;
  onButtonUp: (btn: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select' | 'turboA' | 'turboB') => void;
  showTurboButtons?: boolean;
  hapticsEnabled?: boolean;
  children: React.ReactNode;
}

type Direction = 'up' | 'down' | 'left' | 'right';

export function GbcShell({
  color,
  isPowered,
  isPaused,
  isTurbo,
  onButtonDown,
  onButtonUp,
  showTurboButtons = true,
  hapticsEnabled = true,
  children
}: GbcShellProps) {
  // Shell Color styling classes
  const getShellClasses = (): string => {
    switch (color) {
      case 'atomic-purple':
        return 'bg-gradient-to-b from-purple-950/90 via-[#18122B]/95 to-[#0F0A1C] border-purple-500/40 shadow-[0_20px_50px_rgba(88,28,135,0.45)] backdrop-blur-md ring-1 ring-white/10';
      case 'teal':
        return 'bg-gradient-to-b from-cyan-800 via-teal-900 to-teal-950 border-cyan-400/40 shadow-[0_20px_50px_rgba(13,148,136,0.35)] ring-1 ring-white/10';
      case 'yellow':
        return 'bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 border-yellow-300/60 shadow-[0_20px_50px_rgba(234,179,8,0.35)] text-zinc-900 ring-1 ring-black/10';
      case 'berry':
        return 'bg-gradient-to-b from-rose-700 via-pink-900 to-rose-950 border-rose-400/40 shadow-[0_20px_50px_rgba(225,29,72,0.35)] ring-1 ring-white/10';
      case 'classic-gray':
        return 'bg-gradient-to-b from-stone-300 via-stone-400 to-stone-500 border-stone-300 shadow-[0_20px_50px_rgba(120,113,108,0.3)] text-zinc-800 ring-1 ring-black/10';
      case 'midnight-oled':
        return 'bg-gradient-to-b from-[#161822] via-[#0e1017] to-[#07080c] border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] ring-1 ring-white/5';
      case 'neon-pink':
        return 'bg-gradient-to-b from-fuchsia-600 via-pink-800 to-rose-950 border-pink-400/50 shadow-[0_20px_50px_rgba(217,70,239,0.4)] ring-1 ring-white/10';
      default:
        return 'bg-purple-950 border-purple-700/50';
    }
  };

  const isLightShell = color === 'yellow' || color === 'classic-gray';

  // Haptic feedback trigger for mobile touch
  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore if unsupported
      }
    }
  }, [hapticsEnabled]);

  // Active D-pad direction state for continuous sliding
  const [activeDirections, setActiveDirections] = useState<Set<Direction>>(new Set());
  const dpadRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const currentDirsRef = useRef<Set<Direction>>(new Set());

  const updateDirections = useCallback((newDirs: Set<Direction>) => {
    const oldDirs = currentDirsRef.current;
    
    // Release directions no longer pressed
    oldDirs.forEach(dir => {
      if (!newDirs.has(dir)) {
        onButtonUp(dir);
      }
    });

    // Press new directions
    newDirs.forEach(dir => {
      if (!oldDirs.has(dir)) {
        triggerHaptic();
        onButtonDown(dir);
      }
    });

    currentDirsRef.current = newDirs;
    setActiveDirections(new Set(newDirs));
  }, [onButtonDown, onButtonUp, triggerHaptic]);

  const computeDirectionFromTouch = (clientX: number, clientY: number): Set<Direction> => {
    if (!dpadRef.current) return new Set();
    const rect = dpadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    // Deadzone check (inner 15% radius)
    if (distance < rect.width * 0.12) {
      return new Set();
    }

    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180
    const dirs = new Set<Direction>();

    // 8-way directional sector mapping
    if (angle >= -157.5 && angle <= -22.5) {
      dirs.add('up');
    }
    if (angle >= 22.5 && angle <= 157.5) {
      dirs.add('down');
    }
    if (angle > 112.5 || angle < -112.5) {
      dirs.add('left');
    }
    if (angle >= -67.5 && angle <= 67.5) {
      dirs.add('right');
    }

    return dirs;
  };

  const handleDpadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    activePointerIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const dirs = computeDirectionFromTouch(e.clientX, e.clientY);
    updateDirections(dirs);
  };

  const handleDpadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === null || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const dirs = computeDirectionFromTouch(e.clientX, e.clientY);
    updateDirections(dirs);
  };

  const handleDpadPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      e.preventDefault();
      activePointerIdRef.current = null;
      updateDirections(new Set());
    }
  };

  const handleActionDown = (btn: 'a' | 'b' | 'turboA' | 'turboB' | 'start' | 'select', e: React.PointerEvent) => {
    e.preventDefault();
    triggerHaptic();
    onButtonDown(btn);
  };

  const handleActionUp = (btn: 'a' | 'b' | 'turboA' | 'turboB' | 'start' | 'select', e: React.PointerEvent) => {
    e.preventDefault();
    onButtonUp(btn);
  };

  return (
    <div
      id="gbc-handheld-shell"
      className={`relative w-full max-w-[390px] sm:max-w-[440px] p-4 sm:p-5 rounded-[36px] sm:rounded-[42px] border-2 transition-all duration-300 flex flex-col items-center select-none touch-none ${getShellClasses()}`}
    >
      {/* Top Curvature Subtle Speaker Ridge */}
      <div className="w-20 sm:w-24 h-1.5 rounded-full bg-black/25 mb-2.5 shadow-inner" />

      {/* Screen Bezel Window */}
      <div className="w-full bg-[#0f111a] p-3 sm:p-4 rounded-2xl rounded-b-[26px] border border-white/[0.08] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] flex flex-col items-center">
        {/* Top Bezel Header: Power LED & Screen Branding */}
        <div className="w-full flex items-center justify-between px-1.5 mb-2">
          {/* Power LED Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                !isPowered
                  ? 'bg-zinc-700 shadow-none'
                  : isPaused
                  ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                  : isTurbo
                  ? 'bg-cyan-400 animate-ping shadow-[0_0_10px_#22d3ee]'
                  : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
              }`}
            />
            <span className="text-[8.5px] font-bold tracking-widest text-zinc-400 uppercase">POWER</span>
          </div>

          {/* Authentic Logo */}
          <div className="flex items-center gap-1.5 font-bold tracking-tight">
            <span className="text-zinc-200 text-xs italic font-extrabold tracking-wider">GAME BOY</span>
            <span className="text-[10px] tracking-widest font-black inline-flex">
              <span className="text-rose-500">C</span>
              <span className="text-amber-400">O</span>
              <span className="text-emerald-400">L</span>
              <span className="text-cyan-400">O</span>
              <span className="text-purple-400">R</span>
            </span>
          </div>
        </div>

        {/* Screen Viewport Container */}
        <div className="w-full rounded-md overflow-hidden border border-zinc-950 shadow-inner bg-black">
          {children}
        </div>
      </div>

      {/* Bottom Console Controls Section */}
      <div className="w-full mt-4 sm:mt-5 px-1 flex flex-col gap-4 sm:gap-5">
        {/* Main Controls Row: D-Pad & Action Buttons */}
        <div className="w-full flex items-center justify-between">
          {/* Authentic D-Pad Cross with Continuous 8-Way Vector Touch Sliding */}
          <div
            ref={dpadRef}
            id="shell-dpad-container"
            onPointerDown={handleDpadPointerDown}
            onPointerMove={handleDpadPointerMove}
            onPointerUp={handleDpadPointerEnd}
            onPointerCancel={handleDpadPointerEnd}
            className="relative w-32 h-32 flex items-center justify-center cursor-pointer touch-none select-none"
            title="Croix directionnelle tactile (glissez votre pouce)"
          >
            {/* D-Pad Base Circle Groove */}
            <div className="absolute inset-1.5 rounded-full bg-black/35 shadow-inner border border-white/5" />

            {/* D-Pad Cross */}
            <div className="relative w-28 h-28 grid grid-cols-3 grid-rows-3 p-1 pointer-events-none">
              {/* Up */}
              <div
                className={`col-start-2 row-start-1 rounded-t-lg border-t border-x flex items-center justify-center transition-all ${
                  activeDirections.has('up')
                    ? 'bg-violet-600 border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.6)] translate-y-0.5'
                    : 'bg-zinc-800/95 border-zinc-600 shadow-[0_4px_0_#18181b]'
                }`}
              >
                <div className={`w-0 h-0 border-x-[5px] border-x-transparent border-b-[7px] ${activeDirections.has('up') ? 'border-b-white' : 'border-b-zinc-400'}`} />
              </div>

              {/* Left */}
              <div
                className={`col-start-1 row-start-2 rounded-l-lg border-y border-l flex items-center justify-center transition-all ${
                  activeDirections.has('left')
                    ? 'bg-violet-600 border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.6)] translate-x-0.5'
                    : 'bg-zinc-800/95 border-zinc-600 shadow-[0_4px_0_#18181b]'
                }`}
              >
                <div className={`w-0 h-0 border-y-[5px] border-y-transparent border-r-[7px] ${activeDirections.has('left') ? 'border-r-white' : 'border-r-zinc-400'}`} />
              </div>

              {/* Center Pivot */}
              <div className="col-start-2 row-start-2 bg-zinc-850 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full transition-all ${activeDirections.size > 0 ? 'bg-violet-400/40' : 'bg-zinc-900/80 shadow-inner'}`} />
              </div>

              {/* Right */}
              <div
                className={`col-start-3 row-start-2 rounded-r-lg border-y border-r flex items-center justify-center transition-all ${
                  activeDirections.has('right')
                    ? 'bg-violet-600 border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.6)] -translate-x-0.5'
                    : 'bg-zinc-800/95 border-zinc-600 shadow-[0_4px_0_#18181b]'
                }`}
              >
                <div className={`w-0 h-0 border-y-[5px] border-y-transparent border-l-[7px] ${activeDirections.has('right') ? 'border-l-white' : 'border-l-zinc-400'}`} />
              </div>

              {/* Down */}
              <div
                className={`col-start-2 row-start-3 rounded-b-lg border-b border-x flex items-center justify-center transition-all ${
                  activeDirections.has('down')
                    ? 'bg-violet-600 border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.6)] -translate-y-0.5'
                    : 'bg-zinc-800/95 border-zinc-600 shadow-[0_4px_0_#18181b]'
                }`}
              >
                <div className={`w-0 h-0 border-x-[5px] border-x-transparent border-t-[7px] ${activeDirections.has('down') ? 'border-t-white' : 'border-t-zinc-400'}`} />
              </div>
            </div>
          </div>

          {/* Action Buttons (A, B + Turbo Buttons) */}
          <div className="flex flex-col items-end gap-2.5">
            {/* Turbo Rapid-Fire Buttons (Optional / Configurable) */}
            {showTurboButtons && (
              <div className="flex items-center gap-2.5 -rotate-25 transform origin-bottom-right mb-0.5">
                <button
                  id="btn-turbo-b"
                  type="button"
                  onPointerDown={(e) => handleActionDown('turboB', e)}
                  onPointerUp={(e) => handleActionUp('turboB', e)}
                  onPointerLeave={(e) => handleActionUp('turboB', e)}
                  className="w-10 h-10 rounded-full bg-gradient-to-b from-rose-700 to-rose-900 active:from-rose-800 active:to-rose-950 border-2 border-rose-500/80 shadow-[0_3px_0_#4c0519] flex items-center justify-center cursor-pointer transition-transform active:scale-95 touch-none"
                  title="Turbo B (Tir rapide)"
                >
                  <span className="text-[11px] font-black text-rose-100">TB</span>
                </button>

                <button
                  id="btn-turbo-a"
                  type="button"
                  onPointerDown={(e) => handleActionDown('turboA', e)}
                  onPointerUp={(e) => handleActionUp('turboA', e)}
                  onPointerLeave={(e) => handleActionUp('turboA', e)}
                  className="w-10 h-10 rounded-full bg-gradient-to-b from-rose-700 to-rose-900 active:from-rose-800 active:to-rose-950 border-2 border-rose-500/80 shadow-[0_3px_0_#4c0519] flex items-center justify-center cursor-pointer transition-transform active:scale-95 touch-none"
                  title="Turbo A (Tir rapide)"
                >
                  <span className="text-[11px] font-black text-rose-100">TA</span>
                </button>
              </div>
            )}

            {/* Standard B and A Buttons */}
            <div className="flex items-center gap-3.5 -rotate-25 transform origin-bottom-right">
              {/* Button B */}
              <div className="flex flex-col items-center">
                <button
                  id="btn-action-b"
                  type="button"
                  onPointerDown={(e) => handleActionDown('b', e)}
                  onPointerUp={(e) => handleActionUp('b', e)}
                  onPointerLeave={(e) => handleActionUp('b', e)}
                  className="w-13 h-13 rounded-full bg-gradient-to-b from-rose-600 via-rose-700 to-rose-900 active:from-rose-700 active:to-rose-950 border-2 border-rose-400/80 shadow-[0_4px_0_#4c0519] flex items-center justify-center cursor-pointer transition-transform active:scale-95 touch-none"
                  title="Bouton B"
                >
                  <span className="text-sm font-black text-white">B</span>
                </button>
                <span className={`text-[10px] font-black mt-1 ${isLightShell ? 'text-zinc-700' : 'text-zinc-300'}`}>B</span>
              </div>

              {/* Button A */}
              <div className="flex flex-col items-center">
                <button
                  id="btn-action-a"
                  type="button"
                  onPointerDown={(e) => handleActionDown('a', e)}
                  onPointerUp={(e) => handleActionUp('a', e)}
                  onPointerLeave={(e) => handleActionUp('a', e)}
                  className="w-13 h-13 rounded-full bg-gradient-to-b from-rose-600 via-rose-700 to-rose-900 active:from-rose-700 active:to-rose-950 border-2 border-rose-400/80 shadow-[0_4px_0_#4c0519] flex items-center justify-center cursor-pointer transition-transform active:scale-95 touch-none"
                  title="Bouton A"
                >
                  <span className="text-sm font-black text-white">A</span>
                </button>
                <span className={`text-[10px] font-black mt-1 ${isLightShell ? 'text-zinc-700' : 'text-zinc-300'}`}>A</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: SELECT / START Pill Buttons & Speaker Grille */}
        <div className="w-full flex items-center justify-between pt-1 sm:pt-2">
          {/* Select and Start Rubber Pills */}
          <div className="flex items-center gap-4 ml-6 sm:ml-8 -rotate-20 transform">
            {/* Select Button */}
            <div className="flex flex-col items-center">
              <button
                id="btn-select"
                type="button"
                onPointerDown={(e) => handleActionDown('select', e)}
                onPointerUp={(e) => handleActionUp('select', e)}
                onPointerLeave={(e) => handleActionUp('select', e)}
                className="w-11 h-4 rounded-full bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 border border-zinc-500 shadow-[0_2px_0_#18181b] cursor-pointer transition-transform active:translate-y-0.5 touch-none"
                title="Select"
              />
              <span className={`text-[9px] font-bold tracking-widest uppercase mt-1 ${isLightShell ? 'text-zinc-700' : 'text-zinc-300'}`}>SELECT</span>
            </div>

            {/* Start Button */}
            <div className="flex flex-col items-center">
              <button
                id="btn-start"
                type="button"
                onPointerDown={(e) => handleActionDown('start', e)}
                onPointerUp={(e) => handleActionUp('start', e)}
                onPointerLeave={(e) => handleActionUp('start', e)}
                className="w-11 h-4 rounded-full bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 border border-zinc-500 shadow-[0_2px_0_#18181b] cursor-pointer transition-transform active:translate-y-0.5 touch-none"
                title="Start"
              />
              <span className={`text-[9px] font-bold tracking-widest uppercase mt-1 ${isLightShell ? 'text-zinc-700' : 'text-zinc-300'}`}>START</span>
            </div>
          </div>

          {/* Speaker Grille Holes */}
          <div className="grid grid-cols-6 gap-1.5 -rotate-25 transform mr-3 sm:mr-4 opacity-50">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-black/60 shadow-inner" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

