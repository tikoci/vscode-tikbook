import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const schemaFiles = [
  'routeros-app-yaml-schema.editor.json',
  'routeros-app-yaml-store-schema.editor.json',
  'routeros-app-yaml-schema.latest.json',
  'routeros-app-yaml-store-schema.latest.json',
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = process.env.RESTRAML_DOCS ?? resolve(repoRoot, '..', 'restraml', 'docs');
const destinationDir = resolve(repoRoot, 'resources', 'schemas');

await mkdir(destinationDir, { recursive: true });

for (const schemaFile of schemaFiles) {
  await copyFile(resolve(sourceDir, schemaFile), resolve(destinationDir, schemaFile));
}

console.log('Synced RouterOS /app YAML schemas from ' + sourceDir + ' to ' + destinationDir);
