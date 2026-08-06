'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { useFloatingOverlayPortalProps } from '@/components/ui/portal';
import { cn } from '@/lib/utils';

type TooltipProviderProps = React.ComponentProps<typeof TooltipPrimitive.Provider> & {
	/** @deprecated Use delay instead */
	delayDuration?: number;
};

function TooltipProvider({ delay = 0, delayDuration, ...props }: TooltipProviderProps) {
	return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delayDuration ?? delay} {...props} />;
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
	/** @deprecated Use delay on Trigger instead */
	delayDuration?: number;
};

function Tooltip({ delayDuration: _delayDuration, ...props }: TooltipProps) {
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

type TooltipTriggerProps = React.ComponentProps<typeof TooltipPrimitive.Trigger> & {
	delay?: number;
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

function TooltipTrigger({ delay = 0, asChild, children, render, ...props }: TooltipTriggerProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<TooltipPrimitive.Trigger
			data-slot="tooltip-trigger"
			delay={delay}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</TooltipPrimitive.Trigger>
	);
}

type TooltipContentProps = React.ComponentProps<typeof TooltipPrimitive.Popup> & {
	sideOffset?: number;
	showArrow?: boolean;
	side?: 'top' | 'bottom' | 'left' | 'right';
	align?: 'start' | 'center' | 'end';
};

function TooltipContent({
	className,
	sideOffset = 4,
	showArrow = false,
	side = 'top',
	align = 'center',
	children,
	...props
}: TooltipContentProps) {
	const { container, zIndexClass } = useFloatingOverlayPortalProps();

	return (
		<TooltipPrimitive.Portal container={container}>
			<TooltipPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className={zIndexClass}>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(
						`bg-popover text-popover-foreground origin-(--transform-origin) relative max-w-70 rounded-md border px-2 py-1
						text-xs transition-[scale,opacity,translate] duration-150 ease-out data-starting-style:scale-95
						data-ending-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0
						data-[side=bottom]:data-starting-style:-translate-y-2
						data-[side=left]:data-starting-style:translate-x-2
						data-[side=right]:data-starting-style:-translate-x-2
						data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none`,
						className,
					)}
					{...props}
					role="tooltip"
				>
					{children}
					{showArrow && (
						<TooltipPrimitive.Arrow className='fill-popover -my-px drop-shadow-[0_1px_0_hsl(var(--border))]' />
					)}
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
