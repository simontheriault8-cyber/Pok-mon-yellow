import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { GameBoy } from '../emulator/gameboy';
import { POKEMON_YELLOW_RAM, resolveAddr, getRamOffset, readPartyStatusFromRAM } from '../services/pokemonYellowRam';
import { readNavigationState, NavigationRoute, POKEMON_YELLOW_MAPS, WarpInfo } from '../services/worldNavigation';
import { LocalNavigationEngine, AutoHealProgress, NavLogEntry } from '../services/localNavigation';
import { readRamMapData, TileClassification, LocalMapData } from '../services/ramMapReader';
import { 
  Compass, MapPin, DoorOpen, HeartPulse, 
  Square, RefreshCw, Terminal, Copy, Check, Trash2, ChevronDown, ChevronUp, Clock, Eye, Sparkles
} from 'lucide-react';
import { TrainerBotMode } from '../services/simpleTrainerBot';

interface RamViewerProps {
  emulator: GameBoy | null;
  isBotRunning?: boolean;
  botStartTime?: number | null;
  botMode?: TrainerBotMode;
}

// ----------------------------------------------------
// ISOLATED ULTRA-LIGHTWEIGHT LIVE TIMER COMPONENT
// Updates only its own small text node, preventing full-tree React re-renders!
// ----------------------------------------------------
const LiveTimer = React.memo(function LiveTimer({
  startTime,
  isRunning,
  prefix = ''
}: {
  startTime?: number | null;
  isRunning?: boolean;
  prefix?: string;
}) {
  const [display, setDisplay] = useState<string>('00:00.0');

  useEffect(() => {
    if (!isRunning || !startTime) {
      setDisplay('00:00.0');
      return;
    }

    const interval = setInterval(() => {
      const ms = Date.now() - startTime;
      const totalSecs = Math.floor(ms / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const tenths = Math.floor((ms % 1000) / 100);
      setDisplay(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`);
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  if (!isRunning || !startTime) return null;

  return (
    <span>
      {prefix}{display}
    </span>
  );
});

// ----------------------------------------------------
// ISOLATED MEMOIZED 2D RADAR GRID COMPONENT
// ----------------------------------------------------
interface RadarGridProps {
  radarData: LocalMapData | null;
  playerX: number;
  playerY: number;
  rawFacing: number;
  standingTile: number;
}

const RadarGrid = React.memo(function RadarGrid({
  radarData,
  playerX,
  playerY,
  rawFacing,
  standingTile
}: RadarGridProps) {
  if (!radarData || !radarData.screenTileGrid) return null;

  const renderRadarCell = (type: TileClassification, relX: number, relY: number, hexCode?: string) => {
    const isPlayer = relX === 0 && relY === 0;
    const cellWorldX = playerX + relX;
    const cellWorldY = playerY + relY;

    if (isPlayer) {
      let arrow = '🟢';
      if (rawFacing === 0x00) arrow = '⬇️';
      else if (rawFacing === 0x04) arrow = '⬆️';
      else if (rawFacing === 0x08) arrow = '⬅️';
      else if (rawFacing === 0x0C) arrow = '➡️';
      return (
        <span
          className="w-5 h-5 flex items-center justify-center bg-emerald-500/40 border border-emerald-400 text-[10px] font-bold rounded shadow-inner"
          title={`Joueur (${playerX}, ${playerY}) | Standing: 0x${standingTile.toString(16)}`}
        >
          {arrow}
        </span>
      );
    }

    const titleStr = `(${cellWorldX}, ${cellWorldY}) [Rel ${relX > 0 ? '+' : ''}${relX}, ${relY > 0 ? '+' : ''}${relY}] : ${hexCode || 'N/A'}`;

    switch (type) {
      case TileClassification.WALKABLE:
        return (
          <span
            className="w-5 h-5 flex items-center justify-center bg-emerald-950/40 border border-emerald-900/30 text-[8px] text-emerald-500 rounded"
            title={`Route dégagée : ${titleStr}`}
          >
            ·
          </span>
        );
      case TileClassification.GRASS:
        return (
          <span
            className="w-5 h-5 flex items-center justify-center bg-green-900/50 border border-green-700/40 text-[9px] rounded"
            title={`Hautes Herbes : ${titleStr}`}
          >
            🌾
          </span>
        );
      case TileClassification.LEDGE_DOWN:
        return (
          <span
            className="w-5 h-5 flex items-center justify-center bg-amber-950/60 border border-amber-600/50 text-[9px] rounded"
            title={`Falaise (Saut Bas) : ${titleStr}`}
          >
            🔻
          </span>
        );
      case TileClassification.DOOR:
        return (
          <span
            className="w-5 h-5 flex items-center justify-center bg-cyan-950/80 border border-cyan-400 text-[10px] rounded shadow-sm animate-pulse"
            title={`Porte / Entrée de bâtiment : ${titleStr}`}
          >
            🚪
          </span>
        );
      case TileClassification.SOLID:
      default:
        return (
          <span
            className="w-5 h-5 flex items-center justify-center bg-rose-950/50 border border-rose-900/40 text-[9px] rounded text-rose-500/70"
            title={`Obstacle (Solide) : ${titleStr}`}
          >
            🧱
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-2 pb-1">
      <div className="grid grid-cols-9 gap-0.5 bg-black/60 p-1.5 rounded-md border border-emerald-900/50 shadow-inner">
        {radarData.screenTileGrid.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div key={`${rIdx}-${cIdx}`}>
              {renderRadarCell(
                cell,
                cIdx - 4,
                rIdx - 4,
                radarData.screenTileHexGrid?.[rIdx]?.[cIdx]
              )}
            </div>
          ))
        )}
      </div>
      <span className="text-[9px] text-emerald-500/80 mt-1">
        Centre : Joueur à ({playerX}, {playerY}) | Champ de vision direct 9x9 pas
      </span>
    </div>
  );
});

export const RamViewer = React.memo(function RamViewer({
  emulator,
  isBotRunning,
  botStartTime,
  botMode
}: RamViewerProps) {
  const navEngineRef = useRef<LocalNavigationEngine>(new LocalNavigationEngine());
  const [healProgress, setHealProgress] = useState<AutoHealProgress | null>(null);
  const [isHealRunning, setIsHealRunning] = useState<boolean>(false);
  const [healStartTime, setHealStartTime] = useState<number | null>(null);
  const [navLogs, setNavLogs] = useState<NavLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [radarData, setRadarData] = useState<LocalMapData | null>(null);

  // Cache key to prevent redundant heavy recalculations
  const lastStateKeyRef = useRef<string>('');

  useEffect(() => {
    navEngineRef.current.setEmulator(emulator);
    navEngineRef.current.onProgress((progress) => {
      setHealProgress(progress);
      if (progress.status === 'completed' || progress.status === 'error' || progress.status === 'idle') {
        setIsHealRunning(false);
        setHealStartTime(null);
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
      setHealStartTime(null);
    } else {
      setIsHealRunning(true);
      setHealStartTime(Date.now());
      await navEngineRef.current.executeAutoHealSequence(true);
    }
  };

  const handleCopyLogs = useCallback(async () => {
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
  }, [navLogs, isHealRunning, healProgress]);

  const handleClearLogs = useCallback(() => {
    navEngineRef.current.clearLogs();
  }, []);

  // Read full RAM navigation state & 2D radar
  const [navData, setNavData] = useState<{
    currentMapId: number;
    mapName: string;
    playerX: number;
    playerY: number;
    facing: string;
    rawFacing: number;
    warpCount: number;
    warps: WarpInfo[];
    tileset: number;
    standingTile: number;
    mapWidth: number;
    mapHeight: number;
    battleType: number;
    joyIgnore: number;
    dumpD350: number[];
    dumpD3A0: number[];
    isFrench: boolean;
    aliveCount: number;
    partyCount: number;
    closestPokecenter: NavigationRoute | null;
  }>({
    currentMapId: 0,
    mapName: 'Chargement...',
    playerX: 0,
    playerY: 0,
    facing: 'Inconnu',
    rawFacing: 0,
    warpCount: 0,
    warps: [],
    tileset: 0,
    standingTile: 0,
    mapWidth: 0,
    mapHeight: 0,
    battleType: 0,
    joyIgnore: 0,
    dumpD350: [],
    dumpD3A0: [],
    isFrench: false,
    aliveCount: 0,
    partyCount: 0,
    closestPokecenter: null
  });

  useEffect(() => {
    if (!emulator) return;

    // Throttled RAM poll (300ms) with state caching
    const interval = setInterval(() => {
      const mmu = emulator.mmu;
      if (!mmu) return;

      try {
        const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
        const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
        const mapIdAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_ID_EN, mmu);
        const dirAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_DIR_EN, mmu);
        const warpCountAddr = resolveAddr(POKEMON_YELLOW_RAM.WARP_COUNT_EN, mmu);
        const tilesetAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_TILESET_EN, mmu);
        const standingTileAddr = resolveAddr(POKEMON_YELLOW_RAM.TILE_PLAYER_STANDING_EN, mmu);
        const mapHAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_HEIGHT_EN, mmu);
        const mapWAddr = resolveAddr(POKEMON_YELLOW_RAM.MAP_WIDTH_EN, mmu);
        const battleTypeAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_TYPE_EN, mmu);
        const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);

        const curMapId = mmu.read(mapIdAddr);
        const pX = mmu.read(xAddr);
        const pY = mmu.read(yAddr);
        const rawDir = mmu.read(dirAddr);
        const wCount = mmu.read(warpCountAddr);
        const bType = mmu.read(battleTypeAddr);
        const jIgnore = mmu.read(joyIgnoreAddr);

        const stateKey = `${curMapId}_${pX}_${pY}_${rawDir}_${wCount}_${bType}_${jIgnore}`;

        // Read Live 2D Collision Radar
        const mapData = readRamMapData(mmu);
        setRadarData(mapData);

        if (stateKey === lastStateKeyRef.current) {
          // Player state didn't change, avoid re-running route calculations
          return;
        }
        lastStateKeyRef.current = stateKey;

        const state = readNavigationState(mmu);
        if (!state) return;

        const tSet = mmu.read(tilesetAddr);
        const sTile = mmu.read(standingTileAddr);
        const mH = mmu.read(mapHAddr);
        const mW = mmu.read(mapWAddr);

        let facingStr = 'Inconnu';
        if (rawDir === 0x00) facingStr = 'Bas ⬇️';
        else if (rawDir === 0x04) facingStr = 'Haut ⬆️';
        else if (rawDir === 0x08) facingStr = 'Gauche ⬅️';
        else if (rawDir === 0x0C) facingStr = 'Droite ➡️';

        // Dump D350-D37F (Maps/Coords/Dims)
        const dumpD350: number[] = [];
        const baseD350 = resolveAddr(0xD350, mmu);
        for (let i = 0; i < 48; i++) {
          dumpD350.push(mmu.read(baseD350 + i));
        }

        // Dump D3A0-D3DF (Warps/D3AE)
        const dumpD3A0: number[] = [];
        const baseD3A0 = resolveAddr(0xD3A0, mmu);
        for (let i = 0; i < 48; i++) {
          dumpD3A0.push(mmu.read(baseD3A0 + i));
        }

        const mapName = POKEMON_YELLOW_MAPS[curMapId] || `Map 0x${curMapId.toString(16).toUpperCase()}`;
        const partyStatus = readPartyStatusFromRAM(mmu);
        const isFrench = getRamOffset(mmu) === 1;

        setNavData({
          currentMapId: curMapId,
          mapName,
          playerX: pX,
          playerY: pY,
          facing: facingStr,
          rawFacing: rawDir,
          warpCount: wCount,
          warps: state.warps,
          tileset: tSet,
          standingTile: sTile,
          mapWidth: mW * 2,
          mapHeight: mH * 2,
          battleType: bType,
          joyIgnore: jIgnore,
          dumpD350,
          dumpD3A0,
          isFrench,
          aliveCount: partyStatus.aliveMons,
          partyCount: partyStatus.totalMons,
          closestPokecenter: state.closestPokecenter
        });
      } catch (err) {
        // MMU read error safety
      }
    }, 300);

    return () => clearInterval(interval);
  }, [emulator]);

  const hexFormat = (num: number, len: number = 2) => '0x' + num.toString(16).toUpperCase().padStart(len, '0');

  const getLogBadge = (type: NavLogEntry['type']) => {
    switch (type) {
      case 'info':
        return <span className="px-1 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold text-[8px]">INFO</span>;
      case 'nav':
        return <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold text-[8px]">NAV</span>;
      case 'step':
        return <span className="px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold text-[8px]">PAS</span>;
      case 'door':
        return <span className="px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold text-[8px]">PORTE</span>;
      case 'nurse':
        return <span className="px-1 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-800 font-bold text-[8px]">JOËLLE</span>;
      case 'heal':
        return <span className="px-1 py-0.2 rounded bg-emerald-900 text-emerald-100 border border-emerald-500 font-bold text-[8px]">SOIN</span>;
      case 'return':
        return <span className="px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold text-[8px]">RETOUR</span>;
      case 'error':
        return <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold text-[8px]">ERREUR</span>;
      case 'stop':
        return <span className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-600 font-bold text-[8px]">ARRÊT</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-black/80 rounded-xl p-3 border border-emerald-900/50 font-mono text-[11px] text-emerald-400 backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col gap-2">
      {/* Background aesthetic grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-emerald-900/60 pb-1.5 z-10">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
          <span className="font-bold tracking-wider text-emerald-300 uppercase text-xs">
            Navigation & Moniteur RAM Direct
          </span>

          {/* Module 2 Auto-Heal Live Timer */}
          {isHealRunning && (
            <span className="font-mono text-emerald-300 font-bold bg-emerald-950/70 px-2 py-0.5 rounded text-[11px] border border-emerald-500/50 flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3 text-emerald-400" />
              <LiveTimer startTime={healStartTime} isRunning={isHealRunning} prefix="Auto-Soin : " />
            </span>
          )}

          {/* Combat Bot Live Timer */}
          {isBotRunning && botStartTime && (
            <span className="font-mono text-amber-300 font-bold bg-amber-950/50 px-2 py-0.5 rounded text-[11px] border border-amber-500/30 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <LiveTimer startTime={botStartTime} isRunning={isBotRunning} prefix="Bot : " />
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

        {/* 2D Collision Radar & RAM Vision */}
        <div className="col-span-2 flex flex-col bg-emerald-950/25 p-2 rounded-lg border border-emerald-800/40">
          <div className="flex items-center justify-between pb-1 border-b border-emerald-900/40 text-[10px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Radar & Grille de Collisions 2D (Vision RAM 9x9)</span>
            </span>
            <div className="flex items-center gap-1.5 text-[9px] text-emerald-500 flex-wrap justify-end">
              <span>🟩 Route</span>
              <span>🌾 Herbe</span>
              <span>🔻 Falaise</span>
              <span className="text-cyan-400 font-semibold">🚪 Porte</span>
              <span>🧱 Obstacle</span>
              <button
                onClick={() => setShowRadar(!showRadar)}
                className="p-0.5 rounded hover:bg-emerald-900/40 text-emerald-400 cursor-pointer ml-1"
                title={showRadar ? 'Masquer le radar' : 'Afficher le radar'}
              >
                {showRadar ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {showRadar && (
            <RadarGrid
              radarData={radarData}
              playerX={navData.playerX}
              playerY={navData.playerY}
              rawFacing={navData.rawFacing}
              standingTile={navData.standingTile}
            />
          )}
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
                  <LiveTimer startTime={healStartTime} isRunning={isHealRunning} />
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
                  <span>Arrêter l'Auto-Soin</span>
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
          {radarData && (
            <div className="text-[9px] leading-tight text-emerald-500/80 break-all">
              <strong className="text-emerald-400">Tuiles Écran Autour Joueur (wTileMap C440):</strong>{' '}
              {radarData.screenTileGrid ? '9x9 chargé' : 'N/A'} (standing: {hexFormat(navData.standingTile)})
            </div>
          )}
        </div>

      </div>
    </div>
  );
});
