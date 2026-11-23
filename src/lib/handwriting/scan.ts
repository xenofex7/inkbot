import { homography } from '../geometry/homography';
import type { Point } from '../geometry/types';
import { traceImage, type Gray } from '../image/trace';
import type { Glyph } from '../text/layout';
import { glyphFromStrokes, PAD } from './model';
import { MARKERS, templateCells, type Cell } from './template';

const SAMPLES = 160;
const INSET = 1.2;
const MIN_INK = 0.004;

function sample(gray: Gray, x: number, y: number) {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	if (x0 < 0 || y0 < 0 || x0 + 1 >= gray.width || y0 + 1 >= gray.height) return 255;
	const fx = x - x0;
	const fy = y - y0;
	const at = (dx: number, dy: number) => gray.data[(y0 + dy) * gray.width + x0 + dx];
	const top = at(0, 0) * (1 - fx) + at(1, 0) * fx;
	const bottom = at(0, 1) * (1 - fx) + at(1, 1) * fx;
	return top * (1 - fy) + bottom * fy;
}

function cellImage(gray: Gray, cell: Cell, toImage: (p: Point) => Point): Gray {
	const data = new Uint8ClampedArray(SAMPLES * SAMPLES);
	const span = cell.size - 2 * INSET;
	for (let v = 0; v < SAMPLES; v++) {
		for (let u = 0; u < SAMPLES; u++) {
			const p = toImage({
				x: cell.x + INSET + ((u + 0.5) / SAMPLES) * span,
				y: cell.y + INSET + ((v + 0.5) / SAMPLES) * span
			});
			data[v * SAMPLES + u] = sample(gray, p.x, p.y);
		}
	}
	return { width: SAMPLES, height: SAMPLES, data };
}

function paperLevel(cell: Gray) {
	const sorted = Array.from(cell.data).sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length * 0.9)];
}

function glyphFromCell(cell: Gray, size: number): Glyph | undefined {
	const threshold = paperLevel(cell) * 0.62;
	let ink = 0;
	for (const value of cell.data) if (value < threshold) ink++;
	if (ink / cell.data.length < MIN_INK) return undefined;
	const lines = traceImage(cell, {
		mode: 'lines',
		threshold,
		hatchSpacing: 4,
		simplify: 1,
		minLength: SAMPLES * 0.05
	});
	const span = size - 2 * INSET;
	const toPad = (value: number) => ((INSET + (value / SAMPLES) * span) / size) * PAD.size;
	return glyphFromStrokes(lines.map((line) => line.map((p) => ({ x: toPad(p.x), y: toPad(p.y) }))));
}

export function scanTemplate(gray: Gray, corners: Point[]): Record<string, Glyph> {
	const toImage = homography(MARKERS, corners);
	const glyphs: Record<string, Glyph> = {};
	for (const cell of templateCells()) {
		const glyph = glyphFromCell(cellImage(gray, cell, toImage), cell.size);
		if (glyph) glyphs[cell.char] = glyph;
	}
	return glyphs;
}
