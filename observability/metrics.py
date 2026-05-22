import json
from pathlib import Path


LOG_FILE = Path("logs/agent_logs.jsonl")


def load_logs():
    """Load JSONL logs into a list"""

    if not LOG_FILE.exists():
        return []

    logs = []

    with open(LOG_FILE, "r") as f:
        for line in f:
            logs.append(json.loads(line))

    return logs


def compute_metrics():

    logs = load_logs()

    if not logs:
        print("No logs found.")
        return

    total_requests = len(logs)

    success_count = 0
    failure_count = 0

    total_latency = 0
    total_attempts = 0

    error_types = {}

    for log in logs:

        if log["status"] == "success":
            success_count += 1
        else:
            failure_count += 1

        total_latency += log.get("latency_seconds", 0)
        total_attempts += log.get("attempts", 0)

        if log["status"] != "success":
            err = log.get("error", "unknown")

            error_types[err] = error_types.get(err, 0) + 1

    success_rate = success_count / total_requests
    avg_latency = total_latency / total_requests
    avg_attempts = total_attempts / total_requests

    print("\n=== System Metrics ===\n")

    print("Total Requests:", total_requests)
    print("Success Rate:", round(success_rate * 100, 2), "%")
    print("Failure Rate:", round((1 - success_rate) * 100, 2), "%")
    print("Average Latency:", round(avg_latency, 2), "seconds")
    print("Average Attempts:", round(avg_attempts, 2))

    print("\nMost Common Errors:")

    for err, count in error_types.items():
        print("-", err, ":", count)


if __name__ == "__main__":
    compute_metrics()