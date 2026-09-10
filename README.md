# Instituto Solidare — Sistema de Gestão

Sistema web para gestão de doações, instituições parceiras e beneficiários do Instituto Solidare. O projeto é dividido em duas partes: um **frontend estático** (HTML/CSS/JS puro) e uma **API REST** em Node.js/Express com PostgreSQL via Prisma ORM.

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura e tecnologias](#arquitetura-e-tecnologias)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Modelo de dados](#modelo-de-dados)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Testes e integração contínua](#testes-e-integração-contínua)
- [Segurança](#segurança)

## Visão geral

O Solidare System organiza o fluxo de doações entre o instituto e suas instituições parceiras (igrejas, associações, ONGs), controlando o cadastro de beneficiários, o saldo de cestas básicas disponíveis para cada instituição, a emissão de comprovantes de entrega (com OCR) e QR Codes, além de um canal interno de suporte.

Existem dois perfis de acesso:
- **Admin**: gerencia instituições, doações, relatórios e suporte.
- **Instituição**: acompanha seus beneficiários, saldo de cestas e comprovantes.

## Funcionalidades

- Autenticação com JWT (login, troca de senha, redefinição de senha por e-mail).
- Cadastro e gestão de **instituições parceiras** (com endereço completo, CNPJ e status de aprovação).
- Cadastro e gestão de **beneficiários**, incluindo composição familiar e histórico de atendimento.
- Registro de **doações** e cálculo de **saldo de cestas** por instituição, com histórico de movimentações.
- Emissão e leitura de **QR Codes** para identificação de beneficiários/instituições.
- Upload de **comprovantes de entrega** com reconhecimento de imagem (Azure Computer Vision / OCR) e armazenamento em object storage (Cloudflare R2).
- Limpeza automática periódica de comprovantes antigos.
- **Notificações** internas por instituição.
- **Relatórios** com filtros e exportação.
- Canal de **suporte** (chamados e mensagens) com categorias e status.
- Dashboard com gráficos, cards e listagens resumidas.

## Arquitetura e tecnologias

**Backend** (`backend/`)
- Node.js + Express 5
- Prisma ORM 7 + PostgreSQL (testado com Neon)
- Autenticação via `jsonwebtoken` + cookies (`cookie-parser`)
- Segurança: `helmet`, `cors` com allowlist de origens, `express-rate-limit` (limite geral e limite específico para comprovantes)
- Upload de arquivos: `multer`
- Armazenamento de arquivos: AWS SDK (`@aws-sdk/client-s3`) apontando para Cloudflare R2
- E-mail transacional: `resend` / `nodemailer`
- Geração de QR Code: `qrcode`
- Validação de dados: `zod`
- Hash de senha: `bcrypt`
- Testes: `node --test`

**Frontend** (`frontend/`)
- HTML, CSS e JavaScript puro (sem framework/bundler), organizado por página/módulo (`doacoes`, `beneficiarios`, `instituicoes`, `dashboard`, `relatorios`, `suporte`, `qrcode`, etc.)
- Camada `js/api/*Api.js` para comunicação com a API
- Componentes reutilizáveis de UI (`toast`, `modal`, `loading`)

## Estrutura de pastas

```
solidare_system_v1/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Modelos e enums do banco
│   │   ├── migrations/          # Histórico de migrations
│   │   └── seed.js              # Seed de dados iniciais
│   ├── src/
│   │   ├── controllers/         # Regras de cada recurso (auth, doações, beneficiários...)
│   │   ├── routes/              # Definição das rotas Express
│   │   ├── middlewares/         # Autenticação e rate limit
│   │   ├── services/            # Regras de negócio (saldo, histórico, OCR, comprovantes)
│   │   ├── validators/          # Validações com zod
│   │   ├── utils/               # Helpers (tokens, senhas, códigos)
│   │   ├── config/              # Conexão com banco, R2 e e-mail
│   │   └── server.js            # Ponto de entrada da API
│   └── tests/                   # Testes automatizados
├── frontend/
│   ├── views/                   # Páginas HTML internas (dashboard, doações, etc.)
│   ├── css/                     # Estilos por página e componentes
│   ├── js/                      # Scripts por página, componentes e chamadas de API
│   ├── img/                     # Imagens e logo
│   └── index.html               # Tela de login
└── .github/workflows/tests.yml  # Pipeline de CI
```

## Modelo de dados

Principais entidades definidas em `backend/prisma/schema.prisma`:

| Modelo | Descrição |
|---|---|
| `Usuario` | Contas de acesso (admin ou instituição), com senha provisória e fluxo de redefinição. |
| `InstituicaoParceira` | Instituições cadastradas, com endereço, CNPJ, status (`OK`/`PENDENTE`) e tipo (`IGREJA`, `ASSOCIACAO`, `ONG`, `OUTRO`). |
| `Beneficiario` | Pessoas atendidas, vinculadas a uma instituição. |
| `HistoricoBeneficiario` | Linha do tempo de eventos de cada beneficiário. |
| `Doacao` | Doações realizadas, com auditoria de criação/cancelamento. |
| `SaldoCesta` / `MovimentacaoSaldo` | Controle de saldo de cestas por instituição e seu extrato. |
| `QRCode` | QR Codes gerados pelo sistema. |
| `Comprovante` / `ComprovanteEntrega` | Comprovantes de doação/entrega, com foto e processamento OCR. |
| `Notificacao` | Notificações direcionadas a instituições. |
| `ChamadoSuporte` / `MensagemSuporte` | Chamados de suporte e suas mensagens, com categoria e status. |

## Pré-requisitos

- Node.js 20+
- Banco de dados PostgreSQL (local ou serviço gerenciado, ex.: Neon)
- Conta/credenciais para: Resend (e-mail), Cloudflare R2 (armazenamento) e Azure Computer Vision (OCR), caso queira usar essas integrações

## Instalação e execução

1. Copie `backend/.env.example` para `backend/.env` e preencha as variáveis com suas próprias credenciais (veja a seção [Variáveis de ambiente](#variáveis-de-ambiente)).
2. Instale as dependências do backend:
   ```bash
   cd backend
   npm install
   ```
3. Gere o Prisma Client:
   ```bash
   npx prisma generate
   ```
4. Aplique as migrations:
   - Banco novo/produção: `npx prisma migrate deploy`
   - Ambiente de desenvolvimento (sem alterar migrations já aplicadas): `npx prisma migrate dev`
5. (Opcional) Popule dados iniciais:
   ```bash
   npx prisma db seed
   ```
6. Suba a API em modo desenvolvimento:
   ```bash
   npm run dev
   ```
   O servidor sobe por padrão em `http://localhost:3000` (health check em `/health`).
7. Sirva a pasta `frontend/` com um servidor estático (ex.: extensão Live Server do VS Code) em `http://127.0.0.1:5500`. O frontend detecta automaticamente o ambiente: usa `http://localhost:3000` quando acessado via `localhost`/`127.0.0.1`/`file://`, e a URL de produção quando publicado.

## Variáveis de ambiente

O backend consome as seguintes variáveis (defina-as em `backend/.env`, nunca as publique):

| Variável | Finalidade |
|---|---|
| `NODE_ENV` | Ambiente de execução (`development`/`production`). |
| `DATABASE_URL` | String de conexão do PostgreSQL. |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Segredo e validade do token de autenticação. |
| `FRONTEND_URL` | Lista de origens permitidas no CORS, separadas por vírgula. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Envio de e-mails transacionais (redefinição de senha, etc.). |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_BUCKET_NAME` | Acesso ao bucket R2 usado para armazenar comprovantes. |
| `COMPUTER_VISION_SUBSCRIPTION_KEY` / `COMPUTER_VISION_ENDPOINT` | Serviço de OCR (Azure Computer Vision) usado na leitura de comprovantes. |
| `PORT` | Porta da API (padrão `3000`). |

## Scripts disponíveis

No diretório `backend/`:

| Script | Comando | Descrição |
|---|---|---|
| `npm run dev` | `nodemon src/server.js` | Sobe a API com reload automático. |
| `npm start` | `node src/server.js` | Sobe a API em modo produção. |
| `npm test` | `node --test tests/*.test.js` | Executa os testes automatizados. |
| `npm run migrate` | `prisma migrate deploy` | Aplica migrations pendentes. |

## Testes e integração contínua

O pipeline definido em `.github/workflows/tests.yml` roda no GitHub Actions a cada push/PR para `main`/`dev`:
1. Instala as dependências do backend (`npm ci`).
2. Gera o Prisma Client contra um banco fictício de CI.
3. Executa a suíte de testes (`npm test`).

## Segurança

- Nunca envie `.env`, `node_modules` ou qualquer credencial para o repositório remoto.
- Não altere migrations do Prisma que já foram aplicadas em um banco compartilhado — crie uma nova migration em vez disso.
- Arquivos de comprovantes não são públicos: o acesso ocorre apenas pela rota autenticada `/api/comprovantes/:id/arquivo`.
- A API aplica rate limiting geral (300 requisições/15 min) e um limite mais restrito para operações de comprovantes (30 requisições/15 min).
- CORS restrito por allowlist de origens (`FRONTEND_URL`), com liberação automática apenas para `localhost`/`127.0.0.1` em desenvolvimento.