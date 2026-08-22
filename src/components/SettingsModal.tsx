import React, { useState } from 'react';
import { AppSettings, DEFAULT_KEY_BINDINGS } from '../services/storage';
import { AppTheme, VideoFilter, HandMode, DpadType, RomItem } from '../emulator/types';
import { APP_THEMES } from '../utils/theme';
import { getRomPatchInfo } from '../utils/ipsPatcher';
import { Settings, Palette, Tv, Sliders, Keyboard, Vibrate, Check, RotateCcw, X, Gamepad2, Compass, Disc, Sparkles, Wand2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onStartCustomizingTouch: () => void;
  currentRom?: RomItem | null;
  currentRomTitle?: string | null;
  onOpenRomLibrary?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onStartCustomizingTouch,
  currentRom,
  currentRomTitle,
  onOpenRomLibrary
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'theme' | 'touch' | 'keyboard' | 'video'>('theme');
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHandMode: HandMode = settings.touchConfig.handMode || 'right';

  const handleSetHandMode = (mode: HandMode) => {
    if (mode === 'sides') {
      onUpdateSettings({
        ...settings,
        touchConfig: {
          ...settings.touchConfig,
          handMode: 'sides',
          dpadPos: { x: 18, y: 78 }, // Left D-Pad
          actionPos: { x: 82, y: 78 } // Right Action buttons
        }
      });
    } else if (mode === 'right') {
      onUpdateSettings({
        ...settings,
        touchConfig: {
          ...settings.touchConfig,
          handMode: 'right',
          dpadPos: { x: 50, y: 78 }, // Center D-Pad
          actionPos: { x: 82, y: 78 } // Right Action buttons
        }
      });
    } else {
      onUpdateSettings({
        ...settings,
        touchConfig: {
          ...settings.touchConfig,
          handMode: 'left',
          dpadPos: { x: 18, y: 78 }, // Left D-Pad
          actionPos: { x: 50, y: 78 } // Center Action buttons
        }
      });
    }
  };

  const videoFilters: { id: VideoFilter; label: string; desc: string }[] = [
    { id: 'lcd-grid', label: 'Matrice LCD Originale', desc: 'Grille de pixels sub-pixel comme sur le véritable écran GBC' },
    { id: 'clean', label: 'Pixels Numériques Nets', desc: 'Rendu brut sans filtre avec mise à l\'échelle entière' },
    { id: 'gbc-color', label: 'Couleurs Éclatantes GBC', desc: 'Correction des couleurs avec saturation et contraste accrus' },
    { id: 'dmg-green', label: 'Monochrome Vert Rétro DMG', desc: 'Palette vert olive de la Game Boy originale' },
    { id: 'crt-scanlines', label: 'Lignes CRT Scanlines', desc: 'Effet télévision cathodique rétro' },
    { id: 'smooth', label: 'Lissage Bilinéaire', desc: 'Adoucit les arêtes des pixels' }
  ];

  const handleKeyRecord = (actionKey: string) => {
    setRecordingKey(actionKey);
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newBindings = { ...settings.keyBindings, [actionKey]: [e.code] };
      onUpdateSettings({ ...settings, keyBindings: newBindings });
      setRecordingKey(null);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true, once: true });
  };

  const resetKeys = () => {
    onUpdateSettings({ ...settings, keyBindings: DEFAULT_KEY_BINDINGS });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f111a] border border-white/[0.1] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between bg-[#090a10]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.15)]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">Paramètres de l'Émulateur</h2>
              <p className="text-xs text-zinc-400">Thème visuel, ergonomie des commandes, filtres vidéo et touches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Loaded ROM Info Banner */}
        {(() => {
          const patchInfo = getRomPatchInfo(currentRom || (currentRomTitle ? { title: currentRomTitle, name: currentRomTitle } : null));
          const hasActiveGame = !!(currentRom || currentRomTitle);

          return (
            <div className="px-6 pt-4 pb-1 bg-[#090a10]/40">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      hasActiveGame
                        ? patchInfo.isPatched
                          ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                          : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {patchInfo.isPatched ? (
                      <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                    ) : (
                      <Gamepad2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        ROM Actuellement Chargée
                      </span>
                      {hasActiveGame ? (
                        <>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                            Active
                          </span>
                          {patchInfo.isPatched && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-violet-500/25 text-violet-200 border border-violet-500/40 shadow-sm">
                              <Wand2 className="w-3 h-3 text-violet-300" />
                              {patchInfo.patchLabel || 'Patch IPS Actif'}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                          En attente
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-extrabold text-white truncate max-w-[280px] sm:max-w-[360px] mt-0.5">
                      {hasActiveGame ? patchInfo.baseTitle : 'Aucune ROM chargée (Émulateur au repos)'}
                    </p>
                    {hasActiveGame && patchInfo.isPatched && (
                      <p className="text-[10px] font-semibold text-violet-300 flex items-center gap-1 truncate mt-0.5">
                        <span>✨ Modification :</span>
                        <span className="text-zinc-200 font-bold">{patchInfo.patchLabel || 'Patch IPS appliqué'}</span>
                      </p>
                    )}
                  </div>
                </div>

                {onOpenRomLibrary && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenRomLibrary();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold shrink-0 transition-all cursor-pointer hover:border-violet-500/50"
                  >
                    Bibliothèque
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.08] bg-[#090a10]/50 px-4 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('theme')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'theme'
                ? 'border-violet-500 text-violet-400 shadow-[0_2px_10px_rgba(139,92,246,0.3)]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            Thème de l'App
          </button>
          <button
            onClick={() => setActiveTab('touch')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'touch'
                ? 'border-violet-500 text-violet-400 shadow-[0_2px_10px_rgba(139,92,246,0.3)]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Commandes Tactiles
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'video'
                ? 'border-violet-500 text-violet-400 shadow-[0_2px_10px_rgba(139,92,246,0.3)]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            Filtres Vidéo
          </button>
          <button
            onClick={() => setActiveTab('keyboard')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'keyboard'
                ? 'border-violet-500 text-violet-400 shadow-[0_2px_10px_rgba(139,92,246,0.3)]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Clavier & Manette
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: APP THEMES */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Thèmes Visuels de l'Application</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Personnalisez l'ambiance lumineuse, les gradients et les accents de couleur</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {APP_THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => onUpdateSettings({ ...settings, shellColor: th.id })}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      settings.shellColor === th.id
                        ? 'bg-violet-950/40 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl border-2 shadow-md flex-shrink-0 ${th.previewColor}`} />
                      <div>
                        <span className="text-xs font-bold text-zinc-200 block">{th.name}</span>
                        <span className="text-[10px] text-zinc-400 line-clamp-1">{th.subtitle}</span>
                      </div>
                    </div>
                    {settings.shellColor === th.id && <Check className="w-4 h-4 text-violet-400 flex-shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TOUCH CONTROLS */}
          {activeTab === 'touch' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white">Ergonomie & Disposition des Commandes</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Basculez entre mode droitier, mode gaucher ou ajustez librement</p>
              </div>

              {/* Type de D-Pad / Joystick (4-dir, 8-dir, Joystick tactile dynamique) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">Type de contrôle directionnel :</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mode 4 Directions */}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        touchConfig: {
                          ...settings.touchConfig,
                          dpadType: 'dpad-4way'
                        }
                      })
                    }
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      (settings.touchConfig.dpadType || 'dpad-8way') === 'dpad-4way'
                        ? 'bg-violet-950/50 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-violet-500'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center font-black text-[11px]">
                          +4
                        </div>
                        <h4 className="text-xs font-bold text-white">4 Directions</h4>
                      </div>
                      {(settings.touchConfig.dpadType || 'dpad-8way') === 'dpad-4way' && <Check className="w-4 h-4 text-violet-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Croix stricte (Haut/Bas/Gauche/Droite) sans diagonales accidentelles (idéal Pokémon, Tetris)
                    </p>
                  </button>

                  {/* Mode 8 Directions */}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        touchConfig: {
                          ...settings.touchConfig,
                          dpadType: 'dpad-8way'
                        }
                      })
                    }
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      (settings.touchConfig.dpadType || 'dpad-8way') === 'dpad-8way'
                        ? 'bg-violet-950/50 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-violet-500'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center font-black text-[11px]">
                          *8
                        </div>
                        <h4 className="text-xs font-bold text-white">8 Directions</h4>
                      </div>
                      {(settings.touchConfig.dpadType || 'dpad-8way') === 'dpad-8way' && <Check className="w-4 h-4 text-violet-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Gamepad avec support fluide des diagonales (idéal Zelda, Mario, Action)
                    </p>
                  </button>

                  {/* Mode Joystick Tactile Dynamique */}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        touchConfig: {
                          ...settings.touchConfig,
                          dpadType: 'dynamic-joystick'
                        }
                      })
                    }
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      settings.touchConfig.dpadType === 'dynamic-joystick'
                        ? 'bg-violet-950/50 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-violet-500'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center font-black text-[11px]">
                          <Disc className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-white">Joystick Suivi</h4>
                      </div>
                      {settings.touchConfig.dpadType === 'dynamic-joystick' && <Check className="w-4 h-4 text-violet-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Joystick non-fixe qui apparaît et tracke directement là où votre pouce touche l'écran
                    </p>
                  </button>
                </div>
              </div>

              {/* Hand Grip Mode (Deux Côtés / Droitier / Gaucher) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">Disposition de la main :</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mode Deux Côtés */}
                  <button
                    type="button"
                    onClick={() => handleSetHandMode('sides')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      currentHandMode === 'sides'
                        ? 'bg-violet-950/50 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-violet-500'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center font-black text-[10px]">
                          LR
                        </div>
                        <h4 className="text-xs font-bold text-white">Deux Côtés</h4>
                      </div>
                      {currentHandMode === 'sides' && <Check className="w-4 h-4 text-violet-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      <strong className="text-violet-300">Gamepad à gauche</strong> & boutons A/B à droite
                    </p>
                  </button>

                  {/* Mode Droitier */}
                  <button
                    type="button"
                    onClick={() => handleSetHandMode('right')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      currentHandMode === 'right'
                        ? 'bg-violet-950/50 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-violet-500'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center font-black text-[11px]">
                          R
                        </div>
                        <h4 className="text-xs font-bold text-white">Droitier</h4>
                      </div>
                      {currentHandMode === 'right' && <Check className="w-4 h-4 text-violet-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      <strong className="text-violet-300">Gamepad au centre</strong> & boutons A/B à droite
                    </p>
                  </button>

                  {/* Mode Gaucher */}
                  <button
                    type="button"
                    onClick={() => handleSetHandMode('left')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      currentHandMode === 'left'
                        ? 'bg-violet-950/50 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-violet-500'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center font-black text-[11px]">
                          L
                        </div>
                        <h4 className="text-xs font-bold text-white">Gaucher</h4>
                      </div>
                      {currentHandMode === 'left' && <Check className="w-4 h-4 text-violet-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      <strong className="text-violet-300">Gamepad à gauche</strong> & boutons A/B au centre
                    </p>
                  </button>
                </div>
              </div>

              {/* Toggle Enable Touch Overlay */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07]">
                <div>
                  <span className="text-xs font-bold text-zinc-200">Afficher les commandes tactiles à l'écran</span>
                  <p className="text-[11px] text-zinc-400">Superpose la croix directionnelle et les boutons d'action</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.touchConfig.enabled}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      touchConfig: { ...settings.touchConfig, enabled: e.target.checked }
                    })
                  }
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* Vibration Haptic Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07]">
                <div className="flex items-center gap-2.5">
                  <Vibrate className="w-4 h-4 text-violet-400" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Retour haptique (Vibration tactile)</span>
                    <p className="text-[11px] text-zinc-400">Micro-vibrations physiques à chaque appui sur écran tactile</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.touchConfig.haptics}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      touchConfig: { ...settings.touchConfig, haptics: e.target.checked }
                    })
                  }
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* Show Turbo Buttons Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07]">
                <div>
                  <span className="text-xs font-bold text-zinc-200">Boutons Turbo (TA / TB)</span>
                  <p className="text-[11px] text-zinc-400">Ajoute deux boutons dédiés au tir rapide continu</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.touchConfig.showTurboButtons}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      touchConfig: { ...settings.touchConfig, showTurboButtons: e.target.checked }
                    })
                  }
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* Scale Slider */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">Taille des boutons tactiles :</span>
                  <span className="font-mono font-bold text-violet-400">{Math.round(settings.touchConfig.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  value={settings.touchConfig.scale}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      touchConfig: { ...settings.touchConfig, scale: parseFloat(e.target.value) }
                    })
                  }
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Opacity Slider */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">Opacité des boutons tactiles :</span>
                  <span className="font-mono font-bold text-violet-400">{Math.round(settings.touchConfig.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={settings.touchConfig.opacity}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      touchConfig: { ...settings.touchConfig, opacity: parseFloat(e.target.value) }
                    })
                  }
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Custom Reposition Button */}
              <button
                onClick={() => {
                  onClose();
                  onStartCustomizingTouch();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-extrabold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sliders className="w-4 h-4" />
                Déplacer manuellement les boutons (Drag & Drop)
              </button>
            </div>
          )}

          {/* TAB 3: VIDEO FILTERS */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Filtres et shaders d'affichage</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Personnalisez le rendu visuel de l'écran</p>
              </div>

              <div className="space-y-2.5">
                {videoFilters.map((vf) => (
                  <button
                    key={vf.id}
                    onClick={() => onUpdateSettings({ ...settings, videoFilter: vf.id })}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      settings.videoFilter === vf.id
                        ? 'bg-violet-950/40 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                        : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{vf.label}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{vf.desc}</p>
                    </div>
                    {settings.videoFilter === vf.id && <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD & GAMEPAD BINDINGS */}
          {activeTab === 'keyboard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Affectation des touches Clavier</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Cliquez sur une touche pour la réassigner</p>
                </div>
                <button
                  type="button"
                  onClick={resetKeys}
                  className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/[0.05] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Rétablir défaut
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'up', label: 'Haut (D-Pad UP)' },
                  { key: 'down', label: 'Bas (D-Pad DOWN)' },
                  { key: 'left', label: 'Gauche (D-Pad LEFT)' },
                  { key: 'right', label: 'Droite (D-Pad RIGHT)' },
                  { key: 'a', label: 'Bouton A (Action/Saut)' },
                  { key: 'b', label: 'Bouton B (Annuler/Attaque)' },
                  { key: 'turboA', label: 'Turbo A (Tir rapide)' },
                  { key: 'turboB', label: 'Turbo B (Tir rapide)' },
                  { key: 'start', label: 'Bouton START' },
                  { key: 'select', label: 'Bouton SELECT' },
                  { key: 'fastForward', label: 'Avance Rapide (Fast-Forward)' },
                  { key: 'quickSave', label: 'Sauvegarde Rapide (Quick Save)' },
                  { key: 'quickLoad', label: 'Chargement Rapide (Quick Load)' },
                  { key: 'pause', label: 'Pause / Reprendre' }
                ].map((item) => {
                  const currentBind = settings.keyBindings[item.key as keyof typeof settings.keyBindings]?.[0] || 'Non assigné';
                  const isRecording = recordingKey === item.key;

                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-zinc-300">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => handleKeyRecord(item.key)}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                          isRecording
                            ? 'bg-amber-500 text-zinc-950 animate-pulse'
                            : 'bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 border border-white/10'
                        }`}
                      >
                        {isRecording ? 'Appuyez...' : currentBind.replace('Key', '').replace('Arrow', 'Flèche ')}
                      </button>
                    </div>
                  );
                })}
                {/* Gamepad support notice */}
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 flex items-center gap-3.5 col-span-1 sm:col-span-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div className="text-xs text-zinc-300">
                    <span className="font-bold text-indigo-300">Manettes USB & Bluetooth supportées :</span>
                    <p className="text-zinc-400 mt-0.5">
                      Xbox, PlayStation DualSense/DualShock, Nintendo Switch Pro et manettes 8BitDo sont reconnues automatiquement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#090a10]/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
          >
            Fermer et Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
