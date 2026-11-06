import {
  formatInteger,
  formatNumber,
  formatTokens,
  explorerBase,
  nextHalving,
  SQK_REFERENCE,
  supplyPercent,
} from './data';
import type { Economy, Settlements } from './data';
import type { Resource } from './useDashboard';
import { date, ready, SourceNote, time } from './Display';
import { Icon } from './Icons';

export const stateLabel = (value: string | null | undefined) =>
  value
    ? value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ')
    : 'Unavailable';

function Contract({
  label,
  address,
  explorer,
}: {
  label: string;
  address: string;
  explorer: string | null;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="contract-address">
        {explorer ? (
          <a
            href={`${explorer}/address/${address}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>{address}</span>
            <Icon name="arrow" size={16} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span>{address}</span>
        )}
      </dd>
    </div>
  );
}

export function MiningPanel({
  economy,
  settlements,
}: {
  economy: Resource<Economy>;
  settlements: Resource<Settlements>;
}) {
  const e = economy.data,
    m = settlements.data?.mining;
  const referenceCap =
    e?.decimals == null
      ? null
      : String(21_000_000_000n * 10n ** BigInt(e.decimals));
  const referencePremint =
    e?.decimals == null
      ? null
      : String(2_100_000_000n * 10n ** BigInt(e.decimals));
  const percent = supplyPercent(e?.totalMinted, referenceCap);
  const different =
    e &&
    ((e.cap != null && referenceCap != null && e.cap !== referenceCap) ||
      (e.premint != null &&
        referencePremint != null &&
        e.premint !== referencePremint));
  const explorer = explorerBase(e?.chainId);
  return (
    <section
      className="panel mining-panel"
      id="mining"
      aria-labelledby="mining-heading"
    >
      <div className="panel-heading">
        <div>
          <h2 id="mining-heading">SQK mining</h2>
          <p>Minted supply, the reward schedule and the next round</p>
        </div>
        <Icon name="work" />
      </div>

      <div className="supply-reading">
        <span>Total minted · SQK</span>
        <strong>
          {ready(economy, formatTokens(e?.totalMinted, e?.decimals))}
        </strong>
        <span>
          of {formatTokens(SQK_REFERENCE.cap, SQK_REFERENCE.decimals, 0)} SQK
          reference cap
        </span>
      </div>
      {percent !== null ? (
        <>
          <progress
            max="100"
            value={Math.min(100, percent)}
            aria-label="Total minted as a percentage of the 21 billion SQK reference cap"
          />
          <p className="supply-caption">
            {formatNumber(percent, 2)}% of the 21B reference cap minted
          </p>
        </>
      ) : (
        <p className="supply-caption">
          Waiting for minted supply from the economy API.
        </p>
      )}

      <div
        className={`supply-reference ${different ? 'reference-warning' : ''}`}
      >
        <p>
          <strong>Supply reference:</strong> 21B cap · 2.1B premint.
        </p>
        {different && (
          <p>
            The API reports a different supply schedule; this meter uses the
            21B reference cap and API values appear below.
          </p>
        )}
      </div>
      <dl className="mining-stats">
        <div>
          <dt>API supply cap · SQK</dt>
          <dd>{ready(economy, formatTokens(e?.cap, e?.decimals, 0))}</dd>
        </div>
        <div>
          <dt>API premint · SQK</dt>
          <dd>{ready(economy, formatTokens(e?.premint, e?.decimals, 0))}</dd>
        </div>
        <div>
          <dt>Mining minted · SQK</dt>
          <dd>{ready(economy, formatTokens(e?.mined, e?.decimals))}</dd>
        </div>
        <div>
          <dt>Unminted capacity · SQK</dt>
          <dd>{ready(economy, formatTokens(e?.remaining, e?.decimals))}</dd>
        </div>
        <div>
          <dt>Halving interval</dt>
          <dd>
            {ready(economy, formatInteger(e?.halvingBlocks))}
            <small> blocks</small>
          </dd>
        </div>
        <div>
          <dt>Next halving at block</dt>
          <dd>{ready(economy, formatInteger(nextHalving(e)))}</dd>
        </div>
        <div>
          <dt>Bonus blocks</dt>
          <dd>{ready(economy, formatInteger(e?.bonusBlocks))}</dd>
        </div>
        <div>
          <dt>Launch bonus · SQK</dt>
          <dd>
            {ready(economy, formatTokens(e?.launchBonus, e?.decimals, 0))}
          </dd>
        </div>
      </dl>
      <SourceNote resource={economy} name="Mining supply and schedule" />

      <div className="next-round">
        <div className="next-round-heading">
          <h3>
            Next round
            {m?.nextRound != null ? ` · ${formatInteger(m.nextRound)}` : ''}
          </h3>
          <span className="neutral-tag">
            {m
              ? stateLabel(m.nextState)
              : settlements.error
                ? 'Unavailable'
                : settlements.data
                  ? 'Unavailable'
                  : 'Loading'}
          </span>
        </div>
        {m ? (
          <>
            <dl className="round-stats">
              <div>
                <dt>Projected mint · SQK</dt>
                <dd>{formatTokens(m.nextAmount, m.decimals)}</dd>
              </div>
              <div>
                <dt>Completed blocks</dt>
                <dd>{formatInteger(m.nextBlocks)}</dd>
              </div>
              <div>
                <dt>Processed through round</dt>
                <dd>{formatInteger(m.processedRound)}</dd>
              </div>
            </dl>
            <p className="round-window">
              Reported window:{' '}
              {m.startsAt
                ? `${date(m.startsAt)} ${time(m.startsAt)}`
                : 'Unavailable'}{' '}
              to{' '}
              {m.endsAt ? `${date(m.endsAt)} ${time(m.endsAt)}` : 'Unavailable'}{' '}
              UTC.
            </p>
            <p className="round-window">
              Projection from the API, subject to settlement.
            </p>
          </>
        ) : (
          <p className="round-window">
            {settlements.data || settlements.error
              ? 'Next-round details are unavailable; each refresh retries.'
              : 'Loading next-round details from settlements…'}
          </p>
        )}
        <SourceNote resource={settlements} name="Mining round" />
      </div>
      <dl className="contract-list">
        <Contract
          label="Mining contract"
          address={SQK_REFERENCE.mining}
          explorer={explorer}
        />
        <Contract
          label="SQK token contract"
          address={SQK_REFERENCE.token}
          explorer={explorer}
        />
      </dl>
    </section>
  );
}
