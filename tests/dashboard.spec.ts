import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  economyFixture,
  fixedNow,
  settlementsFixture,
  statusFixture,
} from './fixtures';

async function mockSources(
  page: Page,
  state: {
    n: number;
    fail?: string;
    empty?: boolean;
    stale?: boolean;
    malformed?: boolean;
    idle?: boolean;
  },
) {
  await page.clock.install({ time: new Date(fixedNow) });
  await page.route('https://api.squeekchain.com/v1/**', async (route) => {
    const url = route.request().url();
    if (state.fail === 'all' || (state.fail && url.endsWith(state.fail))) {
      await route.fulfill({ status: 503, body: 'Unavailable' });
      return;
    }
    if (state.malformed) {
      await route.fulfill({
        contentType: 'application/json',
        body: 'invalid-json',
      });
      return;
    }
    let body: unknown;
    if (url.endsWith('/status')) {
      const s = statusFixture(state.n);
      if (state.stale) s.measurement.observedAt = '2026-10-29T06:00:00Z';
      if (state.idle) {
        s.measurement.coreStatus = 'IDLE';
        s.measurement.rpmMilli = 0;
        s.measurement.speedMmPerSecond = 0;
      }
      body = s;
    } else if (url.includes('/settlements')) {
      const s = settlementsFixture(
        state.n,
        new URL(url).searchParams.get('range') === '7d' ? '7d' : '24h',
      );
      if (state.empty) {
        s.recentSettlements = [];
        s.buckets = [];
        s.summary.settlementCount = '0';
      }
      body = s;
    } else body = economyFixture(state.n);
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

test('manual and 10-second automatic refresh update all sources', async ({
  page,
}) => {
  const state = { n: 0, idle: false };
  await mockSources(page, state);
  await page.goto('./');
  await expect(page.locator('.metric-value').nth(0)).toHaveText('45,758');
  await expect(page.locator('.metric-value').nth(1)).toHaveText('12.3');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('140');
  await expect(
    page.locator('.economy-grid').getByText('531', { exact: true }),
  ).toBeVisible();
  state.n = 1;
  await page.getByRole('button', { name: 'Refresh now' }).click();
  await expect(page.locator('.metric-value').nth(0)).toHaveText('45,759');
  await expect(page.locator('.metric-value').nth(1)).toHaveText('13.3');
  await expect(page.locator('.metric-value').nth(2)).toHaveText('4,119');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('141');
  await expect(
    page.locator('.economy-grid').getByText('532', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.economy-grid').getByText('16,387,785.75'),
  ).toBeVisible();
  state.n = 2;
  await page.clock.fastForward(10_000);
  await expect(page.locator('.metric-value').nth(0)).toHaveText('45,760');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('142');
  await expect(
    page.locator('.economy-grid').getByText('533', { exact: true }),
  ).toBeVisible();
  state.idle = true;
  await page.getByRole('button', { name: 'Refresh now' }).click();
  await expect(page.locator('.core-status')).toHaveText('Idle');
  await expect(page.locator('.metric-value').nth(1)).toHaveText('0.0');
  await expect(page.locator('.wheel-art')).not.toHaveClass(/is-spinning/);
});

test('chart metrics, hourly values, recent rows, illustration and anchor navigation work', async ({
  page,
}) => {
  await mockSources(page, { n: 0 });
  await page.goto('./');
  await expect(page.locator('.settlement-row')).toHaveCount(5);
  await page.getByRole('button', { name: 'Work units', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Work units', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('img', { name: /Work units by hour/ }),
  ).toBeVisible();
  await page.getByText('View hourly values', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(24);
  await page.getByRole('button', { name: 'Show all 10 returned' }).click();
  await expect(page.locator('.settlement-row')).toHaveCount(10);
  await page.getByRole('button', { name: 'Show fewer' }).click();
  await expect(page.locator('.settlement-row')).toHaveCount(5);
  await page.getByRole('button', { name: 'Pause wheel illustration' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause wheel illustration' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.wheel-art')).not.toHaveClass(/is-spinning/);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'About' })
    .click();
  await expect(page).toHaveURL(/#about$/);
  await expect(
    page.getByRole('heading', { name: 'Small hamster. Real proof of work.' }),
  ).toBeInViewport();
  const link = page.locator('.transaction-link').first();
  await expect(link).toHaveAttribute(
    'href',
    /^https:\/\/sepolia\.etherscan\.io\/tx\/0x[a-f0-9]{64}$/,
  );
});

test('initial failure and retry recover without fake numbers', async ({
  page,
}) => {
  const state = { n: 0, fail: 'all' };
  await mockSources(page, state);
  await page.goto('./');
  await expect(page.locator('.error-banner')).toContainText(
    'Could not refresh wheel telemetry, settlements, economy',
  );
  await expect(page.locator('.metric-value').first()).toHaveText('Unavailable');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('Unavailable');
  state.fail = '';
  await page.getByRole('button', { name: 'Refresh now' }).click();
  await expect(page.locator('.metric-value').first()).toHaveText('45,758');
  await expect(page.locator('.error-banner')).toHaveCount(0);
});

test('partial failure retains and labels last values while other sources update', async ({
  page,
}) => {
  const state = { n: 0, fail: '' };
  await mockSources(page, state);
  await page.goto('./');
  await expect(page.locator('.metric-value').first()).toHaveText('45,758');
  state.n = 1;
  state.fail = '/status';
  await page.getByRole('button', { name: 'Refresh now' }).click();
  await expect(page.locator('.error-banner')).toContainText(
    'Could not refresh wheel telemetry.',
  );
  await expect(page.locator('.metric-value').first()).toHaveText('45,758');
  await expect(page.locator('.metric-value').nth(3)).toHaveText('141');
  await expect(page.locator('.core-status')).toContainText('Last known');
  await expect(page.locator('.wheel-art')).not.toHaveClass(/is-spinning/);
  await expect(page.locator('.wheel-panel .source-note')).toContainText(
    'last received',
  );
});

test('stale telemetry, empty settlements and malformed JSON have honest states', async ({
  page,
}) => {
  const state = { n: 0, empty: true, stale: true, malformed: false };
  await mockSources(page, state);
  await page.goto('./');
  await expect(page.locator('.telemetry-warning')).toContainText('stale');
  await expect(
    page.getByText('No recent settlements in this window.'),
  ).toBeVisible();
  await expect(page.locator('.metric-value').nth(3)).toHaveText('0');
  state.malformed = true;
  await page.getByRole('button', { name: 'Refresh now' }).click();
  await expect(page.locator('.error-banner')).toBeVisible();
  await expect(page.locator('.metric-value').first()).toHaveText('45,758');
  await expect(page.locator('body')).not.toContainText('NaN');
});

test('mobile first screen, reflow, keyboard and reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockSources(page, { n: 0 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('.metric-value').first()).toHaveText('45,758');
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await expect(
    page.getByRole('button', { name: 'Refresh now' }),
  ).toBeInViewport();
  await expect(page.locator('.metrics-grid')).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to dashboard' }),
  ).toBeFocused();
  await expect(
    page.getByRole('link', { name: 'Skip to dashboard' }),
  ).toBeInViewport();
  await expect(page.locator('.wheel-spokes')).toHaveCSS(
    'animation-name',
    'none',
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  await page.getByText('View hourly values', { exact: true }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('loading blocks duplicate refreshes and request timeout remains recoverable', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(fixedNow) });
  let calls = 0;
  await page.route('https://api.squeekchain.com/v1/**', async () => {
    calls++;
  });
  await page.goto('./');
  await expect(
    page.getByRole('button', { name: 'Refreshing…' }),
  ).toBeDisabled();
  await expect(page.locator('.metric-value').first()).toHaveText('Loading');
  await page.clock.fastForward(8_100);
  await expect(page.getByRole('button', { name: 'Refresh now' })).toBeEnabled();
  await expect(page.locator('.metric-value').first()).toHaveText('Unavailable');
  expect(calls).toBe(3);
});

test('automated accessibility audit covers the dashboard and expanded hourly table', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSources(page, { n: 0 });
  await page.goto('./');
  await expect(page.locator('.metric-value').first()).toHaveText('45,758');
  await page.getByText('View hourly values', { exact: true }).click();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
