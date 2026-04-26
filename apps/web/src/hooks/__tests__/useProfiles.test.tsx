import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfiles } from '../useProfiles';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useProfiles', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga perfiles desde /api/profiles', async () => {
    const payload = [
      {
        id: 'remote_work',
        label: 'Teletrabajo',
        description: '',
        weights: { broadband_coverage: 0.3 },
      },
    ];
    const fetchFn = installFetchMock(async () => jsonResponse(payload));

    const client = createTestQueryClient();
    const { result } = renderHook(() => useProfiles(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(fetchFn.mock.calls[0][0]).toBe('/api/profiles');
  });

  it('propaga el error cuando /profiles falla', async () => {
    installFetchMock(async () =>
      jsonResponse({ code: 'UNKNOWN', message: 'boom' }, { status: 500 })
    );

    const client = createTestQueryClient();
    const { result } = renderHook(() => useProfiles(), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
