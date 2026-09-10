// Ambiente mínimo para testes unitários que importam módulos configurados com Prisma.
// Nenhuma conexão é aberta por este arquivo.
process.env.NODE_ENV ||= "test";
process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/solidare_test";
process.env.JWT_SECRET ||= "test-only-secret-not-for-production";
