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
		Compass,
		Equal,
		MapPin,
		MonitorPlay,
		SquareArrowUpLeft,
		Square,
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
	import { axesFromDirections, toMachine, type Direction } from '#lib/geometry/types.ts';
	import { positions } from '#lib/machine/positions.svelte.ts';
	import { plotter } from '#lib/serial/plotter.svelte.ts';
	import { settings } from '#lib/settings.svelte.ts';
	import { depthTest, depthTestGcode, depthValues, maxDepthRows } from '#lib/gcode/depthTest.ts';
	import { estimateSeconds } from '#lib/gcode/fromPolylines.ts';

	const steps = [1, 5, 10, 20, 50] as const;
	const ALIGN_MM = 10;
	const SAFE_STEP = 10;
	let step = $state<(typeof steps)[number]>(5);
	let consoleLine = $state('');
	let actionError = $state('');
	let notice = $state('');
	let positionName = $state('');
	let logView = $state<HTMLElement>();

	let depthFrom = $state(settings.penDownS - 80);
	let depthTo = $state(settings.penDownS);
	let depthStep = $state(10);

	const depthRows = $derived(
		depthTest(depthValues(depthFrom, depthTo, depthStep), settings.sheet, settings.margin)
	);
	const depthPolylines = $derived(depthRows.flatMap((row) => row.polylines));
	const depthTooMany = $derived(depthRows.length > maxDepthRows(settings.sheet, settings.margin));
	const depthOutside = $derived(positions.outside(depthPolylines));
	const depthMinutes = $derived(Math.ceil(estimateSeconds(depthPolylines) / 60));

	const connected = $derived(plotter.connection === 'connected');
	const canAct = $derived(connected && !plotter.busy);
	const jogStep = $derived(positions.ready ? step : Math.min(step, SAFE_STEP));

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
		const target = positions.jogTarget(toMachine({ x: dx, y: dy }, settings.axes));
		if (!base || !target) return run(jog(dx, dy, settings.axes));
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

	function goToStop() {
		if (positions.anchor) void run(moveToMachine(positions.anchor));
	}

	function confirmAnchor() {
		const lines = positions.confirmAnchor();
		if (lines.length) void run(lines);
	}

	function drawDepthTest() {
		void run(depthTestGcode(depthRows, settings));
	}

	async function setCorner() {
		if (!confirm(t('machine.originConfirm'))) return;
		await run(setOrigin());
		if (!actionError) positions.markCorner();
	}

	const OPPOSITE: Record<Direction, Direction> = {
		right: 'left',
		left: 'right',
		up: 'down',
		down: 'up'
	};
	const answers: [Direction, typeof ArrowUp][] = [
		['up', ArrowUp],
		['left', ArrowLeft],
		['right', ArrowRight],
		['down', ArrowDown]
	];
	let alignStep = $state<'idle' | 'x' | 'y'>('idle');
	let alignX = $state<Direction | undefined>();
	let alignError = $state('');
	let moved = { X: false, Y: false };

	$effect(() => {
		void plotter.resets;
		void plotter.connection;
		alignStep = 'idle';
		moved = { X: false, Y: false };
	});

	function returnFromTest() {
		const parts = [moved.X ? `X${ALIGN_MM}` : '', moved.Y ? `Y${ALIGN_MM}` : ''].filter(Boolean);
		moved = { X: false, Y: false };
		if (parts.length) void run([`$J=G91 G21 ${parts.join(' ')} F1500`]);
	}

	async function testAxis(axis: 'X' | 'Y') {
		await run([`$J=G91 G21 ${axis}-${ALIGN_MM} F1500`]);
		if (actionError) {
			alignStep = 'idle';
			alignError = t('align.failed');
			returnFromTest();
			return;
		}
		moved[axis] = true;
		alignStep = axis === 'X' ? 'x' : 'y';
	}

	function startAlign() {
		alignError = '';
		alignX = undefined;
		void testAxis('X');
	}

	function answer(direction: Direction) {
		if (alignStep === 'x') {
			alignX = OPPOSITE[direction];
			alignStep = 'idle';
			void testAxis('Y');
			return;
		}
		const axes = alignX && axesFromDirections(alignX, OPPOSITE[direction]);
		alignStep = 'idle';
		returnFromTest();
		if (!axes) {
			alignError = t('align.invalid');
			return;
		}
		settings.axes = axes;
		settings.axesConfirmed = true;
	}

	function setTravel(key: 'width' | 'height', event: Event & { currentTarget: HTMLInputElement }) {
		const max = settings.defaultTravel[key];
		const value = Math.round(Math.min(max, Math.max(10, event.currentTarget.valueAsNumber || 0)));
		settings.travel = { ...settings.area, [key]: value };
		event.currentTarget.value = String(value);
	}

	function savePosition(event: SubmitEvent) {
		event.preventDefault();
		positions.save(
			positionName.trim() || t('positions.defaultName', { number: positions.positions.length + 1 })
		);
		positionName = '';
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
					class="mb-8 w-48 rounded-[18.75%] shadow-md md:w-64"
				/>
				<h1 class="font-display text-4xl font-semibold tracking-[-1px] text-ink md:text-5xl">
					{t('machine.title')}
				</h1>
				<p class="mt-4 max-w-prose text-lg">
					{t('machine.lede')}
				</p>
				{#if plotter.connection === 'disconnected'}
					<Button class="mt-6 sm:hidden" onclick={() => plotter.connectSimulator()}>
						<MonitorPlay size={16} />
						{t('connect.simulatorTry')}
					</Button>
				{/if}
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
				<h2 class="font-semibold text-ink">{t('setup.title')}</h2>
				<p class="mt-2 text-sm text-ink-mute">{t('setup.anchorHint')}</p>
				{#if !positions.anchor}
					<div class="mt-4 space-y-3 rounded-md border border-seal/40 bg-surface-card p-4">
						<p class="text-sm text-ink">{t('anchor.question')}</p>
						<Button variant="primary" onclick={confirmAnchor} disabled={!canAct}>
							<SquareArrowUpLeft size={16} />
							{t('anchor.confirm')}
						</Button>
					</div>
				{:else}
					<p class="mt-3 text-sm text-ink">{t('anchor.ok')}</p>
				{/if}

				<div class="mt-5 border-t border-hairline-soft pt-4">
					<h3 class="text-sm font-semibold text-ink">{t('align.title')}</h3>
					{#if alignStep === 'idle'}
						{#if !settings.axesConfirmed}
							<p class="mt-1 text-sm text-seal">{t('align.needed')}</p>
						{/if}
						<p class="mt-1 text-sm text-ink-mute">{t('align.hint')}</p>
						<Button class="mt-3" onclick={startAlign} disabled={!canAct}>
							<Compass size={16} />
							{t('align.start')}
						</Button>
					{:else}
						<p class="mt-1 text-sm text-ink" role="status">
							{alignStep === 'x' ? t('align.askX') : t('align.askY')}
						</p>
						<div class="mt-3 flex flex-wrap gap-2">
							{#each answers as [direction, Icon] (direction)}
								<Button onclick={() => answer(direction)} disabled={!canAct}>
									<Icon size={16} />
									{t(`align.${direction}`)}
								</Button>
							{/each}
						</div>
					{/if}
					{#if alignError}
						<p class="mt-2 text-sm text-danger" role="alert">{alignError}</p>
					{/if}
				</div>

				<div class="mt-5 border-t border-hairline-soft pt-4">
					<h3 class="text-sm font-semibold text-ink">{t('travel.title')}</h3>
					<p class="mt-1 text-sm text-ink-mute">{t('travel.hint')}</p>
					<div class="mt-3 flex flex-wrap items-end gap-3">
						<label class="text-[13px] text-ink-mute">
							{t('travel.width')}
							<input
								type="number"
								min="10"
								max={settings.defaultTravel.width}
								value={settings.area.width}
								onchange={(event) => setTravel('width', event)}
								class="mt-1 block h-10 w-28 rounded-md border border-hairline bg-canvas px-3 text-sm text-ink"
							/>
						</label>
						<label class="text-[13px] text-ink-mute">
							{t('travel.height')}
							<input
								type="number"
								min="10"
								max={settings.defaultTravel.height}
								value={settings.area.height}
								onchange={(event) => setTravel('height', event)}
								class="mt-1 block h-10 w-28 rounded-md border border-hairline bg-canvas px-3 text-sm text-ink"
							/>
						</label>
						{#if settings.travel}
							<Button
								onclick={() => {
									if (confirm(t('travel.resetConfirm'))) settings.travel = null;
								}}
							>
								{t('travel.reset')}
							</Button>
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
						<Button type="submit" disabled={!positions.anchor}>
							<MapPin size={16} />
							{t('positions.save')}
						</Button>
					</form>
					{#if positions.positions.length > 0}
						<ul class="mt-3 divide-y divide-hairline-soft">
							{#each positions.positions as position (position.id)}
								<li class="flex items-center gap-2 py-1.5 text-sm">
									<span class="min-w-0 flex-1 truncate text-ink">{position.name}</span>
									<Button
										class="h-8! px-3!"
										onclick={() => goTo(position)}
										disabled={!canAct || !positions.ready}
									>
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
						onclick={() => jogBy(0, -jogStep)}
						disabled={!canAct}
					>
						<ArrowUp size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label={t('machine.left')}
						onclick={() => jogBy(-jogStep, 0)}
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
						onclick={() => jogBy(jogStep, 0)}
						disabled={!canAct}
					>
						<ArrowRight size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label={t('machine.downMove')}
						onclick={() => jogBy(0, jogStep)}
						disabled={!canAct}
					>
						<ArrowDown size={18} />
					</Button>
					<span></span>
				</div>
				<div class="mt-4 flex flex-wrap gap-2">
					<Button onclick={setCorner} disabled={!canAct}>
						<Crosshair size={16} />
						{t('machine.origin')}
					</Button>
					<Button onclick={() => run(goToOrigin())} disabled={!canAct}>
						<House size={16} />
						{t('machine.goOrigin')}
					</Button>
					<Button onclick={goToStop} disabled={!canAct || !positions.anchor}>
						<SquareArrowUpLeft size={16} />
						{t('machine.goAnchor')}
					</Button>
				</div>
				{#if notice}
					<p class="mt-4 text-sm text-seal" role="status">{notice}</p>
				{/if}
				<p class="mt-4 text-sm text-ink-mute">
					{t('machine.originHint')}
				</p>
			</section>

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

				<div class="mt-5 border-t border-hairline-soft pt-4">
					<h3 class="text-sm font-semibold text-ink">{t('depth.title')}</h3>
					<p class="mt-1 text-sm text-ink-mute">{t('depth.hint')}</p>
					<div class="mt-3 flex flex-wrap items-end gap-3">
						<label class="text-[13px] text-ink-mute">
							{t('depth.from')}
							<input
								type="number"
								min="0"
								max="1000"
								step="5"
								bind:value={depthFrom}
								class="mt-1 block h-10 w-24 rounded-md border border-hairline bg-canvas px-3 text-sm text-ink"
							/>
						</label>
						<label class="text-[13px] text-ink-mute">
							{t('depth.to')}
							<input
								type="number"
								min="0"
								max="1000"
								step="5"
								bind:value={depthTo}
								class="mt-1 block h-10 w-24 rounded-md border border-hairline bg-canvas px-3 text-sm text-ink"
							/>
						</label>
						<label class="text-[13px] text-ink-mute">
							{t('depth.step')}
							<input
								type="number"
								min="1"
								max="200"
								bind:value={depthStep}
								class="mt-1 block h-10 w-24 rounded-md border border-hairline bg-canvas px-3 text-sm text-ink"
							/>
						</label>
						<Button
							onclick={drawDepthTest}
							disabled={!canAct ||
								plotter.status?.state === 'Hold' ||
								!positions.originKnown ||
								depthOutside ||
								depthTooMany ||
								depthRows.length === 0}
						>
							<Equal size={16} />
							{t('depth.draw')}
						</Button>
					</div>
					<p class="mt-2 text-sm text-ink-mute">
						{t('depth.summary', {
							count: depthRows.length,
							width: settings.sheet.width,
							height: settings.sheet.height,
							minutes: depthMinutes
						})}
					</p>
					{#if depthTooMany}
						<p class="mt-2 text-sm text-danger" role="alert">
							{t('depth.tooMany', { max: maxDepthRows(settings.sheet, settings.margin) })}
						</p>
					{:else if connected && !positions.originKnown}
						<p class="mt-2 text-sm text-danger" role="alert">{t('job.needsSetup')}</p>
					{:else if depthOutside}
						<p class="mt-2 text-sm text-danger" role="alert">{t('job.outsideArea')}</p>
					{/if}
				</div>
			</section>

			<section
				class="flex min-h-80 flex-col rounded-lg border border-hairline bg-canvas p-6 lg:col-span-2"
			>
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
