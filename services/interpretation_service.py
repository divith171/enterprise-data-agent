from openai import OpenAI
import os
import re
import time
import json
from services.embedding_service import get_embedding
import numpy as np
from services.embedding_service import get_table_embeddings
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def extract_intent(user_question):
    """
    Extract structured analytical intent from user query.
    Returns strict JSON with entity, metrics, comparisons, etc.
    """

    prompt = f"""
Extract the analytical intent from the query.

Query:
"{user_question}"

Return STRICT JSON in this format:

{{
  "entity": null,
  "metrics": [],
  "filters": [],
  "comparisons": [],
  "group_by": [],
  "time": null
}}

Rules:
- entity = main subject (e.g., customers, orders, users)
- metrics = measurable numeric fields (e.g., revenue, credit score)
- comparisons = terms like high, low, top, bottom
- filters = conditions (if any)
- group_by = grouping entity (if mentioned)
- time = time constraint (if mentioned), else null

STRICT:
- Return ONLY valid JSON
- No explanation
- No extra text
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    content = response.choices[0].message.content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # fallback safe structure
        return {
            "entity": None,
            "metrics": [],
            "filters": [],
            "comparisons": [],
            "group_by": [],
            "time": None
        }

def detect_ambiguities(user_question, stored_columns, intent, concept_mappings):
    questions = []

    mapped_columns = [col for _, col in concept_mappings]

    # --- Metric ambiguity (multiple possible meanings)
    if len(mapped_columns) > 1:
        questions.append(
            f"Which metric should be used: {', '.join(mapped_columns)}?"
        )

    # --- Threshold ambiguity
    if intent.get("comparisons"):
        comp = intent["comparisons"][0]
        for col in mapped_columns:
            questions.append(
                f"What threshold defines '{comp}' for {col}?"
            )

    # --- Time ambiguity
    if intent.get("time") is None:
        questions.append(
            "Should this be calculated over a specific time period?"
        )

    return list(set(questions))

def detect_entity_tables(schema):
    """
    Identify entity tables (tables with identifiers like *_id but not purely transactional).
    """
    entity_tables = []

    for table, columns in schema.items():
        id_cols = [c for c in columns if c.endswith("_id")]

        # heuristic: entity tables usually have:
        # - primary id
        # - descriptive columns (name, state, etc.)
        if id_cols and any(c not in id_cols for c in columns):
            entity_tables.append(table)

    return entity_tables

def cosine_distance(vec1, vec2):
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    return 1 - np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))


async def map_entity_to_table(entity, schema):
    """
    Map extracted entity (e.g., 'customers') to closest table using embeddings.
    """
    print("\n========== ENTITY MAPPING START ==========")
    if not entity:
        return None

    print("ENTITY:", entity)
    start= time.time()
    entity_embedding = get_embedding(entity)
    table_embeddings = await get_table_embeddings()
    print(
    "ENTITY EMBEDDING TIME:",
    round(time.time() - start, 3)
    )
    best_table = None
    best_score = float("inf")

    for table, table_embedding in table_embeddings:

        print("CHECKING TABLE:", table)

        dist = cosine_distance(
            entity_embedding,
            table_embedding
        )

        print(
            "DISTANCE:",
            round(dist, 4)
        )  

        if dist < best_score:
            best_score = dist
            best_table = table
        
    
    print("BEST TABLE:", best_table)
    print("========== ENTITY MAPPING END ==========\n")    
    return best_table

def expand_concepts(user_question, schema):
    """
    Expand concepts using ONLY available schema columns
    """

    schema_text = ""
    for table, cols in schema.items():
        schema_text += f"\nTable {table}: {', '.join(cols)}"

    prompt = f"""
You are mapping business language to database columns.

Query:
"{user_question}"

Available schema:
{schema_text}

Instructions:
- Interpret the meaning of the query
- Map business concepts to the closest matching columns in the schema
- You are allowed to reason (e.g., "engagement" → payment behavior → payment_amount)
- ONLY return columns that exist in the schema
- Do NOT return columns not present in schema
- Return as Python list

Examples:
"low engagement" → ["payment_amount"]
"high exposure" → ["loan_amount"]
"good performance" → ["credit_score"]

Return ONLY list.
"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    text = response.choices[0].message.content.strip()

    try:
        return eval(text)
    except:
        return []
    
def map_concepts_to_columns(intent, stored_columns, schema_with_types):
    """
    Map concepts to meaningful metric columns using schema types
    """
    print("\nINTENT RECEIVED BY MAPPER:")
    print(intent)
    mapped = []
    if not intent.get("metrics"):
        return []
    for table, col,description,dist in stored_columns:
        # find column type from schema
        col_type = None
        for c, dtype in schema_with_types.get(table, []):
            if c == col:
                col_type = dtype
                break

        if not col_type:
            continue

        # ✅ keep only true metric columns (numeric types)
        NUMERIC_TYPES = [ "integer","bigint","smallint","numeric","real","double precision"]
        if col_type in NUMERIC_TYPES and not col.endswith("_id") :
            print(
                "NUMERIC COLUMN FOUND:",
                table,
                col,
                col_type
            )
            mapped.append((table, col))

    # remove duplicates + keep top few
    return list(dict.fromkeys(mapped))[:2]

def parse_user_response(user_response):

    text = user_response.lower()

    # ---------------------------
    # 1. normalize word numbers
    # ---------------------------
    word_to_num = {
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "seven": 7,
        "eight": 8,
        "nine": 9,
        "ten": 10
    }

    for word, num in word_to_num.items():
        text = re.sub(rf"\b{word}\b", str(num), text)

    # ---------------------------
    # 2. LLM interprets analytical intent
    # ---------------------------
    prompt = f"""
You are an enterprise analytics intent interpreter.

Your job is to understand analytical language used by business users
and extract structured query meaning from clarification responses.

USER INPUT:
"{text}"

ANALYTICAL CONCEPT DEFINITIONS:

- threshold:
  A numeric condition applied to a metric.
  Examples:
  "less than 500"
  "greater than 1000"

- operator:
  Comparison associated with the threshold.
  Examples:
  "<", ">", "="

- time_range:
  Any temporal reference, reporting period,
  fiscal period, calendar interval,
  or relative timeframe.

  Examples include:
  - last 6 months
  - past year
  - last financial year
  - this quarter
  - FY2024
  - recently
  - current month

INSTRUCTIONS:
- Preserve business language as-is
- Do NOT convert dates
- Do NOT invent values
- If a field is not present, return null
- Financial/business reporting periods count as time_range

Return ONLY valid JSON in this format:

{{
  "threshold": number or null,
  "operator": "<" or ">" or "=" or null,
  "time_range": string or null
}}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are an expert enterprise analytics interpreter."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    text_response = response.choices[0].message.content.strip()

    print("RAW LLM OUTPUT:", text_response)

    try:
        # remove markdown formatting if present
        text_response = re.sub(r"```json|```", "", text_response).strip()

        parsed = json.loads(text_response)

        return {
            "threshold": parsed.get("threshold"),
            "operator": parsed.get("operator"),
            "time_range": parsed.get("time_range")
        }

    except Exception as e:
        print("PARSE ERROR:", e)

        return {
            "threshold": None,
            "operator": None,
            "time_range": None
        }