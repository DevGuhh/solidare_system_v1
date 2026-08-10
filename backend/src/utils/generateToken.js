import jwt from "jsonwebtoken";

// Gera um Token JWT
export const generateToken = (usuarioID, res, role) => {
  const payload = {
    id: usuarioID,
    role: role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  // Salva o token em um cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return token;
};
