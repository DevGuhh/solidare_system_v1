import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function obterChave() {
  const segredo =
    process.env.PROVISIONAL_PASSWORD_ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!segredo || segredo.trim().length < 16) {
    throw new Error(
      "Configure PROVISIONAL_PASSWORD_ENCRYPTION_KEY (recomendado) ou um JWT_SECRET seguro.",
    );
  }

  return crypto.createHash("sha256").update(segredo).digest();
}

export function criptografarSenhaProvisoria(senha) {
  if (!senha) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, obterChave(), iv);
  const criptografado = Buffer.concat([
    cipher.update(String(senha), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, criptografado].map((parte) => parte.toString("base64")).join(".");
}

export function descriptografarSenhaProvisoria(valor) {
  if (!valor) return null;

  const partes = String(valor).split(".");
  if (partes.length !== 3) {
    throw new Error("Formato inválido da senha provisória armazenada.");
  }

  const [ivBase64, tagBase64, dadosBase64] = partes;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    obterChave(),
    Buffer.from(ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(dadosBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
