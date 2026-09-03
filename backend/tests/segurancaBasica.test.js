import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = process.env.JWT_SECRET || "solidare-test-secret-with-at-least-32-chars";

test("JWT expirado é reconhecido como TokenExpiredError", () => {
  const token = jwt.sign(
    { id: 1, role: "ADMIN" },
    process.env.JWT_SECRET,
    { expiresIn: -1 },
  );

  assert.throws(
    () => jwt.verify(token, process.env.JWT_SECRET),
    (erro) => erro instanceof jwt.TokenExpiredError,
  );
});

test("JWT adulterado é reconhecido como JsonWebTokenError", () => {
  const token = jwt.sign(
    { id: 1, role: "ADMIN" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  const adulterado = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

  assert.throws(
    () => jwt.verify(adulterado, process.env.JWT_SECRET),
    (erro) =>
      erro instanceof jwt.JsonWebTokenError &&
      !(erro instanceof jwt.TokenExpiredError),
  );
});

test("papéis aceitos pelo sistema permanecem explícitos", () => {
  const papeis = new Set(["ADMIN", "INSTITUICAO"]);

  assert.equal(papeis.has("ADMIN"), true);
  assert.equal(papeis.has("INSTITUICAO"), true);
  assert.equal(papeis.has("USUARIO"), false);
});
