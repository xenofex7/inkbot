import { describe, expect, it, vi } from 'vitest';
import { generateSvg, svgPrompt } from './drawings';
import type { ProviderConfig } from './images';

const config: ProviderConfig = {
	provider: 'compatible',
	baseUrl: 'https://litellm.example.com/v1',
	apiKey: 'test-key',
	model: 'text-model',
	size: '1024x1024'
};

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('svgPrompt', () => {
	it('fills in the sheet proportions', () => {
		expect(svgPrompt('viewBox="0 0 {width} {height}"', 128.4, 85)).toBe('viewBox="0 0 128 85"');
	});
});

describe('generateSvg', () => {
	it('asks the chat endpoint and returns only the SVG', async () => {
		const fetcher = vi.fn(() =>
			Promise.resolve(
				json({ choices: [{ message: { content: '```svg\n<svg viewBox="0 0 1 1"></svg>\n```' } }] })
			)
		);
		const result = await generateSvg(config, 'system', ' a cat ', fetcher);
		expect(result).toBe('<svg viewBox="0 0 1 1"></svg>');
		const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://litellm.example.com/v1/chat/completions');
		expect(JSON.parse(init.body as string)).toEqual({
			model: 'text-model',
			messages: [
				{ role: 'system', content: 'system' },
				{ role: 'user', content: 'a cat' }
			]
		});
	});

	it('fails clearly when the answer has no SVG', async () => {
		const fetcher = vi.fn(() =>
			Promise.resolve(json({ choices: [{ message: { content: 'Sorry, I cannot.' } }] }))
		);
		await expect(generateSvg(config, 's', 'x', fetcher as unknown as typeof fetch)).rejects.toThrow(
			'no SVG'
		);
	});
});
