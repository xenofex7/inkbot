import type { Point } from './types';

function solve(matrix: number[][], vector: number[]): number[] {
	const n = vector.length;
	const a = matrix.map((row, i) => [...row, vector[i]]);
	for (let col = 0; col < n; col++) {
		let pivot = col;
		for (let row = col + 1; row < n; row++) {
			if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
		}
		if (Math.abs(a[pivot][col]) < 1e-12)
			throw new Error('The four points must not lie on one line');
		[a[col], a[pivot]] = [a[pivot], a[col]];
		for (let row = 0; row < n; row++) {
			if (row === col) continue;
			const factor = a[row][col] / a[col][col];
			for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k];
		}
	}
	return a.map((row, i) => row[n] / row[i]);
}

export function homography(from: Point[], to: Point[]): (point: Point) => Point {
	const matrix: number[][] = [];
	const vector: number[] = [];
	from.forEach((p, i) => {
		const q = to[i];
		matrix.push([p.x, p.y, 1, 0, 0, 0, -p.x * q.x, -p.y * q.x]);
		vector.push(q.x);
		matrix.push([0, 0, 0, p.x, p.y, 1, -p.x * q.y, -p.y * q.y]);
		vector.push(q.y);
	});
	const [a, b, c, d, e, f, g, h] = solve(matrix, vector);
	return ({ x, y }) => {
		const w = g * x + h * y + 1;
		return { x: (a * x + b * y + c) / w, y: (d * x + e * y + f) / w };
	};
}
