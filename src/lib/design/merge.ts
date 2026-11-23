export type MergeList = { columns: string[]; rows: Record<string, string>[] };

const DELIMITERS = [';', ',', '\t'];

function detectDelimiter(text: string) {
	const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
	return DELIMITERS.map((d) => ({ d, count: firstLine.split(d).length })).sort(
		(a, b) => b.count - a.count
	)[0].d;
}

export function parseCsv(text: string): string[][] {
	const delimiter = detectDelimiter(text);
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (char === '"') quoted = false;
			else cell += char;
		} else if (char === '"') quoted = true;
		else if (char === delimiter) {
			row.push(cell);
			cell = '';
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && text[i + 1] === '\n') i++;
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
		} else cell += char;
	}
	if (cell !== '' || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}
	return rows.filter((r) => r.some((value) => value.trim() !== ''));
}

export function toMergeList(text: string): MergeList {
	const [header = [], ...body] = parseCsv(text.replace(/^\uFEFF/, ''));
	const columns = header.map((name, index) => name.trim() || `${index + 1}`);
	const rows = body.map((cells) =>
		Object.fromEntries(columns.map((column, index) => [column, (cells[index] ?? '').trim()]))
	);
	return { columns, rows };
}

export function decodeText(bytes: ArrayBuffer) {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder('windows-1252').decode(bytes);
	}
}

export function hasPlaceholders(text: string) {
	return /\{[^{}\n]+\}/.test(text);
}

export function fillPlaceholders(text: string, row: Record<string, string>) {
	const lookup = new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]));
	return text
		.replace(
			/\{([^{}\n]+)\}/g,
			(match, key: string) => lookup.get(key.trim().toLowerCase()) ?? match
		)
		.split('\n')
		.filter((line, index, lines) => line.trim() !== '' || lines.length === 1)
		.join('\n');
}
