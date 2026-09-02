// =====================================================
// IMPORTAÇÕES
// =====================================================

import {
    listarBeneficiarios
} from "../api/beneficiariosApi.js";

import {
    buscarDoacao
} from "../api/doacoesApi.js";

import {
    abrirModalDoacao,
    fecharModalDoacao,
    limparFormularioDoacao,
    alterarTituloModalDoacao,
    focarPrimeiroCampoDoacao
} from "./doacoesModal.js";

import {
    mostrarErro
} from "../utils/toast.js";

import {
    mostrarLoading,
    esconderLoading
} from "../utils/loading.js";

//const API_URL = "http://localhost:3000";
import { API_URL } from "../config.js";


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHtml(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


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
// NORMALIZAR LISTA DE BENEFICIÁRIOS
// =====================================================

function normalizarListaBeneficiarios(
    dados
) {

    if (Array.isArray(dados)) {
        return dados;
    }

    if (
        Array.isArray(
            dados?.beneficiarios
        )
    ) {

        return dados.beneficiarios;

    }

    if (
        Array.isArray(
            dados?.data
        )
    ) {

        return dados.data;

    }

    if (
        Array.isArray(
            dados?.data?.beneficiarios
        )
    ) {

        return dados.data.beneficiarios;

    }

    return [];

}

// =====================================================
// OBTER TOKEN
// =====================================================

function obterToken() {

    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token")
    );

}


// =====================================================
// CARREGAR INSTITUIÇÕES
// =====================================================

