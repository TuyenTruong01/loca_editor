import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function formatElapsedTime(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pair = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${pair(hours)}:${pair(minutes)}:${pair(seconds)}` : `${pair(minutes)}:${pair(seconds)}`;
}

export function useElapsedTimer() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const interval = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (interval.current !== null) window.clearInterval(interval.current);
    interval.current = null;
  }, []);

  const update = useCallback(() => {
    if (startedAt.current !== null) setElapsedSeconds(Math.floor((performance.now() - startedAt.current) / 1000));
  }, []);

  const start = useCallback(() => {
    startedAt.current = performance.now();
    setElapsedSeconds(0);
    setIsRunning(true);
    if (interval.current === null) interval.current = window.setInterval(update, 250);
  }, [update]);

  const stop = useCallback(() => {
    if (startedAt.current !== null) setElapsedSeconds(Math.floor((performance.now() - startedAt.current) / 1000));
    startedAt.current = null;
    setIsRunning(false);
    clear();
  }, [clear]);

  const reset = useCallback(() => {
    startedAt.current = null;
    setElapsedSeconds(0);
    setIsRunning(false);
    clear();
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { elapsedSeconds, formattedTime: useMemo(() => formatElapsedTime(elapsedSeconds), [elapsedSeconds]), isRunning, start, stop, reset };
}
