// =====================================================
// MÁSCARAS E LIMITES DE CAMPOS NUMÉRICOS
// =====================================================

function somenteNumeros(valor, limite) {
    return String(valor ?? "")
        .replace(/\D/g, "")
        .slice(0, limite);
}

export function formatarCPF(valor) {
    const numeros = somenteNumeros(valor, 11);

    return numeros
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatarCEP(valor) {
    const numeros = somenteNumeros(valor, 8);

    return numeros.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatarTelefone(valor) {
    const numeros = somenteNumeros(valor, 11);

    if (numeros.length <= 10) {
        return numeros
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
    }

    return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function aplicarMascaraCPF(campo) {
    if (!campo) return;

    campo.maxLength = 14;

    campo.addEventListener("input", (e) => {
        e.target.value = formatarCPF(e.target.value);
    });
}

export function aplicarMascaraCEP(campo) {
    if (!campo) return;

    campo.maxLength = 9;

    campo.addEventListener("input", (e) => {
        e.target.value = formatarCEP(e.target.value);
    });
}

export function aplicarMascaraTelefone(campo) {
    if (!campo) return;

    campo.maxLength = 15;

    campo.addEventListener("input", (e) => {
        e.target.value = formatarTelefone(e.target.value);
    });
}
