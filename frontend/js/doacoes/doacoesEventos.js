// =====================================================
// IMPORTAÇÕES
// =====================================================

import {

    cadastrarDoacaoAPI,

    editarDoacaoAPI,

    excluirDoacaoAPI,

    alterarComprovanteDoacaoAPI

} from "../api/doacoesApi.js";


import {

    carregarBeneficiariosDoacao,

    preencherQuantidadePorComposicaoFamiliar,

    encerrarModalDoacao,

    montarDadosFormularioDoacao

} from "./doacoesFormulario.js";


import {

    visualizarDetalhesDoacao,

    fecharDetalhesDoacao

} from "./doacoesDetalhes.js";


import {

    atualizarBotoesFiltroDoacoes,

    atualizarBotoesOrdenacaoDoacoes,

    calcularTotalPaginasDoacoes

} from "./doacoesUtils.js";


import {

    mostrarSucesso,

    mostrarErro

} from "../utils/toast.js";


import {

    mostrarLoading,

    esconderLoading

} from "../utils/loading.js";


import {

    confirmarAcao

} from "../utils/confirm.js";


// =====================================================
// CONFIGURAÇÕES
// =====================================================

const TEMPO_DEBOUNCE_PESQUISA =
    300;


// =====================================================
// LER JSON COM SEGURANÇA
// =====================================================

async function lerRespostaJson(
    resposta
) {

    const texto =
        await resposta.text();


    if (!texto) {

        return {};

    }


    try {

        return JSON.parse(
            texto
        );

    } catch (erro) {

        console.error(
            "Resposta inválida recebida do servidor:",
            texto
        );


        throw new Error(
            "O servidor retornou uma resposta inválida."
        );

    }

}


// =====================================================
// CANCELAR PESQUISA PENDENTE
// =====================================================

function cancelarPesquisaPendente(
    estado
) {

    if (!estado.temporizadorPesquisa) {

        return;

    }


    clearTimeout(
        estado.temporizadorPesquisa
    );


    estado.temporizadorPesquisa =
        null;

}


// =====================================================
// SALVAR DOAÇÃO
// =====================================================

