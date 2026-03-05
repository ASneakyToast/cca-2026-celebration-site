import { readFileSync, writeFileSync } from 'fs';

const rotations: Record<string, number> = {
  'arrow-04': 225,
  'arrow-08': 270,
  'arrow-10': 225,
};

const dir = 'public/images/scanned-graphics/arrows';

for (const [name, angle] of Object.entries(rotations)) {
  const filePath = `${dir}/${name}.svg`;
  let svg = readFileSync(filePath, 'utf-8');

  // Parse viewBox
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  if (!vbMatch) { console.log(`${name}: no viewBox found`); continue; }
  const [vx, vy, vw, vh] = vbMatch[1].split(/\s+/).map(Number);

  const cx = vx + vw / 2;
  const cy = vy + vh / 2;

  // Compute new bounding box from rotated corners
  const rad = (angle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const corners = [
    [vx, vy], [vx + vw, vy], [vx + vw, vy + vh], [vx, vy + vh],
  ];

  const rotated = corners.map(([x, y]) => [
    cx + (x - cx) * cosA - (y - cy) * sinA,
    cy + (x - cx) * sinA + (y - cy) * cosA,
  ]);

  const minX = Math.min(...rotated.map((p) => p[0]));
  const minY = Math.min(...rotated.map((p) => p[1]));
  const maxX = Math.max(...rotated.map((p) => p[0]));
  const maxY = Math.max(...rotated.map((p) => p[1]));

  const newVW = +(maxX - minX).toFixed(3);
  const newVH = +(maxY - minY).toFixed(3);
  const newVX = +minX.toFixed(3);
  const newVY = +minY.toFixed(3);

  // Update viewBox and dimensions
  svg = svg.replace(/viewBox="[^"]+"/,  `viewBox="${newVX} ${newVY} ${newVW} ${newVH}"`);
  svg = svg.replace(/width="[^"]+"/,    `width="${newVW}"`);
  svg = svg.replace(/height="[^"]+"/,   `height="${newVH}"`);

  // Wrap content in rotated group
  svg = svg.replace(
    /(<svg[^>]*>)([\s\S]*)(<\/svg>)/,
    (_, open, content, close) =>
      `${open}<g transform="rotate(${angle}, ${cx.toFixed(3)}, ${cy.toFixed(3)})">${content}</g>${close}`,
  );

  writeFileSync(filePath, svg);
  console.log(`${name}: rotated ${angle}° around (${cx.toFixed(1)}, ${cy.toFixed(1)})`);
}

console.log('Done!');
