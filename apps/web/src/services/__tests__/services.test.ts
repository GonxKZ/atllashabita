/* eslint-disable no-undef -- RequestInit es tipo DOM global de TypeScript. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listProfiles } from '../profiles';
import { getTerritory, getTerritoryIndicators, searchTerritories } from '../territories';
import { computeRanking, computeRankingCustom } from '../rankings';
import { getMapLayer, listMapLayers } from '../map_layers';
import { getSource, listSources } from '../sources';
import { getQualityReport } from '../quality';
import { installFetchMock, jsonResponse, type FetchMock } from './fetchMock';

function mockFetch(body: unknown): FetchMock {
  return installFetchMock(async () => jsonResponse(body));
}

function calledUrl(fetchFn: FetchMock): string {
  return fetchFn.mock.calls[0][0] as string;
}

describe('servicios REST', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listProfiles apunta a /api/profiles', async () => {
    const fetchFn = mockFetch([]);
    await listProfiles();
    expect(calledUrl(fetchFn)).toBe('/api/profiles');
  });

  it('searchTerritories codifica query y limit', async () => {
    const fetchFn = mockFetch([]);
    await searchTerritories('Sevilla', 5);
    expect(calledUrl(fetchFn)).toBe('/api/territories/search?q=Sevilla&limit=5');
  });

  it('getTerritory codifica el id territorial', async () => {
    const fetchFn = mockFetch({});
    await getTerritory('municipality:41091');
    expect(calledUrl(fetchFn)).toBe('/api/territories/municipality%3A41091');
  });

  it('getTerritoryIndicators añade el sufijo indicators', async () => {
    const fetchFn = mockFetch([]);
    await getTerritoryIndicators('municipality:41091');
    expect(calledUrl(fetchFn)).toBe('/api/territories/municipality%3A41091/indicators');
  });

  it('computeRanking propaga perfil, ámbito y límite por defecto', async () => {
    const fetchFn = mockFetch({ results: [] });
    await computeRanking({ profile: 'remote_work', scope: 'province:41' });
    expect(calledUrl(fetchFn)).toBe(
      '/api/rankings?profile=remote_work&scope=province%3A41&limit=20'
    );
  });

  it('computeRankingCustom hace POST con body JSON', async () => {
    const fetchFn = mockFetch({ results: [] });
    const body = {
      profile: 'family' as const,
      scope: 'country:es' as const,
      weights: [{ factor: 'services', weight: 0.5 }],
    };
    await computeRankingCustom(body);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('/api/rankings/custom');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).body).toBe(JSON.stringify(body));
  });

  it('listMapLayers apunta a /map/layers', async () => {
    const fetchFn = mockFetch([]);
    await listMapLayers();
    expect(calledUrl(fetchFn)).toBe('/api/map/layers');
  });

  it('getMapLayer incluye perfil cuando se provee', async () => {
    const fetchFn = mockFetch({});
    await getMapLayer('score', 'student');
    expect(calledUrl(fetchFn)).toBe('/api/map/layers/score?profile=student');
  });

  it('getMapLayer omite perfil cuando no se provee', async () => {
    const fetchFn = mockFetch({});
    await getMapLayer('score');
    expect(calledUrl(fetchFn)).toBe('/api/map/layers/score');
  });

  it('listSources apunta a /sources', async () => {
    const fetchFn = mockFetch([]);
    await listSources();
    expect(calledUrl(fetchFn)).toBe('/api/sources');
  });

  it('getSource apunta a /sources/:id', async () => {
    const fetchFn = mockFetch({});
    await getSource('ine_padron');
    expect(calledUrl(fetchFn)).toBe('/api/sources/ine_padron');
  });

  it('getQualityReport apunta a /quality/reports', async () => {
    const fetchFn = mockFetch({});
    await getQualityReport();
    expect(calledUrl(fetchFn)).toBe('/api/quality/reports');
  });
});
