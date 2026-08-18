import { OcrService } from '../services/coreOcrService.js'; 
import validarTexto from '../validators/cnpjValidator.js';

class OcrController {
  async sendImage(req, res) {
    try {
      const { imagem, tipo_doc } = req.body;

      if (!imagem) {
        return res.status(400).json({ message: "url da imagem é obrigatória" });
      }

      if (!tipo_doc) {
        return res.status(400).json({ message: "tipo_doc é obrigatório" });
      }

      const result = await OcrService.send(imagem);

      let textos = [];
      result.regions?.forEach((region) => {
        region.lines?.forEach((line) => {
          line.words?.forEach((word) => {
            textos.push(word.text);
          });
        });
      });

      // Método correto de acordo com seu cnpjValidator.js
      const cnpj_number = validarTexto.validateHeaderName(textos);

      return res.status(200).json({ cnpj_number });
    } catch (error) {
      return res.status(500).json({ 
        message: "Erro ao processar imagem", 
        error: error.response?.data || error.message 
      });
    }
  }
}

export default new OcrController();