<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n.svelte.ts';
	import { Download, ImageUp, RotateCcw, Sparkles } from '@lucide/svelte';
	import { download, filenameFrom } from '#lib/download.ts';
	import { resolve } from '$app/paths';
	import { generateSvg, svgPrompt } from '#lib/ai/drawings.ts';
	import { buildPrompt, generateImage } from '#lib/ai/images.ts';
	import { aiSettings } from '#lib/ai/settings.svelte.ts';
	import Button from '#lib/components/Button.svelte';
	import DrawPanel from '#lib/components/DrawPanel.svelte';
	import { bounds, type Polyline } from '#lib/geometry/types.ts';
	import { loadGray } from '#lib/image/load.ts';
	import { imageSource } from '#lib/image/source.svelte.ts';
	import { traceImage, type Gray, type TraceMode } from '#lib/image/trace.ts';
	import { orderPaths } from '#lib/optimize/order.ts';
	import { settings } from '#lib/settings.svelte.ts';
	import { parseSvg } from '#lib/svg/parse.ts';

	const modes: [TraceMode, MessageKey, MessageKey][] = [
		['lines', 'image.lines', 'image.linesHint'],
		['outline', 'image.outline', 'image.outlineHint'],
		['hatch', 'image.hatch', 'image.hatchHint']
	];

	let mode = $state<TraceMode>('lines');
	let threshold = $state(140);
	let detail = $state(400);
	let sizePercent = $state(100);
	let hatchSpacing = $state(1.2);
	let fillHatch = $state(false);
	let gray = $state<Gray | undefined>();
	let loadError = $state('');
	let fileInput = $state<HTMLInputElement>();
	type Source = 'file' | 'ai-image' | 'ai-drawing';
	const sources: [Source, MessageKey, MessageKey][] = [
		['file', 'image.file', 'image.fileHint'],
		['ai-image', 'image.aiImage', 'image.aiImageHint'],
		['ai-drawing', 'image.aiDrawing', 'image.aiDrawingHint']
	];
	let source = $state<Source>('file');
	let prompt = $state('');
	let generating = $state(false);
	let generateError = $state('');

	function startOver() {
		imageSource.clear();
		gray = undefined;
		mode = 'lines';
		threshold = 140;
		detail = 400;
		sizePercent = 100;
		hatchSpacing = 1.2;
		fillHatch = false;
		prompt = '';
		loadError = '';
		generateError = '';
		if (fileInput) fileInput.value = '';
	}

	async function generate() {
		const idea = prompt.trim();
		if (!idea) return;
		generating = true;
		generateError = '';
		try {
			if (source === 'ai-drawing') {
				const system = svgPrompt(aiSettings.svgTemplate, printable.width, printable.height);
				imageSource.setSvg(
					await generateSvg(aiSettings.drawingConfig, system, idea),
					`AI: ${idea}`
				);
			} else {
				const blob = await generateImage(
					aiSettings.config,
					buildPrompt(aiSettings.promptTemplate, idea)
				);
				imageSource.set(blob, `AI: ${idea}`);
			}
		} catch (error) {
			generateError =
				error instanceof TypeError
					? t('image.noResponse')
					: error instanceof Error
						? error.message
						: String(error);
		} finally {
			generating = false;
		}
	}

	const sheet = $derived(settings.sheet);
	const printable = $derived({
		width: Math.max(0, sheet.width - 2 * settings.margin),
		height: Math.max(0, sheet.height - 2 * settings.margin)
	});

	const isVector = $derived(imageSource.svg !== undefined);
	const aiReady = $derived(
		source === 'ai-drawing' ? aiSettings.drawingReady : source === 'ai-image' && aiSettings.ready
	);

	const vector = $derived.by((): { lines: Polyline[]; error: string } => {
		if (imageSource.svg === undefined) return { lines: [], error: '' };
		try {
			return { lines: parseSvg(imageSource.svg), error: '' };
		} catch (error) {
			return { lines: [], error: error instanceof Error ? error.message : String(error) };
		}
	});

	$effect(() => {
		const blob = imageSource.blob;
		const side = detail;
		if (!blob || imageSource.svg !== undefined) return;
		loadError = '';
		loadGray(blob, side)
			.then((result) => (gray = result))
			.catch((error: unknown) => {
				loadError = error instanceof Error ? error.message : String(error);
			});
	});

	const scale = $derived(
		gray
			? (Math.min(printable.width / gray.width, printable.height / gray.height) * sizePercent) / 100
			: 1
	);

	function fitVector(lines: Polyline[]): Polyline[] {
		const box = bounds(lines);
		if (!box) return [];
		const width = Math.max(box.maxX - box.minX, 0.001);
		const height = Math.max(box.maxY - box.minY, 0.001);
		const factor =
			(Math.min(printable.width / width, printable.height / height) * sizePercent) / 100;
		const offsetX = settings.margin + (printable.width - width * factor) / 2;
		const offsetY = settings.margin;
		return orderPaths(
			lines.map((line) =>
				line.map((p) => ({
					x: offsetX + (p.x - box.minX) * factor,
					y: offsetY + (p.y - box.minY) * factor
				}))
			)
		);
	}

	const polylines = $derived.by((): Polyline[] => {
		if (isVector) return fitVector(vector.lines);
		if (!gray) return [];
		const lines = traceImage(gray, {
			mode,
			threshold,
			hatchSpacing: hatchSpacing / scale,
			simplify: 0.8,
			minLength: Math.max(1, 0.8 / scale),
			fill: fillHatch
				? { spacing: hatchSpacing / scale, minWidth: Math.max(3, 1.2 / scale) }
				: undefined
		});
		const offsetX = settings.margin + (printable.width - gray.width * scale) / 2;
		const offsetY = settings.margin;
		return orderPaths(
			lines.map((line) => line.map((p) => ({ x: offsetX + p.x * scale, y: offsetY + p.y * scale })))
		);
	});

	async function pick(files: FileList | null | undefined) {
		const file = files?.[0];
		if (!file) return;
		loadError = '';
		if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
			imageSource.setSvg(await file.text(), file.name);
		} else if (file.type.startsWith('image/')) {
			imageSource.set(file, file.name);
		} else {
			loadError = t('image.notImage');
		}
	}

	const label = 'mb-1.5 block text-[13px] font-medium text-ink-mute';
