import type { Polyline } from './types';

const round = (value: number) => Math.round(value * 100) / 100;

export function toSvg(polylines: Polyline[], width: number, height: number) {
	const lines = polylines
		.filter((line) => line.length > 1)
		.map(
			(line) => `  <polyline points="${line.map((p) => `${round(p.x)},${round(p.y)}`).join(' ')}"/>`
		)
		.join('\n');
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">`,
		'<g fill="none" stroke="#000" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round">',
		lines,
		'</g>',
		'</svg>',
		''
	].join('\n');
}
