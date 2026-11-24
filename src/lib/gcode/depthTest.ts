import { bounds, translate, type Polyline } from '../geometry/types';
import type { DrawOptions } from '../grbl/commands';
import { fonts, layoutText } from '../text/layout';
import { toGcode } from './fromPolylines';

const LABEL_SIZE = 5;
const LABEL_GAP = 4;
const MIN_ROW_SPACING = 8;

type Sheet = { width: number; height: number };

export type DepthRow = { s: number; polylines: Polyline[] };

export function depthValues(from: number, to: number, step: number) {
	const low = Math.max(0, Math.round(Math.min(from, to)));
	const high = Math.min(1000, Math.round(Math.max(from, to)));
	const increment = Math.max(1, Math.round(step));
	const values: number[] = [];
	for (let s = low; s <= high; s += increment) values.push(s);
	return values;
}

const rowSpan = (sheet: Sheet, margin: number) => ({
	top: margin + LABEL_SIZE,
	bottom: sheet.height - margin - LABEL_SIZE
});

export function maxDepthRows(sheet: Sheet, margin: number) {
	const { top, bottom } = rowSpan(sheet, margin);
	return bottom < top ? 0 : Math.floor((bottom - top) / MIN_ROW_SPACING) + 1;
}

function label(s: number) {
	const font = fonts.find((f) => f.id === 'hershey-sans') ?? fonts[0];
	return layoutText(`S ${s}`, { font, size: LABEL_SIZE, lineHeight: 1, align: 'left', width: 0 });
}

export function depthTest(values: number[], sheet: Sheet, margin: number): DepthRow[] {
	const { top, bottom } = rowSpan(sheet, margin);
	const spacing = values.length > 1 ? (bottom - top) / (values.length - 1) : 0;
	const labels = values.map(label);
	const labelWidth = Math.max(
		0,
		...labels.map((text) => {
			const b = bounds(text);
			return b ? b.maxX - b.minX : 0;
		})
	);
	const lineStart = margin + labelWidth + LABEL_GAP;
	const lineEnd = sheet.width - margin;
	return values.map((s, index) => {
		const y = top + index * spacing;
		const b = bounds(labels[index]);
		const text = b ? translate(labels[index], margin - b.minX, y - (b.minY + b.maxY) / 2) : [];
		const line: Polyline = [
			{ x: lineStart, y },
			{ x: lineEnd, y }
		];
		return { s, polylines: [...text, line] };
	});
}

export function depthTestGcode(rows: DepthRow[], options: DrawOptions = {}) {
	return rows.flatMap((row, index) => {
		const gcode = toGcode(row.polylines, { ...options, penDownS: row.s });
		return index < rows.length - 1 ? gcode.slice(0, -1) : gcode;
	});
}
