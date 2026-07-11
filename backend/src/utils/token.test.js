import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken, TOKEN_EXPIRES_IN } from './token.js';

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-para-vitest';
});

describe('signToken / verifyToken', () => {
  it('expira a las 8 horas por defecto', () => {
    expect(TOKEN_EXPIRES_IN).toBe('8h');
  });

  it('genera un token que expira exactamente 8h después de emitido', () => {
    const token = signToken({ id: 1, rol: 'administrador' });
    const decoded = jwt.decode(token);

    expect(decoded.id).toBe(1);
    expect(decoded.rol).toBe('administrador');
    expect(decoded.exp - decoded.iat).toBe(8 * 60 * 60);
  });

  it('verifyToken devuelve el payload de un token válido', () => {
    const token = signToken({ id: 5, rol: 'operador' });
    const payload = verifyToken(token);
    expect(payload.id).toBe(5);
    expect(payload.rol).toBe('operador');
  });

  it('verifyToken rechaza un token expirado con TokenExpiredError', () => {
    const expiredToken = jwt.sign(
      { id: 1, rol: 'administrador' },
      process.env.JWT_SECRET,
      { expiresIn: -10 } // ya vencido al momento de emitirse
    );

    expect(() => verifyToken(expiredToken)).toThrowError();
    try {
      verifyToken(expiredToken);
    } catch (err) {
      expect(err.name).toBe('TokenExpiredError');
    }
  });

  it('verifyToken rechaza un token con firma inválida', () => {
    const tokenAjeno = jwt.sign({ id: 1 }, 'otro-secreto-distinto');
    expect(() => verifyToken(tokenAjeno)).toThrowError();
  });
});
