import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./dev/testBuy";

createRoot(document.getElementById("root")!).render(<App />);
