'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { ModalPortalScope, useRootPortalContainer } from '@/components/ui/portal';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
	return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

type AlertDialogTriggerProps = React.ComponentProps<typeof AlertDialogPrimitive.Trigger> & {
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

function AlertDialogTrigger({ asChild, children, render, nativeButton, ...props }: AlertDialogTriggerProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<AlertDialogPrimitive.Trigger
			data-slot="alert-dialog-trigger"
			nativeButton={nativeButton ?? (childRender ? true : undefined)}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</AlertDialogPrimitive.Trigger>
	);
}

function AlertDialogPortal({
	container: containerProp,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
	const rootContainer = useRootPortalContainer();
	const container = containerProp === undefined ? (rootContainer ?? undefined) : containerProp;

	const style = {
		...(props.style ?? {}),
		['--z-layer-floating' as any]: 'var(--z-layer-floating-elevated)',
	} satisfies React.CSSProperties;

	return (
		<AlertDialogPrimitive.Portal
			data-slot="alert-dialog-portal"
			container={container}
			{...props}
			style={style}
		/>
	);
}

function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Backdrop>) {
	return (
		<AlertDialogPrimitive.Backdrop
			data-slot="alert-dialog-overlay"
			className={cn(
				'fixed inset-0 z-[var(--z-layer-modal-backdrop)] bg-black/80 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
				className,
			)}
			{...props}
		/>
	);
}

function AlertDialogContent({ className, children, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Popup>) {
	return (
		<AlertDialogPortal>
			<AlertDialogOverlay />
			<AlertDialogPrimitive.Popup
				data-slot="alert-dialog-content"
				className={cn(
					`bg-background fixed top-1/2 left-1/2 z-[var(--z-layer-modal-content)] grid max-h-[calc(100%-2rem)] w-full max-w-[calc(100%-2rem)]
					-translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border p-6 shadow-lg
					transition-[opacity,scale] duration-200 data-[ending-style]:scale-95 data-[starting-style]:scale-95
					data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 sm:max-w-100`,
					className,
				)}
				{...props}
			>
				{/* ModalPortalScope creates a scoped portal container for floating elements inside */}
				<ModalPortalScope>
					{children}
				</ModalPortalScope>
			</AlertDialogPrimitive.Popup>
		</AlertDialogPortal>
	);
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-dialog-header"
			className={cn('flex flex-col gap-1 text-center sm:text-left', className)}
			{...props}
		/>
	);
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-dialog-footer"
			className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)}
			{...props}
		/>
	);
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return (
		<AlertDialogPrimitive.Title
			data-slot="alert-dialog-title"
			className={cn('text-lg font-semibold', className)}
			{...props}
		/>
	);
}

function AlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			data-slot="alert-dialog-description"
			className={cn('text-muted-foreground text-sm', className)}
			{...props}
		/>
	);
}

/**
 * AlertDialogAction - A button that performs the primary action and closes the dialog.
 * Wraps AlertDialogPrimitive.Close with primary button styling.
 */
type AlertDialogCloseProps = React.ComponentProps<typeof AlertDialogPrimitive.Close> & {
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

function AlertDialogAction({
	asChild,
	children,
	render,
	nativeButton,
	className,
	...props
}: AlertDialogCloseProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<AlertDialogPrimitive.Close
			data-slot="alert-dialog-action"
			className={cn(buttonVariants(), className)}
			nativeButton={nativeButton ?? (childRender ? true : undefined)}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</AlertDialogPrimitive.Close>
	);
}

/**
 * AlertDialogCancel - A button that cancels the action and closes the dialog.
 * Wraps AlertDialogPrimitive.Close with outline button styling.
 */
function AlertDialogCancel({
	asChild,
	children,
	render,
	nativeButton,
	className,
	...props
}: AlertDialogCloseProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<AlertDialogPrimitive.Close
			data-slot="alert-dialog-cancel"
			className={cn(buttonVariants({ variant: 'outline' }), className)}
			nativeButton={nativeButton ?? (childRender ? true : undefined)}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</AlertDialogPrimitive.Close>
	);
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger,
};
