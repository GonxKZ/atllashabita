/**
 * Catálogo de comandos de la paleta ⌘K.
 *
 * Las acciones se modelan como datos planos para que la paleta pueda
 * indexarlas con búsqueda fuzzy y para que cualquier consumidor (tests,
 * documentación, telemetría) pueda inspeccionar el conjunto disponible
 * sin acoplarse a la UI.
 *
 * Las secciones se ordenan visualmente: primero los municipios para que el
 * usuario localice un destino concreto, después capas, después acciones de
 * navegación y por último atajos puros.
 */
import {
  Compass,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Map as MapIcon,
  PanelLeftOpen,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Telescope,
  type LucideIcon,
} from 'lucide-react';
import { NATIONAL_MUNICIPALITIES } from '../../data/national_mock';

/** Secciones de la paleta de comandos, ordenadas según prioridad UX. */
export type CommandSection = 'municipios' | 'capas' | 'acciones' | 'atajos';

export interface CommandItem {
  /** Identificador único usado para keys de React y telemetría. */
  readonly id: string;
  /** Sección a la que pertenece — controla la cabecera bajo la que aparece. */
  readonly section: CommandSection;
  /** Etiqueta visible al usuario (en español). */
  readonly title: string;
  /** Subtítulo opcional con contexto adicional (provincia, descripción). */
  readonly subtitle?: string;
  /** Icono Lucide que precede al ítem; sólo decorativo. */
  readonly icon?: LucideIcon;
  /** Atajo asociado, formateado para mostrarse en la fila. */
  readonly shortcut?: readonly string[];
  /** Términos extra que la búsqueda debe considerar (alias, sinónimos). */
  readonly keywords?: readonly string[];
  /** Acción a ejecutar al confirmar el ítem. Recibe el contexto inyectado. */
  readonly run: (context: CommandContext) => void;
}

/**
 * Servicios inyectados en cada acción de la paleta.
 *
 * Mantenerlo como interfaz desacopla los comandos de stores concretos:
 * `CommandPalette` resuelve estas funciones desde React Router y los
 * stores Zustand y se las pasa al `run` correspondiente.
 */
export interface CommandContext {
  readonly navigate: (path: string) => void;
  readonly setActiveLayer: (id: string) => void;
  readonly toggleSidebar: () => void;
  readonly toggleLegend: () => void;
  readonly toggleMiniMap: () => void;
  readonly focusTopbarSearch: () => void;
  readonly openShortcuts: () => void;
  readonly close: () => void;
}

/** Lista de capas que la paleta expone como acción rápida. */
export const COMMAND_LAYER_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'score', label: 'Score AtlasHabita' },
  { id: 'rent_price', label: 'Precio alquiler' },
  { id: 'income', label: 'Renta media' },
  { id: 'broadband', label: 'Banda ancha' },
  { id: 'services', label: 'Centros sanitarios' },
  { id: 'air_quality', label: 'Calidad del aire' },
  { id: 'mobility', label: 'Tiempo de commute' },
  { id: 'transit', label: 'Transporte público' },
  { id: 'climate', label: 'Temperatura media' },
];

