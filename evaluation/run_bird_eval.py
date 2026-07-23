import json
import sys
import os
benchmark_results = []
sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
)
from agents.sql_agent import run_sql_agent


BIRD_PATH = "evaluation/bird/dev_20240627/dev.json"


with open(BIRD_PATH, "r", encoding="utf-8") as f:
    bird_data = json.load(f)


# -----------------------------------
# Filter only financial database
# -----------------------------------

financial_questions = []

for item in bird_data:

    if item["db_id"] == "financial":

        financial_questions.append(item)


# -----------------------------------
# Run only first 5 questions initially
# -----------------------------------

sample_questions = financial_questions[:10]


for idx, item in enumerate(sample_questions, start=1):

    question = item["question"]

    gold_sql = item["SQL"]

    print("\n" + "=" * 80)
    print(f"\nQUESTION {idx}/{len(sample_questions)}")
    print("=" * 80)

    print("\nUSER QUESTION:")
    print(question)

    print("\nGOLD SQL:")
    print(gold_sql)

    print("\nRUNNING AGENT...\n")

    result = run_sql_agent(question)

    print("\nAGENT RESULT:")
    print(result)

    benchmark_results.append({

    "question": question,

    "gold_sql": gold_sql,

    "agent_result": result
})
# ---------------------------------------
# SAVE RESULTS
# ---------------------------------------

with open(

    "evaluation/bird_results.json",

    "w",

    encoding="utf-8"

) as f:

    json.dump(

        benchmark_results,

        f,

        indent=2,

        ensure_ascii=False
    )

print("\nRESULTS SAVED TO:")
print("evaluation/bird_results.json")