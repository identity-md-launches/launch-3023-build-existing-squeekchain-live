import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  economyFixture,
  fixedNow,
  settlementsFixture,
  statusFixture,
} from './fixtures';

async function sources(
  page: Page,
  options: {
    fail7d?: boolean;
    stale?: boolean;
    blocked?: boolean;
    apiSupply?: boolean;
    missingMining?: boolean;
    unknownChain?: boolean;
    emptyQueue?: boolean;
  } = {},
) {
  await page.clock.install({ time: new Date(fixedNow) });
  await page.route('https://api.squeekchain.com/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/status')) {
      const s = statusFixture();
      if (options.stale) {
        s.generatedAt = '2026-10-29T06:00:00Z';
        s.measurement.observedAt = '2026-10-29T06:00:00Z';
      }
      const body = options.emptyQueue
        ? {
            ...s,
            builder: {
              ...s.builder,
              queued: {
                closedRoundCount: '0',
                closedWorkUnits: '0',
                openRoundWorkUnits: '0',
              },
            },
            settlementQueue: {
              ...s.settlementQueue,
              state: 'empty',
              buffered: {
                firstRound: null,
                lastRound: null,
                roundCount: '0',
                workUnits: '0',
              },
              projected: {
                blockHeight: '4118',
                completedBlockCount: '0',
                lifecycle: 'optimistic',
              },
            },
          }
        : options.blocked
          ? {
              ...s,
              oracle: {
                ...s.oracle,
                state: 'rejected',
                reason: 'Counter regressed',
              },
              settlementQueue: {
                ...s.settlementQueue,
                state: 'blocked',
                settlementEnabled: false,
                blockedReason: 'Reporter disabled',
                incidentOpen: true,
              },
            }
          : s;
      return route.fulfill({ json: body });
    }
    if (url.pathname.endsWith('/settlements')) {
      if (options.fail7d && url.searchParams.get('range') === '7d')
        return route.fulfill({ status: 503, body: 'Unavailable' });
      const s = settlementsFixture(
        0,
        url.searchParams.get('range') === '7d' ? '7d' : '24h',
      );
      if (options.unknownChain) s.chain.chainId = '99999';
      return route.fulfill({
        json: options.missingMining
          ? { ...s, mining: { status: 'unavailable' } }
          : s,
      });
    }
    const e = economyFixture();
    if (options.apiSupply) {
      e.supply.capBaseUnits = '2100000000000000000000000000';
      e.supply.premintBaseUnits = '210000000000000000000000000';
      e.supply.totalMintedBaseUnits = '211344892876204030802856319';
      e.supply.liveSupplyBaseUnits = '211344792874834038361435307';
      e.supply.miningMintedBaseUnits = '1344892876204030802856319';
    }
    if (options.unknownChain) e.chain.chainId = '99999';
    return route.fulfill({ json: e });
  });
}

