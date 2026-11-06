# Validation and design review

## Scope and consequential assumptions

Complete for the stated dashboard scope, with the browser/platform limits below. This is a worker-side record, not independent certification.

The starting source was the supplied GitHub repository at archive revision `85101c4`. Its Vite/React/TypeScript stack, sage/lime design, SVG wheel, telemetry, block meter, chart metric controls, exact-value disclosure, transaction-list expansion, economy, navigation and refresh behavior were retained. Added surfaces are the settlement window controls/totals, SQK mining and chain health.

The export checked here is `dist/`, served at a real `/preview/` subpath. Normal range links are `?range=24h` and `?range=7d`; there is no application backend. Runtime data requests are exclusively to `api.squeekchain.com`. Test fixtures remain under `tests/` and are not imported by the production application.

The brief's 21B cap / 2.1B premint conflicts with the API response observed at 18 decimals: 2.1B cap / 210M premint. The mining panel explicitly compares API total minted with the **21B reference cap**, displays the **2.1B reference premint**, and separately labels the actual API cap/premint with a discrepancy notice. No values are rescaled or fabricated. Total minted and live supply remain distinct. The halving interval and bonus window come from the API, not hard-coded replacement readings.

The projected round endpoint is the queue's buffered last round. For an explicitly empty queue, it remains at the API's settled anchor round. Missing counts/endpoints otherwise remain unavailable. Next-round amounts are labeled projections and the window is the API's reported window; the UI does not promise a settlement deadline.

## Requirement coverage

| Requirement | Result and evidence |
| --- | --- |
| Preserve existing design and functionality | Met; original components/styles retained, original eight browser scenarios still pass |
| SQK mining, 21B/2.1B reference, halving, bonus, next round, supplied contracts | Met; `src/MiningPanel.tsx`, reference/API distinction, full addresses, browser assertions |
| 24h/7d query switch, totals/chart/list together | Met; one settlement resource per selected range, response-range guard, cancellation, direct links and history tests |
| Health: oracle, queue, queued/projected rounds, anchor, freshness | Met; `src/ChainHealthPanel.tsx`, blocked/stale/empty/unknown-chain tests and actual API snapshots |
| Keep 10-second auto-refresh | Met; deterministic timer test and live subsequent selected-range response observed |
| Responsive product and main action on first 390px screen | Met; `dashboard-mobile.png` and `range-keyboard-focus.png`, first-screen browser assertions |
| Title, favicon, description, og:title and og:image | Met; export head/asset inspection and probe share check |
| Source, lockfile and complete static `dist/` with relative assets | Met; production build, matching copied export, local subpath requests and asset completeness inspection |
| Production build, typecheck and useful interactions | Met; commands and actual results below |
| Six Better Interface domains, fixes and documentation | Met; coverage/finding records below, final `DESIGN.md` and README |
| Submission within 8 MiB, generated dependencies excluded | Met; explicit ignore/path budgets and `bundle-size.json` |

## Six-domain review

| Domain | Coverage and result | Limits / not applicable |
| --- | --- | --- |
| Accessibility | **Checked:** native buttons/links/details/progress; pressed range/metric states; skip link; keyboard range selection and history; visible blue focus captured; semantic definitions corrected; stable polite action region; reduced motion; two deterministic axe scans and one live scan with no violations | Screen-reader sessions, physical touch/assistive hardware and rendered forced-colors mode not performed. Forms, wallets, overlays and transactions are not applicable |
| Layout | **Checked:** source reading order/shared grids; actual export at 320, 390, 768, 1024 and 1440px without document overflow; full addresses; screenshots at 390 and 1440; 200% root text reflow at 320/390; first-screen action and summary visibility | Native browser zoom, RTL and localization stress checks not performed |
| Writing | **Checked:** neutral dashboard terms; range-specific chart/list/window copy; source errors include retry; actual API vs reference supply; optimistic projections; singular round wording; explicit empty queue | No additional language versions are implemented |
| Typography | **Checked:** existing six-size scale, three weights, local DM Sans loading, tabular changing numbers, natural casing/tracking, wrapping full contracts/anchor; probe confirms scale/families/weights | Font rendering on other operating systems is unverified |
| Colors | **Checked:** existing semantic hex palette; actual solid text/background probe pairs; explicit computed color and contrast record; focus against white/page/lime; status includes text | No dark theme; gradients/images in illustration are not UI text backgrounds. Forced-colors rendering not performed |
| UI details | **Checked:** original flat surfaces/icons, selected/hover/focus/disabled/loading/empty/failure/recovery states; discrepancy rule replaces nested card; pause and reduced-motion behavior; no transition-all | DevTools 10%-speed motion replay and physical-device animation inspection not performed |

Rendered evidence is actual Chromium output. Accessibility snapshots/axe are not described as screen-reader tests, and text enlargement is not described as native zoom.

## Findings, corrections and rechecks

