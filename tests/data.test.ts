import assert from 'node:assert/strict';
import test from 'node:test';
import {
  finiteNumber,
  formatInteger,
  formatTokens,
  integerString,
  isTelemetryStale,
  parseEconomy,
  parseSettlements,
  parseStatus,
  nextHalving,
  readRange,
  settlementUrl,
  supplyPercent,
} from '../src/data.ts';
import {
  economyFixture,
  settlementsFixture,
  statusFixture,
} from './fixtures.ts';

test('wheel conversions, anchor progress and genuine zero readings', () => {
  const s = parseStatus({
    measurement: {
      cumulativeWorkUnits: '9007199254740993',
      rpmMilli: 12550,
      speedMmPerSecond: 181,
      coreStatus: 'SPINNING',
    },
    builder: { anchor: { blockHeight: '4118', blockProgress: '503463521' } },
  });
  assert.equal(s.rpm, 12.55);
  assert.ok(Math.abs(s.progress! - 50.3463521) < 1e-10);
  assert.equal(formatInteger(s.work), '9,007,199,254,740,993');
  const idle = parseStatus({
    measurement: { rpmMilli: 0, speedMmPerSecond: 0, coreStatus: 'IDLE' },
    builder: { anchor: { blockProgress: '0', blockHeight: '0' } },
  });
  assert.equal(idle.rpm, 0);
  assert.equal(idle.progress, 0);
  assert.equal(idle.core, 'IDLE');
});

test('missing, malformed and unsafe readings never become made-up zeroes', () => {
  for (const value of [
    null,
    undefined,
    '',
    ' ',
    false,
    NaN,
    Infinity,
    -1,
    {},
    'abc',
  ])
    assert.equal(finiteNumber(value), null);
  assert.equal(integerString(9007199254740992), null);
  const s = parseStatus({
    measurement: { rpmMilli: null, coreStatus: 'BROKEN' },
    builder: { anchor: { blockProgress: '1000000001' } },
  });
  assert.equal(s.rpm, null);
  assert.equal(s.work, null);
  assert.equal(s.core, null);
  assert.equal(s.progress, null);
  assert.throws(() => parseStatus({}));
});

test('token amounts preserve precision, decimals and tiny amounts', () => {
  assert.equal(formatTokens('16387784752755398547956254', 18), '16,387,784.75');
  assert.equal(
    formatTokens('2100000000000000000000000000', 18, 0),
    '2,100,000,000',
  );
  assert.equal(formatTokens('1', 18), '0.00');
  assert.equal(formatTokens('12345', 2), '123.45');
  assert.equal(formatTokens('12', 0), '12');
  assert.equal(formatTokens(null, 18), 'Unavailable');
  assert.equal(formatTokens('12', null), 'Unavailable');
});

test('settlement summary is independent of the limited recent list', () => {
  const s = parseSettlements({
    status: 'available',
    summary: {
      settlementCount: '140',
      workAdded: '13098',
      completedBlockCount: '1124',
    },
    recentSettlements: [
      {
        transactionHash: `0x${'a'.repeat(64)}`,
        settledThroughRound: '518',
        workAdded: '466',
      },
    ],
    buckets: [
      { startAt: '2026-10-30T03:00:00Z', settlementCount: '6', workAdded: '0' },
    ],
    chain: { chainId: '11155111' },
  });
  assert.equal(s.count, '140');
  assert.equal(s.recent.length, 1);
  assert.equal(s.buckets[0].count, 6);
  assert.equal(s.buckets[0].work, 0);
  assert.equal(s.chainId, '11155111');
  assert.throws(() => parseSettlements({ status: 'unavailable' }));
});

test('stale observation timestamps and upstream freshness are surfaced', () => {
  const raw = {
    measurement: {
      observedAt: '2026-10-30T03:00:00Z',
      freshness: 'online',
      staleAfterSeconds: 120,
    },
  };
  assert.equal(
    isTelemetryStale(parseStatus(raw), Date.parse('2026-10-30T03:01:00Z')),
    false,
  );
  assert.equal(
    isTelemetryStale(parseStatus(raw), Date.parse('2026-10-30T03:03:00Z')),
    true,
  );
  assert.equal(
    isTelemetryStale(parseStatus({ measurement: { freshness: 'offline' } })),
    true,
  );
});

