import { useCallback, useEffect, useRef, useState } from 'react';
import {
  API,
  fetchData,
  parseEconomy,
  parseSettlements,
  parseStatus,
  REFRESH_MS,
  REQUEST_TIMEOUT_MS,
  readRange,
  settlementUrl,
} from './data';
import type { Economy, SettlementRange, Settlements, Status } from './data';

export interface Resource<T> {
  data: T | null;
  error: boolean;
  updatedAt: number | null;
}
const empty = <T>(): Resource<T> => ({
  data: null,
  error: false,
  updatedAt: null,
});

export function useDashboard() {
  const [range, setRange] = useState<SettlementRange>(() =>
    readRange(window.location.search),
  );
  const [status, setStatus] = useState(empty<Status>);
  const [settlements, setSettlements] = useState(empty<Settlements>);
  const [economy, setEconomy] = useState(empty<Economy>);
  const [refreshing, setRefreshing] = useState(false);
  const [nextRefresh, setNextRefresh] = useState(Date.now() + REFRESH_MS);
  const [now, setNow] = useState(Date.now());
  const [announcement, setAnnouncement] = useState('');
  const refreshRef = useRef<(manual?: boolean) => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(true), []);

  const changeRange = useCallback(
    (next: SettlementRange) => {
      if (next === range) return;
      const url = new URL(window.location.href);
      url.searchParams.set('range', next);
      window.history.pushState(null, '', url);
      // A new window starts empty; old totals must never appear under its label.
      setSettlements(empty<Settlements>());
      setRange(next);
      setAnnouncement(
        `Loading ${next === '24h' ? '24-hour' : '7-day'} settlements.`,
      );
    },
    [range],
  );

  useEffect(() => {
    const navigate = () => {
      const next = readRange(window.location.search);
      if (next !== range) {
        setSettlements(empty<Settlements>());
        setRange(next);
      }
    };
    window.addEventListener('popstate', navigate);
    return () => window.removeEventListener('popstate', navigate);
  }, [range]);

  useEffect(() => {
    let active = true,
      running = false,
      initial = true;
    let interval: number | undefined;
    const controllers = new Set<AbortController>();
    async function load(manual = false) {
      if (running || !active) return;
      running = true;
      setRefreshing(true);
      setNextRefresh(Date.now() + REFRESH_MS);
      window.clearTimeout(interval);
      interval = window.setTimeout(() => {
        void load();
      }, REFRESH_MS);
      const update = async <T>(
        url: string,
        parse: (v: unknown) => T,
        set: React.Dispatch<React.SetStateAction<Resource<T>>>,
      ) => {
        const controller = new AbortController();
        controllers.add(controller);
        const timeout = window.setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS,
        );
        try {
          const data = await fetchData(url, parse, controller.signal);
          if (active) set({ data, error: false, updatedAt: Date.now() });
          return true;
        } catch {
          if (active) set((previous) => ({ ...previous, error: true }));
          return false;
        } finally {
          window.clearTimeout(timeout);
          controllers.delete(controller);
        }
      };
      const results = await Promise.all([
        update(API.status, parseStatus, setStatus),
        update(
          settlementUrl(range),
          (raw) => parseSettlements(raw, range),
          setSettlements,
        ),
        update(API.economy, parseEconomy, setEconomy),
      ]);
      running = false;
      if (active) {
        setRefreshing(false);
        if (manual)
          setAnnouncement(
            results.every(Boolean)
              ? `Dashboard refreshed at ${new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC' })} UTC.`
              : 'Some sources could not refresh. Retrying automatically.',
          );
        else if (initial)
          setAnnouncement(
            results[1]
              ? `Showing ${range} settlement totals, chart and recent list.`
              : `The ${range} settlement window could not load; retrying automatically.`,
          );
        initial = false;
      }
    }
    refreshRef.current = (manual) => {
      void load(manual);
    };
    void load();
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const resume = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      window.clearTimeout(interval);
      window.clearInterval(clock);
      document.removeEventListener('visibilitychange', resume);
      controllers.forEach((c) => c.abort());
    };
  }, [range]);

  return {
    status,
    settlements,
    economy,
    refreshing,
    refresh,
    now,
    announcement,
    range,
    changeRange,
    secondsUntilRefresh: Math.min(
      REFRESH_MS / 1000,
      Math.max(0, Math.ceil((nextRefresh - now) / 1000)),
    ),
  };
}
