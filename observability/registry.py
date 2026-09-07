from dataclasses import dataclass

from observability.constants import (
    PipelineGroups,
    PipelineStages,
)


@dataclass(frozen=True)
class StageMetadata:
    """
    Metadata describing a pipeline stage.
    """

    stage: str

    group: str

    display_name: str

    description: str

    order: int

    is_ai_stage: bool = True

    contributes_to_health: bool = True

    visible: bool = True

class Registry:
    """
    Central registry for AI pipeline metadata.
    """

    def __init__(self):
        self._stages = {}

    def register_stage(self, metadata: StageMetadata):
        """
        Register a pipeline stage.
        """

        if metadata.stage in self._stages:
            raise ValueError(
                f"Stage '{metadata.stage}' is already registered."
            )

        self._stages[metadata.stage] = metadata

    def get_stage(self, stage: str) -> StageMetadata:
        """
        Retrieve metadata for a pipeline stage.
        """

        return self._stages[stage]

    def list_stages(self):
        """
        Return all registered stages ordered by execution order.
        """

        return sorted(
            self._stages.values(),
            key=lambda stage: stage.order
        )
    def get_group(self, stage: str) -> str:
        """
        Return the pipeline group for a stage.
        """
        return self.get_stage(stage).group

    def get_display_name(self, stage: str) -> str:
        """
        Return the display name for a stage.
        """
        return self.get_stage(stage).display_name

    def get_description(self, stage: str) -> str:
        """
        Return the description for a stage.
        """
        return self.get_stage(stage).description

# Global registry instance
registry = Registry()


PIPELINE_STAGE_DEFINITIONS = [
    StageMetadata(
        stage=PipelineStages.SESSION,
        group=PipelineGroups.UNDERSTANDING,
        display_name="Session",
        description="Initializes the user session.",
        order=1,
        is_ai_stage=False,
    ),
    StageMetadata(
        stage=PipelineStages.INTENT_CLASSIFICATION,
        group=PipelineGroups.UNDERSTANDING,
        display_name="Intent Classification",
        description="Determines the user's intent.",
        order=2,
    ),
    StageMetadata(
        stage=PipelineStages.CONTINUATION_DETECTION,
        group=PipelineGroups.UNDERSTANDING,
        display_name="Continuation Detection",
        description="Determines whether the current request is a continuation.",
        order=3,
    ),
    StageMetadata(
        stage=PipelineStages.QUERY_EXPANSION,
        group=PipelineGroups.UNDERSTANDING,
        display_name="Query Expansion",
        description="Expands the user's query with inferred context.",
        order=4,
    ),
    StageMetadata(
        stage=PipelineStages.SCHEMA_RETRIEVAL,
        group=PipelineGroups.RETRIEVAL,
        display_name="Schema Retrieval",
        description="Retrieves the relevant database schema.",
        order=5,
    ),
    StageMetadata(
        stage=PipelineStages.EMBEDDING_RETRIEVAL,
        group=PipelineGroups.RETRIEVAL,
        display_name="Embedding Retrieval",
        description="Finds relevant schema elements using embeddings.",
        order=6,
    ),
    StageMetadata(
        stage=PipelineStages.ENTITY_MAPPING,
        group=PipelineGroups.RETRIEVAL,
        display_name="Entity Mapping",
        description="Maps business concepts to database entities.",
        order=7,
    ),
    StageMetadata(
    stage=PipelineStages.CONCEPT_MAPPING,
    group=PipelineGroups.RETRIEVAL,
    display_name="Concept Mapping",
    description="Maps business concepts to database schema elements.",
    order=8,
    ),
    StageMetadata(
        stage=PipelineStages.GRAPH_EXPANSION,
        group=PipelineGroups.RETRIEVAL,
        display_name="Graph Expansion",
        description="Expands relationships across the schema graph.",
        order=9,
    ),
    StageMetadata(
        stage=PipelineStages.BUSINESS_INTENT,
        group=PipelineGroups.PLANNING,
        display_name="Business Intent",
        description="Interprets the business meaning of the request.",
        order=10,
    ),
    StageMetadata(
        stage=PipelineStages.ANALYSIS_PLANNER,
        group=PipelineGroups.PLANNING,
        display_name="Analysis Planner",
        description="Selects the analytical strategy.",
        order=11,
    ),
    StageMetadata(
        stage=PipelineStages.REASONING,
        group=PipelineGroups.PLANNING,
        display_name="Reasoning",
        description="Performs intermediate reasoning before SQL generation.",
        order=12,
    ),
    StageMetadata(
        stage=PipelineStages.CAPABILITY_VALIDATION,
        group=PipelineGroups.VALIDATION,
        display_name="Capability Validation",
        description="Validates that the requested capability is supported.",
        order=13,
    ),
    StageMetadata(
        stage=PipelineStages.EXECUTION_PLANNER,
        group=PipelineGroups.PLANNING,
        display_name="Execution Planner",
        description="Builds the execution plan.",
        order=14,
    ),
    StageMetadata(
        stage=PipelineStages.SQL_GENERATION,
        group=PipelineGroups.GENERATION,
        display_name="SQL Generation",
        description="Generates SQL from the execution plan.",
        order=15,
    ),
    StageMetadata(
        stage=PipelineStages.SQL_REVIEW,
        group=PipelineGroups.VALIDATION,
        display_name="SQL Review",
        description="Reviews generated SQL before execution.",
        order=16,
    ),
    StageMetadata(
        stage=PipelineStages.SQL_EXECUTION,
        group=PipelineGroups.EXECUTION,
        display_name="SQL Execution",
        description="Executes SQL against the database.",
        order=17,
    ),
    StageMetadata(
        stage=PipelineStages.BUSINESS_EXPLANATION,
        group=PipelineGroups.EXPLANATION,
        display_name="Business Explanation",
        description="Generates the final business-friendly explanation.",
        order=18,
    ),
]

# Register all pipeline stages
for stage in PIPELINE_STAGE_DEFINITIONS:
    registry.register_stage(stage)