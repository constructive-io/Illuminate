'use client';

import * as React from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from 'motion/react';

import { durations, easings } from '@/lib/motion/motion-config';
import { useControllableState } from '@/hooks/use-controllable-state';
import { ModalPortalScope, useRootPortalContainer } from '@/components/ui/portal';
import { cn } from '@/lib/utils';

// ============================================================================
// Sheet Stack Context - Manages nested/stacked sheets
// ============================================================================

type SheetInfo = {
	id: string;
	depth: number;
	close: () => void;
};

type SheetSize = {
	width: number;
	height: number;
};

type StackMode = 'cascade' | 'collapse';

type SheetStackContextType = {
	sheets: SheetInfo[];
	sheetSizes: Record<string, SheetSize | undefined>;
	stackMode: StackMode;
	registerSheet: (info: SheetInfo) => void;
	unregisterSheet: (id: string) => void;
	setSheetSize: (id: string, size: SheetSize) => void;
	getSheetSize: (id: string) => SheetSize | undefined;
	isTopSheet: (id: string) => boolean;
	getSheetsAbove: (id: string) => number;
};

const SheetStackContext = React.createContext<SheetStackContextType | undefined>(undefined);

const SHEET_INDENT = 24; // pixels to push outer sheets when inner opens

type SheetStackProviderProps = {
	children: React.ReactNode;
	/** Controls how sheets are pushed when stacking.
	 * - 'cascade' (default): Each sheet is incrementally indented by SHEET_INDENT
	 * - 'collapse': Only the sheet directly below the top gets full-width push, others cascade relative to it
	 */
	stackMode?: StackMode;
};

function SheetStackProvider({ children, stackMode = 'cascade' }: SheetStackProviderProps) {
	const [sheets, setSheets] = React.useState<SheetInfo[]>([]);
	const [sheetSizes, setSheetSizes] = React.useState<Record<string, SheetSize | undefined>>({});

	// Register sheet - insert sorted by depth (lower depth = earlier in array)
	// This ensures sheets are ordered correctly regardless of registration timing
	const registerSheet = React.useCallback((info: SheetInfo) => {
		setSheets((prev) => {
			if (prev.some((s) => s.id === info.id)) return prev;
			// Insert in sorted order by depth
			const newSheets = [...prev, info];
			newSheets.sort((a, b) => a.depth - b.depth);
			return newSheets;
		});
	}, []);

	const unregisterSheet = React.useCallback((id: string) => {
		setSheets((prev) => prev.filter((s) => s.id !== id));
		setSheetSizes((prev) => {
			if (!prev[id]) return prev;
			const next = { ...prev };
			delete next[id];
			return next;
		});
	}, []);

	const setSheetSize = React.useCallback((id: string, size: SheetSize) => {
		setSheetSizes((prev) => {
			const current = prev[id];
			if (current && current.width === size.width && current.height === size.height) return prev;
			return { ...prev, [id]: size };
		});
	}, []);

	const getSheetSize = React.useCallback((id: string) => sheetSizes[id], [sheetSizes]);

	// Topmost sheet = highest depth = last in sorted array
	const isTopSheet = React.useCallback((id: string) => {
		if (sheets.length === 0) return false;
		return sheets[sheets.length - 1]?.id === id;
	}, [sheets]);

	// Sheets above = sheets with higher depth than this one
	const getSheetsAbove = React.useCallback((id: string) => {
		const index = sheets.findIndex((s) => s.id === id);
		if (index === -1) return 0;
		// Sheets after this index have higher depth (are on top)
		return sheets.length - index - 1;
	}, [sheets]);

	// Memoize value - callbacks are stable, only sheets changes
	const value = React.useMemo(
		() => ({
			sheets,
			sheetSizes,
			stackMode,
			registerSheet,
			unregisterSheet,
			setSheetSize,
			getSheetSize,
			isTopSheet,
			getSheetsAbove,
		}),
		[sheets, sheetSizes, stackMode, registerSheet, unregisterSheet, setSheetSize, getSheetSize, isTopSheet, getSheetsAbove],
	);

	return <SheetStackContext.Provider value={value}>{children}</SheetStackContext.Provider>;
}

