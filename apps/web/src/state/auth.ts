/* eslint-disable no-undef -- localStorage es global del navegador, gestionado por Zustand persist. */
/**
 * Store Zustand de autenticación.
 *
 * Persistido en `localStorage` con la clave `atlashabita.auth.v1` para que la
 * sesión sobreviva a recargas. La capa pura de validación vive en
 * `services/auth.ts`; este módulo se limita a orquestar el estado.
 *
 * Decisiones de diseño:
 *   - Sólo se almacena información serializable (sin referencias a DOM).
 *   - Las acciones devuelven `Result` discriminados para que la UI
 *     muestre los errores sin acoplarse a `throw`.
 *   - `signOut` limpia el `user` y la marca temporal pero conserva los
 *     registros (cuentas creadas) para no obligar al usuario a re-registrarse.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  assertCredentials,
  buildUserFromRegistration,
  DEFAULT_PREFERENCES,
  validateEmail,
  validatePassword,
} from '../services/auth';

/** Sistemas de unidades soportados por la aplicación. */
export type UnitsPreference = 'metricas' | 'imperiales';

/** Modos de tema soportados por la aplicación. */
export type ThemePreference = 'claro' | 'oscuro' | 'sistema';

/** Preferencias del usuario serializables. */
export interface AuthPreferences {
  readonly units: UnitsPreference;
  readonly theme: ThemePreference;
}

/** Representación pública del usuario autenticado. */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatarUrl?: string;
  readonly preferences: AuthPreferences;
  readonly createdAt: number;
}

/**
 * Registro persistido de cuentas creadas en el dispositivo.
 *
 * Almacena la contraseña en claro porque el MVP no dispone aún de backend.
 * El refuerzo (hash + endpoint real) está documentado en
 * `services/auth.assertCredentials`, que es el punto único a tocar cuando se
 * integre `POST /auth/{login,register}`.
 */
interface AccountRecord {
  readonly user: AuthUser;
  readonly password: string;
}

/** Resultado discriminado para acciones que pueden fallar con mensaje. */
export type AuthResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

export interface AuthState {
  readonly user: AuthUser | null;
  readonly loginAt: number | null;
  readonly accounts: readonly AccountRecord[];
}

export interface AuthActions {
  /** Inicia sesión con email y contraseña. */
  signIn: (email: string, password: string) => AuthResult;
  /** Crea una cuenta y deja al usuario con sesión iniciada. */
  signUp: (input: {
    email: string;
    password: string;
    name: string;
    avatarUrl?: string;
    preferences?: AuthPreferences;
  }) => AuthResult;
  /** Cierra la sesión actual sin borrar las cuentas registradas. */
  signOut: () => void;
  /** Actualiza el perfil del usuario en sesión. */
  updateProfile: (patch: Partial<Omit<AuthUser, 'id' | 'createdAt' | 'email'>>) => AuthResult;
  /** Elimina la cuenta del usuario actual y cierra la sesión. */
  deleteAccount: () => AuthResult;
  /**
   * Reinicia el store completo. Útil para tests; el código de UI no debería
   * llamarlo directamente.
   */
  reset: () => void;
}

const INITIAL_STATE: AuthState = {
  user: null,
  loginAt: null,
  accounts: [],
};

export type AuthStore = AuthState & AuthActions;

/** Localiza una cuenta por email normalizado. */
function findAccount(accounts: readonly AccountRecord[], email: string): AccountRecord | undefined {
  const normalized = email.trim().toLowerCase();
  return accounts.find((record) => record.user.email === normalized);
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      signIn: (email, password) => {
        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) {
          return { ok: false, error: emailCheck.error ?? 'Correo inválido.' };
        }
        const account = findAccount(get().accounts, email);
        if (!account) {
          return { ok: false, error: 'No existe una cuenta con ese correo.' };
        }
        const matches = assertCredentials({
          email,
          password,
          storedEmail: account.user.email,
          storedPassword: account.password,
        });
        if (!matches) {
          return { ok: false, error: 'Las credenciales no son correctas.' };
        }
        set({ user: account.user, loginAt: Date.now() });
        return { ok: true };
      },
      signUp: ({ email, password, name, avatarUrl, preferences }) => {
        const existing = findAccount(get().accounts, email);
        if (existing) {
          return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
        }
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
          return { ok: false, error: passwordCheck.errors[0] ?? 'Contraseña inválida.' };
        }
        try {
          const user = buildUserFromRegistration({
            email,
            password,
            name,
            now: Date.now(),
            ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            preferences: preferences ?? DEFAULT_PREFERENCES,
          });
          const record: AccountRecord = { user, password };
          set((state) => ({
            user,
            loginAt: Date.now(),
            accounts: [...state.accounts, record],
          }));
          return { ok: true };
        } catch (cause) {
          const message =
            cause instanceof Error ? cause.message : 'No se pudo registrar la cuenta.';
          return { ok: false, error: message };
        }
      },
      signOut: () => set({ user: null, loginAt: null }),
      updateProfile: (patch) => {
        const current = get().user;
        if (!current) {
          return { ok: false, error: 'No hay sesión activa.' };
        }
        const nextName = patch.name?.trim();
        if (nextName !== undefined && nextName.length < 2) {
          return { ok: false, error: 'El nombre debe tener al menos 2 caracteres.' };
        }
        const nextAvatarUrlRaw = patch.avatarUrl;
        const nextAvatar =
          nextAvatarUrlRaw === undefined
            ? current.avatarUrl
            : nextAvatarUrlRaw.trim().length > 0
              ? nextAvatarUrlRaw.trim()
              : undefined;
        const nextPreferences = patch.preferences
          ? { ...current.preferences, ...patch.preferences }
          : current.preferences;

        const updated: AuthUser = {
          ...current,
          name: nextName ?? current.name,
          ...(nextAvatar !== undefined ? { avatarUrl: nextAvatar } : { avatarUrl: undefined }),
          preferences: nextPreferences,
        };

        set((state) => ({
          user: updated,
          accounts: state.accounts.map((record) =>
            record.user.id === updated.id ? { ...record, user: updated } : record
          ),
        }));
        return { ok: true };
      },
      deleteAccount: () => {
        const current = get().user;
        if (!current) {
          return { ok: false, error: 'No hay sesión activa.' };
        }
        set((state) => ({
          user: null,
          loginAt: null,
          accounts: state.accounts.filter((record) => record.user.id !== current.id),
        }));
        return { ok: true };
      },
      reset: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: 'atlashabita.auth.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): AuthState => ({
        user: state.user,
        loginAt: state.loginAt,
        accounts: state.accounts,
      }),
    }
  )
);

/** Hook utilitario para acceder al usuario sin cargar el store entero. */
export function useAuth() {
  return useAuthStore((state) => ({
    user: state.user,
    loginAt: state.loginAt,
    signIn: state.signIn,
    signUp: state.signUp,
    signOut: state.signOut,
    updateProfile: state.updateProfile,
    deleteAccount: state.deleteAccount,
  }));
}
