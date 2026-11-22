<script lang="ts">
	import { ImageUp } from '@lucide/svelte';
	import Button from '#lib/components/Button.svelte';
	import DrawPanel from '#lib/components/DrawPanel.svelte';
	import type { Polyline } from '#lib/geometry/types.ts';
	import { loadGray } from '#lib/image/load.ts';
	import { imageSource } from '#lib/image/source.svelte.ts';
	import { traceImage, type Gray, type TraceMode } from '#lib/image/trace.ts';
	import { orderPaths } from '#lib/optimize/order.ts';
	import { settings } from '#lib/settings.svelte.ts';

	const modes: [TraceMode, string, string][] = [
		['lines', 'Linien', 'Mittellinie dunkler Striche, ideal für Strichzeichnungen'],
		['outline', 'Umriss', 'Kontur dunkler Flächen'],
		['hatch', 'Schraffur', 'Helligkeit als Schraffur, für Fotos']
	];

	let mode = $state<TraceMode>('lines');
	let threshold = $state(140);
	let detail = $state(400);
	let sizePercent = $state(100);
	let hatchSpacing = $state(1.2);
	let gray = $state<Gray | undefined>();
	let loadError = $state('');
	let fileInput = $state<HTMLInputElement>();

	const sheet = $derived(settings.sheet);
	const printable = $derived({
		width: Math.max(0, sheet.width - 2 * settings.margin),
		height: Math.max(0, sheet.height - 2 * settings.margin)
	});

	$effect(() => {
		const blob = imageSource.blob;
		const side = detail;
		if (!blob) return;
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

	const polylines = $derived.by((): Polyline[] => {
		if (!gray) return [];
		const lines = traceImage(gray, {
			mode,
			threshold,
			hatchSpacing: hatchSpacing / scale,
			simplify: 0.8,
			minLength: Math.max(1, 0.8 / scale)
		});
		const offsetX = settings.margin + (printable.width - gray.width * scale) / 2;
		const offsetY = settings.margin;
		return orderPaths(
			lines.map((line) => line.map((p) => ({ x: offsetX + p.x * scale, y: offsetY + p.y * scale })))
		);
	});

	function pick(files: FileList | null | undefined) {
		const file = files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			loadError = 'Das ist keine Bilddatei.';
			return;
		}
		imageSource.set(file, file.name);
	}

	const label = 'mb-1.5 block text-[13px] font-medium text-ink-mute';
</script>

<main
	class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"
>
	<section class="space-y-5 rounded-lg border border-hairline bg-canvas p-6">
		<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">Bild zeichnen</h1>

		<div>
			<span class={label}>Bild</span>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				class="hidden"
				onchange={(event) => pick(event.currentTarget.files)}
			/>
			<div class="flex items-center gap-3">
				<Button onclick={() => fileInput?.click()}>
					<ImageUp size={16} /> Datei wählen
				</Button>
				<span class="min-w-0 truncate text-[13px] text-ink-mute">
					{imageSource.name || 'Keine Datei gewählt'}
				</span>
			</div>
			{#if imageSource.url}
				<img
					src={imageSource.url}
					alt="Gewähltes Bild"
					class="mt-3 max-h-40 rounded-md border border-hairline"
				/>
			{/if}
			{#if loadError}
				<p class="mt-2 text-[13px] text-danger" role="alert">{loadError}</p>
			{/if}
		</div>

		<div>
			<span class={label}>Umwandlung</span>
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
						{name}
					</button>
				{/each}
			</div>
			<p class="mt-2 text-[13px] text-ink-mute">
				{modes.find(([value]) => value === mode)?.[2]}
			</p>
		</div>

		<div>
			<label class={label} for="threshold">Schwelle: {threshold}</label>
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
			<label class={label} for="size">Grösse: {sizePercent} %</label>
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
			<label class={label} for="detail">Detail: {detail} px</label>
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

		{#if mode === 'hatch'}
			<div>
				<label class={label} for="spacing">Linienabstand: {hatchSpacing} mm</label>
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
	</section>

	<section
		class="flex flex-col gap-4"
		aria-label="Vorschau"
		ondragover={(event) => event.preventDefault()}
		ondrop={(event) => {
			event.preventDefault();
			pick(event.dataTransfer?.files);
		}}
	>
		<DrawPanel {polylines} {sheet} emptyHint="Wähle ein Bild oder zieh es auf die Vorschau." />
	</section>
</main>
