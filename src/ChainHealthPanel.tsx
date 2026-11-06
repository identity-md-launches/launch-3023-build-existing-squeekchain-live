import { explorerBase, formatInteger, isTelemetryStale } from './data';
import type { Economy, Settlements, Status } from './data';
import type { Resource } from './useDashboard';
import { date, ready, SourceNote, time } from './Display';
import { stateLabel } from './MiningPanel';
import { Icon } from './Icons';

function roundRange(
  first: string | null | undefined,
  last: string | null | undefined,
) {
  if (first == null || last == null) return 'Unavailable';
  return first === last
    ? formatInteger(first)
    : `${formatInteger(first)}–${formatInteger(last)}`;
}

function Freshness({
  label,
  timestamp,
  now,
  staleAfter,
  failed = false,
}: {
  label: string;
  timestamp: string | null | undefined;
  now: number;
  staleAfter: number;
  failed?: boolean;
}) {
  const seconds = timestamp
    ? Math.max(0, Math.floor((now - Date.parse(timestamp)) / 1000))
    : null;
  const age =
    seconds === null
      ? null
      : seconds < 60
        ? `${seconds}s`
        : seconds < 3600
          ? `${Math.floor(seconds / 60)}m`
          : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  const stale = seconds !== null && seconds > staleAfter;
  return (
    <div>
      <dt>{label}</dt>
      <dd className={stale || failed ? 'freshness-delayed' : ''}>
        {age === null
          ? 'Unavailable'
          : `${age} ago · ${stale ? 'Stale' : 'Fresh'}`}
        {failed ? ' · Refresh failed' : ''}
        {timestamp && (
          <time dateTime={timestamp}>
            {date(timestamp)} {time(timestamp)} UTC
          </time>
        )}
      </dd>
    </div>
  );
}

export function ChainHealthPanel({
  status,
  economy,
  settlements,
  now,
}: {
  status: Resource<Status>;
  economy: Resource<Economy>;
  settlements: Resource<Settlements>;
  now: number;
}) {
  const s = status.data,
    h = s?.health;
  const emptyQueue = h?.bufferedCount === '0';
  const projectedRound =
    h?.bufferedLast ?? (emptyQueue ? h?.anchorRound : null);
  const explorer = explorerBase(
    economy.data?.chainId ?? settlements.data?.chainId,
  );
  const delayed =
    status.error ||
    isTelemetryStale(s, now) ||
    (s?.generatedAt != null &&
      now - Date.parse(s.generatedAt) > s.staleAfterSeconds * 1000);
  const badge = status.error
    ? 'Refresh failed'
    : !s
      ? 'Connecting'
      : delayed
        ? 'Snapshot delayed'
        : 'Latest snapshot';
  return (
    <section
      className="panel health-panel"
      id="health"
      aria-labelledby="health-heading"
    >
      <div className="panel-heading">
        <div>
          <h2 id="health-heading">Chain health</h2>
          <p>From oracle acceptance to the settlement anchor</p>
        </div>
      </div>
      <p className={`health-snapshot ${delayed ? 'freshness-delayed' : ''}`}>
        <Icon name={delayed ? 'clock' : 'info'} size={16} />
        {badge}
      </p>
      <dl className="health-stats">
        <div>
          <dt>Oracle acceptance</dt>
          <dd>
            {ready(status, stateLabel(h?.oracle))}
            {h?.oracleReason && <p>{h.oracleReason}</p>}
            <p>
              Last accepted:{' '}
              {h?.acceptedAt
                ? `${date(h.acceptedAt)} ${time(h.acceptedAt)} UTC`
                : 'Unavailable'}
            </p>
          </dd>
        </div>
        <div>
          <dt>Settlement queue</dt>
          <dd>
            {ready(status, stateLabel(h?.queue))}
            <p>
              Settlements{' '}
              {h?.queueEnabled === true
                ? 'enabled'
                : h?.queueEnabled === false
                  ? 'disabled'
                  : 'availability unknown'}
              {h?.incident === true ? ' · Incident open' : ''}
            </p>
            {h?.queueReason && <p>{h.queueReason}</p>}
          </dd>
        </div>
        <div>
          <dt>Queued closed rounds</dt>
          <dd>
            {ready(status, formatInteger(h?.queuedCount))}
            <p>{formatInteger(h?.queuedWork)} queued work units</p>
          </dd>
        </div>
        <div>
          <dt>Buffered rounds</dt>
          <dd>
            {ready(
              status,
              emptyQueue
                ? 'None queued'
                : roundRange(h?.bufferedFirst, h?.bufferedLast),
            )}
            <p>
              {formatInteger(h?.bufferedCount)}{' '}
              {h?.bufferedCount === '1' ? 'round' : 'rounds'} ·{' '}
              {formatInteger(h?.bufferedWork)} work units
            </p>
          </dd>
        </div>
        <div>
          <dt>Projected through round</dt>
          <dd>
            {ready(status, formatInteger(projectedRound))}
            <p>
              {emptyQueue
                ? 'No queued rounds; at the anchor'
                : `Queue projection · ${h?.projection ?? 'status unavailable'}`}
            </p>
          </dd>
        </div>
        <div>
          <dt>Projected block height</dt>
          <dd>
            {ready(status, formatInteger(h?.projectedBlock))}
            <p>
              {formatInteger(h?.projectedBlocks)} additional completed blocks
            </p>
          </dd>
        </div>
      </dl>
      <p className="health-detail">
        Open-round work: {ready(status, formatInteger(h?.openWork))} units.
        Latest oracle closure: round{' '}
        {roundRange(h?.closureFirst, h?.closureLast)}.
      </p>
      <div className="anchor-detail">
        <h3>Anchor transaction</h3>
        {h?.anchorHash ? (
          <>
            {explorer ? (
              <a
                className="anchor-link"
                href={`${explorer}/tx/${h.anchorHash}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>{h.anchorHash}</span>
                <Icon name="arrow" size={16} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <p className="anchor-hash">{h.anchorHash}</p>
            )}
            <p>
              Settled through round {formatInteger(h.anchorRound)}
              {h.anchorAt
                ? ` · ${date(h.anchorAt)} ${time(h.anchorAt)} UTC`
                : ''}
            </p>
          </>
        ) : (
          <p>
            {status.error || s
              ? 'Anchor transaction unavailable.'
              : 'Loading the latest anchor…'}
          </p>
        )}
      </div>
      <div className="freshness-section">
        <h3>Data freshness</h3>
        <p>
          API timestamps, separate from fetch time. Stale after{' '}
          {s?.staleAfterSeconds ?? 120}s.
        </p>
        <dl className="freshness-list">
          <Freshness
            label="Sensor observation"
            timestamp={s?.observedAt}
            now={now}
            staleAfter={s?.staleAfterSeconds ?? 120}
            failed={status.error}
          />
          <Freshness
            label="Status generated"
            timestamp={s?.generatedAt}
            now={now}
            staleAfter={s?.staleAfterSeconds ?? 120}
            failed={status.error}
          />
          <Freshness
            label="Economy generated"
            timestamp={economy.data?.generatedAt}
            now={now}
            staleAfter={s?.staleAfterSeconds ?? 120}
            failed={economy.error}
          />
          <Freshness
            label="Settlements generated"
            timestamp={settlements.data?.generatedAt}
            now={now}
            staleAfter={s?.staleAfterSeconds ?? 120}
            failed={settlements.error}
          />
        </dl>
      </div>
      <SourceNote resource={status} name="Chain health" />
    </section>
  );
}
