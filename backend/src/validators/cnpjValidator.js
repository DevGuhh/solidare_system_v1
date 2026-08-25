const CNPJ_REGEX = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

const validarTexto = {
  extrairCandidatos(texts) {
    const textoCompleto = texts.join(" ");
    const matches = textoCompleto.match(CNPJ_REGEX) || [];
    return matches
      .map((m) => m.replace(/\D/g, ""))
      .filter((cnpj) => this.validarCNPJ(cnpj))
      .filter((cnpj, i, arr) => arr.indexOf(cnpj) === i);
  },

  validateHeaderName(texts) {
    let cnpj_number;

    texts.forEach((text) => {
      const test = this.validarCNPJ(text);

      if (test && text !== "") {
        cnpj_number = text;
      }
    });

    return cnpj_number;
  },

  validarCNPJ(val) {
    const cnpj = String(val).replace(/\D/g, "");

    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calc = (x) => {
      let soma = 0;
      let pos = x - 7;

      for (let i = 0; i < x; i++) {
        const code = cnpj.charCodeAt(i) - 48;
        soma += code * pos--;

        if (pos < 2) {
          pos = 9;
        }
      }

      const res = soma % 11;
      return res < 2 ? 0 : 11 - res;
    };

    const dv1 = calc(12);
    const dv2 = calc(13);

    return dv1 === Number(cnpj.charAt(12)) && dv2 === Number(cnpj.charAt(13));
  },
};

export default validarTexto;