const useSheetStack = (): SheetStackContextType | undefined => {
	return React.useContext(SheetStackContext);
};

// ============================================================================
// Sheet Nesting Context - Tracks nesting level via React tree
// ============================================================================

type SheetNestingContextType = {
	level: number;
	parentSheetId: string | null;
};

const SheetNestingContext = React.createContext<SheetNestingContextType>({
	level: 0,
	parentSheetId: null,
});

const useSheetNesting = () => React.useContext(SheetNestingContext);

// ============================================================================
// Individual Sheet Context
// ============================================================================

type SheetContextType = {
	isOpen: boolean;
	sheetId: string;
	depth: number;
	sheetsAbove: number;
	isTopSheet: boolean;
	close: () => void;
};

const SheetContext = React.createContext<SheetContextType | undefined>(undefined);

const useSheet = (): SheetContextType => {
	const context = React.useContext(SheetContext);
	if (!context) {
		throw new Error('useSheet must be used within a Sheet');
	}
	return context;
};

type DialogChangeEventDetails = Parameters<NonNullable<React.ComponentProps<typeof SheetPrimitive.Root>['onOpenChange']>>[1];

type SheetProps = Omit<React.ComponentProps<typeof SheetPrimitive.Root>, 'onOpenChange'> & {
	/** Unique identifier for this sheet in a stack. Auto-generated if not provided. */
	sheetId?: string;
	/** Callback when open state changes - simplified to just boolean for backwards compatibility */
	onOpenChange?: (open: boolean) => void;
};

function Sheet({
	children,
	sheetId: providedId,
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	modal,
	...props
}: SheetProps) {
	const [isOpen, setIsOpen] = useControllableState({
		prop: openProp,
		defaultProp: defaultOpen,
		onChange: onOpenChange,
	});
	const sheetStack = useSheetStack();
	const nesting = useSheetNesting();
	const generatedId = React.useId();
	const sheetId = providedId ?? `sheet-${generatedId.replace(/:/g, '')}`;

	// Depth is determined by nesting level in React tree
	const depth = nesting.level;

	const close = React.useCallback(() => {
		setIsOpen(false);
	}, [setIsOpen]);

	const registerSheet = sheetStack?.registerSheet;
	const unregisterSheet = sheetStack?.unregisterSheet;

	// Register/unregister with stack when open state changes
	React.useEffect(() => {
		if (registerSheet && isOpen) {
			// Close any open dropdowns/popovers by blurring active element
			// This ensures selects close before the sheet stacks on top
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
			registerSheet({ id: sheetId, depth, close });
			return () => unregisterSheet?.(sheetId);
		}
	}, [isOpen, sheetId, depth, close, registerSheet, unregisterSheet]);

	// Base UI owns dismissal details; this adapter preserves the package's boolean callback.
	const handleOpenChange = React.useCallback((open: boolean, _eventDetails: DialogChangeEventDetails) => {
		setIsOpen(open);
	}, [setIsOpen]);

	// Calculate sheets above and whether this is the top sheet
	const sheetsAbove = sheetStack?.getSheetsAbove(sheetId) ?? 0;
	const isTopSheet = sheetStack?.isTopSheet(sheetId) ?? true;

	// Nested sheets must be non-modal to prevent Base UI from closing parent on interaction
	const isNested = depth > 0;

	return (
		<SheetNestingContext.Provider value={{ level: depth + 1, parentSheetId: sheetId }}>
			<SheetContext.Provider value={{ isOpen, sheetId, depth, sheetsAbove, isTopSheet, close }}>
				<SheetPrimitive.Root
					data-slot="sheet"
					{...props}
					open={isOpen}
					modal={isNested ? false : modal}
					onOpenChange={handleOpenChange}
				>
					{children}
				</SheetPrimitive.Root>
			</SheetContext.Provider>
		</SheetNestingContext.Provider>
	);
}

type SheetTriggerProps = React.ComponentProps<typeof SheetPrimitive.Trigger> & {
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

function SheetTrigger({ asChild, children, render, nativeButton, ...props }: SheetTriggerProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<SheetPrimitive.Trigger
			data-slot="sheet-trigger"
			nativeButton={nativeButton ?? (childRender ? true : undefined)}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</SheetPrimitive.Trigger>
	);
}

