<script lang="ts">
	import {
		ArrowDown,
		ArrowLeft,
		ArrowRight,
		ArrowUp,
		Crosshair,
		Pause,
		Play,
		Square,
		OctagonX
	} from '@lucide/svelte';
	import Button from '#lib/components/Button.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { jog, penDown, penUp, setOrigin, testSquare } from '#lib/grbl/commands.ts';
	import { REALTIME } from '#lib/grbl/vgx4.ts';
	import { plotter } from '#lib/serial/plotter.svelte.ts';

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

	async function connect() {
		try {
			await plotter.connect();
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') return;
			plotter.lastError = error instanceof Error ? error.message : String(error);
		}
	}

	async function sendConsole(event: SubmitEvent) {
		event.preventDefault();
		const line = consoleLine.trim();
		if (!line) return;
		consoleLine = '';
		await run([line]);
	}

	const format = (value: number | undefined) => (value ?? 0).toFixed(2);
</script>

<header class="sticky top-0 z-10 border-b border-hairline bg-canvas">
	<div class="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4">
		<img src="favicon.png" alt="" class="size-9 rounded-sm" />
		<span class="font-display text-lg font-semibold tracking-tight text-ink">inkbot</span>
		<div class="ml-auto flex items-center gap-3">
			<StatusBadge />
			{#if plotter.connection === 'disconnected'}
				<Button variant="primary" onclick={connect} disabled={!plotter.supported}>
					Plotter verbinden
				</Button>
			{:else}
				<Button onclick={() => plotter.disconnect()}>Trennen</Button>
			{/if}
		</div>
	</div>
</header>

<main class="mx-auto max-w-[1200px] px-4 py-8">
	{#if !connected}
		<section class="grid items-center gap-10 py-10 md:grid-cols-[7fr_5fr]">
			<div>
				<h1 class="font-display text-4xl font-semibold tracking-[-1px] text-ink md:text-5xl">
					Dein Plotter, direkt im Browser.
				</h1>
				<p class="mt-4 max-w-prose text-lg">
					Verbinde den VigoTec VG-X4 per USB. Ohne Installation, ohne Server, alles läuft hier im
					Browser.
				</p>
				{#if !plotter.supported}
					<p class="mt-6 rounded-lg bg-surface-card p-4 text-ink">
						Dein Browser kann nicht mit USB-Geräten sprechen. Öffne inkbot in Chrome oder Edge am
						Computer.
					</p>
				{:else}
					<div class="mt-8 flex flex-wrap gap-3">
						<Button
							variant="primary"
							onclick={connect}
							disabled={plotter.connection === 'connecting'}
						>
							Plotter verbinden
						</Button>
					</div>
				{/if}
				{#if plotter.lastError}
					<p class="mt-4 text-sm text-danger" role="alert">{plotter.lastError}</p>
				{/if}
			</div>
			<div class="rounded-xl border border-hairline bg-canvas p-6 shadow-md">
				<h2 class="font-semibold text-ink">Vor dem Verbinden</h2>
				<ul class="mt-3 space-y-3 text-[15px]">
					<li class="border-t border-hairline-soft pt-3">
						Netzteil einstecken und den <strong class="text-ink">Netzschalter</strong> auf der Platine
						einschalten. Ohne Netzschalter antwortet der Plotter zwar, bewegt sich aber nicht.
					</li>
					<li class="border-t border-hairline-soft pt-3">
						USB-Kabel einstecken. Im Auswahlfenster erscheint der Plotter als "USB Serial".
					</li>
					<li class="border-t border-hairline-soft pt-3">
						Stift oben links auf dem Papier platzieren, dort ist später der Nullpunkt.
					</li>
				</ul>
			</div>
		</section>
	{:else}
		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">Maschine</h2>
				<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
					<dt class="text-ink-mute">Zustand</dt>
					<dd class="text-ink">{plotter.status?.state ?? '-'}</dd>
					<dt class="text-ink-mute">Position</dt>
					<dd class="font-mono text-ink">
						X {format(plotter.position?.x)} · Y {format(plotter.position?.y)} mm
					</dd>
					<dt class="text-ink-mute">Firmware</dt>
					<dd class="text-ink">{plotter.greeting || '-'}</dd>
				</dl>
				{#if plotter.alarm !== undefined}
					<div class="mt-4 rounded-md border border-danger p-3 text-sm text-danger" role="alert">
						Alarm {plotter.alarm}. Die Maschine ist gesperrt.
						<button class="ml-2 font-semibold underline" onclick={() => run(['$X'])}>
							Entsperren
						</button>
					</div>
				{/if}
			</section>

			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">Stift</h2>
				<div class="mt-4 flex flex-wrap gap-3">
					<Button onclick={() => run(penUp())} disabled={!canAct}>Stift hoch</Button>
					<Button onclick={() => run(penDown())} disabled={!canAct}>Stift runter</Button>
				</div>
				<h2 class="mt-6 font-semibold text-ink">Test</h2>
				<div class="mt-4 flex flex-wrap gap-3">
					<Button variant="primary" onclick={() => run(testSquare(20))} disabled={!canAct}>
						<Square size={16} /> Quadrat 20 mm
					</Button>
					{#if plotter.status?.state === 'Hold'}
						<Button onclick={() => plotter.realtime(REALTIME.cycleStart)}>
							<Play size={16} /> Weiter
						</Button>
					{:else}
						<Button onclick={() => plotter.realtime(REALTIME.feedHold)} disabled={!plotter.busy}>
							<Pause size={16} /> Pause
						</Button>
					{/if}
					<Button variant="stop" onclick={() => plotter.realtime(REALTIME.softReset)}>
						<OctagonX size={16} /> Stopp
					</Button>
				</div>
			</section>

			<section class="rounded-lg border border-hairline bg-canvas p-6">
				<div class="flex items-center justify-between gap-4">
					<h2 class="font-semibold text-ink">Bewegen</h2>
					<div class="inline-flex rounded-pill bg-surface-soft p-1.5" role="radiogroup">
						{#each steps as value (value)}
							<button
								role="radio"
								aria-checked={step === value}
								class="rounded-md px-3.5 py-1.5 text-sm {step === value
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
						aria-label="Nach oben"
						onclick={() => run(jog(0, -step))}
						disabled={!canAct}
					>
						<ArrowUp size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label="Nach links"
						onclick={() => run(jog(-step, 0))}
						disabled={!canAct}
					>
						<ArrowLeft size={18} />
					</Button>
					<Button
						variant="icon"
						aria-label="Nullpunkt hier setzen"
						onclick={() => run(setOrigin())}
						disabled={!canAct}
					>
						<Crosshair size={18} />
					</Button>
					<Button
						variant="icon"
						aria-label="Nach rechts"
						onclick={() => run(jog(step, 0))}
						disabled={!canAct}
					>
						<ArrowRight size={18} />
					</Button>
					<span></span>
					<Button
						variant="icon"
						aria-label="Nach unten"
						onclick={() => run(jog(0, step))}
						disabled={!canAct}
					>
						<ArrowDown size={18} />
					</Button>
					<span></span>
				</div>
				<p class="mt-4 text-sm text-ink-mute">
					Das Fadenkreuz setzt den Nullpunkt an die aktuelle Stiftposition. Es gibt keine
					Endschalter, also nicht über den Rahmen hinausfahren.
				</p>
			</section>

			<section class="flex min-h-80 flex-col rounded-lg border border-hairline bg-canvas p-6">
				<h2 class="font-semibold text-ink">Konsole</h2>
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
					<label class="sr-only" for="console-line">G-Code-Befehl</label>
					<input
						id="console-line"
						bind:value={consoleLine}
						class="h-10 min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-3.5 font-mono text-sm text-ink focus:border-ink"
						placeholder="z.B. $$ oder G0 X10"
						autocomplete="off"
						disabled={!connected}
					/>
					<Button type="submit" disabled={!connected}>Senden</Button>
				</form>
				{#if actionError}
					<p class="mt-2 text-sm text-danger" role="alert">{actionError}</p>
				{/if}
			</section>
		</div>
	{/if}
</main>
