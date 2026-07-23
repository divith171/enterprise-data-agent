import json
from agents.sql_agent import run_sql_agent


def classify_failure(question, result):

    reason = str(result).lower()

    if "group" in reason or "avg" in reason:
        return "aggregation_failure"

    elif "join" in reason:
        return "join_failure"

    elif "clarification" in reason:
        return "governance_failure"

    elif "unsupported" in reason:
        return "unsupported_capability_failure"

    else:
        return "sql_generation_failure"


def normalize_result(rows):

    normalized = []

    for row in rows:
        normalized.append(tuple(str(x) for x in row))

    return sorted(normalized)


def evaluate():

    with open("evaluation/golden_dataset.json", "r") as f:
        test_cases = json.load(f)

    total = len(test_cases)

    passed = 0
    failed = 0

    valid_statuses = [
        "success",
        "clarification_needed"
    ]

    for test in test_cases:

        question = test["question"]

        result = run_sql_agent(question)

        # -----------------------------------
        # Handle true failures only
        # -----------------------------------

        if result["status"] not in valid_statuses:

            failure_type = classify_failure(question, result)

            print(f"FAIL: {question} → agent failed")
            print("Failure Type:", failure_type)
            print("Reason:", result)

            failed += 1

            continue

        # -----------------------------------
        # Governance clarification accepted
        # -----------------------------------

        if result["status"] == "clarification_needed":

            passed += 1

            print(f"PASS: {question} → clarification requested")

            continue

        # -----------------------------------
        # Normal SQL success flow
        # -----------------------------------

        data = result["data"]

        # Case 1: expected row count

        if "expected_result_count" in test:

            if len(data) == test["expected_result_count"]:

                passed += 1

                print(f"PASS: {question}")

            else:

                failed += 1

                print(f"FAIL: {question} → wrong row count")

        # Case 2: exact result comparison

        elif "expected_result" in test:

            if normalize_result(data) == normalize_result(test["expected_result"]):

                passed += 1

                print(f"PASS: {question}")

            else:

                failed += 1

                print(f"FAIL: {question} → incorrect result")

    accuracy = passed / total

    print("\nEvaluation Summary")
    print("------------------")

    print(f"Total tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")

    print(f"Accuracy: {accuracy:.2f}")


if __name__ == "__main__":
    evaluate()