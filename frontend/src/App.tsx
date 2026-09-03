import { Routes, Route } from "react-router-dom";
import Overview from "@/pages/Overview";
import PipelineExplorer from "@/pages/PipelineExplorer";
import RequestTraces from "@/pages/RequestTraces";
import SqlExecution from "@/pages/SqlExecution";
import AiErrors from "@/pages/AiErrors";
import HttpEndpoints from "@/pages/HttpEndpoints";
import RetriesAttempts from "@/pages/RetriesAttempts";
import Alerts from "@/pages/Alerts";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
// Routes mirror PLATFORM_NAV in src/components/layout/nav.ts.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/pipeline" element={<PipelineExplorer />} />
      <Route path="/traces" element={<RequestTraces />} />
      <Route path="/sql" element={<SqlExecution />} />
      <Route path="/errors" element={<AiErrors />} />
      <Route path="/endpoints" element={<HttpEndpoints />} />
      <Route path="/retries" element={<RetriesAttempts />} />
      <Route path="/alerts" element={<Alerts />} />
      {/* Any unknown path falls back to the operational summary rather than a blank page. */}
      <Route path="*" element={<Overview />} />
    </Routes>
  );
}
