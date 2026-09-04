import {
  alterarStatusChamadoSuporte,
  criarChamadoSuporte,
  detalharChamadoSuporte,
  listarChamadosSuporte,
  responderChamadoSuporte,
} from "./api/suporteApi.js";

import toast from "./components/toast.js";
import { loading } from "./components/loading.js";

let chamadoSelecionadoId = null;
let pollingTimer = null;
let carregandoLista = false;

function usuario() {
  try {
    return JSON.parse(
      sessionStorage.getItem("usuarioLogado") || "null",
    );
  } catch {
    return null;
  }
}

function role() {
  return String(usuario()?.role || "").toUpperCase();
}

function ehAdmin() {
  return role() === "ADMIN";
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dataHora(valor) {
  if (!valor) return "";
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelCategoria(categoria) {
  return {
    ALTERACAO_CADASTRAL: "Alteração cadastral",
    DUVIDA: "Dúvida",
    PROBLEMA_TECNICO: "Problema técnico",
    OUTRO: "Outro",
  }[categoria] || categoria || "Outro";
}

function labelStatus(status) {
  return {
    ABERTO: "Aberto",
    EM_ATENDIMENTO: "Em atendimento",
    AGUARDANDO_INSTITUICAO: "Aguardando instituição",
    RESOLVIDO: "Resolvido",
  }[status] || status || "";
}

function atualizarBadge(total = 0) {
  const badge = document.getElementById("badgeSuporte");
  if (!badge) return;

  if (total > 0) {
    badge.textContent = total > 99 ? "99+" : String(total);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

function abrirCentral() {
  const modal = document.getElementById("modalSuporte");
  if (!modal) return;

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("suporte-modal-aberto");

  carregarChamados().catch(() => {});
}

function fecharCentral() {
  const modal = document.getElementById("modalSuporte");
  if (!modal) return;

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("suporte-modal-aberto");
}

function renderEstadoInicial() {
  const detalhe = document.getElementById("suporteDetalhe");
  if (!detalhe) return;

  detalhe.innerHTML = `
    <div class="suporte-vazio-grande">
      <div class="suporte-vazio-icone">
        <i class="fa-regular fa-comments"></i>
      </div>
      <strong>Central de suporte</strong>
      <span>
        ${
          ehAdmin()
            ? "Selecione um chamado para iniciar o atendimento."
            : "Selecione um chamado ou abra um novo atendimento."
        }
      </span>
    </div>
  `;
}

function renderLista(chamados = []) {
  const lista = document.getElementById("suporteListaChamados");
  if (!lista) return;

  if (!chamados.length) {
    lista.innerHTML = `
      <div class="suporte-lista-vazia">
        <i class="fa-regular fa-folder-open"></i>
        <strong>Nenhum chamado</strong>
        <span>
          ${
            ehAdmin()
              ? "Não existem solicitações de suporte no momento."
              : "Abra um chamado quando precisar falar com o administrador."
          }
        </span>
      </div>
    `;
    return;
  }

  lista.innerHTML = chamados
    .map((chamado) => {
      const selecionado =
        Number(chamado.id) === Number(chamadoSelecionadoId);

      return `
        <button
          type="button"
          class="suporte-chamado-item ${selecionado ? "ativo" : ""}"
          data-chamado-id="${chamado.id}"
        >
          <div class="suporte-item-topo">
            <span class="suporte-item-categoria">
              ${escapar(labelCategoria(chamado.categoria))}
            </span>
            ${
              chamado.naoLidas
                ? `<span class="suporte-nao-lidas">${chamado.naoLidas}</span>`
                : ""
            }
          </div>

          <strong>${escapar(chamado.assunto)}</strong>

          ${
            ehAdmin()
              ? `<span class="suporte-item-instituicao">
                   <i class="fa-regular fa-building"></i>
                   ${escapar(chamado.instituicao?.nome || "Instituição")}
                 </span>`
              : ""
          }

          <div class="suporte-item-rodape">
            <span class="status-suporte status-${String(chamado.status).toLowerCase()}">
              ${escapar(labelStatus(chamado.status))}
            </span>
            <time>${escapar(dataHora(chamado.atualizadoEm))}</time>
          </div>
        </button>
      `;
    })
    .join("");

  lista
    .querySelectorAll("[data-chamado-id]")
    .forEach((botao) => {
      botao.addEventListener("click", async () => {
        chamadoSelecionadoId = Number(
          botao.dataset.chamadoId,
        );
        await carregarDetalhe(chamadoSelecionadoId);
        await carregarChamados({
          silencioso: true,
          preservarDetalhe: true,
        });
      });
    });
}

async function carregarChamados({
  silencioso = false,
  preservarDetalhe = false,
} = {}) {
  if (carregandoLista || document.hidden) return;

  carregandoLista = true;

  const lista = document.getElementById("suporteListaChamados");

  if (!silencioso && lista) {
    lista.innerHTML = `
      <div class="suporte-carregando">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Carregando chamados...
      </div>
    `;
  }

  try {
    const resposta = await listarChamadosSuporte(100);
    const chamados = resposta.dados || [];

    atualizarBadge(resposta.totalNaoLidas || 0);
    renderLista(chamados);

    if (!preservarDetalhe) {
      if (
        chamadoSelecionadoId &&
        chamados.some(
          (item) =>
            Number(item.id) === Number(chamadoSelecionadoId),
        )
      ) {
        await carregarDetalhe(chamadoSelecionadoId);
      } else {
        chamadoSelecionadoId = null;
        renderEstadoInicial();
      }
    }
  } catch (erro) {
    if (lista) {
      lista.innerHTML = `
        <div class="suporte-lista-vazia">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>Falha ao carregar</strong>
          <span>${escapar(erro.message)}</span>
        </div>
      `;
    }
  } finally {
    carregandoLista = false;
  }
}

function renderMensagem(mensagem) {
  const minha = mensagem.autorRole === role();

  return `
    <div class="suporte-mensagem ${minha ? "minha" : "outra"}">
      <div class="suporte-mensagem-meta">
        <strong>${escapar(mensagem.autorNome)}</strong>
        <span>${escapar(dataHora(mensagem.criadoEm))}</span>
      </div>
      <div class="suporte-mensagem-corpo">
        ${escapar(mensagem.mensagem).replaceAll("\n", "<br>")}
      </div>
    </div>
  `;
}

async function carregarDetalhe(id) {
  const detalhe = document.getElementById("suporteDetalhe");
  if (!detalhe) return;

  detalhe.innerHTML = `
    <div class="suporte-carregando suporte-carregando-detalhe">
      <i class="fa-solid fa-spinner fa-spin"></i>
      Carregando atendimento...
    </div>
  `;

  try {
    const resposta = await detalharChamadoSuporte(id);
    const chamado = resposta.dados;

    detalhe.innerHTML = `
      <div class="suporte-detalhe-header">
        <div>
          <div class="suporte-detalhe-kicker">
            Chamado #${chamado.id}
          </div>
          <h3>${escapar(chamado.assunto)}</h3>
          <div class="suporte-detalhe-info">
            <span>
              <i class="fa-solid fa-tag"></i>
              ${escapar(labelCategoria(chamado.categoria))}
            </span>
            ${
              ehAdmin()
                ? `<span>
                     <i class="fa-regular fa-building"></i>
                     ${escapar(chamado.instituicao?.nome || "")}
                   </span>`
                : ""
            }
          </div>
        </div>

        ${
          ehAdmin()
            ? `
              <label class="suporte-status-editor">
                <span>Status</span>
                <select id="suporteStatusChamado">
                  <option value="ABERTO" ${chamado.status === "ABERTO" ? "selected" : ""}>Aberto</option>
                  <option value="EM_ATENDIMENTO" ${chamado.status === "EM_ATENDIMENTO" ? "selected" : ""}>Em atendimento</option>
                  <option value="AGUARDANDO_INSTITUICAO" ${chamado.status === "AGUARDANDO_INSTITUICAO" ? "selected" : ""}>Aguardando instituição</option>
                  <option value="RESOLVIDO" ${chamado.status === "RESOLVIDO" ? "selected" : ""}>Resolvido</option>
                </select>
              </label>
            `
            : `
              <span class="status-suporte status-${String(chamado.status).toLowerCase()}">
                ${escapar(labelStatus(chamado.status))}
              </span>
            `
        }
      </div>

      <div class="suporte-conversa" id="suporteConversa">
        ${(chamado.mensagens || [])
          .map(renderMensagem)
          .join("")}
      </div>

      ${
        chamado.status === "RESOLVIDO"
          ? `
            <div class="suporte-resolvido">
              <i class="fa-solid fa-circle-check"></i>
              Este chamado foi resolvido.
              ${
                ehAdmin()
                  ? "Você pode alterar o status acima se precisar reabri-lo."
                  : "Se precisar de outro atendimento, abra um novo chamado."
              }
            </div>
          `
          : `
            <form class="suporte-resposta" id="formRespostaSuporte">
              <textarea
                id="mensagemRespostaSuporte"
                maxlength="4000"
                placeholder="${
                  ehAdmin()
                    ? "Digite sua resposta para a instituição..."
                    : "Digite sua mensagem para o administrador..."
                }"
                required
              ></textarea>

              <div class="suporte-resposta-footer">
                <span>Máximo de 4000 caracteres</span>
                <button type="submit">
                  <i class="fa-regular fa-paper-plane"></i>
                  Enviar resposta
                </button>
              </div>
            </form>
          `
      }
    `;

    const conversa = document.getElementById("suporteConversa");
    if (conversa) {
      conversa.scrollTop = conversa.scrollHeight;
    }

    const statusSelect =
      document.getElementById("suporteStatusChamado");

    statusSelect?.addEventListener("change", async () => {
      try {
        statusSelect.disabled = true;
        await alterarStatusChamadoSuporte(
          chamado.id,
          statusSelect.value,
        );
        toast.sucesso("Status do chamado atualizado.");
        await carregarDetalhe(chamado.id);
        await carregarChamados({
          silencioso: true,
          preservarDetalhe: true,
        });
      } catch (erro) {
        toast.erro(erro.message);
      } finally {
        statusSelect.disabled = false;
      }
    });

    const form =
      document.getElementById("formRespostaSuporte");

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const campo =
        document.getElementById("mensagemRespostaSuporte");

      const mensagem = campo?.value.trim();

      if (!mensagem) {
        toast.aviso("Digite uma mensagem.");
        return;
      }

      const botao =
        form.querySelector('button[type="submit"]');

      try {
        botao.disabled = true;

        await responderChamadoSuporte(
          chamado.id,
          mensagem,
        );

        campo.value = "";
        toast.sucesso("Resposta enviada.");

        await carregarDetalhe(chamado.id);
        await carregarChamados({
          silencioso: true,
          preservarDetalhe: true,
        });
      } catch (erro) {
        toast.erro(erro.message);
      } finally {
        botao.disabled = false;
      }
    });

    atualizarBadge(0);
    carregarChamados({
      silencioso: true,
      preservarDetalhe: true,
    }).catch(() => {});
  } catch (erro) {
    detalhe.innerHTML = `
      <div class="suporte-vazio-grande">
        <div class="suporte-vazio-icone erro">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <strong>Não foi possível abrir o chamado</strong>
        <span>${escapar(erro.message)}</span>
      </div>
    `;
  }
}

function abrirNovoChamado() {
  if (ehAdmin()) return;

  const detalhe = document.getElementById("suporteDetalhe");
  if (!detalhe) return;

  chamadoSelecionadoId = null;

  detalhe.innerHTML = `
    <div class="suporte-novo">
      <div class="suporte-detalhe-kicker">
        NOVO ATENDIMENTO
      </div>
      <h3>Como podemos ajudar?</h3>
      <p>
        Abra um chamado para solicitar alteração de dados,
        tirar dúvidas ou informar um problema.
      </p>

      <form id="formNovoChamadoSuporte">
        <label>
          <span>Categoria</span>
          <select id="categoriaNovoChamado" required>
            <option value="">Selecione</option>
            <option value="ALTERACAO_CADASTRAL">Alteração cadastral</option>
            <option value="DUVIDA">Dúvida</option>
            <option value="PROBLEMA_TECNICO">Problema técnico</option>
            <option value="OUTRO">Outro</option>
          </select>
        </label>

        <label>
          <span>Assunto</span>
          <input
            id="assuntoNovoChamado"
            type="text"
            maxlength="150"
            placeholder="Ex.: Preciso alterar o telefone da instituição"
            required
          >
        </label>

        <label>
          <span>Mensagem</span>
          <textarea
            id="mensagemNovoChamado"
            maxlength="4000"
            placeholder="Explique sua solicitação com o máximo de detalhes possível..."
            required
          ></textarea>
        </label>

        <div class="suporte-novo-acoes">
          <button
            type="button"
            class="secundario"
            id="btnCancelarNovoChamado"
          >
            Cancelar
          </button>

          <button type="submit">
            <i class="fa-solid fa-headset"></i>
            Abrir chamado
          </button>
        </div>
      </form>
    </div>
  `;

  document
    .getElementById("btnCancelarNovoChamado")
    ?.addEventListener("click", renderEstadoInicial);

  document
    .getElementById("formNovoChamadoSuporte")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const categoria =
        document
          .getElementById("categoriaNovoChamado")
          ?.value;

      const assunto =
        document
          .getElementById("assuntoNovoChamado")
          ?.value.trim();

      const mensagem =
        document
          .getElementById("mensagemNovoChamado")
          ?.value.trim();

      if (!categoria || !assunto || !mensagem) {
        toast.aviso("Preencha todos os campos.");
        return;
      }

      const botao =
        event.currentTarget.querySelector(
          'button[type="submit"]',
        );

      try {
        botao.disabled = true;
        loading.mostrar({
          titulo: "Abrindo chamado",
          mensagem: "Registrando sua solicitação...",
        });

        const resposta = await criarChamadoSuporte({
          categoria,
          assunto,
          mensagem,
        });

        toast.sucesso("Chamado aberto com sucesso.");

        chamadoSelecionadoId =
          resposta.dados?.id || null;

        await carregarChamados({
          silencioso: true,
          preservarDetalhe: true,
        });

        if (chamadoSelecionadoId) {
          await carregarDetalhe(chamadoSelecionadoId);
        }
      } catch (erro) {
        toast.erro(erro.message);
      } finally {
        botao.disabled = false;
        loading.ocultar({ forcar: true });
      }
    });
}

function iniciarPolling() {
  if (pollingTimer) return;

  pollingTimer = setInterval(() => {
    if (!document.hidden) {
      carregarChamados({
        silencioso: true,
        preservarDetalhe: true,
      }).catch(() => {});
    }
  }, 60000);
}

export function inicializarSuporte() {
  const btnAbrir =
    document.getElementById("btnSuporte");
  const btnFechar =
    document.getElementById("btnFecharSuporte");
  const btnNovo =
    document.getElementById("btnNovoChamadoSuporte");

  if (!btnAbrir) return;

  btnAbrir.addEventListener("click", abrirCentral);
  btnFechar?.addEventListener("click", fecharCentral);

  btnNovo?.addEventListener("click", abrirNovoChamado);

  if (ehAdmin() && btnNovo) {
    btnNovo.hidden = true;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharCentral();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      carregarChamados({
        silencioso: true,
        preservarDetalhe: true,
      }).catch(() => {});
    }
  });

  renderEstadoInicial();
  carregarChamados({
    silencioso: true,
  }).catch(() => {});
  iniciarPolling();
}
