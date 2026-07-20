# Contributing to MandiLens

Thanks for helping improve MandiLens. Small, focused contributions are easiest to review and are
the best place to start.

## Good first contributions

- Clarify documentation or market terminology.
- Improve keyboard navigation, accessibility, or responsive behavior.
- Make charts and tables easier to interpret without weakening their caveats.
- Add tests for an existing data-validation or comparison rule.
- Report a reproducible data-quality problem with the source partition and date included.

For a large feature, new data source, new state, or forecasting-method change, open an issue before
writing code. This avoids work that conflicts with the product's evidence and scope boundaries.

## Local setup

You need Node.js 24, Python 3.12 or newer, and
[`uv`](https://docs.astral.sh/uv/getting-started/installation/).

```bash
make install
make dev
```

The web application is available at [http://localhost:3000](http://localhost:3000).

## Before opening a pull request

Run the complete local quality gate:

```bash
make check
```

Keep generated caches, local environment files, credentials, and unrelated formatting changes out
of the commit. Raw source responses belong in the ignored working cache; only reviewed published
artifacts should be committed.

## Pull-request expectations

- Explain the user or data problem being solved.
- Keep the change focused and describe any deliberate tradeoffs.
- Add or update tests when behavior changes.
- Update documentation and screenshots when the public interface changes.
- Include before-and-after evidence for data or model changes.
- Preserve the separation between observed values, forecasts, and user-entered assumptions.

Data and forecasting changes must retain chronological evaluation, quality ledgers, source
attribution, and visible limitations. A better-looking result is not sufficient evidence for a
model or data change.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. Follow
[the security policy](docs/SECURITY.md) instead.
