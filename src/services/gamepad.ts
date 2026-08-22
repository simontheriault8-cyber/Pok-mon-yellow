import { useEffect, useRef, useState } from 'react';
import { GameBoy } from '../emulator/gameboy';

export function useGamepad(
  emulator: GameBoy | null,
  onFastForwardToggle?: (active: boolean) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const animRef = useRef<number | null>(null);
  const prevButtonStates = useRef<{ [btn: string]: boolean }>({});

  useEffect(() => {
    const handleConnected = (e: GamepadEvent) => {
      setIsConnected(true);
      console.log('Gamepad connected:', e.gamepad.id);
    };

    const handleDisconnected = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const anyConnected = Array.from(gamepads).some((g) => g !== null && g.connected);
      setIsConnected(anyConnected);
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    const pollGamepad = () => {
      if (emulator) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads.find((g) => g !== null && g.connected);

        if (gp) {
          if (!isConnected) setIsConnected(true);

          // D-Pad + Left Analog Stick
          const upPressed = (gp.buttons[12] && gp.buttons[12].pressed) || (gp.axes[1] && gp.axes[1] < -0.4);
          const downPressed = (gp.buttons[13] && gp.buttons[13].pressed) || (gp.axes[1] && gp.axes[1] > 0.4);
          const leftPressed = (gp.buttons[14] && gp.buttons[14].pressed) || (gp.axes[0] && gp.axes[0] < -0.4);
          const rightPressed = (gp.buttons[15] && gp.buttons[15].pressed) || (gp.axes[0] && gp.axes[0] > 0.4);

          // Standard Face Buttons (Xbox: A=0, B=1, X=2, Y=3 / Nintendo: B=0, A=1, Y=2, X=3)
          const aPressed = (gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[1] && gp.buttons[1].pressed);
          const bPressed = (gp.buttons[2] && gp.buttons[2].pressed) || (gp.buttons[3] && gp.buttons[3].pressed);

          // Turbo / Triggers
          const turboAPressed = (gp.buttons[5] && gp.buttons[5].pressed); // R1
          const turboBPressed = (gp.buttons[4] && gp.buttons[4].pressed); // L1

          // Select / Start
          const selectPressed = (gp.buttons[8] && gp.buttons[8].pressed);
          const startPressed = (gp.buttons[9] && gp.buttons[9].pressed);

          // Fast Forward Hold (R2 trigger / button 7)
          const fastForwardHold = (gp.buttons[7] && gp.buttons[7].pressed);
          if (onFastForwardToggle && prevButtonStates.current['fastForward'] !== fastForwardHold) {
            onFastForwardToggle(fastForwardHold);
            prevButtonStates.current['fastForward'] = fastForwardHold;
          }

          emulator.setJoypad('up', !!upPressed);
          emulator.setJoypad('down', !!downPressed);
          emulator.setJoypad('left', !!leftPressed);
          emulator.setJoypad('right', !!rightPressed);
          emulator.setJoypad('a', !!aPressed);
          emulator.setJoypad('b', !!bPressed);
          emulator.setTurbo('a', !!turboAPressed);
          emulator.setTurbo('b', !!turboBPressed);
          emulator.setJoypad('select', !!selectPressed);
          emulator.setJoypad('start', !!startPressed);
        }
      }

      animRef.current = requestAnimationFrame(pollGamepad);
    };

    animRef.current = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [emulator, isConnected, onFastForwardToggle]);

  return { isConnected };
}
