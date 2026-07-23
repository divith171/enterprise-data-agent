#def select_relevant_tables(question: str, schema: dict) -> dict:
    #"""
    #Select relevant tables from schema based on keywords in the question.
    #"""

#    question_lower = question.lower()

#    relevant_schema = {}

#    for table_name, columns in schema.items():
#        table_lower = table_name.lower()

        # if table name appears in question
#        if table_lower in question_lower:
#            relevant_schema[table_name] = columns
#            continue

        # if any column name appears in question
#        for col in columns:
#            if col.lower() in question_lower:
#                relevant_schema[table_name] = columns
#                break

    # fallback: if nothing matched, return full schema
#    if not relevant_schema:
#        return schema

#    return relevant_schema

def select_relevant_tables(question: str, schema: dict):

    question_lower = question.lower()

    table_scores = {}

    for table_name, columns in schema.items():

        score = 0

        table_lower = table_name.lower()

        # Strong signal:
        # table explicitly mentioned

        if table_lower in question_lower:
            score += 3

        # Column matches

        for col in columns:

            col_lower = col.lower()

            if col_lower in question_lower:
                score += 1

        if score > 0:
            table_scores[table_name] = score

    # fallback
    if not table_scores:
        return schema

    # keep only strongest matches

    max_score = max(table_scores.values())

    relevant_tables = {

        table: schema[table]

        for table, score in table_scores.items()

        if score >= max_score
    }

    return relevant_tables