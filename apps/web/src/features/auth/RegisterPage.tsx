/* eslint-disable no-undef -- HTMLFormElement es un global DOM disponible en navegador y jsdom. */
/**
 * Pantalla de registro.
 *
 * Validaciones inmediatas en cliente para los cuatro campos (nombre, correo,
 * contraseña, confirmación). Tras un registro exitoso el usuario queda con
 * sesión iniciada y se le envía a `?next` o a `/cuenta` por defecto.
 */
import { useId, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../state/auth';
import { validateEmail, validatePassword } from '../../services/auth';

const FIELD_INPUT_CLASSES =
  'h-11 w-full rounded-2xl border border-[color:var(--color-line-soft)] bg-white px-4 text-sm text-ink-900 placeholder:text-ink-500 transition-colors hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100';

export function RegisterPage() {
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const errorId = useId();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signUp = useAuthStore((state) => state.signUp);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sugerencias en vivo para acompañar al usuario sin disparar errores antes de
  // tiempo. Sólo se materializan como mensaje cuando hay texto en el campo.
  const passwordHints = useMemo(() => validatePassword(password), [password]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);
    setFormError(null);

    let invalid = false;

    if (name.trim().length < 2) {
      setNameError('El nombre debe tener al menos 2 caracteres.');
      invalid = true;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setEmailError(emailCheck.error);
      invalid = true;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setPasswordError(passwordCheck.errors[0] ?? 'Contraseña inválida.');
      invalid = true;
    }

    if (password !== confirm) {
      setConfirmError('Las contraseñas no coinciden.');
      invalid = true;
    }

    if (invalid) return;

    setSubmitting(true);
    const result = signUp({ email, password, name });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    const nextRaw = searchParams.get('next');
    const next = nextRaw && nextRaw.startsWith('/') ? nextRaw : '/cuenta';
    navigate(next, { replace: true });
  }

  return (
    <main
      role="main"
      aria-labelledby="register-title"
      className="bg-surface-soft text-ink-900 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <section
        aria-label="Crear cuenta"
        className="w-full max-w-md rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-8 shadow-[var(--shadow-card)]"
      >
        <header className="mb-6 text-center">
          <p className="text-brand-600 text-xs font-semibold tracking-[0.18em] uppercase">
            AtlasHabita
          </p>
          <h1 id="register-title" className="font-display text-ink-900 mt-2 text-2xl font-bold">
            Crear cuenta
          </h1>
          <p className="text-ink-500 mt-2 text-sm">
            Personaliza tu experiencia y guarda territorios favoritos.
          </p>
        </header>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameId} className="text-ink-900 text-sm font-medium">
              Nombre completo
            </label>
            <input
              id={nameId}
              type="text"
              name="name"
              autoComplete="name"
              required
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? `${nameId}-error` : undefined}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={FIELD_INPUT_CLASSES}
              placeholder="Alex Romero"
            />
            {nameError ? (
              <p id={`${nameId}-error`} role="alert" className="text-xs text-rose-700">
                {nameError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={emailId} className="text-ink-900 text-sm font-medium">
              Correo electrónico
            </label>
            <input
              id={emailId}
              type="email"
              name="email"
              autoComplete="email"
              required
              aria-invalid={emailError !== null}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD_INPUT_CLASSES}
              placeholder="usuario@dominio.es"
            />
            {emailError ? (
              <p id={`${emailId}-error`} role="alert" className="text-xs text-rose-700">
                {emailError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={passwordId} className="text-ink-900 text-sm font-medium">
              Contraseña
            </label>
            <input
              id={passwordId}
              type="password"
              name="password"
              autoComplete="new-password"
              required
              aria-invalid={passwordError !== null}
              aria-describedby={passwordError ? `${passwordId}-error` : `${passwordId}-help`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={FIELD_INPUT_CLASSES}
              placeholder="********"
            />
            <p id={`${passwordId}-help`} className="text-ink-500 text-xs">
              Mínimo 8 caracteres, una mayúscula, una minúscula y un dígito.
            </p>
            {passwordError ? (
              <p id={`${passwordId}-error`} role="alert" className="text-xs text-rose-700">
                {passwordError}
              </p>
            ) : null}
            {!passwordError && password.length > 0 && !passwordHints.valid ? (
              <ul aria-live="polite" className="text-xs text-amber-700">
                {passwordHints.errors.map((message) => (
                  <li key={message}>· {message}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={confirmId} className="text-ink-900 text-sm font-medium">
              Confirmar contraseña
            </label>
            <input
              id={confirmId}
              type="password"
              name="confirm"
              autoComplete="new-password"
              required
              aria-invalid={confirmError !== null}
              aria-describedby={confirmError ? `${confirmId}-error` : undefined}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={FIELD_INPUT_CLASSES}
              placeholder="********"
            />
            {confirmError ? (
              <p id={`${confirmId}-error`} role="alert" className="text-xs text-rose-700">
                {confirmError}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p
              id={errorId}
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
            >
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            leadingIcon={<UserPlus size={16} />}
            disabled={submitting}
          >
            {submitting ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="text-ink-500 mt-6 text-center text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="text-brand-700 hover:text-brand-800 font-semibold underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
