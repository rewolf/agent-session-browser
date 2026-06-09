import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { APP_NAME } from "./branding";
import { ProvidersProvider } from "./providersContext";
import "./index.css";

document.title = APP_NAME;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProvidersProvider>
      <App />
    </ProvidersProvider>
  </React.StrictMode>
);
