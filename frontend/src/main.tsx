import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "bootstrap/dist/css/bootstrap-grid.min.css";
import "./App.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
