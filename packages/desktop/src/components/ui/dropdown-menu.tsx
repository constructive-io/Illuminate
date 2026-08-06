'use client';

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';

import { useFloatingOverlayPortalProps } from '@/components/ui/portal';
import { cn } from '@/lib/utils';

const DropdownMenuGroupContext = React.createContext(false);

function DropdownMenu({ ...props }: React.ComponentProps<typeof MenuPrimitive.Root>) {
	return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof MenuPrimitive.Portal>) {
	const { container } = useFloatingOverlayPortalProps();
	return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" container={container} {...props} />;
}

type DropdownMenuTriggerProps = React.ComponentProps<typeof MenuPrimitive.Trigger> & {
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

function DropdownMenuTrigger({ asChild, children, render, nativeButton, ...props }: DropdownMenuTriggerProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<MenuPrimitive.Trigger
			data-slot="dropdown-menu-trigger"
			nativeButton={nativeButton ?? (childRender ? true : undefined)}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</MenuPrimitive.Trigger>
	);
}

type DropdownMenuContentProps = React.ComponentProps<typeof MenuPrimitive.Popup> & {
	sideOffset?: number;
	side?: 'top' | 'bottom' | 'left' | 'right';
	align?: 'start' | 'center' | 'end';
	/** @deprecated Not supported in Base UI */
	onPointerDown?: (e: React.PointerEvent) => void;
	/** @deprecated Not supported in Base UI */
	onPointerDownOutside?: (e: Event) => void;
	/** @deprecated Not supported in Base UI */
	onCloseAutoFocus?: (e: Event) => void;
	/** @deprecated Base UI menus mount on open automatically */
	forceMount?: boolean;
};

function DropdownMenuContent({
	className,
	sideOffset = 4,
	side = 'bottom',
	align = 'start',
	onPointerDown: _onPointerDown,
	onPointerDownOutside: _onPointerDownOutside,
	onCloseAutoFocus: _onCloseAutoFocus,
	forceMount: _forceMount,
	...props
}: DropdownMenuContentProps) {
	const { zIndexClass } = useFloatingOverlayPortalProps();

	return (
		<DropdownMenuPortal>
			<MenuPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className={zIndexClass}>
				<MenuPrimitive.Popup
					data-slot="dropdown-menu-content"
					className={cn(
						`bg-popover text-popover-foreground origin-(--transform-origin) min-w-40 overflow-hidden rounded-md border p-1
						shadow-lg transition-[scale,opacity,translate] duration-150 ease-out data-starting-style:scale-95
						data-ending-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0
						data-[side=bottom]:data-starting-style:-translate-y-2
						data-[side=left]:data-starting-style:translate-x-2
						data-[side=right]:data-starting-style:-translate-x-2
						data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none`,
						className,
					)}
					{...props}
				/>
			</MenuPrimitive.Positioner>
		</DropdownMenuPortal>
	);
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof MenuPrimitive.Group>) {
	return (
		<DropdownMenuGroupContext.Provider value={true}>
			<MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
		</DropdownMenuGroupContext.Provider>
	);
}

type DropdownMenuItemProps = React.ComponentProps<typeof MenuPrimitive.Item> & {
	inset?: boolean;
	variant?: 'default' | 'destructive';
	/** When true, merges props onto the child element instead of rendering a div */
	asChild?: boolean;
};

function DropdownMenuItem({
	className,
	inset,
	variant = 'default',
	asChild,
	children,
	render,
	...props
}: DropdownMenuItemProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;
	const itemClassName = cn(
		`data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[variant=destructive]:text-destructive
		data-[variant=destructive]:data-[highlighted]:bg-destructive/10 dark:data-[variant=destructive]:data-[highlighted]:bg-destructive/40
		data-[variant=destructive]:data-[highlighted]:text-destructive
		data-[variant=destructive]:*:[svg]:!text-destructive relative flex cursor-default items-center gap-2 pointer-coarse:min-h-11
		rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none
		data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0`,
		className,
	);

	return (
		<MenuPrimitive.Item
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			className={itemClassName}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</MenuPrimitive.Item>
	);
}

