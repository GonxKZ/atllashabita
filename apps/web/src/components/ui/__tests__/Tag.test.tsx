import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tag } from '../Tag';

describe('Tag', () => {
  it('muestra el contenido con el tono por defecto', () => {
    render(<Tag>Demo</Tag>);
    const tag = screen.getByText('Demo');
    expect(tag).toBeInTheDocument();
    expect(tag.className).toMatch(/rounded-full/);
  });

  it('aplica la paleta cuando tono=brand', () => {
    render(<Tag tone="brand">Recomendado</Tag>);
    const tag = screen.getByText('Recomendado');
    expect(tag.className).toMatch(/bg-brand-50/);
  });
});
