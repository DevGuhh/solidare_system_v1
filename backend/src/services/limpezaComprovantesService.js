import { prisma } from "../config/db.js";

const INTERVALO_LIMPEZA_MS = 24 * 60 * 60 * 1000;

export async function limparComprovantesExpirados() {
  const agora = new Date();

  const resultado = await prisma.comprovanteEntrega.deleteMany({
    where: {
      expiraEm: { lte: agora },
    },
  });

  if (resultado.count > 0) {
    console.log(`[Comprovantes] ${resultado.count} foto(s) expirada(s) removida(s).`);
  }

  return resultado.count;
}

export function iniciarLimpezaAutomaticaComprovantes() {
  limparComprovantesExpirados().catch((erro) => {
    console.error("Erro ao limpar comprovantes expirados:", erro);
  });

  const timer = setInterval(() => {
    limparComprovantesExpirados().catch((erro) => {
      console.error("Erro ao limpar comprovantes expirados:", erro);
    });
  }, INTERVALO_LIMPEZA_MS);

  timer.unref?.();
  return timer;
}
