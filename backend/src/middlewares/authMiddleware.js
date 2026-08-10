import { prisma } from "../config/db.js";
import jwt from "jsonwebtoken";

// Middleware responsável por verificar se o usuário está autenticado.
const protect = async (req, res, next) => {
    try {

        // Obtém o cabeçalho Authorization
        const authHeader = req.headers.authorization;

        // Verifica se o cabeçalho existe e começa com "Bearer "
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Você precisa estar logado para acessar este recurso."
            });
        }

        // Extrai o token
        const token = authHeader.split(" ")[1];

        // Verifica se o token existe
        if (!token) {
            return res.status(401).json({
                error: "Token inválido."
            });
        }

        // Verifica se o token é válido
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Busca o usuário no banco
        const usuario = await prisma.usuario.findUnique({
            where: {
                id: decoded.id,
            },
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
                instituicaoId: true,
                senhaProvisoria: true,
            },
         });

        // Usuário não encontrado
        if (!usuario) {
            return res.status(401).json({
                error: "Usuário não encontrado."
            });
        }

        // Usuário desativado
        if (!usuario.ativo) {
            return res.status(401).json({
                error: "Usuário desativado."
            });
        }

        // Salva os dados do usuário na requisição
        req.user = usuario;
        req.userId = usuario.id;

        next();

    } catch (error) {

        console.error(error);

        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                error: "Token inválido."
            });
        }

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                error: "Token expirado."
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
};

// Middleware para verificar permissão
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: "Usuário não autenticado."
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: "Você não possui permissão para acessar este recurso."
            });
        }
        next();
    };
};

export { protect, authorize };