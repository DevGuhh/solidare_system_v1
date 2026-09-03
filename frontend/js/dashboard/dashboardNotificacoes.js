/*
    Descrição: Integração do painel de notificações com o backend.
    Alterações: usar `listarNotificacoes`, `enviarNotificacao` e `marcarComoLida`;
    exportar `initNotificacoesDashboard` para bootstrap; fallback para UI local
    quando backend indisponível.
    Data: 2026-08-27
    Testado: login instituição `contato.1@doacoes.com` / `123456`; envio via API/UI verificado.
*/

import {
  listarNotificacoes,
  enviarNotificacao,
  marcarComoLida,
} from "../api/notificacoesApi.js";
import { listarInstituicoes } from "../api/instituicoesApi.js";
import toast from "../components/toast.js";
import { loading } from "../components/loading.js";

function obterUsuarioLogado() {
  try {
    return JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");
  } catch {
    return null;
  }
}

function ehInstituicao() {
  return String(obterUsuarioLogado()?.role || "").toUpperCase() === "INSTITUICAO";
}

function formatTempo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export async function carregarNotificacoesDashboard(limite = 5) {
  // Buscar elementos conhecidos
  const listaEl = document.getElementById("listaNotificacoes");
  const painelEl = document.getElementById("painelNotificacoes");
  if (!listaEl || !painelEl) {
    console.warn(
      "Elemento #listaNotificacoes ou #painelNotificacoes não encontrado.",
    );
    return;
  }
  // mostrar o loading apenas dentro da lista, para não substituir toda a estrutura do painel
  loading.mostrarLocal(listaEl, { texto: "Carregando notificações..." });
  try {
    const notificacoes = (await listarNotificacoes(limite)) || [];

    const usuarioInstituicao = ehInstituicao();
    const semNotificacoes = !notificacoes || notificacoes.length === 0;

    // O formulário precisa existir mesmo quando a instituição ainda não tem
    // nenhuma mensagem. Caso contrário ela nunca consegue iniciar a conversa.
    listaEl.innerHTML = "";

    // compose area
    const compose = document.createElement("div");
    compose.className = "notificacoes-compose";
    compose.style.padding = "12px";
    compose.style.borderBottom = "1px solid #eef0f3";
    compose.innerHTML = `
            <div style="font-weight:700;margin-bottom:8px;">${usuarioInstituicao ? "Enviar mensagem ao administrador" : "Enviar nova mensagem"}</div>
            <div class="compose-selected-name" style="margin-bottom:6px;color:#374151;font-weight:600;display:${usuarioInstituicao ? "block" : "none"};">${usuarioInstituicao ? "Administrador Geral" : ""}</div>
            <div style="display:grid;gap:8px;">
                <input class="inputAssunto" placeholder="Assunto" style="width:100%;padding:8px;border-radius:6px;border:1px solid #e6e9ee;" />
                <textarea class="inputDescricao" placeholder="${usuarioInstituicao ? "Escreva sua mensagem para o administrador" : "Descrição"}" style="width:100%;height:80px;padding:8px;border-radius:6px;border:1px solid #e6e9ee;"></textarea>
                <div style="display:flex;justify-content:flex-end;"><button class="btnEnviarNova btn btn-sm btn-primary">Enviar mensagem</button></div>
            </div>
        `;
    listaEl.appendChild(compose);
    // remove any leftover selects to simplify UI (we use the conversation header as target)
    listaEl.querySelectorAll(".selectInstituicao").forEach((s) => s.remove());

    // compose has no select in Admin panel — use the selected conversation name instead

    // handle sending new message (use selected conversation name as target)
    compose
      .querySelector(".btnEnviarNova")
      .addEventListener("click", async () => {
        const assunto = compose.querySelector(".inputAssunto").value.trim();
        const descricao = compose.querySelector(".inputDescricao").value.trim();
        const alvoEl = compose.querySelector(".compose-selected-name");
        const alvo = usuarioInstituicao
          ? "Administrador Geral"
          : alvoEl?.textContent?.trim();
        const alvoId = usuarioInstituicao
          ? null
          : Number(alvoEl?.dataset?.instituicaoId) || null;
        if (!alvo) {
          toast.aviso(
            "Selecione uma conversa no painel para definir destinatário.",
          );
          return;
        }
        if (!descricao) {
          toast.aviso("Escreva a mensagem antes de enviar.");
          return;
        }
        const dados = {
          tipo: "MENSAGEM",
          destinatario: alvo,
          destinatarioId: null,
          instituicao: usuarioInstituicao ? undefined : alvo,
          instituicaoId: usuarioInstituicao ? undefined : alvoId,
          remetente: usuarioInstituicao
            ? obterUsuarioLogado()?.nome || "Instituição"
            : "Administrador Geral",
          remetenteId: null,
          assunto:
            assunto ||
            (usuarioInstituicao ? "Mensagem para o Administrador" : "Mensagem do Administrador"),
          descricao,
          mensagem: descricao,
        };
        loading.mostrar({
          titulo: "Enviando mensagem",
          mensagem: "Aguarde...",
        });
        try {
          const resp = await enviarNotificacao(dados);
          toast.sucesso(
            resp?.mock
              ? "Mensagem registrada localmente."
              : "Mensagem enviada.",
          );
          carregarNotificacoesDashboard().catch(() => {});
        } catch (e) {
          toast.erro("Erro ao enviar mensagem.");
        } finally {
          loading.ocultar({ forcar: true });
        }
      });

    if (semNotificacoes) {
      const vazio = document.createElement("div");
      vazio.className = "text-muted text-center py-3";
      vazio.innerHTML = `<i class="fas fa-bell-slash"></i> ${usuarioInstituicao ? "Nenhuma mensagem na conversa ainda." : "Nenhuma notificação recente."}`;
      listaEl.appendChild(vazio);
      atualizarBadgeEHeader([]);
      return;
    }

    // Agrupa por ID da instituição. O nome é apenas para exibição.
    // Isso evita misturar conversas caso existam instituições com nomes iguais.
    const grupos = {};
    (notificacoes || []).forEach((n) => {
      const nome =
        n.instituicao || n.remetente || n.destinatario || "Sem instituição";
      const id = Number(n.instituicaoId) || null;
      const chave = id ? `id:${id}` : `nome:${nome}`;

      if (!grupos[chave]) {
        grupos[chave] = { id, nome, mensagens: [] };
      }
      grupos[chave].mensagens.push(n);
    });

    // Seleciona a primeira conversa disponível para o formulário superior.
    const firstKey = Object.keys(grupos)[0];
    if (firstKey && !usuarioInstituicao) {
      const label = listaEl.querySelector(".compose-selected-name");
      if (label) {
        label.style.display = "";
        label.textContent = grupos[firstKey].nome;
        label.dataset.instituicaoId = grupos[firstKey].id || "";
      }
    }

    Object.keys(grupos)
      .slice(0, 10)
      .forEach((chave) => {
        const grupo = grupos[chave];
        const nomeInstituicao = grupo.nome;
        const instituicaoId = grupo.id;
        const mensagens = grupo.mensagens;
        const conv = document.createElement("div");
        conv.className = "conv-grupo";
        conv.style.borderTop = "1px solid #f1f3f6";
        conv.style.padding = "10px";
        conv.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="font-weight:600;cursor:pointer;" class="conv-header-name">🏢 ${nomeInstituicao}</div>
                    <button class="btnToggleConv btn btn-sm">Ocultar</button>
                </div>
                <div class="conv-body" style="max-height:260px;overflow:auto;padding-bottom:6px;"></div>
            `;
        const body = conv.querySelector(".conv-body");
        // render last messages as chat bubbles
        mensagens.slice(-20).forEach((m) => {
          const isAdmin =
            (m.remetente &&
              String(m.remetente).toLowerCase().includes("administrador")) ||
            m.remetenteId === null;
          const whoLabel = isAdmin
            ? m.remetente || "ADMIN"
            : m.remetente || m.instituicao || "INSTITUIÇÃO";
          const bubble = document.createElement("div");
          bubble.className =
            "mensagem-bubble " + (isAdmin ? "bubble-right" : "bubble-left");
          bubble.style.marginBottom = "8px";
          bubble.innerHTML = `
                    <div class="mensagem-topo"><strong>${whoLabel}</strong><span class="mensagem-hora" style="float:right;opacity:0.6;font-size:0.8rem;margin-left:8px;">${formatTempo(m.data || m.criadoEm)}</span></div>
                    <div class="mensagem-corpo" style="margin-top:6px;">${m.descricao || m.mensagem || ""}</div>
                `;
          body.appendChild(bubble);
        });
        // composer for this conversation
        const replyBox = document.createElement("div");
        replyBox.style.display = "flex";
        replyBox.style.gap = "8px";
        replyBox.style.marginTop = "8px";
        replyBox.innerHTML = `
                <input class="convInput" placeholder="Escreva uma mensagem..." style="flex:1;padding:8px;border-radius:6px;border:1px solid #e6e9ee;" />
                <button class="convSend btn btn-sm btn-primary">Enviar</button>
            `;
        // prevent parent click
        replyBox.addEventListener("click", (e) => e.stopPropagation());
        conv.appendChild(replyBox);
        listaEl.appendChild(conv);

        // clicking the conversation header selects the institution in the compose select
        conv
          .querySelector(".conv-header-name")
          .addEventListener("click", (ev) => {
            const label = listaEl.querySelector(".compose-selected-name");
            if (label && !usuarioInstituicao) {
              label.style.display = "";
              label.textContent = nomeInstituicao;
              label.dataset.instituicaoId = instituicaoId || "";
            }
            // focus compose input
            const composeInput =
              listaEl.querySelector(".inputDescricao") ||
              listaEl.querySelector(".convInput");
            if (composeInput) composeInput.focus();
          });

        conv.querySelector(".btnToggleConv").addEventListener("click", (ev) => {
          const b = conv.querySelector(".conv-body");
          if (b.style.display === "none") {
            b.style.display = "";
            ev.target.textContent = "Ocultar";
          } else {
            b.style.display = "none";
            ev.target.textContent = "Mostrar";
          }
        });

        conv.querySelector(".convSend").addEventListener("click", async () => {
          const texto = replyBox.querySelector(".convInput").value.trim();
          if (!texto) {
            toast.aviso("Escreva uma mensagem.");
            return;
          }
          const dados = {
            tipo: "RESPOSTA",
            destinatario: nomeInstituicao,
            destinatarioId: instituicaoId,
            instituicao: nomeInstituicao,
            instituicaoId,
            remetente: "Administrador Geral",
            remetenteId: null,
            assunto: `RE: ${mensagens[0]?.assunto || ""}`,
            descricao: texto,
            mensagem: texto,
          };
          try {
            const r = await enviarNotificacao(dados);
            toast.sucesso(
              r?.sucesso ? "Resposta enviada." : "Registrada localmente.",
            );
            replyBox.querySelector(".convInput").value = "";
            carregarNotificacoesDashboard().catch(() => {});
          } catch (e) {
            toast.erro("Erro ao enviar resposta.");
          }
        });
      });

    atualizarBadgeEHeader(notificacoes);
  } catch (error) {
    listaEl.innerHTML = `<div class="alert alert-danger">Erro ao carregar notificações.</div>`;
    toast.erro("Erro ao carregar notificações");
  } finally {
    // garantir que o loading local seja removido caso algo falhe
    try {
      // remover qualquer loading local que tenha sido inserido
      if (listaEl) {
        // se o conteúdo atual for apenas o loading, restauramos uma placeholder vazia
        const hasLocal = listaEl.querySelector(".loading-solidare-local");
        if (hasLocal) {
          listaEl.innerHTML = `<div class="text-muted text-center py-3"><i class="fas fa-bell-slash"></i> Nenhuma notificação recente.</div>`;
        }
      }
    } catch (e) {
      console.warn("Erro ao limpar loading local de notificações", e);
    }
  }
}

// Polling state to refresh notificações automaticamente
let _notificacoesPollingTimer = null;
let _notificacoesSnapshot = "";

function _computeSnapshot(notificacoes) {
  try {
    return (notificacoes || [])
      .map((n) => `${n.id}:${n.lida ? 1 : 0}`)
      .join("|");
  } catch (e) {
    return "";
  }
}

let _notificacoesPollingEmAndamento = false;

async function atualizarNotificacoesPolling() {
  // Não consulta o backend enquanto a aba está em segundo plano e evita
  // sobreposição caso uma requisição demore mais que o intervalo do polling.
  if (document.hidden || _notificacoesPollingEmAndamento) return;

  _notificacoesPollingEmAndamento = true;

  try {
    const latest = (await listarNotificacoes(10)) || [];
    const snap = _computeSnapshot(latest);

    if (_notificacoesSnapshot && snap !== _notificacoesSnapshot) {
      atualizarBadgeEHeader(latest);

      const hadUnreadBefore = _notificacoesSnapshot.includes(":0");
      const hasUnreadNow = latest.some((n) => !n.lida);

      if (!hadUnreadBefore && hasUnreadNow) {
        toast.informacao("Você tem novas notificações");
      }
    }

    _notificacoesSnapshot = snap;
  } catch (e) {
    // Polling é auxiliar e não deve interromper a navegação.
  } finally {
    _notificacoesPollingEmAndamento = false;
  }
}

function startNotificacoesPolling(intervalMs = 30000) {
  if (_notificacoesPollingTimer) return;

  _notificacoesPollingTimer = setInterval(
    atualizarNotificacoesPolling,
    intervalMs,
  );
}

function stopNotificacoesPolling() {
  if (_notificacoesPollingTimer) {
    clearInterval(_notificacoesPollingTimer);
    _notificacoesPollingTimer = null;
  }
}

function atualizarBadgeEHeader(notificacoes = []) {
  const badge = document.getElementById("badgeNotificacoes");
  const texto = document.getElementById("textoContadorNotificacoes");
  const unread = (notificacoes || []).filter((n) => !n.lida).length;
  if (badge) {
    if (unread > 0) {
      badge.removeAttribute("hidden");
      badge.textContent = String(unread);
    } else {
      badge.setAttribute("hidden", "");
    }
  }
  if (texto) {
    if (unread > 0) {
      texto.textContent = `${unread} ${unread === 1 ? "nova" : "novas"}`;
    } else {
      texto.textContent = "Nenhuma nova notificação";
    }
  }
}

async function abrirResposta(notificacao, origemEl) {
  if (!origemEl) return;

  // remover qualquer área de resposta já aberta na lista
  document
    .querySelectorAll(".notificacao-item .resposta-area")
    .forEach((n) => n.remove());

  const area = document.createElement("div");
  area.className = "resposta-area";
  area.style.padding = "10px";
  area.style.marginTop = "8px";
  area.style.borderTop = "1px dashed #e6e9ee";
  area.innerHTML = `
        <div style="font-weight:600;color:#1f2937;margin-bottom:6px;">Responder a ${notificacao?.instituicao || notificacao?.remetente || ""}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:8px;">
            <input class="respostaAssunto" placeholder="Assunto (opcional)" style="width:100%;padding:8px;border-radius:6px;border:1px solid #e6e9ee;" />
            <textarea class="respostaText" placeholder="Escreva sua resposta..." style="width:100%;height:100px;padding:8px;border-radius:6px;border:1px solid #e6e9ee;"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;gap:8px;">
            <button class="btnEnviarResposta btn btn-sm btn-primary">Enviar resposta</button>
        </div>
    `;

  // anexar logo após o elemento clicado
  origemEl.appendChild(area);

  // impedir que cliques dentro da área de resposta propaguem para o item pai
  area.addEventListener("click", (ev) => ev.stopPropagation());

  area
    .querySelector(".btnEnviarResposta")
    .addEventListener("click", async () => {
      const assuntoInput = area.querySelector(".respostaAssunto");
      const texto = area.querySelector(".respostaText").value.trim();
      const assuntoValor = assuntoInput ? assuntoInput.value.trim() : "";
      if (!texto) {
        toast.aviso("Escreva uma resposta antes de enviar.");
        return;
      }
      try {
        const dados = {
          tipo: "RESPOSTA",
          destinatario:
            notificacao?.remetente ||
            notificacao?.instituicao ||
            notificacao?.destinatario,
          destinatarioId:
            notificacao?.remetenteId ||
            notificacao?.instituicaoId ||
            notificacao?.destinatarioId ||
            null,
          instituicao: "Administrador Geral",
          instituicaoId: null,
          remetente: "Administrador Geral",
          remetenteId: null,
          assunto: assuntoValor || `RE: ${notificacao?.assunto || ""}`,
          descricao: texto,
          mensagem: texto,
        };
        const resp = await enviarNotificacao(dados);
        if (resp && resp.sucesso) {
          toast.sucesso("Resposta enviada.");
          carregarNotificacoesDashboard().catch(() => {});
        } else {
          toast.informacao("Resposta registrada localmente.");
        }
        // remover área após envio
        area.remove();
      } catch (e) {
        toast.erro("Erro ao enviar resposta.");
      }
    });
}

export function initNotificacoesDashboard() {
  // initial load
  carregarNotificacoesDashboard().catch((e) => console.error(e));

  // start automatic polling for new notifications
  startNotificacoesPolling();

  // refresh immediately when tab/window regains focus
  window.addEventListener("focus", () => {
    atualizarNotificacoesPolling().catch(() => {});
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      atualizarNotificacoesPolling().catch(() => {});
    }
  });

  // toggle painel ao clicar no sino
  const btn = document.getElementById("btnNotificacoes");
  const painel = document.getElementById("painelNotificacoes");
  if (btn && painel) {
    btn.addEventListener("click", () => {
      const aberto = !painel.hasAttribute("hidden");
      if (aberto) {
        painel.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", "false");
      } else {
        painel.removeAttribute("hidden");
        btn.setAttribute("aria-expanded", "true");
        // carregar ao abrir
        carregarNotificacoesDashboard().catch(() => {});
      }
    });
  }

  // If there's a global register event from the institutions module, listen and forward to backend
  window.addEventListener("solidare:notificacao", async (ev) => {
    const dados = ev.detail || {};
    try {
      const resp = await enviarNotificacao(dados);
      if (resp && resp.sucesso === true) {
        toast.sucesso("Mensagem enviada com sucesso");
        // refresh list
        carregarNotificacoesDashboard().catch(() => {});
      } else {
        toast.informacao("Mensagem registrada localmente");
        carregarNotificacoesDashboard().catch(() => {});
      }
    } catch (err) {
      console.error("Erro ao enviar notificação:", err);
      toast.erro("Erro ao enviar notificação");
    }
  });
  // stop polling when unloading
  window.addEventListener("beforeunload", () => stopNotificacoesPolling());
}
