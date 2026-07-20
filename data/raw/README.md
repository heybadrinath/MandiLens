# Raw data

This directory is intentionally ignored except for this note. The pipeline stores unchanged
monthly AGMARKNET API responses under state/crop folders so downloads are restartable and auditable.

Raw source files are not committed. The repository instead retains a compact rolling all-market
Parquet layer and a monthly quality ledger so scheduled refreshes can reconsider unselected markets.

Run `uv run mandilens-pipeline download` to populate it.
