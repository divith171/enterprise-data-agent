def select_relevant_tables(question: str, schema: dict) -> dict:
    """
    Select relevant tables from schema based on keywords in the question.
    """

    question_lower = question.lower()

    relevant_schema = {}

    for table_name, columns in schema.items():
        table_lower = table_name.lower()

        # if table name appears in question
        if table_lower in question_lower:
            relevant_schema[table_name] = columns
            continue

        # if any column name appears in question
        for col in columns:
            if col.lower() in question_lower:
                relevant_schema[table_name] = columns
                break

    # fallback: if nothing matched, return full schema
    if not relevant_schema:
        return schema

    return relevant_schema