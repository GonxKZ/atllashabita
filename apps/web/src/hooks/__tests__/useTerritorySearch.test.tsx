import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTerritorySearch } from '../useTerritorySearch';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useTerritorySearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no lanza petición cuando la query es demasiado corta', () => {
    const fetchFn = installFetchMock(async () => jsonResponse([]));

    const client = createTestQueryClient();
    const { result } = renderHook(() => useTerritorySearch('a'), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.isFetching).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('busca territorios con query válida', async () => {
    const payload = [{ id: 'municipality:41091', name: 'Sevilla', type: 'municipality' }];
    const fetchFn = installFetchMock(async () => jsonResponse(payload));

    const client = createTestQueryClient();
    const { result } = renderHook(() => useTerritorySearch('Sev'), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(fetchFn.mock.calls[0][0]).toBe('/api/territories/search?q=Sev&limit=10');
  });
});
