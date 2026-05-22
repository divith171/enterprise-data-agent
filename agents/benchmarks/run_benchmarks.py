import json
import requests
import time

API_URL = "http://127.0.0.1:8000/query"

with open(
    "agents/benchmarks/golden_queries.json",
    "r"
) as f:

    benchmark_queries = json.load(f)

results = []

total = len(benchmark_queries)

passed = 0

for benchmark in benchmark_queries:

    question = benchmark["question"]

    print("\n" + "=" * 80)

    print(f"RUNNING TEST #{benchmark['id']}")

    print(f"QUESTION: {question}")

    start_time = time.time()

    try:

        response = requests.post(
            API_URL,
            json={
                "message": question,
                "session_id": "benchmark_session"
            },
            timeout=120
        )

        duration = round(
            time.time() - start_time,
            2
        )

        # --------------------------------
        # HTTP FAILURE
        # --------------------------------

        if response.status_code != 200:

            print(
                f"FAILED HTTP: "
                f"{response.status_code}"
            )

            results.append({

                "id": benchmark["id"],

                "question": question,

                "status": "http_failure",

                "http_status":
                    response.status_code
            })

            continue

        data = response.json()

        # --------------------------------
        # BASIC RESPONSE
        # --------------------------------

        generated_sql = data.get(
            "sql",
            ""
        )

        status = data.get(
            "status",
            "unknown"
        )

        orchestration_trace = data.get(
            "orchestration_trace",
            {}
        )

        # --------------------------------
        # REVIEW RESULT
        # --------------------------------

        review_result = orchestration_trace.get(
            "review_result",
            {}
        )

        review_valid = review_result.get(
            "valid",
            False
        )

        # --------------------------------
        # CAPABILITY RESULT
        # --------------------------------

        capability_result = orchestration_trace.get(
            "capability_result",
            {}
        )

        capability_feasible = capability_result.get(
            "feasible",
            True
        )

        # --------------------------------
        # SUCCESS LOGIC
        # --------------------------------

        # SUCCESS means:
        #
        # 1. endpoint completed
        # 2. SQL reviewer approved
        # 3. governance validator approved
        #
        # clarification_needed
        # and governance rejections
        # are NOT benchmark failures
        # for Phase 1B testing

        success = False

        if status == "success":

            success = (
                review_valid is True
                and capability_feasible is True
            )

        elif status == "clarification_needed":

            success = True

        elif (
            status == "unsupported_analysis"
        ):

            success = True

        if success:
            passed += 1

        # --------------------------------
        # RESULT OBJECT
        # --------------------------------

        result = {

            "id": benchmark["id"],

            "question": question,

            "status": status,

            "success": success,

            "execution_time_seconds":
                duration,

            "generated_sql":
                generated_sql,

            "review_result":
                review_result,

            "capability_result":
                capability_result,

            "context":
                data.get("context"),

            "trace_log":
                data.get("trace_log"),

            "orchestration_trace":
                orchestration_trace
        }

        results.append(result)

        # --------------------------------
        # LOGGING
        # --------------------------------

        print(f"STATUS: {status}")

        print(f"TIME: {duration}s")

        print(f"SUCCESS: {success}")

        print(
            "FINAL REVIEW VALID:",
            review_valid
        )

        print(
            "CAPABILITY FEASIBLE:",
            capability_feasible
        )

        print("\nGENERATED SQL:")

        print(generated_sql)

    except Exception as e:

        print(f"ERROR: {str(e)}")

        results.append({

            "id": benchmark["id"],

            "question": question,

            "status": "exception",

            "success": False,

            "error": str(e)
        })

# --------------------------------
# FINAL SUMMARY
# --------------------------------

summary = {

    "total_tests": total,

    "passed": passed,

    "failed": total - passed,

    "success_rate":
        round(
            (passed / total) * 100,
            2
        )
}

print("\n" + "=" * 80)

print("FINAL SUMMARY")

print(json.dumps(summary, indent=2))

final_output = {

    "summary": summary,

    "results": results
}

with open(
    "agents/benchmarks/benchmark_results.json",
    "w"
) as f:

    json.dump(
        final_output,
        f,
        indent=2
    )

print("\nBenchmark results saved to:")

print(
    "agents/benchmarks/"
    "benchmark_results.json"
)