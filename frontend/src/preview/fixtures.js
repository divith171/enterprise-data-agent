// DEVELOPMENT-ONLY PREVIEW FIXTURES · Sample data. Never used as a live-data fallback.

export const PREVIEW_SOURCE_NAME = "Test Customer PostgreSQL";
export const PREVIEW_LONG_SOURCE_NAME =
  "Northwind Regional Finance — Consolidated Customer Credit Risk Reporting Warehouse (Quarterly Review Replica, Sample)";

// Shape mirrors a full /data-sources record; topology fields are sample values the UI must never display.
export const sourceRecord = (overrides = {}) => ({
  id: "demo-source",
  name: PREVIEW_SOURCE_NAME,
  is_active: true,
  type: "postgresql",
  host: "sample-host.invalid",
  port: 5432,
  database_name: "sample_db",
  username: "sample_user",
  ssl_mode: "require",
  secret_ref: "sample-secret-ref",
  ...overrides,
});

export const CANONICAL_QUESTION =
  "Show me the 10 customers with the lowest credit scores, including customer name, credit score, delinquency rate, risk grade, state, and segment.";

// The one canonical complete success fixture.
export const CANONICAL_SUCCESS = {
  schema_version: "1",
  session_id: "demo-analysis",
  outcome: "success",
  source: { id: "demo-source", name: "Test Customer PostgreSQL" },
  answer: "**3 customers** were returned, ordered by credit score from lowest to highest.",
  result: {
    columns: [
      { index: 0, name: "name", type: "varchar" },
      { index: 1, name: "credit_score", type: "int4" },
      { index: 2, name: "delinquency_rate", type: "numeric" },
      { index: 3, name: "risk_grade", type: "varchar" },
      { index: 4, name: "state", type: "varchar" },
      { index: 5, name: "segment", type: "varchar" },
    ],
    rows: [
      ["Charlie", 580, "0.10", "C", "NY", "Premium"],
      ["Bob", 620, "0.05", "B", "TX", "Standard"],
      ["Alice", 700, "0.01", "A", "CA", "Premium"],
    ],
    returned_row_count: 3,
    truncated: false,
  },
  sql: "SELECT name, credit_score, delinquency_rate, risk_grade, state, segment\nFROM customers\nORDER BY credit_score ASC\nLIMIT 10;",
};

const base = { schema_version: "1", session_id: "demo-analysis" };
const src = { id: "demo-source", name: PREVIEW_SOURCE_NAME };
const success = (answer, columns, rows, { truncated = false, sql } = {}) => ({
  ...base,
  outcome: "success",
  source: src,
  answer,
  result: {
    columns: columns.map(([name, type], index) => ({ index, name, type })),
    rows,
    returned_row_count: rows.length,
    truncated,
  },
  sql: sql || "SELECT * FROM sample_table;",
});

const REGIONS = ["North", "South", "East", "West", "Central"];
const rows250 = Array.from({ length: 250 }, (_, i) => [i + 1, REGIONS[i % 5], `${(i * 137) % 9000}.${String(i % 100).padStart(2, "0")}`]);

const LONG_TEXT =
  "Sample long note: this customer record carries an extended free-text comment that exceeds the ordinary cell width so the table offers a full-value dialog instead of stretching the layout. It continues with more sample words for review purposes only.";
const twentyCols = [
  ["name", "varchar"], ["name", "varchar"], ["account_id", "int8"], ["balance", "numeric"],
  ["customer_lifetime_value_in_reporting_currency_after_adjustments", "numeric"],
  ["opened_on", "date"], ["region", "varchar"], ["segment", "varchar"], ["status", "varchar"],
  ["score", "int4"], ["ratio", "float8"], ["notes", "text"], ["is_active", "bool"], ["uuid", "uuid"],
  ["city", "varchar"], ["state", "varchar"], ["zip", "varchar"], ["updated_at", "timestamptz"],
  ["tier", "bpchar"], ["flag_count", "int2"],
];
const twentyRow = (i) => [
  `Sample ${i}`, `Duplicate ${i}`, `90071992547409${90 + i}`, `${i}.500`, `12345.6${i}0`,
  `2024-0${i}-15`, "North", "Premium", "open", 600 + i, 0.25 * i, i === 1 ? LONG_TEXT : `Short note ${i}`,
  i % 2 === 0, `3f2c8e1a-0000-4000-8000-00000000000${i}`, "Springfield", "IL", "62701",
  `2024-0${i}-15T09:30:00+00:00`, "A ", i,
];

