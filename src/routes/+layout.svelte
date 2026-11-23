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

	const repo = 'https://github.com/xenofex7/inkbot';

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
			<img src={asset('favicon.png')} alt="" class="size-14 rounded-[18.75%]" />
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
				{#if plotter.connection !== 'connected'}
					<StatusBadge />
				{/if}
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
	{#if plotter.connection === 'connected'}
		<ControlBar />
	{/if}
</header>

{@render children()}

<footer class="mx-auto flex max-w-[1200px] items-center gap-2 px-4 py-8 text-xs text-ink-mute">
	<a href={repo} target="_blank" rel="noopener" class="hover:text-ink">inkbot v{__APP_VERSION__}</a>
	<span aria-hidden="true">·</span>
	<a href="{repo}/commits/main" target="_blank" rel="noopener" class="font-mono hover:text-ink">
		{__COMMIT__}
	</a>
</footer>
