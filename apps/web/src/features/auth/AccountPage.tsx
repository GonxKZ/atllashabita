/* eslint-disable no-undef -- HTMLFormElement, HTMLAnchorElement, Blob son globales DOM disponibles en navegador y jsdom. */
/**
 * Pantalla de cuenta personal.
 *
 * Permite editar nombre, avatar (URL), preferencias (unidades y tema),
 * exportar los datos del usuario actual en JSON y eliminar la cuenta.
 *
 * El componente vive bajo `RequireAuth`, por lo que confía en que `user`
 * existe; aún así guarda una salida segura por si el `signOut` ocurre
 * en paralelo a un render.
 */
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, Save, Trash2 } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { useAuthStore, type ThemePreference, type UnitsPreference } from '../../state/auth';

const FIELD_INPUT_CLASSES =
  'h-11 w-full rounded-2xl border border-[color:var(--color-line-soft)] bg-white px-4 text-sm text-ink-900 placeholder:text-ink-500 transition-colors hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100';

const SELECT_CLASSES = `${FIELD_INPUT_CLASSES} bg-white pr-10`;

const UNITS_OPTIONS: ReadonlyArray<{ value: UnitsPreference; label: string }> = [
  { value: 'metricas', label: 'Métricas (km, m²)' },
  { value: 'imperiales', label: 'Imperiales (mi, ft²)' },
];

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'sistema', label: 'Sistema' },
  { value: 'claro', label: 'Claro' },
  { value: 'oscuro', label: 'Oscuro' },
];

function buildExportFilename(name: string): string {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  return `atlashabita-${safe || 'usuario'}-${stamp}.json`;
}

export function AccountPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);

  const nameId = useId();
  const avatarId = useId();
  const unitsId = useId();
  const themeId = useId();
  const statusId = useId();

  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [units, setUnits] = useState<UnitsPreference>(user?.preferences.units ?? 'metricas');
  const [theme, setTheme] = useState<ThemePreference>(user?.preferences.theme ?? 'sistema');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const memberSince = useMemo(() => {
    if (!user) return '';
    return new Date(user.createdAt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [user]);

  if (!user) {
    // Safety net: si el store cambia mientras se renderiza, evitamos crashear.
    return null;
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (name.trim().length < 2) {
      setFeedback({ kind: 'error', message: 'El nombre debe tener al menos 2 caracteres.' });
      return;
    }

    const result = updateProfile({
      name: name.trim(),
      avatarUrl,
      preferences: { units, theme },
    });

    if (!result.ok) {
      setFeedback({ kind: 'error', message: result.error });
      return;
    }
    setFeedback({ kind: 'ok', message: 'Perfil actualizado.' });
  }

  function handleExport() {
    if (!user) return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    // Anchor desechable: lo creamos sólo para disparar la descarga; no se monta
    // en el árbol React para evitar conflictos con la accesibilidad y el foco.
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildExportFilename(user.name);
    anchor.click();
    // Liberamos el blob al ciclo siguiente para no cortar la descarga en navegadores lentos.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback({ kind: 'ok', message: 'Datos exportados correctamente.' });
  }

  function handleSignOut() {
    signOut();
    navigate('/', { replace: true });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const result = deleteAccount();
    if (!result.ok) {
      setFeedback({ kind: 'error', message: result.error });
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <section
      aria-labelledby="account-title"
      className="mx-auto w-full max-w-4xl px-8 py-8"
      data-route="cuenta"
    >
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={user.name} src={user.avatarUrl} size="lg" />
        <div>
          <h1
            id="account-title"
            className="font-display text-ink-900 text-2xl font-semibold tracking-tight"
          >
            Mi cuenta
          </h1>
          <p className="text-ink-500 mt-1 text-sm">
            Gestiona tu perfil, preferencias y datos almacenados en este dispositivo.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Tag tone="brand" size="md">
            {user.email}
          </Tag>
          <Tag tone="neutral" size="md">
            Miembro desde {memberSince}
          </Tag>
        </div>
      </header>

      <form
        onSubmit={handleSave}
        noValidate
        className="grid gap-6 rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-8 shadow-[var(--shadow-card)] md:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-ink-900 text-sm font-medium">
            Nombre
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            required
            value={name}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            className={FIELD_INPUT_CLASSES}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={avatarId} className="text-ink-900 text-sm font-medium">
            Avatar (URL)
          </label>
          <input
            id={avatarId}
            name="avatarUrl"
            type="url"
            value={avatarUrl}
            placeholder="https://…"
            onChange={(event) => setAvatarUrl(event.target.value)}
            className={FIELD_INPUT_CLASSES}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={unitsId} className="text-ink-900 text-sm font-medium">
            Unidades
          </label>
          <select
            id={unitsId}
            name="units"
            value={units}
            onChange={(event) => setUnits(event.target.value as UnitsPreference)}
            className={SELECT_CLASSES}
          >
            {UNITS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={themeId} className="text-ink-900 text-sm font-medium">
            Tema
          </label>
          <select
            id={themeId}
            name="theme"
            value={theme}
            onChange={(event) => setTheme(event.target.value as ThemePreference)}
            className={SELECT_CLASSES}
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <Button type="submit" variant="primary" size="md" leadingIcon={<Save size={16} />}>
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            leadingIcon={<Download size={16} />}
            onClick={handleExport}
          >
            Exportar mis datos (JSON)
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            leadingIcon={<LogOut size={16} />}
            onClick={handleSignOut}
          >
            Cerrar sesión
          </Button>
        </div>

        {feedback ? (
          <p
            id={statusId}
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={
              feedback.kind === 'error'
                ? 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 md:col-span-2'
                : 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 md:col-span-2'
            }
          >
            {feedback.message}
          </p>
        ) : null}
      </form>

      <section
        aria-labelledby="danger-zone-title"
        className="mt-8 rounded-3xl border border-rose-200 bg-rose-50/60 p-6"
      >
        <h2 id="danger-zone-title" className="font-display text-base font-semibold text-rose-700">
          Zona delicada
        </h2>
        <p className="mt-1 text-sm text-rose-700">
          Eliminar la cuenta borrará todos tus datos almacenados en este dispositivo. Esta acción no
          se puede deshacer.
        </p>
        <Button
          type="button"
          variant="primary"
          size="md"
          leadingIcon={<Trash2 size={16} />}
          onClick={handleDelete}
          className="mt-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-700"
        >
          {confirmDelete ? 'Confirmar eliminación' : 'Eliminar mi cuenta'}
        </Button>
        {confirmDelete ? (
          <p role="status" aria-live="polite" className="mt-2 text-xs text-rose-700">
            Pulsa de nuevo para confirmar la eliminación definitiva.
          </p>
        ) : null}
      </section>
    </section>
  );
}
