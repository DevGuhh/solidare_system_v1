// =====================================================
// NORMALIZAR TEXTO
// =====================================================

function normalizarTexto(valor) {

    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}


// =====================================================
// FILTRAR DOAÇÕES
// =====================================================

export function filtrarDoacoes(

    lista,

    texto = "",

    tipo = "TODAS"

) {

    if (!Array.isArray(lista)) {
        return [];
    }

    const pesquisa =
        normalizarTexto(texto);

    return lista.filter(
        (doacao) => {

            // =========================================
            // CAMPOS UTILIZADOS NA PESQUISA
            // =========================================

            const camposPesquisa = [

                doacao?.codigo,

                doacao?.beneficiario?.nomeCompleto,

                doacao?.instituicao?.nome,

                doacao?.usuario?.nome,

                doacao?.tipo,

                doacao?.origem === "QR_CODE" ? "QR Code" : "Manual",

                (doacao?.deletedAt || doacao?.canceladaEm) ? "Cancelada" : "Concluída",

                doacao?.quantidade,

                formatarDataPesquisa(
                    doacao?.dataDoacao
                )

            ]
                .map(normalizarTexto)
                .join(" ");


            // =========================================
            // FILTRO POR TEXTO
            // =========================================

            const correspondePesquisa =
                pesquisa === "" ||
                camposPesquisa.includes(
                    pesquisa
                );

            if (!correspondePesquisa) {
                return false;
            }


            // =========================================
            // FILTRO POR TIPO
            // =========================================

            if (tipo === "CESTA") {

                return doacao?.tipo ===
                    "CESTA";

            }

            if (tipo === "GRANEL") {

                return doacao?.tipo ===
                    "GRANEL";

            }

            if (tipo === "AMBOS") {

                return doacao?.tipo ===
                    "AMBOS";

            }

            return true;

        }
    );

}


// =====================================================
// FORMATAR DATA PARA PESQUISA
// =====================================================

function formatarDataPesquisa(data) {

    if (!data) {
        return "";
    }

    const dataConvertida =
        new Date(data);

    if (
        Number.isNaN(
            dataConvertida.getTime()
        )
    ) {
        return "";
    }

    return dataConvertida
        .toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

}