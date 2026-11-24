export type ProviderId = 'openai' | 'compatible';

export type ProviderConfig = {
	provider: ProviderId;
	baseUrl: string;
	apiKey: string;
	model: string;
	size: string;
};

export const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export const PREVIOUS_PROMPT_TEMPLATE =
	'Bold black and white illustration of {prompt}. Solid black filled shapes and clean ' +
	'outlines, no gradients, no grey tones, no text, no frame, plain white background.';

export const DEFAULT_PROMPT_TEMPLATE =
	'Clean black line art of {prompt}, like a colouring book page. Crisp continuous outlines of ' +
	'even medium width with clear detail, no filled areas, no shading, no hatching, no grey ' +
	'tones, no gradients, no text, no frame, plain white background.';

export function buildPrompt(template: string, prompt: string) {
	const subject = prompt.trim();
	return template.includes('{prompt}')
		? template.replaceAll('{prompt}', subject)
		: `${template.trim()} ${subject}`.trim();
}

export function baseUrlFor(config: ProviderConfig) {
	const url = config.provider === 'openai' ? OPENAI_BASE_URL : config.baseUrl;
	return url.trim().replace(/\/+$/, '');
}

export function headers(config: ProviderConfig) {
	return {
		'Content-Type': 'application/json',
		...(config.apiKey ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {})
	};
}

export async function errorMessage(response: Response) {
	try {
		const body = (await response.json()) as { error?: { message?: string } | string };
		const message = typeof body.error === 'string' ? body.error : body.error?.message;
		if (message) return `${response.status}: ${message}`;
	} catch {
		return `${response.status} ${response.statusText}`;
	}
	return `${response.status} ${response.statusText}`;
}

function base64ToBlob(base64: string, type = 'image/png') {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new Blob([bytes], { type });
}

export async function generateImage(
	config: ProviderConfig,
	prompt: string,
	fetcher: typeof fetch = fetch
): Promise<Blob> {
	const response = await fetcher(`${baseUrlFor(config)}/images/generations`, {
		method: 'POST',
		headers: headers(config),
		body: JSON.stringify({ model: config.model, prompt, size: config.size, n: 1 })
	});
	return imageFrom(response, fetcher);
}

export const REDRAW_PROMPT =
	'Redraw this photo as a simple black line drawing on a plain white background. Clean single ' +
	'strokes of even width, no shading, no fills, no gradients, no text, keep the main shapes and ' +
	'the details that make it recognisable.';

export async function redrawImage(
	config: ProviderConfig,
	photo: Blob,
	prompt: string = REDRAW_PROMPT,
	fetcher: typeof fetch = fetch
): Promise<Blob> {
	const form = new FormData();
	form.append('model', config.model);
	form.append('prompt', prompt);
	form.append('size', config.size);
	form.append('n', '1');
	form.append('image', photo, 'photo.png');
	const auth: Record<string, string> = config.apiKey
		? { Authorization: `Bearer ${config.apiKey.trim()}` }
		: {};
	const response = await fetcher(`${baseUrlFor(config)}/images/edits`, {
		method: 'POST',
		headers: auth,
		body: form
	});
	return imageFrom(response, fetcher);
}

async function imageFrom(response: Response, fetcher: typeof fetch): Promise<Blob> {
	if (!response.ok) throw new Error(await errorMessage(response));
	const body = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
	const image = body.data?.[0];
	if (image?.b64_json) return base64ToBlob(image.b64_json);
	if (image?.url) {
		const download = await fetcher(image.url);
		if (!download.ok) throw new Error(`Could not load the image (${download.status})`);
		return download.blob();
	}
	throw new Error('The response contains no image.');
}

export async function listModels(config: ProviderConfig, fetcher: typeof fetch = fetch) {
	const response = await fetcher(`${baseUrlFor(config)}/models`, { headers: headers(config) });
	if (!response.ok) throw new Error(await errorMessage(response));
	const body = (await response.json()) as { data?: { id: string }[] };
	return (body.data ?? []).map((model) => model.id).sort();
}
