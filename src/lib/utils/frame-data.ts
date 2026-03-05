/**
 * Build-time utility for generating frame clip paths from scanned SVG frames.
 * Extracts the inner edge of each frame border path and produces a clip-path
 * polygon so photos can be clipped to appear "inside" the hand-drawn frame.
 */
import fs from "node:fs";
import path from "node:path";
import SvgPath from "svgpath";

// Frames where turnaround split fails — use ray-casting override
const overrideIds = new Set(["frame-05", "frame-09", "frame-14", "frame-19"]);

export interface FrameData {
  id: string;
  viewBox: string;
  minX: number;
  minY: number;
  width: number;
  height: number;
  /** SVG <path> elements for the visible frame border (with fill:currentColor) */
  pathsVisual: string;
  /** SVG path `d` attribute for the inner-edge clip path */
  clipPathD: string;
}

// ---------------------------------------------------------------------------
// Path flattening
// ---------------------------------------------------------------------------

function flattenPath(d: string, matrix: number[], samplesPerCurve = 12) {
  const svgpath = SvgPath(d).matrix(matrix).abs().unshort();
  const points: number[][] = [];
  let curX = 0, curY = 0;
  svgpath.iterate((seg: any) => {
    const cmd = seg[0];
    if (cmd === "M") { curX = seg[1]; curY = seg[2]; points.push([curX, curY]); }
    else if (cmd === "L") { curX = seg[1]; curY = seg[2]; points.push([curX, curY]); }
    else if (cmd === "H") { curX = seg[1]; points.push([curX, curY]); }
    else if (cmd === "V") { curY = seg[1]; points.push([curX, curY]); }
    else if (cmd === "C") {
      const [, x1, y1, x2, y2, x3, y3] = seg;
      for (let i = 1; i <= samplesPerCurve; i++) {
        const t = i / samplesPerCurve, mt = 1 - t;
        points.push([
          mt*mt*mt*curX + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3,
          mt*mt*mt*curY + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3,
        ]);
      }
      curX = x3; curY = y3;
    }
  });
  return points;
}

// ---------------------------------------------------------------------------
// Splitting & inner-edge extraction
// ---------------------------------------------------------------------------

function twoTurnaroundSplit(points: number[][], axis: number): [number[][], number[][]] {
  let minIdx = 0, maxIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][axis] < points[minIdx][axis]) minIdx = i;
    if (points[i][axis] > points[maxIdx][axis]) maxIdx = i;
  }
  let startIdx = minIdx, endIdx = maxIdx;
  if (startIdx > endIdx) { const tmp = startIdx; startIdx = endIdx; endIdx = tmp; }
  const half1 = points.slice(startIdx, endIdx + 1);
  const half2 = [...points.slice(endIdx), ...points.slice(0, startIdx + 1)];
  return [half1, half2];
}

