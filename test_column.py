from services.embedding_service import get_relevant_columns
query = "customers with high credit score"

results = get_relevant_columns(query)

for row in results:
    print(row)