/* eslint-disable no-undef -- RequestInit es tipo DOM global. */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rankingKey, useCustomRanking, useRankings } from '../useRankings';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useRankings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera clave estable con perfil, ámbito y hash de pesos', () => {
    const key = rankingKey({ profile: 'family', scope: 'province:41' }, 'default');
    // Cuando `limit` no se especifica, la clave usa el valor por defecto
    // (RANKING_DEFAULT_LIMIT = 20) para no duplicar entradas en caché.
    expect(key).toEqual(['rankings', 'family', 'province:41', 20, 'default']);
  });

  it('consulta ranking al montar y expone la respuesta', async () => {
    const payload = {
      profile: 'remote_work',
      scope: 'country:es',
      scoring_version: '2026.04.1',
      data_version: '2026.04.24',
      results: [],
    };
    const fetchFn = installFetchMock(async () => jsonResponse(payload));

    const client = createTestQueryClient();
    const { result } = renderHook(
      () => useRankings({ profile: 'remote_work', scope: 'country:es' }),
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(fetchFn.mock.calls[0][0]).toBe(
      '/api/rankings?profile=remote_work&scope=country%3Aes&limit=20'
    );
  });

  it('useCustomRanking ejecuta POST con pesos personalizados', async () => {
    const payload = {
      profile: 'family',
      scope: 'country:es',
      scoring_version: '2026.04.1',
      data_version: '2026.04.24',
      results: [],
    };
    const fetchFn = installFetchMock(async () => jsonResponse(payload));

    const client = createTestQueryClient();
    const { result } = renderHook(() => useCustomRanking(), { wrapper: makeWrapper(client) });

    const mutated = await result.current.mutateAsync({
      profile: 'family',
      scope: 'country:es',
      weights: [{ factor: 'services', weight: 0.5 }],
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('/api/rankings/custom');
    expect((init as RequestInit).method).toBe('POST');
    expect(mutated).toEqual(payload);
    await waitFor(() => expect(result.current.data).toEqual(payload));
  });
});
