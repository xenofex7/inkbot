<script lang="ts">
	import { t } from '../i18n.svelte';
	import { Camera, Download, PenLine, RotateCcw } from '@lucide/svelte';
	import Button from './Button.svelte';
	import DrawPanel from './DrawPanel.svelte';
	import { download } from '../download';
	import { toSvg } from '../geometry/svg';
	import type { Point } from '../geometry/types';
	import { loadGray } from '../image/load';
	import type { Gray } from '../image/trace';
	import { glyphStrokes, PAD } from '../handwriting/model';
	import { scanTemplate } from '../handwriting/scan';
	import { SHEET, templatePolylines } from '../handwriting/template';
	import type { Glyph } from '../text/layout';

	let { onglyphs }: { onglyphs: (glyphs: Record<string, Glyph>) => void } = $props();

	let showDraw = $state(false);
	let photoUrl = $state<string | undefined>();
	let gray = $state.raw<Gray | undefined>();
	let taps = $state<Point[]>([]);
	let error = $state('');
	let photoInput: HTMLInputElement;

	const template = $derived(templatePolylines(t('scan.templateTitle')));
	const found = $derived(
		gray && taps.length === 4
			? scanTemplate(
					gray,
					taps.map((p) => ({ x: p.x * gray!.width, y: p.y * gray!.height }))
				)
			: undefined
	);
	const foundChars = $derived(found ? Object.keys(found) : []);

	function saveTemplate() {
		const svg = toSvg(template, SHEET.width, SHEET.height);
		download(new Blob([svg], { type: 'image/svg+xml' }), 'inkbot-handwriting-template.svg');
	}

	async function loadPhoto(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		error = '';
		try {
			gray = await loadGray(file, 2000);
			if (photoUrl) URL.revokeObjectURL(photoUrl);
			photoUrl = URL.createObjectURL(file);
			taps = [];
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	function tap(event: MouseEvent & { currentTarget: HTMLElement }) {
		if (taps.length >= 4) return;
		const box = event.currentTarget.getBoundingClientRect();
		taps = [
			...taps,
			{ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }
		];
	}

	function apply() {
		if (!found) return;
		onglyphs(found);
		reset();
	}

	function reset() {
		if (photoUrl) URL.revokeObjectURL(photoUrl);
		photoUrl = undefined;
		gray = undefined;
		taps = [];
	}

	const thumb = (glyph: Glyph) =>
		glyphStrokes(glyph).map((line) => line.map((p) => `${p.x},${p.y}`).join(' '));
</script>

<div class="space-y-4 rounded-lg border border-hairline bg-canvas p-6">
	<div>
		<h2 class="font-display text-lg font-semibold text-ink">{t('scan.title')}</h2>
		<p class="mt-1 text-sm text-ink-mute">{t('scan.intro')}</p>
	</div>

	<div class="flex flex-wrap gap-2">
		<Button onclick={saveTemplate}>
			<Download size={16} />
			{t('scan.download')}
		</Button>
		<Button onclick={() => (showDraw = !showDraw)} aria-expanded={showDraw}>
			<PenLine size={16} />
			{t('scan.draw')}
		</Button>
		<Button variant="primary" onclick={() => photoInput.click()}>
			<Camera size={16} />
			{t('scan.photo')}
		</Button>
		<input
			bind:this={photoInput}
			type="file"
			accept="image/*"
			class="hidden"
			onchange={loadPhoto}
		/>
	</div>

	{#if showDraw}
		<p class="text-[13px] text-ink-mute">{t('scan.drawHint')}</p>
		<DrawPanel
			polylines={template}
			sheet={SHEET}
			name="inkbot-handwriting-template"
			saveable={false}
			showPreview={false}
		/>
	{/if}

	{#if error}
		<p class="text-sm text-danger" role="alert">{error}</p>
	{/if}

	{#if photoUrl}
		<div class="space-y-3">
			<p class="text-sm text-ink">
				{taps.length < 4 ? t('scan.tap', { number: taps.length + 1 }) : t('scan.tapped')}
			</p>
			<button
				type="button"
				class="relative block w-full cursor-crosshair overflow-hidden rounded-md border border-hairline"
				onclick={tap}
				aria-label={t('scan.tapArea')}
			>
				<img src={photoUrl} alt="" class="block w-full" draggable="false" />
				{#each taps as point, index (index)}
					<span
						class="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-seal text-xs font-semibold text-on-primary"
						style="left: {point.x * 100}%; top: {point.y * 100}%"
					>
						{index + 1}
					</span>
				{/each}
			</button>
			<div class="flex flex-wrap gap-2">
				<Button onclick={() => (taps = [])} disabled={taps.length === 0}>
					<RotateCcw size={16} />
					{t('scan.retap')}
				</Button>
				<Button onclick={reset}>{t('scan.cancel')}</Button>
			</div>
		</div>
	{/if}

	{#if found}
		<div class="space-y-3">
			<p class="text-sm text-ink">{t('scan.found', { count: foundChars.length })}</p>
			{#if foundChars.length > 0}
				<div class="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5">
					{#each foundChars as char (char)}
						<div class="rounded-md border border-hairline bg-surface-card p-1 text-center">
							<svg viewBox="0 0 {PAD.size} {PAD.size}" class="w-full" role="img" aria-label={char}>
								{#each thumb(found[char]) as points, i (i)}
									<polyline
										{points}
										fill="none"
										class="stroke-ink"
										stroke-width="28"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								{/each}
							</svg>
							<span class="text-[11px] text-ink-mute">{char}</span>
						</div>
					{/each}
				</div>
				<Button variant="primary" onclick={apply}>{t('scan.apply')}</Button>
			{/if}
		</div>
	{/if}
</div>
