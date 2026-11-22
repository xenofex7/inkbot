export type ProviderId = 'openai' | 'compatible';

export type ProviderConfig = {
	provider: ProviderId;
	baseUrl: string;
	apiKey: string;
	model: string;
	size: string;
};

export const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export const DEFAULT_PROMPT_TEMPLATE =
	'Simple black line drawing of {prompt}. Clean single strokes of even width, ' +
	'no shading, no fills, no gradients, no text, no frame, plain white background, ' +
	'minimal detail, like a coloring book outline drawn with a fine pen.';

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

function headers(config: ProviderConfig) {
	return {
		'Content-Type': 'application/json',
		...(config.apiKey ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {})
	};
}

async function errorMessage(response: Response) {
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
