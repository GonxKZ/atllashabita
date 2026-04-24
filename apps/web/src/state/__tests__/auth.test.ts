/* eslint-disable no-undef -- localStorage es global del navegador. */
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../auth';
import { validateEmail, validatePassword } from '../../services/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it('arranca sin usuario ni cuentas registradas', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loginAt).toBeNull();
    expect(state.accounts).toEqual([]);
  });

  it('signUp crea cuenta válida y deja sesión activa', () => {
    const result = useAuthStore.getState().signUp({
      email: 'alex@example.com',
      password: 'Aaaaaa1z',
      name: 'Alex Romero',
    });
    expect(result.ok).toBe(true);
    const { user, loginAt, accounts } = useAuthStore.getState();
    expect(user?.email).toBe('alex@example.com');
    expect(user?.name).toBe('Alex Romero');
    expect(user?.preferences.units).toBe('metricas');
    expect(loginAt).not.toBeNull();
    expect(accounts).toHaveLength(1);
  });

  it('signUp falla cuando la contraseña es débil', () => {
    const result = useAuthStore.getState().signUp({
      email: 'weak@example.com',
      password: 'short',
      name: 'Weak User',
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('debería haber fallado');
    expect(result.error).toMatch(/8 caracteres|mayúscula|minúscula|dígito/i);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('signUp rechaza emails ya registrados', () => {
    const ok = useAuthStore.getState().signUp({
      email: 'dup@example.com',
      password: 'Aaaaaa1z',
      name: 'Dup',
    });
    expect(ok.ok).toBe(true);
    useAuthStore.getState().signOut();
    const dup = useAuthStore.getState().signUp({
      email: 'dup@example.com',
      password: 'Aaaaaa1z',
      name: 'Dup II',
    });
    expect(dup.ok).toBe(false);
    if (dup.ok) throw new Error('debería haber fallado');
    expect(dup.error).toMatch(/ya existe/i);
  });

  it('signIn restaura la sesión con credenciales correctas', () => {
    useAuthStore.getState().signUp({
      email: 'one@example.com',
      password: 'Aaaaaa1z',
      name: 'Uno',
    });
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().user).toBeNull();

    const result = useAuthStore.getState().signIn('one@example.com', 'Aaaaaa1z');
    expect(result.ok).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('one@example.com');
    expect(useAuthStore.getState().loginAt).not.toBeNull();
  });

  it('signIn devuelve error con credenciales incorrectas', () => {
    useAuthStore.getState().signUp({
      email: 'two@example.com',
      password: 'Aaaaaa1z',
      name: 'Dos',
    });
    useAuthStore.getState().signOut();

    const wrongPwd = useAuthStore.getState().signIn('two@example.com', 'Otrapwd1A');
    expect(wrongPwd.ok).toBe(false);

    const missing = useAuthStore.getState().signIn('nope@example.com', 'Aaaaaa1z');
    expect(missing.ok).toBe(false);
  });

  it('updateProfile cambia nombre, avatar y preferencias del usuario actual', () => {
    useAuthStore.getState().signUp({
      email: 'pref@example.com',
      password: 'Aaaaaa1z',
      name: 'Pref Original',
    });
    const result = useAuthStore.getState().updateProfile({
      name: 'Pref Modificado',
      avatarUrl: 'https://example.com/me.png',
      preferences: { units: 'imperiales', theme: 'oscuro' },
    });
    expect(result.ok).toBe(true);
    const user = useAuthStore.getState().user;
    expect(user?.name).toBe('Pref Modificado');
    expect(user?.avatarUrl).toBe('https://example.com/me.png');
    expect(user?.preferences.units).toBe('imperiales');
    expect(user?.preferences.theme).toBe('oscuro');
  });

  it('updateProfile rechaza nombres demasiado cortos', () => {
    useAuthStore.getState().signUp({
      email: 'short@example.com',
      password: 'Aaaaaa1z',
      name: 'Nombre',
    });
    const result = useAuthStore.getState().updateProfile({ name: 'A' });
    expect(result.ok).toBe(false);
  });

  it('signOut deja al usuario fuera pero conserva las cuentas', () => {
    useAuthStore.getState().signUp({
      email: 'foo@example.com',
      password: 'Aaaaaa1z',
      name: 'Foo',
    });
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().loginAt).toBeNull();
    expect(useAuthStore.getState().accounts).toHaveLength(1);
  });

  it('deleteAccount elimina la cuenta y cierra la sesión', () => {
    useAuthStore.getState().signUp({
      email: 'bye@example.com',
      password: 'Aaaaaa1z',
      name: 'Bye',
    });
    const result = useAuthStore.getState().deleteAccount();
    expect(result.ok).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accounts).toHaveLength(0);
  });

  it('persiste en localStorage usando la clave atlashabita.auth.v1', () => {
    useAuthStore.getState().signUp({
      email: 'persist@example.com',
      password: 'Aaaaaa1z',
      name: 'Persist',
    });
    const raw = localStorage.getItem('atlashabita.auth.v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '{}') as { state?: { accounts?: unknown[] } };
    expect(parsed.state?.accounts).toHaveLength(1);
  });
});

describe('helpers de validación', () => {
  it('validatePassword exige longitud, mayúscula, minúscula y dígito', () => {
    expect(validatePassword('short').valid).toBe(false);
    expect(validatePassword('alllowercase1').valid).toBe(false);
    expect(validatePassword('ALLUPPERCASE1').valid).toBe(false);
    expect(validatePassword('NoDigitsHere').valid).toBe(false);
    expect(validatePassword('Aaaaaa1z').valid).toBe(true);
  });

  it('validateEmail acepta direcciones razonables y rechaza inválidas', () => {
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail('plain').valid).toBe(false);
    expect(validateEmail('a@b').valid).toBe(false);
    expect(validateEmail('a@b.c').valid).toBe(true);
    expect(validateEmail(' alex@example.com ').valid).toBe(true);
  });
});
