import { useState, useRef, useEffect } from 'react';
import { SpeedMultiplier, RomItem } from '../emulator/types';
import { getRomPatchInfo } from '../utils/ipsPatcher';
import {
  Play,
  Pause,
  RotateCcw,
  Save,
  FolderOpen,
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Camera,
  Gamepad2,
  Sparkles,
  Zap,
  Cast,
  Wand2,
  X,
  Bot,
  Terminal,
  ChevronDown
} from 'lucide-react';
import { TrainerBotMode, BOT_MODES } from '../services/simpleTrainerBot';

interface ControlBarProps {
  isRunning: boolean;
  isPaused: boolean;
  speed: SpeedMultiplier;
  volume: number;
  isMuted: boolean;
  hasRom: boolean;
  currentRom?: RomItem | null;
  currentRomTitle?: string | null;
  gamepadConnected: boolean;
  isFullscreen: boolean;
  isCasting: boolean;
  isBotRunning?: boolean;
  botMode?: TrainerBotMode;
  onBotModeChange?: (mode: TrainerBotMode) => void;
  onToggleBot?: () => void;
  onOpenBotLogs?: () => void;
  onToggleCast: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: SpeedMultiplier) => void;
  onQuickSave: () => void;
  onQuickLoad: () => void;
  onOpenSaveModal: () => void;
  onOpenRomLibrary: () => void;
  onOpenSettings: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onScreenshot: () => void;
}