test('7d deep link switches totals, chart and recent list together; metric and disclosure still work', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/settlements?')) requests.push(r.url());
  });
  await sources(page);
  await page.goto('./?range=7d&keep=yes');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('7,140');
  await expect(
    page.getByText('Showing 7d settlement totals, chart and recent list.', {
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(page.locator('.window-totals')).toContainText('713,098');
  await expect(page.locator('.window-totals')).toContainText('90');
  await expect(page.locator('.chart-heading')).toContainText(
    'Every 6 hours, over the last 7 days',
  );
  await expect(page.locator('.bar-track')).toHaveCount(28);
  await expect(page.locator('.settlement-row').first()).toContainText(
    'Round 7,530',
  );
  await page.getByRole('button', { name: 'Work units', exact: true }).click();
  await page.getByText('View period values', { exact: true }).click();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(28);
  await page.getByRole('button', { name: 'Show all 10 returned' }).click();
  await expect(page.locator('.settlement-row')).toHaveCount(10);
  await page.getByRole('button', { name: '24h', exact: true }).click();
  await expect(page).toHaveURL(/range=24h&keep=yes/);
  await expect(page.locator('.metric-value').nth(3)).toHaveText('140');
  await expect(page.locator('.bar-track')).toHaveCount(24);
  await expect(
    page.getByRole('button', { name: 'Work units', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.settlement-row')).toHaveCount(5);
  await expect(page.locator('.settlement-row').first()).toContainText(
    'Round 530',
  );
  await page.clock.fastForward(10_000);
  expect(requests.at(-1)).toMatch(/range=24h$/);
});

test('range changes clear old values during loading and ignore late responses', async ({
  page,
}) => {
  await sources(page);
  let pending: Route | undefined;
  await page.route('**/v1/settlements?range=7d', (route) => {
    pending = route;
  });
  await page.goto('./');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('140');
  await page.getByRole('button', { name: '7d', exact: true }).click();
  await expect(page.locator('.metric-value').nth(3)).toHaveText('Loading');
  await expect(page.locator('.bar-track')).toHaveCount(0);
  await expect(page.locator('.settlement-row')).toHaveCount(0);
  await expect.poll(() => Boolean(pending)).toBe(true);
  await page.getByRole('button', { name: '24h', exact: true }).click();
  await expect(page.locator('.metric-value').nth(3)).toHaveText('140');
  await pending!.fulfill({ json: settlementsFixture(0, '7d') }).catch(() => {});
  await expect(page.locator('.metric-value').nth(3)).toHaveText('140');
  await expect(page.locator('.bar-track')).toHaveCount(24);
});

test('failed new window has no old results, then retries and retains only its own results', async ({
  page,
}) => {
  const options = { fail7d: true };
  await sources(page, options);
  await page.goto('./');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('140');
  await page.getByRole('button', { name: '7d', exact: true }).click();
  await expect(page.locator('.metric-value').nth(3)).toHaveText('Unavailable');
  await expect(page.locator('.settlement-row')).toHaveCount(0);
  await expect(page.locator('.window-totals')).not.toContainText('140');
  options.fail7d = false;
  await page.getByRole('button', { name: 'Refresh now' }).click();
  await expect(page.locator('.metric-value').nth(3)).toHaveText('7,140');
  options.fail7d = true;
  await page.getByRole('button', { name: 'Refresh now' }).click();
  await expect(page.locator('.error-banner')).toContainText('settlements');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('7,140');
  await expect(page.locator('.recent-panel .source-note')).toContainText(
    'last received',
  );
});

test('keyboard selection and browser history restore the selected window and query', async ({
  page,
}) => {
  await sources(page);
  await page.goto('./?keep=yes#overview');
  const button = page.getByRole('button', { name: '7d', exact: true });
  await button.focus();
  await page.keyboard.press('Space');
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS('outline-style', 'solid');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/keep=yes&range=7d#overview$/);
  await expect(page.locator('.metric-value').nth(3)).toHaveText('7,140');
  await page.goBack();
  await expect(
    page.getByRole('button', { name: '24h', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('140');
  await page.goForward();
  await expect(page.locator('.metric-value').nth(3)).toHaveText('7,140');
});

test('mining distinguishes minted from circulating supply and labels reference/API disagreement', async ({
  page,
}) => {
  await sources(page, { apiSupply: true });
  await page.goto('./');
  const panel = page.getByRole('region', { name: 'SQK mining' });
  await expect(panel.locator('.supply-reading strong')).toHaveText(
    '211,344,892.87',
  );
  await expect(panel.locator('.supply-reading')).not.toContainText(
    '211,344,792',
  );
  await expect(panel.locator('.supply-reading')).toContainText(
    '21,000,000,000',
  );
  await expect(panel.locator('.supply-reference')).toContainText(
    '21B cap · 2.1B premint',
  );
  await expect(panel.locator('.reference-warning')).toBeVisible();
  await expect(panel.locator('.supply-caption')).toContainText('1.00%');
  await expect(panel.locator('.mining-stats')).toContainText('2,100,000,000');
  await expect(panel.locator('.mining-stats')).toContainText('210,000,000');
  await expect(panel.locator('.mining-stats')).toContainText('393,470');
  await expect(panel.locator('.mining-stats')).toContainText('97,020');
  await expect(panel.locator('.next-round')).toContainText('Accruing');
  await expect(panel.locator('.next-round')).toContainText('2,592.31');
  await expect(panel.locator('.contract-list a').first()).toHaveAttribute(
    'href',
    'https://sepolia.etherscan.io/address/0x2dccb11fcc2defdd188555e45acb52231e82e218',
  );
  await expect(panel.locator('.contract-list a').last()).toHaveAttribute(
    'href',
    'https://sepolia.etherscan.io/address/0xd78a3956cf63164d1fa1c622ad3c66623162fa1e',
  );
});

test('health shows rejection, blocked queue, projections, anchor and actual data age', async ({
  page,
}) => {
  await sources(page, { stale: true, blocked: true });
  await page.goto('./');
  const panel = page.getByRole('region', { name: 'Chain health' });
  await expect(panel).toContainText('Snapshot delayed');
  await expect(panel).toContainText('Rejected');
  await expect(panel).toContainText('Counter regressed');
  await expect(panel).toContainText('Blocked');
  await expect(panel).toContainText('Reporter disabled');
  await expect(panel).toContainText('Settlements disabled · Incident open');
  await expect(panel).toContainText('4,120');
  await expect(panel).toContainText('2 additional completed blocks');
  await expect(panel.locator('.freshness-list')).toContainText(
    '24h 0m ago · Stale',
  );
  await expect(panel.locator('.freshness-list')).toContainText(
    '0s ago · Fresh',
  );
  await expect(panel.locator('.anchor-link')).toHaveAttribute(
    'href',
    `https://sepolia.etherscan.io/tx/0x${'b'.repeat(64)}`,
  );
  await page.clock.fastForward(121_000);
  await expect(panel.locator('.freshness-list')).not.toContainText(
    '0s ago · Fresh',
  );
});

test('empty queue shows zero rounds and keeps the projection at the reported anchor', async ({
  page,
}) => {
  await sources(page, { emptyQueue: true });
  await page.goto('./');
  const panel = page.getByRole('region', { name: 'Chain health' });
  await expect(panel).toContainText('Empty');
  await expect(
    panel.locator('.health-stats > div').nth(2).locator('dd'),
  ).toContainText('0');
  await expect(
    panel.locator('.health-stats > div').nth(3).locator('dd'),
  ).toContainText('None queued');
  await expect(
    panel.locator('.health-stats > div').nth(4).locator('dd'),
  ).toContainText('530');
  await expect(panel).toContainText('No queued rounds; at the anchor');
  await expect(
    panel.locator('.health-stats > div').nth(5).locator('dd'),
  ).toContainText('4,118');
});

test('unavailable nested mining is honest and unknown chain does not guess explorer links', async ({
  page,
}) => {
  await sources(page, { missingMining: true, unknownChain: true });
  await page.goto('./');
  await expect(page.locator('.next-round')).toContainText(
    'Next-round details are unavailable',
  );
  await expect(page.locator('.metric-value').nth(3)).toHaveText('140');
  await expect(page.locator('.contract-list a')).toHaveCount(0);
  await expect(page.locator('.anchor-link')).toHaveCount(0);
  await expect(page.locator('.anchor-hash')).toContainText(
    `0x${'b'.repeat(64)}`,
  );
});

test('new panels reflow with full addresses, text enlargement and 7d accessibility', async ({
  page,
}) => {
  await sources(page, { apiSupply: true });
  await page.goto('./?range=7d');
  await expect(page.locator('.mining-stats')).toContainText('393,470');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    for (const selector of ['.contract-list', '.anchor-detail']) {
      expect(
        await page
          .locator(selector)
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
