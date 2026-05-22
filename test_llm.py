from services.llm_service import generate_sql
from services.schema_service import get_schema_context

schema = get_schema_context()

user_question = "List customers with credit score below 650 along with their risk grade."

sql = generate_sql(user_question, schema)

print("Generated SQL:")
print(sql)