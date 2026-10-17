// Single immutable fixture module. All numbers on the page derive from these rows.
// Frozen sample snapshot: 7 October 2026. Never read the runtime clock.

export const SNAPSHOT_LABEL = "7 Oct 2026";
export const SOURCE = Object.freeze({
  id: "sales-sample",
  label: "Sales sample · PostgreSQL",
  shortLabel: "Sales sample",
  workspace: "Company A",
  otherWorkspace: "Company B",
});
export const SCHEMA = Object.freeze({
  revenue_records: ["order_id", "order_date", "customer_id", "region", "category", "net_revenue", "cogs"],
  customers: ["customer_id", "customer_name"],
});
export const DEMO_LABEL = "Illustrative demo · sample data";
export const SQL_LABEL = "Illustrative SQL · not executed";

const k = (n) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n) / 1000)}k`;
const signedK = (n) => `${n < 0 ? "−" : "+"}$${Math.round(Math.abs(n) / 1000)}k`;
const money = (n) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US")}`;
const pct = (r, d = 1) => `${r < 0 ? "−" : "+"}${(Math.abs(r) * 100).toFixed(d)}%`;
const ratio = (num, den) => (den === 0 ? null : num / den);
const pctOrUndefined = (r, d = 1, signed = true) =>
  r === null ? "Not defined" : signed ? pct(r, d) : `${(r * 100).toFixed(d)}%`;

export const fmt = { k, signedK, money, pct, pctOrUndefined };

/* ---------------- Regional growth ---------------- */
const regionalRows = [
  { id: "west", label: "West", q2: 800000, q3: 1020000 },
  { id: "north", label: "North", q2: 700000, q3: 820000 },
  { id: "south", label: "South", q2: 700000, q3: 790000 },
  { id: "east", label: "East", q2: 600000, q3: 570000 },
];
const regionalTotal = regionalRows.reduce(
  (a, r) => ({ q2: a.q2 + r.q2, q3: a.q3 + r.q3 }),
  { q2: 0, q3: 0 }
);
const regionalChange = regionalTotal.q3 - regionalTotal.q2;
const regionalComputed = regionalRows
  .map((r) => {
    const change = r.q3 - r.q2;
    return {
      ...r,
      change,
      growth: ratio(change, r.q2),
      contribution: ratio(change, regionalChange),
    };
  })
  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
const west = regionalComputed.find((r) => r.id === "west");
const east = regionalComputed.find((r) => r.id === "east");

export const regionalFixture = Object.freeze({
  id: "regional-growth",
  shortName: "Regional",
  question: "Which region drove our growth last quarter?",
  questionPhrases: ["region", "growth", "last quarter"],
  assumption: "Growth means net revenue in this example.",
  periods: { current: "Q3 2026", prior: "Q2 2026" },
  dateRanges: { prior: "[2026-04-01, 2026-07-01)", current: "[2026-07-01, 2026-10-01)" },
  interpretation: [
    { id: "metric", label: "Metric", value: "Net revenue" },
    { id: "dimension", label: "Dimension", value: "Region" },
    { id: "time", label: "Time", value: "Q3 2026" },
    { id: "compare", label: "Compare", value: "Q2 2026 · contribution to total change" },
  ],
  fields: ["order_date", "region", "net_revenue"],
  relationship: null,
  rows: regionalComputed,
  total: { ...regionalTotal, change: regionalChange, growth: ratio(regionalChange, regionalTotal.q2) },
  chart: {
    type: "signed-bars",
    domain: [-50, 250],
    ticks: [-50, 0, 100, 200, 250],
    axisTitle: "Contribution to revenue change ($k)",
    emphasisId: "west",
  },
  answer: `West contributed ${k(west.change)} of the ${k(regionalChange)} increase — ${(west.contribution * 100).toFixed(0)}% of total revenue growth.`,
  supporting: `East declined by ${k(Math.abs(east.change))}, partially offsetting growth elsewhere.`,
  definition: `West's own growth rate was ${(west.growth * 100).toFixed(1)}%. Its contribution to the company's total increase was ${(west.contribution * 100).toFixed(0)}%. These answer different questions.`,
  note: "Contribution = regional change ÷ total change.",
  scope: "This comparison shows which region contributed most to the change. It does not establish why West grew.",
  calculation: [
    { id: "sum", label: "Sum net revenue per region for Q2 and Q3", inputs: ["q2", "q3"], output: "change" },
    { id: "delta", label: `Regional change = Q3 − Q2 (total ${signedK(regionalChange)})`, inputs: ["change"], output: "change" },
    { id: "share", label: `Contribution = regional change ÷ ${signedK(regionalChange)} total change`, inputs: ["change"], output: "contribution" },
  ],
  queryConcepts: ["Date range", "Group by region + quarter", "Sum net revenue"],
  sql: `-- Preview of the aggregation, not the complete contribution calculation
select region,
       date_trunc('quarter', order_date) as quarter,
       sum(net_revenue)                   as net_revenue
from   revenue_records
where  order_date >= date '2026-04-01'   -- Q2 start, inclusive
and    order_date <  date '2026-10-01'   -- Q3 end, exclusive
group  by region, quarter;`,
  sqlCaption: "Preview of the aggregation, not the complete contribution calculation",
});

