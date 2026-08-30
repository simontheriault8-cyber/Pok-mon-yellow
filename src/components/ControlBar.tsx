import React, { useState, useRef, useEffect } from 'react';
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
  X,
  Bot,
  Layers,
  SlidersHorizontal,
  HardDrive,
  HeartPulse,
  Compass
} from 'lucide-react';
import { TrainerBotMode } from '../services/simpleTrainerBot';
import { AutoHealProgress } from '../services/localNavigation';

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
  targetLevel?: number;
  onTargetLevelChange?: (level: number) => void;
  onBotModeChange?: (mode: TrainerBotMode) => void;
  onToggleBot?: () => void;
  isHealRunning?: boolean;
  healProgress?: AutoHealProgress | null;
  onToggleAutoHeal?: () => void;
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

type MenuTab = 'game' | 'bot' | 'controls';

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
  targetLevel = 50,
  onTargetLevelChange,
  onBotModeChange,
  onToggleBot,
  isHealRunning = false,
  healProgress = null,
  onToggleAutoHeal,
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
  const [activeTab, setActiveTab] = useState<MenuTab>('game');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close floating popover / menu on Escape key
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
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

  const patchInfo = getRomPatchInfo(
    currentRom || (currentRomTitle ? { title: currentRomTitle, name: currentRomTitle } : null)
  );
  const hasActiveGame = !!(currentRom || currentRomTitle);

  return (
    <>
      {/* Background Backdrop Overlay to safely absorb outside clicks */}
      {isMenuOpen && (
        <div
          id="game-menu-backdrop"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setIsMenuOpen(false)}
          onTouchStart={() => setIsMenuOpen(false)}
        />
      )}

      {/* Floating Corner Pills & Main Menu Toggle */}
      <div className="fixed bottom-12 right-3 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 pointer-events-auto select-none">
        {/* Speed Indicator Pill */}
        {speed > 1 && (
          <button
            onClick={handleCycleSpeed}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-400 text-zinc-950 text-xs font-black shadow-lg border border-amber-300 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
            title="Vitesse accélérée (cliquer pour changer)"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{speed}x</span>
          </button>
        )}

        {/* Cast Active Pill */}
        {isCasting && (
          <div
            onClick={onToggleCast}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-bold shadow-lg border border-emerald-300 backdrop-blur-md cursor-pointer animate-pulse"
            title="Diffusion TV active (cliquer pour arrêter)"
          >
            <Cast className="w-3.5 h-3.5" />
            <span>TV Active</span>
          </div>
        )}

        {/* Auto-Heal Bot Active Pill */}
        {isHealRunning && (
          <button
            onClick={onToggleAutoHeal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-400 text-zinc-950 text-xs font-black shadow-lg border border-cyan-300 backdrop-blur-md cursor-pointer animate-pulse hover:scale-105 active:scale-95 transition-all"
            title="Bot Soin actif (cliquer pour arrêter)"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Soin</span>
          </button>
        )}

        {/* Battle Bot Running Pill */}
        {isBotRunning && (
          <button
            onClick={onToggleBot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-black shadow-lg border border-emerald-300 backdrop-blur-md cursor-pointer animate-pulse hover:scale-105 active:scale-95 transition-all"
            title="Bot d'entraînement actif (cliquer pour arrêter)"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bot XP</span>
          </button>
        )}

        {/* Main Menu Button */}
        <button
          id="main-settings-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`p-3 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-center justify-center ${
            isMenuOpen
              ? 'bg-violet-600 border-violet-400 text-white ring-2 ring-violet-400/50 scale-105'
              : 'bg-[#0f111a]/95 hover:bg-[#1a1c2b] border-white/[0.16] text-zinc-200 hover:text-white active:scale-95'
          }`}
          title={isMenuOpen ? 'Fermer le menu' : 'Menu de Jeu'}
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5 text-violet-300" />}
        </button>
      </div>

      {/* Floating Options Menu Overlay Panel */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed bottom-24 right-3 sm:bottom-20 sm:right-6 max-h-[82vh] overflow-hidden w-[calc(100vw-24px)] max-w-sm sm:max-w-md bg-[#0c0e18] border border-white/[0.1] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-200 select-none text-zinc-100 flex flex-col pointer-events-auto"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between bg-[#08090f]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Menu de Jeu</h3>
                <p className="text-[11px] text-zinc-400">Sauvegardes, bots autonomes et réglages</p>
              </div>
            </div>

            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active ROM Compact Strip */}
          <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.05] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  hasActiveGame ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span className="text-xs font-bold text-white truncate">
                {hasActiveGame ? patchInfo.baseTitle : 'Aucune ROM chargée'}
              </span>
            </div>
            {hasActiveGame && patchInfo.isPatched && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                <Sparkles className="w-2.5 h-2.5" />
                {patchInfo.patchLabel || 'Patch'}
              </span>
            )}
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="p-2 border-b border-white/[0.06] bg-[#090a11]">
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-white/[0.04]">
              {[
                { id: 'game' as MenuTab, label: 'Jeu & Saves', icon: HardDrive },
                { id: 'bot' as MenuTab, label: 'Bots Auto', icon: Bot },
                { id: 'controls' as MenuTab, label: 'Options', icon: SlidersHorizontal }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-sm font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4 max-h-[55vh]">
            {/* TAB 1: JEU & SAUVEGARDES */}
            {activeTab === 'game' && (
              <div className="space-y-3">
                {/* Quick Save & Load Grid */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Sauvegarde Rapide
                    </span>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenSaveModal();
                      }}
                      disabled={!hasRom}
                      className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Tous les slots...</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onQuickSave();
                        setIsMenuOpen(false);
                      }}
                      disabled={!hasRom}
                      className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
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
                      className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Charger (F3)</span>
                    </button>
                  </div>
                </div>

                {/* ROM Library button */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenRomLibrary();
                  }}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-violet-400" />
                    <span>Bibliothèque de ROMs & Jeux</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded bg-white/[0.06]">
                    Ouvrir
                  </span>
                </button>

                {/* Cast TV Button */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleCast();
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    isCasting
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-extrabold'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06] text-zinc-200 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cast className="w-4 h-4 text-cyan-400" />
                    <span>Cast TV (Écran Déporté / Manette)</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${isCasting ? 'bg-black/20 text-black font-black' : 'bg-white/[0.06] text-zinc-400'}`}>
                    {isCasting ? 'Actif' : 'Diffuser'}
                  </span>
                </button>
              </div>
            )}

            {/* TAB 2: BOTS AUTONOMES (ENTRAÎNEMENT & AUTO-SOIN) */}
            {activeTab === 'bot' && (
              <div className="space-y-4">
                {/* SECTION A: BOT SOIN (CENTRE POKÉMON / MODULE 2) */}
                {onToggleAutoHeal && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-[#0d131f] border border-cyan-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isHealRunning
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse'
                              : 'bg-white/[0.05] text-cyan-400 border border-white/[0.08]'
                          }`}
                        >
                          <HeartPulse className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Bot Soin (Centre Pokémon)</span>
                          </h4>
                          <p className="text-[10px] text-cyan-300/80">Navigation A* & Soin complet</p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isHealRunning
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isHealRunning ? 'En cours' : 'Prêt'}
                      </span>
                    </div>

                    {/* Live Progress Info Box */}
                    {isHealRunning && healProgress && (
                      <div className="p-2 rounded-lg bg-black/40 border border-cyan-500/20 text-[11px] text-cyan-200">
                        <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                          <Compass className="w-3.5 h-3.5 animate-spin" />
                          <span>{healProgress.stepMessage || 'Navigation vers le Centre Pokémon...'}</span>
                        </div>
                        {healProgress.distance > 0 && (
                          <span className="text-[10px] text-cyan-400/80 mt-0.5 block">
                            Distance : ~{healProgress.distance} pas
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        onToggleAutoHeal();
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        isHealRunning
                          ? 'bg-rose-600 hover:bg-rose-500 text-white font-extrabold'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black'
                      }`}
                    >
                      {isHealRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Arrêter le Bot Soin</span>
                        </>
                      ) : (
                        <>
                          <HeartPulse className="w-3.5 h-3.5" />
                          <span>Lancer le Bot Soin (Aller / Soin / Retour)</span>
                        </>
                      )}
                    </button>
                    <p className="text-[9.5px] text-zinc-400 text-center leading-tight">
                      Rejoint le Centre Pokémon le plus proche, soigne l'équipe auprès de l'Infirmière Joëlle et revient à votre position.
                    </p>
                  </div>
                )}

                {/* SECTION B: BOT D'ENTRAÎNEMENT & COMBAT (FARMING XP) */}
                {onToggleBot && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-[#0d1912] border border-emerald-500/25 space-y-2.5">
                    {/* Status Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isBotRunning
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                              : 'bg-white/[0.05] text-emerald-400 border border-white/[0.08]'
                          }`}
                        >
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Bot d'Entraînement</h4>
                          <p className="text-[10px] text-zinc-400">Combat automatique & XP</p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBotRunning
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isBotRunning ? 'Actif' : 'Inactif'}
                      </span>
                    </div>

                    {/* Primary Action Button */}
                    <button
                      onClick={() => {
                        const willStart = !isBotRunning;
                        onToggleBot?.();
                        if (willStart) {
                          setIsMenuOpen(false);
                        }
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        isBotRunning
                          ? 'bg-rose-600 hover:bg-rose-500 text-white font-extrabold'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black'
                      }`}
                    >
                      {isBotRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Arrêter le Bot d'Entraînement</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Lancer le Bot d'Entraînement (XP)</span>
                        </>
                      )}
                    </button>

                    {/* Mode Selector */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Mode de Combat
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          {
                            id: 'continuous_battle' as TrainerBotMode,
                            label: 'Combat continu (Farming)',
                            desc: 'Attaque en boucle jusqu’au K.O.'
                          },
                          {
                            id: 'train_slot_1' as TrainerBotMode,
                            label: 'Entraînement Pokémon 1 (Switch)',
                            desc: 'Envoie le Slot 1 puis switch vers le dernier'
                          }
                        ].map((mode) => {
                          const isSelected = botMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              onClick={() => onBotModeChange?.(mode.id)}
                              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                                  : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-[11px] font-semibold ${isSelected ? 'text-emerald-300 font-bold' : 'text-zinc-300'}`}>
                                  {mode.label}
                                </span>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                              </div>
                              <p className="text-[9.5px] text-zinc-400">{mode.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Target Level Config for Slot 1 Training Mode */}
                    {botMode === 'train_slot_1' && (
                      <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/30 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            Niveau Max 1er Pokémon
                          </span>
                          <span className="text-xs font-mono font-black text-amber-400 px-2 py-0.5 rounded bg-black/50 border border-amber-500/30">
                            Niv. {targetLevel}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onTargetLevelChange?.(Math.max(1, targetLevel - 5))}
                            className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
                            title="-5 Niveaux"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => onTargetLevelChange?.(Math.max(1, targetLevel - 1))}
                            className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
                            title="-1 Niveau"
                          >
                            -1
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={targetLevel}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                onTargetLevelChange?.(Math.min(100, Math.max(1, val)));
                              }
                            }}
                            className="w-full text-center py-1 px-2 rounded-lg bg-black/60 border border-violet-500/40 text-xs font-bold font-mono text-white focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => onTargetLevelChange?.(Math.min(100, targetLevel + 1))}
                            className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
                            title="+1 Niveau"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => onTargetLevelChange?.(Math.min(100, targetLevel + 5))}
                            className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
                            title="+5 Niveaux"
                          >
                            +5
                          </button>
                        </div>

                        {/* Quick Level Presets */}
                        <div className="flex items-center gap-1 pt-0.5">
                          {[15, 30, 50, 75, 100].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => onTargetLevelChange?.(lvl)}
                              className={`flex-1 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                                targetLevel === lvl
                                  ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                                  : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>

                        <p className="text-[9.5px] text-zinc-400 leading-tight">
                          Au retour dans l'overworld : si Slot 1 &ge; Niv. {targetLevel}, switch automatique avec le 1er Pokémon &lt; Niv. {targetLevel}. Arrêt si tous &ge; Niv. {targetLevel}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OPTIONS & CONTRÔLES */}
            {activeTab === 'controls' && (
              <div className="space-y-3.5">
                {/* Emulation Speed Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-400 uppercase tracking-wider">
                      Vitesse d'Émulation
                    </span>
                    <span className="font-mono font-bold text-amber-400">{speed}x</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-xl border border-white/[0.04]">
                    {speedOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => onSpeedChange(s)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                          speed === s
                            ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Volume */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-400 uppercase tracking-wider">
                      Volume Audio
                    </span>
                    <span className="font-mono font-bold text-violet-400">
                      {isMuted ? 'Muet' : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2.5">
                    <button
                      onClick={onToggleMute}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                      title={isMuted ? 'Rétablir le son' : 'Couper le son'}
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
                      className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Playback Controls & Utility Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onPlayPause}
                    disabled={!hasRom}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !hasRom
                        ? 'opacity-30 cursor-not-allowed bg-white/[0.02] border-white/[0.05]'
                        : isPaused
                        ? 'bg-amber-400 text-zinc-950 border-amber-300 font-extrabold shadow-sm'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06] text-zinc-200'
                    }`}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{isPaused ? 'Reprendre' : 'Mettre en Pause'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onReset();
                      setIsMenuOpen(false);
                    }}
                    disabled={!hasRom}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06] text-zinc-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-30 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redémarrer</span>
                  </button>
                </div>

                {/* Screenshots & Fullscreen & Settings Button */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onScreenshot();
                    }}
                    disabled={!hasRom}
                    className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-300 hover:text-white text-[11px] font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-30 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Capture</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleFullscreen();
                    }}
                    className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-300 hover:text-white text-[11px] font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{isFullscreen ? 'Fenêtré' : 'Plein Écran'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-300 hover:text-white text-[11px] font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Settings className="w-3.5 h-3.5 text-violet-400" />
                    <span>Paramètres</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer with quick gamepad notice or close button */}
          <div className="px-4 py-2.5 border-t border-white/[0.06] bg-[#08090f] flex items-center justify-between">
            {gamepadConnected ? (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <Gamepad2 className="w-3 h-3" />
                Manette connectée
              </span>
            ) : (
              <span className="text-[10px] text-zinc-400">Émulateur prêt</span>
            )}

            <button
              onClick={() => setIsMenuOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-semibold transition-colors cursor-pointer ml-auto"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
