<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Copy,
		Download,
		ImagePlus,
		LibraryBig,
		RotateCcw,
		RotateCw,
		Sparkles,
		Trash2,
		Type
	} from '@lucide/svelte';
	import type { AiResult } from '#lib/ai/result.ts';
	import AiGenerator from '#lib/components/AiGenerator.svelte';
	import Button from '#lib/components/Button.svelte';
	import DesignCanvas from '#lib/components/DesignCanvas.svelte';
	import DrawPanel from '#lib/components/DrawPanel.svelte';
	import PaperFields from '#lib/components/PaperFields.svelte';
	import RangeField from '#lib/components/RangeField.svelte';
	import SheetPreview from '#lib/components/SheetPreview.svelte';
	import {
		design,
		type DesignElement,
		type RasterElement,
		type TextOptions,
		type TraceOptions
	} from '#lib/design/store.svelte.ts';
	import { download, filenameFrom } from '#lib/download.ts';
	import { gallery } from '#lib/gallery/store.svelte.ts';
	import { orient } from '#lib/geometry/types.ts';
	import { t, type MessageKey } from '#lib/i18n.svelte.ts';
	import type { TraceMode } from '#lib/image/trace.ts';
	import { plotter } from '#lib/serial/plotter.svelte.ts';
	import { settings } from '#lib/settings.svelte.ts';
	import { parseSvg } from '#lib/svg/parse.ts';
	import { fonts, type Align } from '#lib/text/layout.ts';
	import { handwriting } from '#lib/handwriting/store.svelte.ts';

	let panel = $state<'none' | 'ai' | 'gallery'>('none');
	let error = $state('');
	let fileInput = $state<HTMLInputElement>();

	const sheet = $derived(settings.sheet);
	const area = $derived({
		x: settings.margin,
		y: settings.margin,
		width: Math.max(1, sheet.width - 2 * settings.margin),
		height: Math.max(1, sheet.height - 2 * settings.margin)
	});
	const selected = $derived(design.selected);
	const running = $derived(plotter.busy || plotter.status?.state === 'Hold');

	onMount(() => {
		void gallery.load();
		void handwriting.load();
	});

	function fail(e: unknown) {
		error =
			e instanceof TypeError ? t('image.noResponse') : e instanceof Error ? e.message : String(e);
	}

	function addText() {
		error = '';
		design.addText(
			{ text: t('design.newText'), fontId: fonts[0].id, size: 8, lineHeight: 1.4, align: 'center' },
			area
		);
	}

	async function addFile(files: FileList | null | undefined) {
		const file = files?.[0];
		if (!file) return;
		error = '';
		try {
			await design.addFile(file, area);
		} catch (e) {
			fail(e);
		} finally {
			if (fileInput) fileInput.value = '';
		}
	}

	async function useAi(result: AiResult) {
		error = '';
		try {
			if (result.kind === 'svg') design.addVector(parseSvg(result.svg), result.name, area);
			else await design.addRaster(result.blob, result.name, area);
			panel = 'none';
		} catch (e) {
			fail(e);
		}
	}

	function retrace(element: RasterElement, change: Partial<TraceOptions>) {
		error = '';
		design.updateTrace(element.id, { ...element.trace, ...change }).catch(fail);
	}

	function saveSource(element: DesignElement) {
		const blob =
			element.kind === 'raster'
				? element.blob
				: element.kind === 'vector'
					? element.source
					: undefined;
		if (!blob) return;
		const extension = blob.type === 'image/svg+xml' ? 'svg' : blob.type.split('/')[1] || 'png';
		download(blob, filenameFrom(element.name, extension));
	}

	function updateText(element: DesignElement, change: Partial<TextOptions>) {
		if (element.kind !== 'text') return;
		design.updateText(element.id, { ...element.options, ...change });
	}

	const kinds: Record<DesignElement['kind'], MessageKey> = {
		text: 'design.kindText',
		raster: 'design.kindRaster',
		vector: 'design.kindVector'
	};
	const modes: [TraceMode, MessageKey, MessageKey][] = [
		['lines', 'image.lines', 'image.linesHint'],
		['outline', 'image.outline', 'image.outlineHint'],
		['hatch', 'image.hatch', 'image.hatchHint']
	];
	const aligns: [Align, MessageKey][] = [
		['left', 'text.left'],
		['center', 'text.centre'],
		['right', 'text.right']
	];

	const field = 'h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-ink';
	const label = 'mb-1.5 block text-[13px] font-medium text-ink-mute';
	const pill = (active: boolean) =>
		`rounded-pill px-3.5 py-1.5 text-sm ${active ? 'bg-canvas text-ink shadow-sm' : 'text-ink-mute'}`;