/* ---------------- Customer decline ---------------- */
const customerRows = [
  { id: "aster", label: "Aster", months: [120000, 108000, 97000] },
  { id: "beacon", label: "Beacon", months: [90000, 95000, 91000] },
  { id: "cedar", label: "Cedar", months: [80000, 75000, 70000] },
].map((r) => ({
  ...r,
  declines: [r.months[1] < r.months[0], r.months[2] < r.months[1]],
  matches: r.months[1] < r.months[0] && r.months[2] < r.months[1],
}));
const decliningNames = customerRows.filter((r) => r.matches).map((r) => r.label);

export const customerFixture = Object.freeze({
  id: "customer-decline",
  shortName: "Customer",
  question: "Which customers are declining month over month?",
  assumption: "Declining = August below July and September below August.",
  monthLabels: ["July 2026", "August 2026", "September 2026"],
  monthShort: ["Jul", "Aug", "Sep"],
  interpretation: [
    { id: "metric", label: "Metric", value: "Net revenue" },
    { id: "dimension", label: "Dimension", value: "Customer" },
    { id: "time", label: "Time", value: "Jul–Sep 2026" },
    { id: "compare", label: "Compare", value: "Two consecutive month-to-month declines" },
  ],
  fields: ["order_date", "customer_id", "net_revenue"],
  joinFields: ["customer_name"],
  relationship: "revenue_records.customer_id → customers.customer_id",
  rows: customerRows,
  chart: { type: "trend-table", domain: [0, 130], emphasisIds: decliningNames.map((n) => n.toLowerCase()) },
  answer: `${decliningNames.join(" and ")} declined in both month-to-month comparisons.`,
  supporting: "Three sample customers shown. Missing months are not treated as zero.",
  definition: "Declining = August below July and September below August.",
  note: "Three sample customers shown. Missing months are not treated as zero.",
  scope: "A three-customer subset is shown. It does not establish that these are the only declining customers or why they declined.",
  calculation: [
    { id: "sum", label: "Sum net revenue by customer and month", inputs: ["months"], output: "months" },
    { id: "cmp1", label: "Compare August with July", inputs: ["months"], output: "declines" },
    { id: "cmp2", label: "Compare September with August", inputs: ["months"], output: "declines" },
  ],
  queryConcepts: ["Three months", "Join customers", "Sum by customer + month"],
  sql: `select c.customer_name,
       date_trunc('month', r.order_date) as month,
       sum(r.net_revenue)                as net_revenue
from   revenue_records r
join   customers c on c.customer_id = r.customer_id
where  r.order_date >= date '2026-07-01'   -- July, inclusive
and    r.order_date <  date '2026-10-01'   -- end of September, exclusive
group  by c.customer_name, month;
-- July, August and September sums are then compared per customer.`,
  sqlCaption: "Customer-month sums, then two explicit comparisons",
});

