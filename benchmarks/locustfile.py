print(">>> LOADED BENCHMARKS LOCUSTFILE <<<")

from locust import HttpUser, task, between
import uuid
import json
from datetime import datetime


class SQLAgentUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.session_id = str(uuid.uuid4())

    @task
    def query(self):
        payload = {
            "message": "list all the customers",
            "session_id": self.session_id,
        }

        response = self.client.post("/query", json=payload)

        # Build a record for logging
        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
            "request": payload["message"],
            "http_status": response.status_code,
        }

        try:
            body = response.json()
            record["response"] = body

            print("\n" + "=" * 80)
            print(f"HTTP STATUS : {response.status_code}")
            print(f"SESSION     : {self.session_id}")
            print(f"API STATUS  : {body.get('status')}")

            if body.get("status") == "success":
                print("\nSQL:")
                print(body.get("sql", "<no sql returned>"))

            elif body.get("status") == "clarification_needed":
                print("\nClarification:")
                print(body.get("message"))

            else:
                print("\nResponse:")
                print(json.dumps(body, indent=2))

            print("=" * 80)

        except Exception:
            # Handle HTML/text responses (e.g., HTTP 500)
            record["response"] = response.text

            print("\n" + "=" * 80)
            print(f"HTTP STATUS : {response.status_code}")
            print(f"SESSION     : {self.session_id}")
            print("Non-JSON Response:")
            print(response.text)
            print("=" * 80)

        # Save every response to a JSON Lines file
        with open("locust_results.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")