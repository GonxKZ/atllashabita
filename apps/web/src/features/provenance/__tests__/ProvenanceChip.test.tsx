import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProvenanceChip } from '../ProvenanceChip';

describe('ProvenanceChip', () => {
  it('renderiza un botón con el dataset como etiqueta', () => {
    render(
      <ProvenanceChip
        sourceName="INE · Renta"
        licence="CC-BY 4.0"
        period="2023"
        url="https://www.ine.es"
      />
    );
    expect(screen.getByRole('button', { name: /INE · Renta/ })).toBeInTheDocument();
  });

  it('muestra licencia, periodo y enlace al hacer focus', async () => {
    const user = userEvent.setup();
    render(
      <ProvenanceChip
        sourceName="MITECO"
        licence="CC-BY 4.0"
        period="2024"
        url="https://www.miteco.gob.es"
      />
    );
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('CC-BY 4.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /fuente oficial/i })).toHaveAttribute(
      'href',
      'https://www.miteco.gob.es'
    );
  });
});