type SheetCloseProps = React.ComponentProps<typeof SheetPrimitive.Close> & {
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

function SheetClose({ asChild, children, render, nativeButton, ...props }: SheetCloseProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<SheetPrimitive.Close
			data-slot="sheet-close"
			nativeButton={nativeButton ?? (childRender ? true : undefined)}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</SheetPrimitive.Close>
	);
}

type SheetPortalProps = React.ComponentProps<typeof SheetPrimitive.Portal> & {
	/** @deprecated Base UI manages mounting automatically */
	forceMount?: boolean;
};

function SheetPortal({ forceMount: _forceMount, container: containerProp, ...props }: SheetPortalProps) {
	const rootContainer = useRootPortalContainer();
	const container = containerProp === undefined ? (rootContainer ?? undefined) : containerProp;

	const style = {
		...(props.style ?? {}),
		['--z-layer-floating' as any]: 'var(--z-layer-floating-elevated)',
	} satisfies React.CSSProperties;

	return <SheetPrimitive.Portal data-slot="sheet-portal" container={container} {...props} style={style} />;
}

type SheetOverlayProps = React.HTMLAttributes<HTMLDivElement> & {
	/** @deprecated Base UI Backdrop handles child elements natively */
	asChild?: boolean;
	/** @deprecated Base UI manages mounting automatically */
	forceMount?: boolean;
};

function SheetOverlay({ className, asChild: _asChild, forceMount: _forceMount, ...props }: SheetOverlayProps) {
	return (
		<SheetPrimitive.Backdrop
			data-slot="sheet-overlay"
			className={cn('fixed inset-0 z-[var(--z-layer-modal-backdrop)] bg-black/80', className)}
			{...props}
		/>
	);
}

const sheetVariants = cva('fixed flex flex-col gap-3 bg-background p-4 shadow-lg', {
	variants: {
		side: {
			top: 'inset-x-0 top-0 border-b',
			bottom: 'inset-x-0 bottom-0 border-t',
			left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
			right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
		},
	},
	defaultVariants: {
		side: 'right',
	},
});

type SheetContentProps = Omit<React.ComponentProps<typeof SheetPrimitive.Popup>, 'children'> &
	VariantProps<typeof sheetVariants> &
	HTMLMotionProps<'div'> & {
		transition?: Transition;
		overlay?: boolean;
		/** Whether to show the close button. Defaults to true. */
		showClose?: boolean;
		children?: React.ReactNode;
		/** @deprecated Base UI manages mounting automatically */
		forceMount?: boolean;
		/** @deprecated Use onOpenChange on Root instead */
		onInteractOutside?: (e: Event) => void;
		/** @deprecated Use onOpenChange on Root instead */
		onPointerDownOutside?: (e: Event) => void;
		/** @deprecated Use onOpenChange on Root instead */
		onEscapeKeyDown?: (e: KeyboardEvent) => void;
		/** @deprecated Use onOpenChange on Root instead */
		onFocusOutside?: (e: Event) => void;
	};

// Default width for nested sheets (used for collapse mode calculations)
// Using max-w-md (28rem = 448px) as the typical nested sheet width
const NESTED_SHEET_WIDTH = 448;

// Gap between the top two visible sheets in collapse mode
const SHEET_STACK_GAP = 0;

/**
 * Calculate the push offset based on side, number of sheets above, and stack mode.
 * - 'cascade': Each sheet is incrementally indented by SHEET_INDENT per layer above
 * - 'collapse': Bottom sheets are pushed to opposite side to make room for top sheet
 */
