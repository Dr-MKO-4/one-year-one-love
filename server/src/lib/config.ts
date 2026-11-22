import 'dotenv/config';
import { config as load } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Charge aussi le .env à la racine du monorepo (utile en développement).
const here = path.dirname(fileURLToPath(import.meta.url));
load({ path: path.resolve(here, '../../../.env') });
load({ path: path.resolve(here, '../../.env') });

function required(name: string, fallbackInDev?: string): string {
  const v = process.env[name];
  if (v && v.trim()) return v.trim();
  if (process.env.NODE_ENV !== 'production' && fallbackInDev !== undefined) return fallbackInDev;
  throw new Error(`Variable d'environnement manquante : ${name}`);
}

export const config = {
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET', 'dev-secret-only-for-local-use'),
  pins: {
    miguel: required('MIGUEL_PIN', '2203'),
    adele: required('ADELE_PIN', '1604'),
  },
  /** Durée de validité de la session (jours). */
  sessionDays: Number(process.env.SESSION_DAYS ?? 60),
};

if (config.isProd && config.jwtSecret.length < 24) {
  throw new Error('JWT_SECRET doit contenir au moins 24 caractères en production.');
}
