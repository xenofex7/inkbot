import { orient } from '../geometry/types';
import { VGX4 } from './vgx4';

const mm = (value: number) => value.toFixed(3).replace(/\.?0+$/, '') || '0';
const dwell = `G4 P${VGX4.penDwellSeconds}`;

export const penUp = () => ['M5', dwell];

export const penDown = () => [`M3 S${VGX4.penDownS}`, dwell];

export const setOrigin = () => ['G92 X0 Y0'];

export function jog(dx: number, dy: number, invertY = false, feed: number = VGX4.jogFeed) {
	const { x, y } = orient({ x: dx, y: dy }, invertY);
	const axes = [x ? `X${mm(x)}` : '', y ? `Y${mm(y)}` : ''].filter(Boolean).join(' ');
	return axes ? [`$J=G91 G21 ${axes} F${feed}`] : [];
}

export function testSquare(size: number, invertY = false, feed: number = VGX4.drawFeed) {
	const sy = invertY ? -size : size;
	return [
		'G21',
		'G91',
		...penUp(),
		...penDown(),
		`G1 X${mm(size)} F${feed}`,
		`G1 Y${mm(sy)}`,
		`G1 X${mm(-size)}`,
		`G1 Y${mm(-sy)}`,
		...penUp(),
		'G90'
	];
}
