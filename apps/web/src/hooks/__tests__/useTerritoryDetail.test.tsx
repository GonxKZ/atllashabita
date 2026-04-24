import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTerritoryDetail, useTerritoryIndicators } from '../useTerritoryDetail';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useTerritoryDetail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('desactiva el fetch cuando no hay id', () => {
    const fetchFn = installFetchMock(async () => jsonResponse({}));
    const client = createTestQueryClient();
    renderHook(() => useTerritoryDetail(null), { wrapper: makeWrapper(client) });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('carga la ficha cuando hay id', async () => {
    const payload = {
      id: 'municipality:41091',
      name: 'Sevilla',
      type: 'municipality',
      hierarchy: {},
      indicators: [],
      scores: [],
    };
    installFetchMock(async () => jsonResponse(payload));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useTerritoryDetail('municipality:41091'), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
  });

  it('useTerritoryIndicators pide endpoint anidado', async () => {
    const fetchFn = installFetchMock(async () => jsonResponse([]));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useTerritoryIndicators('municipality:41091'), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFn.mock.calls[0][0]).toBe('/api/territories/municipality%3A41091/indicators');
  });
});
