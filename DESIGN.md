# Squeekchain design system

## Overview

Squeekchain Live Dashboard is a compact, read-only instrument panel for wheel telemetry, blocks, SQK mining, settlement windows and chain health. It retains the original illustrated hamster wheel, pale sage page, white panels, dark green text and lime refresh action. Readings and controls come before explanations. The new panels extend the existing system rather than introducing another visual theme.

`src/styles.css` is the styling source of truth. `src/App.tsx` composes the page, `src/MiningPanel.tsx` and `src/ChainHealthPanel.tsx` define the additions, and `src/Display.tsx` holds shared receipt notes and formatting helpers. English copy uses sentence case and labels the distinction between reference values, API readings and projections.

## Colors

The project uses hex primitives and semantic aliases in `src/styles.css:6`.

| Semantic token | Value | Role |
| --- | --- | --- |
| `--color-page` | `#f5f6f2` | Page background |
| `--color-surface` | `#ffffff` | Header and panels |
| `--color-soft` | `#f0f5eb` | Neutral tags, segmented controls, wheel scene and table header |
| `--color-border` | `#dfe4da` | Panel structure and dividers |
| `--color-text` | `#263629` | Primary text, headings and readings |
| `--color-muted` | `#4f5c49` | Labels, captions and source notes |
| `--color-accent` | `#d1f5a5` | Refresh fill and cumulative-work emphasis |
| `--color-accent-hover` | `#c1ec8c` | Primary hover |
| `--color-success` | `#3c612d` | Progress, spinning/confirmation indicators |
| `--color-chart` | `#77995b` | Chart bars and legend |
| `--color-warning` | `#78501e` | Delayed/error text and supply discrepancy rule |
| `--color-warning-bg` | `#fff5e5` | Recoverable dashboard error banner |
| `--color-focus` | `#385ac2` | Keyboard outline |

Supporting primitives include `--sage-100: #e7efdf` for tonal explanation/block sections and `--sage-500: #687561` for the selected segment border. The native progress track is `#cbd9c0`. Illustration colors belong to the existing SVG artwork, rather than additional status tokens.

Final measured pairs: muted on white **7.10:1**, primary text on page **11.78:1**, refresh text on lime **10.54:1**, warning on white **7.08:1**, chart bars on white **3.23:1**. The focus token is **6.16:1** on white, **5.67:1** on the page and **5.08:1** on lime. The probe checked the rendered solid text/background pairs; exact color inputs and calculated ratios are recorded in `artifacts/live-validation.json`. There is one light theme.

## Typography

`--font-body` is `'DM Sans Variable', fallback, sans-serif`. `@fontsource-variable/dm-sans` supplies local WOFF2 Latin and Latin Extended normal-style fonts. The interface uses **400, 500 and 700**; the variable face supports these weights. The local Arial fallback has `size-adjust: 102%`. Font loading was confirmed in Chromium at the five checked widths.

`--font-data` is `ui-monospace, 'SFMono-Regular', Consolas, monospace`. It is reserved for transaction hashes and contract addresses, including the new full-length anchor and contracts. Changing readings use tabular numerals.

| Token | Default size | Roles |
| --- | --- | --- |
| `--text-xs` | .75rem / 12px | Dense labels, source notes, timestamps, address strings and mobile utilities |
| `--text-sm` | .875rem / 14px | Supporting text, navigation, table readings and range buttons |
| `--text-base` | 1rem / 16px | Body baseline, subheadings and compact section titles |
| `--text-title` | 1.25rem / 20px | Panel headings, detail readings and brand |
| `--text-number` | 2rem / 32px | Summary numbers, minted total and compact page title |
| `--text-display` | 2.75rem / 44px | Wide page title |

Body line height is 1.5; the wide title uses 1.15, panel headings 1.3 and subheadings 1.5. Wide display tracking is −.045em; panel headings use −.02em and small labels natural spacing. The settlement-window heading explicitly resets tracking to normal. Headings balance their lines, prose uses pretty wrapping, and long IDs/numbers can wrap. Full contract/anchor values are selectable and never ellipsized. Existing abbreviated settlement links retain the full hash in their title, accessible name and destination.

## Layout

Header and page use a **1320px** maximum border-box container with **40px** side padding, giving **1240px** of content. The primary gap and panel padding are **24px**. Summary metrics use a **16px** gap; smaller internal relationships use **4–12px**, and separate sections use **20–40px**. Spacing is component CSS rather than a second token library.

The desktop summary has four columns. Wheel and chart use a **.82:1.18** grid. The new `.chain-panels` grid uses **1.1:1**, aligns panel tops and allows each panel its natural height. Mining and health fact grids use two `minmax(0, 1fr)` columns. Controls sit above the data they change; the range control precedes the summary, while chart metric controls remain at the chart.

| Breakpoint | Implemented behavior |
| --- | --- |
| ≤ 75rem / 1200px | Side padding 32px, compact 32px title, chart header may wrap, metric gap 12px |
| ≤ 57rem / 912px | Two summary columns; mining/health stack; economy has two columns; API utility hides; about section stacks |
| ≤ 43rem / 688px | Side padding 20px; wheel/chart stack; recent transactions become labeled mobile rows; window totals use two columns; countdown hides; block meter spans its row |
| ≤ 23rem / 368px | Side padding 16px; metric padding tightens and icons hide; mining/health/round fact grids become one column; minted total uses the 20px step |

