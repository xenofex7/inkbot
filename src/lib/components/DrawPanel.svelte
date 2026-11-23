<script lang="ts">
	import { strokes, t } from '../i18n.svelte';
	import {
		BookmarkPlus,
		Download,
		OctagonX,
		Pause,
		PenLine,
		Play,
		TriangleAlert
	} from '@lucide/svelte';
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
	import { gallery } from '../gallery/store.svelte';

	let {
		polylines,
		sheet,
		name = 'inkbot',
		saveable = true,
		showPreview = true,
		emptyHint = ''
	}: {
		polylines: Polyline[];
		sheet: { width: number; height: number };
		name?: string;
		saveable?: boolean;
		showPreview?: boolean;
		emptyHint?: string;
	} = $props();

	let drawError = $state('');
	let saveState = $state<'idle' | 'saving' | 'saved'>('idle');

	$effect(() => {
		void polylines;
		saveState = 'idle';
	});

	async function saveToGallery() {
		saveState = 'saving';
		try {
			await gallery.add({
				name: name.trim() || t('job.untitled'),
				formatId: settings.formatId,
				orientation: settings.orientation,
				margin: settings.margin,
				sheet: { width: sheet.width, height: sheet.height },
				polylines
			});
			saveState = 'saved';
		} catch (error) {
			saveState = 'idle';
			drawError = error instanceof Error ? error.message : String(error);
		}
	}

	const outsideSheet = $derived(outsideArea(polylines, sheet.width, sheet.height));
	const outsideMachine = $derived(outsideArea(polylines, VGX4.areaWidth, VGX4.areaHeight));
	const minutes = $derived(Math.ceil(estimateSeconds(polylines) / 60));
	const running = $derived(plotter.busy || plotter.status?.state === 'Hold');
	const canDraw = $derived(
		plotter.connection === 'connected' && !running && polylines.length > 0 && !outsideMachine
	);

	function saveSvg() {
		const svg = toSvg(polylines, sheet.width, sheet.height);
		download(new Blob([svg], { type: 'image/svg+xml' }), filenameFrom(name, 'svg'));
	}

	async function draw() {
		if (outsideSheet && !confirm(t('job.outsideSheetConfirm'))) return;
		drawError = '';
		try {
			await plotter.sendAll(toGcode(polylines, settings));
		} catch (error) {
			drawError = error instanceof Error ? error.message : String(error);
		}
	}
</script>

{#if showPreview}
	<div class="rounded-lg border border-hairline bg-canvas p-6">
		<SheetPreview
			width={sheet.width}
			height={sheet.height}
			margin={settings.margin}
			{polylines}
			pen={running && plotter.position ? orient(plotter.position, settings.invertY) : undefined}
		/>
	</div>
{/if}

<div class="flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-canvas p-6">
	{#if running}
		{#if plotter.status?.state === 'Hold'}
			<Button onclick={() => plotter.realtime(REALTIME.cycleStart)}>
				<Play size={16} />
				{t('job.resume')}
			</Button>
		{:else}
			<Button onclick={() => plotter.realtime(REALTIME.feedHold)}>
				<Pause size={16} />
				{t('job.pause')}
			</Button>
		{/if}
		<Button variant="stop" onclick={() => plotter.realtime(REALTIME.softReset)}>
			<OctagonX size={16} />
			{t('job.stop')}
		</Button>
	{:else}
		<Button variant="primary" onclick={draw} disabled={!canDraw}>
			<PenLine size={16} />
			{t('job.draw')}
		</Button>
	{/if}
	<Button onclick={saveSvg} disabled={polylines.length === 0}>
		<Download size={16} />
		{t('job.saveSvg')}
	</Button>
	{#if saveable}
		<Button onclick={saveToGallery} disabled={polylines.length === 0 || saveState !== 'idle'}>
			<BookmarkPlus size={16} />
			{saveState === 'saved' ? t('job.saved') : t('job.saveGallery')}
		</Button>
	{/if}
	<span class="text-sm text-ink-mute">
		{sheet.width} × {sheet.height} mm · {strokes(polylines.length)} · {t('job.approx', { minutes })}
	</span>
	<div class="basis-full text-sm">
		{#if polylines.length === 0}
			<p class="text-ink-mute">{emptyHint || t('job.empty')}</p>
		{:else if outsideMachine}
			<p class="text-danger" role="alert">{t('job.outsideMachine')}</p>
		{:else}
			{#if outsideSheet}
				<p class="mb-2 flex items-center gap-2 text-ink">
					<TriangleAlert size={16} class="shrink-0 text-warning" />
					{t('job.outsideSheet')}
				</p>
			{/if}
			{#if plotter.connection !== 'connected'}
				<p class="text-ink-mute">{t('job.connectFirst')}</p>
			{:else}
				<p class="text-ink-mute">
					{t('job.originBefore')}
					<a class="text-link underline" href={resolve('/')}>{t('job.originLink')}</a>{t(
						'job.originAfter'
					)}
				</p>
			{/if}
		{/if}
		{#if drawError}
			<p class="mt-2 text-danger" role="alert">{drawError}</p>
		{/if}
	</div>
</div>
