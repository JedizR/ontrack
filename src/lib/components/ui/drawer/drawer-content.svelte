<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import { cn } from "$lib/utils.js";
	import type { WithoutChildrenOrChild } from "$lib/utils.js";
	import DrawerOverlay from "./drawer-overlay.svelte";
	import DrawerPortal from "./drawer-portal.svelte";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		overlayClass,
		children,
		...restProps
	}: DrawerPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DrawerPortal>>;
		overlayClass?: string;
	} = $props();
</script>

<DrawerPortal {...portalProps}>
	<DrawerOverlay class={overlayClass} />
	<DrawerPrimitive.Content
		bind:ref
		data-slot="drawer-content"
		class={cn(
			"bg-surface text-ink fixed inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-sheet outline-none",
			className
		)}
		{...restProps}
	>
		<!-- grabber, 36 by 5 -->
		<div aria-hidden="true" class="bg-line-strong mx-auto mt-2 h-1.25 w-9 shrink-0 rounded-full"></div>
		{@render children?.()}
	</DrawerPrimitive.Content>
</DrawerPortal>
