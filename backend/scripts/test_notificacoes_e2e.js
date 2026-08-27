import "dotenv/config";

async function run() {
  const base = "http://localhost:3000";

  const fetch = global.fetch;
  const loginRes = await (
    await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@doacoes.com", senha: "admin123" }),
    })
  ).json();

  console.log("LOGIN", loginRes.mensagem || JSON.stringify(loginRes));

  const token = loginRes.token || loginRes.data?.token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  };

  // GET
  let r = await fetch(base + "/notificacoes?limite=5", { headers });
  console.log("GET1 status", r.status);
  console.log("GET1 body", await r.json().catch(() => null));

  // POST
  const payload = {
    instituicao: "Teste Unit",
    assunto: "Teste integração",
    descricao: "Corpo da mensagem de teste.",
  };
  r = await fetch(base + "/notificacoes", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  console.log("POST status", r.status);
  const post = await r.json().catch(() => null);
  console.log("POST body", post);

  const newId = post?.dados?.id;
  if (!newId) {
    console.log("No new id returned from POST");
    return;
  }

  // PATCH
  r = await fetch(`${base}/notificacoes/${encodeURIComponent(newId)}/lida`, {
    method: "PATCH",
    headers,
  });
  console.log("PATCH status", r.status);
  console.log("PATCH body", await r.json().catch(() => null));

  // Final GET
  r = await fetch(base + "/notificacoes?limite=5", { headers });
  console.log("GET2 status", r.status);
  console.log("GET2 body", await r.json().catch(() => null));
}

run().catch((e) => {
  console.error("E2E Test failed:", e);
  process.exit(1);
});
