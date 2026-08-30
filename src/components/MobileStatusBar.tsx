import { useState, useEffect } from 'react';
import { Battery, BatteryCharging, BatteryLow, BatteryMedium, BatteryWarning, Wifi } from 'lucide-react';

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => void) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => void) | null;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

export function MobileStatusBar() {
  const [timeStr, setTimeStr] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  // Update clock every minute (or every 5 seconds for instant minute sync)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, []);

  // Monitor real battery status via Web Battery API if available
  useEffect(() => {
    let batteryInstance: BatteryManager | null = null;

    const nav = navigator as NavigatorWithBattery;
    if (typeof nav.getBattery === 'function') {
      nav.getBattery().then((battery) => {
        batteryInstance = battery;

        const updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);
        };

        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {
        // Fallback if permission blocked
      });
    }

    return () => {
      if (batteryInstance) {
        batteryInstance.onlevelchange = null;
        batteryInstance.onchargingchange = null;
      }
    };
  }, []);

  const renderBatteryIcon = () => {
    if (isCharging) {
      return <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />;
    }
    if (batteryLevel === null) {
      return <Battery className="w-4 h-4 text-zinc-400" />;
    }
    if (batteryLevel <= 15) {
      return <BatteryLow className="w-4 h-4 text-rose-500 animate-pulse" />;
    }
    if (batteryLevel <= 40) {
      return <BatteryWarning className="w-4 h-4 text-amber-400" />;
    }
    if (batteryLevel <= 80) {
      return <BatteryMedium className="w-4 h-4 text-emerald-400" />;
    }
    return <Battery className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div
      id="mobile-status-bar"
      className="w-full flex sm:hidden items-center justify-between px-5 py-2.5 bg-black text-zinc-100 text-sm font-semibold select-none border-b border-white/[0.1] backdrop-blur-md z-30 shrink-0 min-h-[42px]"
    >
      {/* Current Time */}
      <div className="flex items-center gap-2 tracking-tight font-semibold text-zinc-100 text-sm">
        <span>{timeStr}</span>
      </div>

      {/* Network / Battery Information */}
      <div className="flex items-center gap-3">
        <Wifi className="w-4 h-4 text-zinc-300" />
        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-200">
          {batteryLevel !== null && <span className="text-xs font-semibold">{batteryLevel}%</span>}
          {renderBatteryIcon()}
        </div>
      </div>
    </div>
  );
}