export const QUERY_FIXTURES = {
  "success-canonical": CANONICAL_SUCCESS,
  "success-zero": success(
    "No rows matched these criteria.",
    [["name", "varchar"], ["credit_score", "int4"], ["state", "varchar"]],
    [],
    { sql: "SELECT name, credit_score, state\nFROM customers\nWHERE credit_score < 300;" },
  ),
  "success-truncated": success(
    "Sample data: the first **5 orders** were returned.",
    [["order_id", "int8"], ["status", "varchar"]],
    [["1001", "shipped"], ["1002", "pending"], ["1003", "shipped"], ["1004", "returned"], ["1005", "shipped"]],
    { truncated: true, sql: "SELECT order_id, status FROM orders LIMIT 5;" },
  ),
  "success-250": success(
    "Sample data: **250 rows** were returned for paging review.",
    [["row_number", "int4"], ["region", "varchar"], ["amount", "numeric"]],
    rows250,
    { sql: "SELECT row_number, region, amount FROM sample_amounts ORDER BY row_number;" },
  ),
  "success-20-columns": success(
    "Sample data with 20 columns, duplicate column names, a long header and a long cell value.",
    twentyCols,
    [1, 2, 3].map(twentyRow),
    { sql: `SELECT ${twentyCols.map(([n]) => n).join(", ")} FROM sample_wide_table WHERE some_extremely_long_condition_name = 'a value that keeps this SQL line wide enough to scroll horizontally inside the card';` },
  ),
  "success-numeric-cases": success(
    "Sample data covering numeric precision, special values, booleans, binary and null versus empty text.",
    [
      ["case", "text"], ["int4_value", "int4"], ["int8_value", "int8"], ["numeric_value", "numeric"],
      ["float_value", "float8"], ["bool_value", "bool"], ["date_value", "date"], ["uuid_value", "uuid"],
      ["bytea_value", "bytea"], ["code_text", "text"], ["note", "text"],
    ],
    [
      ["trailing zeros", 42, "9007199254740993", "0.10", 1.5, true, "2024-01-31", "7f3c2a10-1b2c-4d5e-8f90-1234567890ab", "3q2+7w==", "00123", ""],
      ["more trailing zeros", -7, "9223372036854775807", "100.000", "NaN", false, "1999-12-31", "00000000-0000-4000-8000-000000000000", "AAEC", "1e5", null],
      ["precision", 0, "-9223372036854775808", "123456789012345678901234.5678900", "Infinity", null, null, null, null, "0.10", "empty above is null"],
      ["specials", null, "0", "0.1", "-Infinity", true, "2024-02-29", null, "", "12.50", "**not bold** <b>inert</b>"],
    ],
    { sql: "SELECT * FROM sample_numeric_cases;" },
  ),
  "success-rich-answer": success(
    "Sample answer covering the **safe formatting** subset.\nThis second line follows a single line break.\n\nA new paragraph with *emphasis*, **bold** and `inline_code`.\n\n1. First numbered item\n2. Second numbered item with **bold**\n\n- First bullet\n- Second bullet with *emphasis*",
    [["metric", "varchar"], ["value", "numeric"]],
    [["sample_metric", "1.20"]],
  ),
  "success-hostile-answer": success(
    "Sample hostile content stays inert:\n<script>alert('x')</script>\n<img src=\"https://example.com/pixel.png\" onerror=\"alert(1)\">\n![tracker](https://example.com/tracker.png)\n<iframe src=\"https://example.com\"></iframe>\n<embed src=\"https://example.com/movie.swf\">\n[click me](javascript:alert(1)) and <a href=\"https://example.com\">a link</a>\n**Bold still renders.**",
    [["cell", "text"]],
    [["<script>alert('cell')</script>"], ["![img](https://example.com/x.png)"], ["**not markdown**"]],
  ),
  "success-explanation-failed": success(
    "Query executed successfully, but explanation generation failed.",
    [["state", "varchar"], ["customers", "int8"]],
    [["CA", "1204"], ["TX", "988"]],
    { sql: "SELECT state, COUNT(*) AS customers FROM customers GROUP BY state ORDER BY customers DESC;" },
  ),
  "clarification-questions": {
    ...base,
    outcome: "clarification_needed",
    clarification: {
      message: null,
      questions: ["Which time period should this cover?", "Should cancelled orders be included?"],
      possible_interpretations: [],
    },
  },
  "clarification-interpretations": {
    ...base,
    outcome: "clarification_needed",
    clarification: {
      message: "Sample clarification: “top customers” could mean a few different things.",
      questions: [],
      possible_interpretations: [
        "Top 10 customers by total revenue in the last 12 months",
        "Top 10 customers by number of orders, all time,\nexcluding cancelled orders",
      ],
    },
  },
  "unsupported-operation": {
    ...base,
    outcome: "unsupported",
    error: {
      code: "UNSUPPORTED_OPERATION",
      message: "Sample message: DataKat can only read data. Changing or deleting records isn't supported.",
      missing_requirements: [],
    },
  },
  "unsupported-analysis": {
    ...base,
    outcome: "unsupported",
    error: {
      code: "ANALYSIS_NOT_SUPPORTED",
      message: "Sample message: this analysis isn't supported for this data source.",
      missing_requirements: ["Sample requirement: a column recording when each order was placed"],
    },
  },
  "error-analysis-failed": {
    ...base,
    outcome: "error",
    error: { code: "ANALYSIS_FAILED", message: "DataKat couldn't complete this analysis." },
  },
  "unknown-schema": { ...CANONICAL_SUCCESS, schema_version: "2" },
  "malformed-dimensions": {
    ...CANONICAL_SUCCESS,
    result: { ...CANONICAL_SUCCESS.result, rows: [["Charlie", 580], ["Bob", 620, "0.05", "B", "TX", "Standard"]] , returned_row_count: 2 },
  },
  "row-count-mismatch": { ...CANONICAL_SUCCESS, result: { ...CANONICAL_SUCCESS.result, returned_row_count: 5 } },
  "source-mismatch": { ...CANONICAL_SUCCESS, source: { id: "another-source", name: "Another source" } },
};

export const HTTP_SCENARIOS = {
  "http-401": { status: 401 },
  "http-403": { status: 403 },
  "http-403-source-removed": { status: 403, removeSource: true },
  "http-422": { status: 422 },
  "http-429": { status: 429, retryAfter: 20 },
  "http-500": { status: 500 },
};
