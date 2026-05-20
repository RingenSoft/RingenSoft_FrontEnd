/**
 * Constantes globales compartidas entre componentes.
 * Centraliza valores que antes estaban duplicados en cada página.
 */

export const ESPECIES = ['ANCHOVETA', 'BONITO', 'CABALLA', 'JUREL'] as const;
export type Especie = typeof ESPECIES[number];

export const PUERTOS_COORDS: Record<string, [number, number]> = {
  TUMBES:        [-3.57,  -80.45],
  PAITA:         [-5.09,  -81.11],
  TALARA:        [-4.57,  -81.27],
  SECHURA:       [-5.56,  -80.82],
  CHICAMA:       [-7.70,  -79.45],
  SALAVERRY:     [-8.22,  -78.99],
  CHIMBOTE:      [-9.07,  -78.59],
  COISHCO:       [-9.01,  -78.58],
  CASMA:         [-9.47,  -78.32],
  HUARMEY:       [-10.07, -78.16],
  SUPE:          [-10.79, -77.78],
  HUACHO:        [-11.11, -77.60],
  CHANCAY:       [-11.56, -77.27],
  CALLAO:        [-12.05, -77.15],
  PUCUSANA:      [-12.47, -76.80],
  PISCO:         [-13.71, -76.22],
  TAMBO_DE_MORA: [-13.47, -76.19],
  ATICO:         [-16.23, -73.65],
  QUILCA:        [-16.72, -72.42],
  CAMANÃ:        [-16.62, -72.71],
  MOLLENDO:      [-17.02, -72.01],
  MATARANI:      [-17.00, -72.10],
  ILO:           [-17.64, -71.34],
};

export const DEFAULT_PUERTO = 'CHIMBOTE';
export const DEFAULT_ESPECIE: Especie = 'ANCHOVETA';

/** Colores de gráficos Chart.js (por especie en el mismo orden que ESPECIES) */
export const CHART_COLORS = ['#1D9E75', '#378ADD', '#F59E0B', '#E24B4A'] as const;

/** Devuelve un color hex según el FishScore (0-100). */
export function colorPorScore(score: number): string {
  if (score >= 70) return '#1D9E75';
  if (score >= 50) return '#F59E0B';
  if (score >= 30) return '#E97316';
  return '#E24B4A';
}

/** Devuelve clases Tailwind según el nivel de alerta. */
export function claseNivelAlerta(nivel: string): string {
  if (nivel === 'ROJO')     return 'bg-red-50 border-red-200 text-red-700';
  if (nivel === 'AMARILLO') return 'bg-yellow-50 border-yellow-200 text-yellow-700';
  return 'bg-green-50 border-green-200 text-green-700';
}
