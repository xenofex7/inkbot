<script lang="ts">
	import { BookmarkPlus, Check, Sparkles } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import Button from './Button.svelte';
	import { colourPrompt, generateSvg, svgPrompt } from '../ai/drawings';
	import { PENS } from '../design/pens';
	import type { AiResult } from '../ai/result';
	import { buildPrompt, generateImage } from '../ai/images';
	import { aiSettings } from '../ai/settings.svelte';
	import { normalize, type Shape } from '../design/model';
	import { gallery, type GallerySource } from '../gallery/store.svelte';
	import type { Polyline } from '../geometry/types';
	import { t, type MessageKey } from '../i18n.svelte';
	import { loadGray } from '../image/load';
	import { traceImage } from '../image/trace';
	import { orderPaths } from '../optimize/order';
	import { settings } from '../settings.svelte';
	import { parseSvg } from '../svg/parse';

	let {
		area,
		onuse
	}: { area: { width: number; height: number }; onuse: (result: AiResult) => void } = $props();

	type Slot = { result?: AiResult; error?: string; busy: boolean };

	let idea = $state('');
	let multicolour = $state(false);
	let drawing = $state<Slot>({ busy: false });
	let image = $state<Slot>({ busy: false });
	let saved = $state(false);

	const slots = $derived(
		[
			aiSettings.drawingReady && { id: 'drawing', label: 'ai.drawing', slot: drawing },
			aiSettings.ready && { id: 'image', label: 'ai.image', slot: image }
		].filter(Boolean) as { id: 'drawing' | 'image'; label: MessageKey; slot: Slot }[]
	);
	const busy = $derived(drawing.busy || image.busy);
	const results = $derived(slots.map((s) => s.slot.result).filter((r) => r !== undefined));

	function message(error: unknown) {
		if (error instanceof TypeError) return t('image.noResponse');
		return error instanceof Error ? error.message : String(error);
	}

	async function makeDrawing(text: string): Promise<AiResult> {
		const base = svgPrompt(aiSettings.svgTemplate, area.width, area.height);
		const system = multicolour ? `${base} ${colourPrompt(PENS.map((pen) => pen.hex))}` : base;
		const svg = await generateSvg(aiSettings.drawingConfig, system, text);
		return { kind: 'svg', name: text, svg, shape: normalize(parseSvg(svg)) };
	}

	async function makeImage(text: string): Promise<AiResult> {
		const blob = await generateImage(
			aiSettings.config,
			buildPrompt(aiSettings.promptTemplate, text)
		);
		const gray = await loadGray(blob, 400);
		const lines = traceImage(gray, {
			mode: 'lines',
			threshold: 140,
			hatchSpacing: 3,
			simplify: 0.8,
			minLength: 2
		});
		return { kind: 'image', name: text, blob, shape: normalize(lines) };
	}

	async function run(slot: Slot, make: () => Promise<AiResult>) {
		slot.busy = true;
		slot.error = undefined;
		slot.result = undefined;
		try {
			slot.result = await make();
		} catch (error) {
			slot.error = message(error);
		} finally {
			slot.busy = false;
		}
	}

	async function generate() {
		const text = idea.trim();
		if (!text) return;
		saved = false;
		await Promise.all([
			aiSettings.drawingReady ? run(drawing, () => makeDrawing(text)) : undefined,
			aiSettings.ready ? run(image, () => makeImage(text)) : undefined
		]);
	}

	function fitted(shape: Shape): Polyline[] {
		const width = Math.max(0, settings.sheet.width - 2 * settings.margin);
		const height = Math.max(0, settings.sheet.height - 2 * settings.margin);
		if (!shape.width || !shape.height) return [];
		const scale = Math.min(width / shape.width, height / shape.height);
		const x = settings.margin + (width - shape.width * scale) / 2;
		return orderPaths(
			shape.lines.map((line) =>
				line.map((p) => ({ x: x + p.x * scale, y: settings.margin + p.y * scale }))
			)
		);
	}

	async function saveAll() {
		for (const result of results) {
			const source: GallerySource =
				result.kind === 'svg'
					? {
							kind: 'svg',
							blob: new Blob([result.svg], { type: 'image/svg+xml' }),
							name: result.name
						}
					: { kind: 'image', blob: result.blob, name: result.name };
			await gallery.add({
				name: result.name,
				formatId: settings.formatId,
				orientation: settings.orientation,
				margin: settings.margin,
				sheet: { ...settings.sheet },
				polylines: fitted(result.shape),
				source
			});
		}
		saved = true;
	}

	const points = (line: Polyline) => line.map((p) => `${p.x},${p.y}`).join(' ');
