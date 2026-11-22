<script lang="ts">
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
				<h1 class="font-display text-4xl font-semibold tracking-[-1px] text-ink md:text-5xl">
					Your plotter, right in the browser.
				</h1>
				<p class="mt-4 max-w-prose text-lg">
					Connect the VigoTec VG-X4 via USB. No install, no server, everything runs here in the
					browser.
				</p>
				{#if !plotter.supported}
					<p class="mt-6 rounded-lg bg-surface-card p-4 text-ink">
						Your browser cannot talk to USB devices. Open inkbot in Chrome or Edge on a desktop
						computer.
					</p>
				{:else}
					<div class="mt-8 flex flex-wrap gap-3">
						<Button
							variant="primary"
							onclick={() => plotter.connect()}
							disabled={plotter.connection === 'connecting'}
						>
							Connect plotter
						</Button>
					</div>
				{/if}
				{#if plotter.lastError}
					<p class="mt-4 text-sm text-danger" role="alert">{plotter.lastError}</p>
				{/if}
			</div>
			<div class="rounded-xl border border-hairline bg-canvas p-6 shadow-md">
				<h2 class="font-semibold text-ink">Before you connect</h2>
				<ul class="mt-3 space-y-3 text-[15px]">
					<li class="border-t border-hairline-soft pt-3">
						Plug in the power supply and turn on the <strong class="text-ink">power switch</strong> on
						the board. Without it the plotter still answers, but nothing moves.
					</li>
					<li class="border-t border-hairline-soft pt-3">
						Plug in the USB cable. The plotter shows up as "USB Serial" in the port picker.
					</li>
					<li class="border-t border-hairline-soft pt-3">
						Place the pen at the top left of the paper. That is where the origin goes.
					</li>
				</ul>
			</div>
		</section>
	{:else}
		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">Machine</h2>
				<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
					<dt class="text-ink-mute">State</dt>
					<dd class="text-ink">{plotter.status?.state ?? '-'}</dd>
					<dt class="text-ink-mute">Firmware</dt>
					<dd class="text-ink">{plotter.greeting || '-'}</dd>
				</dl>
				{#if plotter.alarm !== undefined}
					<div class="mt-4 rounded-md border border-danger p-3 text-sm text-danger" role="alert">
						Alarm {plotter.alarm}. The machine is locked.
						<button class="ml-2 font-semibold underline" onclick={() => run(['$X'])}>
							Unlock
						</button>
					</div>
				{/if}
			</section>

			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">Test</h2>
				<div class="mt-4 flex flex-wrap gap-3">
					<Button
						variant="primary"
						onclick={() => run(testSquare(20, settings))}
						disabled={!canAct}
					>
						<Square size={16} /> 20 mm square
					</Button>
				</div>
				<p class="mt-4 text-sm text-ink-mute">
					Pen, depth, position and paper live in the bar at the top. Pause and stop show up there
					while a job runs.
				</p>
			</section>

			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<div class="flex items-center justify-between gap-4">
					<h2 class="font-semibold text-ink">Move</h2>
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
						aria-label="Move up"
						onclick={() => run(jog(0, -step, settings.invertY))}
						disabled={!canAct}
					>
						<ArrowUp size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label="Move left"
						onclick={() => run(jog(-step, 0, settings.invertY))}
						disabled={!canAct}
					>
						<ArrowLeft size={18} />
					</Button>
					<Button
						variant="icon"
						aria-label="Set origin here"
						onclick={() => run(setOrigin())}
						disabled={!canAct}
					>
						<Crosshair size={18} />
					</Button>
					<Button
						variant="icon"
						aria-label="Move right"
						onclick={() => run(jog(step, 0, settings.invertY))}
						disabled={!canAct}
					>
						<ArrowRight size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label="Move down"
						onclick={() => run(jog(0, step, settings.invertY))}
						disabled={!canAct}
					>
						<ArrowDown size={18} />
					</Button>
					<span></span>
				</div>
				<p class="mt-4 text-sm text-ink-mute">
					The crosshair sets the origin at the current pen position. There are no limit switches, so
					do not drive past the frame.
				</p>
				<label class="mt-4 flex items-start gap-2.5 text-sm text-ink">
					<input
						type="checkbox"
						class="mt-0.5 size-4 accent-primary"
						checked={settings.invertY}
						onchange={(event) => settings.setInvertY(event.currentTarget.checked)}
					/>
					<span>
						Invert Y axis
						<span class="block text-ink-mute">
							Turn on if text comes out upside down. Matches the VG-X4 when you read from the pen
							side.
						</span>
					</span>
				</label>
			</section>

			<section class="flex min-h-80 flex-col rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">Console</h2>
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
					<label class="sr-only" for="console-line">G-code command</label>
					<input
						id="console-line"
						bind:value={consoleLine}
						class="h-10 min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-3.5 font-mono text-sm text-ink focus:border-ink"
						placeholder="e.g. $$ or G0 X10"
						autocomplete="off"
						disabled={!connected}
					/>
					<Button type="submit" disabled={!connected}>Send</Button>
				</form>
				{#if actionError}
					<p class="mt-2 text-sm text-danger" role="alert">{actionError}</p>
				{/if}
			</section>
		</div>
	{/if}
</main>