test('economy consumes authoritative fields and rejects unavailable source', () => {
  const e = parseEconomy({
    status: 'available',
    supply: { liveSupplyBaseUnits: '12345', capBaseUnits: '90000' },
    asset: { decimals: 2, symbol: 'SQK' },
    lifecycle: { currentRound: '531', paused: false, stage: 'active' },
    chain: { target: 'sepolia' },
  });
  assert.equal(formatTokens(e.supply, e.decimals), '123.45');
  assert.equal(e.round, '531');
  assert.equal(e.chain, 'sepolia');
  assert.throws(() => parseEconomy({ status: 'unavailable' }));
});

test('mining uses total minted separately from live supply and keeps base-unit precision', () => {
  const e = parseEconomy(economyFixture());
  assert.equal(formatTokens(e.totalMinted, e.decimals), '2,116,387,784.75');
  assert.notEqual(e.totalMinted, e.supply);
  assert.equal(supplyPercent(e.totalMinted, e.cap), 10.07);
  assert.equal(supplyPercent('0', '100'), 0);
  assert.equal(supplyPercent('1', '0'), null);
  assert.equal(supplyPercent(null, '10'), null);
  assert.equal(e.bonusBlocks, '97020');
  assert.equal(nextHalving(e), '393470');
  assert.equal(nextHalving({ ...e, closedThroughBlock: '393470' }), '786940');
  assert.equal(nextHalving({ ...e, halvingBlocks: '0' }), null);
  assert.equal(nextHalving({ ...e, closedThroughBlock: null }), null);
});

test('range URLs are bounded and a mismatched API range cannot relabel old data', () => {
  assert.equal(readRange('?range=7d&other=keep'), '7d');
  assert.equal(readRange('?range=unknown'), '24h');
  assert.equal(
    settlementUrl('7d'),
    'https://api.squeekchain.com/v1/settlements?range=7d',
  );
  const s = parseSettlements(settlementsFixture(0, '7d'), '7d');
  assert.equal(s.range, '7d');
  assert.equal(s.bucketSeconds, 21600);
  assert.equal(s.count, '7140');
  assert.equal(s.buckets.length, 28);
  assert.equal(s.mining?.nextRound, '531');
  assert.throws(() => parseSettlements(settlementsFixture(), '7d'));
});

test('health retains zero counts, rejected oracle reasons and queue failures', () => {
  const fixture = statusFixture();
  const s = parseStatus({
    ...fixture,
    oracle: {
      ...fixture.oracle,
      state: 'rejected',
      reason: 'Counter regressed',
    },
    settlementQueue: {
      ...fixture.settlementQueue,
      settlementEnabled: false,
      state: 'blocked',
      blockedReason: 'Reporter disabled',
      incidentOpen: true,
    },
    builder: {
      ...fixture.builder,
      queued: {
        closedRoundCount: '0',
        closedWorkUnits: '0',
        openRoundWorkUnits: '0',
      },
    },
  });
  assert.equal(s.health.oracle, 'rejected');
  assert.equal(s.health.oracleReason, 'Counter regressed');
  assert.equal(s.health.queueEnabled, false);
  assert.equal(s.health.queueReason, 'Reporter disabled');
  assert.equal(s.health.incident, true);
  assert.equal(s.health.queuedCount, '0');
  assert.equal(s.health.anchorHash, `0x${'b'.repeat(64)}`);
  assert.equal(s.health.projectedBlocks, '2');
  assert.equal(parseStatus({ measurement: {} }).health.oracle, null);
  assert.equal(
    parseStatus({
      measurement: {},
      builder: { anchor: { transactionHash: 'javascript:bad' } },
    }).health.anchorHash,
    null,
  );
});

test('missing mining fields and unavailable nested mining do not fake supply or break settlements', () => {
  const e = parseEconomy({ status: 'available', supply: {} });
  assert.equal(e.totalMinted, null);
  assert.equal(e.premint, null);
  assert.equal(e.halvingBlocks, null);
  const s = parseSettlements({
    ...settlementsFixture(),
    mining: { status: 'unavailable' },
  });
  assert.equal(s.count, '140');
  assert.equal(s.mining, null);
});
