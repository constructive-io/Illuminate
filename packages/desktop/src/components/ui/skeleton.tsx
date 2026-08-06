import * as React from 'react';

import { cn } from '@/lib/utils';

type SkeletonProps = React.ComponentProps<'div'>;

/**
 * Loading placeholder with a soft left→right shimmer.
 * Uses the package `shimmer` keyframe (background-position) — not opacity pulse.
 */
function Skeleton({ className, ...props }: SkeletonProps) {
	return (
		<div
			data-slot="skeleton"
			className={cn(
				'rounded-md',
				// Quiet base (muted, not primary/10)
				'bg-muted',
				// Soft, low-contrast band — mostly muted with a faint lift mid-pass
				'[background-image:linear-gradient(90deg,var(--muted)_0%,color-mix(in_oklch,var(--muted)_92%,var(--foreground))_50%,var(--muted)_100%)]',
				'bg-[length:220%_100%]',
				// Slow, relaxed sweep
				'animate-[shimmer_4.5s_ease-in-out_infinite]',
				'motion-reduce:animate-none',
				className,
			)}
			{...props}
		/>
	);
}

export { Skeleton };
export type { SkeletonProps };
