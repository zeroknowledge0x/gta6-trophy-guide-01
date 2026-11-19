// Leonida Legends entry point (Node 22, standard library only).
// This hands the static guide in: everything a visitor needs is under app/, and the four
// judged renders are under screenshots/. No build step, no dependencies, no network access.
// The dossier is produced by the vendored, byte-for-byte scoring library, so this program's
// output matches the scorer's own copy. Run: MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

// Copy the two directories the bounty scores, preserving their internal structure.
mkdirSync(outputDirectory, { recursive: true });
cpSync(join(repositoryRoot, 'app'), join(outputDirectory, 'app'), { recursive: true, force: true });

const sourceShots = join(repositoryRoot, 'screenshots');
const outputShots = join(outputDirectory, 'screenshots');
mkdirSync(outputShots, { recursive: true });
if (existsSync(sourceShots)) {
  cpSync(sourceShots, outputShots, { recursive: true, force: true });
}

// Only text_max_bytes changes the dossier's bytes; the other caps mirror the gate so a local
// run fails exactly where the judge's run would.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

const dossierPath = join(outputDirectory, 'dossier.json');
const dossierBytes = buildDossier(outputDirectory, caps);
writeFileSync(dossierPath, dossierBytes);

console.log(`Dossier: ${dossierPath}`);
console.log(`Size: ${statSync(dossierPath).size} bytes`);
