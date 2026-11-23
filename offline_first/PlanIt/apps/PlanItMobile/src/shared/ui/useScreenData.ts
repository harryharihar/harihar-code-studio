import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

import type { AsyncState } from './asyncState';

/**
 * Loads a screen's data and keeps it fresh.
 *
 * - First load (or after an error) shows the spinner.
 * - Later reloads keep the current list on screen (no flicker while searching).
 * - Reloads when the screen comes back into focus, e.g. after saving a task.
 * - Ignores an older response that arrives after a newer one.
 *
 * `load` must be wrapped in useCallback; it reloads when `load` changes.
 */
export function useScreenData<T>(load: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const hasData = useRef(false);
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    if (!hasData.current) {
      setState({ status: 'loading' });
    }
    try {
      const data = await load();
      if (request === latestRequest.current) {
        hasData.current = true;
        setState({ status: 'success', data });
      }
    } catch (error) {
      if (request === latestRequest.current) {
        hasData.current = false;
        const message =
          error instanceof Error ? error.message : 'Something went wrong';
        setState({ status: 'error', message });
      }
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { state, reload };
}
