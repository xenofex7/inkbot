export const PENS = [
	{ id: 1, color: 'var(--ink)', hex: '#363d52' },
	{ id: 2, color: '#ac503a', hex: '#ac503a' },
	{ id: 3, color: '#3d6fa8', hex: '#3d6fa8' },
	{ id: 4, color: '#2f7d5b', hex: '#2f7d5b' }
] as const;

const NAMED: Record<string, string> = {
	black: '#000000',
	gray: '#808080',
	grey: '#808080',
	red: '#ff0000',
	darkred: '#8b0000',
	maroon: '#800000',
	brown: '#a52a2a',
	orange: '#ffa500',
	blue: '#0000ff',
	navy: '#000080',
	darkblue: '#00008b',
	green: '#008000',
	darkgreen: '#006400',
	teal: '#008080'
};

function rgb(color: string): [number, number, number] | undefined {
	const value = (NAMED[color.trim().toLowerCase()] ?? color).trim().toLowerCase();
	const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
	if (short)
		return [short[1], short[2], short[3]].map((c) => parseInt(c + c, 16)) as [
			number,
			number,
			number
		];
	const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(value);
	if (long)
		return [long[1], long[2], long[3]].map((c) => parseInt(c, 16)) as [number, number, number];
	const fn = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(value);
	if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3])];
	return undefined;
}

export function penForColor(color: string): number {
	const target = rgb(color);
	if (!target) return 1;
	let best: number = PENS[0].id;
	let bestDistance = Infinity;
	for (const pen of PENS) {
		const [r, g, b] = rgb(pen.hex)!;
		const distance = (r - target[0]) ** 2 + (g - target[1]) ** 2 + (b - target[2]) ** 2;
		if (distance < bestDistance) {
			bestDistance = distance;
			best = pen.id;
		}
	}
	return best;
}

export function penColor(pen: number | undefined) {
	return (PENS.find((item) => item.id === pen) ?? PENS[0]).color;
}
