const MIN_LENGTH = 8;
const SALT_ROUNDS = 10;

const RULES = [
  {
    test: (pw) => pw.length >= MIN_LENGTH,
    message: `La contraseña debe tener al menos ${MIN_LENGTH} caracteres`,
  },
  {
    test: (pw) => /[A-Z]/.test(pw),
    message: 'La contraseña debe incluir al menos una letra mayúscula (A-Z)',
  },
  {
    test: (pw) => /[a-z]/.test(pw),
    message: 'La contraseña debe incluir al menos una letra minúscula (a-z)',
  },
  {
    test: (pw) => /[0-9]/.test(pw),
    message: 'La contraseña debe incluir al menos un número (0-9)',
  },
  {
    test: (pw) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'~`]/.test(pw),
    message: 'La contraseña debe incluir al menos un carácter especial (por ejemplo: @ # $ % ! & *)',
  },
];

// Valida una contraseña contra la política de seguridad del proyecto.
// Devuelve { valid, errors } con TODOS los requisitos incumplidos, no solo el primero.
function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, errors: ['La contraseña es requerida'] };
  }
  const errors = RULES.filter((rule) => !rule.test(password)).map((rule) => rule.message);
  return { valid: errors.length === 0, errors };
}

module.exports = { validatePassword, MIN_LENGTH, SALT_ROUNDS };
