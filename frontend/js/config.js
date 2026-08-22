// URL da API definida automaticamente conforme o ambiente.
// Em desenvolvimento local, usa o backend local. Em produção, usa o Render.

const HOST_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_URL = HOST_LOCAL
    ? "http://localhost:3000"
    : "https://solidare-system-v1.onrender.com";
