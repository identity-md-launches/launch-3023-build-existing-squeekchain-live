import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  API,
  formatInteger,
  formatNumber,
  formatTokens,
  isTelemetryStale,
  settlementUrl,
} from './data';
import type { SettlementRange, Settlements } from './data';
import { useDashboard } from './useDashboard';
import type { Resource } from './useDashboard';
import { HamsterMark, Icon } from './Icons';
import { Wheel } from './Wheel';
import { date, hour, ready, SourceNote, time } from './Display';
import { MiningPanel } from './MiningPanel';
import { ChainHealthPanel } from './ChainHealthPanel';

function Metric({
  label,
  icon,
  value,
  unit,
  note,
  accent = false,
}: {
  label: string;
  icon: 'work' | 'wheel' | 'blocks' | 'settle';
  value: ReactNode;
  unit?: string;
  note: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? 'metric-accent' : ''}`}>
      <div className="metric-label">
        <span>{label}</span>
        <Icon name={icon} />
      </div>
      <div className="metric-reading">
        <span
          className={`metric-value ${typeof value === 'string' && /Loading|Unavailable/.test(value) ? 'value-message' : ''}`}
        >
          {value}
        </span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

function SettlementChart({
  data,
  range,
}: {
  data: Settlements | null;
  range: SettlementRange;
}) {
  const [metric, setMetric] = useState<'count' | 'work'>('count');
  const buckets = data?.buckets ?? [];
  const values = buckets.map((b) => (metric === 'count' ? b.count : b.work));
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  const hasValues = values.some((v) => v !== null);
  const label = metric === 'count' ? 'Settlements' : 'Work units';
  const hourly =
    data?.bucketSeconds === 3600 ||
    (range === '24h' && data?.bucketSeconds == null);
  const period = hourly
    ? 'hour'
    : data?.bucketSeconds
      ? `${formatNumber(data.bucketSeconds / 3600, 0)} hours`
      : 'period';
  const intervalLabel = hourly ? 'hourly' : 'period';
  const axisLabel = (start: string) =>
    range === '7d' ? date(start) : hour(start);
  return (
    <>
      <div className="panel-heading chart-heading">
        <div>
          <h2>Settlement activity</h2>
          <p>
            {data?.bucketSeconds
              ? `Every ${period}, over the last ${range === '24h' ? '24 hours' : '7 days'}`
              : `Last ${range === '24h' ? '24 hours' : '7 days'} · API activity buckets`}
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Chart metric">
          <button
            type="button"
            aria-pressed={metric === 'count'}
            onClick={() => setMetric('count')}
          >
            Settlements
          </button>
          <button
            type="button"
            aria-pressed={metric === 'work'}
            onClick={() => setMetric('work')}
          >
            Work units
          </button>
        </div>
      </div>
      {buckets.length && hasValues ? (
        <figure className="chart">
          <div
            className="chart-body"
            role="img"
            aria-label={`${label} by ${period} in UTC. ${buckets.length} ${intervalLabel} buckets. Highest bucket value: ${formatNumber(max, 0)}. Exact values are available below.`}
          >
            <div className="chart-axis">
              <span>{formatNumber(max, 0)}</span>
              <span>{formatNumber(max / 2, max % 2 ? 1 : 0)}</span>
              <span>0</span>
            </div>
            <div className="plot">
              <div className="grid-line grid-line-top" />
              <div className="grid-line grid-line-middle" />
              <div className="grid-line grid-line-bottom" />
              <div className="bars">
                {buckets.map((b, i) => (
                  <div
                    className="bar-track"
                    key={b.start}
                    title={`${date(b.start)} ${hour(b.start)} UTC: ${values[i] === null ? 'unavailable' : formatNumber(values[i], 0)} ${label.toLowerCase()}`}
                  >
                    <div
                      className={`bar ${values[i] === 0 ? 'bar-zero' : ''}`}
                      style={{ height: `${((values[i] ?? 0) / max) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-times" aria-hidden="true">
            <span>{axisLabel(buckets[0].start)}</span>
            <span>
              {axisLabel(buckets[Math.floor(buckets.length / 2)].start)}
            </span>
            <span>{axisLabel(buckets[buckets.length - 1].start)}</span>
          </div>
          <figcaption>
            <span className="legend">
              <i />
              {label} per {period}
            </span>
            <span>
              {date(buckets[0].start)} –{' '}
              {date(buckets[buckets.length - 1].start)} · UTC
            </span>
          </figcaption>
        </figure>
      ) : (
        <div className="empty-chart">
          <Icon name="settle" size={32} />
          <p>
            {data
              ? 'No activity available for this window.'
              : 'Waiting for settlement activity…'}
          </p>
          <span>New data is checked every 10 seconds.</span>
        </div>
      )}
      {buckets.length > 0 && (
        <details className="chart-details">
          <summary>View {intervalLabel} values</summary>
          <div className="hourly-table">
            <table>
              <caption>Settlements and work units by {period} (UTC)</caption>
              <thead>
                <tr>
                  <th scope="col">Period starting</th>
                  <th scope="col">Settlements</th>
                  <th scope="col">Work units</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.start}>
                    <th scope="row">
                      {date(b.start)} {hour(b.start)}
                    </th>
                    <td>{formatNumber(b.count, 0)}</td>
                    <td>{formatNumber(b.work, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}

function RecentSettlements({
  resource,
  range,
}: {
  resource: Resource<Settlements>;
  range: SettlementRange;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = resource.data?.recent ?? [];
  const displayed = expanded ? rows : rows.slice(0, 5);
  const explorer =
    resource.data?.chainId === '11155111'
      ? 'https://sepolia.etherscan.io/tx/'
      : resource.data?.chainId === '1'
        ? 'https://etherscan.io/tx/'
        : null;
  return (
    <section
      className="panel recent-panel"
      id="settlements"
      aria-labelledby="settlements-heading"
    >
      <div className="panel-heading">
        <div>
          <h2 id="settlements-heading">Recent settlements</h2>
          <p>
            Latest entries returned by the{' '}
            {range === '24h' ? '24-hour' : '7-day'} API
          </p>
        </div>
        <span className="neutral-tag">
          Last {range === '24h' ? '24 hours' : '7 days'}
        </span>
      </div>
      <dl className="window-totals" aria-label="Settlement window totals">
        <div>
          <dt>Settlements</dt>
          <dd>{ready(resource, formatInteger(resource.data?.count))}</dd>
        </div>
        <div>
          <dt>Completed blocks</dt>
          <dd>{ready(resource, formatInteger(resource.data?.blocks))}</dd>
        </div>
        <div>
          <dt>Work units</dt>
          <dd>{ready(resource, formatInteger(resource.data?.work))}</dd>
        </div>
        <div>
          <dt>Active rounds</dt>
          <dd>{ready(resource, formatInteger(resource.data?.activeRounds))}</dd>
        </div>
      </dl>
      {resource.data?.windowStart && resource.data.windowEnd && (
        <p className="window-dates">
          API window: {date(resource.data.windowStart)}{' '}
          {hour(resource.data.windowStart)} to {date(resource.data.windowEnd)}{' '}
          {hour(resource.data.windowEnd)} UTC.
        </p>
      )}
      {displayed.length ? (
        <div className="settlement-list" role="list">
          <div className="list-columns" aria-hidden="true">
            <span>Round / transaction</span>
            <span>Work units</span>
            <span>Blocks</span>
            <span>Settled at (UTC)</span>
          </div>
          {displayed.map((row) => (
            <div className="settlement-row" key={row.hash} role="listitem">
              <div className="settlement-identity">
                <span className="transaction-icon">
                  <Icon name="settle" />
                </span>
                <div>
                  <span className="round-label">
                    Round {formatInteger(row.round)}
                  </span>
                  {explorer ? (
                    <a
                      className="transaction-link"
                      href={`${explorer}${row.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      title={row.hash}
                      aria-label={`View settlement transaction ${row.hash.slice(0, 8)}…${row.hash.slice(-6)} (${row.hash}) on ${resource.data?.chainId === '11155111' ? 'Sepolia ' : ''}Etherscan (opens in a new tab)`}
                    >
                      {row.hash.slice(0, 8)}…{row.hash.slice(-6)}
                      <Icon name="arrow" size={12} />
                    </a>
                  ) : (
                    <span className="transaction-hash">{row.hash}</span>
                  )}
                </div>
              </div>
              <div className="row-number">
                <span className="mobile-label" aria-hidden="true">
                  Work units
                </span>
                <span className="sr-only">Work units: </span>
                {formatInteger(row.work)}
              </div>
              <div className="row-number">
                <span className="mobile-label" aria-hidden="true">
                  Blocks
                </span>
                <span className="sr-only">Blocks: </span>
                {formatInteger(row.blocks)}
              </div>
              <div className="settlement-time">
                <span className="sr-only">Settled at (UTC): </span>
                <time
                  dateTime={row.time ?? undefined}
                  title={row.time ?? undefined}
                >
                  {time(row.time)}
                </time>
                <span className="confirmation">
                  <Icon
                    name={
                      row.confirmation === 'safe' ||
                      row.confirmation === 'finalized'
                        ? 'check'
                        : 'clock'
                    }
                    size={12}
                  />
                  {row.time && `${date(row.time)} · `}
                  {row.confirmation === 'safe'
                    ? 'Safe'
                    : row.confirmation === 'finalized'
                      ? 'Finalized'
                      : (row.confirmation ?? 'Unconfirmed')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="settle" size={32} />
          <p>
            {resource.error
              ? 'Settlements are unavailable.'
              : resource.data
                ? 'No recent settlements in this window.'
                : 'Loading recent settlements…'}
          </p>
          <span>
            {resource.data
              ? 'The API may return fewer entries than the summary total.'
              : 'The next refresh will try again automatically.'}
          </span>
        </div>
      )}
      <div className="panel-bottom">
        <SourceNote resource={resource} name="Settlements" />
        {rows.length > 5 && (
          <button
            className="text-button"
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
          >
            {expanded ? 'Show fewer' : `Show all ${rows.length} returned`}
          </button>
        )}
      </div>
    </section>
  );
}

export function App() {
  const dashboard = useDashboard();
  const {
    status,
    settlements,
    economy,
    refreshing,
    refresh,
    now,
    secondsUntilRefresh,
    announcement,
    range,
    changeRange,
  } = dashboard;
  const [pauseMotion, setPauseMotion] = useState(false);
  const s = status.data,
    e = economy.data,
    st = settlements.data;
  const stale = isTelemetryStale(s, now) || status.error;
  const spinning = s?.core === 'SPINNING';
  const failures = [
    status.error && 'wheel telemetry',
    settlements.error && 'settlements',
    economy.error && 'economy',
  ].filter(Boolean);
  const loaded = Boolean(s || e || st);
  const connection = failures.length
    ? failures.length === 3
      ? 'Connection interrupted'
      : 'Partial update'
    : !loaded
      ? 'Connecting'
      : isTelemetryStale(s, now)
        ? 'Telemetry stale'
        : 'Live data';
  const coreLabel =
    s?.core === 'IDLE'
      ? 'Idle'
      : spinning
        ? 'Spinning'
        : status.error || s
          ? 'Unavailable'
          : 'Connecting';
  const statusNote = status.error
    ? 'Last known telemetry'
    : isTelemetryStale(s, now)
      ? 'Telemetry is stale'
      : 'From the wheel sensor';

  return (
    <>
      <a className="skip-link" href="#overview">
        Skip to dashboard
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            href="#overview"
            className="brand"
            aria-label="Squeekchain dashboard"
          >
            <HamsterMark />
            <span>
              Squeekchain<span className="brand-dot">.</span>
            </span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#overview">Overview</a>
            <a href="#settlements">Settlements</a>
            <a href="#mining">Mining</a>
            <a href="#health">Health</a>
            <a href="#about">About</a>
          </nav>
          <a
            className="api-link"
            href={API.status}
            target="_blank"
            rel="noreferrer"
          >
            View live API
            <Icon name="arrow" size={16} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </header>

      <main className="page-shell" id="overview">
        <div className="page-intro">
          <div>
            <h1>Squeekchain Live Dashboard</h1>
            <p>
              A hamster-powered proof-of-work chain. A real hamster runs the
              wheel. The wheel produces blocks.
            </p>
          </div>
          <span
            className={`connection ${failures.length || isTelemetryStale(s, now) ? 'connection-warning' : ''}`}
          >
            <i />
            {connection}
          </span>
        </div>

        <div className="refresh-bar">
          <div className="refresh-description">
            <Icon name="refresh" size={16} />
            <span>
              Auto-refresh every 10s
              <span className="countdown" aria-hidden="true">
                {' '}
                · Next in {secondsUntilRefresh}s
              </span>
            </span>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={refresh}
            disabled={refreshing}
          >
            <Icon
              name="refresh"
              size={16}
              className={refreshing ? 'refreshing' : ''}
            />
            {refreshing ? 'Refreshing…' : 'Refresh now'}
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        <div
          role="status"
          aria-live="polite"
          className={failures.length ? 'error-banner' : 'sr-only'}
        >
          {failures.length > 0 && (
            <>
              <Icon name="info" size={20} />
              <p>
                Could not refresh {failures.join(', ')}. Last received values
                stay visible. Retrying every 10 seconds; use Refresh now to
                retry sooner.
              </p>
            </>
          )}
        </div>

        <section className="window-control" aria-labelledby="window-heading">
          <div>
            <h2 id="window-heading">Settlement window</h2>
            <p>Totals, chart and recent list</p>
          </div>
          <div
            className="segmented range-buttons"
            role="group"
            aria-label="Settlement window"
          >
            <button
              type="button"
              aria-pressed={range === '24h'}
              onClick={() => changeRange('24h')}
            >
              24h
            </button>
            <button
              type="button"
              aria-pressed={range === '7d'}
              onClick={() => changeRange('7d')}
            >
              7d
            </button>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Live chain summary">
          <Metric
            label="Cumulative work"
            icon="work"
            value={ready(status, formatInteger(s?.work))}
            note={stale ? statusNote : 'Work units from the wheel'}
            accent
          />
          <Metric
            label="Wheel speed"
            icon="wheel"
            value={ready(status, formatNumber(s?.rpm))}
            unit={s?.rpm != null ? 'RPM' : undefined}
            note={
              s?.speed != null
                ? `${formatNumber(s.speed)} mm/s${stale ? ' · Last known' : ''}`
                : 'Linear speed unavailable'
            }
          />
          <Metric
            label="Current block"
            icon="blocks"
            value={ready(status, formatInteger(s?.block))}
            note={
              s?.progress != null ? (
                <>
                  <span className="mini-progress" aria-hidden="true">
                    <i style={{ width: `${s.progress}%` }} />
                  </span>
                  {formatNumber(s.progress)}% complete
                </>
              ) : (
                'Block progress unavailable'
              )
            }
          />
          <Metric
            label={`${range} settlements`}
            icon="settle"
            value={ready(settlements, formatInteger(st?.count))}
            note={
              settlements.error
                ? 'Last received total'
                : st?.blocks != null
                  ? `${formatInteger(st.blocks)} blocks completed`
                  : `Across the last ${range === '24h' ? '24 hours' : '7 days'}`
            }
          />
        </section>

        <div className="telemetry-grid">
          <section
            className="panel wheel-panel"
            aria-labelledby="wheel-heading"
          >
            <div className="panel-heading">
              <h2 id="wheel-heading">The wheel</h2>
              <span
                className={`core-status ${spinning && !stale ? 'core-spinning' : ''}`}
                title={s?.core ? `coreStatus: ${s.core}` : undefined}
              >
                <i />
                {coreLabel}
                {stale && s ? ' · Last known' : ''}
              </span>
            </div>
            <div className="wheel-scene">
              <Wheel spinning={spinning && !stale} paused={pauseMotion} />
              <div className="scene-caption">
                <span className="sensor-dot" />
                {stale
                  ? 'Waiting for fresh telemetry'
                  : s?.core === 'IDLE'
                    ? 'Taking a well-earned breather'
                    : spinning
                      ? 'A little movement. A new block closer.'
                      : 'Waiting for the wheel sensor'}
              </div>
            </div>
            <div className="wheel-readout">
              <div>
                <span>Core status</span>
                <strong>{coreLabel}</strong>
              </div>
              <div>
                <span>Wheel speed</span>
                <strong>
                  {ready(status, formatNumber(s?.rpm))}
                  {s?.rpm != null && <small> RPM</small>}
                </strong>
              </div>
              <button
                type="button"
                className="motion-button"
                onClick={() => setPauseMotion((p) => !p)}
                aria-pressed={pauseMotion}
                aria-label="Pause wheel illustration"
                title={
                  pauseMotion
                    ? 'Resume wheel illustration'
                    : 'Pause wheel illustration'
                }
              >
                <Icon name={pauseMotion ? 'play' : 'pause'} size={16} />
                <span>{pauseMotion ? 'Resume' : 'Pause'} illustration</span>
              </button>
            </div>
            <SourceNote resource={status} name="Wheel telemetry" />
            {isTelemetryStale(s, now) && (
              <p className="telemetry-warning">
                The sensor observation is stale. Displaying the last known
                reading.
              </p>
            )}
          </section>
          <section
            className="panel activity-panel"
            aria-label="Settlement activity"
          >
            <SettlementChart data={st} range={range} />
            <SourceNote resource={settlements} name="Settlement activity" />
          </section>
        </div>

        <section className="block-section" aria-labelledby="block-heading">
          <div className="block-section-icon">
            <Icon name="blocks" size={24} />
          </div>
          <div className="block-text">
            <h2 id="block-heading">Building the next block</h2>
            <p>Work from the wheel, anchored on the chain.</p>
          </div>
          <div className="block-meter">
            <div>
              <span>Block progress</span>
              <strong>
                {ready(
                  status,
                  s?.progress == null
                    ? 'Unavailable'
                    : `${formatNumber(s.progress, 2)}%`,
                )}
              </strong>
            </div>
            {s?.progress != null ? (
              <progress
                max="100"
                value={s.progress}
                aria-label="Current block progress"
              />
            ) : (
              <div className="progress-placeholder" aria-hidden="true" />
            )}
            <div className="progress-endpoints">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </section>

        <RecentSettlements key={range} resource={settlements} range={range} />

        <section
          className="panel economy-panel"
          aria-labelledby="economy-heading"
        >
          <div className="panel-heading">
            <div>
              <h2 id="economy-heading">Chain economy</h2>
              <p>Token supply and the current settlement round</p>
            </div>
            <span className="neutral-tag">
              {e?.chain
                ? `${e.chain[0].toUpperCase()}${e.chain.slice(1)}`
                : 'Network pending'}
            </span>
          </div>
          <dl className="economy-grid">
            <div>
              <dt>Live supply{e ? ` · ${e.symbol}` : ''}</dt>
              <dd>{ready(economy, formatTokens(e?.supply, e?.decimals))}</dd>
            </div>
            <div>
              <dt>Supply cap{e ? ` · ${e.symbol}` : ''}</dt>
              <dd>{ready(economy, formatTokens(e?.cap, e?.decimals, 0))}</dd>
            </div>
            <div>
              <dt>Current round</dt>
              <dd>{ready(economy, formatInteger(e?.round))}</dd>
            </div>
            <div>
              <dt>Economy status</dt>
              <dd
                className={`economy-stage ${e?.paused ? 'economy-paused' : ''}`}
              >
                {e?.stage && <span className="status-dot" />}
                {ready(
                  economy,
                  e?.paused
                    ? 'Paused'
                    : e?.stage
                      ? e.stage[0].toUpperCase() + e.stage.slice(1)
                      : 'Unavailable',
                )}
              </dd>
            </div>
          </dl>
          <SourceNote resource={economy} name="Economy" />
        </section>

        <div className="chain-panels">
          <MiningPanel economy={economy} settlements={settlements} />
          <ChainHealthPanel
            status={status}
            economy={economy}
            settlements={settlements}
            now={now}
          />
        </div>

        <section
          className="about-section"
          id="about"
          aria-labelledby="about-heading"
        >
          <div className="about-copy">
            <h2 id="about-heading">Small hamster. Real proof of work.</h2>
            <p>
              Squeekchain turns a real hamster’s wheel rotations into measurable
              work. That work builds blocks, and settlements record it on the
              chain.
            </p>
            <p>
              This dashboard follows the public telemetry. When the hamster
              rests, the wheel can be idle while the chain keeps its progress.
            </p>
          </div>
          <div
            className="work-flow"
            aria-label="Wheel rotations produce work units, which build blocks"
          >
            <div>
              <span>
                <Icon name="wheel" size={28} />
              </span>
              <strong>Wheel rotations</strong>
            </div>
            <i aria-hidden="true">→</i>
            <div>
              <span>
                <Icon name="work" size={28} />
              </span>
              <strong>Work units</strong>
            </div>
            <i aria-hidden="true">→</i>
            <div>
              <span>
                <Icon name="blocks" size={28} />
              </span>
              <strong>Blocks</strong>
            </div>
          </div>
        </section>

        <section className="data-sources" aria-labelledby="sources-heading">
          <h2 id="sources-heading">Straight from the source</h2>
          <p>Public Squeekchain data, checked every 10 seconds.</p>
          <div>
            <a href={API.status} target="_blank" rel="noreferrer">
              Wheel telemetry
              <Icon name="arrow" size={16} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={settlementUrl(range)} target="_blank" rel="noreferrer">
              {range} settlements
              <Icon name="arrow" size={16} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={API.economy} target="_blank" rel="noreferrer">
              Economy state
              <Icon name="arrow" size={16} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <span className="footer-brand">
            <HamsterMark />
            Squeekchain
          </span>
          <span>Powered by one very small miner.</span>
        </div>
        <span>All timestamps in UTC · Live from the public API</span>
      </footer>
    </>
  );
}
