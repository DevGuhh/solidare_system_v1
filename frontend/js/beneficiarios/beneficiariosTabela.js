// =====================================================
// FORMATAR TEXTO COM SEGURANÇA
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
// FORMATAR CPF
// =====================================================

function formatarCPF(cpf) {

    const numeros =
        String(cpf ?? "")
            .replace(/\D/g, "");

    if (numeros.length !== 11) {
        return numeros || "-";
    }

    return numeros.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        "$1.$2.$3-$4"
    );

}


// =====================================================
// FORMATAR TELEFONE
// =====================================================

function formatarTelefone(telefone) {

    const numeros =
        String(telefone ?? "")
            .replace(/\D/g, "");

    if (!numeros) {
        return "-";
    }

    if (numeros.length === 11) {

        return numeros.replace(
            /(\d{2})(\d{5})(\d{4})/,
            "($1) $2-$3"
        );

    }

    if (numeros.length === 10) {

        return numeros.replace(
            /(\d{2})(\d{4})(\d{4})/,
            "($1) $2-$3"
        );

    }

    return numeros;

}


// =====================================================
// FORMATAR BENEFÍCIO
// =====================================================

function formatarBeneficio(tipoBeneficio) {

    const beneficios = {

        CESTA: {
            texto: "Cesta",
            classe: "beneficio-cesta"
        },

        GRANEL: {
            texto: "Granel",
            classe: "beneficio-granel"
        },

        AMBOS: {
            texto: "Ambos",
            classe: "beneficio-ambos"
        }

    };

    return (
        beneficios[tipoBeneficio] ||
        {
            texto:
                tipoBeneficio || "Não informado",

            classe:
                "beneficio-padrao"
        }
    );

}


// =====================================================
// GERAR INICIAIS DO NOME
// =====================================================

function gerarIniciais(nome) {

    const nomeNormalizado =
        String(nome ?? "")
            .trim();

    if (!nomeNormalizado) {
        return "US";
    }

    const partes =
        nomeNormalizado
            .split(/\s+/)
            .filter(Boolean);

    if (partes.length === 1) {

        return partes[0]
            .substring(0, 2)
            .toUpperCase();

    }

    return (
        partes[0].charAt(0) +
        partes[partes.length - 1].charAt(0)
    ).toUpperCase();

}


// =====================================================
// RENDERIZAR TABELA
// =====================================================

