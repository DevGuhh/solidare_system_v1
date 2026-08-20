// Importa o Zod, biblioteca usada para validar os dados recebidos pela API.
import { z } from "zod";

// Schema usado para validar o cadastro de beneficiário.
export const criarBeneficiarioSchema = z.object({
    // Nome completo obrigatório.
    nomeCompleto: z
        .string()
        .trim()
        .min(3, "Nome completo deve ter no mínimo 3 caracteres.")
        .max(150, "Nome completo deve ter no máximo 150 caracteres."),

    // CPF obrigatório, aceitando somente 11 números.
    cpf: z
        .string()
        .regex(/^\d{11}$/, "CPF deve conter exatamente 11 números."),

    // Data de nascimento.
    // z.coerce.date() tenta converter string em Date.
    dataNascimento: z.coerce.date(),

    // Endereço opcional. Quando informado, respeita os limites abaixo.
    logradouro: z
        .string()
        .trim()
        .max(150, "Logradouro deve ter no máximo 150 caracteres.")
        .optional()
        .or(z.literal("")),

    // Número da residência opcional.
    numero: z
        .string()
        .trim()
        .max(10, "Número deve ter no máximo 10 caracteres.")
        .optional()
        .or(z.literal("")),

    // Complemento é opcional.
    // Também aceita string vazia "", pois formulários HTML costumam enviar campo vazio.
    complemento: z
        .string()
        .trim()
        .max(100, "Complemento deve ter no máximo 100 caracteres.")
        .optional()
        .or(z.literal("")),

    // CEP opcional, mas se for enviado precisa ter exatamente 8 números.
    cep: z
        .string()
        .regex(/^\d{8}$/, "CEP deve conter exatamente 8 números.")
        .optional()
        .or(z.literal("")),

    // Região/bairro/localidade opcional.
    regiao: z
        .string()
        .trim()
        .max(100, "Região deve ter no máximo 100 caracteres.")
        .optional()
        .or(z.literal("")),

    // Cidade opcional.
    cidade: z
        .string()
        .trim()
        .max(100, "Cidade deve ter no máximo 100 caracteres.")
        .optional()
        .or(z.literal("")),

    // UF opcional. Quando preenchida, aceita apenas siglas brasileiras.
    uf: z.enum([
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
        "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
        "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ]).optional().or(z.literal("")),

    // Telefone principal opcional. Se informado, aceita DDD + número.
    telefonePrincipal: z
        .string()
        .regex(/^\d{10,11}$/, "Telefone principal deve conter 10 ou 11 números.")
        .optional()
        .or(z.literal("")),

    // Telefone secundário opcional.
    telefoneSecundario: z
        .string()
        .regex(/^\d{10,11}$/, "Telefone secundário deve conter 10 ou 11 números.")
        .optional()
        .or(z.literal("")),

    // Email opcional, mas se for enviado precisa ter formato válido.
    email: z
        .string()
        .email("Email inválido.")
        .optional()
        .or(z.literal("")),

    // Quantidade total de pessoas que fazem parte da família.
    // O valor será usado para sugerir automaticamente a quantidade da doação.
    composicaoFamiliar: z
        .coerce
        .number({
            required_error: "Informe a composição familiar.",
            invalid_type_error: "A composição familiar deve ser um número."
        })
        .int("A composição familiar deve ser um número inteiro.")
        .min(1, "A composição familiar deve ter pelo menos 1 pessoa.")
        .max(50, "A composição familiar deve ter no máximo 50 pessoas."),

    // Tipo de benefício permitido.
    tipoBeneficio: z.enum([
        "CESTA",
        "GRANEL",
        "AMBOS"
    ]),

    // Campo opcional para descrever a situação da família.
    situacaoSocioeconomica: z
        .string()
        .trim()
        .max(500, "Situação socioeconômica deve ter no máximo 500 caracteres.")
        .optional()
        .or(z.literal("")),

    // Campo opcional para observações gerais.
    observacoes: z
        .string()
        .trim()
        .max(1000, "Observações devem ter no máximo 1000 caracteres.")
        .optional()
        .or(z.literal("")),

    // Status do beneficiário.
    // Se não vier no cadastro, o padrão será true.
    ativo: z
        .boolean()
        .default(true),

    // Instituição vinculada ao beneficiário.
    // É opcional porque:
    // - ADMIN pode enviar pelo formulário.
    // - Usuário INSTITUICAO usa o id vindo do token.
    instituicaoId: z
        .coerce
        .number()
        .int()
        .positive()
        .optional()
});
