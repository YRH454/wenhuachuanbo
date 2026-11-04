// Keep the server's exhibit identity index in sync with the museum's artwork records.
// This is an identity index, not a collection of independently verified facts.
import { readFile, writeFile } from 'node:fs/promises';
import { artworks } from '../dist/museum/artworks.mjs';

const target = new URL('../dist/museum/artwork-context.json', import.meta.url);
// The image is a server-side allowlist entry; clients only send an exhibit ID.
const records = artworks.map(({ id, title, image }) => ({ id, title, image }));
if (new Set(records.map(record => record.id)).size !== records.length) {
  throw new Error('Exhibit IDs must be unique.');
}
const output = JSON.stringify({ version: 1, records }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8');
  if (current !== output) throw new Error('Exhibit identity index is out of date. Run node tools/build-museum-context.mjs');
  console.log(`Exhibit identity index is current (${records.length} records).`);
} else {
  await writeFile(target, output, 'utf8');
  console.log(`Updated exhibit identity index (${records.length} records).`);
}
