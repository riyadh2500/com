import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line
} from "recharts";

// ---- mock data engine -------------------------------------------------

const AGENT_NAMES = [
  "Meridian Yield Router", "Ferrous Arb Bot", "Glasswing Settler",
  "Nightloom Rebalancer", "Coldwater Liquidator", "Sunspur Market Maker",
  "Basalt Credit Agent", "Driftwood Hedger", "Cinder Prediction Agent",
  "Vaultkeep Automator", "Ashgrove RWA Agent", "Hollow Point Sniper",
];

const CATEGORIES = ["DeFi", "RWA", "Prediction", "Credit", "MEV"];

const CATEGORY_COLOR = {
  DeFi: "#4C7EF3",
  RWA: "#7C8CA6",
  Prediction: "#C9974C",
  Credit: "#8B6FC9",
  MEV: "#B25F45",
};

const HOW_IT_WORKS = [
  { title: "Pull", text: "Agent activity is read directly from Rialo's on-chain indexer every few seconds." },
  { title: "Compute", text: "Each transaction is marked success or fail, timed, and priced, then rolled up per agent." },
  { title: "Display", text: "The leaderboard updates live, ranked by whichever metric is currently sorted." },
  { title: "Verify", text: "Every figure traces back to on-chain data \u2014 nothing here is self-reported by agents." },
];

const GLOSSARY = [
  { term: "Volume", def: "Total transactions the agent has executed in the selected time window." },
  { term: "Success rate", def: "Share of transactions that completed without failing or reverting." },
  { term: "Avg speed", def: "Average time from trigger to on-chain confirmation." },
  { term: "Avg cost", def: "Average stake-for-service fee paid per transaction, in the network's base asset." },
];

const AUDIENCE = [
  { title: "Depositors", text: "Compare agents before delegating funds, on a real track record instead of a claim." },
  { title: "Builders", text: "See which automation patterns are actually working on Rialo before designing around them." },
  { title: "Agent developers", text: "A public benchmark to measure your own agent against, and a reason to keep it efficient." },
];

