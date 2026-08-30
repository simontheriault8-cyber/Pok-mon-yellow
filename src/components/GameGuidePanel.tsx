import React, { useEffect, useState } from 'react';
import { GameBoy } from '../emulator/gameboy';
import { GameGuideReader, GameGuideSnapshot } from '../services/gameGuideReader';
import { TYPE_COLORS, PokemonType } from '../services/pokemonData';
import {
  MapPin,
  Swords,
  ShieldAlert,
  Compass,
  Trophy,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';

interface GameGuidePanelProps {
  emulator: GameBoy | null;
}

export function GameGuidePanel({ emulator }: GameGuidePanelProps) {
  const [snapshot, setSnapshot] = useState<GameGuideSnapshot | null>(null);

  // Poll RAM guide data at 120ms intervals (lightweight, zero lag)
  useEffect(() => {
    if (!emulator) {
      setSnapshot(null);
      return;
    }

    const interval = setInterval(() => {
      const mmu = emulator.mmu;
      if (mmu) {
        const data = GameGuideReader.readSnapshot(mmu);
        if (data) {
          setSnapshot(data);
        }
      }
    }, 120);

    return () => clearInterval(interval);
  }, [emulator]);

  if (!snapshot) {
    return (
      <div
        id="game-guide-panel"
        className="w-full max-w-[540px] px-3 py-2 bg-zinc-950/90 border border-white/[0.08] rounded-xl text-zinc-400 text-xs flex items-center justify-between shadow-lg backdrop-blur-md select-none mt-1"
      >
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400 animate-spin" />
          <span className="font-medium text-zinc-300">Guide Kanto en direct</span>
        </div>
        <span className="text-[11px] text-zinc-500">En attente de la partie...</span>
      </div>
    );
  }

  const renderTypeBadge = (type: PokemonType, customText?: string) => {
    const style = TYPE_COLORS[type] || TYPE_COLORS['Normal'];
    return (
      <span
        key={type}
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${style.bg} ${style.text} ${style.border} tracking-wide`}
      >
        {customText || type}
      </span>
    );
  };

  // =========================================================================
  // 1. COMBAT ACTIF (BATTLE GUIDE)
  // =========================================================================
  if (snapshot.mode === 'battle' && snapshot.battleData?.isInBattle) {
    const { playerMon, enemyMon, tacticalAdvice, battleType } = snapshot.battleData;

    return (
      <div
        id="game-guide-panel"
        className="w-full max-w-[540px] bg-zinc-950/95 border border-white/[0.1] rounded-2xl p-3 text-zinc-100 shadow-xl backdrop-blur-lg select-none space-y-2.5 mt-1"
      >
        {/* Battle Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
              <Swords className="w-3.5 h-3.5" />
              {battleType === 'trainer' ? 'Combat Dresseur' : 'Combat Pokémon Sauvage'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.06]">
            Analyse Tactique
          </span>
        </div>

        {/* Combatants Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Active Player Pokémon */}
          {playerMon && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                  Votre Pokémon
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Niv. {playerMon.level}</span>
              </div>
              <div className="font-extrabold text-sm text-zinc-100 truncate">{playerMon.name}</div>
              <div className="flex items-center gap-1 flex-wrap">
                {renderTypeBadge(playerMon.type1)}
                {playerMon.type2 && renderTypeBadge(playerMon.type2)}
              </div>

              {/* HP Bar */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex justify-between text-[10px] font-mono font-medium text-zinc-300">
                  <span>PV</span>
                  <span>
                    {playerMon.curHp}/{playerMon.maxHp}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      playerMon.hpPercent > 50
                        ? 'bg-emerald-500'
                        : playerMon.hpPercent > 20
                        ? 'bg-amber-500'
                        : 'bg-rose-500 animate-pulse'
                    }`}
                    style={{ width: `${playerMon.hpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Opponent Pokémon */}
          {enemyMon && (
            <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">
                  Adversaire
                </span>
                <span className="text-[10px] font-mono text-rose-300">Niv. {enemyMon.level}</span>
              </div>
              <div className="font-extrabold text-sm text-zinc-100 truncate">{enemyMon.name}</div>
              <div className="flex items-center gap-1 flex-wrap">
                {renderTypeBadge(enemyMon.type1)}
                {enemyMon.type2 && renderTypeBadge(enemyMon.type2)}
                {enemyMon.statusStr !== 'Normal' && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40">
                    {enemyMon.statusStr}
                  </span>
                )}
              </div>

              {/* Opponent HP Bar */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex justify-between text-[10px] font-mono font-medium text-zinc-300">
                  <span>PV Restants</span>
                  <span>{enemyMon.hpPercent}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      enemyMon.hpPercent > 50
                        ? 'bg-emerald-500'
                        : enemyMon.hpPercent > 20
                        ? 'bg-amber-500'
                        : 'bg-rose-500 animate-pulse'
                    }`}
                    style={{ width: `${enemyMon.hpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Type Matchup & Strengths/Weaknesses Section */}
        {enemyMon && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 space-y-2">
            {/* Weaknesses to exploit */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Faiblesses adverses (Attaques très efficaces) :</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pl-5">
                {enemyMon.matchupReport.weaknesses.length > 0 ? (
                  enemyMon.matchupReport.weaknesses.map((w) => (
                    <span key={w.type} className="flex items-center gap-1">
                      {renderTypeBadge(w.type)}
                      {w.multiplier >= 4 && (
                        <span className="text-[9px] font-extrabold text-rose-400 font-mono bg-rose-500/20 px-1 py-0.2 rounded border border-rose-500/30">
                          x4!
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-zinc-400 italic">Aucune faiblesse majeure</span>
                )}
              </div>
            </div>

            {/* Resistances & Immunities to avoid */}
            {(enemyMon.matchupReport.resistances.length > 0 || enemyMon.matchupReport.immunities.length > 0) && (
              <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
                  <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Résistances & Immunités (Attaques à éviter) :</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pl-5">
                  {enemyMon.matchupReport.immunities.map((imm) => (
                    <span key={imm} className="flex items-center gap-1">
                      {renderTypeBadge(imm)}
                      <span className="text-[9px] font-bold text-zinc-400 font-mono bg-zinc-800 px-1 py-0.2 rounded">
                        0x (Inutile)
                      </span>
                    </span>
                  ))}
                  {enemyMon.matchupReport.resistances.map((r) => (
                    <span key={r.type} className="flex items-center gap-1">
                      {renderTypeBadge(r.type)}
                      <span className="text-[9px] font-medium text-zinc-400 font-mono">0.5x</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tactical Advice banner */}
            {tacticalAdvice.length > 0 && (
              <div className="mt-1 pt-1.5 border-t border-white/[0.04] text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>{tacticalAdvice[0]}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. EXPLORATION OVERWORLD (LOCATION / ROUTE / GYM GUIDE)
  // =========================================================================
  const { overworldData } = snapshot;
  if (!overworldData) return null;

  const { mapName, locationCategory, wildEncounters, gymLeader, playerX, playerY, description } =
    overworldData;

  return (
    <div
      id="game-guide-panel"
      className="w-full max-w-[540px] bg-zinc-950/95 border border-white/[0.1] rounded-2xl p-3 text-zinc-100 shadow-xl backdrop-blur-lg select-none space-y-2.5 mt-1"
    >
      {/* Top Location Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-zinc-100 flex items-center gap-1.5">
              <span>{mapName}</span>
            </div>
            <div className="text-[10px] text-zinc-400 capitalize flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-300 font-medium">
                {locationCategory === 'route'
                  ? 'Zone Sauvage / Route'
                  : locationCategory === 'city'
                  ? 'Ville Principale'
                  : locationCategory === 'dungeon'
                  ? 'Grotte / Donjon'
                  : locationCategory === 'pokecenter'
                  ? 'Centre Pokémon'
                  : 'Bâtiment / Intérieur'}
              </span>
              <span>• Coords : ({playerX}, {playerY})</span>
            </div>
          </div>
        </div>
      </div>

      {/* CASE 1: ROUTE OR WILD ENCOUNTERS CARD */}
      {wildEncounters && wildEncounters.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pokémon Sauvages de la Zone</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-normal">Taux d'apparition</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {wildEncounters.map((mon, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-xs hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-extrabold text-zinc-200 truncate">{mon.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{mon.levels}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex gap-1">
                    {mon.types.map((t) => renderTypeBadge(t))}
                  </div>
                  <span className="text-[10px] font-bold font-mono text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded">
                    {mon.chance}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CASE 2: CITY GYM LEADER CARD */}
      {gymLeader && (
        <div className="bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-xl p-3 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>Arène Officielle : {gymLeader.leaderName}</span>
                </div>
                <div className="text-[10px] text-zinc-300 font-medium">
                  {gymLeader.badgeName} • Spécialité : {gymLeader.primaryType}
                </div>
              </div>
            </div>
            {renderTypeBadge(gymLeader.primaryType, `Type ${gymLeader.primaryType}`)}
          </div>

          {/* Leader Team */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Équipe de l'Arène :</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gymLeader.team.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-semibold"
                >
                  <span className="text-zinc-100">{m.name}</span>
                  <span className="text-[10px] font-mono text-amber-300">Niv. {m.level}</span>
                  <div className="flex gap-0.5 ml-0.5">
                    {m.types.map((t) => renderTypeBadge(t))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses to exploit */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Types recommandés (Faiblesses clés) :</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap pl-4">
              {gymLeader.weaknesses.map((w) => renderTypeBadge(w))}
            </div>
          </div>

          {/* Tactics Tip */}
          <div className="p-2 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] text-zinc-300 flex items-start gap-1.5 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>{gymLeader.tactics}</span>
          </div>
        </div>
      )}

      {/* CASE 3: INDOORS / POKECENTER / OTHER INTEREST */}
      {!wildEncounters && !gymLeader && description && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 text-xs text-zinc-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{description}</span>
        </div>
      )}
    </div>
  );
}