export function ControlBar({
  isRunning,
  isPaused,
  speed,
  volume,
  isMuted,
  hasRom,
  currentRom,
  currentRomTitle,
  gamepadConnected,
  isFullscreen,
  isCasting,
  isBotRunning = false,
  botMode = 'continuous_battle',
  onBotModeChange,
  onToggleBot,
  onOpenBotLogs,
  onToggleCast,
  onPlayPause,
  onReset,
  onSpeedChange,
  onQuickSave,
  onQuickLoad,
  onOpenSaveModal,
  onOpenRomLibrary,
  onOpenSettings,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onScreenshot
}: ControlBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  // Close floating popover / menu on Escape key
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        setShowVolumePopup(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const speedOptions: SpeedMultiplier[] = [1, 2, 4, 8];

  const handleCycleSpeed = () => {
    if (speed === 1) onSpeedChange(2);
    else if (speed === 2) onSpeedChange(4);
    else if (speed === 4) onSpeedChange(8);
    else onSpeedChange(1);
  };

  return (
    <>
      {/* Background Backdrop Overlay to safely absorb outside clicks and prevent game interference */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150 cursor-pointer"
          onClick={() => {
            setIsMenuOpen(false);
            setShowVolumePopup(false);
          }}
          onTouchStart={() => {
            setIsMenuOpen(false);
            setShowVolumePopup(false);
          }}
        />
      )}

      {/* Floating Discrete Bottom Bar / Corner Pill */}
      <div className="fixed bottom-12 right-3 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 pointer-events-auto select-none">
        {/* Speed Indicator pill if accelerated */}
        {speed > 1 && (
          <button
            onClick={handleCycleSpeed}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-400/90 text-zinc-950 text-xs font-black shadow-lg border border-amber-300 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
            title="Cliquez pour changer la vitesse"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{speed}x</span>
          </button>
        )}

        {/* Casting Active Pill */}
        {isCasting && (
          <div
            onClick={onToggleCast}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-500/90 text-zinc-950 text-xs font-bold shadow-lg border border-emerald-400 backdrop-blur-md cursor-pointer animate-pulse"
            title="Diffusion TV active (cliquer pour arrêter)"
          >
            <Cast className="w-3.5 h-3.5" />
            <span className="text-[11px]">TV Active</span>
          </div>
        )}

        {/* Bot Active Pill (Discrete corner indicator) */}
        {isBotRunning && (
          <button
            onClick={onOpenBotLogs || onToggleBot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-black shadow-lg border border-emerald-300 backdrop-blur-md cursor-pointer animate-pulse hover:scale-105 active:scale-95 transition-all"
            title="Bot actif - Cliquer pour ouvrir le journal et les décisions"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bot</span>
            <Terminal className="w-3 h-3 opacity-70 ml-0.5" />
          </button>
        )}

        {/* Main Settings / Menu Trigger Button (Elevated above mobile tabs) */}
        <button
          id="main-settings-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`p-3 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-center justify-center ${
            isMenuOpen
              ? 'bg-violet-600 border-violet-400 text-white ring-2 ring-violet-400/50 scale-105'
              : 'bg-[#0f111a]/90 hover:bg-[#1a1c2b] border-white/[0.16] text-zinc-200 hover:text-white hover:border-white/30 active:scale-95'
          }`}
          title={isMenuOpen ? 'Fermer le menu' : 'Paramètres et options de jeu'}
        >
          {isMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Settings className="w-5 h-5 text-violet-300" />
          )}
        </button>
      </div>

      {/* Floating Options Menu Overlay Panel (Opening upwards with safe bottom margin) */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed bottom-24 right-3 sm:bottom-20 sm:right-6 max-h-[75vh] overflow-y-auto w-[calc(100vw-24px)] max-w-sm sm:max-w-md bg-[#0c0e18]/98 border border-white/[0.18] rounded-3xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.98)] backdrop-blur-3xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 select-none text-zinc-100 flex flex-col gap-4 pointer-events-auto"
        >
          {/* Header of Options Menu */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Menu de Jeu</h3>
                <p className="text-[11px] text-zinc-400">Commandes, sauvegardes et configuration</p>
              </div>
            </div>

            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Loaded ROM Indicator in Menu */}
          {(() => {
            const patchInfo = getRomPatchInfo(currentRom || (currentRomTitle ? { title: currentRomTitle, name: currentRomTitle } : null));
            const hasActiveGame = !!(currentRom || currentRomTitle);

            return (
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-2.5 shadow-inner">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      hasActiveGame
                        ? patchInfo.isPatched
                          ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                          : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {patchInfo.isPatched ? (
                      <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                    ) : (
                      <Gamepad2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Jeu Actif :
                      </span>
                      {hasActiveGame ? (
                        <>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                            En cours
                          </span>
                          {patchInfo.isPatched && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-violet-500/25 text-violet-200 border border-violet-500/40 shadow-sm">
                              <Wand2 className="w-2.5 h-2.5 text-violet-300" />
                              {patchInfo.patchLabel || 'Patch Actif'}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Aucun
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-extrabold text-white truncate max-w-[220px] sm:max-w-[280px] mt-0.5">
                      {hasActiveGame ? patchInfo.baseTitle : 'Aucune ROM chargée'}
                    </p>
                    {hasActiveGame && patchInfo.isPatched && (
                      <p className="text-[10px] font-semibold text-violet-300 flex items-center gap-1 truncate mt-0.5">
                        <span>✨ Modification :</span>
                        <span className="text-zinc-200 font-bold">{patchInfo.patchLabel || 'Patch IPS appliqué'}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Section 1: Core Navigation & Emulation Controls */}
          <div className="grid grid-cols-1 gap-2">
            {/* ROM Library */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onOpenRomLibrary();
              }}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer active:scale-95"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Bibliothèque de ROMs & Sauvegardes</span>
            </button>
          </div>

          {/* Section 1.5: Pokemon Yellow Auto-Trainer Bot Card */}
          {onToggleBot && (
            <div className="bg-[#0b0d17] border border-emerald-500/20 rounded-2xl p-3 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl ${isBotRunning ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-white/[0.06] text-zinc-400'}`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Bot d'Entraînement</h4>
                    <p className="text-[10px] text-zinc-400">Pokémon Jaune 151 (RAM)</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isBotRunning
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {isBotRunning ? '🟢 En cours' : 'Inactif'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* On/Off Toggle Button */}
                <button
                  onClick={() => {
                    const willStart = !isBotRunning;
                    onToggleBot();
                    if (willStart) {
                      setIsMenuOpen(false);
                      setShowVolumePopup(false);
                    }
                  }}
                  className={`p-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isBotRunning
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  }`}
                >
                  {isBotRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isBotRunning ? 'Arrêter' : 'Démarrer'}</span>
                </button>

                {/* Open Log of decisions and actions */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenBotLogs?.();
                  }}
                  className="p-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Ouvrir le journal des décisions et actions du bot"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Journal & Logs</span>
                </button>
              </div>

              {/* Bot Mode Selector Dropdown */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label htmlFor="bot-mode-select" className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Mode du bot</span>
                  </label>
                  <span className="text-[9px] text-zinc-400 font-medium">
                    {botMode === 'train_slot_1' ? '🎓 Entraînement Slot 1' : '⚔️ Combat continu'}
                  </span>
                </div>
                <div className="relative">
                  <select
                    id="bot-mode-select"
                    value={botMode}
                    onChange={(e) => onBotModeChange?.(e.target.value as TrainerBotMode)}
                    className="w-full bg-[#121524] hover:bg-[#181d30] text-zinc-100 font-semibold text-xs py-2 px-2.5 pr-8 rounded-xl border border-emerald-500/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="continuous_battle">⚔️ Combat continu (Farming standard)</option>
                    <option value="train_slot_1">🎓 Entraînement premier Pokémon (Switch vers dernier)</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400 opacity-80">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight px-0.5">
                  {botMode === 'train_slot_1'
                    ? 'Tour 1 : Envoie Slot 1 pour l’EXP, puis switch vers le dernier Pokémon pour battre l’adversaire.'
                    : 'Attaque en boucle avec le Pokémon actif jusqu’à K.O. (switch auto uniquement si K.O.).'}
                </p>
              </div>
            </div>
          )}

          {/* TV Cast Option */}
          <div className="grid grid-cols-1">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onToggleCast();
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                isCasting
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300 hover:text-cyan-200'
              }`}
            >
              <Cast className="w-4 h-4" />
              <span>{isCasting ? 'Arrêter Cast TV' : 'Cast TV (Écran Déporté / Manette)'}</span>
            </button>
          </div>

          {/* Section 2: Quick Save & Load */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">États de sauvegarde</span>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSaveModal();
                }}
                disabled={!hasRom}
                className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-30 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Emplacements...</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onQuickSave();
                  setIsMenuOpen(false);
                }}
                disabled={!hasRom}
                className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Sauvegarder (F1)</span>
              </button>

              <button
                onClick={() => {
                  onQuickLoad();
                  setIsMenuOpen(false);
                }}
                disabled={!hasRom}
                className="p-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Charger (F3)</span>
              </button>
            </div>
          </div>

          {/* Section 3: Playback & Speed */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">Contrôles de lecture</span>
              <div className="flex items-center gap-1">
                {/* Play / Pause */}
                <button
                  onClick={onPlayPause}
                  disabled={!hasRom}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    !hasRom
                      ? 'opacity-30 cursor-not-allowed bg-white/[0.02] border-white/[0.05] text-zinc-600'
                      : isPaused
                      ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.12] text-zinc-200'
                  }`}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Reprendre' : 'Pause'}</span>
                </button>

                {/* Reset */}
                <button
                  onClick={() => {
                    onReset();
                    setIsMenuOpen(false);
                  }}
                  disabled={!hasRom}
                  className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Redémarrer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Speed Multipliers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Vitesse d'émulation :
                </span>
                <span className="font-mono font-bold text-amber-400">{speed}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 bg-[#090a0f] p-1 rounded-xl border border-white/[0.08]">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSpeedChange(s)}
                    className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
                      speed === s
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Audio Volume Slider */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="font-bold flex items-center gap-1.5">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-violet-400" />}
                Volume audio
              </span>
              <span className="font-mono font-bold text-violet-400">{isMuted ? 'Muet' : `${Math.round(volume * 100)}%`}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={onToggleMute}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 transition-colors cursor-pointer"
                title={isMuted ? "Rétablir le son" : "Couper le son"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  onVolumeChange(parseFloat(e.target.value));
                  if (isMuted) onToggleMute();
                }}
                className="w-full accent-violet-500 cursor-pointer h-2 bg-zinc-700 rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* Section 5: Settings, Fullscreen, Screenshot & Gamepad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Full Settings Modal */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onOpenSettings();
              }}
              className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 hover:text-white flex flex-col items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-all active:scale-95"
            >
              <Settings className="w-4 h-4 text-violet-400" />
              <span>Paramètres</span>
            </button>

            {/* Screenshot */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onScreenshot();
              }}
              disabled={!hasRom}
              className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 hover:text-white flex flex-col items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-30 transition-all active:scale-95"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Capture</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onToggleFullscreen();
              }}
              className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 hover:text-white flex flex-col items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-all active:scale-95"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
              <span>{isFullscreen ? 'Fenêtré' : 'Plein Écran'}</span>
            </button>
          </div>

          {/* Gamepad connection status footer */}
          {gamepadConnected && (
            <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Gamepad2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Manette physique détectée</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
