// =====================================================
// TABELA DOS RELATÓRIOS
// =====================================================

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarCPF(valor) {
    const cpf = String(valor ?? "").replace(/\D/g, "");

    if (cpf.length !== 11) {
        return valor || "Não informado";
    }

    return cpf.replace(
        /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
        "$1.$2.$3-$4"
    );
}

function formatarBeneficio(valor) {
    const opcoes = {
        CESTA: "Cesta",
        OUTROS: "Outros"
    };

    return opcoes[valor] ?? valor ?? "Não informado";
}

export function renderizarTabelaRelatorios(
    tabela,
    beneficiarios
) {
    tabela.innerHTML = "";

    if (!beneficiarios.length) {
        tabela.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="estado-tabela">
                        <i class="fa-solid fa-file-circle-xmark"></i>

                        <strong>
                            Nenhum registro encontrado
                        </strong>

                        <span>
                            Altere os filtros para consultar outros resultados.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    const fragmento =
        document.createDocumentFragment();

    beneficiarios.forEach((beneficiario) => {
        const linha =
            document.createElement("tr");

        const instituicao =
            beneficiario.instituicao?.nome ??
            "Não informada";

        linha.innerHTML = `
            <td>
                <span class="identificador-registro">
                    #${escaparHTML(beneficiario.id)}
                </span>
            </td>

            <td>
                <div class="celula-principal">
                    <span class="avatar-tabela">
                        <i class="fa-solid fa-user"></i>
                    </span>

                    <div>
                        <strong>
                            ${escaparHTML(beneficiario.nomeCompleto)}
                        </strong>

                        <small>
                            ${escaparHTML(formatarCPF(beneficiario.cpf))}
                        </small>
                    </div>
                </div>
            </td>

            <td>
                ${escaparHTML(formatarCPF(beneficiario.cpf))}
            </td>

            <td>
                ${escaparHTML(instituicao)}
            </td>

            <td>
                <span class="badge badge-neutro">
                    ${escaparHTML(
                        formatarBeneficio(
                            beneficiario.tipoBeneficio
                        )
                    )}
                </span>
            </td>

            <td>
                <span class="badge-status ${
                    beneficiario.ativo
                        ? "status-ativo"
                        : "status-pendente"
                }">
                    <i class="fa-solid ${
                        beneficiario.ativo
                            ? "fa-circle-check"
                            : "fa-circle-pause"
                    }"></i>

                    ${
                        beneficiario.ativo
                            ? "Ativo"
                            : "Inativo"
                    }
                </span>
            </td>
        `;

        fragmento.appendChild(linha);
    });

    tabela.appendChild(fragmento);
}
