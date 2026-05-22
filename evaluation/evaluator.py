import json
from agents.sql_agent import run_sql_agent

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

    for test in test_cases:

        question = test["question"]

        result = run_sql_agent(question)

        if result["status"] != "success":
            print(f"FAIL: {question} → agent failed")
            print("Reason:", result)
            failed += 1
            continue

        data = result["data"]

        # Case 1: check expected result count
        if "expected_result_count" in test:
            if len(data) == test["expected_result_count"]:
                passed += 1
                print(f"PASS: {question}")
            else:
                failed += 1
                print(f"FAIL: {question} → wrong row count")

        # Case 2: check exact result
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
