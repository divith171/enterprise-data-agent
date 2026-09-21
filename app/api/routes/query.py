from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from observability.telemetry import telemetry
from observability.constants import PipelineStages
from services.intent_continuation_service import classify_intent_continuation
from agents.sql_agent import run_sql_agent
from services.interpretation_service import parse_user_response
from services.continuation_interpreter_service import interpret_continuation
from app.data_sources.service import get_authorized_data_source
from db.connection import (
    open_customer_pool,
    clear_customer_pool,
)
from services.session_service import (
    create_session,
    session_exists,
    session_belongs_to_user,
    get_current_query,
    get_context,
    set_current_query,
    set_context
)

router = APIRouter()


class QueryRequest(BaseModel):
    message: str
    session_id: str
    data_source_id: str

@router.post("/query")
async def query_agent(request: QueryRequest, current_user=Depends(get_current_user)):

    trace_log = {}

    print("===== QUERY.PY ROUTE EXECUTED =====")

    session_id = request.session_id
    user_input = request.message
    data_source = await get_authorized_data_source(
    request.data_source_id,
    current_user["company_id"],
    )

    if data_source is None:
        raise HTTPException(
            status_code=403,
            detail="DATA_SOURCE_ACCESS_FORBIDDEN",
        )
    print("SESSION:", session_id)
    print("USER INPUT:", user_input)

    trace_log["session_id"] = session_id
    trace_log["user_input"] = user_input

    # -------------------------------
    # Create session if needed
    # -------------------------------

    if not await session_exists(session_id):

        await create_session(
            session_id,
            current_user["id"],
            current_user["company_id"],
            request.data_source_id,
            {
                "current_query": user_input,
                "context": {}
            }
        )
    else:
        if not await session_belongs_to_user(
            session_id,
            current_user["id"],
        ):
            raise HTTPException(
                status_code=403,
                detail="SESSION_ACCESS_FORBIDDEN",
            )
    current_query = await get_current_query(session_id)
    context = await get_context(session_id)

    # -------------------------------
    # Intent Classification
    # -------------------------------

    with telemetry.pipeline_stage(
    PipelineStages.INTENT_CLASSIFICATION
        ):
            intent_result = classify_intent_continuation(
                previous_query=current_query,
                current_input=user_input
            )

    print("INTENT TYPE:", intent_result)

    trace_log["intent_result"] = intent_result

    intent_type = intent_result.get("intent_type")

    # -------------------------------
    # NEW QUERY
    # -------------------------------

    if intent_type == "new_query":

        current_query = user_input
        context = {}

        await set_current_query(session_id, current_query)
        await set_context(session_id, context)

    # -------------------------------
    # CONTINUATION
    # -------------------------------

    else:

        with telemetry.pipeline_stage(
                PipelineStages.CONTINUATION_DETECTION
            ):
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

        await set_current_query(session_id, current_query)

        if continuation_result.get("group_by"):
            context["group_by"] = continuation_result["group_by"]

        if continuation_result.get("time_granularity"):
            context["time_granularity"] = continuation_result["time_granularity"]

        if continuation_result.get("filter_condition"):
            context["filter_condition"] = continuation_result["filter_condition"]

        if continuation_result.get("metric_refinement"):
            context["metric_refinement"] = continuation_result["metric_refinement"]

        await set_context(session_id, context)

    # -------------------------------
    # Parse user response
    # -------------------------------

    parsed = parse_user_response(user_input)

    print("PARSED:", parsed)

    trace_log["parsed_response"] = parsed

    context = await get_context(session_id)

    if parsed.get("threshold") is not None:
        context["threshold"] = parsed["threshold"]

    if parsed.get("operator") is not None:
        context["operator"] = parsed["operator"]

    if parsed.get("time_range") is not None:
        context["time_range"] = parsed["time_range"]

    await set_context(session_id, context)

    print("UPDATED CONTEXT:", context)

    trace_log["updated_context"] = context.copy()

    # -------------------------------
    # Build refined query
    # -------------------------------

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

    # -------------------------------
    # Run Agent
    # -------------------------------

    customer_pool = await open_customer_pool(data_source)

    try:
        result = await run_sql_agent(
            refined_query,
            context=context,
            data_source=data_source,
        )

    finally:
        clear_customer_pool()
        await customer_pool.close()

    result["trace_log"] = trace_log
    result["context"] = context
    result["session_id"] = session_id

    print("FINAL CONTEXT:", context)

    return result