function DropdownMenuCheckboxItem({
	className,
	children,
	checked,
	...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
	return (
		<MenuPrimitive.CheckboxItem
			data-slot="dropdown-menu-checkbox-item"
			className={cn(
				`data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5
				pr-2 pl-8 text-sm outline-hidden select-none pointer-coarse:min-h-11 data-[disabled]:pointer-events-none data-[disabled]:opacity-50
				[&_svg]:pointer-events-none [&_svg]:shrink-0`,
				className,
			)}
			checked={checked}
			{...props}
		>
			<span className='pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'>
					<MenuPrimitive.CheckboxItemIndicator
						keepMounted
						className='transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] data-unchecked:scale-[0.25] data-unchecked:opacity-0 data-unchecked:blur-[4px] motion-reduce:transition-none'
					>
					<CheckIcon size={16} />
				</MenuPrimitive.CheckboxItemIndicator>
			</span>
			{children}
		</MenuPrimitive.CheckboxItem>
	);
}

function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof MenuPrimitive.RadioGroup>) {
	return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItem>) {
	return (
		<MenuPrimitive.RadioItem
			data-slot="dropdown-menu-radio-item"
			className={cn(
				`data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5
				pr-2 pl-8 text-sm outline-hidden select-none pointer-coarse:min-h-11 data-[disabled]:pointer-events-none data-[disabled]:opacity-50
				[&_svg]:pointer-events-none [&_svg]:shrink-0`,
				className,
			)}
			{...props}
		>
			<span className='pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'>
					<MenuPrimitive.RadioItemIndicator
						keepMounted
						className='transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] data-unchecked:scale-[0.25] data-unchecked:opacity-0 data-unchecked:blur-[4px] motion-reduce:transition-none'
					>
					<CircleIcon className='size-2 fill-current' />
				</MenuPrimitive.RadioItemIndicator>
			</span>
			{children}
		</MenuPrimitive.RadioItem>
	);
}

/**
 * Uses Base UI's semantic GroupLabel inside DropdownMenuGroup. The standalone
 * div fallback preserves compatibility with earlier Constructive menu markup,
 * where labels were allowed directly inside DropdownMenuContent.
 */
function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<'div'> & {
	inset?: boolean;
}) {
	const isGrouped = React.useContext(DropdownMenuGroupContext);
	const labelProps = {
		'data-slot': 'dropdown-menu-label',
		'data-inset': inset,
		className: cn('text-muted-foreground px-2 py-1.5 text-xs font-medium data-[inset]:pl-8', className),
		...props,
	};

	if (isGrouped) {
		return <MenuPrimitive.GroupLabel {...labelProps} />;
	}

	return (
		<div {...labelProps} />
	);
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
	return (
		<MenuPrimitive.Separator
			data-slot="dropdown-menu-separator"
			className={cn('bg-border -mx-1 my-1 h-px', className)}
			{...props}
		/>
	);
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<kbd
			data-slot="dropdown-menu-shortcut"
			className={cn(
				`bg-background text-muted-foreground/70 ms-auto -me-1 inline-flex h-5 max-h-full items-center rounded border
				px-1 font-[inherit] text-[0.625rem] font-medium`,
				className,
			)}
			{...props}
		/>
	);
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
	return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger> & {
	inset?: boolean;
}) {
	return (
		<MenuPrimitive.SubmenuTrigger
			data-slot="dropdown-menu-sub-trigger"
			data-inset={inset}
			className={cn(
				`data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[popup-open]:bg-accent
				data-[popup-open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm pointer-coarse:min-h-11
				outline-hidden select-none data-[inset]:pl-8`,
				className,
			)}
			{...props}
		>
			{children}
			<ChevronRightIcon size={16} className='text-muted-foreground/80 ml-auto' />
		</MenuPrimitive.SubmenuTrigger>
	);
}

function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Popup>) {
	const { container, zIndexClass } = useFloatingOverlayPortalProps();

	return (
		<MenuPrimitive.Portal container={container}>
			<MenuPrimitive.Positioner side='right' sideOffset={-4} className={zIndexClass}>
				<MenuPrimitive.Popup
					data-slot="dropdown-menu-sub-content"
					className={cn(
						`bg-popover text-popover-foreground origin-(--transform-origin) min-w-40 overflow-hidden rounded-md border p-1
						shadow-lg transition-[scale,opacity,translate] duration-150 ease-out data-starting-style:scale-95
						data-ending-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0
						data-[side=bottom]:data-starting-style:-translate-y-2
						data-[side=left]:data-starting-style:translate-x-2
						data-[side=right]:data-starting-style:-translate-x-2
						data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none`,
						className,
					)}
					{...props}
				/>
			</MenuPrimitive.Positioner>
		</MenuPrimitive.Portal>
	);
}

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
};
