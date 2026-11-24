<script lang="ts">
	import { BookmarkPlus, Check, Sparkles, X } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import Button from './Button.svelte';
	import { colourPrompt, generateSvg, svgPrompt } from '../ai/drawings';
	import { PENS } from '../design/pens';
	import type { AiResult } from '../ai/result';
	import { aiHistory, type HistoryEntry } from '../ai/history.svelte';
	import { buildPrompt, generateImage } from '../ai/images';
	import { aiSettings } from '../ai/settings.svelte';
	import { normalize, type Shape } from '../design/model';
	import { AI_TRACE } from '../design/store.svelte';
	import { gallery, type GallerySource } from '../gallery/store.svelte';
	import type { Polyline } from '../geometry/types';
	import { t } from '../i18n.svelte';
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
	let images = $state<Slot[]>([]);
	let saved = $state(false);

	const slots = $derived([
		...(aiSettings.drawingReady ? [{ id: 'drawing', label: t('ai.drawing'), slot: drawing }] : []),
		...images.map((slot, index) => ({
			id: `image-${index}`,
			label: images.length > 1 ? t('ai.imageNumber', { number: index + 1 }) : t('ai.image'),
			slot
		}))
	]);
	const busy = $derived(drawing.busy || images.some((slot) => slot.busy));
	const results = $derived(slots.map((s) => s.slot.result).filter((r) => r !== undefined));

	$effect(() => {
		aiHistory.load().catch(() => undefined);
	});

	function message(error: unknown) {
		if (error instanceof TypeError) return t('image.noResponse');
		return error instanceof Error ? error.message : String(error);
	}

	async function makeDrawing(text: string): Promise<AiResult> {
		const base = svgPrompt(aiSettings.svgTemplate, area.width, area.height);
		const system = multicolour ? `${base} ${colourPrompt(PENS.map((pen) => pen.hex))}` : base;
		const svg = await generateSvg(aiSettings.drawingConfig, system, text);
		await remember({ kind: 'svg', name: text, svg });
		return svgResult(text, svg);
	}

	function svgResult(name: string, svg: string): AiResult {
		return { kind: 'svg', name, svg, shape: normalize(parseSvg(svg)) };
	}

	async function imageResult(name: string, blob: Blob): Promise<AiResult> {
		const gray = await loadGray(blob, AI_TRACE.detail);
		const lines = traceImage(gray, {
			mode: 'lines',
			threshold: AI_TRACE.threshold,
			hatchSpacing: 3,
			simplify: 0.8,
			minLength: 4
		});
		return { kind: 'image', name, blob, shape: normalize(lines) };
	}

	async function makeImage(text: string): Promise<AiResult> {
		const blob = await generateImage(
			aiSettings.config,
			buildPrompt(aiSettings.promptTemplate, text)
		);
		await remember({ kind: 'image', name: text, blob });
		return imageResult(text, blob);
	}

	async function remember(entry: Parameters<typeof aiHistory.add>[0]) {
		try {
			await aiHistory.add(entry);
		} catch {
			return;
		}
	}

	async function useEntry(entry: HistoryEntry) {
		onuse(
			entry.kind === 'svg'
				? svgResult(entry.name, entry.svg)
				: await imageResult(entry.name, entry.blob)
		);
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
		drawing = { busy: false };
		images = aiSettings.ready
			? Array.from({ length: Math.min(4, Math.max(1, aiSettings.imageCount)) }, () => ({
					busy: false
				}))
			: [];
		await Promise.all([
			aiSettings.drawingReady ? run(drawing, () => makeDrawing(text)) : undefined,
			...images.map((slot) => run(slot, () => makeImage(text)))
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

	function thumbnail(node: HTMLImageElement, blob: Blob) {
		const url = URL.createObjectURL(blob);
		node.src = url;
		return { destroy: () => URL.revokeObjectURL(url) };
	}
</script>

{#if !aiSettings.ready && !aiSettings.drawingReady}
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
					<span class="text-[13px] font-semibold text-ink">{label}</span>
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
				{saved ? t('job.saved') : results.length > 1 ? t('ai.saveAll') : t('job.saveGallery')}
			</Button>
		{/if}

		{#if aiHistory.entries.length > 0}
			<details class="rounded-lg border border-hairline bg-canvas p-2.5">
				<summary class="cursor-pointer text-[13px] font-semibold text-ink">
					{t('ai.history', { count: aiHistory.entries.length })}
				</summary>
				<p class="mt-2 text-[12px] text-ink-mute">{t('ai.historyHint')}</p>
				<ul class="mt-2 grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">
					{#each aiHistory.entries as entry (entry.id)}
						<li class="relative">
							<button
								class="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-hairline bg-white p-1"
								title={entry.name}
								aria-label={t('ai.useEntry', { name: entry.name })}
								onclick={() => void useEntry(entry)}
							>
								{#if entry.kind === 'image'}
									<img use:thumbnail={entry.blob} alt="" class="h-full w-full object-contain" />
								{:else}
									<img
										src="data:image/svg+xml;charset=utf-8,{encodeURIComponent(entry.svg)}"
										alt=""
										class="h-full w-full object-contain"
									/>
								{/if}
							</button>
							<button
								class="absolute top-1 right-1 rounded-full bg-canvas/90 p-0.5 text-ink-mute hover:text-danger"
								aria-label={t('ai.removeEntry')}
								onclick={() => void aiHistory.remove(entry.id)}
							>
								<X size={12} />
							</button>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</div>
{/if}
