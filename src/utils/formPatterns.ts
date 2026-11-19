export type FormPattern = 'grid' | 'dots' | 'lines' | 'orbits' | 'none';

export const formPatterns: { value: FormPattern; label: string; image: string; size: string }[] = [
  { value: 'none', label: 'Plain', image: 'none', size: 'auto' },
  { value: 'grid', label: 'Grid', image: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', size: '44px 44px' },
  { value: 'dots', label: 'Dots', image: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', size: '24px 24px' },
  { value: 'lines', label: 'Diagonal', image: 'repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 18px)', size: 'auto' },
  { value: 'orbits', label: 'Orbits', image: 'repeating-radial-gradient(circle at 80% 10%, transparent 0 38px, currentColor 39px 40px, transparent 41px 70px)', size: 'auto' },
];

export function getFormPattern(value?: string) {
  return formPatterns.find((pattern) => pattern.value === value) ?? formPatterns[1];
}
