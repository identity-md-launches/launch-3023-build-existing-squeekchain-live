// Synthetic fixtures for deterministic tests only. The production app never imports this file.
export const fixedNow = '2026-10-30T06:00:00.000Z';
export function statusFixture(n = 0) {
  return {
    generatedAt: fixedNow,
    oracle: {
      state: 'accepted',
      reason: null,
      latestAcceptedAt: fixedNow,
      latestClosure: { firstRound: '531', lastRound: '531' },
    },
    settlementQueue: {
      status: 'available',
      state: 'ready',
      settlementEnabled: true,
      incidentOpen: false,
      blockedReason: null,
      buffered: {
        firstRound: '531',
        lastRound: '531',
        roundCount: '1',
        workUnits: '25',
      },
      projected: {
        blockHeight: '4120',
        completedBlockCount: '2',
        lifecycle: 'optimistic',
      },
    },
    measurement: {
      cumulativeWorkUnits: String(45758 + n),
      rpmMilli: 12345 + n * 1000,
      speedMmPerSecond: 181 + n,
      coreStatus: 'SPINNING',
      freshness: 'online',
      observedAt: fixedNow,
      staleAfterSeconds: 120,
    },
    builder: {
      queued: {
        closedRoundCount: '1',
        closedWorkUnits: '25',
        openRoundWorkUnits: '4',
      },
      anchor: {
        transactionHash: `0x${'b'.repeat(64)}`,
        settledThroughRound: '530',
        confirmedAt: fixedNow,
        blockHeight: String(4118 + n),
        blockProgress: String(503463521 + n * 1000000),
      },
    },
  };
}
export function settlementsFixture(n = 0, range: '24h' | '7d' = '24h') {
  return {
    status: 'available',
    range,
    generatedAt: fixedNow,
    window: {
      startAt: new Date(
        Date.parse(fixedNow) - (range === '7d' ? 7 : 1) * 86400000,
      ).toISOString(),
      endAt: fixedNow,
      bucketSeconds: range === '7d' ? 21600 : 3600,
    },
    mining: {
      status: 'available',
      processedThroughRound: String(530 + n),
      economy: { decimals: 18 },
      nextRound: {
        state: 'accruing',
        round: String(531 + n),
        startsAt: fixedNow,
        endsAt: '2026-10-30T06:10:00Z',
        completedBlockCount: '2',
        amountBaseUnits: '2592319617759930871476',
      },
    },
    chain: { chainId: '11155111' },
    summary: {
      settlementCount: String((range === '7d' ? 7140 : 140) + n),
      completedBlockCount: String(1124 + n),
      workAdded: String((range === '7d' ? 713098 : 13098) + n),
      activeRoundCount: String(range === '7d' ? 90 : 13),
    },
    recentSettlements: Array.from({ length: 10 }, (_, i) => ({
      transactionHash: `0x${String(i + 1).padStart(64, 'a')}`,
      settledThroughRound: String((range === '7d' ? 7530 : 530) - i),
      workAdded: String(466 - i),
      completedBlockCount: String(39 - i),
      blockTimestamp: '2026-10-30T04:10:36Z',
      confirmationStatus: 'safe',
    })),
    buckets: Array.from({ length: range === '7d' ? 28 : 24 }, (_, i) => ({
      startAt: new Date(
        Date.parse(fixedNow) -
          ((range === '7d' ? 28 : 24) - i) * (range === '7d' ? 6 : 1) * 3600000,
      ).toISOString(),
      settlementCount: String(i % 7),
      workAdded: String(i * 100),
    })),
  };
}
export function economyFixture(n = 0) {
  return {
    status: 'available',
    generatedAt: fixedNow,
    asset: { symbol: 'SQK', decimals: 18 },
    supply: {
      liveSupplyBaseUnits: `${16387784 + n}750000000000000000`,
      capBaseUnits: '21000000000000000000000000000',
      premintBaseUnits: '2100000000000000000000000000',
      totalMintedBaseUnits: '2116387784750000000000000000',
      miningMintedBaseUnits: '16387784750000000000000000',
      unmintedCapacityBaseUnits: '18883612215250000000000000000',
    },
    lifecycle: {
      stage: 'active',
      paused: false,
      currentRound: String(531 + n),
    },
    chain: { target: 'sepolia', chainId: '11155111' },
    schedule: {
      halvingBlocks: '393470',
      bonusBlocks: '97020',
      launchBonusBaseUnits: '1050000000000000000000000000',
      startHeight: '0',
      closedThroughBlock: '4118',
    },
  };
}
