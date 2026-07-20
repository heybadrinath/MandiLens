from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any


def log_event(event: str, **fields: Any) -> None:
    payload = {
        "timestamp": datetime.now(UTC).isoformat(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, ensure_ascii=False, default=str), flush=True)
