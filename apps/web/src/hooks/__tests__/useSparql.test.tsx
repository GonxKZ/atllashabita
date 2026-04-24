import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { useSparqlCatalog, useSparqlMutation } from '../useSparql';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useSparql hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('useSparqlCatalog obtiene el catálogo y lo deja en caché', async () => {
    const payload = {
      version: '1.0',
      entries: [
        {
          id: 'top-by-score',
          name: 'Top N',
          description: 'desc',
          tags: ['score'],
          bindings: [],
          query: 'SELECT *',
        },
      ],
    };
    const fetchFn = installFetchMock(async () => jsonResponse(payload));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSparqlCatalog(), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(String(fetchFn.mock.calls[0][0])).toContain('/sparql/catalog');
  });

  it('useSparqlMutation ejecuta POST /sparql con los bindings indicados', async () => {
    const payload = {
      id: 'top-by-score',
      variables: ['name'],
      rows: [{ name: 'Madrid' }],
      total: 1,
      took_ms: 5,
    };
    const fetchFn = installFetchMock(async () => jsonResponse(payload));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSparqlMutation(), {
      wrapper: makeWrapper(client),
    });
    const mutated = await result.current.mutateAsync({
      id: 'top-by-score',
      bindings: { limit: 5 },
    });
    expect(mutated).toEqual(payload);
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toContain('/sparql');
    // @ts-expect-error tipo laxo del mock
    expect(init.method).toBe('POST');
  });
});
