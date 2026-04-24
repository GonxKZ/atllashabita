/**
 * Mock data para los primeros hitos del dashboard de AtlasHabita.
 *
 * Los municipios y coordenadas proceden de `data/seed/territories.csv` y
 * corresponden a centroides reales. Este fichero debe desaparecer cuando la
 * capa de servicios (`/api/map`, `/api/recommendations`, etc.) esté operativa;
 * entre tanto permite maquetar la UI sin acoplarse al backend.
 */

export type MapPoint = {
  /** Identificador INE del municipio. */
  id: string;
  /** Nombre del territorio mostrado al usuario. */
  name: string;
  /** Latitud WGS84 del centroide. */
  lat: number;
  /** Longitud WGS84 del centroide. */
  lon: number;
  /**
   * Indicador principal representado en el mapa (p.ej. renta bruta media,
   * precio de alquiler, etc.). Se expresa en euros cuando no se indica otra
   * unidad.
   */
  value: number;
  /**
   * Score agregado en el rango [0, 100]. Se usa para colorear el círculo en
   * una escala verde oscuro → verde claro.
   */
  score: number;
};

export type TrendPoint = {
  month: string;
  score: number;
  rentIndex: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: 'map' | 'sparkles' | 'chart' | 'bookmark' | 'users';
};

export type HighlightAttribute = {
  label: string;
  value: string;
};

export type Highlight = {
  id: string;
  name: string;
  region: string;
  headline: string;
  description: string;
  score: number;
  attributes: HighlightAttribute[];
};

/**
 * 10 municipios reales con centroides tomados de `data/seed/territories.csv`.
 * El orden refleja aproximadamente el ranking visible en la captura de
 * referencia.
 */
export const mockPoints: MapPoint[] = [
  {
    id: '20069',
    name: 'Donostia / San Sebastián',
    lat: 43.3183,
    lon: -1.9812,
    value: 1280,
    score: 92,
  },
  {
    id: '29067',
    name: 'Málaga',
    lat: 36.7213,
    lon: -4.4213,
    value: 950,
    score: 87,
  },
  {
    id: '41091',
    name: 'Sevilla',
    lat: 37.3886,
    lon: -5.9823,
    value: 820,
    score: 81,
  },
  {
    id: '20036',
    name: 'Irún',
    lat: 43.3384,
    lon: -1.7886,
    value: 870,
    score: 76,
  },
  {
    id: '29069',
    name: 'Marbella',
    lat: 36.5108,
    lon: -4.8824,
    value: 1120,
    score: 72,
  },
  {
    id: '20038',
    name: 'Hondarribia',
    lat: 43.36,
    lon: -1.7956,
    value: 910,
    score: 68,
  },
  {
    id: '41038',
    name: 'Dos Hermanas',
    lat: 37.2833,
    lon: -5.925,
    value: 720,
    score: 63,
  },
  {
    id: '29054',
    name: 'Fuengirola',
    lat: 36.5397,
    lon: -4.625,
    value: 980,
    score: 58,
  },
  {
    id: '41004',
    name: 'Alcalá de Guadaíra',
    lat: 37.3372,
    lon: -5.8428,
    value: 690,
    score: 49,
  },
  {
    id: '20071',
    name: 'Tolosa',
    lat: 43.1361,
    lon: -2.0783,
    value: 780,
    score: 41,
  },
];

export const mockTrends: TrendPoint[] = [
  { month: 'May', score: 62, rentIndex: 71 },
  { month: 'Jun', score: 64, rentIndex: 72 },
  { month: 'Jul', score: 66, rentIndex: 73 },
  { month: 'Ago', score: 68, rentIndex: 74 },
  { month: 'Sep', score: 70, rentIndex: 76 },
  { month: 'Oct', score: 71, rentIndex: 77 },
  { month: 'Nov', score: 73, rentIndex: 78 },
  { month: 'Dic', score: 74, rentIndex: 79 },
  { month: 'Ene', score: 75, rentIndex: 80 },
  { month: 'Feb', score: 78, rentIndex: 82 },
  { month: 'Mar', score: 81, rentIndex: 83 },
  { month: 'Abr', score: 84, rentIndex: 85 },
];

export const mockActivity: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Nuevo ranking para Donostia / San Sebastián',
    description: 'El score de calidad de vida subió 4 puntos tras la última ingesta del INE.',
    timestamp: 'hace 5 min',
    icon: 'sparkles',
  },
  {
    id: 'act-2',
    title: 'Capa de conectividad actualizada',
    description: 'Cobertura de fibra óptica re-procesada para 318 municipios.',
    timestamp: 'hace 42 min',
    icon: 'map',
  },
  {
    id: 'act-3',
    title: 'Tendencia de alquiler en Málaga',
    description: 'El precio medio creció un 1,8% mensual en el último trimestre.',
    timestamp: 'hace 2 h',
    icon: 'chart',
  },
  {
    id: 'act-4',
    title: 'Territorio guardado',
    description: 'Sevilla se añadió a tu lista “Candidatos 2026”.',
    timestamp: 'hace 1 d',
    icon: 'bookmark',
  },
  {
    id: 'act-5',
    title: '12 nuevos perfiles comparables',
    description: 'Detectamos municipios con patrón socioeconómico similar al tuyo.',
    timestamp: 'hace 2 d',
    icon: 'users',
  },
];

export const mockHighlight: Highlight = {
  id: '20069',
  name: 'Donostia / San Sebastián',
  region: 'Guipúzcoa · País Vasco',
  headline: 'Recomendación destacada para teletrabajo',
  description:
    'Combina conectividad de fibra casi universal, servicios cotidianos abundantes y un entorno natural excepcional frente al Cantábrico.',
  score: 92,
  attributes: [
    { label: 'Calidad de vida', value: 'Alta' },
    { label: 'Conectividad', value: '98% fibra' },
    { label: 'Alquiler medio', value: '1.280 €' },
    { label: 'Transporte', value: 'Excelente' },
  ],
};
