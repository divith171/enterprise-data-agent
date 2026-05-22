from tools.sql_tool import run_query

query = """
WITH temp AS (SELECT * FROM customers) SELECT * FROM temp;
"""

result = run_query(query)

print("Query Result:")
print(result)