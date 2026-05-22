from fastapi import FastAPI
from pydantic import BaseModel
from contextlib import asynccontextmanager
from services.intent_continuation_service import classify_intent_continuation
from agents.sql_agent import run_sql_agent
from services.schema_service import get_schema
from services.interpretation_service import parse_user_response
from services.continuation_interpreter_service import interpret_continuation

# -------------------------------
# App setup
# -------------------------------
session_store = {}
schema_cache = {}

@asynccontextmanager
async def lifespan(app: FastAPI):

    global schema_cache
    schema_cache = get_schema()

    print("Schema loaded:", schema_cache)

    yield


app = FastAPI(
    title="Enterprise Data Agent",
    description="AI agent that converts natural language into SQL queries",
    version="1.0",
    lifespan=lifespan
)

# -------------------------------
# Request Model
# -------------------------------
class QueryRequest(BaseModel):
    message: str
    session_id: str


# -------------------------------
# Routes
# -------------------------------

@app.get("/")
def root():
    return {"message": "Enterprise Data Agent is running"}


@app.get("/health")
def health_check():
    return {"status": "running"}


@app.post("/query")
def query_agent(request: QueryRequest):

    # --------------------------------
    # TRACE LOG INITIALIZATION
    # --------------------------------

    trace_log = {}

    print("QUERY ENDPOINT HIT")

    session_id = request.session_id
    user_input = request.message

    print("SESSION:", session_id)
    print("USER INPUT:", user_input)

    trace_log["session_id"] = session_id
    trace_log["user_input"] = user_input

    if session_id not in session_store:

        session_store[session_id] = {
            "current_query": user_input,
            "context": {}
        }

    current_query = session_store[session_id]["current_query"]
    context = session_store[session_id]["context"]

    # --------------------------------
    # Intent continuation classification
    # --------------------------------

    intent_result = classify_intent_continuation(
        previous_query=current_query,
        current_input=user_input
    )

    print("INTENT TYPE:", intent_result)

    trace_log["intent_result"] = intent_result

    intent_type = intent_result.get("intent_type")

    # --------------------------------
    # NEW QUERY → RESET CONTEXT
    # --------------------------------

    if intent_type == "new_query":

        current_query = user_input

        context = {}

        session_store[session_id]["current_query"] = current_query
        session_store[session_id]["context"] = context

    # --------------------------------
    # CONTINUATION / CLARIFICATION
    # --------------------------------

    else:

        continuation_result = interpret_continuation(
            previous_query=current_query,
            continuation_input=user_input
        )

        print("CONTINUATION RESULT:", continuation_result)

        trace_log["continuation_result"] = continuation_result

        current_query = continuation_result.get(
            "refined_query",
            current_query
        )

        session_store[session_id]["current_query"] = current_query

        # optional structured enrichments
        if continuation_result.get("group_by"):
            context["group_by"] = continuation_result["group_by"]

        if continuation_result.get("time_granularity"):
            context["time_granularity"] = (
                continuation_result["time_granularity"]
            )

        if continuation_result.get("filter_condition"):
            context["filter_condition"] = (
                continuation_result["filter_condition"]
            )

        if continuation_result.get("metric_refinement"):
            context["metric_refinement"] = (
                continuation_result["metric_refinement"]
            )

    parsed = parse_user_response(user_input)

    print("PARSED:", parsed)

    trace_log["parsed_response"] = parsed

    context = session_store[session_id]["context"]

    # update context with parsed values
    if parsed.get("threshold") is not None:
        context["threshold"] = parsed["threshold"]

    if parsed.get("operator") is not None:
        context["operator"] = parsed["operator"]

    if parsed.get("time_range") is not None:
        context["time_range"] = parsed["time_range"]

    print("UPDATED CONTEXT:", context)

    trace_log["updated_context"] = context.copy()

    # ----------------------------
    # Build refined query
    # ----------------------------

    refined_query = current_query

    if context.get("threshold"):
        refined_query += (
            f" {context.get('operator', '<')} "
            f"{context['threshold']}"
        )

    if context.get("time_range"):
        refined_query += f" over {context['time_range']}"

    print("REFINED QUERY:", refined_query)

    trace_log["refined_query"] = refined_query

    # ----------------------------
    # Run agent
    # ----------------------------

    result = run_sql_agent(
        refined_query,
        context=context
    )

    # --------------------------------
    # ATTACH TRACE LOG
    # --------------------------------

    result["trace_log"] = trace_log

    # attach context + session info
    result["context"] = context
    result["session_id"] = session_id

    print("FINAL CONTEXT:", context)

    return result