export async function carregarInstituicoesDoacao(
    elementos
) {

    if (!elementos?.selectInstituicao) {

        throw new Error(
            "O campo de instituição da doação não foi encontrado."
        );

    }

    const token =
        obterToken();

    const resposta =
        await fetch(
            `${API_URL}/instituicoes?limit=100`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token || ""}`
                },

                cache:
                    "no-store"
            }
        );

    const dados =
        await lerRespostaJson(
            resposta
        );

    if (!resposta.ok) {

        throw new Error(
            dados.error ||
            dados.erro ||
            dados.mensagem ||
            "Não foi possível carregar as instituições."
        );

    }

    const instituicoes =
        Array.isArray(dados)
            ? dados
            : Array.isArray(dados?.dados)
                ? dados.dados
                : Array.isArray(dados?.instituicoes)
                    ? dados.instituicoes
                    : Array.isArray(dados?.data)
                        ? dados.data
                        : Array.isArray(dados?.data?.instituicoes)
                            ? dados.data.instituicoes
                            : Array.isArray(dados?.dados?.instituicoes)
                                ? dados.dados.instituicoes
                                : [];

    elementos.selectInstituicao.innerHTML = `

        <option value="">
            Selecione uma instituição
        </option>

    `;

    instituicoes
        .filter(
            (instituicao) =>
                instituicao?.ativa !== false &&
                !instituicao?.deletedAt
        )
        .sort(
            (a, b) =>
                String(a?.nome ?? "")
                    .localeCompare(
                        String(b?.nome ?? ""),
                        "pt-BR",
                        {
                            sensitivity: "base"
                        }
                    )
        )
        .forEach(
            (instituicao) => {

                const id =
                    Number(
                        instituicao.id
                    );

                if (!id) {
                    return;
                }

                const nome =
                    instituicao.nome ||
                    instituicao.nomeInstituicao ||
                    instituicao.nomeFantasia ||
                    instituicao.razaoSocial ||
                    `Instituição ${id}`;

                elementos
                    .selectInstituicao
                    .insertAdjacentHTML(
                        "beforeend",
                        `
                            <option value="${id}">
                                ${escaparHtml(nome)}
                            </option>
                        `
                    );

            }
        );

    return instituicoes;

}


// =====================================================
// CARREGAR BENEFICIÁRIOS NO SELECT
// =====================================================

export async function carregarBeneficiariosDoacao(
    campos,
    instituicaoId = null
) {

    if (!campos?.beneficiarioId) {

        throw new Error(
            "O campo de beneficiário da doação não foi encontrado."
        );

    }

    try {

        const resposta =
            await listarBeneficiarios({ modo: "selecao" });

        const dados =
            await lerRespostaJson(
                resposta
            );

        if (!resposta.ok) {

            throw new Error(
                dados.error ||
                dados.erro ||
                dados.mensagem ||
                "Erro ao carregar beneficiários."
            );

        }

        const beneficiarios =
            normalizarListaBeneficiarios(
                dados
            );
        
        const instituicaoSelecionada =
            Number(
                instituicaoId
            );

        const beneficiariosFiltrados =
            beneficiarios.filter(
                (beneficiario) => {

                    const estaAtivo =
                        beneficiario?.ativo !== false;

                    if (!estaAtivo) {
                        return false;
                    }

                    if (!instituicaoSelecionada) {
                        return true;
                    }

                    return Number(
                        beneficiario?.instituicaoId
                    ) === instituicaoSelecionada;

                }
            );

        campos.beneficiarioId.innerHTML = `

            <option value="">
                Selecione um beneficiário
            </option>

        `;


        beneficiariosFiltrados
            .sort(
                (a, b) =>

                    String(
                        a?.nomeCompleto ?? ""
                    )
                        .localeCompare(
                            String(
                                b?.nomeCompleto ?? ""
                            ),
                            "pt-BR",
                            {
                                sensitivity: "base"
                            }
                        )
            )
            .forEach(
                (beneficiario) => {

                    const id =
                        Number(
                            beneficiario.id
                        );

                    if (!id) {
                        return;
                    }

                    const nome =
                        escaparHtml(
                            beneficiario.nomeCompleto ||
                            "Nome não informado"
                        );

                    const instituicao =
                        escaparHtml(
                            beneficiario
                                .instituicao
                                ?.nome ||
                            ""
                        );

                    const descricao =
                        instituicao
                            ? `${nome} — ${instituicao}`
                            : nome;

                    const composicaoFamiliar =
                        Math.max(
                            1,
                            Number(
                                beneficiario.composicaoFamiliar
                            ) || 1
                        );


                    campos
                        .beneficiarioId
                        .insertAdjacentHTML(
                            "beforeend",
                            `

                                <option
                                    value="${id}"
                                    data-composicao-familiar="${composicaoFamiliar}"
                                >
                                    ${descricao} — ${composicaoFamiliar} pessoa(s)
                                </option>

                            `
                        );

                }
            );

        return beneficiariosFiltrados;

    } catch (erro) {

        console.error(
            "Erro ao carregar beneficiários da doação:",
            erro
        );

        campos.beneficiarioId.innerHTML = `

            <option value="">
                Não foi possível carregar os beneficiários
            </option>

        `;

        mostrarErro(
            erro.message ||
            "Não foi possível carregar os beneficiários."
        );

        return [];

    }

}


// =====================================================
// PREENCHER QUANTIDADE PELA COMPOSIÇÃO FAMILIAR
// =====================================================

export function preencherQuantidadePorComposicaoFamiliar(
    campos
) {

    const opcaoSelecionada =
        campos?.beneficiarioId
            ?.selectedOptions
            ?.[0];

    const composicaoFamiliar =
        Number(
            opcaoSelecionada
                ?.dataset
                ?.composicaoFamiliar
        );

    // 1 cesta básica atende até 3 pessoas.
    // Math.ceil garante que grupos incompletos também recebam uma cesta.
    const quantidadeCestas =
        Number.isInteger(composicaoFamiliar) &&
        composicaoFamiliar > 0
            ? Math.ceil(composicaoFamiliar / 3)
            : 1;

    campos.quantidade.value =
        String(quantidadeCestas);

    bloquearCampoQuantidade(campos.quantidade);

}




// =====================================================
// BLOQUEIO DEFINITIVO DO CAMPO QUANTIDADE
// =====================================================
function bloquearCampoQuantidade(campo){
 if(!campo||campo.dataset.bloqueadoQuantidade)return;
 campo.readOnly=true;
 campo.dataset.bloqueadoQuantidade='1';
 campo.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
 campo.addEventListener('paste',e=>e.preventDefault());
 campo.addEventListener('keydown',e=>{if(!['Tab','Shift','Control','Alt'].includes(e.key))e.preventDefault();});
}
// =====================================================
// PREPARAR NOVA DOAÇÃO
// =====================================================

export async function prepararNovaDoacao({

    estado,
    elementos,
    campos

}) {

    estado.doacaoEditandoId =
        null;

    limparFormularioDoacao(
        elementos.formulario
    );

    alterarTituloModalDoacao(
        elementos.tituloModal,
        "Nova doação"
    );

    /*
     * Atualizamos o select antes de abrir o modal
     * para garantir que novos beneficiários apareçam.
     */
    if (
        estado.usuarioLogado?.role ===
        "ADMIN"
    ) {

        elementos.grupoInstituicao.hidden =
            false;

        elementos.selectInstituicao.required =
            true;

        elementos.selectInstituicao.value =
            "";

        campos.beneficiarioId.disabled =
            true;

        campos.beneficiarioId.innerHTML = `

            <option value="">
                Selecione primeiro uma instituição
            </option>

        `;

    } else {

        elementos.grupoInstituicao.hidden =
            true;

        elementos.selectInstituicao.required =
            false;

        await carregarBeneficiariosDoacao(
            campos
        );

    }

    campos.tipo.value =
        "CESTA";

    campos.quantidade.value = "1";
    bloquearCampoQuantidade(campos.quantidade);

    abrirModalDoacao(
        elementos.modal
    );

    focarPrimeiroCampoDoacao(
        elementos.formulario
    );

}


// =====================================================
// PREPARAR EDIÇÃO DA DOAÇÃO
// =====================================================

export async function prepararEdicaoDoacao({

    id,
    estado,
    elementos,
    campos

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


    mostrarLoading();

    try {

        const resposta =
            await buscarDoacao(
                idNumerico
            );

        const doacao =
            await lerRespostaJson(
                resposta
            );

        if (!resposta.ok) {

            throw new Error(
                doacao.error ||
                doacao.erro ||
                doacao.mensagem ||
                "Erro ao carregar a doação."
            );

        }


        estado.doacaoEditandoId =
            idNumerico;


        limparFormularioDoacao(
            elementos.formulario
        );


        alterarTituloModalDoacao(
            elementos.tituloModal,
            "Editar doação"
        );


        // ===========================================
        // ADMIN
        // ===========================================

        if (
            estado.usuarioLogado?.role ===
            "ADMIN"
        ) {

            elementos.grupoInstituicao.hidden =
                false;

            elementos.selectInstituicao.required =
                true;

            /*
            * Seleciona automaticamente
            * a instituição da doação.
            */
            elementos.selectInstituicao.value =
                String(
                    doacao.instituicaoId ??
                    doacao.instituicao?.id ??
                    ""
                );

            /*
            * Carrega somente os beneficiários
            * dessa instituição.
            */
            await carregarBeneficiariosDoacao(

                campos,

                doacao.instituicaoId ??
                doacao.instituicao?.id

            );

            campos.beneficiarioId.disabled =
                false;

        } else {

            elementos.grupoInstituicao.hidden =
                true;

            elementos.selectInstituicao.required =
                false;

            await carregarBeneficiariosDoacao(
                campos
            );

        }


        /*
        * Seleciona o beneficiário
        * da doação.
        */
        campos.beneficiarioId.value =
            String(

                doacao.beneficiarioId ??

                doacao.beneficiario?.id ??

                ""

            );

        campos.tipo.value =
            doacao.tipo ??
            "CESTA";

        campos.quantidade.value =
            String(
                doacao.quantidade ??
                1
            );

        bloquearCampoQuantidade(campos.quantidade);

        campos.observacoes.value =
            doacao.observacoes ??
            "";


        abrirModalDoacao(
            elementos.modal
        );

        focarPrimeiroCampoDoacao(
            elementos.formulario
        );

    } catch (erro) {

        console.error(
            "Erro ao preparar edição da doação:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível carregar a doação."
        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// FECHAR E LIMPAR MODAL
// =====================================================

export function encerrarModalDoacao({

    estado,
    elementos

}) {

    fecharModalDoacao(
        elementos.modal
    );

    limparFormularioDoacao(
        elementos.formulario
    );

    estado.doacaoEditandoId =
        null;

}


// =====================================================
// MONTAR DADOS DO FORMULÁRIO
// =====================================================

export function montarDadosFormularioDoacao(
    campos
) {

    const beneficiarioId =
        Number(
            campos.beneficiarioId.value
        );

    const tipo =
        String(
            campos.tipo.value
        )
            .trim()
            .toUpperCase();

    const quantidade =
        Number(
            campos.quantidade.value
        );

    const observacoes =
        String(
            campos.observacoes.value ??
            ""
        )
            .trim();


    if (
        !Number.isInteger(
            beneficiarioId
        ) ||
        beneficiarioId <= 0
    ) {

        throw new Error(
            "Selecione um beneficiário."
        );

    }


    if (
        ![
            "CESTA",
            "GRANEL",
            "AMBOS"
        ].includes(tipo)
    ) {

        throw new Error(
            "Selecione um tipo de doação válido."
        );

    }


    if (
        !Number.isInteger(
            quantidade
        ) ||
        quantidade < 1
    ) {

        throw new Error(
            "A quantidade deve ser um número inteiro maior que zero."
        );

    }


    if (
        observacoes.length > 500
    ) {

        throw new Error(
            "As observações podem ter no máximo 500 caracteres."
        );

    }


    const dados = {

        beneficiarioId,

        tipo,

        quantidade

    };


    /*
     * O campo é opcional no backend.
     * Só enviamos quando possuir conteúdo.
     */
    if (observacoes) {

        dados.observacoes =
            observacoes;

    }


    return dados;

}