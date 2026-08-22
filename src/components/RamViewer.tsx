import { useEffect, useState } from 'react';
import { GameBoy } from '../emulator/gameboy';
import { POKEMON_YELLOW_RAM, resolveAddr, getRamOffset } from '../services/pokemonYellowRam';
import { Cpu, Activity, MousePointer2, Shield, Sparkles } from 'lucide-react';
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

  const [ramData, setRamData] = useState({
    battleType: 0,
    playerX: 0,
    playerY: 0,
    hp: 0,
    maxHp: 0,
    cursor: 0,
    topMenuY: 0,
    topMenuX: 0,
    maxMenu: 0,
    joyIgnore: 0,
    partyCount: 0,
    isFrench: false,
    hpAddr: 0,
    party1Hp: 0,
    party1MaxHp: 0,
    dumpD000: [] as number[],
    dumpD150: [] as number[]
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

      const bTypeAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_TYPE_EN, mmu);
      const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);
      const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);
      const cursorAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_CURSOR_EN, mmu);
      const topMenuYAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_Y_EN, mmu);
      const topMenuXAddr = resolveAddr(POKEMON_YELLOW_RAM.TOP_MENU_X_EN, mmu);
      const maxMenuAddr = resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu);
      const joyAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);
      const hpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_HP_EN, mmu);
      const maxHpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MAX_HP_EN, mmu);
      const pCountAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_COUNT_EN, mmu);
      const pHpAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_HP_EN, mmu);
      const pMaxHpAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_MAX_HP_EN, mmu);

      const hp = (mmu.read(hpAddr) << 8) | mmu.read(hpAddr + 1);
      const maxHp = (mmu.read(maxHpAddr) << 8) | mmu.read(maxHpAddr + 1);
      
      const party1Hp = (mmu.read(pHpAddr) << 8) | mmu.read(pHpAddr + 1);
      const party1MaxHp = (mmu.read(pMaxHpAddr) << 8) | mmu.read(pMaxHpAddr + 1);
      
      // Extract Hex Dumps
      const dumpD000 = [];
      for(let i=0xD000; i<=0xD02F; i++) dumpD000.push(mmu.read(i));
      
      const dumpD150 = [];
      for(let i=0xD150; i<=0xD17F; i++) dumpD150.push(mmu.read(i));

      setRamData({
        battleType: mmu.read(bTypeAddr),
        playerX: mmu.read(xAddr),
        playerY: mmu.read(yAddr),
        cursor: mmu.read(cursorAddr),
        topMenuY: mmu.read(topMenuYAddr),
        topMenuX: mmu.read(topMenuXAddr),
        maxMenu: mmu.read(maxMenuAddr),
        joyIgnore: mmu.read(joyAddr),
        partyCount: mmu.read(pCountAddr),
        hp,
        maxHp,
        isFrench,
        hpAddr,
        party1Hp,
        party1MaxHp,
        dumpD000,
        dumpD150
      });

      // Poll at 10 FPS to save CPU, it's just for viewing
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
        <Cpu className="w-4 h-4 text-emerald-400" />
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h3 className="uppercase tracking-widest font-bold text-emerald-400 text-xs">Moniteur RAM Direct</h3>
          {isBotRunning && botStartTime && (
            <span className="font-mono text-emerald-300 font-bold bg-emerald-950/50 px-2 py-0.5 rounded text-[11px] border border-emerald-500/30">
              {formatTimer(elapsedMs)}
            </span>
          )}
          {isBotRunning && botMode && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
              <Sparkles className="w-2.5 h-2.5" />
              {botMode === 'train_slot_1' ? 'Slot 1' : 'Continu'}
            </span>
          )}
        </div>
        <span className="ml-auto opacity-75 font-bold bg-emerald-900/30 px-2 py-0.5 rounded-full">
          ROM: {ramData.isFrench ? 'FR' : 'EN'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-2 md:gap-x-4 gap-y-2 relative z-10 overflow-y-auto max-h-full pb-2">
        
        {/* Battle State */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>État (D057)</span>
            <span className="opacity-60">{hexFormat(ramData.battleType)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {ramData.battleType === 0 ? '🟢 Carte (Libre)' : 
             ramData.battleType === 1 ? '⚔️ Combat Sauvage' : 
             ramData.battleType === 2 ? '⚔️ Combat Dresseur' : 
             'Inconnu'}
          </span>
        </div>
        
        {/* JoyIgnore / Lock */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>JoyLock (CD6B)</span>
            <span className="opacity-60">{hexFormat(ramData.joyIgnore)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {ramData.joyIgnore === 0 ? '🟢 Prêt (Touches OK)' : '🔴 Verrouillé (Texte/Anim)'}
          </span>
        </div>

        {/* Menu Cursor */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Curseur (CC26)</span>
            <span className="opacity-60">{hexFormat(ramData.cursor)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            Slot {ramData.cursor + 1} <span className="opacity-60">/ (Max Index: {ramData.maxMenu})</span>
          </span>
        </div>

        {/* Menu Position */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Menu (CC24, CC25)</span>
            <span className="opacity-60">{hexFormat(ramData.topMenuY)},{hexFormat(ramData.topMenuX)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {ramData.battleType > 0 ? (
              ramData.topMenuY === 14 && ramData.topMenuX === 9 ? '⚔️ Base (Combat)' :
              ramData.topMenuY === 12 && ramData.topMenuX === 5 ? '💥 Attaques' :
              ramData.topMenuY === 4 && ramData.topMenuX === 15 ? '🎒 Sac / Objets' :
              ramData.topMenuY === 1 && ramData.topMenuX === 0 ? '🐾 PKMN (Équipe)' :
              ramData.topMenuY === 10 && ramData.topMenuX === 14 ? '❓ Changer PKMN (Oui/Non)' :
              `Autre (Y:${ramData.topMenuY}, X:${ramData.topMenuX})`
            ) : `(Hors Combat)`}
          </span>
        </div>

        {/* Overworld Coordinates */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Coords X,Y</span>
            <span className="opacity-60">{hexFormat(ramData.playerX)},{hexFormat(ramData.playerY)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            X: {ramData.playerX} | Y: {ramData.playerY}
          </span>
        </div>

        {/* Battle HP */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>HP Combat (D015)</span>
            <span className="opacity-60">[{hexFormat(ramData.hpAddr, 4)}]</span>
          </span>
          <span className="font-bold text-emerald-300">
            {ramData.hp} / {ramData.maxHp}
          </span>
        </div>

        {/* Party Count */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>Équipe (D163)</span>
            <span className="opacity-60">{hexFormat(ramData.partyCount)}</span>
          </span>
          <span className="font-bold text-emerald-300">
            {ramData.partyCount} Pokémon(s)
          </span>
        </div>
        
        {/* Party Mon 1 HP */}
        <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
          <span className="text-emerald-700 uppercase font-bold flex justify-between">
            <span>HP Slot 1 (D16C)</span>
          </span>
          <span className="font-bold text-emerald-300">
            {ramData.party1Hp} / {ramData.party1MaxHp}
          </span>
        </div>

        {/* Hex Dumps for debugging */}
        <div className="col-span-2 mt-2 pt-2 border-t border-emerald-900/50 flex flex-col gap-2">
          <div className="text-[9px] leading-tight text-emerald-600/80 break-all">
            <strong className="text-emerald-500">D000-D02F:</strong>{' '}
            {ramData.dumpD000.map((b) => b.toString(16).padStart(2, '0')).join(' ')}
          </div>
          <div className="text-[9px] leading-tight text-emerald-600/80 break-all">
            <strong className="text-emerald-500">D150-D17F:</strong>{' '}
            {ramData.dumpD150.map((b) => b.toString(16).padStart(2, '0')).join(' ')}
          </div>
        </div>

      </div>
    </div>
  );
}
