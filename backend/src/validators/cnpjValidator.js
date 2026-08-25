import { validarCNPJ } from "../utils/cnpj.js";

const CNPJ_REGEX = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

const validarTexto = {
  extrairCandidatos(texts) {
    const textoCompleto = texts.join(" ");
    const matches = textoCompleto.match(CNPJ_REGEX) || [];
    return matches
      .map((m) => m.replace(/\D/g, ""))
      .filter((cnpj) => validarCNPJ(cnpj))
      .filter((cnpj, i, arr) => arr.indexOf(cnpj) === i);
  },

  validateHeaderName(texts) {
    let cnpj_number;

    texts.forEach((text) => {
      const test = validarCNPJ(text);

      if (test && text !== "") {
        cnpj_number = text;
      }
    });

    return cnpj_number;
  },

  validarCNPJ,
};

export default validarTexto;
