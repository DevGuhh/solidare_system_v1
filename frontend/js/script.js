import { API_URL } from "../config.js";
import {
    mostrarSucesso,
    mostrarErro
} from "./utils/toast.js";

function mostrarSenha() {
    const senha = document.getElementById("senha");

    senha.type = senha.type === "password" ? "text" : "password";
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {

        const resposta = await fetch(API_URL + "/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                senha: senha
            })
        });

        const dados = await resposta.json();

        if (resposta.ok) {

            // Salva o JWT
            localStorage.setItem("token", dados.data.token);

            mostrarSucesso(
                "Login realizado com sucesso.",
                900
            );

            setTimeout(() => {
                window.location.href =
                    "./views/dashboard.html";
            }, 450);

        } else {

            mostrarErro(
                dados.error ||
                "E-mail ou senha inválidos."
            );

        }

    } catch (erro) {

        console.error(erro);
        mostrarErro(
            "Erro ao conectar com o servidor."
        );

    }

});