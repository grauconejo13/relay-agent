import pytest

from app.store import store


@pytest.fixture(autouse=True)
def reset_in_memory_store():
    """Keep tests isolated while Relay uses the process-memory MVP store."""
    store.clear()
    yield
    store.clear()
