from observability.metrics import percentile


def test_percentile():
    assert percentile([1, 2, 3, 4, 5], 50) == 3
    assert percentile([1, 2, 3, 4, 5], 95) == 4.8
    assert percentile([], 50) == 0
