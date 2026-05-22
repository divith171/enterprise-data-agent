import json
import uuid
import time
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

LOG_FILE = BASE_DIR / "logs" / "agent_logs.jsonl"


def generate_request_id():

    return str(uuid.uuid4())


def log_event(event):
    """
    Write structured log event to JSONL file
    """

    LOG_FILE.parent.mkdir(exist_ok=True)

    print("Writing log to:", LOG_FILE)

    with open(LOG_FILE, "a") as f:

        f.write(
            json.dumps(event, default=str) + "\n"
        )

with open(LOG_FILE, "a") as f:
    f.write("START REQUEST HIT\n")
def start_request(question):
    """
    Initialize request logging
    """

    request_id = generate_request_id()

    return {

        "request_id": request_id,

        "question": question,

        "start_time": time.time(),

        "timestamp": datetime.utcnow().isoformat()
    }


def finalize_request(
    log_data,
    sql,
    result,
    attempts
):
    """
    Finalize request and write log
    """

    latency = time.time() - log_data["start_time"]

    event = {

        "request_id": log_data["request_id"],

        "timestamp": log_data["timestamp"],

        "question": log_data["question"],

        "generated_sql": sql,

        "attempts": attempts,

        "latency_seconds": round(latency, 3),

        "status": result.get("status")
    }

    log_event(event)