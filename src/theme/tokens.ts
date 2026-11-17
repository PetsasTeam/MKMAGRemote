/**
 * Design tokens for MAG Remote: a dark, quiet palette with one blue accent.
 * Screens and components read colours, radii and spacing from here.
 */
export const colors = {
  background: '#0B0D12',
  surface: '#141821',
  control: '#1A1E27',
  controlPressed: '#252B37',
  border: '#2A303C',
  text: '#E8EAF0',
  textSecondary: '#AEB4C2',
  textMuted: '#7C8394',
  accent: '#2F7BF6',
  accentPressed: '#2566D1',
  accentSoft: '#1F2A44',
  accentText: '#7FA8FF',
  success: '#3DDC97',
  danger: '#FF6B6B',
  dangerSoft: '#3A1F24',
  keyRed: '#E5484D',
  keyGreen: '#30A46C',
  keyYellow: '#F5D90A',
  keyBlue: '#3E63DD',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const type = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  caption: { fontSize: 12, color: colors.textMuted },
  label: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.3 },
} as const;
