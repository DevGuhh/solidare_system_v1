# Instituto Solidare

Projeto unificado com frontend estático e API Node.js/Express + Prisma/PostgreSQL.

## Estrutura
- `frontend/`: páginas, estilos, scripts e imagens.
- `backend/`: API, autenticação, controllers, validações e Prisma.

## Instalação
1. Copie `backend/.env.example` para `backend/.env` e configure as variáveis.
2. No diretório `backend`, execute `npm install`.
3. Execute `npx prisma generate`.
4. Em banco novo, execute `npx prisma migrate deploy`; em desenvolvimento, use `npx prisma migrate dev` somente sem alterar migrations já aplicadas.
5. Execute `npm run dev`.
6. Sirva a pasta raiz com Live Server em `http://127.0.0.1:5500`.

## Segurança
Nunca envie `.env`, `node_modules` ou credenciais ao GitHub. Não altere arquivos de migrations que já foram aplicados em um banco compartilhado.

