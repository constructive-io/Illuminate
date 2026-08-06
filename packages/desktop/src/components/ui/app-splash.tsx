import { ConstructiveLoader } from '@/components/ui/constructive-loader';
import { cn } from '@/lib/utils';

// Full-window boot splash: the animated Constructive cube loader assembling
// rather than an empty shell or bare "Loading…" text. Mirrors the pre-React
// #boot-splash in index.html so there's no visual jump on hand-off to React.
export function AppSplash({ className }: { className?: string }) {
  return (
    <div
      data-testid='app-splash'
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background',
        className
      )}
    >
      <ConstructiveLoader />
    </div>
  );
}