/* ---------------- Weekly change ---------------- */
const weeklyRows = [
  { id: "mon", label: "Monday", prior: 90000, current: 95000 },
  { id: "tue", label: "Tuesday", prior: 100000, current: 110000 },
  { id: "wed", label: "Wednesday", prior: 90000, current: 95000 },
].map((r) => ({ ...r, change: r.current - r.prior }));
const weeklyTotal = weeklyRows.reduce(
  (a, r) => ({ prior: a.prior + r.prior, current: a.current + r.current }),
  { prior: 0, current: 0 }
);
weeklyTotal.change = weeklyTotal.current - weeklyTotal.prior;
weeklyTotal.growth = ratio(weeklyTotal.change, weeklyTotal.prior);

export const weeklyFixture = Object.freeze({
  id: "weekly-change",
  shortName: "Weekly",
  question: "What changed in revenue this week?",
  assumption: "Monday–Wednesday compared with the prior Monday–Wednesday.",
  periods: { current: "Oct 5–7", prior: "Sep 28–30" },
  interpretation: [
    { id: "metric", label: "Metric", value: "Net revenue" },
    { id: "dimension", label: "Dimension", value: "Day" },
    { id: "time", label: "Time", value: "Oct 5–7, 2026" },
    { id: "compare", label: "Compare", value: "Same weekdays, Sep 28–30" },
  ],
  fields: ["order_date", "net_revenue"],
  relationship: null,
  rows: weeklyRows,
  total: weeklyTotal,
  chart: { type: "paired-bars", domain: [0, 120] },
  answer: `Revenue is up ${k(weeklyTotal.change)} (${pct(weeklyTotal.growth)}) across the same three weekdays.`,
  supporting: `Sample snapshot: ${SNAPSHOT_LABEL}. Monday–Wednesday compared with the prior Monday–Wednesday.`,
  definition: "Only matched weekdays are compared. A partial week is never compared with a whole week.",
  note: `Sample snapshot: ${SNAPSHOT_LABEL}. Monday–Wednesday compared with the prior Monday–Wednesday.`,
  scope: "Three matched weekdays are compared. This is not a full-week result and does not explain why revenue changed.",
  calculation: [
    { id: "align", label: "Align Monday–Wednesday with the prior Monday–Wednesday", inputs: ["prior", "current"], output: "change" },
    { id: "daily", label: "Daily change = current − prior", inputs: ["prior", "current"], output: "change" },
    { id: "total", label: `Total ${k(weeklyTotal.prior)} → ${k(weeklyTotal.current)}, ${signedK(weeklyTotal.change)} (${pct(weeklyTotal.growth)})`, inputs: ["change"], output: "total" },
  ],
  queryConcepts: ["Two 3-day windows", "Match weekday", "Sum net revenue"],
  sql: `select case when order_date >= date '2026-10-05' then 'current' else 'prior' end as period,
       extract(isodow from order_date) as weekday,
       sum(net_revenue)                as net_revenue
from   revenue_records
where  (order_date >= date '2026-09-28' and order_date < date '2026-10-01')   -- prior Mon–Wed
or     (order_date >= date '2026-10-05' and order_date < date '2026-10-08')   -- current Mon–Wed
group  by period, weekday;`,
  sqlCaption: "Two three-day windows, grouped by matched weekday",
});

