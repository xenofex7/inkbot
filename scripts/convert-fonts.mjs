import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'fonts';
const TARGET = 'src/lib/text/fonts.json';
const CURVE_STEPS = 8;

const FONTS = [
	{ id: 'ems-readability', file: 'EMSReadability.svg', license: 'OFL-1.1' },
	{ id: 'ems-allure', file: 'EMSAllure.svg', license: 'OFL-1.1' },
	{ id: 'hershey-script', file: 'HersheyScript1.svg', license: 'Hershey' },
	{ id: 'hershey-sans', file: 'HersheySans1.svg', license: 'Hershey' },
	{ id: 'ems-swiss', file: 'EMSSwiss.svg', license: 'OFL-1.1' },
	{ id: 'ems-society', file: 'EMSSociety.svg', license: 'OFL-1.1' },
	{ id: 'hershey-script-med', file: 'HersheyScriptMed.svg', license: 'Hershey' },
	{ id: 'ems-pepita', file: 'EMSPepita.svg', license: 'OFL-1.1' },
	{ id: 'ems-casual-hand', file: 'EMSCasualHand.svg', license: 'OFL-1.1' },
	{ id: 'hershey-serif-italic', file: 'HersheySerifMedItalic.svg', license: 'Hershey' },
	{ id: 'hershey-gothic-german', file: 'HersheyGothGerman.svg', license: 'Hershey' },
	{ id: 'hershey-gothic-english', file: 'HersheyGothEnglish.svg', license: 'Hershey' }
];

const decodeEntities = (value) =>
	value
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');

const attr = (tag, name) => {
	const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
	return match ? match[1] : undefined;
};

const round = (value) => Math.round(value * 10) / 10;

function cubic(p0, p1, p2, p3, t) {
	const u = 1 - t;
	return [
		u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
		u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
	];
}

function parsePath(d) {
	const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
	const strokes = [];
	let current = null;
	let point = [0, 0];
	let command = '';
	let i = 0;
	const next = () => Number(tokens[i++]);
	while (i < tokens.length) {
		if (/^[MLCZ]$/i.test(tokens[i])) command = tokens[i++].toUpperCase();
		if (command === 'M') {
			point = [next(), next()];
			current = [point];
			strokes.push(current);
			command = 'L';
		} else if (command === 'L') {
			point = [next(), next()];
			current.push(point);
		} else if (command === 'C') {
			const c1 = [next(), next()];
			const c2 = [next(), next()];
			const end = [next(), next()];
			for (let step = 1; step <= CURVE_STEPS; step++) {
				current.push(cubic(point, c1, c2, end, step / CURVE_STEPS));
			}
			point = end;
		} else if (command === 'Z') {
			current.push(current[0]);
			point = current[0];
		} else {
			throw new Error(`Unsupported path command in "${d.slice(0, 40)}"`);
		}
	}
	return strokes
		.filter((stroke) => stroke.length > 1)
		.map((stroke) => stroke.flatMap(([x, y]) => [round(x), round(y)]));
}

function convert({ id, file, license }) {
	const svg = readFileSync(`${SOURCE}/${file}`, 'utf8');
	const face = /<font-face([^>]*)\/>/s.exec(svg)[1];
	const glyphs = {};
	for (const [tag] of svg.matchAll(/<glyph\b[^>]*\/>/gs)) {
		const unicode = attr(tag, 'unicode');
		if (unicode === undefined) continue;
		const char = decodeEntities(unicode);
		const d = attr(tag, 'd');
		glyphs[char] = { a: Number(attr(tag, 'horiz-adv-x')), p: d ? parsePath(d) : [] };
	}
	return {
		id,
		name: attr(face, 'font-family'),
		license,
		unitsPerEm: Number(attr(face, 'units-per-em')),
		ascent: Number(attr(face, 'ascent')),
		descent: Number(attr(face, 'descent')),
		glyphs
	};
}

writeFileSync(TARGET, JSON.stringify(FONTS.map(convert)) + '\n');
console.log(`Wrote ${FONTS.length} fonts to ${TARGET}`);
