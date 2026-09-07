import {
  Activity,
  Database,
  GitBranch,
  ListTree,
  Repeat2,
  ServerCog,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  testid: string;
}

/** Single source of truth for navigation — sidebar, compact nav and routes agree. */
export const PLATFORM_NAV: NavItem[] = [
  { to: "/", label: "Overview", short: "Overview", icon: Activity, testid: "nav-item-overview" },
  {
    to: "/pipeline",
    label: "Pipeline Explorer",
    short: "Pipeline",
    icon: GitBranch,
    testid: "nav-item-pipeline-explorer",
  },
  {
    to: "/traces",
    label: "Request Traces",
    short: "Traces",
    icon: ListTree,
    testid: "nav-item-request-traces",
  },
  {
    to: "/sql",
    label: "SQL Execution",
    short: "SQL",
    icon: Database,
    testid: "nav-item-sql-execution",
  },
  {
    to: "/llm",
    label: "LLM Usage & Cost",
    short: "LLM",
    icon: Sparkles,
    testid: "nav-item-llm-usage",
  },
  {
    to: "/errors",
    label: "AI Errors",
    short: "Errors",
    icon: TriangleAlert,
    testid: "nav-item-ai-errors",
  },
  {
    to: "/endpoints",
    label: "HTTP Endpoints",
    short: "Endpoints",
    icon: ServerCog,
    testid: "nav-item-http-endpoints",
  },
  {
    to: "/retries",
    label: "Retries & Attempts",
    short: "Retries",
    icon: Repeat2,
    testid: "nav-item-retries",
  },
  {
    to: "/alerts",
    label: "Alerts",
    short: "Alerts",
    icon: ShieldAlert,
    testid: "nav-item-alerts",
  },
];