const NAV_ACTIONS: readonly CommandItem[] = [
  {
    id: 'nav.inicio',
    section: 'acciones',
    title: 'Ir a Inicio',
    subtitle: 'Vuelve al panel resumen del Atelier.',
    keywords: ['home', 'dashboard'],
    icon: Sparkles,
    shortcut: ['G', 'H'],
    run: ({ navigate, close }) => {
      navigate('/');
      close();
    },
  },
  {
    id: 'nav.mapa',
    section: 'acciones',
    title: 'Abrir mapa nacional',
    subtitle: 'Vista geoespacial con tiles y filtros.',
    keywords: ['map', 'territorio'],
    icon: MapIcon,
    shortcut: ['G', 'M'],
    run: ({ navigate, close }) => {
      navigate('/mapa');
      close();
    },
  },
  {
    id: 'nav.ranking',
    section: 'acciones',
    title: 'Ver ranking nacional',
    subtitle: 'Lista paginada con filtros duros.',
    keywords: ['recomendador', 'recommender'],
    icon: Compass,
    shortcut: ['G', 'R'],
    run: ({ navigate, close }) => {
      navigate('/ranking');
      close();
    },
  },
  {
    id: 'nav.comparador',
    section: 'acciones',
    title: 'Abrir comparador',
    subtitle: 'Compara hasta 4 municipios uno frente a otro.',
    keywords: ['compare', 'comparison', 'compare municipios'],
    icon: LayoutGrid,
    shortcut: ['G', 'C'],
    run: ({ navigate, close }) => {
      navigate('/comparador');
      close();
    },
  },
  {
    id: 'nav.escenarios',
    section: 'acciones',
    title: 'Simular escenarios de pesos',
    subtitle: 'Reparte la importancia de cada criterio.',
    keywords: ['weights', 'simulador', 'pesos', 'sliders'],
    icon: SlidersHorizontal,
    shortcut: ['G', 'S'],
    run: ({ navigate, close }) => {
      navigate('/escenarios');
      close();
    },
  },
  {
    id: 'nav.sparql',
    section: 'acciones',
    title: 'Panel SPARQL',
    subtitle: 'Consultas técnicas sobre el grafo RDF.',
    keywords: ['sparql', 'rdf', 'avanzado'],
    icon: Telescope,
    shortcut: ['G', 'Q'],
    run: ({ navigate, close }) => {
      navigate('/sparql');
      close();
    },
  },
  {
    id: 'nav.cuenta',
    section: 'acciones',
    title: 'Mi cuenta',
    subtitle: 'Gestiona tu perfil, preferencias y datos.',
    keywords: ['account', 'perfil', 'preferencias'],
    icon: Settings2,
    shortcut: ['G', 'A'],
    run: ({ navigate, close }) => {
      navigate('/cuenta');
      close();
    },
  },
];

const SHORTCUT_ACTIONS: readonly CommandItem[] = [
  {
    id: 'shortcut.toggle-sidebar',
    section: 'atajos',
    title: 'Mostrar / ocultar barra lateral',
    subtitle: 'Libera espacio para el contenido.',
    icon: PanelLeftOpen,
    shortcut: ['Ctrl', 'B'],
    keywords: ['sidebar', 'panel lateral'],
    run: ({ toggleSidebar, close }) => {
      toggleSidebar();
      close();
    },
  },
  {
    id: 'shortcut.toggle-legend',
    section: 'atajos',
    title: 'Mostrar / ocultar leyenda',
    subtitle: 'Activa la legenda del mapa multicapa.',
    icon: Eye,
    shortcut: ['Ctrl', 'L'],
    keywords: ['legend', 'leyenda mapa'],
    run: ({ toggleLegend, close }) => {
      toggleLegend();
      close();
    },
  },
  {
    id: 'shortcut.toggle-minimap',
    section: 'atajos',
    title: 'Mostrar / ocultar mini-mapa',
    subtitle: 'Útil para orientarse al hacer zoom.',
    icon: EyeOff,
    shortcut: ['Ctrl', 'M'],
    keywords: ['minimap', 'mini mapa'],
    run: ({ toggleMiniMap, close }) => {
      toggleMiniMap();
      close();
    },
  },
  {
    id: 'shortcut.focus-search',
    section: 'atajos',
    title: 'Foco en buscador del topbar',
    subtitle: 'Empieza a escribir sin coger el ratón.',
    icon: Search,
    shortcut: ['/'],
    keywords: ['buscar', 'topbar search'],
    run: ({ focusTopbarSearch, close }) => {
      focusTopbarSearch();
      close();
    },
  },
  {
    id: 'shortcut.show-shortcuts',
    section: 'atajos',
    title: 'Mostrar todos los atajos',
    subtitle: 'Resumen completo de combinaciones.',
    icon: Sparkles,
    shortcut: ['?'],
    keywords: ['help', 'ayuda', 'atajos'],
    run: ({ openShortcuts, close }) => {
      openShortcuts();
      close();
    },
  },
];

/**
 * Construye el catálogo completo de comandos a partir del dataset nacional
 * y de las acciones / capas estáticas. La función es pura para que los tests
 * puedan invocarla con datasets fake sin tocar el módulo global.
 */
