'use client';

import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@/lib/utils';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface AppLinkRenderProps extends Omit<React.ComponentProps<'a'>, 'href'> {
	href: string;
}

type AppLinkRenderer = (props: AppLinkRenderProps) => React.ReactElement;

interface AppBreadcrumbItem {
	id: string;
	label: React.ReactNode;
	href?: string;
	current?: boolean;
}

type AppBarRootProps = useRender.ComponentProps<'header'> & React.ComponentProps<'header'>;

type AppBarProps = Omit<AppBarRootProps, 'children'> & {
	breadcrumbs?: readonly AppBreadcrumbItem[];
	renderLink?: AppLinkRenderer;
	leading?: React.ReactNode;
	search?: React.ReactNode;
	actions?: React.ReactNode;
	toggleLabel?: string;
};

function createAppLink(renderLink: AppLinkRenderer | undefined, props: AppLinkRenderProps) {
	return renderLink ? renderLink(props) : <a {...props} />;
}

function AppBar({
	breadcrumbs = [],
	renderLink,
	leading,
	search,
	actions,
	toggleLabel = 'Toggle navigation',
	className,
	render,
	...props
}: AppBarProps) {
	const content = (
		<div className='flex h-[var(--app-bar-height,3.5rem)] w-full min-w-0 items-center gap-2 px-3 sm:px-4'>
			<SidebarTrigger aria-label={toggleLabel} className='-ms-1 shrink-0' />
			{(leading || breadcrumbs.length > 0) && (
				<Separator orientation='vertical' className='mr-1 hidden h-4 self-center sm:block' />
			)}
			{leading}
			{breadcrumbs.length > 0 && (
				<Breadcrumb className='min-w-0 flex-1 sm:flex-none'>
					<BreadcrumbList className='flex-nowrap text-sm text-muted-foreground'>
						{breadcrumbs.map((item, index) => {
							const current = item.current ?? index === breadcrumbs.length - 1;
							const breadcrumbContent = current || !item.href ? (
								<BreadcrumbPage
									className='block max-w-48 truncate font-semibold text-foreground sm:max-w-56'
									title={typeof item.label === 'string' ? item.label : undefined}
								>
									{item.label}
								</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									className='hover:text-foreground'
									title={typeof item.label === 'string' ? item.label : undefined}
									render={createAppLink(renderLink, {
										href: item.href,
										children: item.label,
									})}
								/>
							);

							return (
								<React.Fragment key={item.id}>
									{index > 0 && (
										<BreadcrumbSeparator
											className='text-muted-foreground/70 hidden sm:block'
										/>
									)}
									<BreadcrumbItem className={cn('min-w-0', !current && 'hidden sm:flex')}>
										{breadcrumbContent}
									</BreadcrumbItem>
								</React.Fragment>
							);
						})}
					</BreadcrumbList>
				</Breadcrumb>
			)}
			{search && <div className='ml-auto min-w-0'>{search}</div>}
			{actions && (
				<div className={cn('flex shrink-0 items-center gap-2', !search && 'ml-auto')}>
					{actions}
				</div>
			)}
		</div>
	);

	return useRender({
		defaultTagName: 'header',
		props: mergeProps<'header'>(
			{
				className: cn('sticky top-0 z-30 flex w-full shrink-0 items-center border-b bg-background', className),
				children: content,
			},
			props,
		),
		render,
		state: {
			slot: 'app-bar',
		},
	});
}

export { AppBar, createAppLink };
export type { AppBarProps, AppBreadcrumbItem, AppLinkRenderer, AppLinkRenderProps };
