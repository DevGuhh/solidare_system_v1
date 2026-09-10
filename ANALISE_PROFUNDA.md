# Análise profunda — Solidare System v1

Data da revisão: 2026-09-10

## Correções aplicadas

1. **Saldo de cestas concorrente**
   - O saldo era atualizado no padrão ler/calcular/gravar, sujeito a perda de atualização.
   - Entradas e estornos agora usam `increment` atômico.
   - Débitos usam `updateMany` com condição `saldoAtual >= quantidade` e `decrement` atômico.
   - Isso impede saldo negativo e consumo concorrente do mesmo estoque.

2. **Cancelamento concorrente de doação**
   - Duas requisições simultâneas podiam estornar a mesma doação mais de uma vez.
   - O cancelamento agora usa `updateMany` condicionado a `deletedAt: null`.
   - Só a primeira requisição efetiva realiza o estorno; a seguinte recebe conflito 409.

3. **Doação mensal duplicada por concorrência**
   - A checagem de “já recebeu no mês” ocorria fora da seção serializada.
   - Foi adicionado `SELECT ... FOR UPDATE` no beneficiário dentro da transação para serializar registros do mesmo beneficiário.
   - A proteção vale tanto para doação manual quanto para entrega via QR Code.

4. **Servidor iniciando antes do banco**
   - `connectDB()` era disparado sem `await` e o Express podia começar a aceitar requisições antes da conexão estar pronta.
   - O servidor agora aguarda `connectDB()` antes de abrir a porta HTTP.

5. **QR Code para beneficiário inativo**
   - A criação de QR Code não exigia `ativo: true`.
   - Beneficiários inativos não podem mais receber um QR novo.

6. **Normalização do código do QR Code**
   - Geração de imagem não normalizava o código para maiúsculas, embora outras rotas normalizassem.
   - O comportamento foi uniformizado.

7. **Redirecionamento de senha provisória**
   - O frontend usava caminho absoluto `/frontend/views/alterarSenha.html`, que pode quebrar quando `frontend/` é a raiz publicada.
   - O redirecionamento agora é relativo à página atual em `views/`.

8. **Link de redefinição de senha**
   - `FRONTEND_URL` é aceito pelo servidor como lista separada por vírgulas para CORS, mas o reset usava a string inteira como URL.
   - O reset agora escolhe a primeira URL configurada e constrói o endereço com `URL`.

9. **Log de configuração R2**
   - O backend imprimia endpoint, bucket e parte do access key do R2 no log.
   - Esse log foi removido.

10. **Arquivos sensíveis no pacote**
    - Havia 19 PDFs em `backend/uploads/comprovantes/` (~4,31 MB).
    - Eles foram removidos da cópia final. `backend/.gitignore` já ignora `uploads/`.

11. **Testes dependiam de DATABASE_URL real**
    - `npm test` falhava se `DATABASE_URL` não estivesse definido, mesmo sem acessar o banco.
    - Foi criado `tests/setup.js` com configuração local de teste e o script de testes foi ajustado.

12. **Cobertura de saldo**
    - Foram adicionados testes para débito, saldo insuficiente e estorno.
    - Resultado final: 14/14 testes passando.

## Problemas encontrados que não foram reativados

### Rotas antigas de edição de doação

O frontend ainda contém funções para:

- `PUT /doacoes/:id`
- `PATCH /doacoes/:id/comprovante`

Os controllers correspondentes também permanecem no backend, mas as rotas não estão registradas. Ao mesmo tempo, a interface atual removeu os botões de edição e declara que doações concluídas são imutáveis, corrigidas por cancelamento/estorno. Por isso, essas rotas não foram reativadas; reativá-las contrariaria a regra atual de auditoria. Recomenda-se remover o código morto em uma refatoração futura.

## Pontos de atenção restantes

- O logout remove o JWT do navegador, mas não revoga um token já emitido no servidor. Isso é aceitável para JWT stateless, porém tokens roubados seguem válidos até expirar. Para maior segurança, use expiração curta + refresh token ou lista de revogação.
- A política de senha ainda exige apenas 6 caracteres em alteração/reset. Funciona, mas pode ser fortalecida.
- A camada de comprovantes depende de R2 já no carregamento do módulo. Se R2 for obrigatório no ambiente de produção, está correto; se a aplicação devesse iniciar sem R2, vale tornar essa configuração lazy.
- `prisma validate` não pôde ser concluído neste ambiente porque Prisma 7 tentou baixar o `schema-engine` em `binaries.prisma.sh`, e o ambiente de análise não possui acesso externo.
- A proteção de concorrência de doação usa `SELECT ... FOR UPDATE`, específico do PostgreSQL. O projeto já usa PostgreSQL no Prisma, portanto isso é compatível com a stack atual.

## Validações executadas

- `npm test`: 14/14 testes aprovados.
- `node --check` em backend, seed/scripts Prisma e frontend: sem erros de sintaxe.
- Verificação de `src`/`href` locais nos HTMLs: 0 referências inexistentes.
- `.env`, `.git`, `node_modules` e `backend/uploads` removidos do pacote final.
