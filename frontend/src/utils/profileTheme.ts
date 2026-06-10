export type ProfileThemeId = 'blue' | 'teal' | 'amber' | 'purple' | 'green';

export type ProfileTheme = {
  id: ProfileThemeId;
  label: string;
  bg: string;
  color: string;
};

export const PROFILE_THEMES: ProfileTheme[] = [
  { id: 'blue', label: 'Blue', bg: '#2e5ba8', color: '#ffffff' },
  { id: 'teal', label: 'Teal', bg: '#0f766e', color: '#ffffff' },
  { id: 'amber', label: 'Amber', bg: '#d97706', color: '#ffffff' },
  { id: 'purple', label: 'Purple', bg: '#7c3aed', color: '#ffffff' },
  { id: 'green', label: 'Green', bg: '#16a34a', color: '#ffffff' },
];

export const DEFAULT_PROFILE_THEME: ProfileThemeId = 'blue';

export function getProfileTheme(id?: string | null): ProfileTheme {
  return (
    PROFILE_THEMES.find((theme) => theme.id === id) ??
    PROFILE_THEMES.find((theme) => theme.id === DEFAULT_PROFILE_THEME)!
  );
}
