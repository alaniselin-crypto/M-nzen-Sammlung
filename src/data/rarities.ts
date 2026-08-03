export interface RarityOption {
  code: string;
  label: string;
  fullLabel: string;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeBorderClass: string;
  pillBg: string; // for form options or screenshot style
}

export const RARITY_OPTIONS: RarityOption[] = [
  {
    code: 'A',
    label: 'Häufig',
    fullLabel: 'A - Häufig',
    badgeBgClass: 'bg-emerald-500/20',
    badgeTextClass: 'text-emerald-300',
    badgeBorderClass: 'border-emerald-500/40',
    pillBg: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold'
  },
  {
    code: 'B',
    label: 'Nicht häufig',
    fullLabel: 'B - Nicht häufig',
    badgeBgClass: 'bg-fuchsia-500/20',
    badgeTextClass: 'text-fuchsia-300',
    badgeBorderClass: 'border-fuchsia-500/40',
    pillBg: 'bg-fuchsia-600 text-white font-semibold'
  },
  {
    code: 'C',
    label: 'Knapp',
    fullLabel: 'C - Knapp',
    badgeBgClass: 'bg-amber-600/25',
    badgeTextClass: 'text-amber-300',
    badgeBorderClass: 'border-amber-500/40',
    pillBg: 'bg-amber-700 text-white font-semibold'
  },
  {
    code: 'R',
    label: 'Selten',
    fullLabel: 'R - Selten',
    badgeBgClass: 'bg-red-600/25',
    badgeTextClass: 'text-red-300',
    badgeBorderClass: 'border-red-500/40',
    pillBg: 'bg-red-700 text-white font-semibold'
  },
  {
    code: 'RR',
    label: 'Sehr Selten',
    fullLabel: 'RR - Sehr Selten',
    badgeBgClass: 'bg-sky-500/20',
    badgeTextClass: 'text-sky-300',
    badgeBorderClass: 'border-sky-500/40',
    pillBg: 'bg-sky-200 text-sky-950 font-semibold'
  },
  {
    code: 'RRR',
    label: 'Äusserst selten',
    fullLabel: 'RRR - Äusserst selten',
    badgeBgClass: 'bg-blue-600/30',
    badgeTextClass: 'text-blue-200',
    badgeBorderClass: 'border-blue-500/50',
    pillBg: 'bg-blue-800 text-white font-semibold'
  }
];

export function getRarityOption(rarityVal?: string): RarityOption | null {
  if (!rarityVal) return null;
  return (
    RARITY_OPTIONS.find(
      r => r.fullLabel === rarityVal || r.code === rarityVal || rarityVal.startsWith(r.code + ' -')
    ) || null
  );
}
