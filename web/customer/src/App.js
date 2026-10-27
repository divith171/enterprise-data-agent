import "@/styles/datakat.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { RequireAuth } from "@/auth/RequireAuth";
import { StatusProvider } from "@/components/StatusRegion";
import LoginPage from "@/pages/LoginPage";
import WorkspacePage from "@/pages/WorkspacePage";

function App() {
  return (
    <StatusProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/app" element={<RequireAuth><WorkspacePage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </StatusProvider>
  );
}

export default App;
