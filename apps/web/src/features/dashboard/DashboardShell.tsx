export function DashboardShell() {
  return (
    <main className="flex min-h-screen items-center justify-center p-12">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-10 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
          AtlasHabita
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-900">
          Brújula territorial para decidir dónde vivir
        </h1>
        <p className="mt-4 text-ink-500">
          Esqueleto inicial del frontend. La pantalla principal con sidebar, mapa, ranking y panel
          de tendencias se construye en las issues #21-#26 según el sistema de diseño extraído de la
          captura de referencia.
        </p>
      </div>
    </main>
  );
}
