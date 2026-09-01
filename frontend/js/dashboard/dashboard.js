import {
    buscarUsuarioDashboard,
    buscarBeneficiariosDashboard,
    buscarInstituicoesDashboard,
    buscarDoacoesDashboard,
    buscarSaldosDashboard,
} from "./dashboardApi.js";

let graficos = [];
let controlador = null;

const $ = (id) => document.getElementById(id);

function numero(valor) {
    return Number(valor) || 0;
}

function booleano(valor) {
    return valor === true || valor === 1 || valor === "1" || valor === "true";
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function gerarIniciais(nome) {
    const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "US";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0]}${partes.at(-1)[0]}`.toUpperCase();
}

function saudacao() {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
}

function formatarData(valor, comHora = false) {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";

    return new Intl.DateTimeFormat("pt-BR", comHora ? {
        dateStyle: "short",
        timeStyle: "short",
    } : {
        dateStyle: "short",
    }).format(data);
}

function tempoRelativo(valor) {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";

    const diff = Date.now() - data.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;

    const horas = Math.floor(min / 60);
    if (horas < 24) return `há ${horas}h`;

    const dias = Math.floor(horas / 24);
    if (dias < 7) return `há ${dias}d`;

    return formatarData(data);
}

function setTexto(id, valor) {
    const el = $(id);
    if (el) el.textContent = String(valor ?? "-");
}

function destruirGraficos() {
    graficos.forEach((grafico) => {
        try { grafico.destroy(); } catch {}
    });
    graficos = [];
}

function navegar(pagina) {
    if (pagina && typeof window.carregarPagina === "function") {
        window.carregarPagina(pagina);
    }
}

function configurarNavegacao() {
    controlador?.abort();
    controlador = new AbortController();

    document.querySelectorAll("#conteudo [data-pagina]").forEach((el) => {
        el.addEventListener("click", () => navegar(el.dataset.pagina), {
            signal: controlador.signal,
        });

        if (el.getAttribute("role") === "button") {
            el.addEventListener("keydown", (event) => {
                if (!["Enter", " "].includes(event.key)) return;
                event.preventDefault();
                el.click();
            }, { signal: controlador.signal });
        }
    });
}

function preencherCabecalho(usuario) {
    const nome = usuario?.nome || "Usuário";
    setTexto("nomeDashboard", `${saudacao()}, ${nome}`);
    setTexto("avatarDashboard", gerarIniciais(nome));

    const hoje = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(new Date());

    setTexto(
        "dataDashboard",
        hoje.charAt(0).toUpperCase() + hoje.slice(1)
    );

    atualizarHorario();
}

function atualizarHorario() {
    const hora = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date());

    setTexto("ultimaAtualizacaoDashboard", `Atualizado às ${hora}`);
}

function resumoBeneficiarios(beneficiarios) {
    const total = beneficiarios.length;
    const ativos = beneficiarios.filter((b) => booleano(b?.ativo)).length;
    const inativos = total - ativos;

    setTexto("totalBeneficiariosDashboard", total);
    setTexto("beneficiariosAtivosDashboard", ativos);
    setTexto("beneficiariosAtivosResumoDashboard", ativos);
    setTexto("beneficiariosInativosDashboard", inativos);
    setTexto(
        "kpiBeneficiariosDashboard",
        total
            ? `Ativos: ${ativos} · Inativos: ${inativos}`
            : "Ativos: 0 · Inativos: 0"
    );

    return { total, ativos, inativos };
}

function resumoInstituicoes(instituicoes, usuario) {
    const admin = String(usuario?.role || "").toUpperCase() === "ADMIN";
    if (!admin) return { total: 0, ativas: 0, inativas: 0, pendentes: 0 };

    const total = instituicoes.length;
    const ativas = instituicoes.filter((i) => booleano(i?.ativa)).length;
    const inativas = total - ativas;
    const pendentes = instituicoes.filter(
        (i) => normalizarTexto(i?.statusOk) !== "OK"
    ).length;

    setTexto("totalInstituicoesDashboard", total);
    setTexto("instituicoesAtivasDashboard", ativas);
    setTexto("instituicoesAtivasStatusDashboard", ativas);
    setTexto("instituicoesInativasStatusDashboard", inativas);
    setTexto("instituicoesPendentesDashboard", pendentes);
    setTexto(
        "kpiInstituicoesDashboard",
        `Ativas: ${ativas} · Inativas: ${inativas} · Pendentes: ${pendentes}`
    );

    return { total, ativas, inativas, pendentes };
}

function resumoDoacoes(doacoes) {
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();

    const doacoesMes = doacoes.filter((d) => {
        const data = new Date(d?.dataDoacao || d?.criadoEm);
        return !Number.isNaN(data.getTime()) &&
            data.getMonth() === mes &&
            data.getFullYear() === ano;
    });

    const comprovadas = doacoes.filter((d) => booleano(d?.comprovante)).length;
    const pendentes = doacoes.length - comprovadas;
    const itensMes = doacoesMes.reduce((soma, d) => soma + numero(d?.quantidade), 0);

    setTexto("doacoesMesDashboard", doacoesMes.length);
    setTexto("itensMesDashboard", itensMes);
    setTexto("doacoesComprovadasDashboard", comprovadas);
    setTexto("doacoesPendentesDashboard", pendentes);
    setTexto("kpiDoacoesMesDashboard", `${itensMes} itens distribuídos`);

    return {
        total: doacoes.length,
        mes: doacoesMes.length,
        itensMes,
        comprovadas,
        pendentes,
    };
}

function resumoSaldos(saldos, usuario) {
    const admin = String(usuario?.role || "").toUpperCase() === "ADMIN";
    const total = saldos.reduce((soma, s) => soma + numero(s?.saldoAtual), 0);
    const comSaldo = saldos.filter((s) => numero(s?.saldoAtual) > 0).length;

    setTexto("saldoCestasDashboard", total);

    if (admin) {
        setTexto("rotuloSaldoDashboard", "Saldo total de cestas");
        setTexto("instituicoesComSaldoDashboard", comSaldo);
        setTexto("rotuloMiniSaldoDashboard", "com estoque");
        setTexto("kpiSaldoDashboard", "Soma dos estoques das instituições");
        setTexto("tituloEstoqueDashboard", "Saldo de cestas por instituição");
        setTexto("descricaoEstoqueDashboard", "Instituições com menor saldo disponível.");
    } else {
        setTexto("rotuloSaldoDashboard", "Saldo de cestas");
        setTexto("instituicoesComSaldoDashboard", total > 0 ? 1 : 0);
        setTexto("rotuloMiniSaldoDashboard", total === 1 ? "cesta" : "status");
        setTexto("kpiSaldoDashboard", "Estoque disponível da sua instituição");
        setTexto("tituloEstoqueDashboard", "Estoque atual");
        setTexto("descricaoEstoqueDashboard", "Saldo de cestas disponível para novas doações.");
    }

    return { total, comSaldo };
}

function criarGraficoDoacoesMensais(doacoes) {
    const canvas = $("graficoDoacoesMensaisDashboard");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const anoAtual = new Date().getFullYear();

    const meses = Array.from(
        { length: 12 },
        (_, indice) => {
            const data = new Date(
                anoAtual,
                indice,
                1
            );

            return {
                indice,
                label: new Intl.DateTimeFormat(
                    "pt-BR",
                    { month: "short" }
                )
                    .format(data)
                    .replace(".", "")
            };
        }
    );

    const registros = Array(12).fill(0);
    const itens = Array(12).fill(0);

    doacoes.forEach((doacao) => {
        const data = new Date(
            doacao?.dataDoacao ||
            doacao?.criadoEm
        );

        if (
            Number.isNaN(data.getTime()) ||
            data.getFullYear() !== anoAtual
        ) {
            return;
        }

        const mes = data.getMonth();

        registros[mes] += 1;
        itens[mes] += numero(doacao?.quantidade);
    });

    setTexto(
        "anoGraficoEvolucaoDashboard",
        anoAtual
    );

    const grafico = new Chart(canvas, {
        type: "line",
        data: {
            labels: meses.map(
                (mes) => mes.label
            ),
            datasets: [
                {
                    label: "Doações",
                    data: registros,
                    borderColor:
                        "rgba(133, 0, 19, .88)",
                    backgroundColor:
                        "rgba(133, 0, 19, .10)",
                    pointBackgroundColor:
                        "rgba(133, 0, 19, .88)",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: .32,
                    fill: false
                },
                {
                    label: "Itens distribuídos",
                    data: itens,
                    borderColor: "#16885f",
                    backgroundColor:
                        "rgba(22, 136, 95, .10)",
                    pointBackgroundColor:
                        "#16885f",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: .32,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "top",
                    align: "end",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    displayColors: true
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "#7b8794",
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color:
                            "rgba(148, 163, 184, .14)"
                    },
                    ticks: {
                        precision: 0,
                        color: "#7b8794",
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });

    graficos.push(grafico);
}

function criarGraficoBeneficios(beneficiarios) {
    const canvas = $("graficoBeneficiosDashboard");
    const legenda = $("legendaBeneficiosDashboard");
    if (!canvas || typeof Chart === "undefined") return;

    const ordem = ["CESTA", "GRANEL", "AMBOS"];
    const nomes = { CESTA: "Cesta", GRANEL: "Granel", AMBOS: "Ambos" };
    const cores = ["#d99a32", "#3778bf", "#7152c8"];
    const contagem = ordem.map((tipo) =>
        beneficiarios.filter((b) => normalizarTexto(b?.tipoBeneficio) === tipo).length
    );

    const grafico = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ordem.map((t) => nomes[t]),
            datasets: [{
                data: contagem,
                backgroundColor: cores,
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 3,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
                legend: { display: false },
            },
        },
    });

    graficos.push(grafico);

    if (legenda) {
        const total = beneficiarios.length || 1;
        legenda.innerHTML = ordem.map((tipo, i) => `
            <div class="dash-legend-row">
                <span class="dash-legend-dot" style="background:${cores[i]}"></span>
                <span>${nomes[tipo]}</span>
                <strong>${contagem[i]} (${Math.round((contagem[i] / total) * 100)}%)</strong>
            </div>
        `).join("");
    }
}

function renderizarAtencoes({ beneficiarios, instituicoes, doacoes, saldos, usuario }) {
    const el = $("atencoesDashboard");
    if (!el) return;

    const itens = [];
    const inativos = beneficiarios.filter((b) => !booleano(b?.ativo)).length;
    const pendentesComprovante = doacoes.filter((d) => !booleano(d?.comprovante)).length;

    if (inativos > 0) {
        itens.push({
            icone: "fa-user-slash",
            titulo: "Beneficiários inativos",
            detalhe: "Cadastros atualmente sem atendimento ativo.",
            valor: inativos,
        });
    }

    if (pendentesComprovante > 0) {
        itens.push({
            icone: "fa-file-circle-exclamation",
            titulo: "Comprovantes pendentes",
            detalhe: "Doações ainda sem confirmação de comprovante.",
            valor: pendentesComprovante,
        });
    }

    if (String(usuario?.role || "").toUpperCase() === "ADMIN") {
        const instituicoesPendentes = instituicoes.filter(
            (i) => normalizarTexto(i?.statusOk) !== "OK"
        ).length;

        if (instituicoesPendentes > 0) {
            itens.push({
                icone: "fa-building-circle-exclamation",
                titulo: "Documentação pendente",
                detalhe: "Instituições aguardando regularização documental.",
                valor: instituicoesPendentes,
            });
        }

        const baixoEstoque = saldos.filter((s) => numero(s?.saldoAtual) <= 10).length;
        if (baixoEstoque > 0) {
            itens.push({
                icone: "fa-box-open",
                titulo: "Estoque baixo",
                detalhe: "Instituições com até 10 cestas disponíveis.",
                valor: baixoEstoque,
            });
        }
    } else {
        const saldo = numero(saldos?.[0]?.saldoAtual);
        if (saldo <= 10) {
            itens.push({
                icone: "fa-box-open",
                titulo: "Estoque de cestas baixo",
                detalhe: "Considere solicitar uma nova entrada de cestas.",
                valor: saldo,
            });
        }
    }

    if (!itens.length) {
        el.innerHTML = `
            <div class="dash-empty">
                <div>
                    <i class="fa-solid fa-circle-check is-success"></i>
                    <p>Nenhum ponto crítico identificado no momento.</p>
                </div>
            </div>
        `;
        return;
    }

    el.innerHTML = itens.slice(0, 4).map((item) => `
        <div class="dash-attention">
            <div class="dash-attention-icon">
                <i class="fa-solid ${item.icone}"></i>
            </div>
            <div class="dash-attention-copy">
                <strong>${escaparHtml(item.titulo)}</strong>
                <span>${escaparHtml(item.detalhe)}</span>
            </div>
            <span class="dash-attention-value">${item.valor}</span>
        </div>
    `).join("");
}

function renderizarAtividades(beneficiarios, doacoes) {
    const el = $("atividadesRecentesDashboard");
    if (!el) return;

    const atividades = [
        ...beneficiarios.map((b) => ({
            tipo: "beneficiario",
            data: b?.atualizadoEm || b?.criadoEm || b?.dataCadastro,
            titulo: b?.criadoEm === b?.atualizadoEm
                ? `${b?.nomeCompleto || "Beneficiário"} foi cadastrado`
                : `${b?.nomeCompleto || "Beneficiário"} teve o cadastro atualizado`,
            detalhe: b?.instituicao?.nome || "Cadastro de beneficiário",
        })),
        ...doacoes.map((d) => ({
            tipo: "doacao",
            data: d?.dataDoacao || d?.criadoEm,
            titulo: `${d?.beneficiario?.nomeCompleto || "Beneficiário"} recebeu uma doação`,
            detalhe: `${numero(d?.quantidade)} ${numero(d?.quantidade) === 1 ? "item" : "itens"} · ${d?.instituicao?.nome || "Instituição"}`,
        })),
    ]
        .filter((item) => item.data)
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .slice(0, 6);

    if (!atividades.length) {
        el.innerHTML = `<div class="dash-empty">Nenhuma atividade recente.</div>`;
        return;
    }

    el.innerHTML = atividades.map((a) => `
        <div class="dash-timeline-item">
            <div class="dash-timeline-icon ${a.tipo === "doacao" ? "doacao" : ""}">
                <i class="fa-solid ${a.tipo === "doacao" ? "fa-hand-holding-heart" : "fa-user-pen"}"></i>
            </div>
            <div class="dash-timeline-copy">
                <strong>${escaparHtml(a.titulo)}</strong>
                <span>${escaparHtml(a.detalhe)}</span>
            </div>
            <span class="dash-timeline-time">${tempoRelativo(a.data)}</span>
        </div>
    `).join("");
}

function renderizarUltimasDoacoes(doacoes) {
    const el = $("ultimasDoacoesDashboard");
    if (!el) return;

    const lista = [...doacoes]
        .sort((a, b) => new Date(b?.dataDoacao || b?.criadoEm) - new Date(a?.dataDoacao || a?.criadoEm))
        .slice(0, 6);

    if (!lista.length) {
        el.innerHTML = `<div class="dash-empty">Nenhuma doação registrada.</div>`;
        return;
    }

    el.innerHTML = lista.map((d) => `
        <div class="dash-donation">
            <div class="dash-donation-icon">
                <i class="fa-solid fa-gift"></i>
            </div>
            <div class="dash-donation-copy">
                <strong>${escaparHtml(d?.beneficiario?.nomeCompleto || d?.codigo || "Doação")}</strong>
                <span>${escaparHtml(d?.instituicao?.nome || "Instituição não informada")} · ${escaparHtml(normalizarTexto(d?.tipo) || "DOAÇÃO")}</span>
            </div>
            <div class="dash-donation-meta">
                <strong>${numero(d?.quantidade)} ${numero(d?.quantidade) === 1 ? "item" : "itens"}</strong>
                <span>${formatarData(d?.dataDoacao || d?.criadoEm, true)}</span>
            </div>
        </div>
    `).join("");
}

function renderizarEstoque(saldos, usuario) {
    const el = $("estoqueDashboard");
    if (!el) return;

    if (!saldos.length) {
        el.innerHTML = `<div class="dash-empty">Nenhum saldo de cestas registrado.</div>`;
        return;
    }

    const admin = String(usuario?.role || "").toUpperCase() === "ADMIN";
    const lista = admin
        ? [...saldos].sort((a, b) => numero(a?.saldoAtual) - numero(b?.saldoAtual)).slice(0, 6)
        : saldos.slice(0, 1);

    const maior = Math.max(...lista.map((s) => numero(s?.saldoAtual)), 1);

    el.innerHTML = lista.map((s) => {
        const saldo = numero(s?.saldoAtual);
        const nome = s?.instituicao?.nome || (admin ? "Instituição" : "Sua instituição");
        const pct = Math.max(4, Math.round((saldo / maior) * 100));

        return `
            <div class="dash-stock">
                <div class="dash-stock-copy">
                    <strong>${escaparHtml(nome)}</strong>
                    <span>Atualizado em ${formatarData(s?.atualizadoEm, true)}</span>
                    <div class="dash-stock-bar"><span style="width:${pct}%"></span></div>
                </div>
                <div class="dash-stock-value">
                    <strong>${saldo}</strong>
                    <span>${saldo === 1 ? "cesta" : "cestas"}</span>
                </div>
            </div>
        `;
    }).join("");
}

function aplicarPermissoesLocais(usuario) {
    const role = String(usuario?.role || "").toUpperCase();

    document.querySelectorAll("#conteudo [data-perfis]").forEach((el) => {
        const permitidos = String(el.dataset.perfis || "")
            .split(",")
            .map((v) => v.trim().toUpperCase())
            .filter(Boolean);

        el.hidden = permitidos.length > 0 && !permitidos.includes(role);
    });
}

async function carregarTudo(usuario) {
    const admin = String(usuario?.role || "").toUpperCase() === "ADMIN";

    const [beneficiariosR, doacoesR, instituicoesR, saldosR] = await Promise.allSettled([
        buscarBeneficiariosDashboard(),
        buscarDoacoesDashboard(),
        admin ? buscarInstituicoesDashboard() : Promise.resolve([]),
        buscarSaldosDashboard(usuario),
    ]);

    const beneficiarios = beneficiariosR.status === "fulfilled" ? beneficiariosR.value : [];
    const doacoes = doacoesR.status === "fulfilled" ? doacoesR.value : [];
    const instituicoes = instituicoesR.status === "fulfilled" ? instituicoesR.value : [];
    const saldos = saldosR.status === "fulfilled" ? saldosR.value : [];

    if (beneficiariosR.status === "rejected") console.error(beneficiariosR.reason);
    if (doacoesR.status === "rejected") console.error(doacoesR.reason);
    if (instituicoesR.status === "rejected") console.error(instituicoesR.reason);
    if (saldosR.status === "rejected") console.error(saldosR.reason);

    resumoBeneficiarios(beneficiarios);
    resumoInstituicoes(instituicoes, usuario);
    resumoDoacoes(doacoes);
    resumoSaldos(saldos, usuario);

    destruirGraficos();
    criarGraficoDoacoesMensais(doacoes);
    criarGraficoBeneficios(beneficiarios);

    renderizarAtencoes({ beneficiarios, instituicoes, doacoes, saldos, usuario });
    renderizarAtividades(beneficiarios, doacoes);
    renderizarUltimasDoacoes(doacoes);
    renderizarEstoque(saldos, usuario);

    atualizarHorario();
}

export async function inicializarDashboard() {
    destruirGraficos();
    controlador?.abort();

    try {
        const usuario = await buscarUsuarioDashboard();

        preencherCabecalho(usuario);
        aplicarPermissoesLocais(usuario);
        configurarNavegacao();

        const botao = $("btnAtualizarDashboard");

        if (botao) {
            botao.onclick = async () => {
                botao.disabled = true;
                const icone = botao.querySelector("i");
                icone?.classList.add("fa-spin");

                try {
                    await carregarTudo(usuario);
                } finally {
                    icone?.classList.remove("fa-spin");
                    botao.disabled = false;
                }
            };
        }

        await carregarTudo(usuario);

    } catch (erro) {
        console.error("Erro ao inicializar Dashboard:", erro);

        [
            "atividadesRecentesDashboard",
            "ultimasDoacoesDashboard",
            "estoqueDashboard",
            "atencoesDashboard",
        ].forEach((id) => {
            const el = $(id);
            if (el) {
                el.innerHTML = `<div class="dash-empty">Não foi possível carregar os dados do painel.</div>`;
            }
        });
    }
}
