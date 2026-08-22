import React, { useState, useEffect, useRef } from 'react';
import { SaveStateData } from '../emulator/types';
import { StorageService } from '../services/storage';
import { GameBoy } from '../emulator/gameboy';
import { Save, Play, Trash2, Clock, X, Sparkles, FolderDown, FolderUp, ChevronDown } from 'lucide-react';

interface SaveStateModalProps {
  isOpen: boolean;
  onClose: () => void;
  emulator: GameBoy | null;
  currentRomId: string | null;
  currentRomTitle: string | null;
  onNotify: (msg: string) => void;
}

export function SaveStateModal({
  isOpen,
  onClose,
  emulator,
  currentRomId,
  currentRomTitle,
  onNotify
}: SaveStateModalProps) {
  const [slots, setSlots] = useState<{ slot: number; state: SaveStateData | null }[]>([
    { slot: 0, state: null },
    { slot: 1, state: null },
    { slot: 2, state: null }
  ]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savInputRef = useRef<HTMLInputElement | null>(null);

  const loadSlotsData = async () => {
    if (!currentRomId) return;
    const savedStates = await StorageService.getSaveStates(currentRomId);
    const initial = [0, 1, 2].map((slotNum) => {
      const match = savedStates.find((s) => s.slot === slotNum);
      return { slot: slotNum, state: match ? match.state : null };
    });
    setSlots(initial);
  };

  useEffect(() => {
    if (isOpen && currentRomId) {
      loadSlotsData();
    }
  }, [isOpen, currentRomId]);

  if (!isOpen) return null;

  const handleSaveState = async (slotNum: number) => {
    if (!emulator || !currentRomId) return;
    const captureFn = (window as unknown as { __gbcCaptureScreenshot?: () => string }).__gbcCaptureScreenshot;
    const screenshot = captureFn ? captureFn() : '';

    const state = emulator.createSaveState(screenshot);
    if (!state) return;

    await StorageService.saveSaveState(currentRomId, slotNum, state);
    await loadSlotsData();
    const label = slotNum === 0 ? 'Sauvegarde rapide' : `Emplacement ${slotNum}`;
    onNotify(`✨ ${label} enregistrée !`);
  };

  const handleLoadState = (state: SaveStateData, slotNum: number) => {
    if (!emulator) return;
    const success = emulator.loadSaveState(state);
    if (success) {
      const label = slotNum === 0 ? 'Sauvegarde rapide' : `Emplacement ${slotNum}`;
      onNotify(`▶️ ${label} chargée !`);
      onClose();
    }
  };

  const handleDeleteState = async (slotNum: number) => {
    if (!currentRomId) return;
    await StorageService.deleteSaveState(currentRomId, slotNum);
    await loadSlotsData();
    onNotify('🗑️ Sauvegarde supprimée');
  };

  // Export Save State
  const handleExportState = (state: SaveStateData, slotNum: number) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${currentRomTitle || 'game'}_save_${slotNum}.state`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Import State from File
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !emulator) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const state: SaveStateData = JSON.parse(event.target?.result as string);
        if (state && state.cpu && state.mmu) {
          emulator.loadSaveState(state);
          if (currentRomId) {
            await StorageService.saveSaveState(currentRomId, 0, state);
            await loadSlotsData();
          }
          onNotify('📥 Sauvegarde importée avec succès !');
          onClose();
        }
      } catch {
        alert('Fichier de sauvegarde invalide.');
      }
    };
    reader.readAsText(file);
  };

  // Export native battery SRAM (.sav)
  const handleExportSram = () => {
    if (!emulator) return;
    const sram = emulator.getBatterySave();
    if (!sram) {
      alert('Aucune sauvegarde interne disponible pour ce jeu.');
      return;
    }
    const blob = new Blob([sram], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentRomTitle || 'game'}.sav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onNotify('💾 Fichier .sav téléchargé');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#0d0f17] border border-white/[0.1] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#08090e]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Sauvegardes</h2>
              <p className="text-[11px] text-zinc-400">Enregistrez ou reprenez votre partie à tout moment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slots List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {slots.map(({ slot, state }) => {
            const isQuick = slot === 0;
            const title = isQuick ? 'Sauvegarde Rapide' : `Emplacement ${slot}`;

            return (
              <div
                key={slot}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  state
                    ? 'bg-white/[0.03] border-violet-500/30 hover:border-violet-500/50 shadow-sm'
                    : 'bg-white/[0.015] border-white/[0.06]'
                }`}
              >
                {/* Left: Thumbnail & Info (Ample Room) */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-black border border-white/[0.08] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                    {state?.screenshot ? (
                      <img src={state.screenshot} alt={title} className="w-full h-full object-contain" />
                    ) : (
                      <Save className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold truncate ${isQuick ? 'text-violet-300' : 'text-zinc-200'}`}>
                      {title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-1">
                      {state ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                          <span className="truncate">
                            {new Date(state.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' })} à {new Date(state.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-500">Emplacement vide</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Actions stacked vertically */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col gap-1.5 w-28">
                    <button
                      type="button"
                      onClick={() => handleSaveState(slot)}
                      className="w-full py-1.5 px-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Sauvegarder</span>
                    </button>

                    {state && (
                      <button
                        type="button"
                        onClick={() => handleLoadState(state, slot)}
                        className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Charger</span>
                      </button>
                    )}
                  </div>

                  {state && (
                    <button
                      type="button"
                      onClick={() => handleDeleteState(slot)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer flex-shrink-0"
                      title="Supprimer la sauvegarde"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible Advanced Options (Export / Import) */}
        <div className="border-t border-white/[0.07] bg-[#08090e] px-4 py-2.5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
          >
            <span>Options d'export / import de fichiers</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="pt-2.5 pb-1 flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[11px] border border-white/[0.08] flex items-center gap-1.5 cursor-pointer"
              >
                <FolderUp className="w-3 h-3 text-violet-400" />
                Importer fichier .state
              </button>
              <button
                type="button"
                onClick={handleExportSram}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[11px] border border-white/[0.08] flex items-center gap-1.5 cursor-pointer"
              >
                <FolderDown className="w-3 h-3 text-emerald-400" />
                Exporter sauvegarde cartouche (.sav)
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".state,.json"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
