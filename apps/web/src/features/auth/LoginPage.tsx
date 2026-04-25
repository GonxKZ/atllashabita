/* eslint-disable no-undef -- HTMLFormElement es un global DOM disponible en navegador y jsdom. */
/**
 * Pantalla de inicio de sesión.
 *
 * Diseño:
 *   - Tarjeta blanca centrada con borde sutil sobre `surface-soft`.
 *   - Etiquetas explícitas, mensajes de error bajo cada campo, foco visible.
 *   - Tras `signIn` redirige a `?next=<ruta>` si está presente; si no, a `/`.
 */
import { useId, useReducer, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../state/auth';

const FIELD_INPUT_CLASSES =
  'h-11 w-full rounded-2xl border border-[color:var(--color-line-soft)] bg-white px-4 text-sm text-ink-900 placeholder:text-ink-500 transition-colors hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100';

interface LoginFormState {
  readonly email: string;
  readonly password: string;
  readonly emailError: string | null;
  readonly passwordError: string | null;
  readonly formError: string | null;
  readonly submitting: boolean;
}

type LoginFormAction =
  | { readonly type: 'field'; readonly field: 'email' | 'password'; readonly value: string }
  | { readonly type: 'submit-start' }
  | {
      readonly type: 'validation-error';
      readonly emailError: string | null;
      readonly passwordError: string | null;
    }
  | { readonly type: 'form-error'; readonly message: string }
  | { readonly type: 'submit-end' };

const LOGIN_INITIAL_STATE: LoginFormState = {
  email: '',
  password: '',
  emailError: null,
  passwordError: null,
  formError: null,
  submitting: false,
};

function loginFormReducer(state: LoginFormState, action: LoginFormAction): LoginFormState {
  switch (action.type) {
    case 'field':
      return {
        ...state,
        [action.field]: action.value,
        [`${action.field}Error`]: null,
        formError: null,
      };
    case 'validation-error':
      return {
        ...state,
        emailError: action.emailError,
        passwordError: action.passwordError,
        formError: null,
        submitting: false,
      };
    case 'submit-start':
      return { ...state, emailError: null, passwordError: null, formError: null, submitting: true };
    case 'form-error':
      return { ...state, formError: action.message, submitting: false };
    case 'submit-end':
      return { ...state, submitting: false };
  }
}

export function LoginPage() {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);

  const [form, dispatch] = useReducer(loginFormReducer, LOGIN_INITIAL_STATE);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailError = form.email.trim().length === 0 ? 'Introduce tu correo.' : null;
    const passwordError = form.password.length === 0 ? 'Introduce tu contraseña.' : null;
    if (emailError || passwordError) {
      dispatch({ type: 'validation-error', emailError, passwordError });
      return;
    }

    dispatch({ type: 'submit-start' });
    const result = signIn(form.email, form.password);

    if (!result.ok) {
      dispatch({ type: 'form-error', message: result.error });
      return;
    }
    dispatch({ type: 'submit-end' });

    const nextRaw = searchParams.get('next');
    const next = nextRaw && nextRaw.startsWith('/') ? nextRaw : '/';
    navigate(next, { replace: true });
  }

  return (
    <main
      role="main"
      aria-labelledby="login-title"
      className="bg-surface-soft text-ink-900 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <section
        aria-label="Iniciar sesión"
        className="w-full max-w-md rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-8 shadow-[var(--shadow-card)]"
      >
        <header className="mb-6 text-center">
          <p className="text-brand-600 text-xs font-semibold tracking-[0.18em] uppercase">
            AtlasHabita
          </p>
          <h1 id="login-title" className="font-display text-ink-900 mt-2 text-2xl font-bold">
            Iniciar sesión
          </h1>
          <p className="text-ink-500 mt-2 text-sm">
            Accede a tu panel personal para guardar territorios y preferencias.
          </p>
        </header>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              aria-invalid={form.emailError !== null}
              aria-describedby={form.emailError ? `${emailId}-error` : undefined}
              value={form.email}
              onChange={(event) =>
                dispatch({ type: 'field', field: 'email', value: event.target.value })
              }
              className={FIELD_INPUT_CLASSES}
              placeholder="usuario@dominio.es"
            />
            {form.emailError ? (
              <p id={`${emailId}-error`} role="alert" className="text-xs text-rose-700">
                {form.emailError}
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
              autoComplete="current-password"
              required
              aria-invalid={form.passwordError !== null}
              aria-describedby={form.passwordError ? `${passwordId}-error` : undefined}
              value={form.password}
              onChange={(event) =>
                dispatch({ type: 'field', field: 'password', value: event.target.value })
              }
              className={FIELD_INPUT_CLASSES}
              placeholder="********"
            />
            {form.passwordError ? (
              <p id={`${passwordId}-error`} role="alert" className="text-xs text-rose-700">
                {form.passwordError}
              </p>
            ) : null}
          </div>

          {form.formError ? (
            <p
              id={errorId}
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
            >
              {form.formError}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            leadingIcon={<LogIn size={16} />}
            disabled={form.submitting}
          >
            {form.submitting ? 'Comprobando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-ink-500 mt-6 text-center text-sm">
          ¿No tienes cuenta?{' '}
          <Link
            to="/registro"
            className="text-brand-700 hover:text-brand-800 font-semibold underline-offset-4 hover:underline"
          >
            Crear una ahora
          </Link>
        </p>
      </section>
    </main>
  );
}
