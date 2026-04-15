const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = `${process.env.DATABASE_URL || ''}`;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function slugify(input) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  // Provincias del Ecuador (24)
  const provinces = [
    'Azuay',
    'Bolívar',
    'Cañar',
    'Carchi',
    'Chimborazo',
    'Cotopaxi',
    'El Oro',
    'Esmeraldas',
    'Galápagos',
    'Guayas',
    'Imbabura',
    'Loja',
    'Los Ríos',
    'Manabí',
    'Morona Santiago',
    'Napo',
    'Orellana',
    'Pastaza',
    'Pichincha',
    'Santa Elena',
    'Santo Domingo de los Tsáchilas',
    'Sucumbíos',
    'Tungurahua',
    'Zamora Chinchipe',
  ];

  for (const name of provinces) {
    await prisma.province.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name) },
    });
  }

  // Cantones (fuente: listas provistas por el usuario en imágenes; La Concordia en Santo Domingo)
  const cantonsByProvince = {
    Azuay: [
      'Cuenca',
      'Girón',
      'Gualaceo',
      'Nabón',
      'Paute',
      'Pucará',
      'San Fernando',
      'Santa Isabel',
      'Sígsig',
      'Oña',
      'Chordeleg',
      'El Pan',
      'Sevilla de Oro',
      'Guachapala',
      'Camilo Ponce Enríquez',
    ],
    'Bolívar': ['Caluma', 'Chillanes', 'Chimbo', 'Echeandía', 'Guaranda', 'Las Naves', 'San Miguel'],
    Cañar: ['Azogues', 'Biblián', 'Cañar', 'Déleg', 'El Tambo', 'La Troncal', 'Suscal'],
    Carchi: ['Bolívar', 'Espejo', 'Mira', 'Montúfar', 'San Pedro de Huaca', 'Tulcán'],
    Chimborazo: ['Alausí', 'Chambo', 'Chunchi', 'Colta', 'Cumandá', 'Guamote', 'Guano', 'Pallatanga', 'Penipe', 'Riobamba'],
    Cotopaxi: ['Latacunga', 'La Maná', 'Pangua', 'Pujilí', 'Salcedo', 'Saquisilí', 'Sigchos'],
    'El Oro': [
      'Arenillas',
      'Atahualpa',
      'Balsas',
      'Chilla',
      'El Guabo',
      'Huaquillas',
      'Las Lajas',
      'Machala',
      'Marcabelí',
      'Pasaje',
      'Piñas',
      'Portovelo',
      'Santa Rosa',
      'Zaruma',
    ],
    Esmeraldas: ['Atacames', 'Eloy Alfaro', 'Esmeraldas', 'Muisne', 'Quinindé', 'Rioverde', 'San Lorenzo'],
    Galápagos: ['Isabela', 'San Cristóbal', 'Santa Cruz'],
    Guayas: [
      'Balao',
      'Balzar',
      'Baquerizo Moreno (Jujan)',
      'Colimes',
      'Coronel Marcelino Maridueña',
      'Daule',
      'Durán',
      'El Empalme',
      'El Triunfo',
      'General Antonio Elizalde (Bucay)',
      'Guayaquil',
      'Isidro Ayora',
      'Lomas de Sargentillo',
      'Milagro',
      'Naranjal',
      'Naranjito',
      'Nobol',
      'Palestina',
      'Pedro Carbo',
      'Playas',
      'Salitre (Urbina Jado)',
      'Samborondón',
      'San Jacinto de Yaguachi',
      'Santa Lucía',
      'Simón Bolívar',
    ],
    Imbabura: ['Antonio Ante', 'Cotacachi', 'Ibarra', 'Otavalo', 'Pimampiro', 'San Miguel de Urcuquí'],
    Loja: [
      'Calvas',
      'Catamayo',
      'Celica',
      'Chaguarpamba',
      'Espíndola',
      'Gonzanamá',
      'Loja',
      'Macará',
      'Olmedo',
      'Paltas',
      'Pindal',
      'Puyango',
      'Quilanga',
      'Saraguro',
      'Sozoranga',
      'Zapotillo',
    ],
    'Los Ríos': [
      'Baba',
      'Babahoyo',
      'Buena Fe',
      'Mocache',
      'Montalvo',
      'Palenque',
      'Puebloviejo',
      'Quevedo',
      'Quinsaloma',
      'Urdaneta',
      'Valencia',
      'Ventanas',
      'Vinces',
    ],
    Manabí: [
      '24 de Mayo',
      'Bolívar',
      'Chone',
      'El Carmen',
      'Flavio Alfaro',
      'Jama',
      'Jaramijó',
      'Jipijapa',
      'Junín',
      'Manta',
      'Montecristi',
      'Olmedo',
      'Paján',
      'Pedernales',
      'Pichincha',
      'Portoviejo',
      'Puerto López',
      'Rocafuerte',
      'San Vicente',
      'Santa Ana',
      'Sucre',
      'Tosagua',
    ],
    'Morona Santiago': [
      'Gualaquiza',
      'Huamboya',
      'Limón Indanza',
      'Logroño',
      'Morona',
      'Pablo Sexto',
      'Palora',
      'San Juan Bosco',
      'Santiago',
      'Sucúa',
      'Taisha',
      'Tiwintza',
    ],
    Napo: ['Archidona', 'Carlos Julio Arosemena Tola', 'El Chaco', 'Quijos', 'Tena'],
    Orellana: ['Aguarico', 'La Joya de los Sachas', 'Loreto', 'Orellana'],
    Pastaza: ['Arajuno', 'Mera', 'Pastaza', 'Santa Clara'],
    Pichincha: [
      'Cayambe',
      'Mejía',
      'Pedro Moncayo',
      'Pedro Vicente Maldonado',
      'Puerto Quito',
      'Quito',
      'Rumiñahui',
      'San Miguel de los Bancos',
    ],
    'Santa Elena': ['La Libertad', 'Salinas', 'Santa Elena'],
    'Santo Domingo de los Tsáchilas': ['La Concordia', 'Santo Domingo'],
    Sucumbíos: ['Cascales', 'Cuyabeno', 'Gonzalo Pizarro', 'Lago Agrio', 'Putumayo', 'Shushufindi', 'Sucumbíos'],
    Tungurahua: [
      'Ambato',
      'Baños de Agua Santa',
      'Cevallos',
      'Mocha',
      'Patate',
      'Quero',
      'San Pedro de Pelileo',
      'Santiago de Píllaro',
      'Tisaleo',
    ],
    'Zamora Chinchipe': [
      'Centinela del Cóndor',
      'Chinchipe',
      'El Pangui',
      'Nangaritza',
      'Palanda',
      'Paquisha',
      'Yacuambi',
      'Yantzaza',
      'Zamora',
    ],
  };

  for (const [provinceName, cantons] of Object.entries(cantonsByProvince)) {
    const province = await prisma.province.findUnique({ where: { name: provinceName } });
    if (!province) {
      throw new Error(`Province not found for canton seeding: ${provinceName}`);
    }

    for (const cantonName of cantons) {
      const slug = slugify(cantonName);
      await prisma.canton.upsert({
        where: { provinceId_slug: { provinceId: province.id, slug } },
        update: { name: cantonName },
        create: { name: cantonName, slug, provinceId: province.id },
      });
    }
  }

  // Dev Super Admin
  const superAdminEmail = 'admin@gmail.com';
  const superAdminId = '11111111-1111-1111-1111-111111111111';
  const password = '123456';
  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.userProfile.upsert({
    where: { email: superAdminEmail },
    update: {
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
    },
    create: {
      id: superAdminId,
      email: superAdminEmail,
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
      displayName: 'Super Admin',
    },
  });

  const user = await prisma.userProfile.findUnique({ where: { email: superAdminEmail } });
  if (!user) throw new Error('Super admin user missing after upsert');

  await prisma.localCredential.upsert({
    where: { userId: user.id },
    update: { passwordHash },
    create: { userId: user.id, passwordHash },
  });

  // Content pages (editable by SUPER_ADMIN)
  await prisma.contentPage.upsert({
    where: { slug: 'home' },
    update: {},
    create: {
      slug: 'home',
      title: 'Pravels',
      body: 'Contenido pendiente. El super admin debe completar esta informacion desde el panel.',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
