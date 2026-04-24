/**
 * Capa pura de autenticación.
 *
 * Encapsula reglas de validación y la creación de objetos `AuthUser`
 * a partir de credenciales. Hoy trabaja sólo en cliente (MVP, datos en
 * `localStorage`); cuando el backend exponga `POST /auth/login` y
 * `POST /auth/register` bastará con sustituir las funciones puras por
 * llamadas HTTP sin tocar la capa de UI ni la de estado.
 *
 * Por qué vive aquí y no en el store:
 *   - Mantiene el store enfocado en estado/efectos UI (Zustand persist).
 *   - Permite testar la validación sin renderizar React.
 *   - Aísla la sustitución por una API real cambiando una sola pieza.
 */
import type { AuthPreferences, AuthUser } from '../state/auth';

/** Resultado canónico de validar una contraseña en cliente. */
export interface PasswordValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/** Resultado canónico de validar el correo. */
export interface EmailValidationResult {
  readonly valid: boolean;
  readonly error: string | null;
}

/**
 * Política mínima de contraseñas para MVP (no se hashea, sólo se valida).
 *
 * Se exige longitud >= 8, al menos una mayúscula, una minúscula y un dígito.
 * Las reglas son intencionalmente conservadoras: si en el futuro endurecemos
 * la política, este módulo es el único punto a tocar.
 */
const PASSWORD_RULES: ReadonlyArray<{ test: (value: string) => boolean; message: string }> = [
  {
    test: (value) => value.length >= 8,
    message: 'La contraseña debe tener al menos 8 caracteres.',
  },
  {
    test: (value) => /[A-Z]/.test(value),
    message: 'La contraseña debe incluir al menos una mayúscula.',
  },
  {
    test: (value) => /[a-z]/.test(value),
    message: 'La contraseña debe incluir al menos una minúscula.',
  },
  {
    test: (value) => /\d/.test(value),
    message: 'La contraseña debe incluir al menos un dígito.',
  },
];

/**
 * Valida una contraseña según la política PASSWORD_RULES.
 * @param value contraseña en claro proporcionada por el usuario.
 */
export function validatePassword(value: string): PasswordValidationResult {
  const errors = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.message);
  return { valid: errors.length === 0, errors };
}

/**
 * Valida un correo electrónico con un regex ASCII estable.
 * No pretende cumplir RFC 5322 al 100%; sí cubrir el 99% de tipografías reales
 * sin permitir cadenas obviamente erróneas.
 */
export function validateEmail(value: string): EmailValidationResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Introduce un correo electrónico.' };
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(trimmed)) {
    return { valid: false, error: 'Introduce un correo con formato válido.' };
  }
  return { valid: true, error: null };
}

/**
 * Genera un identificador opaco corto para el usuario sin depender de
 * `crypto.randomUUID` (no disponible en jsdom < 22). Para un MVP sin red,
 * basta con un id determinista en función del email + timestamp.
 */
export function buildUserId(email: string, now: number): string {
  const normalized = email.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `usr_${Math.abs(hash).toString(36)}_${now.toString(36)}`;
}

/** Preferencias por defecto si el usuario no las personaliza. */
export const DEFAULT_PREFERENCES: AuthPreferences = {
  units: 'metricas',
  theme: 'sistema',
};

/**
 * Construye un `AuthUser` válido a partir de los datos de registro.
 * @throws cuando el correo es inválido o la contraseña no cumple la política.
 */
export function buildUserFromRegistration(input: {
  email: string;
  password: string;
  name: string;
  now: number;
  avatarUrl?: string;
  preferences?: AuthPreferences;
}): AuthUser {
  const emailCheck = validateEmail(input.email);
  if (!emailCheck.valid) {
    throw new Error(emailCheck.error ?? 'Correo inválido.');
  }
  const passwordCheck = validatePassword(input.password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.errors[0] ?? 'Contraseña inválida.');
  }
  const trimmedName = input.name.trim();
  if (trimmedName.length < 2) {
    throw new Error('El nombre debe tener al menos 2 caracteres.');
  }
  return {
    id: buildUserId(input.email, input.now),
    email: input.email.trim().toLowerCase(),
    name: trimmedName,
    avatarUrl: input.avatarUrl?.trim() ? input.avatarUrl.trim() : undefined,
    preferences: input.preferences ?? DEFAULT_PREFERENCES,
    createdAt: input.now,
  };
}

/**
 * Comprueba que las credenciales coinciden con el usuario almacenado.
 *
 * En el MVP no se hashea la contraseña: se guarda tal cual en `localStorage`.
 * Cuando exista backend real, esta función se sustituirá por una llamada a
 * `POST /auth/login` que devuelva el JWT correspondiente.
 *
 * Cadena de seguridad documentada:
 *   1. UI captura email + contraseña con `type="password"` y autocomplete adecuado.
 *   2. `validatePassword` exige longitud y diversidad de caracteres.
 *   3. `assertCredentials` compara contra el registro persistido.
 *   4. TODO: integrar PBKDF2 (o Argon2id en backend) en cuanto el endpoint exista.
 */
export function assertCredentials(input: {
  email: string;
  password: string;
  storedEmail: string;
  storedPassword: string;
}): boolean {
  return (
    input.email.trim().toLowerCase() === input.storedEmail.trim().toLowerCase() &&
    input.password === input.storedPassword
  );
}
