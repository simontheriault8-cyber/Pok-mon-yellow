import { useState, useEffect } from 'react';
import { CastService, CastStatus } from '../services/cast';
import {
  Tv,
  Cast,
  Smartphone,
  MonitorPlay,
  CheckCircle2,
  X,
  ExternalLink,
  Info,
  Radio
} from 'lucide-react';

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle?: string;
  onStartTvWindow: () => void;
}

export function CastModal({
  isOpen,
  onClose,
  gameTitle = 'Jeu Game Boy Color',
  onStartTvWindow
}: CastModalProps) {
  const [castStatus, setCastStatus] = useState<CastStatus>(CastService.getStatus());
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    return CastService.subscribe((status) => {
      setCastStatus(status);
    });
  }, []);

  if (!isOpen) return null;

  const handleGoogleCast = async () => {
    setIsConnecting(true);
    try {
      const ok = await CastService.requestGoogleCast();
      if (ok) {
        onClose();
      }
    } catch {
      // Ignored
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDirectScreen = () => {
    onStartTvWindow();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-[#0c0e18] border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)] text-zinc-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Cast className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Diffuser sur TV / Chromecast
              </h2>
              <p className="text-xs text-zinc-400">
                Affichez le jeu sur grand écran et utilisez ce smartphone comme manette
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* How it works diagram banner */}
        <div className="bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-purple-950/40 border border-violet-500/20 rounded-2xl p-4 flex items-center justify-around text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-11 h-11 rounded-2xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-violet-300 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-zinc-300">Votre Téléphone</span>
            <span className="text-[9px] text-violet-400 font-mono uppercase tracking-wider">Manette de jeu</span>
          </div>

          <div className="flex flex-col items-center gap-1 text-zinc-500">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono text-emerald-400">SYNC 60 FPS</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-md">
              <Tv className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-zinc-300">Votre Télévision</span>
            <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-wider">Écran de jeu HD</span>
          </div>
        </div>

        {/* Cast Options Grid */}
        <div className="grid grid-cols-1 gap-3">
          {/* Option 1: Chrome Tab Cast / Screen Mirroring (Guaranteed to stream canvas 60 FPS on Chromecast) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-purple-950/40 border border-violet-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center">
                  <Cast className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Diffusion Directe Chromecast
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Affichage 60 FPS + Audio synchronisé
                  </span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Recommandé
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Pour diffuser le jeu sur votre Chromecast sans écran noir :
            </p>
            
            <ol className="text-[11px] text-zinc-300/90 space-y-1.5 list-decimal list-inside bg-black/30 p-3 rounded-xl border border-white/5 font-medium">
              <li>Dans le menu de votre navigateur Chrome (les <strong>3 points en haut à droite ⋮</strong>), cliquez sur <strong>« Caster... » (ou « Diffuser... »)</strong>.</li>
              <li>Sélectionnez votre <strong>Chromecast / Télévision</strong> dans la liste.</li>
              <li>Le jeu s'affiche immédiatement en grand sur votre TV et votre téléphone devient la manette !</li>
            </ol>

            <button
              onClick={handleGoogleCast}
              disabled={isConnecting}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Cast className="w-4 h-4" />
              <span>Ouvrir le sélecteur Chromecast</span>
            </button>
          </div>

          {/* Option 2: Direct Ultra-HD Screen Window */}
          <button
            onClick={handleDirectScreen}
            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-cyan-500/50 transition-all cursor-pointer group active:scale-[0.99] text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center flex-shrink-0">
                <MonitorPlay className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Fenêtre Écran TV Plein Écran (Câble HDMI / AirPlay / 2e écran)
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Ouvre une fenêtre de jeu plein écran ultra-fluide pour écran externe ou câble HDMI.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Chromecast native button embedding if available */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span>
              Astuce : activez le mode <strong>Paysage</strong> sur votre smartphone pour une meilleure prise en main de la manette.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.08]">
          {castStatus.isCasting && (
            <button
              onClick={() => {
                CastService.stopCast();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              Arrêter la diffusion
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 text-xs font-bold transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
