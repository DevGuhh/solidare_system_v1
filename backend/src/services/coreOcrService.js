import axios from "axios";

export class OcrService {
  static async send(imageUrl) {
    const subscriptionKey = process.env["COMPUTER_VISION_SUBSCRIPTION_KEY"];
    const endpoint = process.env["COMPUTER_VISION_ENDPOINT"];

    if (!subscriptionKey) {
      throw new Error(
        "Coloque sua COMPUTER_VISION_SUBSCRIPTION_KEY no arquivo .env",
      );
    }

    if (!endpoint) {
      throw new Error("Coloque seu COMPUTER_VISION_ENDPOINT no arquivo .env");
    }

    // Garante que o endpoint termina com / para evitar erros na URL
    const baseUrl = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;
    const uriBase = `${baseUrl}vision/v3.2/ocr`; // Recomendado atualizar v1.1 para v3.2

    const data = { url: imageUrl };

    const result = await axios.post(
      `${uriBase}?language=unk&detectOrientation=true`,
      data,
      {
        headers: {
          // 'headers' em minúsculo
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": subscriptionKey,
        },
      },
    );

    return result.data;
  }

  static async sendBuffer(buffer) {
    const subscriptionKey = process.env.COMPUTER_VISION_SUBSCRIPTION_KEY;
    const endpoint = process.env.COMPUTER_VISION_ENDPOINT;

    if (!subscriptionKey) {
      throw new Error(
        "Coloque sua COMPUTER_VISION_SUBSCRIPTION_KEY no arquivo .env",
      );
    }

    if (!endpoint) {
      throw new Error("Coloque seu COMPUTER_VISION_ENDPOINT no arquivo .env");
    }

    const baseUrl = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;

    const uriBase = `${baseUrl}vision/v3.2/read/analyze`;

    const response = await axios.post(uriBase, buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    });

    const operationLocation = response.headers["operation-location"];

    if (!operationLocation) {
      throw new Error("Azure OCR não retornou Operation-Location.");
    }

    for (let tentativa = 0; tentativa < 30; tentativa++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await axios.get(operationLocation, {
        headers: {
          "Ocp-Apim-Subscription-Key": subscriptionKey,
        },
      });

      const status = result.data.status;

      if (status === "succeeded") {
        return {
          regions: (result.data.analyzeResult?.readResults || []).map(
            (page) => ({
              lines: (page.lines || []).map((line) => ({
                words: (line.words || []).map((word) => ({
                  text: word.text,
                })),
              })),
            }),
          ),
        };
      }

      if (status === "failed") {
        throw new Error(`Azure OCR falhou: ${JSON.stringify(result.data)}`);
      }
    }

    throw new Error("Azure OCR demorou demais para processar o documento.");
  }
}