export function renderizarTabela(
    tabela,
    beneficiarios,
    idsSelecionados = new Set()
) {

    if (!tabela) {

        console.error(
            "Não foi possível renderizar a tabela: elemento não encontrado."
        );

        return;

    }

    const lista =
        Array.isArray(beneficiarios)
            ? beneficiarios
            : [];

    if (lista.length === 0) {

        tabela.innerHTML = `

            <tr class="beneficiarios-vazio">

                <td colspan="9">

                    <div class="beneficiarios-empty-state">

                        <div class="beneficiarios-empty-icon">

                            <i
                                class="fa-solid fa-users-slash"
                                aria-hidden="true"
                            ></i>

                        </div>

                        <strong>
                            Nenhum beneficiário encontrado
                        </strong>

                        <span>
                            Não existem registros para os critérios informados.
                        </span>

                    </div>

                </td>

            </tr>

        `;

        return;

    }

    const linhas =
        lista.map((beneficiario) => {

            const id =
                Number(beneficiario.id);

            const nome =
                beneficiario.nomeCompleto ||
                "Nome não informado";

            const cpf =
                formatarCPF(
                    beneficiario.cpf
                );

            const telefone =
                formatarTelefone(
                    beneficiario.telefonePrincipal
                );

            const instituicao =
                beneficiario.instituicao?.nome ||
                "Instituição não informada";

            const beneficio =
                formatarBeneficio(
                    beneficiario.tipoBeneficio
                );

            const ativo =
                Boolean(beneficiario.ativo);

            const iniciais =
                gerarIniciais(nome);

            const nomeSeguro =
                escaparHtml(nome);

            const cpfSeguro =
                escaparHtml(cpf);

            const telefoneSeguro =
                escaparHtml(telefone);

            const instituicaoSegura =
                escaparHtml(instituicao);

            const beneficioTextoSeguro =
                escaparHtml(
                    beneficio.texto
                );

            const beneficioClasseSegura =
                escaparHtml(
                    beneficio.classe
                );

            return `

                <tr>

                    <td class="coluna-checkbox">

                        <input
                            type="checkbox"
                            class="checkboxBeneficiario"
                            data-id="${beneficiario.id}"
                            aria-label="Selecionar ${nomeSeguro}"
                            ${idsSelecionados.has(id) ? "checked" : ""}
                        >

                    </td>

                    <td>

                        <span class="beneficiario-id">
                            #${id}
                        </span>

                    </td>


                    <td>

                        <div class="beneficiario-identificacao">

                            <div
                                class="beneficiario-avatar"
                                aria-hidden="true"
                            >
                                ${escaparHtml(iniciais)}
                            </div>

                            <div class="beneficiario-nome">

                                <strong title="${nomeSeguro}">
                                    ${nomeSeguro}
                                </strong>

                                <span>
                                    Beneficiário cadastrado
                                </span>

                            </div>

                        </div>

                    </td>


                    <td>

                        <span class="beneficiario-dado-monospaced">
                            ${cpfSeguro}
                        </span>

                    </td>


                    <td>

                        <div class="beneficiario-contato">

                            <i
                                class="fa-solid fa-phone"
                                aria-hidden="true"
                            ></i>

                            <span>
                                ${telefoneSeguro}
                            </span>

                        </div>

                    </td>


                    <td>

                        <div
                            class="beneficiario-instituicao"
                            title="${instituicaoSegura}"
                        >

                            <i
                                class="fa-solid fa-building"
                                aria-hidden="true"
                            ></i>

                            <span>
                                ${instituicaoSegura}
                            </span>

                        </div>

                    </td>


                    <td>

                        <span
                            class="
                                beneficio-badge
                                ${beneficioClasseSegura}
                            "
                        >
                            ${beneficioTextoSeguro}
                        </span>

                    </td>


                    <td>

                        <button
                            type="button"
                            class="
                                btnStatusBeneficiario
                                status-beneficiario
                                ${
                                    ativo
                                        ? "status-ativo"
                                        : "status-inativo"
                                }
                            "
                            data-id="${id}"
                            data-ativo="${ativo}"
                            title="${
                                ativo
                                    ? "Clique para inativar"
                                    : "Clique para ativar"
                            }"
                            aria-label="${
                                ativo
                                    ? "Beneficiário ativo. Clique para inativar."
                                    : "Beneficiário inativo. Clique para ativar."
                            }"
                        >

                            <span
                                class="status-indicador"
                                aria-hidden="true"
                            ></span>

                            ${
                                ativo
                                    ? "Ativo"
                                    : "Inativo"
                            }

                        </button>

                    </td>


                    <td class="beneficiario-acoes">

                        <button
                            type="button"
                            class="btnCarteirinhaBeneficiario"
                            data-id="${id}"
                            data-nome="${nomeSeguro}"
                            title="Gerar carteirinha do beneficiário"
                            aria-label="Gerar carteirinha de ${nomeSeguro}"
                        >
                            <i
                                class="fa-solid fa-id-card"
                                aria-hidden="true"
                            ></i>
                        </button>

                        <button
                            type="button"
                            class="btnHistoricoBeneficiario"
                            data-id="${id}"
                            data-nome="${nomeSeguro}"
                            title="Ver histórico do beneficiário"
                            aria-label="Ver histórico de ${nomeSeguro}"
                        >
                            <i
                                class="fa-solid fa-clock-rotate-left"
                                aria-hidden="true"
                            ></i>
                        </button>

                        <button
                            type="button"
                            class="btnEditar"
                            data-id="${id}"
                            title="Editar beneficiário"
                            aria-label="Editar ${nomeSeguro}"
                        >
                            <i
                                class="fa-solid fa-pen"
                                aria-hidden="true"
                            ></i>
                        </button>


                    </td>

                </tr>

            `;

        }).join("");

    tabela.innerHTML =
        linhas;

}