export function buildCommandCatalog(
  municipalities: ReadonlyArray<{
    id: string;
    name: string;
    province: string;
  }> = NATIONAL_MUNICIPALITIES
): readonly CommandItem[] {
  const municipios: readonly CommandItem[] = municipalities.slice(0, 80).map((entry) => ({
    id: `municipio.${entry.id}`,
    section: 'municipios' as const,
    title: entry.name,
    subtitle: `${entry.province} · Ver ficha completa`,
    icon: Compass,
    keywords: [entry.id, entry.province.toLowerCase()],
    run: ({ navigate, close }) => {
      navigate(`/territorio/${entry.id}`);
      close();
    },
  }));

  const capas: readonly CommandItem[] = COMMAND_LAYER_OPTIONS.map((option, index) => ({
    id: `layer.${option.id}`,
    section: 'capas' as const,
    title: `Activar capa: ${option.label}`,
    subtitle: 'Recolorea el mapa nacional con esta métrica.',
    icon: Layers,
    shortcut: index < 9 ? ['Ctrl', String(index + 1)] : undefined,
    keywords: ['capa', option.id],
    run: ({ setActiveLayer, navigate, close }) => {
      setActiveLayer(option.id);
      navigate('/mapa');
      close();
    },
  }));

  return [...municipios, ...capas, ...NAV_ACTIONS, ...SHORTCUT_ACTIONS];
}

/**
 * Devuelve un score de coincidencia entre un texto del catálogo y la query
 * tecleada por el usuario. Mayor es mejor; `0` significa "sin coincidencia".
 *
 * Reglas:
 *   - Coincidencia exacta (ignorando mayúsculas/acentos) puntúa 100.
 *   - Prefijo cuenta como 70.
 *   - Substring 40.
 *   - Coincidencia ordenada caracter a caracter (fuzzy clásico) 10 + bonus
 *     según proximidad de los caracteres.
 *
 * No se intenta clasificar tipograficamente: priorizamos predictibilidad
 * y simplicidad para que los tests sean estables.
 */
export function fuzzyScore(haystack: string, query: string): number {
  if (query.length === 0) return 1;
  const normalizedHay = normalize(haystack);
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) return 1;
  if (normalizedHay === normalizedQuery) return 100;
  if (normalizedHay.startsWith(normalizedQuery)) return 70;
  if (normalizedHay.includes(normalizedQuery)) return 40;

  let needleIdx = 0;
  let lastMatch = -1;
  let proximityPenalty = 0;
  for (let i = 0; i < normalizedHay.length && needleIdx < normalizedQuery.length; i += 1) {
    if (normalizedHay[i] === normalizedQuery[needleIdx]) {
      if (lastMatch >= 0) {
        proximityPenalty += i - lastMatch - 1;
      }
      lastMatch = i;
      needleIdx += 1;
    }
  }
  if (needleIdx < normalizedQuery.length) return 0;
  return Math.max(1, 30 - proximityPenalty);
}

/** Normaliza un texto para comparaciones estables (sin tildes ni mayúsculas). */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .trim();
}

/**
 * Filtra y ordena el catálogo según la query del usuario. Conserva
 * el orden original cuando la query está vacía.
 */
export function searchCommands(
  catalog: readonly CommandItem[],
  query: string
): readonly CommandItem[] {
  if (query.trim().length === 0) return catalog;
  const scored = catalog
    .map((item) => {
      const haystack = [item.title, item.subtitle ?? '', ...(item.keywords ?? [])].join(' ');
      return { item, score: fuzzyScore(haystack, query) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.item);
}

/**
 * Agrupa el catálogo por sección preservando el orden de aparición.
 * Muy útil para la paleta, que pinta encabezados por sección.
 */
export function groupBySection(
  items: readonly CommandItem[]
): ReadonlyArray<{ section: CommandSection; items: readonly CommandItem[] }> {
  const sections: CommandSection[] = ['municipios', 'capas', 'acciones', 'atajos'];
  return sections
    .map((section) => ({ section, items: items.filter((item) => item.section === section) }))
    .filter((group) => group.items.length > 0);
}

/** Etiquetas visibles para cada sección. */
export const SECTION_LABELS: Record<CommandSection, string> = {
  municipios: 'Municipios',
  capas: 'Capas del mapa',
  acciones: 'Acciones',
  atajos: 'Atajos',
};
