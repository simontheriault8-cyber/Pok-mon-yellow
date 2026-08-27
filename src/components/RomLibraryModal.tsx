import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { RomItem } from '../emulator/types';
import { StorageService } from '../services/storage';
import { isIpsFile, isBpsFile, isPatchFile, applyRomPatch, getRomPatchInfo } from '../utils/ipsPatcher';
import {
  FolderOpen,
  Upload,
  Play,
  Trash2,
  HardDrive,
  Sparkles,
  X,
  Gamepad2,
  FileCheck,
  Wand2,
  AlertCircle,
  Layers,
  Plus,
  ArrowRight
} from 'lucide-react';

interface RomLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedRoms: RomItem[];
  onSelectRom: (rom: RomItem) => void;
  onRefreshRoms: () => void;
  onDeleteRom?: (romId: string) => Promise<void> | void;
  onNotify: (msg: string) => void;
}

interface PatchOption {
  name: string;
  data: Uint8Array;
  type: 'BPS' | 'IPS';
}

type LibraryTab = 'games' | 'upload';

export function RomLibraryModal({
  isOpen,
  onClose,
  savedRoms = [],
  onSelectRom,
  onRefreshRoms,
  onDeleteRom,
  onNotify
}: RomLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('games');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availablePatches, setAvailablePatches] = useState<PatchOption[]>([]);
  const [selectedPatchIndex, setSelectedPatchIndex] = useState<number>(0);
  const [romToDelete, setRomToDelete] = useState<RomItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const baseRomInputRef = useRef<HTMLInputElement | null>(null);

  const safeSavedRoms = Array.isArray(savedRoms) ? savedRoms.filter((r) => r && r.id) : [];
  const activePatch = availablePatches[selectedPatchIndex] || null;

  if (!isOpen) return null;

  const showModalError = (msg: string) => {
    setErrorMessage(msg);
    onNotify(`⚠️ ${msg}`);
  };

  const saveAndLaunchRom = async (
    romData: Uint8Array,
    romName: string,
    explicitPatch?: { isPatched: boolean; patchName: string }
  ) => {
    try {
      setErrorMessage(null);
      // Extract Cartridge Title from header ($0134 - $0142)
      let titleStr = '';
      if (romData.length >= 0x0143) {
        for (let i = 0x0134; i <= 0x0142; i++) {
          const charCode = romData[i];
          if (charCode === 0) break;
          if (charCode >= 32 && charCode <= 126) titleStr += String.fromCharCode(charCode);
        }
      }
      const rawTitle = titleStr.trim() || romName.replace(/\.[^/.]+$/, '') || 'Jeu Game Boy';
      const isCgb = romData.length >= 0x0144 ? ((romData[0x0143] & 0x80) !== 0 || romData[0x0143] === 0xc0) : false;

      const detectedInfo = getRomPatchInfo({
        name: romName,
        title: rawTitle,
        isPatched: explicitPatch?.isPatched,
        patchName: explicitPatch?.patchName,
        size: romData.length
      });

      const newRom: RomItem = {
        id: `rom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: romName,
        title: detectedInfo.fullTitle,
        size: romData.length,
        isCGB: isCgb,
        data: romData,
        isPatched: detectedInfo.isPatched,
        patchName: detectedInfo.patchLabel || undefined,
        lastPlayed: Date.now()
      };

      await StorageService.saveRom(newRom);
      onRefreshRoms();
      onSelectRom(newRom);
      onNotify(
        detectedInfo.isPatched
          ? `🎮 "${detectedInfo.baseTitle}" lancé avec ${detectedInfo.patchLabel || 'Patch'}!`
          : `🎮 ROM "${detectedInfo.baseTitle}" chargée avec succès!`
      );
      onClose();
    } catch (err) {
      console.error(err);
      showModalError('Impossible de sauvegarder la ROM dans la mémoire locale.');
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      let romData: Uint8Array | null = null;
      let romName = file.name;
      let explicitPatch: { isPatched: boolean; patchName: string } | undefined = undefined;

      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const patchEntries = Object.values(zip.files).filter(
          (f) => !f.dir && (f.name.toLowerCase().endsWith('.bps') || f.name.toLowerCase().endsWith('.ips'))
        );
        const gbcFile = Object.values(zip.files).find(
          (f) => !f.dir && (f.name.toLowerCase().endsWith('.gb') || f.name.toLowerCase().endsWith('.gbc'))
        );

        if (patchEntries.length > 0 && !gbcFile) {
          const loadedPatches: PatchOption[] = [];
          for (const pFile of patchEntries) {
            const arrayBuffer = await pFile.async('arraybuffer');
            const bytes = new Uint8Array(arrayBuffer);
            const isBps = isBpsFile(bytes);
            const isIps = isIpsFile(bytes);
            if (isBps || isIps) {
              const cleanName = pFile.name.split('/').pop() || pFile.name;
              loadedPatches.push({
                name: cleanName,
                data: bytes,
                type: isBps ? 'BPS' : 'IPS'
              });
            }
          }

          if (loadedPatches.length > 0) {
            loadedPatches.sort((a, b) => {
              if (a.name.toLowerCase().includes('full')) return -1;
              if (b.name.toLowerCase().includes('full')) return 1;
              return 0;
            });
            setAvailablePatches(loadedPatches);
            setSelectedPatchIndex(0);
            setIsProcessing(false);
            return;
          }
        }

        if (!gbcFile) {
          showModalError("Aucun fichier ROM (.gb, .gbc) ou patch (.bps, .ips) valide trouvé dans l'archive .zip.");
          setIsProcessing(false);
          return;
        }

        romName = gbcFile.name;
        const arrayBuffer = await gbcFile.async('arraybuffer');
        romData = new Uint8Array(arrayBuffer);

        if (patchEntries.length > 0 && romData) {
          const mainPatch = patchEntries.find(p => p.name.toLowerCase().includes('full')) || patchEntries[0];
          const patchBuf = await mainPatch.async('arraybuffer');
          const patchBytes = new Uint8Array(patchBuf);
          if (isPatchFile(patchBytes)) {
            romData = applyRomPatch(romData, patchBytes);
            const cleanPatchName = (mainPatch.name.split('/').pop() || mainPatch.name)
              .replace(/\.(bps|ips)$/i, '')
              .replace(/[_-]/g, ' ')
              .trim();
            romName = `${romName.replace(/\.[^/.]+$/, '')} [${cleanPatchName || 'Hack'}].gbc`;
            explicitPatch = { isPatched: true, patchName: cleanPatchName || 'Hack' };
          }
        }
      } else if (file.name.toLowerCase().endsWith('.bps')) {
        const arrayBuffer = await file.arrayBuffer();
        const patchData = new Uint8Array(arrayBuffer);
        if (isBpsFile(patchData)) {
          setAvailablePatches([{ name: file.name, data: patchData, type: 'BPS' }]);
          setSelectedPatchIndex(0);
          setIsProcessing(false);
          return;
        } else {
          showModalError("Le fichier .bps sélectionné n'est pas un patch BPS valide.");
          setIsProcessing(false);
          return;
        }
      } else if (file.name.toLowerCase().endsWith('.ips')) {
        const arrayBuffer = await file.arrayBuffer();
        const patchData = new Uint8Array(arrayBuffer);
        if (isIpsFile(patchData)) {
          setAvailablePatches([{ name: file.name, data: patchData, type: 'IPS' }]);
          setSelectedPatchIndex(0);
          setIsProcessing(false);
          return;
        } else {
          showModalError("Le fichier .ips sélectionné n'est pas un patch IPS valide.");
          setIsProcessing(false);
          return;
        }
      } else {
        const arrayBuffer = await file.arrayBuffer();
        romData = new Uint8Array(arrayBuffer);
        if (isBpsFile(romData)) {
          setAvailablePatches([{ name: file.name, data: romData, type: 'BPS' }]);
          setSelectedPatchIndex(0);
          setIsProcessing(false);
          return;
        } else if (isIpsFile(romData)) {
          setAvailablePatches([{ name: file.name, data: romData, type: 'IPS' }]);
          setSelectedPatchIndex(0);
          setIsProcessing(false);
          return;
        }
      }

      if (romData && romData.length >= 0x0150) {
        await saveAndLaunchRom(romData, romName, explicitPatch);
      } else {
        showModalError("Le fichier sélectionné ne semble pas être une ROM Game Boy valide.");
      }
    } catch (err) {
      console.error(err);
      showModalError("Erreur lors de la lecture du fichier.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyPatchToRom = async (baseRom: RomItem) => {
    if (!activePatch) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (!baseRom.data || baseRom.data.length < 0x150) {
        showModalError("Données de la ROM de base incomplètes.");
        return;
      }
      const patchCleanName = activePatch.name
        .replace(/\.(bps|ips)$/i, '')
        .replace(/[_-]/g, ' ')
        .trim();
      const patchedBytes = applyRomPatch(baseRom.data, activePatch.data);
      const patchedName = `${baseRom.title} [${patchCleanName || 'Hack'}].gbc`;
      await saveAndLaunchRom(patchedBytes, patchedName, {
        isPatched: true,
        patchName: patchCleanName || 'Special Eevee Edition'
      });
      setAvailablePatches([]);
    } catch (err) {
      console.error(err);
      showModalError(`Erreur lors de l'application du patch ${activePatch.type} : ` + String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBaseRomUploadForPatch = async (file: File) => {
    if (!activePatch) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      let baseRomData: Uint8Array | null = null;
      let baseName = file.name;

      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const validFile = Object.values(zip.files).find(
          (f) => !f.dir && (f.name.toLowerCase().endsWith('.gb') || f.name.toLowerCase().endsWith('.gbc'))
        );
        if (!validFile) {
          showModalError("Aucune ROM .gb / .gbc trouvée dans l'archive zip.");
          return;
        }
        baseName = validFile.name;
        baseRomData = new Uint8Array(await validFile.async('arraybuffer'));
      } else {
        baseRomData = new Uint8Array(await file.arrayBuffer());
      }

      if (baseRomData && baseRomData.length >= 0x0150) {
        const patchCleanName = activePatch.name
          .replace(/\.(bps|ips)$/i, '')
          .replace(/[_-]/g, ' ')
          .trim();
        const patchedBytes = applyRomPatch(baseRomData, activePatch.data);
        const patchedName = `${baseName.replace(/\.[^/.]+$/, '')} [${patchCleanName || 'Hack'}].gbc`;
        await saveAndLaunchRom(patchedBytes, patchedName, {
          isPatched: true,
          patchName: patchCleanName || 'Special Eevee Edition'
        });
        setAvailablePatches([]);
      } else {
        showModalError("Le fichier fourni n'est pas une ROM Game Boy originale valide.");
      }
    } catch (err) {
      console.error(err);
      showModalError("Erreur lors de l'application du patch : " + String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRom = async (rom: RomItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (onDeleteRom) {
        await onDeleteRom(rom.id);
      } else {
        await StorageService.deleteRom(rom.id);
        onRefreshRoms();
      }
      setRomToDelete(null);
      onNotify(`🗑️ "${rom.title || 'ROM'}" supprimée`);
    } catch (err) {
      console.error(err);
      showModalError("Erreur lors de la suppression de la ROM.");
    }
  };

  return (
    <div
      id="rom-library-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="rom-library-modal-container"
        className="relative w-full max-w-2xl bg-[#0c0d14] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between bg-[#08090f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Bibliothèque de Jeux</h2>
              <p className="text-[11px] text-zinc-400">Sélectionnez ou ajoutez des ROMs Game Boy (.gb, .gbc, .zip, .bps, .ips)</p>
            </div>
          </div>

          <button
            id="rom-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Navigation */}
        <div className="p-2 border-b border-white/[0.06] bg-[#090a11]">
          <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-xl border border-white/[0.04]">
            <button
              id="rom-tab-games"
              onClick={() => setActiveTab('games')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'games'
                  ? 'bg-violet-600 text-white shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 shrink-0" />
              <span>Mes Jeux ({safeSavedRoms.length})</span>
            </button>

            <button
              id="rom-tab-upload"
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-violet-600 text-white shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Importer / Patcher</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/60 border-b border-rose-500/30 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-md hover:bg-white/10 text-rose-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Active Patch Wizard */}
          {activePatch && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 to-violet-950/30 border border-amber-500/40 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                      Patch {activePatch.type} Actif
                    </span>
                    <h3 className="text-xs font-bold text-white mt-0.5">{activePatch.name}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setAvailablePatches([])}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Annuler le patch"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {availablePatches.length > 1 && (
                <div className="space-y-1.5 p-2.5 bg-black/40 rounded-lg border border-white/5">
                  <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Variante :
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availablePatches.map((patch, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPatchIndex(idx)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          selectedPatchIndex === idx
                            ? 'bg-amber-400 text-black font-bold'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                        }`}
                      >
                        {patch.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply onto saved ROM */}
              {safeSavedRoms.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                    Appliquer sur un jeu de la bibliothèque :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {safeSavedRoms.map((rom) => (
                      <button
                        key={rom.id}
                        disabled={isProcessing}
                        onClick={() => handleApplyPatchToRom(rom)}
                        className="p-2 rounded-lg bg-white/[0.03] hover:bg-amber-500/15 border border-white/[0.08] hover:border-amber-400/40 text-left transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-white group-hover:text-amber-300 truncate">
                            {rom.title || rom.name}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 group-hover:bg-amber-400 group-hover:text-black transition-colors shrink-0">
                          Patcher
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload base ROM from computer */}
              <div>
                <button
                  disabled={isProcessing}
                  onClick={() => baseRomInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Sélectionner Pokémon Jaune original (.gbc / .zip)</span>
                </button>
                <input
                  type="file"
                  ref={baseRomInputRef}
                  accept=".gb,.gbc,.zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBaseRomUploadForPatch(file);
                  }}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 1: SAVED GAMES LIST */}
          {activeTab === 'games' && (
            <div className="space-y-3">
              {safeSavedRoms.length > 0 ? (
                <div className="space-y-2">
                  {safeSavedRoms.map((rom) => {
                    const isConfirming = romToDelete?.id === rom.id;
                    const patchInfo = getRomPatchInfo(rom);

                    return (
                      <div
                        key={rom.id}
                        onClick={() => {
                          if (!isConfirming) {
                            onSelectRom(rom);
                            onNotify(`🎮 Chargement de ${patchInfo.baseTitle}`);
                            onClose();
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                          isConfirming
                            ? 'bg-rose-950/40 border-rose-500/50'
                            : 'bg-white/[0.02] border-white/[0.05] hover:border-violet-500/50 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                              patchInfo.isPatched
                                ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                                : 'bg-white/[0.04] border-white/[0.08] text-violet-400'
                            }`}
                          >
                            {patchInfo.isPatched ? (
                              <Wand2 className="w-4 h-4" />
                            ) : (
                              <FileCheck className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                                {patchInfo.baseTitle}
                              </h4>
                              {patchInfo.isPatched && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {patchInfo.patchLabel || 'Patch'}
                                </span>
                              )}
                              {rom.isCGB ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                                  CGB
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                                  DMG
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                              {((rom.size || 0) / 1024).toFixed(0)} KB • Joué {rom.lastPlayed ? new Date(rom.lastPlayed).toLocaleDateString() : 'Récemment'}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleDeleteRom(rom, e)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRomToDelete(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-[11px] transition-colors cursor-pointer"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRomToDelete(rom);
                              }}
                              title="Supprimer"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer">
                              <Play className="w-3 h-3 fill-current" />
                              <span>Jouer</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Aucun jeu enregistré</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Importez votre première ROM pour commencer votre partie
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une ROM</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD & DRAG & DROP */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-violet-400 bg-violet-950/30'
                    : 'border-white/[0.1] bg-white/[0.02] hover:border-violet-500/50 hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-violet-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-200">
                    {isProcessing ? 'Traitement en cours...' : 'Glissez-déposez un fichier de jeu ou cliquez pour parcourir'}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Formats acceptés : <span className="text-zinc-300 font-mono">.gb, .gbc, .zip, .bps, .ips</span>
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".gb,.gbc,.zip,.ips,.bps"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processFile(file);
                  }}
                  className="hidden"
                />
              </div>

              {/* Informative Note */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200 block mb-0.5">Patchs & ROM Hacks automatiques :</strong>
                  Vous pouvez déposer directement une archive <code className="text-zinc-300">.zip</code> ou un fichier <code className="text-zinc-300">.bps / .ips</code> (comme Pokémon Special Eevee Edition). Le système appliquera automatiquement les modifications.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-[#08090f] flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            Stockage 100% local dans votre navigateur (IndexedDB)
          </span>
          <button
            id="rom-modal-close-footer-btn"
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
