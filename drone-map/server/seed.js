import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

async function main() {
  console.log('Seeding demo surveyor user into PostgreSQL BhumiMap database...');
  const email = 'surveyor@bhumap.gov.in';
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Authorized Surveyor',
      email,
      password: hashedPassword,
      surveyorId: 'SUR-MH-2026',
      targetState: 'Maharashtra',
      role: 'SURVEYOR'
    }
  });

  console.log('✅ Demo surveyor user created successfully:');
  console.log({ id: user.id, email: user.email, role: user.role });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
