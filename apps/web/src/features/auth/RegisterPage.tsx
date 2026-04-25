/* eslint-disable no-undef -- HTMLFormElement es un global DOM disponible en navegador y jsdom. */
/**
 * Pantalla de registro.
 *
 * Validaciones inmediatas en cliente para los cuatro campos (nombre, correo,
 * contraseña, confirmación). Tras un registro exitoso el usuario queda con
 * sesión iniciada y se le envía a `?next` o a `/cuenta` por defecto.
 */
import { useId, useMemo, useReducer, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../state/auth';
import { validateEmail, validatePassword } from '../../services/auth';

const FIELD_INPUT_CLASSES =
  'h-11 w-full rounded-2xl border border-[color:var(--color-line-soft)] bg-white px-4 text-sm text-ink-900 placeholder:text-ink-500 transition-colors hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100';

type RegisterField = 'name' | 'email' | 'password' | 'confirm';

interface RegisterFormState {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly confirm: string;
  readonly nameError: string | null;
  readonly emailError: string | null;
  readonly passwordError: string | null;
  readonly confirmError: string | null;
  readonly formError: string | null;
  readonly submitting: boolean;
}

type RegisterFormAction =
  | { readonly type: 'field'; readonly field: RegisterField; readonly value: string }
  | {
      readonly type: 'validation-error';
      readonly errors: Pick<
        RegisterFormState,
        'nameError' | 'emailError' | 'passwordError' | 'confirmError'
      >;
    }
  | { readonly type: 'submit-start' }
  | { readonly type: 'form-error'; readonly message: string }
  | { readonly type: 'submit-end' };

const REGISTER_INITIAL_STATE: RegisterFormState = {
  name: '',
  email: '',
  password: '',
  confirm: '',
  nameError: null,
  emailError: null,
  passwordError: null,
  confirmError: null,
  formError: null,
  submitting: false,
};

function registerFormReducer(
  state: RegisterFormState,
  action: RegisterFormAction
): RegisterFormState {
  switch (action.type) {
    case 'field':
      return {
        ...state,
        [action.field]: action.value,
        [`${action.field}Error`]: null,
        formError: null,
      };
    case 'validation-error':
      return { ...state, ...action.errors, formError: null, submitting: false };
    case 'submit-start':
      return {
        ...state,
        nameError: null,
        emailError: null,
        passwordError: null,
        confirmError: null,
        formError: null,
        submitting: true,
      };
    case 'form-error':
      return { ...state, formError: action.message, submitting: false };
    case 'submit-end':
      return { ...state, submitting: false };
  }
}

export function RegisterPage() {
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const errorId = useId();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signUp = useAuthStore((state) => state.signUp);

  const [form, dispatch] = useReducer(registerFormReducer, REGISTER_INITIAL_STATE);

  // Sugerencias en vivo para acompañar al usuario sin disparar errores antes de
  // tiempo. Sólo se materializan como mensaje cuando hay texto en el campo.
  const passwordHints = useMemo(() => validatePassword(form.password), [form.password]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailCheck = validateEmail(form.email);
    const passwordCheck = validatePassword(form.password);
    const errors = {
      nameError:
        form.name.trim().length < 2 ? 'El nombre debe tener al menos 2 caracteres.' : null,
      emailError: emailCheck.valid ? null : emailCheck.error,
      passwordError: passwordCheck.valid
        ? null
        : (passwordCheck.errors[0] ?? 'Contraseña inválida.'),
      confirmError:
        form.password !== form.confirm ? 'Las contraseñas no coinciden.' : null,
    };

    if (Object.values(errors).some(Boolean)) {
      dispatch({ type: 'validation-error', errors });
      return;
    }

    dispatch({ type: 'submit-start' });
    const result = signUp({ email: form.email, password: form.password, name: form.name });

    if (!result.ok) {
      dispatch({ type: 'form-error', message: result.error });
      return;
    }
    dispatch({ type: 'submit-end' });

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
              aria-invalid={form.nameError !== null}
              aria-describedby={form.nameError ? `${nameId}-error` : undefined}
              value={form.name}
              onChange={(event) =>
                dispatch({ type: 'field', field: 'name', value: event.target.value })
              }
              className={FIELD_INPUT_CLASSES}
              placeholder="Alex Romero"
            />
            {form.nameError ? (
              <p id={`${nameId}-error`} role="alert" className="text-xs text-rose-700">
                {form.nameError}
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
              autoComplete="new-password"
              required
              aria-invalid={form.passwordError !== null}
              aria-describedby={form.passwordError ? `${passwordId}-error` : `${passwordId}-help`}
              value={form.password}
              onChange={(event) =>
                dispatch({ type: 'field', field: 'password', value: event.target.value })
              }
              className={FIELD_INPUT_CLASSES}
              placeholder="********"
            />
            <p id={`${passwordId}-help`} className="text-ink-500 text-xs">
              Mínimo 8 caracteres, una mayúscula, una minúscula y un dígito.
            </p>
            {form.passwordError ? (
              <p id={`${passwordId}-error`} role="alert" className="text-xs text-rose-700">
                {form.passwordError}
              </p>
            ) : null}
            {!form.passwordError && form.password.length > 0 && !passwordHints.valid ? (
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
              aria-invalid={form.confirmError !== null}
              aria-describedby={form.confirmError ? `${confirmId}-error` : undefined}
              value={form.confirm}
              onChange={(event) =>
                dispatch({ type: 'field', field: 'confirm', value: event.target.value })
              }
              className={FIELD_INPUT_CLASSES}
              placeholder="********"
            />
            {form.confirmError ? (
              <p id={`${confirmId}-error`} role="alert" className="text-xs text-rose-700">
                {form.confirmError}
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
            leadingIcon={<UserPlus size={16} />}
            disabled={form.submitting}
          >
            {form.submitting ? 'Creando…' : 'Crear cuenta'}
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
