import React, { useState } from 'react';
import { AppSettings, DEFAULT_KEY_BINDINGS } from '../services/storage';
import { AppTheme, VideoFilter, HandMode, DpadType, RomItem } from '../emulator/types';
import { APP_THEMES } from '../utils/theme';
import { getRomPatchInfo } from '../utils/ipsPatcher';
import {
  Settings,
  Palette,
  Tv,
  Smartphone,
  Keyboard,
  Check,
  RotateCcw,
  X,
  Gamepad2,
  Sparkles,
  Move
} from 'lucide-react';

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

type SettingsTab = 'theme' | 'video' | 'touch' | 'keyboard';

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
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHandMode: HandMode = settings.touchConfig.handMode || 'right';
  const currentDpadType: DpadType = settings.touchConfig.dpadType || 'dpad-8way';

  const handleSetHandMode = (mode: HandMode) => {
    if (mode === 'sides') {
      onUpdateSettings({
        ...settings,
        touchConfig: {
          ...settings.touchConfig,
          handMode: 'sides',
          dpadPos: { x: 18, y: 78 },
          actionPos: { x: 82, y: 78 }
        }
      });
    } else if (mode === 'right') {
      onUpdateSettings({
        ...settings,
        touchConfig: {
          ...settings.touchConfig,
          handMode: 'right',
          dpadPos: { x: 50, y: 78 },
          actionPos: { x: 82, y: 78 }
        }
      });
    } else {
      onUpdateSettings({
        ...settings,
        touchConfig: {
          ...settings.touchConfig,
          handMode: 'left',
          dpadPos: { x: 18, y: 78 },
          actionPos: { x: 50, y: 78 }
        }
      });
    }
  };

  const videoFilters: { id: VideoFilter; label: string; desc: string; tag: string }[] = [
    { id: 'lcd-grid', label: 'Grille LCD Originale', desc: 'Rendu sub-pixel fidèle à l\'écran GBC', tag: 'Authentique' },
    { id: 'clean', label: 'Pixels Nets (Pixel-Perfect)', desc: 'Rendu brut sans aucun flou ni lissage', tag: 'Net' },
    { id: 'gbc-color', label: 'Couleurs Éclatantes', desc: 'Contraste et saturation renforcés', tag: 'Vibrant' },
    { id: 'dmg-green', label: 'Vert DMG Rétro', desc: 'Teinte olive monochrome Game Boy 1989', tag: 'DMG' },
    { id: 'crt-scanlines', label: 'Scanlines CRT', desc: 'Simulation d\'écran cathodique rétro', tag: 'Téléviseur' },
    { id: 'smooth', label: 'Lissage Bilinéaire', desc: 'Arêtes adoucies pour un rendu fluide', tag: 'Lisse' }
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

  const patchInfo = getRomPatchInfo(
    currentRom || (currentRomTitle ? { title: currentRomTitle, name: currentRomTitle } : null)
  );
  const hasActiveGame = !!(currentRom || currentRomTitle);

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'theme', label: 'Thèmes', icon: Palette },
    { id: 'video', label: 'Écran & Filtres', icon: Tv },
    { id: 'touch', label: 'Tactile', icon: Smartphone },
    { id: 'keyboard', label: 'Clavier & Manette', icon: Keyboard }
  ];

  const keyBindingGroups = [
    {
      title: 'Direction',
      items: [
        { key: 'up', label: 'Haut' },
        { key: 'down', label: 'Bas' },
        { key: 'left', label: 'Gauche' },
        { key: 'right', label: 'Droite' }
      ]
    },
    {
      title: 'Boutons Game Boy',
      items: [
        { key: 'a', label: 'Bouton A (Action)' },
        { key: 'b', label: 'Bouton B (Retour)' },
        { key: 'start', label: 'Start' },
        { key: 'select', label: 'Select' },
        { key: 'turboA', label: 'Turbo A' },
        { key: 'turboB', label: 'Turbo B' }
      ]
    },
    {
      title: 'Raccourcis Système',
      items: [
        { key: 'fastForward', label: 'Avance Rapide' },
        { key: 'pause', label: 'Pause' },
        { key: 'quickSave', label: 'Sauvegarde Rapide' },
        { key: 'quickLoad', label: 'Chargement Rapide' }
      ]
    }
  ];

  const formatKeyName = (keyName: string) => {
    return keyName
      .replace('Key', '')
      .replace('Digit', '')
      .replace('ArrowUp', '↑ Haut')
      .replace('ArrowDown', '↓ Bas')
      .replace('ArrowLeft', '← Gauche')
      .replace('ArrowRight', '→ Droite')
      .replace('Space', 'Espace')
      .replace('Enter', 'Entrée')
      .replace('ShiftLeft', 'Shift G')
      .replace('ShiftRight', 'Shift D')
      .replace('ControlLeft', 'Ctrl G')
      .replace('ControlRight', 'Ctrl D')
      .replace('AltLeft', 'Alt G')
      .replace('AltRight', 'Alt D');
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="settings-modal-container"
        className="relative w-full max-w-2xl bg-[#0c0d14] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between bg-[#08090f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Paramètres</h2>
              <p className="text-[11px] text-zinc-400">Préférences d'affichage, commandes et touches</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveGame && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] max-w-[220px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-zinc-300 font-medium truncate">{patchInfo.baseTitle}</span>
                {patchInfo.isPatched && (
                  <span title="Patch actif" className="flex items-center">
                    <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                  </span>
                )}
              </div>
            )}
            <button
              id="settings-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="p-2 border-b border-white/[0.06] bg-[#090a11]">
          <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-xl border border-white/[0.04]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: THÈMES */}
          {activeTab === 'theme' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Thème Visuel</h3>
                  <p className="text-[11px] text-zinc-400">Sélectionnez la palette de couleurs de l'interface</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {APP_THEMES.map((th) => {
                  const isSelected = settings.shellColor === th.id;
                  return (
                    <button
                      key={th.id}
                      id={`theme-select-${th.id}`}
                      onClick={() => onUpdateSettings({ ...settings, shellColor: th.id })}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-violet-950/40 border-violet-500/70 shadow-sm'
                          : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-lg border shadow-sm shrink-0 ${th.previewColor}`} />
                        <div className="min-w-0">
                          <span className={`text-xs font-semibold block truncate ${isSelected ? 'text-white font-bold' : 'text-zinc-300'}`}>
                            {th.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 block truncate">{th.subtitle}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-violet-400 shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VIDÉO & FILTRES */}
          {activeTab === 'video' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Filtre d'Affichage Écran</h3>
                <p className="text-[11px] text-zinc-400">Choisissez le rendu visuel et le style des pixels</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {videoFilters.map((vf) => {
                  const isSelected = settings.videoFilter === vf.id;
                  return (
                    <button
                      key={vf.id}
                      id={`filter-select-${vf.id}`}
                      onClick={() => onUpdateSettings({ ...settings, videoFilter: vf.id })}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-violet-950/40 border-violet-500/70 shadow-sm'
                          : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-xs font-semibold ${isSelected ? 'text-white font-bold' : 'text-zinc-200'}`}>
                            {vf.label}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-400 font-medium">
                            {vf.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-1">{vf.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-violet-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: COMMANDES TACTILES */}
          {activeTab === 'touch' && (
            <div className="space-y-4">
              {/* Type de D-Pad */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white uppercase tracking-wider block">
                  Contrôle Directionnel
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/[0.04]">
                  {[
                    { id: 'dpad-4way' as DpadType, label: '4 Directions', desc: 'Précis (RPG)' },
                    { id: 'dpad-8way' as DpadType, label: '8 Directions', desc: 'Diagonales' },
                    { id: 'dynamic-joystick' as DpadType, label: 'Joystick', desc: 'Suivi tactile' }
                  ].map((item) => {
                    const isSelected = currentDpadType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            touchConfig: { ...settings.touchConfig, dpadType: item.id }
                          })
                        }
                        className={`py-2 px-1.5 rounded-lg text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-sm font-bold'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="text-xs block font-semibold">{item.label}</span>
                        <span className="text-[10px] block opacity-75">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Disposition de la main */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white uppercase tracking-wider block">
                  Prise en Main
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/[0.04]">
                  {[
                    { id: 'sides' as HandMode, label: 'Deux Côtés', desc: 'Gamepad G / Boutons D' },
                    { id: 'right' as HandMode, label: 'Droitier', desc: 'Gamepad C / Boutons D' },
                    { id: 'left' as HandMode, label: 'Gaucher', desc: 'Gamepad G / Boutons C' }
                  ].map((item) => {
                    const isSelected = currentHandMode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSetHandMode(item.id)}
                        className={`py-2 px-1.5 rounded-lg text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-sm font-bold'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="text-xs block font-semibold">{item.label}</span>
                        <span className="text-[10px] block opacity-75">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles Compacts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-semibold text-zinc-200 block">Afficher touches</span>
                    <span className="text-[10px] text-zinc-400 block">Sur l'écran</span>
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
                    className="w-4 h-4 accent-violet-600 rounded cursor-pointer shrink-0"
                  />
                </label>

                <label className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-semibold text-zinc-200 block">Vibrations</span>
                    <span className="text-[10px] text-zinc-400 block">Retour haptique</span>
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
                    className="w-4 h-4 accent-violet-600 rounded cursor-pointer shrink-0"
                  />
                </label>

                <label className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-semibold text-zinc-200 block">Boutons Turbo</span>
                    <span className="text-[10px] text-zinc-400 block">Tir rapide TA/TB</span>
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
                    className="w-4 h-4 accent-violet-600 rounded cursor-pointer shrink-0"
                  />
                </label>
              </div>

              {/* Sliders: Taille & Opacité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Taille des boutons</span>
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
                    className="w-full accent-violet-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Transparence</span>
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
                    className="w-full accent-violet-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Bouton Repositionnement Manuel */}
              <button
                id="touch-customize-pos-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onStartCustomizingTouch();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Move className="w-3.5 h-3.5" />
                Déplacer les boutons librement sur l'écran (Glisser-Déposer)
              </button>
            </div>
          )}

          {/* TAB 4: CLAVIER & MANETTE */}
          {activeTab === 'keyboard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Affectation des Touches</h3>
                  <p className="text-[11px] text-zinc-400">Cliquez sur une touche pour la modifier</p>
                </div>
                <button
                  type="button"
                  onClick={resetKeys}
                  className="px-2.5 py-1 rounded-lg border border-white/[0.08] text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.05] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Réinitialiser
                </button>
              </div>

              <div className="space-y-3">
                {keyBindingGroups.map((group) => (
                  <div key={group.title} className="space-y-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {group.title}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const currentBind =
                          settings.keyBindings[item.key as keyof typeof settings.keyBindings]?.[0] || 'Non assigné';
                        const isRecording = recordingKey === item.key;

                        return (
                          <div
                            key={item.key}
                            className="p-2 px-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between"
                          >
                            <span className="text-xs text-zinc-300 font-medium truncate pr-2">{item.label}</span>
                            <button
                              type="button"
                              onClick={() => handleKeyRecord(item.key)}
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                                isRecording
                                  ? 'bg-amber-400 text-black animate-pulse font-extrabold'
                                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08]'
                              }`}
                            >
                              {isRecording ? 'Appuyez...' : formatKeyName(currentBind)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Gamepad info note */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
                <Gamepad2 className="w-4 h-4 text-violet-400 shrink-0" />
                <p className="text-[11px] text-zinc-400">
                  <strong className="text-zinc-200">Manettes USB & Bluetooth :</strong> Les manettes Xbox, PlayStation, Switch Pro et 8BitDo sont reconnues automatiquement dès la connexion.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-[#08090f] flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            Modifications appliquées instantanément
          </span>
          <button
            id="settings-save-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer ml-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
