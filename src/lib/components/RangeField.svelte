<script lang="ts">
	import { Minus, Plus } from '@lucide/svelte';
	import Button from './Button.svelte';
	import { t } from '../i18n.svelte';

	let {
		id,
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		buttonStep = step,
		live = true,
		onvalue
	}: {
		id: string;
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		buttonStep?: number;
		live?: boolean;
		onvalue?: (value: number) => void;
	} = $props();

	const decimals = $derived((String(step).split('.')[1] ?? '').length);

	function set(next: number, commit: boolean) {
		const clamped = Math.min(max, Math.max(min, next));
		value = Number(clamped.toFixed(decimals));
		if (live || commit) onvalue?.(value);
	}
</script>

<div>
	<label class="mb-1.5 block text-[13px] font-medium text-ink-mute" for={id}>{label}</label>
	<div class="flex items-center gap-2">
		<Button
			variant="icon"
			class="size-8! shrink-0"
			aria-label={t('range.less')}
			disabled={value <= min}
			onclick={() => set(value - buttonStep, true)}
		>
			<Minus size={14} />
		</Button>
		<input
			{id}
			type="range"
			{min}
			{max}
			{step}
			{value}
			oninput={(event) => set(Number(event.currentTarget.value), false)}
			onchange={(event) => set(Number(event.currentTarget.value), true)}
			class="min-w-0 flex-1 accent-primary"
		/>
		<Button
			variant="icon"
			class="size-8! shrink-0"
			aria-label={t('range.more')}
			disabled={value >= max}
			onclick={() => set(value + buttonStep, true)}
		>
			<Plus size={14} />
		</Button>
	</div>
</div>
