import { useEffect, useState, useRef, useCallback } from 'react';
import { GameBoy } from './emulator/gameboy';
import { RomItem, SpeedMultiplier } from './emulator/types';
import { StorageService, AppSettings, DEFAULT_SETTINGS } from './services/storage';
import { useGamepad } from './services/gamepad';
import { getThemeConfig } from './utils/theme';

import { GbcDisplay } from './components/GbcDisplay';
import { TouchOverlay } from './components/TouchOverlay';
import { ControlBar } from './components/ControlBar';
import { SaveStateModal } from './components/SaveStateModal';
import { RomLibraryModal } from './components/RomLibraryModal';
import { SettingsModal } from './components/SettingsModal';
import { CastGamepadView } from './components/CastGamepadView';
import { CastModal } from './components/CastModal';
import { TvReceiver } from './components/TvReceiver';
import { CastService } from './services/cast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SimpleTrainerBot, BotLogEntry, TrainerBotState, TrainerBotMode, BOT_MODES } from './services/simpleTrainerBot';
import { BotLogModal } from './components/BotLogModal';

export default function App() {
  // Check if running as Dedicated TV Screen Receiver
  const isTvReceiverMode = typeof window !== 'undefined' && window.location.search.includes('mode=tv-receiver');

  if (isTvReceiverMode) {
    return <TvReceiver />;
  }
  // Emulator instance
  const [emulator, setEmulator] = useState<GameBoy | null>(null);
  const [currentRom, setCurrentRom] = useState<RomItem | null>(null);
  const [savedRoms, setSavedRoms] = useState<RomItem[]>([]);

  // Simple Trainer Bot state & Live Decision Logs
  const trainerBotRef = useRef<SimpleTrainerBot>(new SimpleTrainerBot());
  const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
  const [botState, setBotState] = useState<TrainerBotState>('idle');
  const [botMode, setBotMode] = useState<TrainerBotMode>(() => {
    try {
      const saved = localStorage.getItem('pokemon_yellow_bot_mode');
      if (saved === 'continuous_battle' || saved === 'train_slot_1') return saved;
    } catch (e) {
      console.error(e);
    }
    return 'continuous_battle';
  });
  const [botLogs, setBotLogs] = useState<BotLogEntry[]>([]);
  const [showBotLogModal, setShowBotLogModal] = useState<boolean>(false);
  const showBotLogModalRef = useRef<boolean>(false);
  showBotLogModalRef.current = showBotLogModal;

  const handleOpenBotLogs = useCallback(() => {
    setBotLogs(trainerBotRef.current.getLogs());
    setShowBotLogModal(true);
  }, []);

  // Settings & App State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [speed, setSpeed] = useState<SpeedMultiplier>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCasting, setIsCasting] = useState<boolean>(false);
  const [showCastModal, setShowCastModal] = useState<boolean>(false);
  const remoteWindowRef = useRef<Window | null>(null);

  // Modals
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showRomLibrary, setShowRomLibrary] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isCustomizingTouch, setIsCustomizingTouch] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show floating notification toast on screen
  const showToast = useCallback((msg: string) => {
    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    setNotification(msg);
    notifTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 2800);
  }, []);

  // Initialize Emulator & Load Settings
  useEffect(() => {
    const gb = new GameBoy();

    // Auto-save battery SRAM to IndexedDB when game writes to save data
    gb.onSramModified = async (sram) => {
      if (currentRom) {
        await StorageService.saveSram(currentRom.id, sram);
      }
    };

    // Unlock Web Audio on first user interaction (touch, click, key) for iOS/Android
    const unlockAudio = () => {
      gb.apu.unlockAudio();
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    // Sync fullscreen state
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    setEmulator(gb);
    trainerBotRef.current.setEmulator(gb);
    trainerBotRef.current.setMode(botMode);
    trainerBotRef.current.onStateChange = (running, state) => {
      setIsBotRunning(running);
      setBotState(state);
    };
    trainerBotRef.current.onModeChange = (mode) => {
      setBotMode(mode);
    };
    trainerBotRef.current.onLogsUpdate = (logs) => {
      if (showBotLogModalRef.current) {
        setBotLogs(logs);
      }
    };

    // Load initial settings & stored ROMs in a single clean pass
    const initStorage = async () => {
      try {
        const [loadedSettings, roms] = await Promise.all([
          StorageService.loadSettings(),
          StorageService.getSavedRoms()
        ]);

        setSettings(loadedSettings);
        gb.apu.setVolume(loadedSettings.volume);
        gb.apu.setMuted(loadedSettings.isMuted);
        setSavedRoms(roms);

        // Auto-load last saved ROM if available
        const defaultRom = roms.length > 0 ? roms[0] : null;
        if (defaultRom) {
          const savedSram = await StorageService.getSram(defaultRom.id);
          gb.loadROM(defaultRom.data, savedSram || undefined);
          setCurrentRom(defaultRom);
        }
      } catch (err) {
        console.error('Erreur initialisation stockage:', err);
      }
    };

    initStorage();

    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      gb.stop();
    };
  }, []);

  // Gamepad integration
  const { isConnected: gamepadConnected } = useGamepad(emulator, (turboActive) => {
    if (turboActive) {
      handleSpeedChange(4);
    } else {
      handleSpeedChange(1);
    }
  });

  // Load a ROM into emulator
  const handleLoadRom = async (rom: RomItem, targetGb?: GameBoy) => {
    const gb = targetGb || emulator;
    if (!gb) return;

    // Load persistent battery SRAM if present
    const savedSram = await StorageService.getSram(rom.id);
    gb.loadROM(rom.data, savedSram || undefined);

    setCurrentRom(rom);
    setIsPaused(false);

    // Update lastPlayed in background without blocking emulation loop or triggering cascading renders
    const now = Date.now();
    const updatedRom = { ...rom, lastPlayed: now };
    setSavedRoms(prev => prev.map(r => r.id === rom.id ? { ...r, lastPlayed: now } : r));
    StorageService.saveRom(updatedRom).catch(console.error);

    showToast(`🎮 "${rom.title}" prêt!`);
  };

  // Delete a ROM from storage and immediately unload if currently running
  const handleDeleteRom = async (romId: string) => {
    await StorageService.deleteRom(romId);
    const remainingRoms = await StorageService.getSavedRoms();
    setSavedRoms(remainingRoms);

    // If the deleted ROM is currently running, unload it immediately!
    if (currentRom?.id === romId) {
      if (emulator) {
        emulator.unloadROM();
      }
      setCurrentRom(null);

      // If there are other saved ROMs, load the next one
      if (remainingRoms.length > 0) {
        handleLoadRom(remainingRoms[0]);
      }
    }
  };

  // Speed Multiplier Controller (1x, 2x, 4x, 8x)
  const handleSpeedChange = (newSpeed: SpeedMultiplier) => {
    setSpeed(newSpeed);
    if (emulator) {
      emulator.setSpeed(newSpeed);
    }
    showToast(`⚡ Vitesse réglée à ${newSpeed}x`);
  };

  // Play / Pause Toggle
  const handleTogglePlayPause = () => {
    if (!emulator || !currentRom) return;
    if (emulator.isPaused) {
      emulator.resume();
      setIsPaused(false);
      showToast('▶️ Partie reprise');
    } else {
      emulator.pause();
      setIsPaused(true);
      showToast('⏸️ En pause');
    }
  };

  // Reset Game
  const handleReset = () => {
    if (!emulator || !currentRom) return;
    handleLoadRom(currentRom);
    showToast('🔄 Jeu redémarré');
  };

  // Real-time Quick Save (Slot 0)
  const handleQuickSave = async () => {
    if (!emulator || !currentRom) return;
    const captureFn = (window as unknown as { __gbcCaptureScreenshot?: () => string }).__gbcCaptureScreenshot;
    const screenshot = captureFn ? captureFn() : '';
    const state = emulator.createSaveState(screenshot);
    if (state) {
      await StorageService.saveSaveState(currentRom.id, 0, state);
      showToast('💾 Partie sauvegardée !');
    }
  };

  // Real-time Quick Load (Slot 0)
  const handleQuickLoad = async () => {
    if (!emulator || !currentRom) return;
    const states = await StorageService.getSaveStates(currentRom.id);
    const quickState = states.find((s) => s.slot === 0);
    if (quickState && emulator.loadSaveState(quickState.state)) {
      showToast('▶️ Partie reprise !');
    } else {
      showToast('⚠️ Aucune sauvegarde trouvée');
    }
  };

  // Capture Screenshot
  const handleScreenshot = () => {
    const captureFn = (window as unknown as { __gbcCaptureScreenshot?: () => string }).__gbcCaptureScreenshot;
    if (captureFn) {
      const dataUrl = captureFn();
      if (dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `gbc_screenshot_${currentRom?.title || 'game'}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('📸 Capture d\'écran enregistrée!');
      }
    }
  };

  // Volume & Audio
  const handleVolumeChange = (vol: number) => {
    const newSettings = { ...settings, volume: vol, isMuted: false };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    if (emulator) {
      emulator.apu.setVolume(vol);
      emulator.apu.setMuted(false);
    }
  };

  const handleToggleMute = () => {
    const newMute = !settings.isMuted;
    const newSettings = { ...settings, isMuted: newMute };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    if (emulator) {
      emulator.apu.setMuted(newMute);
    }
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Button Press Dispatcher (from shell or touch)
  const handleButtonDown = (btn: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select' | 'turboA' | 'turboB') => {
    if (!emulator) return;
    if (btn === 'turboA') {
      emulator.setTurbo('a', true);
    } else if (btn === 'turboB') {
      emulator.setTurbo('b', true);
    } else {
      emulator.setJoypad(btn, true);
    }
  };

  const handleButtonUp = (btn: 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select' | 'turboA' | 'turboB') => {
    if (!emulator) return;
    if (btn === 'turboA') {
      emulator.setTurbo('a', false);
    } else if (btn === 'turboB') {
      emulator.setTurbo('b', false);
    } else {
      emulator.setJoypad(btn, false);
    }
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const kb = settings.keyBindings;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling on game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }

      if (kb.up?.includes(e.code)) handleButtonDown('up');
      if (kb.down?.includes(e.code)) handleButtonDown('down');
      if (kb.left?.includes(e.code)) handleButtonDown('left');
      if (kb.right?.includes(e.code)) handleButtonDown('right');
      if (kb.a?.includes(e.code)) handleButtonDown('a');
      if (kb.b?.includes(e.code)) handleButtonDown('b');
      if (kb.turboA?.includes(e.code)) handleButtonDown('turboA');
      if (kb.turboB?.includes(e.code)) handleButtonDown('turboB');
      if (kb.start?.includes(e.code)) handleButtonDown('start');
      if (kb.select?.includes(e.code)) handleButtonDown('select');

      if (kb.fastForward?.includes(e.code)) handleSpeedChange(speed === 4 ? 1 : 4);
      if (kb.quickSave?.includes(e.code)) handleQuickSave();
      if (kb.quickLoad?.includes(e.code)) handleQuickLoad();
      if (kb.pause?.includes(e.code)) handleTogglePlayPause();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (kb.up?.includes(e.code)) handleButtonUp('up');
      if (kb.down?.includes(e.code)) handleButtonUp('down');
      if (kb.left?.includes(e.code)) handleButtonUp('left');
      if (kb.right?.includes(e.code)) handleButtonUp('right');
      if (kb.a?.includes(e.code)) handleButtonUp('a');
      if (kb.b?.includes(e.code)) handleButtonUp('b');
      if (kb.turboA?.includes(e.code)) handleButtonUp('turboA');
      if (kb.turboB?.includes(e.code)) handleButtonUp('turboB');
      if (kb.start?.includes(e.code)) handleButtonUp('start');
      if (kb.select?.includes(e.code)) handleButtonUp('select');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings.keyBindings, speed, emulator, currentRom]);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  // Auto-Trainer Bot Mode Change
  const handleBotModeChange = (mode: TrainerBotMode) => {
    setBotMode(mode);
    trainerBotRef.current.setMode(mode);
    try {
      localStorage.setItem('pokemon_yellow_bot_mode', mode);
    } catch (e) {
      console.error(e);
    }
    const modeInfo = BOT_MODES.find((m) => m.id === mode);
    showToast(`🤖 Mode Bot : ${modeInfo?.name || mode}`);
  };

  // Auto-Trainer Bot Toggle
  const handleToggleBot = () => {
    const willStart = !isBotRunning;
    trainerBotRef.current.toggle();
    if (willStart) {
      setShowBotLogModal(false);
      setShowSettings(false);
      const modeInfo = BOT_MODES.find((m) => m.id === botMode);
      showToast(`🟢 Bot activé ! Mode : ${modeInfo?.name || botMode}`);
    } else {
      showToast('⏹️ Bot arrêté');
    }
  };

  // Chromecast / Remote TV Cast Handler (Presentation API + Google Cast + Window Mirroring)
  const handleToggleCast = async () => {
    if (isCasting) {
      CastService.stopCast();
      setIsCasting(false);
      showToast('📺 Diffusion TV arrêtée');
      return;
    }

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      showToast('⚠️ Lancez une partie avant de diffuser sur TV');
      return;
    }

    setShowCastModal(true);
  };

  const handleStartTvWindowDirect = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      CastService.openTvScreen(canvas, currentRom?.title || 'Game Boy Color');
      setIsCasting(true);
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      showToast('📺 Écran TV ouvert ! Smartphone en mode manette.');
    }
  };

  // Sync Cast status changes & remote gamepad inputs
  useEffect(() => {
    const unsubStatus = CastService.subscribe((status) => {
      setIsCasting(status.isCasting);
    });

    const unsubInput = CastService.onGamepadInput((button, isDown) => {
      if (isDown) {
        handleButtonDown(button as any);
      } else {
        handleButtonUp(button as any);
      }
    });

    return () => {
      unsubStatus();
      unsubInput();
    };
  }, [handleButtonDown, handleButtonUp]);

  const currentTheme = getThemeConfig(settings.shellColor);

  return (
    <div
      ref={containerRef}
      id="gbc-app-root"
      className={`min-h-screen w-full ${currentTheme.bgClass} text-zinc-100 flex flex-col font-sans selection:bg-violet-600 selection:text-white relative overflow-hidden transition-colors duration-300`}
      style={{ backgroundImage: currentTheme.bgGradient }}
    >
      {/* Background Subtle Grid Effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Top Application Control Toolbar */}
      <ControlBar
        isRunning={!!emulator?.isRunning}
        isPaused={isPaused}
        speed={speed}
        volume={settings.volume}
        isMuted={settings.isMuted}
        hasRom={!!currentRom}
        currentRom={currentRom}
        currentRomTitle={currentRom?.title || null}
        gamepadConnected={gamepadConnected}
        isFullscreen={isFullscreen}
        isCasting={isCasting}
        isBotRunning={isBotRunning}
        botMode={botMode}
        onBotModeChange={handleBotModeChange}
        onToggleBot={handleToggleBot}
        onOpenBotLogs={handleOpenBotLogs}
        onToggleCast={handleToggleCast}
        onPlayPause={handleTogglePlayPause}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onQuickSave={handleQuickSave}
        onQuickLoad={handleQuickLoad}
        onOpenSaveModal={() => setShowSaveModal(true)}
        onOpenRomLibrary={() => setShowRomLibrary(true)}
        onOpenSettings={() => setShowSettings(true)}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleFullscreen={handleToggleFullscreen}
        onScreenshot={handleScreenshot}
      />

      {/* Main Full-Screen Game Display Viewport - Aligned to top under ControlBar */}
      <main className="flex-1 w-full relative flex flex-col items-center justify-start bg-black overflow-hidden select-none p-0 m-0">
        <GbcDisplay
          emulator={emulator}
          filter={settings.videoFilter}
          speed={speed}
          notification={notification}
          isBotRunning={isBotRunning}
          botStartTime={trainerBotRef.current.getStartTime()}
          botMode={botMode}
          onOpenRomLibrary={() => setShowRomLibrary(true)}
        />
      </main>

      {/* Touchscreen Overlay Controls (Mobile / Tablet / Customizable) */}
      {!isCasting && (
        <TouchOverlay
          config={settings.touchConfig}
          onButtonDown={handleButtonDown}
          onButtonUp={handleButtonUp}
          isCustomizingLayout={isCustomizingTouch}
          onUpdatePosition={(dpadPos, actionPos) => {
            const updated = {
              ...settings,
              touchConfig: {
                ...settings.touchConfig,
                dpadPos,
                actionPos
              }
            };
            setSettings(updated);
            StorageService.saveSettings(updated);
          }}
        />
      )}

      {/* Dedicated Fullscreen Gamepad Controller View (When Casting to TV/Chromecast) */}
      {isCasting && (
        <CastGamepadView
          onButtonDown={handleButtonDown}
          onButtonUp={handleButtonUp}
          onStopCast={handleToggleCast}
          gameTitle={currentRom?.title}
          speed={speed}
          isPaused={isPaused}
          isMuted={settings.isMuted}
          onTogglePlayPause={handleTogglePlayPause}
          onCycleSpeed={() => {
            if (speed === 1) handleSpeedChange(2);
            else if (speed === 2) handleSpeedChange(4);
            else if (speed === 4) handleSpeedChange(8);
            else handleSpeedChange(1);
          }}
          onReset={handleReset}
          onToggleMute={handleToggleMute}
          hapticFeedback={Boolean(settings.touchConfig.haptics)}
        />
      )}

      {/* Floating Layout Customization Finish Button */}
      {isCustomizingTouch && (
        <div className="fixed bottom-8 inset-x-0 flex justify-center z-50 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => {
              setIsCustomizingTouch(false);
              showToast('✅ Emplacement des commandes tactiles enregistré!');
            }}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-extrabold text-sm shadow-[0_10px_25px_rgba(16,185,129,0.35)] transition-all cursor-pointer transform hover:scale-105 active:scale-95"
          >
            Terminer la personnalisation
          </button>
        </div>
      )}

      {/* Modals */}
      <ErrorBoundary fallbackTitle="Erreur dans les sauvegardes">
        <SaveStateModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          emulator={emulator}
          currentRomId={currentRom?.id || null}
          currentRomTitle={currentRom?.title || null}
          onNotify={showToast}
        />
      </ErrorBoundary>

      <ErrorBoundary fallbackTitle="Erreur dans la bibliothèque de ROMs">
        <RomLibraryModal
          isOpen={showRomLibrary}
          onClose={() => setShowRomLibrary(false)}
          savedRoms={savedRoms}
          onSelectRom={(rom) => handleLoadRom(rom)}
          onRefreshRoms={async () => {
            const roms = await StorageService.getSavedRoms();
            setSavedRoms(roms);
          }}
          onDeleteRom={handleDeleteRom}
          onNotify={showToast}
        />
      </ErrorBoundary>

      <ErrorBoundary fallbackTitle="Erreur dans les paramètres">
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onStartCustomizingTouch={() => setIsCustomizingTouch(true)}
          currentRom={currentRom}
          currentRomTitle={currentRom?.title || null}
          onOpenRomLibrary={() => setShowRomLibrary(true)}
        />
      </ErrorBoundary>

      <ErrorBoundary fallbackTitle="Erreur lors du Cast TV">
        <CastModal
          isOpen={showCastModal}
          onClose={() => setShowCastModal(false)}
          gameTitle={currentRom?.title || 'Game Boy Color'}
          onStartTvWindow={handleStartTvWindowDirect}
        />
      </ErrorBoundary>

      {/* Pokemon Yellow Trainer Bot Decisions & Actions Live Log Modal */}
      <ErrorBoundary fallbackTitle="Erreur dans le journal du bot">
        <BotLogModal
          isOpen={showBotLogModal}
          onClose={() => setShowBotLogModal(false)}
          logs={botLogs}
          isRunning={isBotRunning}
          botState={botState}
          botMode={botMode}
          onBotModeChange={handleBotModeChange}
          onToggleBot={handleToggleBot}
          onClearLogs={() => trainerBotRef.current.clearLogs()}
        />
      </ErrorBoundary>
    </div>
  );
}
