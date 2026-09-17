import React, { useState, useEffect, useRef } from 'react';
import { SaveStateData } from '../emulator/types';
import { StorageService } from '../services/storage';
import { GameBoy } from '../emulator/gameboy';
import {
  Save,
  Play,
  Trash2,
  Clock,
  X,
  Sparkles,
  Download,
  Upload,
  HardDrive,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FolderDown,
  Layers
} from 'lucide-react';

interface SaveStateModalProps {
  isOpen: boolean;
  onClose: () => void;
  emulator: GameBoy | null;
  currentRomId: string | null;
  currentRomTitle: string | null;
  currentRomData?: Uint8Array | null;
  onNotify: (msg: string) => void;
  onReloadRomWithSram?: (sram: Uint8Array) => void;
  initialTab?: 'files' | 'slots';
}

type ModalTab = 'files' | 'slots';

export function SaveStateModal({
  isOpen,
  onClose,
  emulator,
  currentRomId,
  currentRomTitle,
  currentRomData,
  onNotify,
  onReloadRomWithSram,
  initialTab = 'files'
}: SaveStateModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [slots, setSlots] = useState<{ slot: number; state: SaveStateData | null }[]>([
    { slot: 0, state: null },
    { slot: 1, state: null },
    { slot: 2, state: null }
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (isOpen) {
      setActiveTab(initialTab);
      setUploadFeedback(null);
      if (currentRomId) {
        loadSlotsData();
      }
    }
  }, [isOpen, currentRomId, initialTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  };

  // --- 1. CRÉER UN FICHIER DE SAUVEGARDE ---

  // Export 1 : Fichier Cartouche .sav (SRAM de la pile)
  const handleExportSram = () => {
    if (!emulator || !currentRomId) {
      onNotify('⚠️ Aucun jeu actif.');
      return;
    }

    const sram = emulator.getBatterySave();
    if (!sram || sram.length === 0) {
      onNotify('⚠️ Aucune mémoire de sauvegarde cartouche détectée.');
      return;
    }

    const fileName = `${sanitizeFilename(currentRomTitle || 'game')}.sav`;
    const blob = new Blob([sram], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    onNotify(`💾 Fichier de sauvegarde cartouche "${fileName}" créé et téléchargé !`);
  };

  // Export 2 : Instantané complet .state (CPU, RAM, Registres, Screenshot)
  const handleExportStateNow = () => {
    if (!emulator || !currentRomId) {
      onNotify('⚠️ Aucun jeu actif.');
      return;
    }

    const captureFn = (window as unknown as { __gbcCaptureScreenshot?: () => string }).__gbcCaptureScreenshot;
    const screenshot = captureFn ? captureFn() : '';
    const state = emulator.createSaveState(screenshot);

    if (!state) {
      onNotify('❌ Échec de création de l\'instantané d\'état.');
      return;
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${sanitizeFilename(currentRomTitle || 'game')}_${dateStr}.state`;
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    onNotify(`✨ Fichier instantané "${fileName}" créé et téléchargé !`);
  };

  // Export 3 : Exporter un slot d'emplacement existant
  const handleExportSlot = (state: SaveStateData, slotNum: number) => {
    const label = slotNum === 0 ? 'rapide' : `slot${slotNum}`;
    const fileName = `${sanitizeFilename(currentRomTitle || 'game')}_save_${label}.state`;
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    onNotify(`📥 Fichier .state de l'emplacement ${slotNum} téléchargé !`);
  };

  // --- 2. UPLOADER UN FICHIER DE SAUVEGARDE ---

  const handleProcessUploadedFile = async (file: File) => {
    if (!emulator || !currentRomId) {
      setUploadFeedback({ type: 'error', message: 'Aucun jeu actif pour appliquer la sauvegarde.' });
      onNotify('⚠️ Aucun jeu actif');
      return;
    }

    setIsProcessingUpload(true);
    setUploadFeedback(null);

    const fileNameLower = file.name.toLowerCase();
    const isSramExtension = fileNameLower.endsWith('.sav') || fileNameLower.endsWith('.srm');

    // Cas 1 : Fichier .sav / .srm (SRAM binaire)
    if (isSramExtension) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer || buffer.byteLength === 0) {
            setUploadFeedback({ type: 'error', message: 'Le fichier .sav sélectionné est vide.' });
            setIsProcessingUpload(false);
            return;
          }

          const sramData = new Uint8Array(buffer);

          // Sauvegarder dans IndexedDB pour la persistance
          await StorageService.saveSram(currentRomId, sramData);

          // Recharger le jeu avec la nouvelle SRAM pour que le menu Titre charge la sauvegarde
          if (onReloadRomWithSram) {
            onReloadRomWithSram(sramData);
          } else if (currentRomData) {
            emulator.loadROM(currentRomData, sramData);
          } else {
            emulator.loadBatterySave(sramData);
          }

          const sizeKb = (buffer.byteLength / 1024).toFixed(1);
          const successMsg = `Fichier .sav (${sizeKb} Ko) importé ! Partie prête avec vos données.`;
          setUploadFeedback({ type: 'success', message: successMsg });
          onNotify(`💾 ${successMsg}`);
          setIsProcessingUpload(false);
          setTimeout(() => onClose(), 1200);
        } catch (err) {
          console.error('Erreur import .sav:', err);
          setUploadFeedback({ type: 'error', message: 'Erreur lors de la lecture du fichier .sav.' });
          setIsProcessingUpload(false);
        }
      };
      reader.onerror = () => {
        setUploadFeedback({ type: 'error', message: 'Impossible de lire le fichier.' });
        setIsProcessingUpload(false);
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // Cas 2 : Fichier .state / .json (Instantané complet) ou détection automatique
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const state: SaveStateData = JSON.parse(text);

        if (state && state.cpu && state.mmu) {
          const loaded = emulator.loadSaveState(state);
          if (loaded) {
            // Sauvegarder aussi dans le slot 0 pour persistance
            await StorageService.saveSaveState(currentRomId, 0, state);
            await loadSlotsData();
            const successMsg = 'Instantané .state importé et chargé dans le jeu avec succès !';
            setUploadFeedback({ type: 'success', message: successMsg });
            onNotify(`✨ ${successMsg}`);
            setIsProcessingUpload(false);
            setTimeout(() => onClose(), 1200);
            return;
          }
        }
        throw new Error('Structure JSON non conforme à un état Game Boy.');
      } catch {
        // Si le parsing JSON échoue, tenter en binaire SRAM (ex: .sav renommé)
        const binaryReader = new FileReader();
        binaryReader.onload = async (binEvt) => {
          try {
            const buf = binEvt.target?.result as ArrayBuffer;
            if (buf && buf.byteLength >= 512 && buf.byteLength <= 131072) {
              const sramData = new Uint8Array(buf);
              await StorageService.saveSram(currentRomId, sramData);
              if (onReloadRomWithSram) {
                onReloadRomWithSram(sramData);
              } else if (currentRomData) {
                emulator.loadROM(currentRomData, sramData);
              } else {
                emulator.loadBatterySave(sramData);
              }
              const successMsg = 'Sauvegarde binaire détectée et importée avec succès !';
              setUploadFeedback({ type: 'success', message: successMsg });
              onNotify(`💾 ${successMsg}`);
              setIsProcessingUpload(false);
              setTimeout(() => onClose(), 1200);
            } else {
              setUploadFeedback({
                type: 'error',
                message: 'Fichier non reconnu. Veuillez fournir un fichier .sav (cartouche) ou .state (instantané).'
              });
              setIsProcessingUpload(false);
            }
          } catch {
            setUploadFeedback({ type: 'error', message: 'Fichier de sauvegarde invalide.' });
            setIsProcessingUpload(false);
          }
        };
        binaryReader.readAsArrayBuffer(file);
      }
    };
    reader.onerror = () => {
      setUploadFeedback({ type: 'error', message: 'Impossible de lire le fichier.' });
      setIsProcessingUpload(false);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessUploadedFile(file);
    }
    // Reset file input value to allow re-uploading the same file if desired
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessUploadedFile(file);
    }
  };

  // --- 3. GESTION DES SLOTS LOCAUX ---

  const handleSaveToSlot = async (slotNum: number) => {
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

  const handleLoadFromSlot = (state: SaveStateData, slotNum: number) => {
    if (!emulator) return;
    const success = emulator.loadSaveState(state);
    if (success) {
      const label = slotNum === 0 ? 'Sauvegarde rapide' : `Emplacement ${slotNum}`;
      onNotify(`▶️ ${label} chargée !`);
      onClose();
    }
  };

  const handleDeleteSlot = async (slotNum: number) => {
    if (!currentRomId) return;
    await StorageService.deleteSaveState(currentRomId, slotNum);
    await loadSlotsData();
    onNotify('🗑️ Sauvegarde supprimée');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-[#0c0e18] border border-white/[0.1] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#08090f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-300 shadow-sm">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Gestionnaire de Sauvegardes</span>
                {currentRomTitle && (
                  <span className="text-[11px] font-normal text-zinc-400 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06] truncate max-w-[180px]">
                    {currentRomTitle}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Créez, téléchargez, uploadez ou rechargez vos parties à tout moment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-white/[0.06] bg-[#090a11]">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/[0.05]">
            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <FolderDown className="w-4 h-4" />
              <span>Fichiers (.sav & .state)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('slots')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'slots'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Emplacements Rapides (Slots)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Fichiers de sauvegarde (.sav / .state) */}
        {activeTab === 'files' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 max-h-[68vh]">
            {/* Feedback alert if any */}
            {uploadFeedback && (
              <div
                className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
                  uploadFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {uploadFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{uploadFeedback.message}</span>
              </div>
            )}

            {/* SECTION A: UPLOADER UN FICHIER DE SAUVEGARDE */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-violet-400" />
                  <span>Uploader un fichier de sauvegarde</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">.sav, .state, .srm</span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2.5 ${
                  isDragging
                    ? 'bg-violet-600/15 border-violet-400 shadow-[0_0_25px_rgba(139,92,246,0.25)]'
                    : 'bg-white/[0.02] border-white/[0.12] hover:border-violet-500/50 hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                  <Upload className={`w-5 h-5 ${isDragging ? 'scale-110' : ''} transition-transform`} />
                </div>

                <div>
                  <p className="text-xs font-bold text-white">
                    {isProcessingUpload
                      ? 'Traitement du fichier de sauvegarde...'
                      : 'Glissez-déposez votre fichier de sauvegarde ici'}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    ou <span className="text-violet-400 underline underline-offset-2">cliquez pour parcourir</span> vos fichiers (.sav ou .state)
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    .SAV (Cartouche)
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                    .STATE (Instantané)
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".sav,.srm,.state,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* SECTION B: CRÉER UN FICHIER DE SAUVEGARDE */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Créer et télécharger un fichier de sauvegarde</span>
                </span>
                <span className="text-[10px] text-zinc-500">2 formats disponibles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Format 1: Sauvegarde Cartouche .SAV */}
                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.08] hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3 group">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-emerald-400" />
                        <span>Fichier Cartouche (.sav)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Universel
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Données de sauvegarde interne de la cartouche (SRAM). Compatible avec tous les émulateurs (mGBA, VBA, SameBoy) et cartouches physiques (EverDrive).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportSram}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Créer fichier .sav</span>
                  </button>
                </div>

                {/* Format 2: Instantané d'état .STATE */}
                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between gap-3 group">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span>Instantané d'état (.state)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                        Précis à la seconde
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Capture complète de la mémoire (CPU, RAM, écran actuel). Permet de reprendre instantanément la partie exactement au même endroit.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportStateNow}
                    className="w-full py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Créer fichier .state</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Note d'aide */}
            <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.06] flex items-start gap-2.5 text-[11px] text-zinc-400">
              <HelpCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-300 font-semibold">Conseil Pokémon :</strong> Dans Pokémon, vous pouvez faire START → SAUVER dans le jeu, puis cliquer sur <em>« Créer fichier .sav »</em> pour exporter votre fichier de sauvegarde légitime compatible avec d'autres émulateurs ou éditeurs.
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Emplacements Rapides (Slots 0, 1, 2) */}
        {activeTab === 'slots' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 max-h-[68vh]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-300">Emplacements en mémoire locale</span>
              <span className="text-[11px] text-zinc-500">Sauvegardes instantanées persistantes</span>
            </div>

            {slots.map(({ slot, state }) => {
              const isQuick = slot === 0;
              const title = isQuick ? 'Sauvegarde Rapide (Slot 0)' : `Emplacement ${slot}`;

              return (
                <div
                  key={slot}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    state
                      ? 'bg-white/[0.03] border-violet-500/30 hover:border-violet-500/50 shadow-sm'
                      : 'bg-white/[0.015] border-white/[0.06]'
                  }`}
                >
                  {/* Miniature & Info */}
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
                              {new Date(state.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' })} à{' '}
                              {new Date(state.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : (
                          <span className="text-zinc-500">Emplacement vide</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex flex-col gap-1 w-28">
                      <button
                        type="button"
                        onClick={() => handleSaveToSlot(slot)}
                        className="w-full py-1.5 px-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Sauvegarder</span>
                      </button>

                      {state && (
                        <button
                          type="button"
                          onClick={() => handleLoadFromSlot(state, slot)}
                          className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Charger</span>
                        </button>
                      )}
                    </div>

                    {state && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleExportSlot(state, slot)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer flex-shrink-0"
                          title="Télécharger ce fichier d'état (.state)"
                        >
                          <Download className="w-4 h-4 text-emerald-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer flex-shrink-0"
                          title="Supprimer cet emplacement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
