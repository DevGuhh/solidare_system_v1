import rateLimit from "express-rate-limit";

// Login: limite mais rígido
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: {
    error: "Muitas tentativas de login. Tente novamente mais tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Recuperação de senha: limite rígido
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 5,
  message: {
    error: "Muitas solicitações. Tente novamente em alguns minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Redefinição de senha: limite rígido
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    error: "Muitas tentativas. Tente novamente em alguns minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});