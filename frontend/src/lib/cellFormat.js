const NUMERIC_TYPES = new Set([
  "int2", "int4", "int8", "smallint", "integer", "bigint",
  "numeric", "decimal", "float4", "float8", "real", "double precision",
]);

export const isNumericType = (type) => NUMERIC_TYPES.has(String(type).toLowerCase());
export const isBinaryType = (type) => String(type).toLowerCase() === "bytea";

// Values are rendered from their API representation; no Number/parseFloat conversion of strings.
export function cellText(value) {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  return value;
}

export const LONG_VALUE = 120;
export const LONG_HEADER = 40;
export const isLongValue = (text) => text.length > LONG_VALUE || text.includes("\n");
export const clipValue = (text) => `${text.split("\n")[0].slice(0, 100)}…`;
