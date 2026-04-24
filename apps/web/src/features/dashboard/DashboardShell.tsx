export function DashboardShell() {
  return (
    <main className="flex min-h-screen items-center justify-center p-12">
      <div className="shadow-card mx-auto max-w-xl rounded-2xl bg-white p-10">
        <p className="text-brand-600 text-xs font-semibold tracking-[0.18em] uppercase">
          AtlasHabita
        </p>
        <h1 className="font-display text-ink-900 mt-3 text-3xl font-bold">
          Brújula territorial para decidir dónde vivir
        </h1>
        <p className="text-ink-500 mt-4">
          Esqueleto inicial del frontend. La pantalla principal con sidebar, mapa, ranking y panel
          de tendencias se construye en las issues #21-#26 según el sistema de diseño extraído de la
          captura de referencia.
        </p>
      </div>
    </main>
  );
}
