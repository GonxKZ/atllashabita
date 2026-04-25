import { describe, expect, it, vi } from 'vitest';
import {
  buildCommandCatalog,
  fuzzyScore,
  groupBySection,
  normalize,
  searchCommands,
} from '../items';

describe('normalize', () => {
  it('elimina tildes y mayúsculas', () => {
    expect(normalize('Málaga')).toBe('malaga');
    expect(normalize('  CóRDoBa ')).toBe('cordoba');
  });
});

describe('fuzzyScore', () => {
  it('puntúa coincidencias exactas como 100', () => {
    expect(fuzzyScore('Madrid', 'madrid')).toBe(100);
  });

  it('puntúa prefijos y sustrings', () => {
    expect(fuzzyScore('Sevilla capital', 'sev')).toBe(70);
    expect(fuzzyScore('Comparador territorial', 'territ')).toBe(40);
  });

  it('admite coincidencias dispersas (fuzzy)', () => {
    expect(fuzzyScore('Comparador', 'cor')).toBeGreaterThan(0);
    expect(fuzzyScore('xyzz', 'abc')).toBe(0);
  });

  it('una query vacía siempre puntúa positivo', () => {
    expect(fuzzyScore('cualquiera', '')).toBeGreaterThan(0);
  });
});

describe('searchCommands', () => {
  const catalog = buildCommandCatalog([
    { id: '99001', name: 'Cuenca', province: 'Cuenca' },
    { id: '99002', name: 'Soria', province: 'Soria' },
  ]);

  it('devuelve el catálogo entero cuando la query está vacía', () => {
    expect(searchCommands(catalog, '')).toBe(catalog);
  });

  it('filtra municipios por nombre o provincia', () => {
    const results = searchCommands(catalog, 'cuenca');
    expect(results.some((entry) => entry.id === 'municipio.99001')).toBe(true);
  });

  it('encuentra acciones por título y atajo', () => {
    const results = searchCommands(catalog, 'comparador');
    expect(results.some((item) => item.id === 'nav.comparador')).toBe(true);
  });
});

describe('groupBySection', () => {
  it('respeta el orden municipios → capas → acciones → atajos', () => {
    const catalog = buildCommandCatalog([{ id: '99001', name: 'Logroño', province: 'La Rioja' }]);
    const grouped = groupBySection(catalog);
    const ordered = grouped.map((group) => group.section);
    expect(ordered).toEqual(['municipios', 'capas', 'acciones', 'atajos']);
  });
});

describe('Comando run', () => {
  it('ejecuta el callback con el contexto inyectado', () => {
    const catalog = buildCommandCatalog([{ id: '99099', name: 'Cádiz', province: 'Cádiz' }]);
    const navigate = vi.fn();
    const close = vi.fn();
    const target = catalog.find((entry) => entry.id === 'municipio.99099');
    expect(target).toBeDefined();
    target?.run({
      navigate,
      setActiveLayer: vi.fn(),
      toggleSidebar: vi.fn(),
      toggleLegend: vi.fn(),
      toggleMiniMap: vi.fn(),
      focusTopbarSearch: vi.fn(),
      openShortcuts: vi.fn(),
      close,
    });
    expect(navigate).toHaveBeenCalledWith('/territorio/99099');
    expect(close).toHaveBeenCalled();
  });
});