| Severity / domain | Source and reproduced issue | Correction and final evidence |
| --- | --- | --- |
| High / layout | `src/styles.css:194`, `nav`: adding navigation items caused horizontal overflow at 320px with 200% root text | Added `flex-wrap: wrap` and `max-width: 100%`; both enlarged-text browser checks pass, normal reflow passes at all five widths |
| Medium / accessibility | `src/ChainHealthPanel.tsx:108`, `.health-stats`: supporting paragraphs were siblings of definitions; axe reported `definition-list` | Moved supporting paragraphs inside their `dd`; final deterministic and live axe scans have no violations |
| Medium / UI | `src/styles.css:1120`, `.reference-warning`: filled rounded discrepancy notice was detected as a card inside a card | Reused warning token as a 3px inline-start rule with unboxed text; final probe `chrome` passes and screenshot inspected |
| Low / writing | `src/Display.tsx:42`, source errors: repeated two-fragment error messages made an outage unnecessarily repetitive and triggered the slogans heuristic | Combined error/receipt/retry into one sentence; next-round failure copy also combined. Final live probe and earlier outage-state recheck pass the copy checks |
| Medium / accessibility | `src/useDashboard.ts:125`, range completion: a loading announcement initially remained after the new range arrived | Announce selected-window success/failure once per range load; browser test asserts completed 7d status. Polling stays quiet |
| Medium / writing and health | `src/ChainHealthPanel.tsx:74`, empty queue: real API returned zero buffered rounds with null endpoints, which originally appeared unavailable | Show “None queued”; projection uses the reported settled anchor only when count is explicitly zero. Dedicated empty-queue test passes and final live panel was re-inspected |

No unresolved high or medium implementation findings remain in the reviewed scope. The cap/premint disagreement is an explicitly displayed input/API limitation, not a claim that the contract has the requested reference cap. The probe reports nine controls below the optional 44px comfort size; all measured controls meet the 24px-or-spacing baseline. Existing compact navigation/list density was preserved.

## Commands and results

Dependencies were installed with `npm ci --prefix test/scratch/build --cache test/scratch/npm-cache --no-audit --no-fund`, using copies of the delivered manifest and lockfile. Source/config/public/tests were mirrored into that isolated workspace. The production export was copied back verbatim after each final build. The delivered project uses the ordinary npm scripts in README; no scratch directory is needed to rebuild it elsewhere.

| Command / check | Actual final result |
| --- | --- |
| `npm --prefix test/scratch/build run typecheck` | Exit 0; strict TypeScript check including source, tests and config |
| `npm --prefix test/scratch/build test` | Exit 0; 10/10 data tests |
| `npm --prefix test/scratch/build run build` | Exit 0; Vite 8.3.5 production export, 24 transformed modules |
| `npm --prefix test/scratch/build run test:browser -- --project=chromium` | Exit 0; 17/17 interaction tests, with `PLAYWRIGHT_CHROMIUM_EXECUTABLE` set to the installed headless Chromium |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | Exit 0; 16/16 checks passed; run with `IMD_PLAYWRIGHT` pointing to a scratch launcher for the available Chromium and local network proxy; pinned probe unchanged |
| `node test/scratch/inspect.mjs` | Exit 0; actual-API export walk, live interactions, five widths, loaded fonts, no script/console/resource errors, zero axe violations, screenshot/contrast capture |
| `npm --prefix test/scratch/build run test:browser -- --project=webkit -g '7d deep link'` | Could not launch; required OS libraries missing, including GTK4, Graphene, GStreamer, AVIF and others. No WebKit interaction result is claimed |
| HTML/CSS asset integrity script | Passed; local runtime assets present and relative, ten export files, no symlinks |
| Source/build export comparison and byte budgets | Passed; recorded in `bundle-size.json` |

The final deterministic suite covers original functionality plus 7d deep links, all four totals, metric/disclosure/list interactions, 10s polling in the selected range, keyboard selection and Back/Forward, no cross-range stale results, cancelled late responses, new-window error/recovery, last-known same-window values, precision/reference mismatch, oracle rejection, blocked/empty queue, freshness, unavailable nested mining, unknown explorer networks, full-address reflow, text enlargement and axe.

The actual live walk received HTTP 200 from status, economy and both settlement ranges, exercised manual refresh, observed a later automatic 7d refresh, changed chart metric, expanded 28 six-hour exact-value rows and ten returned transactions, and returned to 24h with 24 hourly buckets. The response log and observations are in `live-validation.json`; readings are observations, not permanently fixed expected values.

The first browser-tool launch failed with a Chromium socket-path-length error. Local Playwright headless Chromium supplied real rendered inspection instead. The first test harness's built-in availability probe also hit a Host/authority mismatch in this environment; the delivered bounded test runner now owns a dynamic-port static preview and closes it after the tests. No server remains running and this tooling is not an application backend.

## Evidence

- `dashboard-mobile.png`: actual first 390 × 844 screen.
- `dashboard-mobile-full.png`: full 24h mobile export.
- `dashboard-desktop.png`: full 1440px desktop export.
- `mining-and-health.png`: detailed new panels from the live response.
- `dashboard-7d-mobile.png`: 7d, expanded values/list at mobile width.
- `range-keyboard-focus.png`: visible keyboard outline on the selected 7d control.
- `design-probe.json`: final pinned-probe checks, thresholds and metadata, without redundant text-tree dumps.
- `live-validation.json`: public endpoint statuses, interactions, viewport measurements, focus, colors/contrast and axe result.
- `bundle-size.json`: final byte counts and export integrity.

Final measured solid pairs include muted/white 7.10:1, text/page 11.78:1, primary text/lime 10.54:1, warning/white 7.08:1, focus/white 6.16:1, focus/page 5.67:1, focus/lime 5.08:1 and chart bars/white 3.23:1.

## Remaining limitations

WebKit remains unverified because its runtime could not start. No physical-device, screen-reader, native zoom, localized/RTL, rendered forced-colors, 10%-speed motion or social-crawler checks were performed. Static metadata and local social image presence were checked. API service availability, upstream schema changes, and the reference/API supply discrepancy remain external facts; error, missing, stale and recovery states are implemented and tested. The guide licenses/attribution are retained in `licenses/` and the root notices.
