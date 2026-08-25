import { z } from "zod";

export const criarInstituicaoSchema = z.object({
  cnpj: z
    .string()
    .trim()
    .refine(validarCNPJ, "Informe um CNPJ válido.")
    .transform((value) => value.replace(/\D/g, "")),
  
  nome: z
    .string()
    .trim()
    .min(3, "O nome da instituição deve possuir no mínimo 3 caracteres.")
    .max(150, "O nome da instituição deve possuir no máximo 150 caracteres."),

  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .max(255, "O e-mail deve possuir no máximo 255 caracteres."),

  tipo: z.enum(
    ["IGREJA", "ASSOCIACAO", "ONG", "OUTRO"],
    {
      error: "Selecione um tipo de instituição."
    }
  ),

  responsavel: z
    .string()
    .trim()
    .min(5, "Informe o nome completo do responsável.")
    .max(120, "O nome do responsável deve possuir no máximo 120 caracteres.")
    .regex(/[A-Za-zÀ-ÿ]/, "O nome do responsável é inválido."),

  telefone: z
    .string()
    .trim()
    .regex(
      /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/,
      "Informe um telefone válido."
    ),

  cep: z
    .string()
    .regex(/^\d{8}$/, "CEP deve conter exatamente 8 números."),

  logradouro: z
    .string()
    .trim()
    .min(3, "Informe o logradouro.")
    .max(150, "O logradouro deve possuir no máximo 150 caracteres."),

  numero: z
    .string()
    .trim()
    .min(1, "Informe o número.")
    .max(20, "O número deve possuir no máximo 20 caracteres."),

  complemento: z
    .string()
    .trim()
    .max(100, "O complemento deve possuir no máximo 100 caracteres.")
    .optional()
    .or(z.literal("")),

  bairro: z
    .string()
    .trim()
    .min(2, "Informe o bairro.")
    .max(100, "O bairro deve possuir no máximo 100 caracteres."),

  cidade: z
    .string()
    .trim()
    .min(2, "Informe a cidade.")
    .max(100, "A cidade deve possuir no máximo 100 caracteres.")
    .regex(/[A-Za-zÀ-ÿ]/, "Cidade inválida."),

  uf: z.enum([
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ], {
    error: "Selecione o estado."
  }),

  ativa: z
    .boolean()
    .default(true),

  statusOk: z
  .enum(["OK", "PENDENTE"], {
    error: "Status deve ser 'OK' ou 'PENDENTE'."
  }).optional(),
});