Navigation wraps within its available width, including with enlarged text. Header, segmented controls and section headings also wrap. Main content stays in document order; there is no sticky overlay. Anchor scroll margin is 24px. Address links use full wrapping strings with an external-link icon outside their shrinking text span.

Browser checks measured no document overflow at **320, 390, 768, 1024 and 1440px**. Screenshots at 390 and 1440 were inspected. The 390 × 844 first screen includes product identity, refresh, range controls and summary metrics. Root text enlargement to 200% passed at 320 and 390; native browser zoom and RTL/localization were not checked.

## Elevation & Depth

The interface remains flat: structural borders and tonal grouping, with no panel shadows. The supply discrepancy uses a plain amber **3px inline-start rule**, not another card inside the mining panel. Fact groups use spacing, while next-round, contracts, anchor and freshness subsections use one divider where a separate grouping is needed. Status remains text as well as color.

## Shapes

`--radius-card` is **1rem / 16px**; `--radius-control` is **.625rem / 10px**. Compact metric cards use 12px. The segmented container is 8px, selected buttons 6px and tags 30px. Progress bars and status dots retain the original rounded forms. Decorative SVG artwork follows its own geometry.

## Components

| Pattern / source | Reuse and behavior |
| --- | --- |
| `Metric`, `src/App.tsx` | Label, optional icon/unit, numeric or honest loading/unavailable reading, note; cumulative work has an accent variant |
| `SourceNote`, `src/Display.tsx` | Successful browser receipt, or failure with last receipt and automatic retry text; separate from actual API data age |
| `SettlementChart`, `src/App.tsx` | Count/work pressed buttons, API-sized buckets, range-aware axes/copy and native exact-value disclosure; honest loading/empty states |
| `RecentSettlements`, `src/App.tsx` | Four window totals, actual API window, five/all returned rows and known-network explorer links; mobile field labels |
| `.window-control`, `.range-buttons` | Native 24h/7d buttons grouped and marked with `aria-pressed`; 44px minimum height and 56px minimum width; selected border/fill/weight |
| `MiningPanel`, `src/MiningPanel.tsx` | Props are economy and settlements resources; reference-cap progress, API facts, discrepancy note, schedule, next-round state, full contract links |
| `ChainHealthPanel`, `src/ChainHealthPanel.tsx` | Props are status/economy/settlements resources and current time; oracle/queue facts, optimistic projection, full anchor, timestamp-based freshness and receipt note; explicitly empty queues remain at the anchor |
| `.primary-button` | One lime refresh action, disabled while fetching, hover fill and visible keyboard focus |
| `.segmented` | Neutral secondary choice with selected border, fill and weight; wraps under text growth |
| `Wheel`, `src/Wheel.tsx` | Existing SVG illustration; spins only with fresh spinning data and an unpaused illustration |
| `Icon`, `HamsterMark`, `src/Icons.tsx` | Existing currentColor SVG icon family, 1.7px stroke, decorative icons hidden from assistive technology |
| `useDashboard`, `src/useDashboard.ts` | Independent source results; 10s polling, timeout/abort, selected-range URL/history, race protection and polite action results |

These are local application components, not a general component library. Loading, unavailable, empty, stale, failed-refresh, paused illustration and recovery states use the same source data and tokens. There are no forms, wallets, transactions to sign, dialogs or theme controls.

Native links/buttons/details/progress provide keyboard semantics. The focus ring is **3px**, offset **4px**, with system Highlight in forced-colors mode. A skip link precedes the header. Range changes announce loading and completion; routine polling does not announce every counter. The wheel pause is independent of network refresh.

Hover rules are gated by `(hover: hover)`. Color transitions name their properties and take 150ms. Wheel motion, refresh rotation, smooth scrolling and .96 press scaling are guarded by `prefers-reduced-motion: no-preference`. No entrance animation or `transition: all` is added.

## Do's and Don'ts

- Start another dashboard section with `.panel`, a semantic heading, existing spacing and `SourceNote` when its source needs receipt/error context.
- Reuse the six type tokens and semantic colors. Keep the primary action lime and secondary choices neutral.
- Label API facts, reference values and projections separately. Preserve exact base-unit arithmetic and distinguish minted from circulating supply.
- Let addresses, labels and navigation wrap. Check normal and enlarged text at 320 and 390px before adding a breakpoint.
- Keep new content in document order and test loading, empty, failure and recovery. Do not add a font, shadow system, theme or animation to fill space.

## Guidance attribution

Design guidance adapts Jakub Krehel's [Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), MIT, pinned at `267330e1adfc66a718fb65fa6918c1f06d0a689e`. The implemented-design documentation method adapts Paul Bakaus's [Impeccable document reference](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), Apache-2.0, pinned at `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. Both license texts are retained in `artifacts/licenses/Better-Interface-and-Impeccable.txt`.
