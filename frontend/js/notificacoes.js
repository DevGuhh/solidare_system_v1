export function inicializarNotificacoes() {
  return import("./dashboard/dashboardNotificacoes.js")
    .then((modulo) => {
      if (typeof modulo.initNotificacoesDashboard === "function") {
        modulo.initNotificacoesDashboard();
      }
    })
    .catch((erro) => {
      console.error("Erro ao inicializar notificações do dashboard:", erro);
    });
}
