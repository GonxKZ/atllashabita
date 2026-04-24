import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapLayer, useMapLayers } from '../useMapLayers';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useMapLayers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listado de capas usa /map/layers', async () => {
    const fetchFn = installFetchMock(async () => jsonResponse([]));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useMapLayers(), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFn.mock.calls[0][0]).toBe('/api/map/layers');
  });

  it('useMapLayer no dispara fetch sin id', () => {
    const fetchFn = installFetchMock(async () => jsonResponse({}));
    const client = createTestQueryClient();
    renderHook(() => useMapLayer(null), { wrapper: makeWrapper(client) });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('useMapLayer añade perfil cuando se pasa', async () => {
    const fetchFn = installFetchMock(async () => jsonResponse({}));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useMapLayer('score', 'student'), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFn.mock.calls[0][0]).toBe('/api/map/layers/score?profile=student');
  });
});
