import "./style.css";
import { mountApp } from "./app";

const root = document.querySelector("#app");
if (!root) throw new Error("No se encontró #app");
mountApp(root as HTMLElement);
