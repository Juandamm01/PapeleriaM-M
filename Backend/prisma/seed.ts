import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD deben estar configurados.');
  }

  try {
    const passwordHash = await argon2.hash(password);
    await prisma.admin.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
    });
  } finally {
    await prisma.$disconnect();
  }
}

void seedAdmin();
