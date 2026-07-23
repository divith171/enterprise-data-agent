from services.llm_service import generate_sql_from_state,generate_sql
from services.schema_service import get_schema,get_schema_with_types
from tools.sql_tool import run_query
from tools.query_validator import validate_query, QueryValidationError
from openai import OpenAI
import os
import traceback
import time
import inspect
import asyncio
from services.execution_planner_service import generate_execution_plan
from services.reasoning_service import generate_reasoning_trace
from services.capability_validator_service import validate_analytical_capability
from services.graph_service import build_graph,build_relationship_text
from services.analytical_planner_service import generate_analysis_plan
from services.query_type_service import classify_query_type
from services.sql_reviewer import review_sql
from services.state import QueryState
from services.embedding_service import get_relevant_columns
from observability.logger import start_request, finalize_request
from services.explanation_service import explain_result
from services.intent_guardrail import check_user_intent, IntentViolation
from services.interpretation_service import detect_ambiguities,map_entity_to_table,extract_intent,expand_concepts,map_concepts_to_columns
from utils.profiler import StageProfiler
profiler = StageProfiler()

def compute_confidence(results):
    distances = [d for _, d in results]

    if not distances:
        return "low"

    # if best match is very far → low
    if distances[0] > 1.3:
        return "low"

    # if multiple close matches → medium (AMBIGUITY)
    if len(distances) > 1 and (distances[1] - distances[0]) < 0.05:
        return "medium"

    # otherwise strong match
    return "high"


MAX_RETRIES = 2

def detect_missing(state, user_question):

    missing = []

    # ---------------------------
    # entity check
    # ---------------------------

    if not state.entity:
        missing.append("entity")

    # ---------------------------
    # metric check
    # ---------------------------

    if state.query_type in [
        "aggregation",
        "ranking",
        "trend"
    ]:

        analytical_intent_words = [

        "average",
        "avg",
        "total",
        "sum",
        "count",
        "maximum",
        "minimum",
        "highest",
        "lowest",
        "top",
        "bottom",
        "revenue",
        "sales",
        "profit",
        "growth",
        "salary",
        "cost",
        "amount",
        "ratio",
        "percentage",
        "income",
        "payment",
        "expense",
        "how many"
    ]

        metric_semantically_present = any(
            word.lower() in user_question.lower()
            for word in analytical_intent_words
        )

        if not state.metric and not metric_semantically_present:
            missing.append("metric")

    # ---------------------------
    # threshold logic
    # ---------------------------

    if state.comparison and not state.threshold:

        analytical_reference_words = [
            "average",
            "overall",
            "median",
            "percentile"
        ]

        relative_analytical_comparison = any(
            word in user_question.lower()
            for word in analytical_reference_words
        )

        if not relative_analytical_comparison:

            comparison_words = [
                "greater than",
                "less than",
                "more than",
                "below",
                "above"
            ]

            explicit_comparison = any(
                word in user_question.lower()
                for word in comparison_words
            )

            if explicit_comparison:
                missing.append("threshold")

    # ---------------------------
    # semantic threshold hints
    # ---------------------------

    vague_threshold_words = [
        "low",
        "high",
        "large",
        "small"
    ]

    tokens = user_question.lower().split()

    if any(
        word in tokens
        for word in vague_threshold_words
    ):

        if not state.threshold:
            missing.append("threshold")

    # ---------------------------
    # time requirement logic
    # ---------------------------

    if state.query_type == "trend":

        if not state.time:

            trend_words = [
                "growth",
                "trend",
                "increase",
                "decrease",
                "year over year",
                "month over month",
                "consecutive"
            ]

            requires_time = any(
                word in user_question.lower()
                for word in trend_words
            )

            if requires_time:
                missing.append("time")

    return missing
