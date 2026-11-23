export type PaperFormat = { id: string; name: string; width: number; height: number };

export const PAPER_FORMATS: PaperFormat[] = [
	{ id: 'a4', name: 'A4', width: 210, height: 297 },
	{ id: 'a5', name: 'A5', width: 148, height: 210 },
	{ id: 'a6', name: 'A6', width: 105, height: 148 },
	{ id: 'c6', name: 'Envelope C6', width: 162, height: 114 },
	{ id: 'c65', name: 'Envelope C6/5', width: 229, height: 114 },
	{ id: 'c5', name: 'Envelope C5', width: 162, height: 229 }
];

export type Orientation = 'portrait' | 'landscape';

export function sheetSize(format: PaperFormat, orientation: Orientation) {
	const long = Math.max(format.width, format.height);
	const short = Math.min(format.width, format.height);
	return orientation === 'portrait'
		? { width: short, height: long }
		: { width: long, height: short };
}
