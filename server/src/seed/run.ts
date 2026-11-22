import '../lib/config.js';
import { prisma } from '../lib/prisma.js';
import { seedIfEmpty } from './seed.js';
import { applyContentUpdates } from './updates.js';

seedIfEmpty(true)
  .then(() => applyContentUpdates())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