function getPushOffset(
	side: 'top' | 'bottom' | 'left' | 'right',
	sheetsAbove: number,
	stackMode: StackMode = 'cascade',
	collapseBaseSize: number = NESTED_SHEET_WIDTH,
): { x?: number | string; y?: number | string } {
	if (sheetsAbove === 0) {
		return { x: 0, y: 0 };
	}

	if (stackMode === 'collapse') {
		// Keep the top 2 sheets visible:
		// - The sheet directly under the top is pushed by (top sheet width + small gap)
		// - Deeper sheets cascade under that with a small indent per extra layer
		const baseOffset = collapseBaseSize + SHEET_STACK_GAP;
		const offset = baseOffset + (sheetsAbove - 1) * SHEET_INDENT;

		switch (side) {
			case 'right':
				return { x: -offset };
			case 'left':
				return { x: offset };
			case 'top':
				return { y: offset };
			case 'bottom':
				return { y: -offset };
		}
	}

	// Cascade mode: incremental indent
	const offset = sheetsAbove * SHEET_INDENT;

	switch (side) {
		case 'right':
			return { x: -offset };
		case 'left':
			return { x: offset };
		case 'top':
			return { y: offset };
		case 'bottom':
			return { y: -offset };
	}
}

/**
 * Get the initial position for sheet animation based on side.
 * Pure transform animation for GPU acceleration - no opacity/scale changes.
 */
function getInitialPosition(side: 'top' | 'bottom' | 'left' | 'right') {
	switch (side) {
		case 'right':
			return { x: '100%' };
		case 'left':
			return { x: '-100%' };
		case 'top':
			return { y: '-100%' };
		case 'bottom':
			return { y: '100%' };
	}
}

/**
 * Get the exit position for sheet animation based on side.
 * Pure transform for smooth GPU-accelerated exit.
 */
function getExitPosition(side: 'top' | 'bottom' | 'left' | 'right') {
	switch (side) {
		case 'right':
			return { x: '100%' };
		case 'left':
			return { x: '-100%' };
		case 'top':
			return { y: '-100%' };
		case 'bottom':
			return { y: '100%' };
	}
}

// Default sheet transition - fast tween for snappy, jank-free animation
const defaultSheetTransition: Transition = {
	type: 'tween',
	duration: durations.normal,
	ease: [0.32, 0.72, 0, 1], // Custom ease-out for snappy feel
};

