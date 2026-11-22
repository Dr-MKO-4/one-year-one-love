import '../lib/config.js';
import { prisma } from '../lib/prisma.js';
import { seedIfEmpty } from './seed.js';

seedIfEmpty(true)
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
