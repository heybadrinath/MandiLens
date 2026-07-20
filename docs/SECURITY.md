# Security notes

## Data and privacy

The source contains public commodity-market reports and no user or personal data. The product does
not collect user data. Calculator inputs remain local and are neither logged nor transmitted.

## Secrets

The default source and deployment build need no application secret. `.env`, `.env.*`, `.env.local`,
`.vercel`, raw data, virtual environments, caches, and build outputs are ignored. The example
environment file intentionally contains no credential value.

## Browser controls

Production responses set:

- Content Security Policy with same-origin script, asset, and connection restrictions;
- denied framing and frame ancestors;
- MIME-sniffing protection;
- strict-origin referrer behavior;
- same-origin opener isolation;
- disabled camera, microphone, geolocation, and payment permissions.

## Dependency controls

- Direct JavaScript dependencies are exact-pinned and locked.
- Python dependencies are bounded in `pyproject.toml` and fully resolved in `uv.lock`.
- CI runs npm audit at moderate severity and above.
- Dependabot checks npm, Python, and GitHub Actions monthly.
- Quality workflows have minimal repository permissions; only the refresh job receives contents
  write access.

## Reporting

Do not include credentials, local absolute paths, or personal data in an issue. Describe the route,
artifact version, and reproducible behavior without publishing a working secret or exploit payload.
