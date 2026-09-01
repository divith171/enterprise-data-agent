import { Routes, Route } from "react-router-dom";
import Observability from "@/pages/Observability";
import PipelineExplorer from "@/pages/PipelineExplorer";
import RequestTraces from "@/pages/RequestTraces";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Observability />} />
      <Route path="/explorer" element={<PipelineExplorer />} />
      <Route path="/traces" element={<RequestTraces />} />
    </Routes>
  );
}
