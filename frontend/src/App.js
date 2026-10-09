import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import AuthPlaceholder from "./pages/AuthPlaceholder";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPlaceholder mode="signin" />} />
        <Route path="/signup" element={<AuthPlaceholder mode="signup" />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
