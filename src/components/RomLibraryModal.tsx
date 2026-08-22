import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { RomItem } from '../emulator/types';
import { StorageService } from '../services/storage';
import { isIpsFile, isBpsFile, isPatchFile, applyRomPatch, getRomPatchInfo } from '../utils/ipsPatcher';
import { FolderOpen, Upload, Play, Trash2, HardDrive, Sparkles, X, Gamepad2, FileCheck, Wand2, AlertCircle, Layers } from 'lucide-react';

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

export function RomLibraryModal({
  isOpen,
  onClose,
  savedRoms = [],
  onSelectRom,
  onRefreshRoms,
  onDeleteRom,
  onNotify
}: RomLibraryModalProps) {
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
      let rawTitle = titleStr.trim() || romName.replace(/\.[^/.]+$/, '') || 'Jeu Game Boy';
      const isCgb = romData.length >= 0x0144 ? ((romData[0x0143] & 0x80) !== 0 || romData[0x0143] === 0xc0) : false;

      // Extract patch information from explicit info or filename
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
          ? `🎮 "${detectedInfo.baseTitle}" chargé avec ${detectedInfo.patchLabel || 'Patch'}!`
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
        // Look for patch files (.bps, .ips)
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
            // Sort so [FULL VERSION] comes first if available
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

        // If zip contains both base ROM and a patch, auto patch!
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
      onNotify(`🗑️ "${rom.title || 'ROM'}" supprimée de la bibliothèque`);
    } catch (err) {
      console.error(err);
      showModalError("Erreur lors de la suppression de la ROM.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-[#0f111a] border border-white/[0.1] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between bg-[#090a10]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.15)]">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">Bibliothèque de ROMs Locale</h2>
              <p className="text-xs text-zinc-400">
                Chargez des fichiers .gb, .gbc, .zip, .bps ou .ips et jouez instantanément
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-6 py-3 bg-rose-950/60 border-b border-rose-500/30 text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-rose-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Pending Patch Helper Section */}
          {activePatch && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-violet-950/40 to-indigo-950/40 border-2 border-amber-500/40 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                      Patch {activePatch.type} Détecté
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      {activePatch.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setAvailablePatches([])}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Annuler le patch"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Multi-patch variant selector if archive contained multiple patches */}
              {availablePatches.length > 1 && (
                <div className="space-y-2 p-3 bg-black/30 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Choisir la variante du Patch ({availablePatches.length} disponibles dans l'archive) :</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availablePatches.map((patch, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPatchIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          selectedPatchIndex === idx
                            ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20 font-bold'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                        }`}
                      >
                        {patch.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-zinc-300 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Comment appliquer ce ROM Hack ?</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Un fichier <code>.{activePatch.type.toLowerCase()}</code> est un patch qui modifie le jeu de base.
                  Pour y jouer, sélectionnez votre ROM originale de <strong>Pokémon Version Jaune</strong> (<code>.gbc</code> ou <code>.zip</code>) ci-dessous. Le jeu sera généré et lancé automatiquement !
                </p>
              </div>

              {/* Option 1: Apply on an already saved ROM if available */}
              {safeSavedRoms.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    Appliquer sur une ROM de votre bibliothèque :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {safeSavedRoms.map((rom) => (
                      <button
                        key={rom.id}
                        disabled={isProcessing}
                        onClick={() => handleApplyPatchToRom(rom)}
                        className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/50 text-left transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="truncate mr-2">
                          <p className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                            {rom.title || rom.name || 'ROM'}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {((rom.size || 0) / 1024).toFixed(0)} KB • {rom.name || ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 flex-shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                          Patcher
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Option 2: Upload base ROM from computer */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">
                  Ou charger le fichier original de Pokémon Yellow (.gbc) depuis votre appareil :
                </span>
                <button
                  disabled={isProcessing}
                  onClick={() => baseRomInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Upload className="w-4 h-4" />
                  <span>Sélectionner Pokémon Jaune (.gbc / .zip) & Patcher automatiquement</span>
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

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3.5 ${
              isDragging
                ? 'border-violet-400 bg-violet-950/30 shadow-[0_0_20px_rgba(139,92,246,0.25)]'
                : 'border-white/[0.12] bg-white/[0.02] hover:border-violet-500/50 hover:bg-violet-950/10'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-violet-400 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                {isProcessing ? 'Traitement en cours...' : 'Glissez-déposez un fichier ROM (.gb, .gbc, .zip) ou Patch (.bps, .ips)'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Formats supportés : .gb, .gbc, .zip, .bps, .ips (Auto-patching des ROM Hacks BPS & IPS inclus !)
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".gb,.gbc,.zip,.ips,.bps"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* User Saved ROMs in IndexedDB */}
          {safeSavedRoms.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Mes ROMs Enregistrées ({safeSavedRoms.length})
                </h3>
              </div>

              <div className="space-y-2.5">
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
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-sm ${
                        isConfirming
                          ? 'bg-rose-950/40 border-rose-500/50'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-violet-500/40 hover:bg-white/[0.05] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                            patchInfo.isPatched
                              ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                              : 'bg-white/[0.04] border-white/[0.08] text-violet-400'
                          }`}
                        >
                          {patchInfo.isPatched ? (
                            <Wand2 className="w-5 h-5 text-violet-300" />
                          ) : (
                            <FileCheck className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                              {patchInfo.baseTitle}
                            </h4>
                            {patchInfo.isPatched && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 text-violet-200 border border-violet-500/40 shadow-sm flex-shrink-0">
                                <Sparkles className="w-2.5 h-2.5 text-violet-300" />
                                {patchInfo.patchLabel || 'Patch Actif'}
                              </span>
                            )}
                            {rom.isCGB ? (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex-shrink-0">
                                COLOR
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-zinc-800 text-zinc-300 border border-zinc-700 flex-shrink-0">
                                DMG
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">
                            {((rom.size || 0) / 1024).toFixed(1)} KB • {patchInfo.isPatched ? `Modifié (${patchInfo.patchLabel}) • ` : ''}Joué {rom.lastPlayed ? new Date(rom.lastPlayed).toLocaleDateString() : 'Récemment'}
                          </p>
                        </div>
                      </div>

                      {isConfirming ? (
                        <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-rose-300 font-semibold mr-1">
                            Supprimer ?
                          </span>
                          <button
                            onClick={(e) => handleDeleteRom(rom, e)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                          >
                            Oui, supprimer
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRomToDelete(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRomToDelete(rom);
                            }}
                            title="Supprimer la ROM"
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-white/[0.06] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all cursor-pointer">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Lancer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">
                Aucune ROM dans votre bibliothèque
              </p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Glissez-déposez ou sélectionnez votre fichier de jeu (.gb, .gbc, .zip) ci-dessus pour l'ajouter et commencer votre partie.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

