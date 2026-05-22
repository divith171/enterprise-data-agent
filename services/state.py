class QueryState:

    def __init__(self):

        # --------------------------------
        # Core query structure
        # --------------------------------

        self.entity = None
        self.metric = None
        self.aggregation = None

        self.filters = []

        self.group_by = None
        self.limit = None

        # --------------------------------
        # Temporal + comparison logic
        # --------------------------------

        self.time = None
        self.time_granularity = None

        self.comparison = None
        self.threshold = None

        self.trend_definition = None

        # --------------------------------
        # Query orchestration
        # --------------------------------

        self.query_type = None
        self.analysis_type = None

        # --------------------------------
        # Compact orchestration intelligence
        # --------------------------------

        self.business_interpretation = None

        self.analysis_plan = None

    def to_dict(self):

        return {

            # --------------------------------
            # Core query structure
            # --------------------------------

            "entity": self.entity,
            "metric": self.metric,
            "aggregation": self.aggregation,

            "filters": self.filters,

            "group_by": self.group_by,
            "limit": self.limit,

            # --------------------------------
            # Temporal + comparison logic
            # --------------------------------

            "time": self.time,
            "time_granularity": self.time_granularity,

            "comparison": self.comparison,
            "threshold": self.threshold,

            "trend_definition": self.trend_definition,

            # --------------------------------
            # Query orchestration
            # --------------------------------

            "query_type": self.query_type,
            "analysis_type": self.analysis_type,

            # --------------------------------
            # Compact orchestration intelligence
            # --------------------------------

            "business_interpretation":
                self.business_interpretation,

            "analysis_plan":
                self.analysis_plan
        }