</script>

{#if slots.length === 0}
	<p class="rounded-md bg-surface-card p-3 text-sm text-ink">
		{t('image.setupBefore')}
		<a class="text-link underline" href={resolve('/settings')}>{t('image.setupLink')}</a>{t(
			'image.setupAfter'
		)}
	</p>
{:else}
	<div class="space-y-3">
		<p class="text-[13px] text-ink-mute">{t('ai.hint')}</p>
		<label class="sr-only" for="ai-idea">{t('ai.idea')}</label>
		<textarea
			id="ai-idea"
			bind:value={idea}
			rows="3"
			placeholder={t('image.ideaPlaceholder')}
			class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-ink"></textarea>
		{#if aiSettings.drawingReady}
			<label class="flex items-start gap-2.5 text-sm text-ink">
				<input type="checkbox" class="mt-0.5 size-4 accent-primary" bind:checked={multicolour} />
				<span>
					{t('ai.multicolour')}
					<span class="block text-[13px] text-ink-mute">{t('ai.multicolourHint')}</span>
				</span>
			</label>
		{/if}
		<Button variant="primary" onclick={generate} disabled={busy || !idea.trim()}>
			<Sparkles size={16} />
			{busy ? t('image.generating') : t('image.generate')}
		</Button>

		<div class="grid grid-cols-2 gap-3">
			{#each slots as { id, label, slot } (id)}
				<div class="flex flex-col rounded-lg border border-hairline bg-canvas p-2.5">
					<span class="text-[13px] font-semibold text-ink">{t(label)}</span>
					<div
						class="mt-2 flex aspect-square items-center justify-center rounded-md bg-surface-card"
					>
						{#if slot.busy}
							<span class="text-[13px] text-ink-mute">{t('image.generating')}</span>
						{:else if slot.error}
							<span class="p-2 text-[12px] text-danger" role="alert">{slot.error}</span>
						{:else if slot.result && slot.result.shape.width > 0}
							<svg
								viewBox="-2 -2 {slot.result.shape.width + 4} {slot.result.shape.height + 4}"
								class="h-full w-full p-2"
								role="img"
								aria-label={slot.result.name}
							>
								{#each slot.result.shape.lines as line, index (index)}
									<polyline
										points={points(line)}
										fill="none"
										class="stroke-ink"
										stroke-width={Math.max(slot.result.shape.width, slot.result.shape.height) / 250}
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								{/each}
							</svg>
						{:else}
							<span class="text-[13px] text-ink-mute">-</span>
						{/if}
					</div>
					{#if slot.result}
						{@const result = slot.result}
						<Button class="mt-2 h-8! justify-center px-3!" onclick={() => onuse(result)}>
							<Check size={14} />
							{t('ai.use')}
						</Button>
					{/if}
				</div>
			{/each}
		</div>

		{#if results.length > 0}
			<Button onclick={saveAll} disabled={saved}>
				<BookmarkPlus size={16} />
				{saved ? t('job.saved') : results.length > 1 ? t('ai.saveBoth') : t('job.saveGallery')}
			</Button>
		{/if}
	</div>
{/if}