orchestration_trace = {}
TEST_SKIP_EXECUTION_PLANNER = True
async def run_sql_agent(user_question: str, context=None):
    overall_start = time.time()
    start = time.time()
    orchestration_trace = {}
    log_data = start_request(user_question)
    log_data["timings"] = {}
    full_schema = await get_schema()
    relationship_text = await build_relationship_text()
    elapsed = round(time.time() - start, 3)
    print(   "SCHEMA LOAD TIME:",   elapsed)
    log_data["timings"]["schema_load"] = elapsed
    start = time.time()

    expanded_terms_task = asyncio.to_thread(
        expand_concepts,
        user_question,
        full_schema
    )

    intent_task = asyncio.to_thread(
        extract_intent,
        user_question
    )

    query_type_task = asyncio.to_thread(
        classify_query_type,
        user_question
    )

    expanded_terms = await expanded_terms_task

    elapsed1 = round(time.time() - start, 3)

    print("QUERY EXPANSION TIME:", elapsed1)

    log_data["timings"]["query_expansion_time"] = elapsed1

    print("Expanded terms:", expanded_terms)

    search_query = user_question + " " + " ".join(expanded_terms)

    start = time.time()

    stored_columns = await get_relevant_columns(search_query, top_k=15)
    elapsed2 = round(time.time() - start, 3)
    metadata_context = "\n\n".join([
    f"{table}.{column}\n{description}"
    for table, column, description, score
    in stored_columns
    ])
    print("\nMETADATA CONTEXT:")
    print(metadata_context)
    print(
    "EMBEDDING RETRIEVAL TIME:", elapsed2)
    log_data["timings"]["embedding_retrieval_time"] = elapsed2
    print("\nRETRIEVED COLUMN METADATA:")
    for row in stored_columns:
        print(row)
    
    query_type_result = await query_type_task
    print("QUERY TYPE:", query_type_result)
    schema_with_types = await get_schema_with_types()
    start = time.time()
    intent = await intent_task
    concept_mappings = map_concepts_to_columns(intent, stored_columns,schema_with_types)
    elapsed5 = round(time.time() - start, 3)
    print(
    "CONCEPT MAPPING TIME:", elapsed5)
    log_data["timings"]["concept_mapping_time"] = elapsed5
    start = time.time()
    entity_table = await map_entity_to_table(intent.get("entity"), full_schema)
    elapsed6 = round(time.time() - start, 3)
    print(
    "ENTITY MAPPING TIME:", elapsed6 )
    log_data["timings"]["entity_mapping_time"] = elapsed6
    relevant_tables = list(set([col[0] for col in stored_columns]))
    start = time.time()
    graph = await build_graph()
    elapsed7 = round(time.time() - start, 3)
    print(
    "GRAPH BUILD TIME:", elapsed7)
    log_data["timings"]["graph_build_time"] = elapsed7
    start = time.time()
    expanded_tables = set(relevant_tables)
    elapsed8 = round(time.time() - start, 3)
    for table in relevant_tables:

        connected_tables = graph.get(table, [])

        for connected in connected_tables:
            expanded_tables.add(connected)
    print(
    "GRAPH EXPANSION TIME:", elapsed8)
    log_data["timings"]["graph_expansion_time"] = elapsed8
    relevant_tables = list(expanded_tables)
    orchestration_trace["expanded_tables"] = relevant_tables
    print("EXPANDED TABLES:", relevant_tables)
    start = time.time()
    state = QueryState()
    elapsed9 = round(time.time() - start, 3)
    state.query_type = query_type_result.get("query_type")
    # entity
    state.entity = entity_table
    print(
    "STATE BUILD TIME:", elapsed9)
    log_data["timings"]["state_build_time"] = elapsed9
    # --------------------------------
    # Inject conversational context
    # into structured analytical state
    # --------------------------------

    if context:

        if context.get("group_by"):
            state.group_by = context["group_by"]

        if context.get("time_granularity"):
            state.time_granularity = (
                context["time_granularity"]
            )

        if context.get("filter_condition"):

            if not state.filters:
                state.filters = []

            state.filters.append(
                context["filter_condition"]
            )

        if context.get("metric_refinement"):

            if state.metric:

                state.metric = (
                    f"{state.metric} "
                    f"{context['metric_refinement']}"
                )
    # infer entity if missing
    if not state.entity and stored_columns:

        table_scores = {}

        for table, column, description ,score in stored_columns:

            if table not in table_scores:
                table_scores[table] = 0

            # lower distance = better semantic match
            table_scores[table] += (1 / score)

        inferred_table = max(table_scores, key=table_scores.get)

        state.entity = inferred_table

        print("INFERRED ENTITY:", inferred_table)

    # metric (best mapped column)
    if concept_mappings:
        print( "SETTING METRIC FROM:",concept_mappings)
        state.metric = concept_mappings[0][1]

    # context → state
    if context:
        state.threshold = context.get("threshold")
        state.comparison = context.get("operator")
        state.time = context.get("time_range")
    orchestration_trace["state"] = state.to_dict()
    print("STATE:", state.to_dict())

    if entity_table:
        print("Detected entity:", intent.get("entity"))
        print("Mapped entity table:", entity_table)
    # ensure entity table is included in relevant tables
        if entity_table not in relevant_tables:
            relevant_tables.append(entity_table)
    # extract tables from column results
    
    # compute confidence using column distances
    confidence = compute_confidence([(c[0], c[3]) for c in stored_columns])

    print("Top columns:", stored_columns)
    print(
    "CONCEPT MAPPINGS:",
    concept_mappings
    )
    print("Relevant tables:", relevant_tables)
    print("Confidence:", confidence)

    schema = {table: full_schema[table] for table in relevant_tables if table in full_schema}
    print("Selected schema:", schema)
    start = time.time()
    missing = detect_missing(state, user_question)
    elapsed10 = round(time.time() - start, 3)
    print(
    "MISSING DETECTION TIME:", elapsed10)
    log_data["timings"]["missing_detection_time"] = elapsed10

    print("MISSING:", missing)

    if missing:
        questions = []

        if "threshold" in missing:
            questions.append("What threshold defines the condition?")

        if "time" in missing:
            questions.append("Should this be calculated over a specific time period?")

        if "metric" in missing:
            questions.append("Which metric should be used?")

        if "entity" in missing:
            questions.append("Which entity are you referring to?")

        return {
            "status": "clarification_needed",
            "questions": questions,
            "state": state.to_dict()
        }
    if not missing:

        from services.business_intent_service import resolve_business_intent
        
        business_intent = await resolve_business_intent(
            user_question=user_question,
            state=state,
            schema=schema,
            metadata_context=metadata_context)
        print("\n========== BUSINESS INTENT RETURN ==========")
        print(business_intent)
        print("Keys:", business_intent.keys())
        print("Elapsed:", business_intent.get("elapsed"))
        print("==========================================\n")
        log_data["timings"]["business_intent"] = business_intent["elapsed"]  
        orchestration_trace["business_intent"] = business_intent
        print("BUSINESS INTENT:", business_intent)
        ##
        # --------------------------------
        # TERMINAL CLARIFICATION ROUTING
        # --------------------------------

        intent_type = business_intent.get(
            "intent_type"
        )

        if intent_type == "clarification":

            clarification_message = business_intent.get(
                "clarification_message",
                "Please clarify your request."
            )

            orchestration_trace[
                "clarification_reason"
            ] = clarification_message

            orchestration_trace[
                "possible_interpretations"
            ] = business_intent.get(
                "possible_interpretations",
                []
            )

            return {

                "status":
                    "clarification_needed",

                "message":
                    clarification_message,

                "possible_interpretations":
                    business_intent.get(
                        "possible_interpretations",
                        []
                    ),

                "orchestration_trace":
                    orchestration_trace
            }

        ###
        state.business_interpretation = business_intent.get(
            "business_interpretation"
        )
        state.trend_definition = business_intent.get(
            "trend_definition"
        )



        # ---------------------------------
        # analytical planning layer
        # ---------------------------------

        """ analysis_plan = generate_analysis_plan(

            user_question=user_question,
            state=state,
            schema=schema,
             relationship_text=relationship_text
        )
         """

        analysis_plan, reasoning_trace, capability_result = await asyncio.gather(

                generate_analysis_plan(
                    user_question=user_question,
                    state=state,
                    schema=schema,
                    relationship_text=relationship_text
                ),

                generate_reasoning_trace(
                    user_question,
                    state,
                    schema,
                    relationship_text
                ),

                validate_analytical_capability(
                    user_question=user_question,
                    state=state,
                    schema=schema
                )
            )

        # ---------- Analysis Planner ----------

        log_data["timings"]["analysis_planner"] = analysis_plan.pop("elapsed", 0)

        orchestration_trace["analysis_plan"] = analysis_plan

        print("ANALYSIS PLAN:", analysis_plan)

        state.analysis_type = analysis_plan.get("analysis_type")
        state.time_granularity = analysis_plan.get("time_granularity")
        state.analysis_plan = analysis_plan.get("analysis_plan")


        # ---------- Reasoning ----------

        log_data["timings"]["reasoning"] = reasoning_trace.pop("elapsed", 0)

        orchestration_trace["reasoning_trace"] = reasoning_trace

        print("REASONING TRACE:", reasoning_trace)
            

        if TEST_SKIP_EXECUTION_PLANNER:

            execution_plan = {
                "execution_stages": []
            }

            execution_plan_task = None

            print("EXECUTION PLANNER SKIPPED")

        else:

            execution_plan_task = asyncio.create_task(
                generate_execution_plan(
                    user_question,
                    state,
                    schema,
                    reasoning_trace,
                    relationship_text
                )
            )
            

        #execution_plan = generate_execution_plan(user_question,state,schema,reasoning_trace,relationship_text)
        

    # --------------------------------
    # Validate analytical feasibility
    # --------------------------------

    # ... after analysis_plan and reasoning_trace are collected ...

    log_data["timings"]["capability_validator"] = capability_result.pop("elapsed", 0)

    orchestration_trace["capability_result"] = capability_result

    print("CAPABILITY RESULT:", capability_result)

    if not capability_result.get("feasible", True):

        return {
            "success": False,

            "error":
                "Requested analysis is not feasible "
                "with the available data.",

            "reason":
                capability_result.get("reason"),

            "missing_requirements":
                capability_result.get(
                    "missing_requirements",
                    []
                )
        }
    # -------------------------------
    # ✅ SQL GENERATION PHASE
    # -------------------------------
    attempt = 0
    last_error = None
    retry_guidance = ""

    while attempt <= MAX_RETRIES:
        try:

            # 1️⃣ Generate SQL
            print("generate_sql_from_state =", generate_sql_from_state)
            print("iscoroutinefunction =", inspect.iscoroutinefunction(generate_sql_from_state))
            print("module =", generate_sql_from_state.__module__)
            if execution_plan_task is not None:
                execution_plan = await execution_plan_task
                orchestration_trace["execution_plan"] = execution_plan
                print("EXECUTION PLAN:", execution_plan)
            sql_result = await generate_sql_from_state(
                state,
                schema,
                reasoning_trace=reasoning_trace,
                execution_plan=execution_plan,
                retry_guidance=retry_guidance
                
            )

            print(type(sql_result))
            print(sql_result)
            log_data["timings"]["sql_generation"] = sql_result.pop("elapsed", 0)
            sql = sql_result["sql"]

            # 2️⃣ Validate SQL (syntax + forbidden ops)
            validate_query(sql)

            # 3️⃣ Review SQL logic
            review = await review_sql(user_question, sql, schema, state,reasoning_trace)
            log_data["timings"]["sql_review"] = review.pop("elapsed", 0)
            print("Generated SQL:", sql)
            orchestration_trace["review_result"] = review
            print("Review result:", review)

            if sql.strip() == "INVALID_QUERY":
                response = {
                    "status": "error",
                    "error": "Requested information is not available in the database schema.",
                    "attempts": attempt + 1
                }
                elapsed = round(time.time() - overall_start, 3)

                log_data["timings"]["total_pipeline_time"] = elapsed

                print("TOTAL PIPELINE TIME:", elapsed)
                finalize_request(
                    log_data,
                    sql,
                    response,
                    attempt
                )
                return response
            # 🔥 REVIEW FAILURE → DIMENSION-AWARE RETRY
            if not review["valid"]:

                print("Review failed. Retrying...")

                failed_reasons = []

                if not review["analytical_correctness"]["valid"]:
                    failed_reasons.append(
                        "Analytical issue: "
                        + review["analytical_correctness"]["reason"]
                    )

                if not review["temporal_correctness"]["valid"]:
                    failed_reasons.append(
                        "Temporal issue: "
                        + review["temporal_correctness"]["reason"]
                    )

                if not review["semantic_alignment"]["valid"]:
                    failed_reasons.append(
                        "Semantic issue: "
                        + review["semantic_alignment"]["reason"]
                    )

                if not review["implementation_quality"]["valid"]:
                    failed_reasons.append(
                        "Implementation issue: "
                        + review["implementation_quality"]["reason"]
                    )
                if not review["analytical_grain_correctness"]["valid"]:
                    failed_reasons.append(
                        "Analytical grain issue: "
                        + review["analytical_grain_correctness"]["reason"]
                    )
                combined_review_feedback = "\n".join(failed_reasons)

                retry_guidance = f"""
            PREVIOUS SQL FAILED REVIEW.

            REVIEW FAILURE DETAILS:
            {combined_review_feedback}

            IMPORTANT RETRY INSTRUCTIONS:

            - Preserve the original analytical intent
            - Preserve the established analysis type
            - Preserve trend/comparison semantics
            - Preserve analytical decomposition strategy
            - Do NOT simplify the analysis
            - Maintain temporal comparison logic
            - Maintain growth/trend calculations
            - Preserve already-correct analytical components
            - Repair only the incorrect logic

            ORIGINAL ANALYSIS PLAN:
            {state.analysis_plan}

            ANALYSIS TYPE:
            {state.analysis_type}

            TREND DEFINITION:
            {state.trend_definition}
           
            """

                last_error = combined_review_feedback

                attempt += 1
                print("RETRY GUIDANCE:")
                print(retry_guidance)
                print("REGENERATING SQL...")
                sql = None
                continue
            
            # 4️⃣ Execute ONLY valid SQL
            orchestration_trace["generated_sql"] = sql
            result = await run_query(sql)

            if result["status"] == "success":

                try:

                    if not result["data"]:
                        explanation = "No results found for the given query."

                    else:
                        print("=" * 60)
                        print("EXPLAIN FUNCTION:", explain_result)
                        print("MODULE:", explain_result.__module__)
                        print("COROUTINE:", inspect.iscoroutinefunction(explain_result))
                        print("=" * 60)
                        explanation_result =  await explain_result(
                            user_question,
                            sql,
                            result["data"]
                        )
                        print("EXPLAIN_RESULT:", explain_result)
                        print("TYPE:", type(explain_result))
                        print("IS COROUTINE:", inspect.iscoroutinefunction(explain_result))

                        log_data["timings"]["explanation"] = explanation_result.pop("elapsed", 0)

                        explanation = explanation_result["explanation"]


                except Exception as explanation_error:
                
                    print("Explanation generation failed:", explanation_error)
                    traceback.print_exc()
                    explanation = (
                        "Query executed successfully, "
                        "but explanation generation failed."
                    )
                orchestration_trace["explanation"] = explanation
                print("Explanation:", explanation)
                
                response = {
                    "status": "success",
                    "sql": sql,
                    "data": result["data"],
                    "attempts": attempt + 1,
                    "orchestration_trace": orchestration_trace
                }
                elapsed = round(time.time() - overall_start, 3)

                log_data["timings"]["total_pipeline_time"] = elapsed

                print("TOTAL PIPELINE TIME:", elapsed)
                finalize_request(
                            log_data,
                            sql,
                            response,
                            attempt + 1
                        )

                return response

            else:
                    print("=" * 80)
                    print("DATABASE ERROR:")
                    print(result["error"])
                    print("=" * 80)
                    last_error = result["error"]

        except QueryValidationError as e:

            if e.code == "FORBIDDEN_OPERATION":

                response = {
                    "status": "unsupported_operation",
                    "error": "This agent supports read-only analytical queries only."
                }
                elapsed = round(time.time() - overall_start, 3)

                log_data["timings"]["total_pipeline_time"] = elapsed
                print("TOTAL PIPELINE TIME:", elapsed)
                finalize_request(
                            log_data,
                            sql,
                            response,
                            attempt + 1
                        )

                return response

            last_error = str(e)

        attempt += 1

    # 🔥 FINAL SAFETY: FAIL CLEANLY (NO EXECUTION)
    response = {
        "status": "error",
        "error": last_error,
        "attempts": attempt,
        "orchestration_trace": orchestration_trace
    }
    elapsed11 = round(time.time() - overall_start, 3)
    log_data["timings"]["total_pipeline_time"] = elapsed11
    finalize_request(
    log_data,
    sql,
    response,
    attempt
)
    
    
    print(
    "TOTAL PIPELINE TIME:", elapsed11)
    return response