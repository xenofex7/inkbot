import { describe, expect, it } from 'vitest';
import { toSvg } from './svg';

describe('toSvg', () => {
	it('writes polylines in millimetres with a matching viewBox', () => {
		const svg = toSvg(
			[
				[
					{ x: 1, y: 2 },
					{ x: 3.14159, y: 4 }
				]
			],
			148,
			105
		);
		expect(svg).toContain('width="148mm" height="105mm" viewBox="0 0 148 105"');
		expect(svg).toContain('<polyline points="1,2 3.14,4"/>');
	});

	it('skips single points', () => {
		expect(toSvg([[{ x: 1, y: 1 }]], 10, 10)).not.toContain('<polyline');
	});
});
