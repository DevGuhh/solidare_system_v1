// ======================================================
// NOTIFICAÇÕES DO SISTEMA - COMPATIBILIDADE
// ======================================================
//
// Mantém as funções já usadas em todo o frontend:
//   mostrarSucesso()
//   mostrarErro()
//   mostrarAviso()
//   mostrarInfo()
//
// Agora elas exibem o feedback central no mesmo padrão
// visual do quadrado de carregamento.
// ======================================================

import { toast } from "../components/toast.js";

export function mostrarSucesso(
    mensagem,
    duracao = 2600
) {
    return toast.sucesso(
        mensagem,
        {
            titulo: "Operação concluída",
            duracao,
        }
    );
}

export function mostrarErro(
    mensagem,
    duracao = 4200
) {
    return toast.erro(
        mensagem,
        {
            titulo: "Não foi possível concluir",
            duracao,
        }
    );
}

export function mostrarAviso(
    mensagem,
    duracao = 3500
) {
    return toast.aviso(
        mensagem,
        {
            titulo: "Atenção",
            duracao,
        }
    );
}

export function mostrarInfo(
    mensagem,
    duracao = 3000
) {
    return toast.informacao(
        mensagem,
        {
            titulo: "Informação",
            duracao,
        }
    );
}
