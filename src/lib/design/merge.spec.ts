import { describe, expect, it } from 'vitest';
import { decodeText, fillPlaceholders, hasPlaceholders, parseCsv, toMergeList } from './merge';

describe('parseCsv', () => {
	it('detects semicolons and handles quotes, escaped quotes and line breaks', () => {
		const text = 'Name;Ort\r\n"Muster, Max";"Bern ""Altstadt"""\r\nErika;"Zeile 1\nZeile 2"\r\n';
		expect(parseCsv(text)).toEqual([
			['Name', 'Ort'],
			['Muster, Max', 'Bern "Altstadt"'],
			['Erika', 'Zeile 1\nZeile 2']
		]);
	});

	it('detects commas and skips empty lines', () => {
		expect(parseCsv('a,b\n\n1,2\n')).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});
});

describe('toMergeList', () => {
	it('maps rows to the header columns and strips a byte order mark', () => {
		const list = toMergeList('﻿Name;PLZ;Ort\nMax Muster;8000;Zürich\n');
		expect(list.columns).toEqual(['Name', 'PLZ', 'Ort']);
		expect(list.rows).toEqual([{ Name: 'Max Muster', PLZ: '8000', Ort: 'Zürich' }]);
	});
});

describe('decodeText', () => {
	it('falls back to Windows-1252 for Excel exports', () => {
		const bytes = new Uint8Array([0x5a, 0xfc, 0x72, 0x69, 0x63, 0x68]).buffer;
		expect(decodeText(bytes)).toBe('Zürich');
	});
});

describe('fillPlaceholders', () => {
	const row = { Name: 'Erika Beispiel', Zusatz: '', PLZ: '3000', Ort: 'Bern' };

	it('replaces placeholders case-insensitively and drops empty lines', () => {
		expect(fillPlaceholders('{name}\n{Zusatz}\n{PLZ} {Ort}', row)).toBe(
			'Erika Beispiel\n3000 Bern'
		);
	});

	it('keeps unknown placeholders and detects them', () => {
		expect(fillPlaceholders('{Land}', row)).toBe('{Land}');
		expect(hasPlaceholders('Hallo {Name}')).toBe(true);
		expect(hasPlaceholders('Hallo')).toBe(false);
	});
});
