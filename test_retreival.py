from services.embedding_service import get_relevant_tables
tables = get_relevant_tables("Customers with low credit scores")
print(tables)