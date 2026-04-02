import pathlib
pathlib.Path(r"e:/StudySync/frontend/src/main.tsx").write_text(r"""
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { RewardProvider } from "./context/RewardContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RewardProvider>
          <App />
        </RewardProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
""".strip() + "\n", encoding="utf-8")
print("main ok")
