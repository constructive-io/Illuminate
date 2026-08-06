'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

class MobileBreakpointStore {
	private static instance: MobileBreakpointStore | undefined;
	private readonly listeners = new Set<() => void>();
	private readonly mediaQuery: MediaQueryList | undefined;
	private isMobile = false;

	private constructor() {
		if (typeof window === 'undefined') return;

		this.mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		this.isMobile = this.mediaQuery.matches;
		this.mediaQuery.addEventListener('change', this.handleChange, { passive: true });
	}

	static getInstance(): MobileBreakpointStore {
		if (!MobileBreakpointStore.instance) {
			MobileBreakpointStore.instance = new MobileBreakpointStore();
		}

		return MobileBreakpointStore.instance;
	}

	private handleChange = (event: MediaQueryListEvent) => {
		this.isMobile = event.matches;
		this.listeners.forEach((listener) => listener());
	};

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	getSnapshot = (): boolean => this.isMobile;

	getServerSnapshot = (): boolean => false;
}

export function useIsMobile(): boolean {
	const store = MobileBreakpointStore.getInstance();
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
