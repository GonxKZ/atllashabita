import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQualityReport } from '../useQualityReport';
import { installFetchMock, jsonResponse } from '../../services/__tests__/fetchMock';
import { createTestQueryClient, makeWrapper } from './testUtils';

describe('useQualityReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('consulta el reporte de calidad', async () => {
    const payload = { generated_at: '2026-04-24', data_version: '2026.04.24', rules: [] };
    const fetchFn = installFetchMock(async () => jsonResponse(payload));
    const client = createTestQueryClient();
    const { result } = renderHook(() => useQualityReport(), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(fetchFn.mock.calls[0][0]).toBe('/api/quality/reports');
  });
});
