import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { Slot } from '@/lib/slot';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
	"[&_svg]:-mx-0.5 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium text-sm outline-none transition-[box-shadow,scale] duration-150 ease-out before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 motion-reduce:transition-shadow [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		defaultVariants: {
			size: 'default',
			static: false,
			variant: 'default',
		},
		variants: {
			static: {
				false: 'motion-safe:active:not-disabled:scale-[0.96]',
				true: null,
			},
			size: {
				default: 'h-10 min-w-10 px-[calc(--spacing(3)-1px)] pointer-coarse:min-h-11 pointer-coarse:min-w-11',
				icon: 'size-10 pointer-coarse:size-11',
				'icon-lg': 'size-11',
				'icon-sm': 'size-8 pointer-coarse:size-11',
				'icon-xl': 'size-11 [&_svg:not([class*="size-"])]:size-5',
				'icon-xs':
					'size-7 rounded-md before:rounded-[calc(var(--radius-md)-1px)] pointer-coarse:size-11 not-in-data-[slot=input-group]:[&_svg:not([class*="size-"])]:size-4',
				lg: 'h-11 min-w-11 px-[calc(--spacing(3.5)-1px)]',
				sm:
					'h-8 gap-1.5 px-[calc(--spacing(2.5)-1px)] pointer-coarse:min-h-11 pointer-coarse:min-w-11',
				xl: 'h-12 min-w-12 px-[calc(--spacing(4)-1px)] text-lg [&_svg:not([class*="size-"])]:size-5',
				xs:
					'h-7 gap-1 rounded-md px-[calc(--spacing(2)-1px)] text-xs before:rounded-[calc(var(--radius-md)-1px)] pointer-coarse:min-h-11 pointer-coarse:min-w-11 [&_svg:not([class*="size-"])]:size-3.5',
			},
			variant: {
				default:
					'not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] border-primary bg-primary text-primary-foreground shadow-primary/24 shadow-xs hover:bg-primary/90 [:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)] [:disabled,:active,[data-pressed]]:shadow-none',
				destructive:
					'not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] border-destructive bg-destructive text-white shadow-destructive/24 shadow-xs hover:bg-destructive/90 [:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)] [:disabled,:active,[data-pressed]]:shadow-none',
				'destructive-outline':
					'border-destructive/40 bg-transparent bg-clip-padding text-destructive shadow-xs not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/4%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [:disabled,:active,[data-pressed]]:shadow-none [:hover,[data-pressed]]:border-destructive/60 [:hover,[data-pressed]]:bg-destructive/8',
				ghost: 'border-transparent hover:bg-accent data-pressed:bg-accent',
				link: 'border-transparent underline-offset-4 hover:underline',
				outline:
					'border-border bg-background bg-clip-padding shadow-xs not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/4%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [:disabled,:active,[data-pressed]]:shadow-none [:hover,[data-pressed]]:bg-accent/50 dark:[:hover,[data-pressed]]:bg-input/64',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 [:active,[data-pressed]]:bg-secondary/80',
			},
		},
	},
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: VariantProps<typeof buttonVariants>['variant'];
	size?: VariantProps<typeof buttonVariants>['size'];
	/** Disables tactile press scaling when motion would distract from the interaction. */
	static?: boolean;
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, static: isStatic, asChild, children, type = 'button', ...props }, ref) => {
		const buttonClasses = cn(buttonVariants({ className, size, static: isStatic, variant }));
		const Comp = asChild ? Slot : 'button';

		if (asChild) {
			const SlottedComp = Comp as typeof Slot;
			return (
				<SlottedComp
					ref={ref as React.Ref<HTMLElement>}
					className={buttonClasses}
					data-slot="button"
					{...props}
				>
					{children}
				</SlottedComp>
			);
		}

		return (
			<button ref={ref} type={type} className={buttonClasses} data-slot="button" {...props}>
				{children}
			</button>
		);
	},
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };
