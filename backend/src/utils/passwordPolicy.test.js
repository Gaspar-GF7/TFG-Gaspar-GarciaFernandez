import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { validatePassword, MIN_LENGTH, SALT_ROUNDS } from './passwordPolicy.js';

describe('validatePassword', () => {
  it('acepta una contraseña que cumple todos los requisitos', () => {
    const { valid, errors } = validatePassword('Abcdef1!');
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('rechaza contraseñas de menos de 8 caracteres', () => {
    const { valid, errors } = validatePassword('Ab1!');
    expect(valid).toBe(false);
    expect(errors).toContain(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
  });

  it('rechaza contraseñas sin mayúscula', () => {
    const { valid, errors } = validatePassword('abcdefg1!');
    expect(valid).toBe(false);
    expect(errors).toContain('La contraseña debe incluir al menos una letra mayúscula (A-Z)');
  });

  it('rechaza contraseñas sin minúscula', () => {
    const { valid, errors } = validatePassword('ABCDEFG1!');
    expect(valid).toBe(false);
    expect(errors).toContain('La contraseña debe incluir al menos una letra minúscula (a-z)');
  });

  it('rechaza contraseñas sin número', () => {
    const { valid, errors } = validatePassword('Abcdefgh!');
    expect(valid).toBe(false);
    expect(errors).toContain('La contraseña debe incluir al menos un número (0-9)');
  });

  it('rechaza contraseñas sin carácter especial', () => {
    const { valid, errors } = validatePassword('Abcdefg1');
    expect(valid).toBe(false);
    expect(errors).toContain('La contraseña debe incluir al menos un carácter especial (por ejemplo: @ # $ % ! & *)');
  });

  it('reporta TODOS los requisitos incumplidos, no solo el primero', () => {
    const { valid, errors } = validatePassword('abc');
    expect(valid).toBe(false);
    // 'abc' falla: longitud, mayúscula, número y especial (tiene minúscula, así que esa no debería estar)
    expect(errors).toHaveLength(4);
    expect(errors.some((e) => e.includes('minúscula'))).toBe(false);
  });

  it('rechaza contraseña vacía o inexistente sin explotar', () => {
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword(undefined).valid).toBe(false);
    expect(validatePassword(null).valid).toBe(false);
  });
});

describe('hasheo con bcrypt (SALT_ROUNDS)', () => {
  it('usa un cost factor de 10', () => {
    expect(SALT_ROUNDS).toBe(10);
  });

  it('genera un hash distinto del texto plano y verificable con bcrypt.compare', async () => {
    const plain = 'Abcdef1!';
    const hash = await bcrypt.hash(plain, SALT_ROUNDS);

    expect(hash).not.toBe(plain);
    expect(bcrypt.getRounds(hash)).toBe(SALT_ROUNDS);
    await expect(bcrypt.compare(plain, hash)).resolves.toBe(true);
    await expect(bcrypt.compare('otra-cosa', hash)).resolves.toBe(false);
  });
});
