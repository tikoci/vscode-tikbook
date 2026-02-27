const fs = require('node:fs/promises');
const path = require('node:path');

const outDir = path.resolve(process.cwd(), 'out');
const sourceFile = path.join(outDir, 'extension.js');
const webFile = path.join(outDir, 'extension-web.js');

async function run() {
  await fs.copyFile(sourceFile, webFile);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`build-post-process failed: ${message}\n`);
  process.exit(1);
});
