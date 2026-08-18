import axios from "axios";

export class OcrService {
  static async send(imageUrl) {
    const subscriptionKey = process.env["COMPUTER_VISION_SUBSCRIPTION_KEY"];
    const endpoint = process.env["COMPUTER_VISION_ENDPOINT"];

    if (!subscriptionKey) {
      throw new Error("Coloque sua COMPUTER_VISION_SUBSCRIPTION_KEY no arquivo .env");
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
        headers: { // 'headers' em minúsculo
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": subscriptionKey,
        },
      }
    );

    return result.data;
  }
}