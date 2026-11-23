<script lang="ts">
	import { t } from '../i18n.svelte';
	import { ArrowDownToLine, ArrowUpFromLine } from '@lucide/svelte';
	import Button from './Button.svelte';
	import PaperFields from './PaperFields.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import { penDown, penUp } from '../grbl/commands';
	import { toSheet } from '../geometry/types';
	import { plotter } from '../serial/plotter.svelte';
	import { settings } from '../settings.svelte';

	let error = $state('');

	const connected = $derived(plotter.connection === 'connected');
	const running = $derived(plotter.busy || plotter.status?.state === 'Hold');
	const canAct = $derived(connected && !running);
	const position = $derived(
		plotter.position ? toSheet(plotter.position, settings.axes) : undefined
	);

	async function run(lines: string[]) {
		error = '';
		try {
			await plotter.sendAll(lines);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function changePenDepth() {
		if (canAct && plotter.penDown) await run(penDown(settings.penDownS));
	}

	const format = (value: number | undefined) => (value ?? 0).toFixed(1);
	const field = 'h-9 rounded-md border border-hairline bg-canvas px-2.5 text-sm text-ink';
</script>

<div class="border-b border-hairline-soft bg-surface-card">
	<div class="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 text-sm">
		<div class="flex items-center gap-2">
			<Button
				class="h-9! px-3!"
				onclick={() => run(penUp())}
				disabled={!canAct}
				aria-label={t('bar.penUp')}
			>
				<ArrowUpFromLine size={16} />
				{t('bar.up')}
			</Button>
			<Button
				class="h-9! px-3!"
				onclick={() => run(penDown(settings.penDownS))}
				disabled={!canAct}
				aria-label={t('bar.penDown')}
			>
				<ArrowDownToLine size={16} />
				{t('bar.down')}
			</Button>
			<label class="flex items-center gap-1.5 text-ink-mute" for="pen-depth">
				{t('bar.depth')}
				<input
					id="pen-depth"
					type="number"
					min="0"
					max="1000"
					step="5"
					bind:value={settings.penDownS}
					onchange={changePenDepth}
					class="{field} w-20"
				/>
			</label>
		</div>

		<div class="font-mono text-ink" aria-label={t('bar.position')}>
			X {format(position?.x)} · Y {format(position?.y)} mm
		</div>

		<PaperFields idPrefix="bar" />

		<div class="ml-auto flex items-center gap-2">
			<StatusBadge />
		</div>

		{#if error}
			<p class="basis-full text-danger" role="alert">{error}</p>
		{/if}
	</div>
</div>
