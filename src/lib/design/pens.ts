export const PENS = [
	{ id: 1, color: 'var(--ink)' },
	{ id: 2, color: '#ac503a' },
	{ id: 3, color: '#3d6fa8' },
	{ id: 4, color: '#2f7d5b' }
] as const;

export function penColor(pen: number | undefined) {
	return (PENS.find((item) => item.id === pen) ?? PENS[0]).color;
}
