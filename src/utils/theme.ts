import { AppTheme } from '../emulator/types';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  subtitle: string;
  previewColor: string;
  bgClass: string;
  bgGradient: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  glowColor: string;
}

export const APP_THEMES: ThemeConfig[] = [
  {
    id: 'atomic-purple',
    name: 'Violet Atomique',
    subtitle: 'Néon violet vibrant et atmosphère cosmique (Défaut)',
    previewColor: 'bg-violet-600 border-violet-400',
    bgClass: 'bg-[#090a12]',
    bgGradient: 'radial-gradient(ellipse 85% 85% at 50% -20%, rgba(139, 92, 246, 0.16), rgba(0, 0, 0, 0))',
    accentText: 'text-violet-400',
    accentBg: 'bg-violet-600',
    accentBorder: 'border-violet-500/50',
    glowColor: 'rgba(139, 92, 246, 0.3)'
  },
  {
    id: 'teal',
    name: 'Cyan Turquoise',
    subtitle: 'Lueurs cyan technologiques et fraîcheur turquoise',
    previewColor: 'bg-teal-500 border-teal-300',
    bgClass: 'bg-[#060e12]',
    bgGradient: 'radial-gradient(ellipse 85% 85% at 50% -20%, rgba(20, 184, 166, 0.16), rgba(0, 0, 0, 0))',
    accentText: 'text-teal-400',
    accentBg: 'bg-teal-600',
    accentBorder: 'border-teal-500/50',
    glowColor: 'rgba(20, 184, 166, 0.3)'
  },
  {
    id: 'yellow',
    name: 'Jaune Pikachu / Ambre',
    subtitle: 'Chaleur or et énergie électrique rétro',
    previewColor: 'bg-amber-500 border-amber-300',
    bgClass: 'bg-[#0e0d06]',
    bgGradient: 'radial-gradient(ellipse 85% 85% at 50% -20%, rgba(245, 158, 11, 0.16), rgba(0, 0, 0, 0))',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500',
    accentBorder: 'border-amber-500/50',
    glowColor: 'rgba(245, 158, 11, 0.3)'
  },
  {
    id: 'berry',
    name: 'Rouge Rubis / Framboise',
    subtitle: 'Éclat rouge carmin profond et framboise vive',
    previewColor: 'bg-rose-600 border-rose-400',
    bgClass: 'bg-[#120609]',
    bgGradient: 'radial-gradient(ellipse 85% 85% at 50% -20%, rgba(244, 63, 94, 0.16), rgba(0, 0, 0, 0))',
    accentText: 'text-rose-400',
    accentBg: 'bg-rose-600',
    accentBorder: 'border-rose-500/50',
    glowColor: 'rgba(244, 63, 94, 0.3)'
  },
  {
    id: 'classic-gray',
    name: 'Gris DMG 1989',
    subtitle: 'Nostalgie argentée et touches vert sauge vintage',
    previewColor: 'bg-stone-500 border-stone-300',
    bgClass: 'bg-[#0c0c0e]',
    bgGradient: 'radial-gradient(ellipse 85% 85% at 50% -20%, rgba(140, 160, 140, 0.14), rgba(0, 0, 0, 0))',
    accentText: 'text-stone-300',
    accentBg: 'bg-stone-600',
    accentBorder: 'border-stone-400/50',
    glowColor: 'rgba(160, 160, 160, 0.25)'
  },
  {
    id: 'midnight-oled',
    name: 'Noir OLED Minimal',
    subtitle: 'Noir absolu profond et accents métalliques discrets',
    previewColor: 'bg-zinc-800 border-zinc-500',
    bgClass: 'bg-black',
    bgGradient: 'none',
    accentText: 'text-zinc-200',
    accentBg: 'bg-zinc-700',
    accentBorder: 'border-zinc-600/50',
    glowColor: 'rgba(255, 255, 255, 0.1)'
  },
  {
    id: 'neon-pink',
    name: 'Cyber Magenta / Rose',
    subtitle: 'Ambiance cyberpunk synthwave et néon fuchsia',
    previewColor: 'bg-fuchsia-600 border-pink-400',
    bgClass: 'bg-[#120716]',
    bgGradient: 'radial-gradient(ellipse 85% 85% at 50% -20%, rgba(217, 70, 239, 0.18), rgba(0, 0, 0, 0))',
    accentText: 'text-fuchsia-400',
    accentBg: 'bg-fuchsia-600',
    accentBorder: 'border-fuchsia-500/50',
    glowColor: 'rgba(217, 70, 239, 0.3)'
  },
  {
    id: 'emerald-green',
    name: 'Vert Émeraude / Rayquaza',
    subtitle: 'Lumière émeraude mystique et vert profond',
    previewColor: 'bg-emerald-600 border-emerald-400',
    bgClass: 'bg-[#051109]',
    bgGradient: 'radial-gradient(ellipse 85% 85% at 50% -20%, rgba(16, 185, 129, 0.16), rgba(0, 0, 0, 0))',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-600',
    accentBorder: 'border-emerald-500/50',
    glowColor: 'rgba(16, 185, 129, 0.3)'
  }
];

export function getThemeConfig(themeId?: AppTheme): ThemeConfig {
  const found = APP_THEMES.find((t) => t.id === themeId);
  return found || APP_THEMES[0];
}
