<script lang="ts">
	import { OctagonX, Pause, PenLine, Play } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import SheetPreview from '#lib/components/SheetPreview.svelte';
	import { estimateSeconds, outsideArea, toGcode } from '#lib/gcode/fromPolylines.ts';
	import { PAPER_FORMATS, sheetSize, type Orientation } from '#lib/geometry/paper.ts';
	import { orient, translate } from '#lib/geometry/types.ts';
	import { REALTIME, VGX4 } from '#lib/grbl/vgx4.ts';
	import { plotter } from '#lib/serial/plotter.svelte.ts';
	import { settings } from '#lib/settings.svelte.ts';
	import { fonts, layoutText, type Align } from '#lib/text/layout.ts';

	let text = $state('Alles Gute zum Geburtstag!');
	let fontId = $state(fonts[0].id);
	let size = $state(8);
	let lineHeight = $state(1.4);
	let align = $state<Align>('left');
	let drawError = $state('');

	const font = $derived(fonts.find((f) => f.id === fontId) ?? fonts[0]);
	const format = $derived(
		PAPER_FORMATS.find((f) => f.id === settings.formatId) ?? PAPER_FORMATS[0]
	);
	const sheet = $derived(sheetSize(format, settings.orientation));
	const margin = $derived(settings.margin);
	const polylines = $derived(
		translate(
			layoutText(text, { font, size, lineHeight, align, width: sheet.width - 2 * margin }),
			margin,
			margin
		)
	);
	const outsideSheet = $derived(outsideArea(polylines, sheet.width, sheet.height));
	const outsideMachine = $derived(outsideArea(polylines, VGX4.areaWidth, VGX4.areaHeight));
	const minutes = $derived(Math.ceil(estimateSeconds(polylines) / 60));
	const running = $derived(plotter.busy || plotter.status?.state === 'Hold');
	const canDraw = $derived(
		plotter.connection === 'connected' &&
			!running &&
			polylines.length > 0 &&
			!outsideSheet &&
			!outsideMachine
	);

	async function draw() {
		drawError = '';
		try {
			await plotter.sendAll(toGcode(polylines, settings));
		} catch (error) {
			drawError = error instanceof Error ? error.message : String(error);
		}
	}

	const field = 'h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-ink';
	const label = 'mb-1.5 block text-[13px] font-medium text-ink-mute';
</script>

<main
	class="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"
>
	<section class="space-y-5 rounded-lg border border-hairline bg-canvas p-6">
		<h1 class="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">Text setzen</h1>

		<div>
			<label class={label} for="text">Text</label>
			<textarea
				id="text"
				bind:value={text}
				rows="5"
				class="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-ink"
			></textarea>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div class="col-span-2">
				<label class={label} for="font">Schrift</label>
				<select id="font" bind:value={fontId} class={field}>
					{#each fonts as option (option.id)}
						<option value={option.id}>{option.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class={label} for="size">Grösse (mm)</label>
				<input
					id="size"
					type="number"
					min="2"
					max="80"
					step="0.5"
					bind:value={size}
					class={field}
				/>
			</div>
			<div>
				<label class={label} for="line-height">Zeilenabstand</label>
				<input
					id="line-height"
					type="number"
					min="0.8"
					max="3"
					step="0.1"
					bind:value={lineHeight}
					class={field}
				/>
			</div>
		</div>

		<div>
			<span class={label}>Ausrichtung</span>
			<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
				{#each [['left', 'Links'], ['center', 'Mitte'], ['right', 'Rechts']] as [value, name] (value)}
					<button
						role="radio"
						aria-checked={align === value}
						class="rounded-pill px-3.5 py-1.5 text-sm {align === value
							? 'bg-canvas text-ink shadow-sm'
							: 'text-ink-mute'}"
						onclick={() => (align = value as Align)}
					>
						{name}
					</button>
				{/each}
			</div>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class={label} for="format">Papier</label>
				<select id="format" bind:value={settings.formatId} class={field}>
					{#each PAPER_FORMATS as option (option.id)}
						<option value={option.id}>{option.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class={label} for="margin">Rand (mm)</label>
				<input
					id="margin"
					type="number"
					min="0"
					max="60"
					step="1"
					bind:value={settings.margin}
					class={field}
				/>
			</div>
			<div class="col-span-2">
				<span class={label}>Lage</span>
				<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
					{#each [['portrait', 'Hoch'], ['landscape', 'Quer']] as [value, name] (value)}
						<button
							role="radio"
							aria-checked={settings.orientation === value}
							class="rounded-pill px-3.5 py-1.5 text-sm {settings.orientation === value
								? 'bg-canvas text-ink shadow-sm'
								: 'text-ink-mute'}"
							onclick={() => (settings.orientation = value as Orientation)}
						>
							{name}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<div class="rounded-lg border border-hairline bg-canvas p-6">
			<SheetPreview
				width={sheet.width}
				height={sheet.height}
				{margin}
				{polylines}
				pen={running && plotter.position ? orient(plotter.position, settings.invertY) : undefined}
			/>
		</div>

		<div class="flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-canvas p-6">
			{#if running}
				{#if plotter.status?.state === 'Hold'}
					<Button onclick={() => plotter.realtime(REALTIME.cycleStart)}>
						<Play size={16} /> Weiter
					</Button>
				{:else}
					<Button onclick={() => plotter.realtime(REALTIME.feedHold)}>
						<Pause size={16} /> Pause
					</Button>
				{/if}
				<Button variant="stop" onclick={() => plotter.realtime(REALTIME.softReset)}>
					<OctagonX size={16} /> Stopp
				</Button>
			{:else}
				<Button variant="primary" onclick={draw} disabled={!canDraw}>
					<PenLine size={16} /> Zeichnen
				</Button>
			{/if}
			<span class="text-sm text-ink-mute">
				{sheet.width} × {sheet.height} mm · ca. {minutes} min
			</span>
			<div class="basis-full text-sm">
				{#if outsideSheet}
					<p class="text-danger" role="alert">
						Der Text passt nicht aufs Blatt. Grösse oder Rand verkleinern.
					</p>
				{:else if outsideMachine}
					<p class="text-danger" role="alert">
						Der Text reicht über die Zeichenfläche des Plotters hinaus.
					</p>
				{:else if plotter.connection !== 'connected'}
					<p class="text-ink-mute">Verbinde den Plotter, um zu zeichnen.</p>
				{:else}
					<p class="text-ink-mute">
						Der rote Punkt ist der Nullpunkt. Fahre den Stift auf der
						<a class="text-link underline" href={resolve('/')}>Maschinen-Seite</a> an die obere linke
						Ecke des Blatts und setze dort den Nullpunkt.
					</p>
				{/if}
				{#if drawError}
					<p class="mt-2 text-danger" role="alert">{drawError}</p>
				{/if}
			</div>
		</div>
	</section>
</main>
