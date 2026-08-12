// ======================================================
// LOADING GLOBAL
// ======================================================
//
// Compatibilidade com o código atual do sistema.
// Todos os módulos que já usam:
//   mostrarLoading();
//   esconderLoading();
// continuam funcionando sem precisar ser alterados.
//
// O visual e o controle ficam centralizados no componente
// profissional de loading do Solidare.
// ======================================================

import { loading } from "../components/loading.js";

/**
 * Exibe o loading global do Solidare.
 *
 * @param {Object} opcoes
 * @param {string} [opcoes.titulo="Carregando"]
 * @param {string} [opcoes.mensagem="Aguarde enquanto processamos sua solicitação."]
 */
export function mostrarLoading(opcoes = {}) {
    loading.mostrar({
        titulo: opcoes.titulo || "Carregando",
        mensagem:
            opcoes.mensagem ||
            "Aguarde enquanto processamos sua solicitação.",
    });
}

/**
 * Oculta o loading global.
 *
 * O componente possui contador interno, portanto suporta
 * múltiplas operações assíncronas sem remover o overlay antes
 * da hora.
 *
 * @param {Object} opcoes
 * @param {boolean} [opcoes.forcar=false]
 */
export function esconderLoading(opcoes = {}) {
    loading.ocultar({
        forcar: Boolean(opcoes.forcar),
    });
}

/**
 * Atualiza os textos do loading já aberto.
 *
 * @param {Object} opcoes
 * @param {string} [opcoes.titulo]
 * @param {string} [opcoes.mensagem]
 */
export function atualizarLoading(opcoes = {}) {
    loading.atualizar(opcoes);
}

/**
 * Executa uma tarefa assíncrona exibindo o loading
 * automaticamente durante o processamento.
 */
export async function executarComLoading(tarefa, opcoes = {}) {
    return loading.durante(tarefa, opcoes);
}
