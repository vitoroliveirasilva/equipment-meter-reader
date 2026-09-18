import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const equipments = [
  { code: 'EMP-001', name: 'Escavadeira hidráulica' },
  { code: 'EMP-002', name: 'Empilhadeira' },
  { code: 'EMP-003', name: 'Caminhão de serviço' },
];

try {
  for (const equipment of equipments) {
    await prisma.equipment.upsert({
      where: { code: equipment.code },
      update: { name: equipment.name },
      create: equipment,
    });
  }

  console.log(`Seed completed: ${equipments.length} equipments available.`);
} finally {
  await prisma.$disconnect();
}
