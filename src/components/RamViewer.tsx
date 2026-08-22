import { useEffect, useState } from 'react';
import { GameBoy } from '../emulator/gameboy';
import { POKEMON_YELLOW_RAM, resolveAddr } from '../services/pokemonYellowRam';
import { readNavigationState, NavigationRoute } from '../services/worldNavigation';
import { Cpu, Sparkles, Compass, MapPin, DoorOpen, ShieldAlert, HeartPulse } from 'lucide-react';
import { TrainerBotMode } from '../services/simpleTrainerBot';

interface RamViewerProps {
  emulator: GameBoy | null;
  isBotRunning?: boolean;
  botStartTime?: number | null;
  botMode?: TrainerBotMode;
}

export function RamViewer({ emulator, isBotRunning, botStartTime, botMode }: RamViewerProps) {
  const [elapsedMs, setElapsedMs] = useState<number>(0);

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

  const formatTimer = (ms: number) => {
    if (ms === 0 && !isBotRunning) return null;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const msecs = ms % 1000;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${msecs.toString().padStart(3, '0')}`;
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
    closestPokecenter: NavigationRoute | null;
    dumpD350: number[];
  }>({
    currentMapId: 0,
    mapName: 'Initialisation...',
    playerX: 0,
    playerY: 0,
    facing: 'Bas ⬇️',
    rawFacing: 0,
    tileset: 0,
    standingTile: 0,
    warpCount: 0,
    joyIgnore: 0,
    battleType: 0,
    isFrench: false,
    partyCount: 0,
    aliveCount: 0,
    closestPokecenter: null,
    dumpD350: [],
  });

  useEffect(() => {
    if (!emulator) return;
    
    let active = true;
    let frameId = 0;

    const readRam = () => {
      if (!active) return;
      
      const mmu = emulator.mmu;
      if (!mmu) {
        frameId = requestAnimationFrame(readRam);
        return;
      }

      // Check if French by Title (0x134)
      let titleStr = '';
      for (let i = 0x134; i <= 0x142; i++) {
        titleStr += String.fromCharCode(mmu.read(i));
      }
      const isFrench = titleStr.includes('JAUNE');

      const nav = readNavigationState(mmu);
      const pCountAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_COUNT_EN, mmu);
      const partyCount = mmu.read(pCountAddr);

      // Check alive party count
      let aliveCount = 0;
      const validCount = Math.min(Math.max(partyCount, 0), 6);
      const baseHpAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_HP_EN, mmu);
      for (let i = 0; i < validCount; i++) {
        const hpAddr = baseHpAddr + i * POKEMON_YELLOW_RAM.PARTY_STRUCT_SIZE;
        const curHp = (mmu.read(hpAddr) << 8) | mmu.read(hpAddr + 1);
        if (curHp > 0) aliveCount++;
      }

      // Extract Navigation D350-D37F dump (Maps, Warps, Coords)
      const dumpD350: number[] = [];
      for (let i = 0xD350; i <= 0xD37F; i++) {
        dumpD350.push(mmu.read(i));
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
          joyIgnore: nav.joyIgnore,
          battleType: nav.battleType,
          isFrench,
          partyCount: validCount,
          aliveCount,
          closestPokecenter: nav.closestPokecenter,
          dumpD350,
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
          {isBotRunning && botStartTime && (
            <span className="font-mono text-emerald-300 font-bold bg-emerald-950/50 px-2 py-0.5 rounded text-[11px] border border-emerald-500/30">
              {formatTimer(elapsedMs)}
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
            <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3 text-emerald-500" /> Portes / Warps (D36C)</span>
            <span className="opacity-60">{hexFormat(navData.warpCount)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {navData.warpCount} porte(s) sur la carte
          </span>
        </div>

        {/* Standing Tile & Tileset */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Tuile (D35B) & Décor (D367)</span>
            <span className="opacity-60">{hexFormat(navData.standingTile)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            Tuile {hexFormat(navData.standingTile)} | {navData.tileset === 0 ? 'Extérieur (Overworld)' : navData.tileset === 1 ? 'Intérieur (Pokécenter/Shop)' : `Tileset ${navData.tileset}`}
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

        {/* Module 1: Closest Pokécenter Target & Status */}
        <div className="col-span-2 flex flex-col bg-emerald-950/30 p-2 rounded border border-emerald-800/40 shadow-sm">
          <span className="text-emerald-500 uppercase font-bold flex justify-between items-center text-[10px]">
            <span className="flex items-center gap-1"><HeartPulse className="w-3.5 h-3.5 text-emerald-400" /> Module 1 : Centre Pokémon le plus proche</span>
            <span className="font-bold text-emerald-400">Équipe : {navData.aliveCount}/{navData.partyCount} en vie</span>
          </span>
          {navData.closestPokecenter ? (
            <div className="mt-1 flex flex-col gap-0.5 text-emerald-200">
              <div className="font-bold text-emerald-300 flex items-center justify-between">
                <span>📍 {navData.closestPokecenter.targetPokecenter.name}</span>
                <span className="text-[10px] bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-400 border border-emerald-700/30">
                  {navData.closestPokecenter.isAlreadyInside ? 'À l\'intérieur' : `Distance : ~${navData.closestPokecenter.directDistance} pas`}
                </span>
              </div>
              <p className="text-[10px] text-emerald-400/90 font-normal leading-snug">
                {navData.closestPokecenter.nextStepDescription}
              </p>
            </div>
          ) : (
            <span className="text-emerald-400/70 text-[10px] italic mt-0.5">Calcul de l'itinéraire vers le Centre Pokémon...</span>
          )}
        </div>

        {/* Hex Dump D350-D37F (Navigation / Maps / Warps) */}
        <div className="col-span-2 mt-1 pt-1.5 border-t border-emerald-900/50 flex flex-col gap-1">
          <div className="text-[9px] leading-tight text-emerald-600/80 break-all">
            <strong className="text-emerald-500">D350-D37F (Maps/Coords/Warps):</strong>{' '}
            {navData.dumpD350.map((b) => b.toString(16).padStart(2, '0')).join(' ')}
          </div>
        </div>

      </div>
    </div>
  );
}

