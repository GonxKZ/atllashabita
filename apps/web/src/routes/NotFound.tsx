/**
 * Pantalla 404 accesible y consistente con la identidad visual base.
 */

import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main
      role="main"
      aria-labelledby="not-found-title"
      className="flex min-h-screen items-center justify-center p-12"
    >
      <div className="shadow-card mx-auto max-w-xl rounded-2xl bg-white p-10 text-center">
        <p className="text-brand-600 text-xs font-semibold tracking-[0.18em] uppercase">
          AtlasHabita
        </p>
        <h1 id="not-found-title" className="font-display text-ink-900 mt-3 text-3xl font-bold">
          Pantalla no encontrada
        </h1>
        <p className="text-ink-500 mt-4">
          La dirección introducida no corresponde a una vista conocida. Vuelve al panel principal
          para seguir explorando territorios.
        </p>
        <Link
          to="/"
          className="bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-600 mt-6 inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2"
        >
          Ir al panel principal
        </Link>
      </div>
    </main>
  );
}
