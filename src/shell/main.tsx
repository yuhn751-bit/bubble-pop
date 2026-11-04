import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameView } from "@/components/game-view";
import "../../shell/fonts/fonts.css";
import "../styles.css";

document.documentElement.dataset.bubbleShell = "offline";

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

const root = document.getElementById("app");
if (!root) throw new Error("missing #app");

createRoot(root).render(
  <StrictMode>
    <GameView />
  </StrictMode>,
);
