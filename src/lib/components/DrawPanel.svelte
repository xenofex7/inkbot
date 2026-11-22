<script lang="ts">
	import { Download, OctagonX, Pause, PenLine, Play } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import Button from './Button.svelte';
	import SheetPreview from './SheetPreview.svelte';
	import { estimateSeconds, outsideArea, toGcode } from '../gcode/fromPolylines';
	import { orient, type Polyline } from '../geometry/types';
	import { REALTIME, VGX4 } from '../grbl/vgx4';
	import { download, filenameFrom } from '../download';
	import { toSvg } from '../geometry/svg';
	import { plotter } from '../serial/plotter.svelte';
	import { settings } from '../settings.svelte';

	let {
		polylines,
		sheet,
		name = 'inkbot',
		emptyHint = 'Nothing to draw yet.'
	}: {
		polylines: Polyline[];
		sheet: { width: number; height: number };
		name?: string;
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

	function saveSvg() {
		const svg = toSvg(polylines, sheet.width, sheet.height);
		download(new Blob([svg], { type: 'image/svg+xml' }), filenameFrom(name, 'svg'));
	}

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
				<Play size={16} /> Resume
			</Button>
		{:else}
			<Button onclick={() => plotter.realtime(REALTIME.feedHold)}>
				<Pause size={16} /> Pause
			</Button>
		{/if}
		<Button variant="stop" onclick={() => plotter.realtime(REALTIME.softReset)}>
			<OctagonX size={16} /> Stop
		</Button>
	{:else}
		<Button variant="primary" onclick={draw} disabled={!canDraw}>
			<PenLine size={16} /> Draw
		</Button>
	{/if}
	<Button onclick={saveSvg} disabled={polylines.length === 0}>
		<Download size={16} /> Save SVG
	</Button>
	<span class="text-sm text-ink-mute">
		{sheet.width} × {sheet.height} mm · {polylines.length} strokes · approx. {minutes} min
	</span>
	<div class="basis-full text-sm">
		{#if polylines.length === 0}
			<p class="text-ink-mute">{emptyHint}</p>
		{:else if outsideSheet}
			<p class="text-danger" role="alert">
				The drawing does not fit on the sheet. Reduce the size or the margin.
			</p>
		{:else if outsideMachine}
			<p class="text-danger" role="alert">The drawing reaches beyond the plotter's drawing area.</p>
		{:else if plotter.connection !== 'connected'}
			<p class="text-ink-mute">Connect the plotter to draw.</p>
		{:else}
			<p class="text-ink-mute">
				The red dot is the origin. On the
				<a class="text-link underline" href={resolve('/')}>machine page</a>, move the pen to the top
				left corner of the sheet and set the origin there.
			</p>
		{/if}
		{#if drawError}
			<p class="mt-2 text-danger" role="alert">{drawError}</p>
		{/if}
	</div>
</div>
