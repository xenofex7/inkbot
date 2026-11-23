import { bounds, type Point, type Polyline } from '../geometry/types';
import { fonts, layoutText } from '../text/layout';
import { CHARSET, PAD } from './model';

export const SHEET = { width: 297, height: 210 };

const COLUMNS = 12;
const ROWS = 7;
const GRID = { x: 22, y: 20, width: 253, height: 178 };
const BOX = 17;
const LABEL_SIZE = 3;
const TICK = 1.5;
const MARKER_RADIUS = 3.5;
const MARKER_INSET = 9;

export type Cell = { char: string; x: number; y: number; size: number };

export const MARKERS: Point[] = [
	{ x: MARKER_INSET, y: MARKER_INSET },
	{ x: SHEET.width - MARKER_INSET, y: MARKER_INSET },
	{ x: SHEET.width - MARKER_INSET, y: SHEET.height - MARKER_INSET },
	{ x: MARKER_INSET, y: SHEET.height - MARKER_INSET }
];

export function templateCells(): Cell[] {
	const cellWidth = GRID.width / COLUMNS;
	const cellHeight = GRID.height / ROWS;
	return CHARSET.map((char, index) => {
		const column = index % COLUMNS;
		const row = Math.floor(index / COLUMNS);
		return {
			char,
			x: GRID.x + column * cellWidth + (cellWidth - BOX) / 2,
			y: GRID.y + row * cellHeight + cellHeight - BOX - 1,
			size: BOX
		};
	});
}

const labelFont = fonts.find((font) => font.id === 'hershey-sans') ?? fonts[0];

function label(text: string, centerX: number, bottom: number, size = LABEL_SIZE): Polyline[] {
	const lines = layoutText(text, {
		font: labelFont,
		size,
		lineHeight: 1,
		align: 'left',
		width: 1000
	});
	const box = bounds(lines);
	if (!box) return [];
	const dx = centerX - (box.minX + box.maxX) / 2;
	const dy = bottom - box.maxY;
	return lines.map((line) => line.map((p) => ({ x: p.x + dx, y: p.y + dy })));
}

function circle(center: Point, radius: number): Polyline {
	return Array.from({ length: 33 }, (_, i) => {
		const angle = (i / 32) * Math.PI * 2;
		return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
	});
}

function marker(center: Point, number: number): Polyline[] {
	const r = MARKER_RADIUS;
	const toward = center.x < SHEET.width / 2 ? 1 : -1;
	return [
		circle(center, r),
		circle(center, r / 3),
		[
			{ x: center.x - r * 1.6, y: center.y },
			{ x: center.x + r * 1.6, y: center.y }
		],
		[
			{ x: center.x, y: center.y - r * 1.6 },
			{ x: center.x, y: center.y + r * 1.6 }
		],
		...label(String(number), center.x + toward * (r + 4), center.y + 2, 4)
	];
}

export function templatePolylines(title: string): Polyline[] {
	const lines: Polyline[] = MARKERS.flatMap((center, index) => marker(center, index + 1));
	lines.push(...label(title, SHEET.width / 2, 12, 4));
	for (const cell of templateCells()) {
		const { x, y, size } = cell;
		lines.push([
			{ x, y },
			{ x: x + size, y },
			{ x: x + size, y: y + size },
			{ x, y: y + size },
			{ x, y }
		]);
		for (const level of [PAD.ascent, PAD.ascent - PAD.xHeight]) {
			const ty = y + (level / PAD.size) * size;
			lines.push(
				[
					{ x: x - TICK, y: ty },
					{ x, y: ty }
				],
				[
					{ x: x + size, y: ty },
					{ x: x + size + TICK, y: ty }
				]
			);
		}
		lines.push(...label(cell.char, x + size / 2, y - 0.8));
	}
	return lines;
}
