import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSource, useSources } from '../useSources';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useSources', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga lista de fuentes', async () => {
    const fetchFn = installFetchMock(async () => jsonResponse([]));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSources(), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFn.mock.calls[0][0]).toBe('/api/sources');
  });

  it('useSource no fetch sin id', () => {
    const fetchFn = installFetchMock(async () => jsonResponse({}));
    const client = createTestQueryClient();
    renderHook(() => useSource(null), { wrapper: makeWrapper(client) });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('useSource con id hace fetch al detalle', async () => {
    const fetchFn = installFetchMock(async () => jsonResponse({}));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSource('ine_padron'), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchFn.mock.calls[0][0]).toBe('/api/sources/ine_padron');
  });
});
