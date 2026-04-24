import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  it('muestra el código dentro de una región accesible', () => {
    render(<CodeBlock code="PREFIX ah: <https://atlashabita.es#> ." language="sparql" />);
    const region = screen.getByLabelText(/bloque de código/i);
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('data-language', 'sparql');
    expect(screen.getByText(/PREFIX ah:/)).toBeInTheDocument();
  });

  it('renderiza números de línea cuando se habilitan', () => {
    render(
      <CodeBlock
        code={'uno\ndos\ntres'}
        language="text"
        showLineNumbers
        label="Fragmento numerado"
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('expone un botón de copiar con etiqueta accesible inicial', () => {
    render(<CodeBlock code="hola" language="text" />);
    const button = screen.getByRole('button', {
      name: /copiar código al portapapeles/i,
    });
    expect(button).toBeInTheDocument();
  });
});