function SheetContent({
	side = 'right',
	className,
	transition = defaultSheetTransition,
	overlay = true,
	showClose = true,
	children,
	forceMount: _forceMount,
	onInteractOutside: _onInteractOutside,
	onPointerDownOutside: _onPointerDownOutside,
	onEscapeKeyDown: _onEscapeKeyDown,
	onFocusOutside: _onFocusOutside,
	...props
}: SheetContentProps) {
	const { isOpen, depth, sheetId } = useSheet();
	const sheetStack = useSheetStack();

	// Calculate sheetsAbove directly from stack to ensure it's always current
	// sheetsAbove = number of sheets with higher depth (on top of this one)
	const sheetsAbove = sheetStack?.getSheetsAbove(sheetId) ?? 0;
	const stackMode = sheetStack?.stackMode ?? 'cascade';

	// Ensure side is never null (default already handles undefined, but TS needs explicit assertion)
	const resolvedSide = side ?? 'right';

	// Calculate z-index based on depth (base modal content z-index + depth * 10)
	// We use a calc() string to reference the CSS variable
	const zIndex = `calc(var(--z-layer-modal-content) + ${depth * 10})`;

	// Push offset for when sheets are stacked above this one
	// sheetsAbove > 0 means there are sheets on top, so this sheet should be pushed back
	const topSheetId = sheetStack?.sheets[sheetStack.sheets.length - 1]?.id;
	const topSheetSize = topSheetId ? sheetStack?.getSheetSize(topSheetId) : undefined;
	const collapseBaseSize = topSheetSize
		? resolvedSide === 'left' || resolvedSide === 'right'
			? topSheetSize.width
			: topSheetSize.height
		: undefined;

	const pushOffset = getPushOffset(resolvedSide, sheetsAbove, stackMode, collapseBaseSize ?? NESTED_SHEET_WIDTH);

	const contentRef = React.useRef<HTMLDivElement>(null);
	React.useLayoutEffect(() => {
		if (!isOpen) return;
		if (!sheetStack) return;
		const el = contentRef.current;
		if (!el) return;
		let rafId = 0;
		const update = () => {
			const rect = el.getBoundingClientRect();
			sheetStack.setSheetSize(sheetId, { width: rect.width, height: rect.height });
		};
		update();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(update);
		});
		ro.observe(el);
		return () => {
			cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	}, [isOpen, sheetId, sheetStack]);

	// Animate position includes base position (0) plus any push offset
	// Only transform properties for GPU acceleration
	const animatePosition = {
		x: pushOffset.x ?? 0,
		y: pushOffset.y ?? 0,
	};

	// Exit transition - slightly faster and snappier for physical feel
	const exitTransition: Transition = {
		type: 'tween',
		duration: durations.normal,
		ease: easings.physicalExit,
	};

	return (
		<AnimatePresence initial={false}>
			{isOpen && (
				<SheetPortal data-slot='sheet-portal'>
					{/* Only show overlay for the first (bottom-most) sheet in stack */}
					{overlay && depth === 0 && (
						<SheetPrimitive.Backdrop
							data-slot="sheet-overlay"
							render={
								<motion.div
									key='sheet-overlay'
									className='fixed inset-0 bg-black/80'
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: durations.fast, ease: 'easeOut' }}
									style={{ zIndex: 'var(--z-layer-modal-backdrop)' }}
								/>
							}
						/>
					)}
					<SheetPrimitive.Popup
						data-slot="sheet-content"
						data-sheet-depth={depth}
						data-sheet-id={sheetId}
						{...props}
						render={
							<motion.div
								key={`sheet-content-${sheetId}`}
								ref={contentRef}
								variants={{
									initial: getInitialPosition(resolvedSide),
									animate: animatePosition,
									exit: {
										...getExitPosition(resolvedSide),
										transition: exitTransition,
									},
								}}
								initial='initial'
								animate='animate'
								exit='exit'
								transition={transition}
								style={{ zIndex }}
								className={cn(sheetVariants({ side: resolvedSide }), className)}
							/>
						}
					>
						{/* ModalPortalScope creates a scoped portal container for floating elements inside */}
						<ModalPortalScope>
							{children}
						</ModalPortalScope>
						{showClose && (
							<SheetPrimitive.Close
								data-slot="sheet-close"
								className='ring-offset-background focus:ring-ring data-[open]:bg-secondary absolute top-4 right-4
									rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2
									focus:outline-none disabled:pointer-events-none'
							>
								<X className='h-4 w-4' />
								<span className='sr-only'>Close</span>
							</SheetPrimitive.Close>
						)}
					</SheetPrimitive.Popup>
				</SheetPortal>
			)}
		</AnimatePresence>
	);
}

type SheetHeaderProps = React.ComponentProps<'div'>;

function SheetHeader({ className, ...props }: SheetHeaderProps) {
	return (
		<div
			data-slot="sheet-header"
			className={cn('flex flex-col space-y-2 pb-4 text-center sm:text-left', className)}
			{...props}
		/>
	);
}

type SheetFooterProps = React.ComponentProps<'div'>;

function SheetFooter({ className, ...props }: SheetFooterProps) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn('flex flex-col-reverse pt-4 sm:flex-row sm:justify-end sm:space-x-2', className)}
			{...props}
		/>
	);
}

type SheetTitleProps = React.ComponentProps<typeof SheetPrimitive.Title>;

function SheetTitle({ className, ...props }: SheetTitleProps) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn('text-foreground text-lg font-semibold', className)}
			{...props}
		/>
	);
}

type SheetDescriptionProps = React.ComponentProps<typeof SheetPrimitive.Description>;

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn('text-muted-foreground text-sm', className)}
			{...props}
		/>
	);
}

export {
	// Stack provider for nested sheets
	SheetStackProvider,
	useSheetStack,
	// Individual sheet hooks
	useSheet,
	// Components
	Sheet,
	SheetPortal,
	SheetOverlay,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
	// Constants
	SHEET_INDENT,
	// Types
	type StackMode,
	type SheetStackProviderProps,
	type SheetProps,
	type SheetPortalProps,
	type SheetOverlayProps,
	type SheetTriggerProps,
	type SheetCloseProps,
	type SheetContentProps,
	type SheetHeaderProps,
	type SheetFooterProps,
	type SheetTitleProps,
	type SheetDescriptionProps,
};