async function salvarDoacao({

    event,

    estado,

    elementos,

    campos,

    carregarDoacoes

}) {

    event.preventDefault();


    let dados;


    try {

        dados =
            montarDadosFormularioDoacao(
                campos
            );

    } catch (erro) {

        mostrarErro(
            erro.message
        );


        return;

    }


    mostrarLoading();


    try {

        const editando =
            estado.doacaoEditandoId !==
            null;


        const resposta =
            editando
                ? await editarDoacaoAPI(
                    estado.doacaoEditandoId,
                    dados
                )
                : await cadastrarDoacaoAPI(
                    dados
                );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(

                resultado.issues?.[0]?.message ||

                resultado.error ||

                resultado.erro ||

                resultado.mensagem ||

                "Erro ao salvar a doação."

            );

        }


        mostrarSucesso(

            editando
                ? "Doação atualizada com sucesso!"
                : "Doação cadastrada com sucesso!"

        );


        encerrarModalDoacao({

            estado,

            elementos

        });


        await carregarDoacoes();

    } catch (erro) {

        console.error(
            "Erro ao salvar doação:",
            erro
        );


        mostrarErro(

            erro.message ||

            "Não foi possível salvar a doação."

        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// ALTERAR COMPROVANTE
// =====================================================

async function alterarComprovanteDoacao({

    botao,

    carregarDoacoes

}) {

    const id =
        Number(
            botao.dataset.id
        );


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        mostrarErro(
            "ID da doação inválido."
        );


        return;

    }


    const comprovanteAtual =
        botao.dataset.comprovante ===
        "true";


    const novoStatus =
        !comprovanteAtual;


    const mensagemConfirmacao =
        novoStatus
            ? "Deseja confirmar que esta doação possui comprovante?"
            : "Deseja remover a confirmação do comprovante desta doação?";


    const confirmou =
        await confirmarAcao(
            mensagemConfirmacao
        );


    if (!confirmou) {

        return;

    }


    mostrarLoading();


    try {

        /*
         * Impede novos cliques enquanto
         * a requisição está sendo processada.
         */
        botao.disabled =
            true;


        const resposta =
            await alterarComprovanteDoacaoAPI(

                id,

                novoStatus

            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(

                resultado.issues?.[0]?.message ||

                resultado.error ||

                resultado.erro ||

                resultado.mensagem ||

                "Erro ao atualizar o comprovante."

            );

        }


        mostrarSucesso(

            resultado.mensagem ||

            (
                novoStatus
                    ? "Comprovante confirmado com sucesso!"
                    : "Comprovante removido com sucesso!"
            )

        );


        await carregarDoacoes();

    } catch (erro) {

        console.error(
            "Erro ao alterar comprovante da doação:",
            erro
        );


        /*
         * Caso a atualização falhe, o botão
         * continua disponível para uma nova tentativa.
         */
        botao.disabled =
            false;


        mostrarErro(

            erro.message ||

            "Não foi possível atualizar o comprovante."

        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// CANCELAR DOAÇÃO
// =====================================================

async function cancelarDoacao({

    id,

    carregarDoacoes

}) {

    const idNumerico =
        Number(id);


    if (
        !Number.isInteger(
            idNumerico
        ) ||
        idNumerico <= 0
    ) {

        mostrarErro(
            "ID da doação inválido."
        );


        return;

    }


    const confirmou =
        await confirmarAcao(
            "Deseja realmente cancelar esta doação?"
        );


    if (!confirmou) {

        return;

    }


    mostrarLoading();


    try {

        const resposta =
            await excluirDoacaoAPI(
                idNumerico
            );


        const resultado =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(

                resultado.error ||

                resultado.erro ||

                resultado.mensagem ||

                "Erro ao cancelar a doação."

            );

        }


        mostrarSucesso(

            resultado.mensagem ||

            "Doação cancelada com sucesso!"

        );


        await carregarDoacoes();

    } catch (erro) {

        console.error(
            "Erro ao cancelar doação:",
            erro
        );


        mostrarErro(

            erro.message ||

            "Não foi possível cancelar a doação."

        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// TRATAR CLIQUES DA TABELA
// =====================================================

function tratarCliqueTabela({

    event,

    estado,

    elementos,

    campos,

    prepararEdicaoDoacao,

    carregarDoacoes

}) {

    // =================================================
    // VISUALIZAR
    // =================================================

    const botaoVisualizar =
        event.target.closest(
            ".btnVisualizarDoacao"
        );


    if (botaoVisualizar) {

        visualizarDetalhesDoacao({

            id:
                botaoVisualizar.dataset.id,

            elementos

        });


        return;

    }


    // =================================================
    // EDITAR
    // =================================================

    const botaoEditar =
        event.target.closest(
            ".btnEditarDoacao"
        );


    if (botaoEditar) {

        prepararEdicaoDoacao({

            id:
                botaoEditar.dataset.id,

            estado,

            elementos,

            campos

        });


        return;

    }


    // =================================================
    // COMPROVANTE
    // =================================================

    const botaoComprovante =
        event.target.closest(
            ".btnComprovanteDoacao"
        );


    if (botaoComprovante) {

        alterarComprovanteDoacao({

            botao:
                botaoComprovante,

            carregarDoacoes

        });


        return;

    }


    // =================================================
    // CANCELAR
    // =================================================

    const botaoExcluir =
        event.target.closest(
            ".btnExcluirDoacao"
        );


    if (botaoExcluir) {

        cancelarDoacao({

            id:
                botaoExcluir.dataset.id,

            carregarDoacoes

        });

    }

}


// =====================================================
// SELECIONAR FILTRO
// =====================================================

function selecionarFiltro({

    event,

    estado,

    elementos,

    renderizarDoacoes

}) {

    const filtro =
        event.currentTarget
            .dataset
            .filtroDoacao;


    if (
        ![
            "TODAS",
            "CESTA",
            "GRANEL",
            "AMBOS",
            "OUTROS"
        ].includes(filtro)
    ) {

        return;

    }


    estado.filtroAtual =
        filtro;


    estado.paginaAtual =
        1;


    atualizarBotoesFiltroDoacoes(

        elementos,

        estado

    );


    renderizarDoacoes();

}


// =====================================================
// SELECIONAR ORDENAÇÃO
// =====================================================

function selecionarOrdenacao({

    event,

    estado,

    elementos,

    renderizarDoacoes

}) {

    const campo =
        event.currentTarget
            .dataset
            .ordenarDoacao;


    if (!campo) {

        return;

    }


    if (
        campo ===
        estado.campoOrdenacao
    ) {

        estado.direcaoOrdenacao =
            estado.direcaoOrdenacao ===
            "asc"
                ? "desc"
                : "asc";

    } else {

        estado.campoOrdenacao =
            campo;


        estado.direcaoOrdenacao =
            "asc";

    }


    estado.paginaAtual =
        1;


    atualizarBotoesOrdenacaoDoacoes(

        elementos,

        estado

    );


    renderizarDoacoes();

}


// =====================================================
// ALTERAR QUANTIDADE POR PÁGINA
// =====================================================

function alterarQuantidadePorPagina({

    estado,

    elementos,

    renderizarDoacoes

}) {

    const quantidade =
        Number(
            elementos
                .quantidadePorPagina
                .value
        );


    estado.itensPorPagina =
        Number.isInteger(quantidade) &&
        quantidade > 0
            ? quantidade
            : 10;


    estado.paginaAtual =
        1;


    renderizarDoacoes();

}


// =====================================================
// IR PARA PÁGINA
// =====================================================

function irParaPagina({

    pagina,

    estado,

    obterDoacoesFiltradas,

    renderizarDoacoes

}) {

    const filtradas =
        obterDoacoesFiltradas();


    const totalPaginas =
        calcularTotalPaginasDoacoes(

            filtradas.length,

            estado.itensPorPagina

        );


    const paginaValidada =
        Math.min(

            Math.max(

                Number(pagina) || 1,

                1

            ),

            totalPaginas

        );


    if (
        paginaValidada ===
        estado.paginaAtual
    ) {

        return;

    }


    estado.paginaAtual =
        paginaValidada;


    renderizarDoacoes();

}


// =====================================================
// ALTERAR INSTITUIÇÃO DO ADMIN
// =====================================================

async function alterarInstituicaoDoacao({

    elementos,

    campos

}) {

    const instituicaoId =
        Number(
            elementos
                .selectInstituicao
                .value
        );


    campos.beneficiarioId.innerHTML = `

        <option value="">

            ${
                instituicaoId
                    ? "Carregando beneficiários..."
                    : "Selecione primeiro uma instituição"
            }

        </option>

    `;


    campos.beneficiarioId.disabled =
        !instituicaoId;


    if (!instituicaoId) {

        return;

    }


    try {

        const beneficiarios =
            await carregarBeneficiariosDoacao(

                campos,

                instituicaoId

            );


        campos.beneficiarioId.disabled =
            false;


        if (
            !Array.isArray(beneficiarios) ||
            beneficiarios.length === 0
        ) {

            campos.beneficiarioId.innerHTML = `

                <option value="">

                    Nenhum beneficiário ativo encontrado

                </option>

            `;


            campos.beneficiarioId.disabled =
                true;

        }

    } catch (erro) {

        console.error(
            "Erro ao carregar beneficiários da instituição:",
            erro
        );


        campos.beneficiarioId.innerHTML = `

            <option value="">

                Não foi possível carregar os beneficiários

            </option>

        `;


        campos.beneficiarioId.disabled =
            true;


        mostrarErro(

            erro.message ||

            "Não foi possível carregar os beneficiários."

        );

    }

}


// =====================================================
// FECHAR MODAIS COM ESC
// =====================================================

function tratarTeclaEscape({

    event,

    estado,

    elementos

}) {

    if (
        event.key !==
        "Escape"
    ) {

        return;

    }


    const detalhesAberto =
        elementos
            .modalDetalhes
            ?.classList
            .contains("ativo");


    if (detalhesAberto) {

        fecharDetalhesDoacao(
            elementos
        );


        return;

    }


    const formularioAberto =
        elementos
            .modal
            ?.classList
            .contains("ativo");


    if (formularioAberto) {

        encerrarModalDoacao({

            estado,

            elementos

        });

    }

}


// =====================================================
// CONFIGURAR EVENTOS
// =====================================================

export function configurarEventosDoacoes({

    estado,

    elementos,

    campos,

    carregarDoacoes,

    renderizarDoacoes,

    obterDoacoesFiltradas,

    prepararNovaDoacao,

    prepararEdicaoDoacao

}) {

    /*
     * Remove eventos antigos quando a página
     * for carregada novamente pelo router.
     */
    if (
        estado.controladorEventos
    ) {

        estado
            .controladorEventos
            .abort();

    }


    estado.controladorEventos =
        new AbortController();


    const opcoes = {

        signal:
            estado
                .controladorEventos
                .signal

    };


    // =================================================
    // ATUALIZAR LISTA
    // =================================================

    elementos.btnAtualizar.addEventListener(

        "click",

        carregarDoacoes,

        opcoes

    );


    // =================================================
    // NOVA DOAÇÃO
    // =================================================

    elementos.btnNova.addEventListener(

        "click",

        () => {

            prepararNovaDoacao({

                estado,

                elementos,

                campos

            });

        },

        opcoes

    );


    // =================================================
    // FECHAR MODAL DO FORMULÁRIO
    // =================================================

    elementos.btnFecharModal.addEventListener(

        "click",

        () => {

            encerrarModalDoacao({

                estado,

                elementos

            });

        },

        opcoes

    );


    elementos.btnCancelar.addEventListener(

        "click",

        () => {

            encerrarModalDoacao({

                estado,

                elementos

            });

        },

        opcoes

    );


    // =================================================
    // SALVAR
    // =================================================

    elementos.formulario.addEventListener(

        "submit",

        (event) => {

            salvarDoacao({

                event,

                estado,

                elementos,

                campos,

                carregarDoacoes

            });

        },

        opcoes

    );


    // =================================================
    // ALTERAR BENEFICIÁRIO
    // =================================================

    campos.beneficiarioId.addEventListener(

        "change",

        () => {

            preencherQuantidadePorComposicaoFamiliar(
                campos
            );

        },

        opcoes

    );


    // =================================================
    // ALTERAR INSTITUIÇÃO
    // =================================================

    elementos.selectInstituicao.addEventListener(

        "change",

        () => {

            alterarInstituicaoDoacao({

                elementos,

                campos

            });

        },

        opcoes

    );


    // =================================================
    // PESQUISA
    // =================================================

    elementos.pesquisa.addEventListener(

        "input",

        () => {

            cancelarPesquisaPendente(
                estado
            );


            elementos
                .btnLimparPesquisa
                .hidden =
                    elementos
                        .pesquisa
                        .value
                        .trim()
                        .length === 0;


            estado.temporizadorPesquisa =
                setTimeout(

                    () => {

                        estado.paginaAtual =
                            1;


                        renderizarDoacoes();


                        estado.temporizadorPesquisa =
                            null;

                    },

                    TEMPO_DEBOUNCE_PESQUISA

                );

        },

        opcoes

    );


    elementos.pesquisa.addEventListener(

        "keydown",

        (event) => {

            if (
                event.key !==
                "Enter"
            ) {

                return;

            }


            event.preventDefault();


            cancelarPesquisaPendente(
                estado
            );


            estado.paginaAtual =
                1;


            renderizarDoacoes();

        },

        opcoes

    );


    elementos.btnLimparPesquisa.addEventListener(

        "click",

        () => {

            cancelarPesquisaPendente(
                estado
            );


            elementos.pesquisa.value =
                "";


            estado.paginaAtual =
                1;


            elementos.pesquisa.focus();


            renderizarDoacoes();

        },

        opcoes

    );


    // =================================================
    // FILTROS
    // =================================================

    elementos.filtros.forEach(
        (botao) => {

            botao.addEventListener(

                "click",

                (event) => {

                    selecionarFiltro({

                        event,

                        estado,

                        elementos,

                        renderizarDoacoes

                    });

                },

                opcoes

            );

        }
    );


    // =================================================
    // ORDENAÇÃO
    // =================================================

    elementos.botoesOrdenacao.forEach(
        (botao) => {

            botao.addEventListener(

                "click",

                (event) => {

                    selecionarOrdenacao({

                        event,

                        estado,

                        elementos,

                        renderizarDoacoes

                    });

                },

                opcoes

            );

        }
    );


    // =================================================
    // QUANTIDADE POR PÁGINA
    // =================================================

    elementos.quantidadePorPagina.addEventListener(

        "change",

        () => {

            alterarQuantidadePorPagina({

                estado,

                elementos,

                renderizarDoacoes

            });

        },

        opcoes

    );


    // =================================================
    // PRIMEIRA PÁGINA
    // =================================================

    elementos.btnPrimeiraPagina.addEventListener(

        "click",

        () => {

            irParaPagina({

                pagina:
                    1,

                estado,

                obterDoacoesFiltradas,

                renderizarDoacoes

            });

        },

        opcoes

    );


    // =================================================
    // PÁGINA ANTERIOR
    // =================================================

    elementos.btnPaginaAnterior.addEventListener(

        "click",

        () => {

            irParaPagina({

                pagina:
                    estado.paginaAtual - 1,

                estado,

                obterDoacoesFiltradas,

                renderizarDoacoes

            });

        },

        opcoes

    );


    // =================================================
    // PRÓXIMA PÁGINA
    // =================================================

    elementos.btnProximaPagina.addEventListener(

        "click",

        () => {

            irParaPagina({

                pagina:
                    estado.paginaAtual + 1,

                estado,

                obterDoacoesFiltradas,

                renderizarDoacoes

            });

        },

        opcoes

    );


    // =================================================
    // ÚLTIMA PÁGINA
    // =================================================

    elementos.btnUltimaPagina.addEventListener(

        "click",

        () => {

            const filtradas =
                obterDoacoesFiltradas();


            const totalPaginas =
                calcularTotalPaginasDoacoes(

                    filtradas.length,

                    estado.itensPorPagina

                );


            irParaPagina({

                pagina:
                    totalPaginas,

                estado,

                obterDoacoesFiltradas,

                renderizarDoacoes

            });

        },

        opcoes

    );


    // =================================================
    // NÚMEROS DA PAGINAÇÃO
    // =================================================

    elementos.numerosPaginacao.addEventListener(

        "click",

        (event) => {

            const botao =
                event.target.closest(
                    "[data-pagina-doacao]"
                );


            if (!botao) {

                return;

            }


            irParaPagina({

                pagina:
                    botao
                        .dataset
                        .paginaDoacao,

                estado,

                obterDoacoesFiltradas,

                renderizarDoacoes

            });

        },

        opcoes

    );


    // =================================================
    // CLIQUES NA TABELA
    // =================================================

    elementos.tabela.addEventListener(

        "click",

        (event) => {

            tratarCliqueTabela({

                event,

                estado,

                elementos,

                campos,

                prepararEdicaoDoacao,

                carregarDoacoes

            });

        },

        opcoes

    );


    // =================================================
    // CLIQUE FORA DO MODAL DO FORMULÁRIO
    // =================================================
/*
    elementos.modal.addEventListener(

        "click",

        (event) => {

            if (
                event.target ===
                elementos.modal
            ) {

                encerrarModalDoacao({

                    estado,

                    elementos

                });

            }

        },

        opcoes

    );
*/

    // =================================================
    // FECHAR MODAL DE DETALHES
    // =================================================

    elementos.btnFecharDetalhes.addEventListener(

        "click",

        () => {

            fecharDetalhesDoacao(
                elementos
            );

        },

        opcoes

    );


    elementos.btnFecharDetalhesRodape.addEventListener(

        "click",

        () => {

            fecharDetalhesDoacao(
                elementos
            );

        },

        opcoes

    );


    elementos.modalDetalhes.addEventListener(

        "click",

        (event) => {

            if (
                event.target ===
                elementos.modalDetalhes
            ) {

                fecharDetalhesDoacao(
                    elementos
                );

            }

        },

        opcoes

    );


    // =================================================
    // FECHAR COM ESC
    // =================================================

    document.addEventListener(

        "keydown",

        (event) => {

            tratarTeclaEscape({

                event,

                estado,

                elementos

            });

        },

        opcoes

    );


    return estado.controladorEventos;

}