function extractInnerByDistance(points: number[][], centerX: number, centerY: number): number[][] {
  const n = points.length;
  const dists = points.map(p => Math.hypot(p[0] - centerX, p[1] - centerY));
  const sortedDists = [...dists].sort((a, b) => a - b);
  const threshold = sortedDists[Math.floor(n / 2)];

  let bestStart = 0, bestLen = 0;
  for (let start = 0; start < n; start++) {
    if (dists[start] >= threshold) continue;
    if (bestStart > 0 && start >= bestStart && start < bestStart + bestLen) continue;
    let len = 0;
    for (let j = 0; j < n; j++) {
      if (dists[(start + j) % n] < threshold) len++;
      else break;
    }
    if (len > bestLen) { bestLen = len; bestStart = start; }
  }

  if (bestLen === 0) return points;
  const result: number[][] = [];
  for (let i = 0; i < bestLen; i++) {
    result.push(points[(bestStart + i) % n]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Ray casting (for override frames)
// ---------------------------------------------------------------------------

function raySegIntersect(ox: number, oy: number, dx: number, dy: number,
  x1: number, y1: number, x2: number, y2: number) {
  const sx = x2 - x1, sy = y2 - y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((x1 - ox) * sy - (y1 - oy) * sx) / denom;
  const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom;
  if (t > 0.1 && u >= 0 && u <= 1) {
    return { dist: t, point: [ox + dx * t, oy + dy * t] as number[] };
  }
  return null;
}

function rayRectIntersect(ox: number, oy: number, dx: number, dy: number,
  x0: number, y0: number, w: number, h: number): number[] | null {
  const edges: [number, number, number, number][] = [
    [x0, y0, x0 + w, y0], [x0 + w, y0, x0 + w, y0 + h],
    [x0 + w, y0 + h, x0, y0 + h], [x0, y0 + h, x0, y0],
  ];
  let closest = Infinity, hit: number[] | null = null;
  for (const [x1, y1, x2, y2] of edges) {
    const r = raySegIntersect(ox, oy, dx, dy, x1, y1, x2, y2);
    if (r && r.dist < closest) { closest = r.dist; hit = r.point; }
  }
  return hit;
}

function rayCastClipPath(svg: string, centerX: number, centerY: number,
  minX: number, minY: number, frameWidth: number, frameHeight: number): string {
  const pathRegex = /<path\s+d="([^"]+)"[^>]*transform="matrix\(([^)]+)\)"/g;
  const allPaths: number[][][] = [];
  let match;
  while ((match = pathRegex.exec(svg)) !== null) {
    const [, d, matrixStr] = match;
    const matrix = matrixStr.split(/[\s,]+/).map(Number);
    allPaths.push(flattenPath(d, matrix));
  }
  if (allPaths.length === 0) return "";

  const numRays = 720;
  const clipPoints: number[][] = [];
  for (let i = 0; i < numRays; i++) {
    const angle = (2 * Math.PI * i) / numRays;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let closest = Infinity;
    let hit: number[] | null = null;
    for (const pts of allPaths) {
      for (let j = 0; j < pts.length - 1; j++) {
        const r = raySegIntersect(centerX, centerY, dx, dy,
          pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
        if (r && r.dist < closest) { closest = r.dist; hit = r.point; }
      }
    }
    if (!hit) {
      hit = rayRectIntersect(centerX, centerY, dx, dy, minX, minY, frameWidth, frameHeight);
    }
    if (hit) clipPoints.push(hit);
  }

  if (clipPoints.length === 0) return "";
  const r = (n: number) => Math.round(n * 10) / 10;
  let d = `M${r(clipPoints[0][0])} ${r(clipPoints[0][1])}`;
  for (let i = 1; i < clipPoints.length; i++) {
    d += ` L${r(clipPoints[i][0])} ${r(clipPoints[i][1])}`;
  }
  return d + " Z";
}

// ---------------------------------------------------------------------------
// Turnaround-split clip path (standard approach)
// ---------------------------------------------------------------------------

type SideInfo = { position: string; innerLeg: number[][]; synthesized?: boolean };

function generateClipPath(svg: string, centerX: number, centerY: number, frameWidth: number, frameHeight: number) {
  const pathRegex = /<path\s+d="([^"]+)"[^>]*transform="matrix\(([^)]+)\)"/g;
  const sides: SideInfo[] = [];
  let match;

  while ((match = pathRegex.exec(svg)) !== null) {
    const [, d, matrixStr] = match;
    const matrix = matrixStr.split(/[\s,]+/).map(Number);
    const points = flattenPath(d, matrix);
    if (points.length < 4) continue;

    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const bboxMinX = Math.min(...xs), bboxMaxX = Math.max(...xs);
    const bboxMinY = Math.min(...ys), bboxMaxY = Math.max(...ys);
    const bboxW = bboxMaxX - bboxMinX, bboxH = bboxMaxY - bboxMinY;

    const aspectRatio = bboxW / bboxH;
    let bestInnerLeg: number[][] | null = null;

    if (aspectRatio > 1.5 || aspectRatio < 1 / 1.5) {
      const axis = aspectRatio > 1.5 ? 0 : 1;
      const perpAxis = 1 - axis;
      const centerPerp = perpAxis === 0 ? centerX : centerY;
      const [half1, half2] = twoTurnaroundSplit(points, axis);
      if (half1.length >= 2 && half2.length >= 2) {
        const avg1 = half1.reduce((s, p) => s + p[perpAxis], 0) / half1.length;
        const avg2 = half2.reduce((s, p) => s + p[perpAxis], 0) / half2.length;
        const dist1 = Math.abs(avg1 - centerPerp);
        const dist2 = Math.abs(avg2 - centerPerp);
        bestInnerLeg = dist1 < dist2 ? [...half1] : [...half2];
      }
    } else {
      bestInnerLeg = extractInnerByDistance(points, centerX, centerY);
    }

    if (!bestInnerLeg || bestInnerLeg.length < 2) continue;

    const spanX = bboxW / frameWidth;
    const spanY = bboxH / frameHeight;
    const legXs = bestInnerLeg.map(p => p[0]);
    const legYs = bestInnerLeg.map(p => p[1]);
    const legCX = legXs.reduce((a, b) => a + b, 0) / legXs.length;
    const legCY = legYs.reduce((a, b) => a + b, 0) / legYs.length;

    let position: string;
    if (spanX > 0.5 && spanY > 0.5) {
      const dx = legCX - centerX;
      const dy = legCY - centerY;
      if (Math.abs(dx) > Math.abs(dy)) {
        position = dx < 0 ? "left" : "right";
      } else {
        position = dy < 0 ? "top" : "bottom";
      }
    } else if (bboxH > bboxW) {
      position = legCX < centerX ? "left" : "right";
    } else {
      position = legCY < centerY ? "top" : "bottom";
    }

    sides.push({ position, innerLeg: bestInnerLeg });
  }

  const byPos: Record<string, SideInfo> = {};
  for (const s of sides) {
    if (!byPos[s.position] || s.innerLeg.length > byPos[s.position].innerLeg.length) {
      byPos[s.position] = s;
    }
  }

  const allPositions = ["top", "right", "bottom", "left"] as const;
  const missing = allPositions.filter(p => !byPos[p]);

  if (missing.length === 1) {
    const missingPos = missing[0];
    const cwOrder = ["top", "right", "bottom", "left"];
    const missingIdx = cwOrder.indexOf(missingPos);
    const prevPos = cwOrder[(missingIdx + 3) % 4];
    const nextPos = cwOrder[(missingIdx + 1) % 4];

    const getOrientedLeg = (pos: string) => {
      const orderEntry = ([
        ["top", 0, true], ["right", 1, true], ["bottom", 0, false], ["left", 1, false],
      ] as const).find(([p]) => p === pos)!;
      const [, axis, ascending] = orderEntry;
      const pts = [...byPos[pos].innerLeg];
      const first = pts[0][axis], last = pts[pts.length - 1][axis];
      if (ascending ? first > last : first < last) pts.reverse();
      return pts;
    };

    if (byPos[prevPos] && byPos[nextPos]) {
      const prevLeg = getOrientedLeg(prevPos);
      const nextLeg = getOrientedLeg(nextPos);
      byPos[missingPos] = {
        position: missingPos,
        innerLeg: [prevLeg[prevLeg.length - 1], nextLeg[0]],
        synthesized: true,
      };
    }
  }

  const orderedPoints: number[][] = [];
  for (const [pos, axis, ascending] of [
    ["top", 0, true], ["right", 1, true], ["bottom", 0, false], ["left", 1, false],
  ] as const) {
    if (!byPos[pos]) continue;
    const pts = [...byPos[pos].innerLeg];
    const first = pts[0][axis], last = pts[pts.length - 1][axis];
    if (ascending ? first > last : first < last) pts.reverse();
    orderedPoints.push(...pts);
  }

  if (orderedPoints.length === 0) return "";
  const r = (n: number) => Math.round(n * 10) / 10;
  let d = `M${r(orderedPoints[0][0])} ${r(orderedPoints[0][1])}`;
  for (let i = 1; i < orderedPoints.length; i++) {
    d += ` L${r(orderedPoints[i][0])} ${r(orderedPoints[i][1])}`;
  }
  return d + " Z";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a frame SVG by ID and compute its clip path data.
 * Runs at build time (reads from filesystem).
 */
export function getFrameData(frameId: string): FrameData {
  const framesDir = path.resolve("public/images/scanned-graphics/frames");
  const svg = fs.readFileSync(path.join(framesDir, `${frameId}.svg`), "utf-8");
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = vbMatch ? vbMatch[1] : "0 0 100 100";
  const [minX, minY, width, height] = viewBox.split(/\s+/).map(Number);

  const pathMatches = svg.match(/<path[^>]*\/>/g) || [];
  const pathsVisual = pathMatches
    .map((p) => p.replace(/fill:#231f20/g, "fill:currentColor"))
    .join("\n");

  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  let clipPathD: string;
  if (overrideIds.has(frameId)) {
    clipPathD = rayCastClipPath(svg, centerX, centerY, minX, minY, width, height);
  } else {
    clipPathD = generateClipPath(svg, centerX, centerY, width, height);
  }

  return { id: frameId, viewBox, minX, minY, width, height, pathsVisual, clipPathD };
}
