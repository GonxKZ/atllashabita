import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardShell } from '../DashboardShell';

describe('DashboardShell', () => {
  it('muestra el titular inicial del proyecto', () => {
    render(<DashboardShell />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/brújula territorial/i);
  });
});
