import { useEffect, useState, useRef } from 'react';
import { GameBoy } from '../emulator/gameboy';
import { POKEMON_YELLOW_RAM, resolveAddr } from '../services/pokemonYellowRam';
import { readNavigationState, NavigationRoute, POKEMON_YELLOW_MAPS, WarpInfo } from '../services/worldNavigation';
import { LocalNavigationEngine, AutoHealProgress, NavLogEntry } from '../services/localNavigation';
import { 
  Cpu, Sparkles, Compass, MapPin, DoorOpen, ShieldAlert, HeartPulse, 
  Play, Square, RefreshCw, Terminal, Copy, Check, Trash2, ChevronDown, ChevronUp, Clock 
} from 'lucide-react';
import { TrainerBotMode } from '../services/simpleTrainerBot';

interface RamViewerProps {
  emulator: GameBoy | null;
  isBotRunning?: boolean;
  botStartTime?: number | null;
  botMode?: TrainerBotMode;
}

export function RamViewer({ emulator, isBotRunning, botStartTime, botMode }: RamViewerProps) {
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [navElapsedMs, setNavElapsedMs] = useState<number>(0);
  const navEngineRef = useRef<LocalNavigationEngine>(new LocalNavigationEngine());
  const [healProgress, setHealProgress] = useState<AutoHealProgress | null>(null);
  const [isHealRunning, setIsHealRunning] = useState<boolean>(false);
  const [navLogs, setNavLogs] = useState<NavLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    navEngineRef.current.setEmulator(emulator);
    navEngineRef.current.onProgress((progress) => {
      setHealProgress(progress);
      if (progress.status === 'completed' || progress.status === 'error' || progress.status === 'idle') {
        setIsHealRunning(false);
      } else {
        setIsHealRunning(true);
      }
    });

    navEngineRef.current.onLogsUpdate = (logs) => {
      setNavLogs(logs);
    };
  }, [emulator]);

  const handleTriggerAutoHeal = async () => {
    if (isHealRunning) {
      navEngineRef.current.stop();
      setIsHealRunning(false);
    } else {
      setIsHealRunning(true);
      await navEngineRef.current.executeAutoHealSequence(true);
    }
  };

  const handleCopyLogs = async () => {
    if (navLogs.length === 0) return;
    const formatted = [
      '========================================',
      '🩺 JOURNAL DE NAVIGATION & AUTO-SOIN (MODULE 2)',
      `Date : ${new Date().toLocaleString()}`,
      `Statut : ${isHealRunning ? 'EN COURS' : healProgress?.status || 'PRÊT'}`,
      '========================================\n',
      ...navLogs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`)
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formatted);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formatted;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Erreur copie presse-papier:', e);
    }
  };

  const handleClearLogs = () => {
    navEngineRef.current.clearLogs();
  };

  // Bot timer
  useEffect(() => {
    let animationFrameId: number;

    const updateTimer = () => {
      if (isBotRunning && botStartTime) {
        setElapsedMs(Date.now() - botStartTime);
        animationFrameId = requestAnimationFrame(updateTimer);
      }
    };

    if (isBotRunning && botStartTime) {
      animationFrameId = requestAnimationFrame(updateTimer);
    } else {
      setElapsedMs(0);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isBotRunning, botStartTime]);

  // Nav / Module 2 Timer
  useEffect(() => {
    let animationFrameId: number;

    const updateNavTimer = () => {
      const start = navEngineRef.current.getStartTime();
      if (isHealRunning && start) {
        setNavElapsedMs(Date.now() - start);
        animationFrameId = requestAnimationFrame(updateNavTimer);
      }
    };

    if (isHealRunning) {
      animationFrameId = requestAnimationFrame(updateNavTimer);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isHealRunning]);

  const formatTimer = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const msecs = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${msecs}`;
  };

  const [navData, setNavData] = useState<{
    currentMapId: number;
    mapName: string;
    playerX: number;
    playerY: number;
    facing: string;
    rawFacing: number;
    tileset: number;
    standingTile: number;
    warpCount: number;
    joyIgnore: number;
    battleType: number;
    isFrench: boolean;
    partyCount: number;
    aliveCount: number;
    mapWidth: number;
    mapHeight: number;
    warps: WarpInfo[];
    closestPokecenter: NavigationRoute | null;
    dumpD350: number[];
    dumpD3A0: number[];
  }>({
    currentMapId: 0,
    mapName: 'Chargement...',
    playerX: 0,
    playerY: 0,
    facing: 'Inconnu',
    rawFacing: 0,
    tileset: 0,
    standingTile: 0,
    warpCount: 0,
    joyIgnore: 0,
    battleType: 0,
    isFrench: false,
    partyCount: 0,
    aliveCount: 0,
    mapWidth: 0,
    mapHeight: 0,
    warps: [],
    closestPokecenter: null,
    dumpD350: [],
    dumpD3A0: [],
  });

  useEffect(() => {
    if (!emulator || !emulator.cart) return;

    let frameId: number;
    let active = true;

    const readRam = () => {
      if (!active) return;
      const mmu = emulator.mmu;
      if (!mmu) return;

      const isFrench = emulator.cart?.title.toUpperCase().includes('FRA') || 
                       emulator.cart?.title.toUpperCase().includes('FRENCH') || 
                       emulator.cart?.rom[0x0147] === 0x46 || false;

      // Extract Navigation State
      const nav = readNavigationState(mmu);

      // Party health analysis
      const partyCountAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_COUNT_EN, mmu);
      const partyCount = mmu.read(partyCountAddr);
      const validCount = partyCount > 0 && partyCount <= 6 ? partyCount : 0;
      let aliveCount = 0;

      for (let i = 0; i < validCount; i++) {
        const hpAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_HP_EN + i * POKEMON_YELLOW_RAM.PARTY_STRUCT_SIZE, mmu);
        const curHp = (mmu.read(hpAddr) << 8) | mmu.read(hpAddr + 1);
        if (curHp > 0) aliveCount++;
      }

      // Extract Navigation D350-D37F dump (Maps, Coords, Dimensions)
      const dumpD350: number[] = [];
      for (let i = 0xD350; i <= 0xD37F; i++) {
        dumpD350.push(mmu.read(i));
      }

      // Extract Warps D3A0-D3DF dump (D3AE = WarpCount, D3AF = Warp entries)
      const dumpD3A0: number[] = [];
      for (let i = 0xD3A0; i <= 0xD3DF; i++) {
        dumpD3A0.push(mmu.read(i));
      }

      if (nav) {
        setNavData({
          currentMapId: nav.currentMapId,
          mapName: nav.mapName,
          playerX: nav.playerX,
          playerY: nav.playerY,
          facing: nav.facing,
          rawFacing: nav.rawFacing,
          tileset: nav.tileset,
          standingTile: nav.standingTile,
          warpCount: nav.warpCount,
          mapWidth: nav.mapWidth,
          mapHeight: nav.mapHeight,
          warps: nav.warps,
          joyIgnore: nav.joyIgnore,
          battleType: nav.battleType,
          isFrench,
          partyCount: validCount,
          aliveCount,
          closestPokecenter: nav.closestPokecenter,
          dumpD350,
          dumpD3A0,
        });
      }

      // Poll at 10 FPS
      setTimeout(() => {
        if (active) frameId = requestAnimationFrame(readRam);
      }, 100);
    };

    frameId = requestAnimationFrame(readRam);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [emulator]);

  if (!emulator?.cart) return null;

  const hexFormat = (num: number, padding: number = 2) => '0x' + num.toString(16).toUpperCase().padStart(padding, '0');

  const getLogBadge = (type: NavLogEntry['type']) => {
    switch (type) {
      case 'nav':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">CARTE</span>;
      case 'door':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PORTE</span>;
      case 'nurse':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">JOËLLE</span>;
      case 'heal':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">SOIN</span>;
      case 'return':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">RETOUR</span>;
      case 'error':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">ERREUR</span>;
      case 'stop':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">ARRÊT</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">INFO</span>;
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 bg-[#0a0a0c] border-t border-zinc-800/50 overflow-hidden font-mono text-[10px] sm:text-[11px] text-emerald-500 shadow-inner p-2 md:p-3 relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
        style={{
          backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px)',
          backgroundSize: '100% 3px'
        }}
      />
      <div className="flex items-center gap-2 mb-2 md:mb-3 pb-1 border-b border-emerald-900/50">
        <Compass className="w-4 h-4 text-emerald-400 animate-pulse" />
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h3 className="uppercase tracking-widest font-bold text-emerald-400 text-xs">Navigation & Moniteur RAM Direct</h3>
          
          {/* Module 2 Auto-Heal Live Timer */}
          {isHealRunning && (
            <span className="font-mono text-emerald-300 font-bold bg-emerald-950/70 px-2 py-0.5 rounded text-[11px] border border-emerald-500/50 flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Auto-Soin : {formatTimer(navElapsedMs)}</span>
            </span>
          )}

          {/* Combat Bot Live Timer */}
          {isBotRunning && botStartTime && (
            <span className="font-mono text-amber-300 font-bold bg-amber-950/50 px-2 py-0.5 rounded text-[11px] border border-amber-500/30 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Bot : {formatTimer(elapsedMs)}</span>
            </span>
          )}

          {isBotRunning && botMode && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
              <Sparkles className="w-2.5 h-2.5" />
              {botMode === 'train_slot_1' ? 'Entraînement' : 'Continu'}
            </span>
          )}
        </div>
        <span className="ml-auto opacity-75 font-bold bg-emerald-900/30 px-2 py-0.5 rounded-full">
          ROM: {navData.isFrench ? 'FR' : 'EN'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-2 md:gap-x-4 gap-y-2 relative z-10 overflow-y-auto max-h-full pb-2">
        
        {/* Current Map Name & ID */}
        <div className="col-span-2 flex flex-col bg-emerald-950/30 p-2 rounded border border-emerald-800/40 shadow-sm">
          <span className="text-emerald-600 uppercase font-bold flex justify-between items-center text-[10px]">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-400" /> Zone Actuelle (wCurMap: 0xD35E)</span>
            <span className="font-bold text-emerald-300">{hexFormat(navData.currentMapId)}</span>
          </span>
          <span className="font-bold text-emerald-200 text-xs sm:text-[13px] truncate mt-0.5">
            {navData.mapName}
          </span>
        </div>

        {/* Player Coordinates & Direction */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Position (D362, D361)</span>
            <span className="opacity-60">{hexFormat(navData.playerX)},{hexFormat(navData.playerY)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            X: {navData.playerX} | Y: {navData.playerY}
          </span>
        </div>

        {/* Player Facing Direction */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Orientation (C109)</span>
            <span className="opacity-60">{hexFormat(navData.rawFacing)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {navData.facing}
          </span>
        </div>

        {/* Warps / Doors Count */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3 text-emerald-500" /> Portes / Warps (D3AE)</span>
            <span className="opacity-60">{hexFormat(navData.warpCount)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {navData.warpCount} porte(s) sur la carte
          </span>
        </div>

        {/* Standing Tile & Tileset & Map Dimensions */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Dimensions & Décor</span>
            <span className="opacity-60">{navData.mapWidth}x{navData.mapHeight} tuiles</span>
          </span>
          <span className="font-bold text-emerald-300">
            {navData.tileset === 0 ? 'Extérieur (Overworld)' : navData.tileset === 1 ? 'Intérieur (Bâtiment)' : `Tileset ${navData.tileset}`}
          </span>
        </div>

        {/* Game/Battle State */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>État Jeu (D057)</span>
            <span className="opacity-60">{hexFormat(navData.battleType)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {navData.battleType === 0 ? '🟢 Carte (Libre)' : 
             navData.battleType === 1 ? '⚔️ Combat Sauvage' : 
             navData.battleType === 2 ? '⚔️ Combat Dresseur' : 
             'Inconnu'}
          </span>
        </div>

        {/* Joypad Lock / Dialogue State */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Touches (CD6B)</span>
            <span className="opacity-60">{hexFormat(navData.joyIgnore)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {navData.joyIgnore === 0 ? '🟢 Contrôles Libres' : '🔴 Texte/Anim (Verrouillé)'}
          </span>
        </div>

        {/* Detected Warps on Current Map */}
        {navData.warps.length > 0 && (
          <div className="col-span-2 flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/40">
            <span className="text-emerald-600 uppercase font-bold text-[9px] mb-1 flex items-center justify-between">
              <span>🚪 Portes Détectées en RAM (D3AF+)</span>
              <span>{navData.warps.length} entrées</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {navData.warps.map((w, idx) => {
                const targetName = POKEMON_YELLOW_MAPS[w.targetMapId] || `Map 0x${w.targetMapId.toString(16).toUpperCase()}`;
                return (
                  <div key={idx} className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded border border-emerald-900/50 flex flex-col">
                    <span className="text-emerald-300 font-bold">Porte #{w.index} : ({w.x}, {w.y})</span>
                    <span className="text-emerald-500/90 truncate">➜ {targetName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Module 1 & Module 2: Auto-Navigation & Auto-Heal Engine */}
        <div className="col-span-2 flex flex-col bg-emerald-950/30 p-2.5 rounded border border-emerald-800/50 shadow-sm gap-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-emerald-400 uppercase font-bold flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span>Module 1 & 2 : Navigation Locale & Auto-Soin</span>
            </span>
            <div className="flex items-center gap-2">
              {isHealRunning && (
                <span className="font-mono text-[10px] text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  {formatTimer(navElapsedMs)}
                </span>
              )}
              <span className="font-bold text-emerald-300 bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-700/40">
                Équipe : {navData.aliveCount}/{navData.partyCount} en vie
              </span>
            </div>
          </div>

          {navData.closestPokecenter ? (
            <div className="flex flex-col gap-1 bg-black/40 p-2 rounded border border-emerald-900/60">
              <div className="font-bold text-emerald-300 flex items-center justify-between text-[11px]">
                <span>📍 {navData.closestPokecenter.targetPokecenter.name}</span>
                <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-300 border border-emerald-600/40">
                  {navData.closestPokecenter.isAlreadyInside ? '✅ À l\'intérieur' : `Distance : ~${navData.closestPokecenter.directDistance} pas`}
                </span>
              </div>
              <p className="text-[10px] text-emerald-400/90 font-normal leading-snug">
                {healProgress ? healProgress.stepMessage : navData.closestPokecenter.nextStepDescription}
              </p>
            </div>
          ) : (
            <span className="text-emerald-400/70 text-[10px] italic">Calcul de l'itinéraire vers le Centre Pokémon...</span>
          )}

          {/* Module 2 Trigger Button */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-900/40">
            <button
              onClick={handleTriggerAutoHeal}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded font-bold text-xs transition-all cursor-pointer shadow ${
                isHealRunning
                  ? 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border border-rose-600/50 animate-pulse'
                  : 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-600/50'
              }`}
            >
              {isHealRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Arrêter l'Auto-Soin ({formatTimer(navElapsedMs)})</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tester Module 2 : Auto-Soin Complet (Aller / Soin / Retour)</span>
                </>
              )}
            </button>
          </div>

          {/* Module 2 Live Decision & Action Log Stream */}
          <div className="flex flex-col gap-1.5 bg-black/60 p-2 rounded-lg border border-emerald-900/60 mt-1">
            <div className="flex items-center justify-between text-[10px] pb-1 border-b border-emerald-900/50">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Journal & Logs de Navigation (Module 2)</span>
                <span className="text-[9px] bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800 text-emerald-400">
                  {navLogs.length} logs
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyLogs}
                  disabled={navLogs.length === 0}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/40 text-[9px] cursor-pointer disabled:opacity-40"
                  title="Copier les logs de navigation"
                >
                  {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
                <button
                  onClick={handleClearLogs}
                  disabled={navLogs.length === 0}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[9px] cursor-pointer disabled:opacity-40"
                  title="Effacer le journal"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="p-0.5 rounded hover:bg-emerald-900/40 text-emerald-400 cursor-pointer"
                  title={showLogs ? 'Réduire les logs' : 'Développer les logs'}
                >
                  {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {showLogs && (
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1 text-[9px] scrollbar-thin">
                {navLogs.length > 0 ? (
                  navLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-1.5 py-0.5 px-1 rounded bg-black/40 border border-emerald-900/30 hover:border-emerald-700/40"
                    >
                      <span className="text-emerald-600 font-mono text-[8px] whitespace-nowrap pt-0.5">
                        {log.time}
                      </span>
                      {getLogBadge(log.type)}
                      <span className="text-emerald-200 leading-tight flex-1 break-words">
                        {log.message}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-600 italic py-2 text-center text-[9px]">
                    {isHealRunning ? 'Enregistrement des actions...' : 'Prêt. Cliquez sur Tester Module 2 pour lancer la séquence.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hex Dumps (Navigation D350-D37F & Warps D3A0-D3DF) */}
        <div className="col-span-2 mt-1 pt-1.5 border-t border-emerald-900/50 flex flex-col gap-1">
          <div className="text-[9px] leading-tight text-emerald-600/80 break-all">
            <strong className="text-emerald-500">D350-D37F (Maps/Coords/Dims):</strong>{' '}
            {navData.dumpD350.map((b) => b.toString(16).padStart(2, '0')).join(' ')}
          </div>
          <div className="text-[9px] leading-tight text-emerald-600/80 break-all">
            <strong className="text-emerald-500">D3A0-D3DF (Warps/D3AE):</strong>{' '}
            {navData.dumpD3A0.map((b) => b.toString(16).padStart(2, '0')).join(' ')}
          </div>
        </div>

      </div>
    </div>
  );
}
