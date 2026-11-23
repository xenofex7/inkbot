<script lang="ts">
	import { asset } from '$app/paths';
	import { t } from '#lib/i18n.svelte.ts';
	import {
		ArrowDown,
		ArrowLeft,
		ArrowRight,
		ArrowUp,
		Crosshair,
		House,
		MapPin,
		SquareParking,
		Square,
		SquareDashed,
		Trash2
	} from '@lucide/svelte';
	import Button from '#lib/components/Button.svelte';
	import {
		goToOrigin,
		jog,
		jogTo,
		moveToMachine,
		setOrigin,
		testSquare
	} from '#lib/grbl/commands.ts';
	import { orient } from '#lib/geometry/types.ts';
	import { positions } from '#lib/machine/positions.svelte.ts';
	import { plotter } from '#lib/serial/plotter.svelte.ts';
	import { settings } from '#lib/settings.svelte.ts';

	const steps = [1, 5, 10, 20, 50] as const;
	let step = $state<(typeof steps)[number]>(5);
	let consoleLine = $state('');
	let actionError = $state('');
	let notice = $state('');
	let positionName = $state('');
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

	function jogBy(dx: number, dy: number) {
		const base = positions.machine();
		const target = positions.jogTarget(orient({ x: dx, y: dy }, settings.invertY));
		if (!base || !target) return run(jog(dx, dy, settings.invertY));
		if (!plotter.busy && Math.hypot(target.x - base.x, target.y - base.y) < 0.01) {
			notice = t('positions.atEdge');
			return;
		}
		notice = '';
		return run(jogTo(target));
	}

	function goTo(point: { x: number; y: number }) {
		const target = positions.toMachine(point);
		if (target) void run(moveToMachine(target));
	}

	function savePosition(event: SubmitEvent) {
		event.preventDefault();
		positions.save(
			positionName.trim() || t('positions.defaultName', { number: positions.positions.length + 1 })
		);
		positionName = '';
	}

	const mm = (value: number) => value.toFixed(1);

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
					class="mb-8 w-48 rounded-[18.75%] shadow-md md:w-64"
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
					<dd class="text-ink">{plotter.greeting.replace(/\s*\['\$' for help\]$/, '') || '-'}</dd>
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
						onclick={() => jogBy(0, -step)}
						disabled={!canAct}
					>
						<ArrowUp size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label={t('machine.left')}
						onclick={() => jogBy(-step, 0)}
						disabled={!canAct}
					>
						<ArrowLeft size={18} />
					</Button>
					<Button
						variant="icon"
						aria-label={t('machine.goOrigin')}
						onclick={() => run(goToOrigin())}
						disabled={!canAct}
					>
						<House size={18} />
					</Button>
					<Button
						variant="icon"
						aria-label={t('machine.right')}
						onclick={() => jogBy(step, 0)}
						disabled={!canAct}
					>
						<ArrowRight size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label={t('machine.downMove')}
						onclick={() => jogBy(0, step)}
						disabled={!canAct}
					>
						<ArrowDown size={18} />
					</Button>
					<span></span>
				</div>
				<div class="mt-4 flex flex-wrap gap-2">
					<Button
						onclick={() => confirm(t('machine.originConfirm')) && run(setOrigin())}
						disabled={!canAct}
					>
						<Crosshair size={16} />
						{t('machine.origin')}
					</Button>
					<Button onclick={() => run(goToOrigin())} disabled={!canAct}>
						<House size={16} />
						{t('machine.goOrigin')}
					</Button>
				</div>
				{#if notice}
					<p class="mt-4 text-sm text-seal" role="status">{notice}</p>
				{/if}
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

			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">{t('positions.title')}</h2>
				<p class="mt-2 text-sm text-ink-mute">{t('positions.intro')}</p>

				{#if !positions.parkDefined}
					<div class="mt-4 space-y-3 rounded-md bg-surface-card p-4">
						<p class="text-sm text-ink">{t('positions.noPark')}</p>
						<Button
							onclick={() => confirm(t('positions.parkConfirm')) && positions.setPark()}
							disabled={!canAct}
						>
							<SquareParking size={16} />
							{t('positions.setPark')}
						</Button>
					</div>
				{:else if !positions.ready}
					<div class="mt-4 space-y-3 rounded-md border border-seal/40 bg-surface-card p-4">
						<p class="text-sm text-ink">{t('positions.confirmQuestion')}</p>
						<Button variant="primary" onclick={() => positions.confirmPark()} disabled={!canAct}>
							<SquareParking size={16} />
							{t('positions.confirm')}
						</Button>
					</div>
				{:else}
					<div class="mt-4 flex flex-wrap gap-2">
						<Button onclick={() => goTo({ x: 0, y: 0 })} disabled={!canAct}>
							<SquareParking size={16} />
							{t('positions.park')}
						</Button>
						<Button
							onclick={() => confirm(t('positions.parkConfirm')) && positions.setPark()}
							disabled={!canAct}
						>
							{t('positions.setParkHere')}
						</Button>
					</div>

					<div class="mt-5 border-t border-hairline-soft pt-4">
						<h3 class="text-sm font-semibold text-ink">{t('positions.area')}</h3>
						<p class="mt-1 text-sm text-ink-mute">
							{positions.area
								? t('positions.areaSet', {
										width: mm(positions.area.maxX - positions.area.minX),
										height: mm(positions.area.maxY - positions.area.minY)
									})
								: t('positions.areaNone')}
						</p>
						<div class="mt-3 flex flex-wrap gap-2">
							<Button onclick={() => positions.setCorner()} disabled={!canAct}>
								<SquareDashed size={16} />
								{positions.corner ? t('positions.secondCorner') : t('positions.firstCorner')}
							</Button>
							{#if positions.area || positions.corner}
								<Button onclick={() => positions.clearArea()}>{t('positions.clearArea')}</Button>
							{/if}
						</div>
					</div>

					<div class="mt-5 border-t border-hairline-soft pt-4">
						<h3 class="text-sm font-semibold text-ink">{t('positions.saved')}</h3>
						<form class="mt-3 flex gap-2" onsubmit={savePosition} novalidate>
							<label class="sr-only" for="position-name">{t('positions.name')}</label>
							<input
								id="position-name"
								bind:value={positionName}
								placeholder={t('positions.namePlaceholder')}
								class="h-10 min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-3.5 text-sm text-ink"
							/>
							<Button type="submit" disabled={!connected}>
								<MapPin size={16} />
								{t('positions.save')}
							</Button>
						</form>
						{#if positions.positions.length > 0}
							<ul class="mt-3 divide-y divide-hairline-soft">
								{#each positions.positions as position (position.id)}
									<li class="flex items-center gap-2 py-1.5 text-sm">
										<span class="min-w-0 flex-1 truncate text-ink">{position.name}</span>
										<span class="font-mono text-[12px] text-ink-mute">
											{mm(position.x)} · {mm(position.y)}
										</span>
										<Button class="h-8! px-3!" onclick={() => goTo(position)} disabled={!canAct}>
											{t('positions.goTo')}
										</Button>
										<Button
											variant="icon"
											class="size-8!"
											aria-label={t('positions.remove')}
											onclick={() => positions.remove(position.id)}
										>
											<Trash2 size={14} />
										</Button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
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
