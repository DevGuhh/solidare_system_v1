import "dotenv/config";

(async () => {
  const base = "http://localhost:3000";
  const fetch = global.fetch;

  async function login(email, senha) {
    const res = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    return res.json().catch(() => null);
  }

  console.log("Login instituição (contato.1)...");
  const inst = await login("contato.1@doacoes.com", "123456");
  console.log("Resposta instituição:", inst?.mensagem || JSON.stringify(inst));
  const tokenInst = inst?.token || inst?.data?.token;
  if (!tokenInst) {
    console.error("Falha ao logar como instituição");
    process.exit(1);
  }

  const payload = {
    tipo: "MENSAGEM",
    destinatario: "Administrador Geral",
    instituicao: "Instituição UI Test",
    assunto: "Teste UI: via API",
    descricao: "Mensagem enviada por script de verificação.",
  };
  const post = await fetch(base + "/notificacoes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + tokenInst,
    },
    body: JSON.stringify(payload),
  });
  console.log("POST /notificacoes status", post.status);
  const postBody = await post.json().catch(() => null);
  console.log("POST body", postBody);

  console.log("Login admin...");
  const admin = await login("admin@doacoes.com", "admin123");
  const tokenAdmin = admin?.token || admin?.data?.token;
  if (!tokenAdmin) {
    console.error("Falha ao logar como admin");
    process.exit(1);
  }

  const get = await fetch(base + "/notificacoes?limite=10", {
    headers: { Authorization: "Bearer " + tokenAdmin },
  });
  console.log("GET /notificacoes status", get.status);
  const getBody = await get.json().catch(() => null);
  console.log("GET body sample:", getBody?.dados?.slice(0, 5) || getBody);

  process.exit(0);
})();
