<script lang="ts">
	import { asset } from '$app/paths';
	import { t } from '#lib/i18n.svelte.ts';
	import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Square } from '@lucide/svelte';
	import Button from '#lib/components/Button.svelte';
	import { jog, setOrigin, testSquare } from '#lib/grbl/commands.ts';
	import { plotter } from '#lib/serial/plotter.svelte.ts';
	import { settings } from '#lib/settings.svelte.ts';

	const steps = [1, 5, 10] as const;
	let step = $state<(typeof steps)[number]>(5);
	let consoleLine = $state('');
	let actionError = $state('');
	let logView = $state<HTMLElement>();

	const connected = $derived(plotter.connection === 'connected');
	const canAct = $derived(connected && !plotter.busy);

	$effect(() => {
		void plotter.log.length;
		logView?.scrollTo({ top: logView.scrollHeight });
	});

	async function run(lines: string[]) {
		actionError = '';
		try {
			await plotter.sendAll(lines);
		} catch (error) {
			actionError = error instanceof Error ? error.message : String(error);
		}
	}

	async function sendConsole(event: SubmitEvent) {
		event.preventDefault();
		const line = consoleLine.trim();
		if (!line) return;
		consoleLine = '';
		await run([line]);
	}
</script>

<main class="mx-auto max-w-[1200px] px-4 py-8">
	{#if !connected}
		<section class="grid items-center gap-10 py-10 md:grid-cols-[7fr_5fr]">
			<div>
				<img
					src={asset('favicon.png')}
					alt="inkbot"
					class="mb-8 w-48 rounded-xl shadow-md md:w-64"
				/>
				<h1 class="font-display text-4xl font-semibold tracking-[-1px] text-ink md:text-5xl">
					{t('machine.title')}
				</h1>
				<p class="mt-4 max-w-prose text-lg">
					{t('machine.lede')}
				</p>
				{#if !plotter.supported}
					<p class="mt-6 rounded-lg bg-surface-card p-4 text-ink">
						{t('machine.unsupported')}
					</p>
				{:else}
					<div class="mt-8 flex flex-wrap gap-3">
						<Button
							variant="primary"
							onclick={() => plotter.connect()}
							disabled={plotter.connection === 'connecting'}
						>
							{t('connect.button')}
						</Button>
					</div>
				{/if}
				{#if plotter.lastError}
					<p class="mt-4 text-sm text-danger" role="alert">{plotter.lastError}</p>
				{/if}
			</div>
			<div class="rounded-xl border border-hairline bg-canvas p-6 shadow-md">
				<h2 class="font-semibold text-ink">{t('machine.beforeTitle')}</h2>
				<ul class="mt-3 space-y-3 text-[15px]">
					<li class="border-t border-hairline-soft pt-3">
						{t('machine.power1')} <strong class="text-ink">{t('machine.powerSwitch')}</strong>
						{t('machine.power2')}
					</li>
					<li class="border-t border-hairline-soft pt-3">
						{t('machine.usb')}
					</li>
					<li class="border-t border-hairline-soft pt-3">
						{t('machine.pen')}
					</li>
				</ul>
			</div>
		</section>
	{:else}
		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">{t('machine.machine')}</h2>
				<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
					<dt class="text-ink-mute">{t('machine.state')}</dt>
					<dd class="text-ink">{plotter.status?.state ?? '-'}</dd>
					<dt class="text-ink-mute">{t('machine.firmware')}</dt>
					<dd class="text-ink">{plotter.greeting || '-'}</dd>
				</dl>
				{#if plotter.alarm !== undefined}
					<div class="mt-4 rounded-md border border-danger p-3 text-sm text-danger" role="alert">
						{t('machine.alarm', { code: plotter.alarm ?? '' })}
						<button class="ml-2 font-semibold underline" onclick={() => run(['$X'])}>
							{t('machine.unlock')}
						</button>
					</div>
				{/if}
			</section>

			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">{t('machine.test')}</h2>
				<div class="mt-4 flex flex-wrap gap-3">
					<Button
						variant="primary"
						onclick={() => run(testSquare(20, settings))}
						disabled={!canAct}
					>
						<Square size={16} />
						{t('machine.square')}
					</Button>
				</div>
				<p class="mt-4 text-sm text-ink-mute">
					{t('machine.barHint')}
				</p>
			</section>

			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<div class="flex items-center justify-between gap-4">
					<h2 class="font-semibold text-ink">{t('machine.move')}</h2>
					<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
						{#each steps as value (value)}
							<button
								role="radio"
								aria-checked={step === value}
								class="rounded-pill px-3.5 py-1.5 text-sm {step === value
									? 'bg-canvas text-ink shadow-sm'
									: 'text-ink-mute'}"
								onclick={() => (step = value)}
							>
								{value} mm
							</button>
						{/each}
					</div>
				</div>
				<div class="mt-6 grid w-fit grid-cols-3 gap-2">
					<span></span>
					<Button
						variant="icon"
						aria-label={t('machine.up')}
						onclick={() => run(jog(0, -step, settings.invertY))}
						disabled={!canAct}
					>
						<ArrowUp size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label={t('machine.left')}
						onclick={() => run(jog(-step, 0, settings.invertY))}
						disabled={!canAct}
					>
						<ArrowLeft size={18} />
					</Button>
					<Button
						variant="icon"
						aria-label={t('machine.origin')}
						onclick={() => run(setOrigin())}
						disabled={!canAct}
					>
						<Crosshair size={18} />
					</Button>
					<Button
						variant="icon"
						aria-label={t('machine.right')}
						onclick={() => run(jog(step, 0, settings.invertY))}
						disabled={!canAct}
					>
						<ArrowRight size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label={t('machine.downMove')}
						onclick={() => run(jog(0, step, settings.invertY))}
						disabled={!canAct}
					>
						<ArrowDown size={18} />
					</Button>
					<span></span>
				</div>
				<p class="mt-4 text-sm text-ink-mute">
					{t('machine.originHint')}
				</p>
				<label class="mt-4 flex items-start gap-2.5 text-sm text-ink">
					<input
						type="checkbox"
						class="mt-0.5 size-4 accent-primary"
						checked={settings.invertY}
						onchange={(event) => settings.setInvertY(event.currentTarget.checked)}
					/>
					<span>
						{t('machine.invertY')}
						<span class="block text-ink-mute">
							{t('machine.invertYHint')}
						</span>
					</span>
				</label>
			</section>

			<section class="flex min-h-80 flex-col rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">{t('machine.console')}</h2>
				<div
					bind:this={logView}
					class="mt-4 h-56 overflow-y-auto rounded-md bg-surface-card p-3 font-mono text-[13px]"
				>
					{#each plotter.log as entry (entry.id)}
						<div class={entry.direction === 'tx' ? 'text-steel-600' : 'text-ink-soft'}>
							{entry.direction === 'tx' ? '>' : '<'}
							{entry.text}
						</div>
					{/each}
				</div>
				<form class="mt-3 flex gap-2" onsubmit={sendConsole} novalidate>
					<label class="sr-only" for="console-line">{t('machine.command')}</label>
					<input
						id="console-line"
						bind:value={consoleLine}
						class="h-10 min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-3.5 font-mono text-sm text-ink focus:border-ink"
						placeholder={t('machine.commandPlaceholder')}
						autocomplete="off"
						disabled={!connected}
					/>
					<Button type="submit" disabled={!connected}>{t('machine.send')}</Button>
				</form>
				{#if actionError}
					<p class="mt-2 text-sm text-danger" role="alert">{actionError}</p>
				{/if}
			</section>
		</div>
	{/if}
</main>
