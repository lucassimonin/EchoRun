/**
 * ============================================================================
 * Génération des icônes • `npm run icons`
 * ============================================================================
 *
 * Source unique : src/app/icon.svg (+ scripts/icon-maskable.svg pour la
 * variante Android). Tout le reste est dérivé, donc jamais édité à la main.
 *
 * Pourquoi un script plutôt que des PNG commités une fois pour toutes : le
 * jour où la marque bouge d'un pixel, on rejoue la commande au lieu de
 * ré-exporter six fichiers à la main et d'en oublier un.
 *
 * `sharp` est en devDependency : il ne part jamais dans le bundle.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE = join(root, 'src/app/icon.svg');
const SOURCE_MASKABLE = join(root, 'scripts/icon-maskable.svg');

/** Cibles PNG : [svg source, chemin de sortie, taille]. */
const TARGETS = [
  [SOURCE, 'src/app/apple-icon.png', 180], // touch icon iOS, convention Next.js
  [SOURCE, 'public/icons/icon-192.png', 192], // manifeste PWA
  [SOURCE, 'public/icons/icon-512.png', 512], // manifeste PWA + splash Android
  [SOURCE_MASKABLE, 'public/icons/maskable-512.png', 512],
];

/** Tailles embarquées dans favicon.ico, pour les navigateurs sans support SVG. */
const ICO_SIZES = [16, 32, 48];

async function renderPng(svgPath, size) {
  const svg = await readFile(svgPath);
  // `density` élevée : librsvg rastérise à cette résolution avant redimension,
  // sinon les arcs fins bavent aux petites tailles.
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

/**
 * Assemble un .ico à partir de PNG.
 *
 * sharp ne sait pas écrire l'ICO, et tirer une dépendance de plus pour un
 * en-tête de 6 octets serait disproportionné. Le format accepte des PNG
 * embarqués depuis Windows Vista : tous les navigateurs actuels le lisent.
 *
 * Structure : ICONDIR (6 o) + N × ICONDIRENTRY (16 o) + les blobs PNG.
 */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type 1 = icône
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 signifie 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette : sans objet en 32 bits
    entry.writeUInt8(0, 3); // réservé
    entry.writeUInt16LE(1, 4); // plans
    entry.writeUInt16LE(32, 6); // bits par pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  for (const [src, out, size] of TARGETS) {
    const target = join(root, out);
    await mkdir(dirname(target), { recursive: true });
    const png = await renderPng(src, size);
    await writeFile(target, png);
    console.log(`  ${out.padEnd(34)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} ko`);
  }

  const icoImages = [];
  for (const size of ICO_SIZES) {
    icoImages.push({ size, data: await renderPng(SOURCE, size) });
  }
  const ico = buildIco(icoImages);
  await writeFile(join(root, 'src/app/favicon.ico'), ico);
  console.log(
    `  src/app/favicon.ico                ${ICO_SIZES.join('/')}    ${(ico.length / 1024).toFixed(1)} ko`,
  );
}

await main();
