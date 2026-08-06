import { useCallback, useEffect, useRef, useState } from 'react';

type UseControllableStateParams<T> = {
	prop?: T;
	defaultProp?: T;
	onChange?: (value: T) => void;
};

/**
 * Hook for managing controlled/uncontrolled state.
 * Supports both controlled (prop-driven) and uncontrolled (internal state) patterns.
 */
export function useControllableState<T>({
	prop,
	defaultProp,
	onChange,
}: UseControllableStateParams<T>): [T, (value: T) => void] {
	const [uncontrolledValue, setUncontrolledValue] = useState<T>(defaultProp as T);
	const isControlled = prop !== undefined;
	const value = isControlled ? prop : uncontrolledValue;

	// Store onChange in ref to keep callback stable
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const setValue = useCallback(
		(newValue: T) => {
			if (!isControlled) {
				setUncontrolledValue(newValue);
			}
			onChangeRef.current?.(newValue);
		},
		[isControlled],
	);

	return [value, setValue];
}
