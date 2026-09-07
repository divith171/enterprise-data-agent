"""
Enterprise AI Operations Platform
Telemetry Constants
"""


class EventTypes:
    """
    Standard telemetry event types.
    """

    REQUEST_STARTED = "request_started"
    REQUEST_COMPLETED = "request_completed"
    REQUEST_FAILED = "request_failed"
    PIPELINE_COMPLETED = "pipeline_completed"
    PIPELINE_FAILED = "pipeline_failed"
    STAGE_STARTED = "stage_started"
    STAGE_COMPLETED = "stage_completed"
    STAGE_FAILED = "stage_failed"

    DECISION_MADE = "decision_made"

    PROMPT_SENT = "prompt_sent"
    PROMPT_RECEIVED = "prompt_received"

    SQL_GENERATED = "sql_generated"
    SQL_REVIEWED = "sql_reviewed"
    SQL_EXECUTED = "sql_executed"

    RETRIEVAL_COMPLETED = "retrieval_completed"

    EXPLANATION_GENERATED = "explanation_generated"

class Status:
    """
    Standard execution status values.
    """

    RUNNING = "running"

    SUCCESS = "success"

    FAILED = "failed"

    WARNING = "warning"

    CANCELLED = "cancelled"

    SKIPPED = "skipped"

class PipelineGroups:
    """
    High-level AI pipeline groups.
    Used by dashboards and executive views.
    """

    UNDERSTANDING = "understanding"

    RETRIEVAL = "retrieval"

    PLANNING = "planning"

    GENERATION = "generation"

    VALIDATION = "validation"

    EXECUTION = "execution"

    EXPLANATION = "explanation"

class PipelineStages:
    """
    Individual AI pipeline stages.
    Used for tracing and detailed observability.
    """

    SESSION = "session"

    INTENT_CLASSIFICATION = "intent_classification"

    CONTINUATION_DETECTION = "continuation_detection"

    QUERY_EXPANSION = "query_expansion"

    SCHEMA_RETRIEVAL = "schema_retrieval"

    EMBEDDING_RETRIEVAL = "embedding_retrieval"

    CONCEPT_MAPPING = "concept_mapping"

    ENTITY_MAPPING = "entity_mapping"

    GRAPH_EXPANSION = "graph_expansion"

    BUSINESS_INTENT = "business_intent"

    ANALYSIS_PLANNER = "analysis_planner"

    REASONING = "reasoning"

    CAPABILITY_VALIDATION = "capability_validation"

    EXECUTION_PLANNER = "execution_planner"

    SQL_GENERATION = "sql_generation"

    SQL_REVIEW = "sql_review"

    SQL_EXECUTION = "sql_execution"

    BUSINESS_EXPLANATION = "business_explanation"
