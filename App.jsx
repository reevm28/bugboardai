import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:8080";

function severityDot(sev) {
  if (sev === "P1") return "rgba(255,80,80,0.9)";
  if (sev === "P2") return "rgba(255,180,80,0.9)";
  if (sev === "P3") return "rgba(255,235,120,0.9)";
  return "rgba(140,255,180,0.75)";
}

export default function App() {
  const [rawText, setRawText] = useState(
    "Prod crash when uploading PDF on Safari.\nsteps:\n1) Login\n2) Upload PDF\n3) App crashes"
  );
  const [triage, setTriage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [bugs, setBugs] = useState([]);

  const canSubmit = useMemo(() => rawText.trim().length > 8, [rawText]);

  async function loadBugs() {
    try {
      const res = await fetch(`${API}/bugs`);
      const data = await res.json();
      setBugs(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadBugs();
  }, []);

  async function onTriage() {
    setErr("");
    setLoading(true);
    setTriage(null);

    try {
      const res = await fetch(`${API}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Request failed");
      }

      const saved = await res.json();
      setTriage(saved);
      await loadBugs();
    } catch (e) {
      setErr("Blocked by CORS or backend is not running on :8080. If you see this, we add a CORS config next.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="kicker">AI assisted triage</div>
          <div className="h1 serif">BugBoardAI</div>
          <div className="sub">
            Paste messy bug text. Get a structured report with severity, component, repro steps,
            and suggested fix. Mock AI for now. Real model later.
          </div>
        </div>
        <div className="badge">
          <span className="dot" />
          <span>Backend: {API}</span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="label">Raw bug report</div>
          <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} />
          <div className="row">
            <button onClick={onTriage} disabled={!canSubmit || loading}>
              {loading ? "Triaging..." : "Triage"}
            </button>
            <div className="small">
              Tip: include environment and steps. Example: "Prod crash" + "steps:" will boost output.
            </div>
          </div>
          {err && <div className="small" style={{ marginTop: 10, color: "rgba(255,140,140,0.95)" }}>{err}</div>}
        </div>

        <div className="card">
          <div className="label">Structured result</div>

          {!triage && (
            <div className="small">
              Run triage to generate a structured record. This panel will show title, severity, component,
              environment, repro steps, and fix guidance.
            </div>
          )}

          {triage && (
            <>
              <div className="pill">
                <span className="dot" style={{ background: severityDot(triage.severity) }} />
                <span>{triage.severity}</span>
              </div>
              <div className="pill">{triage.component}</div>
              <div className="pill">{triage.environment}</div>

              <div className="hr" />

              <div className="kv">
                <div className="k">Title</div>
                <div className="v serif">{triage.title}</div>
              </div>

              <div className="kv">
                <div className="k">Repro</div>
                <div className="v" style={{ whiteSpace: "pre-wrap" }}>{triage.reproSteps}</div>
              </div>

              <div className="kv">
                <div className="k">Expected</div>
                <div className="v">{triage.expectedBehavior}</div>
              </div>

              <div className="kv">
                <div className="k">Actual</div>
                <div className="v">{triage.actualBehavior}</div>
              </div>

              <div className="kv">
                <div className="k">Suspected</div>
                <div className="v">{triage.suspectedCause}</div>
              </div>

              <div className="kv" style={{ borderBottom: "none" }}>
                <div className="k">Suggested fix</div>
                <div className="v">{triage.suggestedFix}</div>
              </div>

              <div className="hr" />

              <div className="small">
                confidence: {typeof triage.confidence === "number" ? triage.confidence.toFixed(2) : "n/a"} | needsInfo:{" "}
                {String(triage.needsInfo)}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card list" style={{ marginTop: 14 }}>
        <div className="label">Saved bugs</div>

        {bugs.length === 0 && <div className="small">No records yet. Run triage to create one.</div>}

        {bugs.slice().reverse().map((b) => (
          <div className="item" key={b.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="dot" style={{ background: severityDot(b.severity) }} />
                <div className="serif" style={{ fontSize: 16 }}>{b.title}</div>
              </div>
              <div className="small">{b.component} | {b.environment}</div>
            </div>
            <div className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
              {String(b.rawText).slice(0, 160)}{String(b.rawText).length > 160 ? "..." : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
