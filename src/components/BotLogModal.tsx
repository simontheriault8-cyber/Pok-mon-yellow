import { useState } from 'react';
import { Bot, Copy, Check, Trash2, X, Play, Pause, Swords, ShieldCheck, Terminal, Compass, Sparkles, ChevronDown } from 'lucide-react';
import { BotLogEntry, TrainerBotState, TrainerBotMode, BOT_MODES } from '../services/simpleTrainerBot';

interface BotLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: BotLogEntry[];
  isRunning: boolean;
  botState: TrainerBotState;
  botMode?: TrainerBotMode;
  onBotModeChange?: (mode: TrainerBotMode) => void;
  onToggleBot: () => void;
  onClearLogs: () => void;
}

export function BotLogModal({
  isOpen,
  onClose,
  logs,
  isRunning,
  botState,
  botMode = 'continuous_battle',
  onBotModeChange,
  onToggleBot,
  onClearLogs
}: BotLogModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLogs = async () => {
    if (logs.length === 0) return;

    const formattedText = [
      '========================================',
      '🤖 JOURNAL D\'ACTIONS DU BOT - POKÉMON YELLOW 151',
      `Date : ${new Date().toLocaleString()}`,
      `Statut : ${isRunning ? 'ACTIF (' + botState + ')' : 'INACTIF'}`,
      '========================================\n',
      ...logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`)
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie presse-papier:', err);
    }
  };

  const getLogBadge = (type: BotLogEntry['type']) => {
    switch (type) {
      case 'battle':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">COMBAT</span>;
      case 'move':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">ACTION</span>;
      case 'walk':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">CARTE</span>;
      case 'safety':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">SÉCURITÉ</span>;
      case 'stop':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">ARRÊT</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">INFO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-2xl bg-[#0e101a] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Journal & Décisions du Bot</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  Pokémon Jaune 151
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Surveillance en direct des adresses RAM et exécution automatique des actions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar & Quick Controls */}
        <div className="p-3 sm:px-5 bg-[#080910] border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-xs">
              <span className="text-zinc-400 font-medium">État :</span>
              {isRunning ? (
                botState === 'battling' ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5" /> Combat en cours
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" /> Exploration / Marche
                  </span>
                )
              ) : (
                <span className="text-zinc-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-500 mr-0.5" /> Inactif
                </span>
              )}
            </div>

            {/* Mode Tag */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-300 font-medium bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{botMode === 'train_slot_1' ? 'Mode Entraînement Slot 1' : 'Mode Combat Continu'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Start / Stop Toggle Button */}
            <button
              onClick={onToggleBot}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isRunning ? 'Arrêter le Bot' : 'Démarrer le Bot'}</span>
            </button>

            {/* Copy Logs Button */}
            <button
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                copied
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-white/[0.07] hover:bg-white/[0.12] text-zinc-200 border-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title="Copier tout le journal d'actions"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-zinc-950 font-black" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier le Log'}</span>
            </button>

            {/* Clear Logs Button */}
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Vider le journal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Strip */}
        <div className="px-4 py-2 bg-[#0c0e18] border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Changer de mode :</span>
            </span>
            <div className="relative">
              <select
                value={botMode}
                onChange={(e) => onBotModeChange?.(e.target.value as TrainerBotMode)}
                className="bg-[#15192c] hover:bg-[#1c223c] text-zinc-100 font-semibold text-xs py-1 px-2.5 pr-7 rounded-lg border border-emerald-500/30 focus:border-emerald-400 outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="continuous_battle">⚔️ Combat continu (Farming standard)</option>
                <option value="train_slot_1">🎓 Entraînement premier Pokémon (Switch vers dernier)</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400 opacity-80">
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 italic">
            {botMode === 'train_slot_1'
              ? 'T1 : Envoie Slot 1 pour l’EXP puis bascule sur le dernier Pokémon.'
              : 'Attaque continue avec le Pokémon de tête jusqu’au K.O.'}
          </span>
        </div>

        {/* Terminal Log Console */}
        <div className="flex-1 min-h-[300px] max-h-[480px] p-3 sm:p-4 overflow-y-auto font-mono text-[11px] sm:text-xs bg-[#06070c] space-y-2 select-text">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-2">
              <Terminal className="w-8 h-8 opacity-40" />
              <p className="font-sans text-sm">Le journal d'actions est actuellement vide.</p>
              <p className="text-xs text-zinc-600 max-w-sm">
                Activez le bot pour observer les lectures RAM en direct (0xD057 état combat, 0xD015 PV, 0xD02D PP).
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-colors"
              >
                <span className="text-zinc-500 shrink-0 select-none text-[10px] mt-0.5">[{log.time}]</span>
                <div className="shrink-0">{getLogBadge(log.type)}</div>
                <div className="flex-1 text-zinc-200 break-words leading-relaxed font-mono">
                  {log.message}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 px-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-zinc-400">
          <span className="font-mono">Total logs : {logs.length} entrées</span>
          <span className="text-zinc-500 text-[10px]">
            RAM Gen 1 Yellow : 0xD057 (Combat) • 0xD015 (PV) • 0xD02D (PP) • 0xD362 (X/Y)
          </span>
        </div>
      </div>
    </div>
  );
}