const FAQ = [
  { q: "Is this official Rialo data?", a: "It reads from the same public indexer anyone can query \u2014 this dashboard itself isn't an official Rialo product." },
  { q: "How often does it update?", a: "Every few seconds, on a continuous poll. Nothing here is a periodic snapshot." },
  { q: "Can any agent show up here?", a: "Yes. There's no whitelist or application \u2014 any agent transacting on Rialo appears automatically." },
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeAgent(i) {
  const rand = seededRandom(i * 7919 + 13);
  const baseSuccess = 88 + rand() * 11;
  const baseSpeed = 0.4 + rand() * 2.2;
  const baseCost = 0.002 + rand() * 0.02;
  const baseVolume = Math.round(800 + rand() * 12000);

  const history = Array.from({ length: 24 }, (_, h) => ({
    t: h,
    volume: Math.round(baseVolume / 24 * (0.6 + rand() * 0.8)),
    success: Math.min(100, baseSuccess + (rand() - 0.5) * 6),
  }));

  return {
    id: `agent-${i}`,
    name: AGENT_NAMES[i % AGENT_NAMES.length],
    category: CATEGORIES[i % CATEGORIES.length],
    success: baseSuccess,
    speed: baseSpeed,
    cost: baseCost,
    volume: baseVolume,
    history,
    _rand: rand,
  };
}

function jitter(agent) {
  const r = agent._rand;
  const success = Math.min(100, Math.max(70, agent.success + (r() - 0.5) * 0.8));
  const speed = Math.max(0.1, agent.speed + (r() - 0.5) * 0.08);
  const cost = Math.max(0.0005, agent.cost + (r() - 0.5) * 0.0006);
  const volume = Math.max(0, Math.round(agent.volume + (r() - 0.45) * 40));
  const history = agent.history.slice(1).concat({
    t: agent.history[agent.history.length - 1].t + 1,
    volume: Math.round(volume / 24 * (0.6 + r() * 0.8)),
    success,
  });
  return { ...agent, success, speed, cost, volume, history };
}

// ---- helpers -----------------------------------------------------------

const fmtNum = (n) => new Intl.NumberFormat("en-US").format(Math.round(n));
const fmtPct = (n) => `${n.toFixed(1)}%`;
const fmtSec = (n) => `${n.toFixed(2)}s`;
const fmtCost = (n) => `$${n.toFixed(4)}`;
const fmtTime = (d) =>
  d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

const GREEN = "#22A06B";
const RED = "#E5484D";
const BLUE = "#4C7EF3";

function Delta({ value, goodDir = "up" }) {
  const up = value >= 0;
  const isGood = goodDir === "up" ? up : !up;
  const color = value === 0 ? "#8A93A3" : isGood ? GREEN : RED;
  const arrow = value === 0 ? "" : up ? "\u25B2" : "\u25BC";
  return (
    <span className="mono" style={{ fontSize: 12, color, marginLeft: 8 }}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ---- sparkline -----------------------------------------------------------

function Sparkline({ data, dataKey }) {
  return (
    <div style={{ width: 100, height: 30 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#5B6472"
            strokeWidth={1.25}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- network ticker -----------------------------------------------------------

function NetworkTicker({ data }) {
  return (
    <div style={{ width: "100%", height: 34 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ticker-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.25} />
              <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin - 200", "dataMax + 200"]} />
          <Area type="monotone" dataKey="v" stroke={BLUE} strokeWidth={1.25} fill="url(#ticker-grad)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- main app -----------------------------------------------------------

export default function RialoAgentDashboard() {
  const [agents, setAgents] = useState(() =>
    Array.from({ length: 12 }, (_, i) => makeAgent(i))
  );
  const [sortKey, setSortKey] = useState("volume");
  const [sortDir, setSortDir] = useState("desc");
  const [range, setRange] = useState("24h");
  const [expanded, setExpanded] = useState(null);
  const [epoch, setEpoch] = useState(184203);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [networkHistory, setNetworkHistory] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({ t: i, v: 62000 + Math.sin(i / 3) * 4000 }))
  );
  const [search, setSearch] = useState("");
  const [activeCats, setActiveCats] = useState(() => new Set(CATEGORIES));
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setAgents((prev) => {
        const next = prev.map(jitter);
        const sum = next.reduce((s, a) => s + a.volume, 0);
        setNetworkHistory((h) => h.slice(1).concat({ t: h[h.length - 1].t + 1, v: sum }));
        return next;
      });
      setEpoch((e) => e + 1);
      setLastUpdated(new Date());
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const sorted = useMemo(() => {
    const copy = [...agents];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return copy;
  }, [agents, sortKey, sortDir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter(
      (a) => activeCats.has(a.category) && (!q || a.name.toLowerCase().includes(q))
    );
  }, [sorted, search, activeCats]);

  function toggleCategory(c) {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next.size === 0 ? new Set(CATEGORIES) : next;
    });
  }

  const totals = useMemo(() => {
    const totalVolume = agents.reduce((s, a) => s + a.volume, 0);
    const avgSuccess = agents.reduce((s, a) => s + a.success, 0) / agents.length;
    const avgSpeed = agents.reduce((s, a) => s + a.speed, 0) / agents.length;
    return { totalVolume, avgSuccess, avgSpeed, count: agents.length };
  }, [agents]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const cols = [
    { key: "volume", label: "Volume" },
    { key: "success", label: "Success rate" },
    { key: "speed", label: "Avg speed" },
    { key: "cost", label: "Avg cost" },
  ];

  const stats = [
    { label: "Active agents", value: totals.count, fmt: (v) => v, delta: 1.0, goodDir: "up" },
    { label: "Total volume", value: totals.totalVolume, fmt: fmtNum, delta: 4.8, goodDir: "up" },
    { label: "Avg success rate", value: totals.avgSuccess, fmt: fmtPct, delta: 0.4, goodDir: "up" },
    { label: "Avg execution speed", value: totals.avgSpeed, fmt: fmtSec, delta: -6.2, goodDir: "down" },
  ];

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
        background: "#0A0D12",
        color: "#E8EAED",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        table.leaderboard { border-collapse: collapse; width: 100%; }
        table.leaderboard th { text-align: left; font-weight: 500; font-size: 11px; color: #6B7383; text-transform: uppercase; letter-spacing: 0.06em; padding: 11px 14px; cursor: pointer; user-select: none; white-space: nowrap; }
        table.leaderboard th:hover { color: #E8EAED; }
        table.leaderboard th.num, table.leaderboard td.num { text-align: right; }
        table.leaderboard td { padding: 13px 14px; border-top: 1px solid #171C24; font-size: 13.5px; vertical-align: middle; }
        table.leaderboard tbody tr { cursor: pointer; position: relative; }
        table.leaderboard tbody tr:hover td { background: #0D1119; }
        table.leaderboard tbody tr:hover td:first-child { box-shadow: inset 2px 0 0 #4C7EF3; }
        .range-btn { font-size: 12px; padding: 6px 13px; border: none; background: transparent; color: #6B7383; cursor: pointer; font-family: inherit; border-radius: 5px; }
        .range-btn.active { background: #161C26; color: #E8EAED; }
        .sort-arrow { font-size: 9px; margin-left: 5px; opacity: 0.6; }
        .cat-dot { width: 7px; height: 7px; border-radius: 1px; display: inline-block; margin-right: 7px; flex-shrink: 0; }
        .topbar-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6B7383; }
        .divider { width: 1px; height: 14px; background: #1E242E; }

        .search-wrap { display: flex; align-items: center; gap: 7px; background: #0E1218; border: 1px solid #1E242E; border-radius: 6px; padding: 6px 10px; transition: border-color 0.15s ease; }
        .search-wrap:focus-within { border-color: #3A4454; }
        .search-input { background: transparent; border: none; outline: none; color: #E8EAED; font-size: 12.5px; width: 130px; }
        .search-input::placeholder { color: #4B525E; }
        .search-clear { background: none; border: none; color: #6B7383; cursor: pointer; font-size: 10px; padding: 0; line-height: 1; }
        .search-clear:hover { color: #E8EAED; }

        .cat-filter { display: flex; align-items: center; font-size: 11px; color: #6B7383; background: transparent; border: none; cursor: pointer; font-family: inherit; padding: 5px 7px; border-radius: 5px; transition: background 0.15s ease, color 0.15s ease; }
        .cat-filter:hover { background: #12161D; color: #B7BEC9; }
        .cat-filter.on { color: #B7BEC9; }
        .reset-link { background: none; border: none; color: #4C7EF3; cursor: pointer; font-size: 13px; font-family: inherit; padding: 0; text-decoration: underline; }

        .rank-col { width: 34px; text-align: center !important; }
        .rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .rank-1 { background: rgba(201, 151, 76, 0.18); color: #C9974C; }
        .rank-2 { background: rgba(183, 190, 201, 0.16); color: #B7BEC9; }
        .rank-3 { background: rgba(178, 95, 69, 0.18); color: #B25F45; }

        .faq-item { border-top: 1px solid #171C24; }
        .faq-item:first-child { border-top: none; }
        .faq-q { width: 100%; text-align: left; background: none; border: none; color: #E8EAED; font-family: inherit; font-size: 13px; font-weight: 500; padding: 14px 2px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .faq-q:hover { color: #4C7EF3; }
        .faq-icon { font-size: 12px; color: #6B7383; flex-shrink: 0; transition: transform 0.15s ease; }
        .faq-a { font-size: 12.5px; color: #8A93A3; line-height: 1.6; padding: 0 2px 16px; max-width: 640px; }

        @media (max-width: 720px) {
          .search-input { width: 90px; }
          table.leaderboard th, table.leaderboard td { padding: 10px 8px; font-size: 12.5px; }
          table.leaderboard .cost-col, table.leaderboard .trend-col { display: none; }
        }
      `}</style>

      {/* top bar */}
      <div style={{ borderBottom: "1px solid #171C24", background: "#0D1017", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 26, height: 26, border: "1px solid #2A323E", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
            R
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.04em" }}>RIALO</span>
          <div className="divider" />
          <span style={{ fontSize: 13, color: "#8A93A3" }}>Agent performance</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="topbar-item">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
            Network live
          </div>
          <div className="divider" />
          <div className="topbar-item mono">Epoch {fmtNum(epoch)}</div>
          <div className="divider" />
          <div className="topbar-item mono">Updated {fmtTime(lastUpdated)} UTC</div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px 60px" }}>
        {/* network ticker */}
        <div style={{ marginBottom: 20, background: "#0E1218", border: "1px solid #171C24", borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: "#6B7383", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Network throughput
          </div>
          <NetworkTicker data={networkHistory} />
        </div>

        {/* stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 24 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#0E1218", border: "1px solid #171C24", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: "#6B7383", marginBottom: 8 }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span className="mono" style={{ fontSize: 21, fontWeight: 500 }}>{s.fmt(s.value)}</span>
                <Delta value={s.delta} goodDir={s.goodDir} />
              </div>
            </div>
          ))}
        </div>

        {/* section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Agent leaderboard</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7383" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="search-input mono"
                type="text"
                placeholder="Search agents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {CATEGORIES.map((c) => {
                const on = activeCats.has(c);
                return (
                  <button
                    key={c}
                    className={`cat-filter ${on ? "on" : ""}`}
                    onClick={() => toggleCategory(c)}
                    title={on ? `Hide ${c}` : `Show ${c}`}
                  >
                    <span className="cat-dot" style={{ background: CATEGORY_COLOR[c], opacity: on ? 1 : 0.35 }} />
                    {c}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", border: "1px solid #1E242E", borderRadius: 6, padding: 2 }}>
              {["24h", "7d", "30d"].map((r) => (
                <button
                  key={r}
                  className={`range-btn ${range === r ? "active" : ""}`}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* table */}
        <div style={{ background: "#0E1218", border: "1px solid #171C24", borderRadius: 8, overflow: "hidden" }}>
          <table className="leaderboard">
            <thead>
              <tr>
                <th className="rank-col">#</th>
                <th>Agent</th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className={`num${c.key === "cost" ? " cost-col" : ""}`}
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label}
                    {sortKey === c.key && (
                      <span className="sort-arrow">{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>
                    )}
                  </th>
                ))}
                <th className="num trend-col">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "36px 20px", textAlign: "center", color: "#6B7383", fontSize: 13 }}>
                    No agents match{search ? ` "${search}"` : " the current filters"}.{" "}
                    <button
                      className="reset-link"
                      onClick={() => {
                        setSearch("");
                        setActiveCats(new Set(CATEGORIES));
                      }}
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              )}
              {filtered.map((a, i) => (
                <React.Fragment key={a.id}>
                  <tr onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                    <td className="rank-col mono">
                      {i < 3 ? (
                        <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                      ) : (
                        <span style={{ color: "#4B525E" }}>{i + 1}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className="cat-dot" style={{ background: CATEGORY_COLOR[a.category] }} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{a.name}</div>
                          <div style={{ fontSize: 11, color: "#6B7383" }}>{a.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono num">{fmtNum(a.volume)}</td>
                    <td className="mono num" style={{ color: a.success > 95 ? GREEN : "#E8EAED" }}>
                      {fmtPct(a.success)}
                    </td>
                    <td className="mono num">{fmtSec(a.speed)}</td>
                    <td className="mono num cost-col">{fmtCost(a.cost)}</td>
                    <td className="num trend-col">
                      <Sparkline data={a.history} dataKey="volume" />
                    </td>
                  </tr>
                  {expanded === a.id && (
                    <tr>
                      <td colSpan={7} style={{ background: "#0B0E13", padding: "18px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#6B7383", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Volume, last 24h</div>
                            <div style={{ height: 140 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={a.history}>
                                  <defs>
                                    <linearGradient id={`grad-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={BLUE} stopOpacity={0.3} />
                                      <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <XAxis dataKey="t" hide />
                                  <YAxis hide domain={["auto", "auto"]} />
                                  <Tooltip
                                    contentStyle={{ background: "#12161D", border: "1px solid #232B36", borderRadius: 6, fontSize: 12 }}
                                    labelStyle={{ color: "#8A93A3" }}
                                  />
                                  <Area type="monotone" dataKey="volume" stroke={BLUE} strokeWidth={1.5} fill={`url(#grad-${a.id})`} isAnimationActive={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#6B7383", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Success rate, last 24h</div>
                            <div style={{ height: 140 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={a.history}>
                                  <XAxis dataKey="t" hide />
                                  <YAxis hide domain={[80, 100]} />
                                  <Tooltip
                                    contentStyle={{ background: "#12161D", border: "1px solid #232B36", borderRadius: 6, fontSize: 12 }}
                                    labelStyle={{ color: "#8A93A3" }}
                                  />
                                  <Line type="monotone" dataKey="success" stroke={GREEN} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* about section */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>About this dashboard</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
            <div style={{ background: "#0E1218", border: "1px solid #171C24", borderRadius: 8, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#6B7383", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                The concept
              </div>
              <p style={{ fontSize: 13.5, color: "#B7BEC9", lineHeight: 1.7, margin: 0 }}>
                Rialo's reactive transaction model lets autonomous agents execute financial logic
                directly on-chain{" \u2014 "}market making, rebalancing, liquidation, settlement{" \u2014 "}instead of
                relying on fragile off-chain bots. This dashboard gives builders and the community a
                public, real-time view of how those agents actually perform, so trust is based on
                a visible track record rather than a claim.
              </p>
            </div>

            <div style={{ background: "#0E1218", border: "1px solid #171C24", borderRadius: 8, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#6B7383", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                How it works
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {HOW_IT_WORKS.map((step, i) => (
                  <div key={step.title} style={{ display: "flex", gap: 12 }}>
                    <div
                      className="mono"
                      style={{
                        width: 20, height: 20, borderRadius: 5, border: "1px solid #2A323E",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: "#8A93A3", flexShrink: 0, marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{step.title}</div>
                      <div style={{ fontSize: 12.5, color: "#8A93A3", lineHeight: 1.55 }}>{step.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#6B7383", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            What the numbers mean
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 28 }}>
            {GLOSSARY.map((g) => (
              <div key={g.term} style={{ background: "#0E1218", border: "1px solid #171C24", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{g.term}</div>
                <div style={{ fontSize: 12.5, color: "#8A93A3", lineHeight: 1.55 }}>{g.def}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#6B7383", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Who it's for
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 28 }}>
            {AUDIENCE.map((a) => (
              <div key={a.title} style={{ background: "#0E1218", border: "1px solid #171C24", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: "#8A93A3", lineHeight: 1.55 }}>{a.text}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#6B7383", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            FAQ
          </div>
          <div style={{ background: "#0E1218", border: "1px solid #171C24", borderRadius: 8, padding: "2px 18px" }}>
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="faq-item">
                  <button className="faq-q" onClick={() => setOpenFaq(open ? null : i)}>
                    {f.q}
                    <span className="faq-icon" style={{ transform: open ? "rotate(45deg)" : "none" }}>+</span>
                  </button>
                  {open && <div className="faq-a">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: "#4B525E" }}>
          Mock data for prototyping{" \u00b7 "}connect the Rialo indexer to go live.
        </div>
      </div>
    </div>
  );
}
