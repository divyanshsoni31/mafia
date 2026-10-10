// Optional drop-in artwork: put images in src/assets/art/ named e.g. `mafia.png`, `night.jpg`, `graveyard.webp`.
// Vite picks them up at build time; anything missing falls back to the built-in SVG art.
const files = import.meta.glob('./assets/art/*.{png,jpg,jpeg,webp,avif,gif}', { eager: true, import: 'default' });

const byName = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase(), url]),
);

export const artFor = (name) => byName[name.toLowerCase().replace(/\s+/g, '-')] ?? null;
