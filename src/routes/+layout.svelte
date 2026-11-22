<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { asset, resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { plotter } from '#lib/serial/plotter.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const nav = [
		{ href: resolve('/'), label: 'Maschine' },
		{ href: resolve('/text'), label: 'Text' }
	];
</script>

<svelte:head>
	<link rel="icon" href={asset('favicon.png')} />
	<title>inkbot</title>
</svelte:head>

<header class="sticky top-0 z-10 border-b border-hairline bg-canvas">
	<div class="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4">
		<img src={asset('favicon.png')} alt="" class="size-9 rounded-sm" />
		<span class="font-display text-lg font-semibold tracking-tight text-ink">inkbot</span>
		<nav class="ml-4 inline-flex rounded-pill bg-surface-soft p-1.5">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="rounded-md px-3.5 py-1.5 text-sm {page.url.pathname === item.href
						? 'bg-canvas text-ink shadow-sm'
						: 'text-ink-mute'}"
					aria-current={page.url.pathname === item.href ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="ml-auto flex items-center gap-3">
			<StatusBadge />
			{#if plotter.connection === 'disconnected'}
				<Button variant="primary" onclick={() => plotter.connect()} disabled={!plotter.supported}>
					Plotter verbinden
				</Button>
			{:else}
				<Button onclick={() => plotter.disconnect()}>Trennen</Button>
			{/if}
		</div>
	</div>
</header>

{@render children()}
