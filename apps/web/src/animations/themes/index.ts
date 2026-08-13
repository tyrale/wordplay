/**
 * Animation Themes Index
 * 
 * Exports all available animation themes for the WordPlay game.
 */

export { defaultTheme } from './default';
export { fallingTheme } from './falling';

import { defaultTheme } from './default';
import { fallingTheme } from './falling';
import type { AnimationTheme } from '../types';

export const allThemes: AnimationTheme[] = [
  defaultTheme,
  fallingTheme
];

export const getThemeByName = (name: string): AnimationTheme | undefined => {
  return allThemes.find(theme => theme.name === name);
};

export const getDefaultTheme = (): AnimationTheme => {
  return defaultTheme;
}; 