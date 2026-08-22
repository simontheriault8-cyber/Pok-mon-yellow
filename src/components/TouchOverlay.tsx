import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TouchControlsConfig } from '../emulator/types';
import { Move } from 'lucide-react';

interface TouchOverlayProps {
  config: TouchControlsConfig;
  onButtonDown: (btn: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select' | 'turboA' | 'turboB') => void;
  onButtonUp: (btn: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select' | 'turboA' | 'turboB') => void;
  isCustomizingLayout?: boolean;
  onUpdatePosition?: (dpadPos: { x: number; y: number }, actionPos: { x: number; y: number }) => void;
}

type Direction = 'up' | 'down' | 'left' | 'right';

export function TouchOverlay({
  config,
  onButtonDown,
  onButtonUp,
  isCustomizingLayout = false,
  onUpdatePosition
}: TouchOverlayProps) {
  if (!config.enabled) return null;

  const dpadType = config.dpadType || 'dpad-8way';

  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const [dpadPos, setDpadPos] = useState(config.dpadPos || { x: 50, y: 78 });
  const [actionPos, setActionPos] = useState(config.actionPos || { x: 82, y: 78 });

  // Dynamic floating joystick center & knob offset
  const [dynamicOrigin, setDynamicOrigin] = useState<{ x: number; y: number } | null>(null);
  const [joystickKnob, setJoystickKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sync state if config position changes (e.g., switched to Right/Left handed in Settings)
  useEffect(() => {
    if (isLandscape && !isCustomizingLayout) {
      // In landscape (phone tilted on side), default to comfortable thumbs on sides toward bottom
      setDpadPos({ x: 12, y: 74 });
      setActionPos({ x: 88, y: 74 });
    } else {
      if (config.dpadPos) setDpadPos(config.dpadPos);
      if (config.actionPos) setActionPos(config.actionPos);
    }
  }, [config.dpadPos?.x, config.dpadPos?.y, config.actionPos?.x, config.actionPos?.y, config.handMode, isLandscape, isCustomizingLayout]);

  const activeDraggingRef = useRef<'dpad' | 'action' | null>(null);

  // D-Pad vector sliding state
  const [activeDirections, setActiveDirections] = useState<Set<Direction>>(new Set());
  const dpadRef = useRef<HTMLDivElement | null>(null);
  const dynamicZoneRef = useRef<HTMLDivElement | null>(null);
  const activeDpadPointerId = useRef<number | null>(null);
  const currentDirsRef = useRef<Set<Direction>>(new Set());

  // Haptic feedback trigger for mobile touch
  const triggerHaptic = useCallback((duration = 12) => {
    if (config.haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Haptics not allowed or unsupported
      }
    }
  }, [config.haptics]);

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
        triggerHaptic(12);
        onButtonDown(dir);
      }
    });

    currentDirsRef.current = newDirs;
    setActiveDirections(new Set(newDirs));
  }, [onButtonDown, onButtonUp, triggerHaptic]);

  const computeDirectionFromVectors = (dx: number, dy: number, radius = 60): Set<Direction> => {
    const distance = Math.hypot(dx, dy);

    // Deadzone check (inner 18% radius)
    if (distance < radius * 0.18) {
      return new Set();
    }

    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180
    const dirs = new Set<Direction>();

    if (dpadType === 'dpad-4way') {
      // Strict 4-way direction (no diagonals: Up, Down, Left, Right)
      if (angle >= -135 && angle < -45) {
        dirs.add('up');
      } else if (angle >= -45 && angle < 45) {
        dirs.add('right');
      } else if (angle >= 45 && angle < 135) {
        dirs.add('down');
      } else {
        dirs.add('left');
      }
    } else {
      // 8-way directional sector mapping (or dynamic joystick)
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
    }

    return dirs;
  };

  const computeDirectionFromTouch = (clientX: number, clientY: number): Set<Direction> => {
    if (!dpadRef.current) return new Set();
    const rect = dpadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    return computeDirectionFromVectors(dx, dy, rect.width / 2);
  };

  const handleDpadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCustomizingLayout) {
      activeDraggingRef.current = 'dpad';
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    activeDpadPointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const dirs = computeDirectionFromTouch(e.clientX, e.clientY);
    updateDirections(dirs);
  };

  const handleDpadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCustomizingLayout) return;
    if (activeDpadPointerId.current === null || activeDpadPointerId.current !== e.pointerId) return;
    e.preventDefault();
    const dirs = computeDirectionFromTouch(e.clientX, e.clientY);
    updateDirections(dirs);
  };

  const handleDpadPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCustomizingLayout) return;
    if (activeDpadPointerId.current === e.pointerId) {
      e.preventDefault();
      activeDpadPointerId.current = null;
      updateDirections(new Set());
    }
  };

  // Dynamic / Floating Tracking Joystick Handlers
  const handleDynamicZonePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCustomizingLayout || dpadType !== 'dynamic-joystick') return;
    e.preventDefault();
    e.stopPropagation();
    activeDpadPointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDynamicOrigin({ x: e.clientX, y: e.clientY });
    setJoystickKnob({ x: 0, y: 0 });
    updateDirections(new Set());
  };

  const handleDynamicZonePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCustomizingLayout || dpadType !== 'dynamic-joystick' || !dynamicOrigin) return;
    if (activeDpadPointerId.current === null || activeDpadPointerId.current !== e.pointerId) return;
    e.preventDefault();

    const maxRadius = 54;
    let dx = e.clientX - dynamicOrigin.x;
    let dy = e.clientY - dynamicOrigin.y;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * maxRadius;
      dy = Math.sin(angle) * maxRadius;
    }

    setJoystickKnob({ x: dx, y: dy });
    const dirs = computeDirectionFromVectors(dx, dy, maxRadius);
    updateDirections(dirs);
  };

  const handleDynamicZonePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCustomizingLayout || dpadType !== 'dynamic-joystick') return;
    if (activeDpadPointerId.current === e.pointerId) {
      e.preventDefault();
      activeDpadPointerId.current = null;
      setDynamicOrigin(null);
      setJoystickKnob({ x: 0, y: 0 });
      updateDirections(new Set());
    }
  };

  // Action Buttons Pointer Handlers
  const handleActionDown = (btn: 'a' | 'b' | 'turboA' | 'turboB' | 'start' | 'select', e: React.PointerEvent) => {
    if (isCustomizingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(12);
    onButtonDown(btn);
  };

  const handleActionUp = (btn: 'a' | 'b' | 'turboA' | 'turboB' | 'start' | 'select', e: React.PointerEvent) => {
    if (isCustomizingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    onButtonUp(btn);
  };

  // Drag and Drop Layout Customizer
  const handleTouchMoveOverlay = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isCustomizingLayout || !activeDraggingRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const xPct = Math.max(12, Math.min(88, (clientX / window.innerWidth) * 100));
    const yPct = Math.max(15, Math.min(85, (clientY / window.innerHeight) * 100));

    if (activeDraggingRef.current === 'dpad') {
      const newDpad = { x: xPct, y: yPct };
      setDpadPos(newDpad);
      if (onUpdatePosition) onUpdatePosition(newDpad, actionPos);
    } else if (activeDraggingRef.current === 'action') {
      const newAction = { x: xPct, y: yPct };
      setActionPos(newAction);
      if (onUpdatePosition) onUpdatePosition(dpadPos, newAction);
    }
  };

  const scale = config.scale || 1.0;
  const opacity = config.opacity ?? 0.88;

  return (
    <div
      id="touch-controls-overlay"
      onTouchMove={handleTouchMoveOverlay}
      onMouseMove={handleTouchMoveOverlay}
      onMouseUp={() => { activeDraggingRef.current = null; }}
      onTouchEnd={() => { activeDraggingRef.current = null; }}
      className={`fixed inset-0 pointer-events-none z-30 select-none ${
        isCustomizingLayout ? 'pointer-events-auto bg-black/50 border-2 border-dashed border-amber-400 touch-none' : ''
      }`}
    >
      {/* Customization Helper Bar */}
      {isCustomizingLayout && (
        <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-auto z-50 px-4">
          <div className="bg-amber-500 text-zinc-950 px-4 py-2 rounded-full font-extrabold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
            <Move className="w-4 h-4" />
            Glissez les boutons pour ajuster l'emplacement sur votre Pixel 6
          </div>
        </div>
      )}

      {/* D-PAD / JOYSTICK SECTION */}
      {dpadType === 'dynamic-joystick' ? (
        <>
          {/* Dynamic tracking touch area (restricted to safe gaming zone, leaving top and bottom bar free for chat tabs) */}
          <div
            ref={dynamicZoneRef}
            onPointerDown={handleDynamicZonePointerDown}
            onPointerMove={handleDynamicZonePointerMove}
            onPointerUp={handleDynamicZonePointerEnd}
            onPointerCancel={handleDynamicZonePointerEnd}
            className="absolute bottom-16 left-0 w-[46%] portrait:top-[48vh] landscape:top-14 pointer-events-auto touch-none z-20"
          >
            {/* Ambient visual hint when inactive */}
            {!dynamicOrigin && !isCustomizingLayout && (
              <div
                style={{
                  left: `${dpadPos.x}%`,
                  top: `${dpadPos.y}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: opacity * 0.45
                }}
                className="absolute pointer-events-none w-24 h-24 rounded-full border border-dashed border-violet-400/40 flex flex-col items-center justify-center animate-pulse"
              >
                <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-400/30" />
                <span className="text-[9px] font-mono font-bold text-violet-300/80 mt-1 uppercase tracking-tighter">
                  Joystick Tactile
                </span>
              </div>
            )}

            {/* Dynamic Joystick Visualized where user touches */}
            {dynamicOrigin && (
              <div
                style={{
                  left: `${dynamicOrigin.x}px`,
                  top: `${dynamicOrigin.y}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity: opacity
                }}
                className="absolute pointer-events-none w-32 h-32 rounded-full bg-black/50 border-2 border-violet-500/60 shadow-[0_0_30px_rgba(139,92,246,0.6)] backdrop-blur-md flex items-center justify-center z-30"
              >
                {/* 4 Direction Guide Lines */}
                <div className="absolute inset-2 rounded-full border border-white/10" />
                <div className="absolute w-full h-[1px] bg-white/15" />
                <div className="absolute h-full w-[1px] bg-white/15" />

                {/* Tracking Stick Knob */}
                <div
                  style={{
                    transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`
                  }}
                  className="w-14 h-14 rounded-full bg-gradient-to-b from-violet-500 via-indigo-600 to-purple-800 border-2 border-violet-300 shadow-[0_4px_15px_rgba(139,92,246,0.8)] flex items-center justify-center transition-none"
                >
                  <div className="w-5 h-5 rounded-full bg-white/20 border border-white/40" />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Standard Static D-Pad (4-Direction or 8-Direction) */
        <div
          id="touch-dpad-cluster"
          style={{
            left: `${dpadPos.x}%`,
            top: `${dpadPos.y}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity: opacity
          }}
          className={`absolute pointer-events-auto touch-none select-none ${
            isCustomizingLayout ? 'cursor-move ring-2 ring-amber-400 rounded-full p-2' : ''
          }`}
        >
          <div
            ref={dpadRef}
            onPointerDown={handleDpadPointerDown}
            onPointerMove={handleDpadPointerMove}
            onPointerUp={handleDpadPointerEnd}
            onPointerCancel={handleDpadPointerEnd}
            className="relative w-32 h-32 rounded-full bg-black/40 border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center justify-center cursor-pointer active:border-violet-500/50 transition-colors"
          >
            {/* Base Inner Ring */}
            <div className="absolute inset-1.5 rounded-full bg-black/30 border border-white/10 shadow-inner" />

            {/* D-Pad Buttons Grid Visuals */}
            <div className="relative w-28 h-28 grid grid-cols-3 grid-rows-3 p-0.5 pointer-events-none">
              {/* UP */}
              <div
                className={`col-start-2 row-start-1 rounded-t-lg border-t border-x flex items-center justify-center transition-all ${
                  activeDirections.has('up')
                    ? 'bg-violet-600/90 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.9)] translate-y-0.5'
                    : 'bg-white/[0.12] border-white/25'
                }`}
              >
                <div className={`w-0 h-0 border-x-[5px] border-x-transparent border-b-[8px] ${activeDirections.has('up') ? 'border-b-white' : 'border-b-zinc-200'}`} />
              </div>

              {/* LEFT */}
              <div
                className={`col-start-1 row-start-2 rounded-l-lg border-y border-l flex items-center justify-center transition-all ${
                  activeDirections.has('left')
                    ? 'bg-violet-600/90 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.9)] translate-x-0.5'
                    : 'bg-white/[0.12] border-white/25'
                }`}
              >
                <div className={`w-0 h-0 border-y-[5px] border-y-transparent border-r-[8px] ${activeDirections.has('left') ? 'border-r-white' : 'border-r-zinc-200'}`} />
              </div>

              {/* CENTER PIVOT */}
              <div className="col-start-2 row-start-2 bg-black/40 flex items-center justify-center">
                <div className={`w-3.5 h-3.5 rounded-full transition-all ${activeDirections.size > 0 ? 'bg-violet-400/70 scale-110' : 'bg-white/15'}`} />
              </div>

              {/* RIGHT */}
              <div
                className={`col-start-3 row-start-2 rounded-r-lg border-y border-r flex items-center justify-center transition-all ${
                  activeDirections.has('right')
                    ? 'bg-violet-600/90 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.9)] -translate-x-0.5'
                    : 'bg-white/[0.12] border-white/25'
                }`}
              >
                <div className={`w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] ${activeDirections.has('right') ? 'border-l-white' : 'border-l-zinc-200'}`} />
              </div>

              {/* DOWN */}
              <div
                className={`col-start-2 row-start-3 rounded-b-lg border-b border-x flex items-center justify-center transition-all ${
                  activeDirections.has('down')
                    ? 'bg-violet-600/90 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.9)] -translate-y-0.5'
                    : 'bg-white/[0.12] border-white/25'
                }`}
              >
                <div className={`w-0 h-0 border-x-[5px] border-x-transparent border-t-[8px] ${activeDirections.has('down') ? 'border-t-white' : 'border-t-zinc-200'}`} />
              </div>
            </div>

            {/* Sub-label showing 4-way or 8-way */}
            <div className="absolute -bottom-5 text-[9px] font-mono font-bold text-zinc-400/70 tracking-tight">
              {dpadType === 'dpad-4way' ? '4 DIRECTIONS' : '8 DIRECTIONS'}
            </div>
          </div>
        </div>
      )}

      {/* Floating / Positioned Action Buttons Cluster (A, B, Turbo) */}
      <div
        id="touch-action-cluster"
        style={{
          left: `${actionPos.x}%`,
          top: `${actionPos.y}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          opacity: opacity
        }}
        onPointerDown={() => {
          if (isCustomizingLayout) activeDraggingRef.current = 'action';
        }}
        className={`absolute pointer-events-auto touch-none select-none ${
          isCustomizingLayout ? 'cursor-move ring-2 ring-amber-400 rounded-full p-2' : ''
        }`}
      >
        <div className="flex flex-col items-end gap-2.5 p-2.5 bg-black/40 rounded-3xl border border-white/20 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          {/* Turbo Row */}
          {config.showTurboButtons && (
            <div className="flex items-center gap-2.5 -rotate-12">
              <button
                type="button"
                onPointerDown={(e) => handleActionDown('turboB', e)}
                onPointerUp={(e) => handleActionUp('turboB', e)}
                onPointerLeave={(e) => handleActionUp('turboB', e)}
                className="w-10 h-10 rounded-full bg-gradient-to-b from-rose-600/80 to-rose-900/80 active:from-rose-500 active:to-rose-800 active:scale-95 border border-rose-400/50 flex items-center justify-center shadow-lg text-[11px] font-black text-rose-100 ring-1 ring-white/10 touch-none transition-transform"
              >
                TB
              </button>

              <button
                type="button"
                onPointerDown={(e) => handleActionDown('turboA', e)}
                onPointerUp={(e) => handleActionUp('turboA', e)}
                onPointerLeave={(e) => handleActionUp('turboA', e)}
                className="w-10 h-10 rounded-full bg-gradient-to-b from-rose-600/80 to-rose-900/80 active:from-rose-500 active:to-rose-800 active:scale-95 border border-rose-400/50 flex items-center justify-center shadow-lg text-[11px] font-black text-rose-100 ring-1 ring-white/10 touch-none transition-transform"
              >
                TA
              </button>
            </div>
          )}

          {/* Standard B & A */}
          <div className="flex items-center gap-3 -rotate-12">
            <button
              type="button"
              onPointerDown={(e) => handleActionDown('b', e)}
              onPointerUp={(e) => handleActionUp('b', e)}
              onPointerLeave={(e) => handleActionUp('b', e)}
              className="w-12 h-12 rounded-full bg-gradient-to-b from-rose-500/85 via-rose-600/85 to-rose-800/85 active:from-rose-400 active:to-rose-700 active:scale-95 border-2 border-rose-400/80 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.35)] text-sm font-black text-white ring-1 ring-white/20 touch-none transition-transform"
            >
              B
            </button>

            <button
              type="button"
              onPointerDown={(e) => handleActionDown('a', e)}
              onPointerUp={(e) => handleActionUp('a', e)}
              onPointerLeave={(e) => handleActionUp('a', e)}
              className="w-12 h-12 rounded-full bg-gradient-to-b from-rose-500/85 via-rose-600/85 to-rose-800/85 active:from-rose-400 active:to-rose-700 active:scale-95 border-2 border-rose-400/80 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.35)] text-sm font-black text-white ring-1 ring-white/20 touch-none transition-transform"
            >
              A
            </button>
          </div>
        </div>
      </div>

      {/* SELECT and START buttons */}
      <div
        className={`absolute bottom-12 sm:bottom-6 flex items-center gap-3 pointer-events-auto ${
          isLandscape || config.handMode === 'sides'
            ? 'left-1/2 -translate-x-1/2'
            : config.handMode === 'left'
            ? 'right-4 sm:right-6'
            : 'left-4 sm:left-6'
        }`}
        style={{ opacity: opacity }}
      >
        <button
          type="button"
          onPointerDown={(e) => handleActionDown('select', e)}
          onPointerUp={(e) => handleActionUp('select', e)}
          onPointerLeave={(e) => handleActionUp('select', e)}
          className="px-3.5 py-1.5 rounded-full bg-black/40 active:bg-violet-900/60 active:scale-95 border border-white/20 text-[10px] font-bold text-zinc-200 uppercase tracking-wider shadow-lg backdrop-blur-md touch-none transition-transform"
        >
          SELECT
        </button>

        <button
          type="button"
          onPointerDown={(e) => handleActionDown('start', e)}
          onPointerUp={(e) => handleActionUp('start', e)}
          onPointerLeave={(e) => handleActionUp('start', e)}
          className="px-3.5 py-1.5 rounded-full bg-black/40 active:bg-violet-900/60 active:scale-95 border border-white/20 text-[10px] font-bold text-zinc-200 uppercase tracking-wider shadow-lg backdrop-blur-md touch-none transition-transform"
        >
          START
        </button>
      </div>
    </div>
  );
}

