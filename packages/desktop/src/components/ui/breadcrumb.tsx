'use client';

import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
	return <nav aria-label='breadcrumb' data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(
				'text-muted-foreground/50 flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5',
				className,
			)}
			{...props}
		/>
	);
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
	return <li data-slot="breadcrumb-item" className={cn('inline-flex items-center gap-1.5', className)} {...props} />;
}

function BreadcrumbLink({
	asChild,
	render,
	className,
	children,
	...props
}: useRender.ComponentProps<'a'> &
	React.ComponentProps<'a'> & {
	asChild?: boolean;
}) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return useRender({
		defaultTagName: 'a',
		props: mergeProps<'a'>(
			{
				className: cn('text-muted-foreground/60 transition-colors hover:text-foreground', className),
				children: childRender ? undefined : children,
			},
			props,
		),
		render: render ?? childRender,
		state: {
			slot: 'breadcrumb-link',
		},
	});
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot="breadcrumb-page"
			role='link'
			aria-disabled='true'
			aria-current='page'
			className={cn('text-foreground font-normal', className)}
			{...props}
		/>
	);
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li data-slot="breadcrumb-separator" role='presentation' aria-hidden='true' className={className} {...props}>
			{children ?? <ChevronRightIcon size={16} />}
		</li>
	);
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot="breadcrumb-ellipsis"
			role='presentation'
			aria-hidden='true'
			className={cn('flex size-5 items-center justify-center', className)}
			{...props}
		>
			<MoreHorizontalIcon size={16} />
			<span className='sr-only'>More</span>
		</span>
	);
}

export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
};
