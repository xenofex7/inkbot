import { describe, expect, it, vi } from 'vitest';
import {
	baseUrlFor,
	buildPrompt,
	generateImage,
	listModels,
	redrawImage,
	type ProviderConfig
} from './images';

const compatible: ProviderConfig = {
	provider: 'compatible',
	baseUrl: 'https://litellm.example.com/v1/',
	apiKey: 'test-key',
	model: 'my-image-model',
	size: '1024x1024'
};

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('buildPrompt', () => {
	it('fills the placeholder', () => {
		expect(buildPrompt('Line drawing of {prompt}.', ' a cat ')).toBe('Line drawing of a cat.');
	});

	it('appends the prompt when the template has no placeholder', () => {
		expect(buildPrompt('Line drawing:', 'a cat')).toBe('Line drawing: a cat');
	});
});

describe('baseUrlFor', () => {
	it('uses the OpenAI URL for openai and trims trailing slashes otherwise', () => {
		expect(baseUrlFor({ ...compatible, provider: 'openai' })).toBe('https://api.openai.com/v1');
		expect(baseUrlFor(compatible)).toBe('https://litellm.example.com/v1');
	});
});

describe('generateImage', () => {
	it('posts to images/generations and decodes base64 images', async () => {
		const fetcher = vi.fn(() => Promise.resolve(json({ data: [{ b64_json: btoa('png-bytes') }] })));
		const blob = await generateImage(compatible, 'a cat', fetcher);
		expect(await blob.text()).toBe('png-bytes');
		const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://litellm.example.com/v1/images/generations');
		expect(JSON.parse(init.body as string)).toEqual({
			model: 'my-image-model',
			prompt: 'a cat',
			size: '1024x1024',
			n: 1
		});
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
	});

	it('downloads the image when the provider returns a URL', async () => {
		const fetcher = vi.fn((url: string) =>
			Promise.resolve(
				url.endsWith('/images/generations')
					? json({ data: [{ url: 'https://cdn.example.com/cat.png' }] })
					: new Response('cdn-bytes')
			)
		);
		const blob = await generateImage(compatible, 'a cat', fetcher as unknown as typeof fetch);
		expect(await blob.text()).toBe('cdn-bytes');
	});

	it('surfaces the provider error message', async () => {
		const fetcher = vi.fn(() =>
			Promise.resolve(json({ error: { message: 'Invalid API key' } }, 401))
		);
		await expect(
			generateImage(compatible, 'a cat', fetcher as unknown as typeof fetch)
		).rejects.toThrow('401: Invalid API key');
	});
});

describe('redrawImage', () => {
	it('posts the photo as multipart form to images/edits', async () => {
		const fetcher = vi.fn(() => Promise.resolve(json({ data: [{ b64_json: btoa('line-art') }] })));
		const photo = new Blob(['photo-bytes'], { type: 'image/png' });
		const blob = await redrawImage(compatible, photo, 'redraw it', fetcher);
		expect(await blob.text()).toBe('line-art');
		const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://litellm.example.com/v1/images/edits');
		const form = init.body as FormData;
		expect(form.get('model')).toBe('my-image-model');
		expect(form.get('prompt')).toBe('redraw it');
		expect(await (form.get('image') as Blob).text()).toBe('photo-bytes');
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
		expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
	});
});

describe('listModels', () => {
	it('returns sorted model ids', async () => {
		const fetcher = vi.fn(() => Promise.resolve(json({ data: [{ id: 'b' }, { id: 'a' }] })));
		expect(await listModels(compatible, fetcher as unknown as typeof fetch)).toEqual(['a', 'b']);
	});
});
