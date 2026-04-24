import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from '../DataTable';

interface Row {
  id: string;
  name: string;
  value: number;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Alfa', value: 10 },
  { id: 'b', name: 'Beta', value: 20 },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Nombre', cell: (row) => row.name },
  { id: 'value', header: 'Valor', align: 'right', cell: (row) => row.value },
];

describe('DataTable', () => {
  it('renderiza cabeceras y filas a partir del dataset', () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        getRowId={(row) => row.id}
        ariaLabel="Tabla de prueba"
      />
    );
    expect(screen.getByRole('table', { name: 'Tabla de prueba' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByText('Alfa')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay filas', () => {
    render(
      <DataTable columns={COLUMNS} rows={[]} getRowId={(row) => row.id} emptyState="Sin datos" />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Sin datos');
  });

  it('avisa al hacer clic sobre una fila interactiva', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        getRowId={(row) => row.id}
        onRowClick={handleClick}
      />
    );
    await user.click(screen.getByText('Beta'));
    expect(handleClick).toHaveBeenCalledWith(ROWS[1], 1);
  });
});
