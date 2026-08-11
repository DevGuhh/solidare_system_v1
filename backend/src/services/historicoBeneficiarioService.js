import { prisma } from "../config/db.js";

// Rótulos amigáveis exibidos no histórico quando um campo é alterado.
const ROTULOS_CAMPOS = {
    nomeCompleto: "Nome completo",
    cpf: "CPF",
    dataNascimento: "Data de nascimento",
    logradouro: "Logradouro",
    numero: "Número",
    complemento: "Complemento",
    cep: "CEP",
    regiao: "Região",
    cidade: "Cidade",
    uf: "UF",
    telefonePrincipal: "Telefone principal",
    telefoneSecundario: "Telefone secundário",
    email: "E-mail",
    instituicaoId: "Instituição",
    tipoBeneficio: "Tipo de benefício",
    situacaoSocioeconomica: "Situação socioeconômica",
    observacoes: "Observações",
    ativo: "Status",
    composicaoFamiliar: "Composição familiar",
};

// Converte qualquer valor (Date, null, número, etc.) em string comparável.
function normalizarValor(valor) {
    if (valor instanceof Date) {
        return valor.toISOString();
    }

    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor);
}

/**
 * Grava um evento no histórico do beneficiário.
 * É uma operação auxiliar: uma falha aqui nunca deve interromper
 * o fluxo principal (cadastro, atualização ou doação), apenas loga o erro.
 */
export async function registrarEventoHistorico(
    {
        beneficiarioId,
        tipo,
        descricao,
        detalhes = null,
        usuarioId = null,
    },
    client = prisma,
) {
    try {
        await client.historicoBeneficiario.create({
            data: {
                beneficiarioId,
                tipo,
                descricao,
                detalhes: detalhes ?? undefined,
                usuarioId: usuarioId ?? undefined,
            },
        });
    } catch (error) {
        console.error(
            "Erro ao registrar evento no histórico do beneficiário:",
            error,
        );
    }
}

/**
 * Compara os dados antigos com os novos e devolve a lista de campos alterados.
 * Só considera campos conhecidos (presentes em ROTULOS_CAMPOS).
 */
export function montarAlteracoesBeneficiario(dadosAntigos, dadosNovos) {
    const alteracoes = [];

    for (const campo of Object.keys(dadosNovos)) {
        if (!(campo in ROTULOS_CAMPOS)) {
            continue;
        }

        const valorAntigo = normalizarValor(dadosAntigos[campo]);
        const valorNovo = normalizarValor(dadosNovos[campo]);

        if (valorAntigo === valorNovo) {
            continue;
        }

        alteracoes.push({
            campo,
            rotulo: ROTULOS_CAMPOS[campo],
            de: valorAntigo,
            para: valorNovo,
        });
    }

    return alteracoes;
}

// Monta uma frase curta e legível a partir da lista de alterações.
export function descreverAlteracoes(alteracoes) {
    if (!alteracoes || alteracoes.length === 0) {
        return null;
    }

    if (alteracoes.length <= 3) {
        return `Dados atualizados: ${alteracoes
            .map((alteracao) => alteracao.rotulo)
            .join(", ")}.`;
    }

    return `Dados atualizados (${alteracoes.length} campos alterados).`;
}
