export function download(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function filenameFrom(text: string, extension: string) {
	const slug = text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40);
	return `${slug || 'inkbot'}.${extension}`;
}
