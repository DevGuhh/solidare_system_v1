import { PrismaClient, RoleUsuario, TipoInstituicao, StatusInstituicao, TipoBeneficio } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Gera um CPF fake (formato numérico, só para teste/seed)
function gerarCpfFake() {
  const n = () => Math.floor(Math.random() * 9);
  return Array.from({ length: 11 }, n).join('');
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpa dados existentes (ordem importa por causa das FKs)
  await prisma.doacao.deleteMany();
  await prisma.beneficiario.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.instituicaoParceira.deleteMany();

  // 1. Usuário ADMIN
  const senhaHashAdmin = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuario.create({
    data: {
      nome: 'Administrador Geral',
      email: 'admin@doacoes.com',
      senhaHash: senhaHashAdmin,
      role: RoleUsuario.ADMIN,
    },
  });
  console.log(`✅ Admin criado: ${admin.email}`);

  // 2. Instituições parceiras
  const tipos = [
    TipoInstituicao.IGREJA,
    TipoInstituicao.ASSOCIACAO,
    TipoInstituicao.ONG,
    TipoInstituicao.OUTRO,
  ];

  const instituicoes = [];
  const QTD_INSTITUICOES = 8;

  for (let i = 0; i < QTD_INSTITUICOES; i++) {
    const instituicao = await prisma.instituicaoParceira.create({
      data: {
        nome: faker.company.name(),
        tipo: faker.helpers.arrayElement(tipos),
        responsavel: faker.person.fullName(),
        telefone: faker.phone.number(),
        endereco: faker.location.streetAddress(),
        cidade: faker.location.city(),
        statusOk: faker.helpers.arrayElement([StatusInstituicao.OK, StatusInstituicao.PENDENTE]),
        email: faker.internet.email().toLowerCase(),
      },
    });
    instituicoes.push(instituicao);

    // Cria um usuário vinculado a cada instituição
    const senhaHash = await bcrypt.hash('123456', 10);
    await prisma.usuario.create({
      data: {
        nome: instituicao.responsavel,
        email: `contato.${instituicao.id}@doacoes.com`,
        senhaHash,
        role: RoleUsuario.INSTITUICAO,
        instituicaoId: instituicao.id,
      },
    });
  }
  console.log(`✅ ${instituicoes.length} instituições criadas`);

  // 3. Beneficiários (distribuídos entre as instituições, em lote)
  const tiposBeneficio = [TipoBeneficio.CESTA, TipoBeneficio.GRANEL, TipoBeneficio.AMBOS];
  const cpfsUsados = new Set();

  function gerarCpfUnico() {
    let cpf = gerarCpfFake();
    while (cpfsUsados.has(cpf)) cpf = gerarCpfFake();
    cpfsUsados.add(cpf);
    return cpf;
  }

  let totalBeneficiarios = 0;

  for (const instituicao of instituicoes) {
    const qtd = faker.number.int({ min: 50, max: 150 });

    const dadosBeneficiarios = Array.from({ length: qtd }, () => ({
      nomeCompleto: faker.person.fullName(),
      cpf: gerarCpfUnico(),
      dataNascimento: faker.date.birthdate({ min: 18, max: 85, mode: 'age' }),
      logradouro: faker.location.street(),
      numero: faker.location.buildingNumber(),
      complemento: faker.datatype.boolean() ? faker.location.secondaryAddress() : null,
      cep: faker.location.zipCode('#####-###'),
      regiao: faker.helpers.arrayElement(['Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste', 'Centro']),
      cidade: instituicao.cidade,
      uf: faker.location.state({ abbreviated: true }),
      telefonePrincipal: faker.phone.number(),
      telefoneSecundario: faker.datatype.boolean() ? faker.phone.number() : null,
      email: faker.datatype.boolean() ? faker.internet.email().toLowerCase() : null,
      instituicaoId: instituicao.id,
      tipoBeneficio: faker.helpers.arrayElement(tiposBeneficio),
      situacaoSocioeconomica: faker.helpers.arrayElement([
        'Baixa renda',
        'Desempregado(a)',
        'Família numerosa',
        'Idoso em vulnerabilidade',
        'Beneficiário de programa social',
      ]),
      observacoes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
    }));

    await prisma.beneficiario.createMany({
      data: dadosBeneficiarios,
      skipDuplicates: true,
    });

    totalBeneficiarios += dadosBeneficiarios.length;
  }

  console.log(`✅ ${totalBeneficiarios} beneficiários criados`);

  console.log('🌱 Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao rodar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });