<script lang="ts">
	import { OctagonX, Pause, PenLine, Play } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import Button from './Button.svelte';
	import SheetPreview from './SheetPreview.svelte';
	import { estimateSeconds, outsideArea, toGcode } from '../gcode/fromPolylines';
	import { orient, type Polyline } from '../geometry/types';
	import { REALTIME, VGX4 } from '../grbl/vgx4';
	import { plotter } from '../serial/plotter.svelte';
	import { settings } from '../settings.svelte';

	let {
		polylines,
		sheet,
		emptyHint = 'Noch nichts zu zeichnen.'
	}: {
		polylines: Polyline[];
		sheet: { width: number; height: number };
		emptyHint?: string;
	} = $props();

	let drawError = $state('');

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
</script>

<div class="rounded-lg border border-hairline bg-canvas p-6">
	<SheetPreview
		width={sheet.width}
		height={sheet.height}
		margin={settings.margin}
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
		{sheet.width} × {sheet.height} mm · {polylines.length} Striche · ca. {minutes} min
	</span>
	<div class="basis-full text-sm">
		{#if polylines.length === 0}
			<p class="text-ink-mute">{emptyHint}</p>
		{:else if outsideSheet}
			<p class="text-danger" role="alert">
				Die Zeichnung passt nicht aufs Blatt. Grösse oder Rand verkleinern.
			</p>
		{:else if outsideMachine}
			<p class="text-danger" role="alert">
				Die Zeichnung reicht über die Zeichenfläche des Plotters hinaus.
			</p>
		{:else if plotter.connection !== 'connected'}
			<p class="text-ink-mute">Verbinde den Plotter, um zu zeichnen.</p>
		{:else}
			<p class="text-ink-mute">
				Der rote Punkt ist der Nullpunkt. Fahre den Stift auf der
				<a class="text-link underline" href={resolve('/')}>Maschinen-Seite</a> an die obere linke Ecke
				des Blatts und setze dort den Nullpunkt.
			</p>
		{/if}
		{#if drawError}
			<p class="mt-2 text-danger" role="alert">{drawError}</p>
		{/if}
	</div>
</div>
