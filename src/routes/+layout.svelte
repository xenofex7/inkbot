<script lang="ts">
	import { i18n, t } from '#lib/i18n.svelte.ts';
	import './layout.css';
	import { page } from '$app/state';
	import { asset, resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import ControlBar from '#lib/components/ControlBar.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { plotter } from '#lib/serial/plotter.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const nav = [
		{ href: resolve('/'), label: 'nav.machine' },
		{ href: resolve('/design'), label: 'nav.design' },
		{ href: resolve('/gallery'), label: 'nav.gallery' },
		{ href: resolve('/settings'), label: 'nav.settings' }
	] as const;

	$effect(() => {
		document.documentElement.lang = i18n.locale === 'de' ? 'de-CH' : 'en';
	});
</script>

<svelte:head>
	<link rel="icon" href={asset('favicon.png')} />
	<title>inkbot</title>
</svelte:head>

<header class="sticky top-0 z-10 border-b border-hairline bg-canvas">
	<div class="border-b border-hairline-soft">
		<div class="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4">
			<img src={asset('favicon.png')} alt="" class="size-12 rounded-md" />
			<span class="font-display text-lg font-semibold tracking-tight text-ink">inkbot</span>
			<nav class="ml-4 inline-flex rounded-pill bg-surface-soft p-1.5">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="rounded-pill px-3.5 py-1.5 text-sm {page.url.pathname === item.href
							? 'bg-canvas text-ink shadow-sm'
							: 'text-ink-mute'}"
						aria-current={page.url.pathname === item.href ? 'page' : undefined}
					>
						{t(item.label)}
					</a>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-3">
				<StatusBadge />
				{#if plotter.connection === 'disconnected'}
					<Button variant="primary" onclick={() => plotter.connect()} disabled={!plotter.supported}>
						{t('connect.button')}
					</Button>
				{:else}
					<Button onclick={() => plotter.disconnect()}>{t('connect.disconnect')}</Button>
				{/if}
			</div>
		</div>
	</div>
	<ControlBar />
</header>

{@render children()}