/* ---------------- Margin loss ---------------- */
const marginRows = [
  { id: "hardware", label: "Hardware", q2: { rev: 1000000, cost: 600000 }, q3: { rev: 1200000, cost: 768000 } },
  { id: "software", label: "Software", q2: { rev: 1000000, cost: 300000 }, q3: { rev: 1100000, cost: 330000 } },
  { id: "services", label: "Services", q2: { rev: 800000, cost: 480000 }, q3: { rev: 900000, cost: 540000 } },
].map((r) => {
  const m2 = ratio(r.q2.rev - r.q2.cost, r.q2.rev);
  const m3 = ratio(r.q3.rev - r.q3.cost, r.q3.rev);
  return { ...r, m2, m3, pp: m2 === null || m3 === null ? null : (m3 - m2) * 100 };
});
const hardware = marginRows.find((r) => r.id === "hardware");
const marginAgg = marginRows.reduce(
  (a, r) => ({ rev2: a.rev2 + r.q2.rev, cost2: a.cost2 + r.q2.cost, rev3: a.rev3 + r.q3.rev, cost3: a.cost3 + r.q3.cost }),
  { rev2: 0, cost2: 0, rev3: 0, cost3: 0 }
);
const ppText = (pp) => (pp === null ? "Not defined" : `${pp < 0 ? "−" : pp > 0 ? "+" : ""}${Math.abs(pp).toFixed(0)} pp`);

export const marginFixture = Object.freeze({
  id: "margin-loss",
  shortName: "Margin",
  question: "Where are we losing margin?",
  assumption: "Gross margin = (total revenue − total cost) / total revenue. Category rates are not averaged.",
  periods: { current: "Q3 2026", prior: "Q2 2026" },
  interpretation: [
    { id: "metric", label: "Metric", value: "Gross margin" },
    { id: "dimension", label: "Dimension", value: "Product category" },
    { id: "time", label: "Time", value: "Q3 2026" },
    { id: "compare", label: "Compare", value: "Q2 2026 · percentage-point change" },
  ],
  fields: ["order_date", "category", "net_revenue", "cogs"],
  relationship: null,
  rows: marginRows,
  aggregate: {
    m2: ratio(marginAgg.rev2 - marginAgg.cost2, marginAgg.rev2),
    m3: ratio(marginAgg.rev3 - marginAgg.cost3, marginAgg.rev3),
    rev2: marginAgg.rev2,
    rev3: marginAgg.rev3,
  },
  chart: { type: "margin-markers", domain: [0, 100], emphasisId: "hardware" },
  answer: `Hardware gross margin fell from ${(hardware.m2 * 100).toFixed(0)}% to ${(hardware.m3 * 100).toFixed(0)}% — a decline of ${Math.abs(hardware.pp).toFixed(0)} percentage points.`,
  supporting: "Gross margin = (total revenue − total cost) / total revenue. Category rates are not averaged.",
  definition: "Gross margin = (total revenue − total cost) / total revenue. Category rates are not averaged.",
  note: "Gross margin = (total revenue − total cost) / total revenue. Category rates are not averaged.",
  scope: "The example shows where the margin rate fell. It does not establish why Hardware costs changed.",
  calculation: [
    { id: "agg", label: "Sum revenue and cost per category and quarter", inputs: ["q2", "q3"], output: "m3" },
    { id: "rate", label: "Gross margin = (revenue − cost) ÷ revenue", inputs: ["q2", "q3"], output: "m3" },
    { id: "pp", label: "Change = Q3 margin − Q2 margin, in percentage points", inputs: ["m2", "m3"], output: "pp" },
  ],
  queryConcepts: ["Date range", "Group by category + quarter", "Sum revenue and cogs"],
  sql: `select category,
       date_trunc('quarter', order_date) as quarter,
       sum(net_revenue)                   as revenue,
       sum(cogs)                          as cost,
       (sum(net_revenue) - sum(cogs)) / nullif(sum(net_revenue), 0) as gross_margin
from   revenue_records
where  order_date >= date '2026-04-01'   -- Q2 start, inclusive
and    order_date <  date '2026-10-01'   -- Q3 end, exclusive
group  by category, quarter;`,
  sqlCaption: "Sums of revenue and cost per category and quarter; the ratio uses the sums",
  ppText,
});

export const FIXTURES = Object.freeze({
  [regionalFixture.id]: regionalFixture,
  [customerFixture.id]: customerFixture,
  [weeklyFixture.id]: weeklyFixture,
  [marginFixture.id]: marginFixture,
});
export const FIXTURE_ORDER = [regionalFixture.id, customerFixture.id, weeklyFixture.id, marginFixture.id];
export const DEFAULT_EXAMPLE_ID = regionalFixture.id;
