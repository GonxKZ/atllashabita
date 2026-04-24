import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { rdfExportKey, useRdfExport } from '../useRdfExport';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useRdfExport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera una clave estable con territorio + formato + página', () => {
    expect(rdfExportKey({ territoryId: '28079' })).toEqual(['rdf', 'export', '28079', 'turtle', 1]);
  });

  it('consulta la API /rdf/export y devuelve el payload', async () => {
    const payload = {
      territoryId: '28079',
      format: 'turtle',
      content: '@prefix ah: <urn:ah#> .',
      page: 1,
      totalPages: 1,
      totalBytes: 20,
    };
    const fetchFn = installFetchMock(async () => jsonResponse(payload));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useRdfExport({ territoryId: '28079' }), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(String(fetchFn.mock.calls[0][0])).toContain('/rdf/export');
  });
});
