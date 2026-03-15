import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import App from "./App";
import "./index.css";

const DevConsole = lazy(() => import("./pages/DevConsole"));

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <Router base={base}>
    <Switch>
      <Route path="/dev">
        <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
          <DevConsole />
        </Suspense>
      </Route>
      <Route path="/">
        <App />
      </Route>
      <Route>
        <App />
      </Route>
    </Switch>
  </Router>
);
