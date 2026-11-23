import { DEFAULT_AXES, toMachine, type Axes } from '../geometry/types';
import { VGX4 } from './vgx4';

const mm = (value: number) => value.toFixed(3).replace(/\.?0+$/, '') || '0';
const dwell = `G4 P${VGX4.penDwellSeconds}`;

export const penUp = () => ['M5', dwell];

export type DrawOptions = { axes?: Axes; penDownS?: number; feed?: number };

export const penDown = (s: number = VGX4.penDownS) => [`M3 S${Math.round(s)}`, dwell];

export const setOrigin = () => ['G92.1', 'G10 L20 P1 X0 Y0'];

export const jogTo = (target: { x: number; y: number }, feed: number = VGX4.jogFeed) => [
	`$J=G53 G21 X${mm(target.x)} Y${mm(target.y)} F${feed}`
];

export const moveToMachine = (target: { x: number; y: number }) => [
	...penUp(),
	'G21',
	`G53 G0 X${mm(target.x)} Y${mm(target.y)}`
];

export const goToOrigin = () => [...penUp(), 'G21', 'G90', 'G0 X0 Y0'];

export function jog(
	dx: number,
	dy: number,
	axes: Axes = DEFAULT_AXES,
	feed: number = VGX4.jogFeed
) {
	const { x, y } = toMachine({ x: dx, y: dy }, axes);
	const parts = [x ? `X${mm(x)}` : '', y ? `Y${mm(y)}` : ''].filter(Boolean).join(' ');
	return parts ? [`$J=G91 G21 ${parts} F${feed}`] : [];
}

export function testSquare(size: number, options: DrawOptions = {}) {
	const { axes = DEFAULT_AXES, penDownS = VGX4.penDownS, feed = VGX4.drawFeed } = options;
	const move = (x: number, y: number) => {
		const m = toMachine({ x, y }, axes);
		return [m.x ? `X${mm(m.x)}` : '', m.y ? `Y${mm(m.y)}` : ''].filter(Boolean).join(' ');
	};
	return [
		'G21',
		'G91',
		...penUp(),
		...penDown(penDownS),
		`G1 ${move(size, 0)} F${feed}`,
		`G1 ${move(0, size)}`,
		`G1 ${move(-size, 0)}`,
		`G1 ${move(0, -size)}`,
		...penUp(),
		'G90'
	];
}