</script>

<main
	class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"
>
	<section class="space-y-5 rounded-lg border border-hairline bg-canvas p-6">
		<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">
			{t('image.title')}
		</h1>

		<div>
			<span class={label}>{t('image.source')}</span>
			<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
				{#each sources as [value, name] (value)}
					<button
						role="radio"
						aria-checked={source === value}
						class="rounded-pill px-3.5 py-1.5 text-sm {source === value
							? 'bg-canvas text-ink shadow-sm'
							: 'text-ink-mute'}"
						onclick={() => (source = value)}
					>
						{t(name)}
					</button>
				{/each}
			</div>
			<p class="mt-2 text-[13px] text-ink-mute">
				{t(sources.find(([value]) => value === source)?.[2] ?? 'image.fileHint')}
			</p>
		</div>

		<div>
			{#if source === 'file'}
				<input
					bind:this={fileInput}
					type="file"
					accept="image/*,.svg"
					class="hidden"
					onchange={(event) => void pick(event.currentTarget.files)}
				/>
				<div class="flex items-center gap-3">
					<Button onclick={() => fileInput?.click()}>
						<ImageUp size={16} />
						{t('image.choose')}
					</Button>
					<span class="min-w-0 truncate text-[13px] text-ink-mute">
						{imageSource.name || t('image.noFile')}
					</span>
				</div>
			{:else if !aiReady}
				<p class="rounded-md bg-surface-card p-3 text-sm text-ink">
					{source === 'ai-drawing' ? t('image.setupDrawingBefore') : t('image.setupBefore')}
					<a class="text-link underline" href={resolve('/settings')}>{t('image.setupLink')}</a>{t(
						'image.setupAfter'
					)}
				</p>
			{:else}
				<label class={label} for="prompt">
					{source === 'ai-drawing' ? t('image.drawingIdea') : t('image.imageIdea')}
				</label>
				<textarea
					id="prompt"
					bind:value={prompt}
					rows="3"
					placeholder={t('image.ideaPlaceholder')}
					class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-ink"
				></textarea>
				<div class="mt-2 flex items-center gap-3">
					<Button variant="primary" onclick={generate} disabled={generating || !prompt.trim()}>
						<Sparkles size={16} />
						{generating ? t('image.generating') : t('image.generate')}
					</Button>
					<span class="text-[13px] text-ink-mute">
						{source === 'ai-drawing' ? aiSettings.drawingModel : aiSettings.model}
					</span>
				</div>
				{#if generateError}
					<p class="mt-2 text-[13px] text-danger" role="alert">{generateError}</p>
				{/if}
			{/if}
			{#if imageSource.url}
				<img
					src={imageSource.url}
					alt={imageSource.name}
					class="mt-3 max-h-40 rounded-md border border-hairline"
				/>
				<div class="mt-3 flex flex-wrap gap-2">
					<Button
						onclick={() =>
							imageSource.blob &&
							download(
								imageSource.blob,
								filenameFrom(
									imageSource.name,
									isVector ? 'svg' : imageSource.blob.type.split('/')[1] || 'png'
								)
							)}
					>
						<Download size={16} />
						{isVector ? t('image.saveSource') : t('image.saveImage')}
					</Button>
					<Button onclick={startOver}>
						<RotateCcw size={16} />
						{t('image.startOver')}
					</Button>
				</div>
			{/if}
			{#if loadError || vector.error}
				<p class="mt-2 text-[13px] text-danger" role="alert">{loadError || vector.error}</p>
			{/if}
		</div>

		{#if isVector}
			<div>
				<label class={label} for="vector-size">{t('image.size', { value: sizePercent })}</label>
				<input
					id="vector-size"
					type="range"
					min="10"
					max="100"
					bind:value={sizePercent}
					class="w-full accent-primary"
				/>
				<p class="mt-2 text-[13px] text-ink-mute">
					{t('image.vectorHint')}
				</p>
			</div>
		{:else}
			<div>
				<span class={label}>{t('image.conversion')}</span>
				<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
					{#each modes as [value, name] (value)}
						<button
							role="radio"
							aria-checked={mode === value}
							class="rounded-pill px-3.5 py-1.5 text-sm {mode === value
								? 'bg-canvas text-ink shadow-sm'
								: 'text-ink-mute'}"
							onclick={() => (mode = value)}
						>
							{t(name)}
						</button>
					{/each}
				</div>
				<p class="mt-2 text-[13px] text-ink-mute">
					{t(modes.find(([value]) => value === mode)?.[2] ?? 'image.linesHint')}
				</p>
			</div>

			<div>
				<label class={label} for="threshold">{t('image.threshold', { value: threshold })}</label>
				<input
					id="threshold"
					type="range"
					min="20"
					max="240"
					bind:value={threshold}
					class="w-full accent-primary"
				/>
			</div>

			<div>
				<label class={label} for="size">{t('image.size', { value: sizePercent })}</label>
				<input
					id="size"
					type="range"
					min="10"
					max="100"
					bind:value={sizePercent}
					class="w-full accent-primary"
				/>
			</div>

			<div>
				<label class={label} for="detail">{t('image.detail', { value: detail })}</label>
				<input
					id="detail"
					type="range"
					min="150"
					max="800"
					step="50"
					bind:value={detail}
					class="w-full accent-primary"
				/>
			</div>

			{#if mode !== 'hatch'}
				<label class="flex items-start gap-2.5 text-sm text-ink">
					<input type="checkbox" class="mt-0.5 size-4 accent-primary" bind:checked={fillHatch} />
					<span>
						{t('image.fill')}
						<span class="block text-[13px] text-ink-mute">
							{t('image.fillHint')}
						</span>
					</span>
				</label>
			{/if}

			{#if mode === 'hatch' || fillHatch}
				<div>
					<label class={label} for="spacing">{t('image.spacing', { value: hatchSpacing })}</label>
					<input
						id="spacing"
						type="range"
						min="0.5"
						max="4"
						step="0.1"
						bind:value={hatchSpacing}
						class="w-full accent-primary"
					/>
				</div>
			{/if}
		{/if}
	</section>

	<section
		class="flex flex-col gap-4"
		aria-label={t('image.preview')}
		ondragover={(event) => event.preventDefault()}
		ondrop={(event) => {
			event.preventDefault();
			void pick(event.dataTransfer?.files);
		}}
	>
		<DrawPanel
			{polylines}
			{sheet}
			name={imageSource.name}
			source={imageSource.blob
				? { kind: isVector ? 'svg' : 'image', blob: imageSource.blob, name: imageSource.name }
				: undefined}
			emptyHint={t('image.empty')}
		/>
	</section>
</main>