</script>

<main
	class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"
>
	<div class="flex flex-col gap-6">
		<section class="space-y-5 rounded-lg border border-hairline bg-canvas p-6">
			<div class="flex items-center justify-between gap-3">
				<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
					{t('design.title')}
				</h1>
				{#if design.elements.length}
					<Button class="h-8! px-3!" onclick={() => design.clear()}>
						<RotateCcw size={14} />
						{t('design.clear')}
					</Button>
				{/if}
			</div>

			<div>
				<span class={label}>{t('bar.paper')}</span>
				<PaperFields idPrefix="design" />
			</div>

			<div>
				<span class={label}>{t('design.add')}</span>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/*,.svg"
					class="hidden"
					onchange={(event) => void addFile(event.currentTarget.files)}
				/>
				<div class="flex flex-wrap gap-2">
					<Button onclick={addText}><Type size={16} /> {t('design.addText')}</Button>
					<Button onclick={() => fileInput?.click()}>
						<ImagePlus size={16} />
						{t('design.addFile')}
					</Button>
					<Button onclick={() => (panel = panel === 'ai' ? 'none' : 'ai')}>
						<Sparkles size={16} />
						{t('design.addAi')}
					</Button>
					<Button onclick={() => (panel = panel === 'gallery' ? 'none' : 'gallery')}>
						<LibraryBig size={16} />
						{t('design.addGallery')}
					</Button>
				</div>
			</div>

			{#if panel === 'ai'}
				<div class="rounded-lg bg-surface-card p-4">
					<AiGenerator {area} onuse={useAi} />
				</div>
			{/if}

			{#if panel === 'gallery'}
				<div class="rounded-lg bg-surface-card p-4">
					{#if gallery.items.length === 0}
						<p class="text-sm text-ink-mute">{t('design.galleryEmpty')}</p>
					{:else}
						<ul class="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
							{#each gallery.items as item (item.id)}
								<li>
									<button
										class="w-full rounded-md border border-hairline bg-canvas p-1 text-left"
										onclick={() => {
											design.addVector(item.polylines, item.name, area);
											panel = 'none';
										}}
									>
										<SheetPreview
											width={item.sheet.width}
											height={item.sheet.height}
											margin={item.margin}
											polylines={item.polylines}
										/>
										<span class="block truncate px-1 text-[12px] text-ink">{item.name}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}

			{#if error}
				<p class="text-[13px] text-danger" role="alert">{error}</p>
			{/if}
		</section>

		<section class="space-y-3 rounded-lg border border-hairline bg-canvas p-6">
			<div>
				<h2 class="font-semibold text-ink">{t('design.elements')}</h2>
				{#if design.elements.length === 0}
					<p class="text-sm text-ink-mute">{t('design.empty')}</p>
				{:else}
					<ul class="divide-y divide-hairline-soft">
						{#each design.elements as element (element.id)}
							<li class="flex items-center gap-2 py-1.5">
								<button
									class="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm {design.selectedId ===
									element.id
										? 'bg-surface-soft text-ink'
										: 'text-ink-soft'}"
									onclick={() => (design.selectedId = element.id)}
								>
									<span class="text-ink-mute">{t(kinds[element.kind])}</span> · {element.name}
								</button>
								<Button
									variant="icon"
									class="size-8!"
									aria-label={t('design.duplicate')}
									onclick={() => design.duplicate(element.id)}
								>
									<Copy size={14} />
								</Button>
								<Button
									variant="icon"
									class="size-8!"
									aria-label={t('design.remove')}
									onclick={() => design.remove(element.id)}
								>
									<Trash2 size={14} />
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		{#if selected}
			<section class="space-y-4 rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">{t('design.selected')}</h2>
				<div>
					<RangeField
						id="design-scale"
						label={t('design.scale', { value: Math.round(selected.scale * 100) })}
						value={Math.round(selected.scale * 100)}
						min={5}
						max={400}
						buttonStep={5}
						onvalue={(value) => design.move(selected.id, { ...selected, scale: value / 100 })}
					/>
				</div>
				<Button onclick={() => design.rotate(selected.id)}>
					<RotateCw size={16} />
					{t('design.rotate')}
				</Button>

				{#if selected.kind === 'text'}
					<div>
						<label class={label} for="design-text">{t('text.text')}</label>
						<textarea
							id="design-text"
							rows="3"
							value={selected.options.text}
							oninput={(event) => updateText(selected, { text: event.currentTarget.value })}
							class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-ink"
						></textarea>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="col-span-2">
							<label class={label} for="design-font">{t('text.font')}</label>
							<select
								id="design-font"
								value={selected.options.fontId}
								onchange={(event) => updateText(selected, { fontId: event.currentTarget.value })}
								class={field}
							>
								{#each handwriting.allFonts as option (option.id)}
									<option value={option.id}>{option.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class={label} for="design-size">{t('text.size')}</label>
							<input
								id="design-size"
								type="number"
								min="2"
								max="80"
								step="0.5"
								value={selected.options.size}
								oninput={(event) =>
									updateText(selected, { size: Number(event.currentTarget.value) || 1 })}
								class={field}
							/>
						</div>
						<div>
							<label class={label} for="design-line">{t('text.lineHeight')}</label>
							<input
								id="design-line"
								type="number"
								min="0.8"
								max="3"
								step="0.1"
								value={selected.options.lineHeight}
								oninput={(event) =>
									updateText(selected, { lineHeight: Number(event.currentTarget.value) || 1 })}
								class={field}
							/>
						</div>
					</div>
					<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
						{#each aligns as [value, key] (value)}
							<button
								role="radio"
								aria-checked={selected.options.align === value}
								class={pill(selected.options.align === value)}
								onclick={() => updateText(selected, { align: value })}
							>
								{t(key)}
							</button>
						{/each}
					</div>
				{:else if selected.kind === 'raster'}
					{@const raster = selected}
					<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
						{#each modes as [value, key] (value)}
							<button
								role="radio"
								aria-checked={raster.trace.mode === value}
								class={pill(raster.trace.mode === value)}
								onclick={() => retrace(raster, { mode: value })}
							>
								{t(key)}
							</button>
						{/each}
					</div>
					<p class="text-[13px] text-ink-mute">
						{t(modes.find(([value]) => value === raster.trace.mode)?.[2] ?? 'image.linesHint')}
					</p>
					<RangeField
						id="design-threshold"
						label={t('image.threshold', { value: raster.trace.threshold })}
						value={raster.trace.threshold}
						min={20}
						max={240}
						buttonStep={5}
						live={false}
						onvalue={(value: number) => retrace(raster, { threshold: value })}
					/>
					<RangeField
						id="design-detail"
						label={t('image.detail', { value: raster.trace.detail })}
						value={raster.trace.detail}
						min={150}
						max={800}
						step={50}
						live={false}
						onvalue={(value: number) => retrace(raster, { detail: value })}
					/>
					{#if raster.trace.mode !== 'hatch'}
						<label class="flex items-start gap-2.5 text-sm text-ink">
							<input
								type="checkbox"
								class="mt-0.5 size-4 accent-primary"
								checked={raster.trace.fill}
								onchange={(event) => retrace(raster, { fill: event.currentTarget.checked })}
							/>
							<span>
								{t('image.fill')}
								<span class="block text-[13px] text-ink-mute">{t('image.fillHint')}</span>
							</span>
						</label>
					{/if}
					{#if raster.trace.mode === 'hatch' || raster.trace.fill}
						<RangeField
							id="design-spacing"
							label={t('image.spacing', { value: raster.trace.spacing })}
							value={raster.trace.spacing}
							min={0.5}
							max={4}
							step={0.1}
							live={false}
							onvalue={(value: number) => retrace(raster, { spacing: value })}
						/>
					{/if}
				{/if}
				{#if selected.kind === 'raster' || (selected.kind === 'vector' && selected.source)}
					<Button onclick={() => saveSource(selected)}>
						<Download size={16} />
						{selected.kind === 'raster' ? t('image.saveImage') : t('image.saveSource')}
					</Button>
				{/if}
			</section>
		{/if}
	</div>

	<section
		class="flex flex-col gap-4"
		aria-label={t('image.preview')}
		ondragover={(event) => event.preventDefault()}
		ondrop={(event) => {
			event.preventDefault();
			void addFile(event.dataTransfer?.files);
		}}
	>
		<div class="rounded-lg border border-hairline bg-canvas p-6">
			<DesignCanvas
				width={sheet.width}
				height={sheet.height}
				margin={settings.margin}
				pen={running && plotter.position ? orient(plotter.position, settings.invertY) : undefined}
			/>
			<p class="mt-3 text-[13px] text-ink-mute">{t('design.hint')}</p>
		</div>
		<DrawPanel
			polylines={design.polylines}
			{sheet}
			name={t('design.card')}
			showPreview={false}
			emptyHint={t('design.empty')}
		/>
	</section>
</main>
