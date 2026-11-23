import { extractSvg } from '../svg/parse';
import { baseUrlFor, errorMessage, headers, type ProviderConfig } from './images';

export const DEFAULT_SVG_PROMPT =
	'You draw for a pen plotter. Reply with one SVG document and nothing else. ' +
	'Use viewBox="0 0 {width} {height}". Use only path, line, polyline, polygon, circle and ' +
	'ellipse elements with stroke="black" and fill="none". Draw every line once as a single ' +
	'stroke, no doubled outlines, no fills, no gradients, no text, no images, no frame. ' +
	'Keep it simple and elegant with a moderate number of strokes.';

export function svgPrompt(template: string, width: number, height: number) {
	return template
		.replaceAll('{width}', String(Math.round(width)))
		.replaceAll('{height}', String(Math.round(height)));
}

export async function generateSvg(
	config: ProviderConfig,
	systemPrompt: string,
	idea: string,
	fetcher: typeof fetch = fetch
): Promise<string> {
	const response = await fetcher(`${baseUrlFor(config)}/chat/completions`, {
		method: 'POST',
		headers: headers(config),
		body: JSON.stringify({
			model: config.model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: idea.trim() }
			]
		})
	});
	if (!response.ok) throw new Error(await errorMessage(response));
	const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
	return extractSvg(body.choices?.[0]?.message?.content ?? '');
}
