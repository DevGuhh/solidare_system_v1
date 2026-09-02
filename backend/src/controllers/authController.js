import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { generateToken } from "../utils/generateToken.js";
import { sendMail } from "../config/mailer.js";
import { resetPasswordEmail } from "../templates/resetPasswordEmail.js";

class AuthController {
  async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (
        typeof email !== "string" ||
        typeof senha !== "string" ||
        !email.trim() ||
        !senha
      ) {
        return res.status(400).json({
          error: "E-mail e senha são obrigatórios.",
        });
      }

      const emailNormalizado = email.trim().toLowerCase();
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!regexEmail.test(emailNormalizado) || emailNormalizado.length > 254) {
        return res.status(400).json({
          error: "Informe um e-mail válido.",
        });
      }

      // Evita payloads anormalmente grandes antes do bcrypt.
      if (senha.length > 256) {
        return res.status(400).json({
          error: "E-mail ou senha inválidos.",
        });
      }

      const usuario = await prisma.usuario.findUnique({
        where: {
          email: emailNormalizado,
        },

        select: {
          id: true,
          nome: true,
          email: true,
          senhaHash: true,
          senhaProvisoria: true,
          role: true,
          ativo: true,
          instituicaoId: true,
        },
      });

      if (!usuario) {
        return res.status(401).json({
          error: "E-mail ou senha inválidos.",
        });
      }

      if (!usuario.ativo) {
        return res.status(403).json({
          error: "Este usuário está inativo. Procure um administrador.",
        });
      }

      if (!usuario.senhaHash) {
        console.error(
          `Usuário de ID ${usuario.id} está sem senhaHash no banco.`,
        );

        return res.status(500).json({
          error: "O usuário está sem uma senha configurada.",
        });
      }

      const senhaValida = await bcrypt.compare(
        senha,
        usuario.senhaHash,
      );

      if (!senhaValida) {
        return res.status(401).json({
          error: "E-mail ou senha inválidos.",
        });
      }

      const token = generateToken(usuario.id, res, usuario.role);

      return res.status(200).json({
        status: "sucesso",
        mensagem: "Login realizado com sucesso.",
        token,
        senhaProvisoria: usuario.senhaProvisoria,
        role: usuario.role,
        data: {
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            ativo: usuario.ativo,
            instituicaoId: usuario.instituicaoId,
            senhaProvisoria: usuario.senhaProvisoria,
          },
          token,
        },
      });
    } catch (erro) {
      console.error("Erro ao realizar login:", erro);

      return res.status(500).json({
        error: "Erro interno ao realizar login.",
      });
    }
  }

  async logout(req, res) {
    try {
      res.cookie("jwt", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: new Date(0),
        sameSite: "lax",
      });

      return res.status(200).json({
        status: "sucesso",
        mensagem: "Desconectado com sucesso.",
      });
    } catch (erro) {
      console.error("Erro ao realizar logout:", erro);

      return res.status(500).json({
        error: "Erro interno ao realizar logout.",
      });
    }
  }

  async alterarSenha(req, res) {
    try {
      const usuarioId = req.userId;
      const { senhaAtual, novaSenha, confirmarSenha } = req.body;

      if (!usuarioId) {
        return res.status(401).json({
          error: "Usuário não autenticado.",
        });
      }

      if (!senhaAtual || !novaSenha || !confirmarSenha) {
        return res.status(400).json({
          error: "Preencha todos os campos.",
        });
      }

      if (typeof novaSenha !== "string" || novaSenha.length < 6) {
        return res.status(400).json({
          error: "A nova senha deve possuir pelo menos 6 caracteres.",
        });
      }

      if (novaSenha !== confirmarSenha) {
        return res.status(400).json({
          error: "A confirmação da senha não corresponde à nova senha.",
        });
      }

      if (senhaAtual === novaSenha) {
        return res.status(400).json({
          error: "A nova senha deve ser diferente da senha atual.",
        });
      }

      const usuario = await prisma.usuario.findUnique({
        where: {
          id: Number(usuarioId),
        },
      });

      if (!usuario) {
        return res.status(404).json({
          error: "Usuário não encontrado.",
        });
      }

      if (!usuario.ativo) {
        return res.status(403).json({
          error: "Este usuário está inativo.",
        });
      }

      if (!usuario.senhaHash) {
        return res.status(500).json({
          error: "O usuário está sem uma senha configurada.",
        });
      }

      const senhaAtualValida = await bcrypt.compare(
        senhaAtual,
        usuario.senhaHash,
      );

      if (!senhaAtualValida) {
        return res.status(401).json({
          error: "A senha atual está incorreta.",
        });
      }

      const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

      await prisma.usuario.update({
        where: {
          id: usuario.id,
        },

        data: {
          senhaHash: novaSenhaHash,
          senhaProvisoria: false,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      });

      return res.status(200).json({
        status: "sucesso",
        mensagem: "Senha alterada com sucesso.",
      });
    } catch (erro) {
      console.error("Erro ao alterar senha:", erro);

      return res.status(500).json({
        error: "Erro interno ao alterar a senha.",
      });
    }
  }
  async requestPasswordReset(req, res) {
    const { email } = req.body;

    try {
      // 1. Validar se o e-mail foi informado
      if (!email || typeof email !== "string") {
        return res.status(400).json({
          error: "Informe um e-mail válido.",
        });
      }

      // 2. Normalizar o e-mail
      const emailNormalizado = email.trim().toLowerCase();

      // 3. Validar formato do e-mail
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!regexEmail.test(emailNormalizado)) {
        return res.status(400).json({
          error: "Informe um e-mail válido.",
        });
      }

      // 4. Procurar usuário
      const user = await prisma.usuario.findUnique({
        where: {
          email: emailNormalizado,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          ativo: true,
        },
      });

      // 5. Não revelar se o usuário existe
      if (!user || !user.ativo) {
        return res.status(200).json({
          message:
            "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
        });
      }

      // 6. Gerar token original
      const resetToken = crypto.randomBytes(32).toString("hex");

      // 7. Criar hash do token
      const tokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // 8. Definir expiração de 15 minutos
      const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

      await prisma.usuario.update({
        where: {
          id: user.id,
        },
        data: {
          resetTokenHash: tokenHash,
          resetTokenExpiresAt: expiresAt,
        },
      });

      try {
        const resetUrl = `${process.env.FRONTEND_URL}/views/redefinirSenha.html?token=${resetToken}`;
        await sendMail(
          user.email,
          "Redefinição de senha",
          resetPasswordEmail(user.nome, resetUrl),
        );
      } catch (error) {
        await prisma.usuario.update({
          where: {
            id: user.id,
          },
          data: {
            resetTokenHash: null,
            resetTokenExpiresAt: null,
          },
        });

        throw error;
      }

      // 12. Resposta de sucesso
      return res.status(200).json({
        message:
          "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
      });
    } catch (error) {
      console.error("Erro em requestPasswordReset:", error);

      return res.status(500).json({
        error:
          "Não foi possível enviar o link de recuperação. Tente novamente mais tarde.",
      });
    }
  }

  async resetPassword(req, res) {
    const { token, newPassword, confirmPassword } = req.body;

    try {
      if (!token || typeof token !== "string") {
        return res.status(400).json({
          error: "O link de recuperação é inválido.",
        });
      }

      if (!newPassword || !confirmPassword) {
        return res.status(400).json({
          error: "Informe e confirme a nova senha.",
        });
      }

      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return res.status(400).json({
          error: "A nova senha deve possuir pelo menos 6 caracteres.",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          error: "A confirmação da senha não corresponde à nova senha.",
        });
      }

      const tokenHash = crypto
        .createHash("sha256")
        .update(token.trim())
        .digest("hex");

      // Procura o usuário pelo hash salvo
      const usuario = await prisma.usuario.findFirst({
        where: {
          resetTokenHash: tokenHash,
          ativo: true,
          resetTokenExpiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!usuario) {
        return res.status(400).json({
          error:
            "O link de recuperação é inválido, já foi utilizado ou expirou.",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Atualiza a senha e limpa o token
      await prisma.usuario.update({
        where: {
          id: usuario.id,
        },
        data: {
          senhaHash: hashedPassword,
          senhaProvisoria: false,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      });

      return res.status(200).json({
        message: "Senha redefinida com sucesso!",
      });
    } catch (error) {
      console.error("Erro em resetPassword:", error);

      return res.status(500).json({
        error: "Erro interno do servidor.",
      });
    }
  }
}

export default new AuthController();
