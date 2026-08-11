import { z } from "zod";

export const registrarEntradaSaldoSchema = z.object({
  instituicaoId: z
    .number({
      required_error: "Informe a instituição.",
      invalid_type_error: "instituicaoId deve ser um número.",
    })
    .int()
    .positive(),
  quantidade: z
    .number({
      required_error: "Informe a quantidade.",
      invalid_type_error: "A quantidade deve ser um número.",
    })
    .int()
    .positive("A quantidade deve ser maior que zero."),
  observacao: z.string().trim().max(500).optional(),
});