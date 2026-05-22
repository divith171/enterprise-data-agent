from agents.sql_agent import run_sql_agent

question = "customers with low engagement"

result = run_sql_agent(question)

print(result)