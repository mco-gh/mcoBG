import { useState, useCallback } from "react";
import { allTests, categories } from "../tests";
import type { TestResult } from "../tests";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FlaskConical,
} from "lucide-react";

type Status = TestResult["status"];

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    case "fail":
      return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    case "running":
      return <Loader2 className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />;
    default:
      return <Circle className="w-4 h-4 text-slate-600 shrink-0" />;
  }
}

function leftBorder(status: Status) {
  switch (status) {
    case "pass": return "border-l-2 border-l-emerald-500";
    case "fail": return "border-l-2 border-l-red-500";
    case "running": return "border-l-2 border-l-amber-400";
    default: return "border-l-2 border-l-transparent";
  }
}

function statusLabel(status: Status) {
  switch (status) {
    case "pass": return <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">PASS</span>;
    case "fail": return <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">FAIL</span>;
    case "running": return <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">RUN</span>;
    default: return <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">—</span>;
  }
}

export default function TestDashboard() {
  const [results, setResults] = useState<Record<string, TestResult>>(() =>
    Object.fromEntries(
      allTests.map((t) => [t.id, { id: t.id, name: t.name, category: t.category, status: "pending" as Status }])
    )
  );
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const updateResult = useCallback((id: string, update: Partial<TestResult>) => {
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }, []);

  const runTests = useCallback(
    async (testIds: string[]) => {
      setIsRunning(true);
      for (const id of testIds) {
        updateResult(id, { status: "pending", error: undefined, duration: undefined });
      }
      for (const id of testIds) {
        const test = allTests.find((t) => t.id === id);
        if (!test) continue;
        updateResult(id, { status: "running" });
        const start = performance.now();
        try {
          await test.fn();
          updateResult(id, { status: "pass", duration: Math.round(performance.now() - start) });
        } catch (e) {
          updateResult(id, {
            status: "fail",
            error: e instanceof Error ? e.message : String(e),
            duration: Math.round(performance.now() - start),
          });
        }
      }
      setIsRunning(false);
    },
    [updateResult]
  );

  const runAll = useCallback(() => runTests(allTests.map((t) => t.id)), [runTests]);

  const runCategory = useCallback(
    (cat: string) => runTests(allTests.filter((t) => t.category === cat).map((t) => t.id)),
    [runTests]
  );

  const resetAll = useCallback(() => {
    setResults(
      Object.fromEntries(
        allTests.map((t) => [t.id, { id: t.id, name: t.name, category: t.category, status: "pending" as Status }])
      )
    );
    setExpandedErrors(new Set());
  }, []);

  const toggleError = useCallback((id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const resultList = Object.values(results);
  const passed = resultList.filter((r) => r.status === "pass").length;
  const failed = resultList.filter((r) => r.status === "fail").length;
  const running = resultList.filter((r) => r.status === "running").length;
  const pending = resultList.filter((r) => r.status === "pending").length;
  const total = resultList.length;
  const done = passed + failed;

  const filteredTests =
    selectedCategory === "All" ? allTests : allTests.filter((t) => t.category === selectedCategory);

  const grouped = filteredTests.reduce<Record<string, typeof allTests>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const progressPct = total > 0 ? (passed / total) * 100 : 0;
  const allDone = done === total && total > 0 && !isRunning;

  return (
    <div className="min-h-screen bg-[#080812] text-[#c8c0b8] font-mono flex flex-col">
      {/* Header */}
      <div className="border-b border-[#1e1e30] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-amber-500" />
          <div>
            <h1 className="text-base font-bold text-white leading-none">Test Dashboard</h1>
            <p className="text-[11px] text-[#555] mt-0.5">mcoBG — {total} tests across {categories.length} suites</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a40] hover:border-[#444] text-[#888] hover:text-white disabled:opacity-40 rounded-lg text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={runAll}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Running…" : "Run All"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-6 py-4 grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Total", value: total, color: "text-white", bg: "bg-[#0f0f1e]" },
          { label: "Passed", value: passed, color: "text-emerald-400", bg: "bg-emerald-950/30" },
          { label: "Failed", value: failed, color: "text-red-400", bg: "bg-red-950/30" },
          { label: "Pending", value: pending + running, color: "text-slate-500", bg: "bg-[#0f0f1e]" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-[#1e1e30] rounded-xl p-3 text-center`}>
            <div className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#555] mt-1 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-4 shrink-0">
        <div className="h-1.5 bg-[#1a1a2a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${failed > 0 && done === total ? "bg-red-500" : allDone ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-[#444]">
          <span>{done}/{total} complete</span>
          {allDone && (
            <span className={failed > 0 ? "text-red-400" : "text-emerald-400"}>
              {failed > 0 ? `${failed} failed` : "All tests passed!"}
            </span>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-6 pb-3 flex flex-wrap gap-1.5 shrink-0">
        {["All", ...categories].map((cat) => {
          const catTests = cat === "All" ? allTests : allTests.filter((t) => t.category === cat);
          const catPassed = catTests.filter((t) => results[t.id]?.status === "pass").length;
          const catFailed = catTests.filter((t) => results[t.id]?.status === "fail").length;
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                active
                  ? "bg-amber-600 text-white"
                  : "bg-[#0f0f1e] border border-[#1e1e30] text-[#777] hover:text-white"
              }`}
            >
              {cat}
              {catFailed > 0 && <span className="text-red-400 font-bold">{catFailed}✗</span>}
              {catPassed > 0 && catFailed === 0 && <span className="text-emerald-400">{catPassed}✓</span>}
            </button>
          );
        })}
      </div>

      {/* Test groups */}
      <div className="px-6 pb-10 flex-1 overflow-y-auto space-y-4">
        {Object.entries(grouped).map(([cat, tests]) => {
          const catPassed = tests.filter((t) => results[t.id]?.status === "pass").length;
          const catFailed = tests.filter((t) => results[t.id]?.status === "fail").length;
          return (
            <div key={cat} className="bg-[#0c0c1a] border border-[#1a1a2c] rounded-xl overflow-hidden">
              {/* Suite header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f20] border-b border-[#1a1a2c]">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-[#888] uppercase tracking-widest">{cat}</span>
                  <span className="text-[11px] text-[#555]">{tests.length} tests</span>
                  {catPassed > 0 && <span className="text-[11px] text-emerald-500">{catPassed} passed</span>}
                  {catFailed > 0 && <span className="text-[11px] text-red-400">{catFailed} failed</span>}
                </div>
                <button
                  onClick={() => runCategory(cat)}
                  disabled={isRunning}
                  className="flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-400 disabled:opacity-40 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Run suite
                </button>
              </div>

              {/* Tests */}
              <div className="divide-y divide-[#131320]">
                {tests.map((test) => {
                  const result = results[test.id];
                  const isExpanded = expandedErrors.has(test.id);
                  return (
                    <div key={test.id} className={`px-4 py-2.5 ${leftBorder(result.status)}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusIcon status={result.status} />
                        <span className="flex-1 text-sm text-[#bbb] truncate">{test.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusLabel(result.status)}
                          {result.duration !== undefined && (
                            <span className="text-[10px] text-[#444] tabular-nums w-12 text-right">
                              {result.duration}ms
                            </span>
                          )}
                          {result.status === "fail" && (
                            <button
                              onClick={() => toggleError(test.id)}
                              className="text-[#444] hover:text-[#888] transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      {result.error && isExpanded && (
                        <div className="mt-2 ml-7 text-xs text-red-300 bg-red-950/20 border border-red-900/30 rounded-lg p-2.5 break-all leading-relaxed">
                          {result.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
