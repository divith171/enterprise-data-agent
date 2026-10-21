export const UNSUPPORTED_CODES = ["UNSUPPORTED_OPERATION", "ANALYSIS_NOT_SUPPORTED"];

const isStr = (v) => typeof v === "string";
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStrArr = (v) => Array.isArray(v) && v.every(isStr);
const isCell = (v) => v === null || isStr(v) || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));
const nonEmpty = (arr) => arr.filter((s) => s.trim() !== "");
const COMPAT = { kind: "compat" };

function parseSuccess(body, sourceId) {
  const { source, answer, result, sql } = body;
  if (!isObj(source) || source.id !== sourceId || !isStr(source.name)) return null;
  if (!isStr(answer) || !isStr(sql) || !isObj(result)) return null;
  const { columns, rows, returned_row_count: count, truncated } = result;
  if (!Array.isArray(columns) || !Array.isArray(rows) || typeof truncated !== "boolean") return null;
  const colsOk = columns.every((c, i) => isObj(c) && c.index === i && isStr(c.name) && isStr(c.type));
  if (!colsOk || columns.length === 0) return null;
  const rowsOk = rows.every((r) => Array.isArray(r) && r.length === columns.length && r.every(isCell));
  if (!rowsOk || !Number.isInteger(count) || count !== rows.length) return null;
  return {
    kind: "success",
    source: { id: source.id, name: source.name },
    answer,
    columns: columns.map(({ index, name, type }) => ({ index, name, type })),
    rows,
    rowCount: count,
    truncated,
    sql,
  };
}

function parseClarification(c) {
  if (!isObj(c)) return null;
  const message = c.message === null || c.message === undefined ? null : c.message;
  if (message !== null && !isStr(message)) return null;
  if (!isStrArr(c.questions) || !isStrArr(c.possible_interpretations)) return null;
  const questions = nonEmpty(c.questions);
  const interpretations = nonEmpty(c.possible_interpretations);
  const msg = message && message.trim() ? message : null;
  if (!msg && !questions.length && !interpretations.length) return null;
  return { kind: "clarification", message: msg, questions, interpretations };
}

function parseUnsupported(e) {
  if (!isObj(e) || !UNSUPPORTED_CODES.includes(e.code) || !isStr(e.message) || !e.message.trim()) return null;
  const mr = e.missing_requirements === undefined ? [] : e.missing_requirements;
  if (!isStrArr(mr)) return null;
  return { kind: "unsupported", code: e.code, message: e.message, missingRequirements: nonEmpty(mr) };
}

export function parseQueryResponse(body, { sessionId, sourceId }) {
  if (!isObj(body) || body.schema_version !== "1" || body.session_id !== sessionId) return COMPAT;
  switch (body.outcome) {
    case "success":
      return parseSuccess(body, sourceId) || COMPAT;
    case "clarification_needed":
      return parseClarification(body.clarification) || COMPAT;
    case "unsupported":
      return parseUnsupported(body.error) || COMPAT;
    case "error":
      return isObj(body.error) && body.error.code === "ANALYSIS_FAILED" ? { kind: "domainError" } : COMPAT;
    default:
      return COMPAT;
  }
}

export function classifyResponse(res, ctx) {
  const s = res.status;
  if (s === 200) return parseQueryResponse(res.body, ctx);
  if (s === 403) return { kind: "forbidden" };
  if (s === 422) return { kind: "invalid" };
  if (s === 429) return { kind: "rateLimited", retryAfter: res.retryAfter };
  if (s >= 500) return { kind: "unavailable" };
  return COMPAT;
}

const isPostgres = (t) => isStr(t) && ["postgresql", "postgres"].includes(t.toLowerCase());

export const pickSources = (list) =>
  list.filter(isObj).map(({ id, name, is_active, type }) => ({ id, name, is_active, type }));

export function evaluateSources(body) {
  if (!Array.isArray(body)) return { status: "error", source: null };
  const active = pickSources(body).filter((s) => s.is_active === true);
  if (active.length > 1) return { status: "multiple", source: null };
  const [only] = active;
  if (only && isPostgres(only.type) && (isStr(only.id) || Number.isInteger(only.id)) && isStr(only.name)) {
    return { status: "ready", source: only };
  }
  return { status: "none", source: null };
}

export function validIdentity(b) {
  return isObj(b) && (isStr(b.id) || Number.isInteger(b.id)) && isStr(b.email);
}
