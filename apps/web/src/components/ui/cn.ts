import clsx, { type ClassValue } from 'clsx';

/**
 * Combina clases usando `clsx` manteniendo el orden estable que espera
 * `prettier-plugin-tailwindcss`. Es el helper canónico del sistema.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
