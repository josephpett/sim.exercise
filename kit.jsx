// SHARED KIT — store, helpers, and UI primitives

const { createContext, useContext, useEffect, useMemo, useRef, useState } = React;

const StoreCtx = createContext(null);
const LS = {
  scenario: 'sx.scenario.v1',
  events: 'sx.events.v1',
  me: 'sx.me.v1',
};

function lsGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch {}
}
function lsRemove(key) {
  try { window.localStorage.removeItem(key); } catch {}
}

function safeJSONParse(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}

function decodeAccessToken(raw) {
  if (!raw) return null;
  try {
    const [payloadB64, sig] = raw.split('.');
    if (!payloadB64 || !sig) return null;
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json);
    if (!payload.role || !payload.teamId) return null;
    const expectedSig = btoa(`${payload.role}:${payload.teamId}:${payload.seat || 'eoc_lead'}`).replace(/=/g, '');
    if (sig !== expectedSig) return null;
    return payload;
  } catch {
    return null;
  }
}

const scenarioLibrarySeed = [
  {
    id: 'lib-1',
    name: 'Cross-Border Outbreak Coordination Exercise',
    provenance: 'Starter Pack · WHO SimEx style',
    type: 'Functional',
    framework: 'WHO Simulation Exercise Framework (SimEx)',
    concept: 'A rapidly evolving multi-country respiratory outbreak requires synchronized surveillance, risk communication, and operations coordination.',
  },
  {
    id: 'lib-2',
    name: 'Heatwave Mass Casualty Surge',
    provenance: 'Starter Pack · Regional adaptation',
    type: 'Tabletop',
    framework: 'NHS England EPRR-aligned',
    concept: 'Extreme heat drives simultaneous ED surge, ambulance delays, and care-home support requests.',
  },
  {
    id: 'lib-3',
    name: 'Cyclone + Cholera Compound Emergency',
    provenance: 'Starter Pack · OCHA style',
    type: 'Functional',
    framework: 'OCHA multi-cluster coordination',
    concept: 'Storm damage and displacement create WASH pressure and cross-border humanitarian coordination demands.',
  },
];

const baseScenario = {
  ...scenarioLibrarySeed[0],
  phases: [
    { id: 'p1', name: 'Detection', start: 0, hue: 195 },
    { id: 'p2', name: 'Escalation', start: 900, hue: 25 },
    { id: 'p3', name: 'Response', start: 2100, hue: 65 },
    { id: 'p4', name: 'Recovery', start: 3300, hue: 145 },
  ],
  teams: [
    { id: 't1', name: 'Surveillance Unit', lead: 'Dr. Mensah', hue: 195 },
    { id: 't2', name: 'Operations Cell', lead: 'A. Patel', hue: 25 },
    { id: 't3', name: 'Risk Comms Team', lead: 'L. Chen', hue: 280 },
    { id: 't4', name: 'Border Health', lead: 'R. Alvarez', hue: 145 },
  ],
  capabilities: ['Surveillance', 'Incident Mgmt', 'Lab', 'Risk Communication', 'Border Health', 'Logistics'],
  objectives: [
    { id: 'o1', code: 'OBJ-1', text: 'Detect and verify signals within agreed operational timelines.' },
    { id: 'o2', code: 'OBJ-2', text: 'Coordinate multi-sector incident management decisions.' },
    { id: 'o3', code: 'OBJ-3', text: 'Issue clear, timely, and trusted public communication.' },
  ],
  injects: [
    { id: 'i01', ord: 1, phase: 'p1', scheduledT: 120, type: 'scheduled', channel: 'alert', planRefs: ['Border Health SOP §2.1'], title: 'Unusual cluster reported at border district clinic', content: 'District clinic reports 14 cases of severe respiratory illness in 24 hours. Request triage and verification plan.', targets: ['t1', 't4'], caps: ['Surveillance', 'Border Health'], objs: ['o1'] },
    { id: 'i02', ord: 2, phase: 'p1', scheduledT: 420, type: 'scheduled', channel: 'email', planRefs: ['Lab Surge Plan §4.2'], title: 'Laboratory sample transport delay', content: 'Specimen transport is delayed due to weather. Decide interim case classification and notification actions.', targets: ['t1', 't2'], caps: ['Lab', 'Incident Mgmt'], objs: ['o1', 'o2'] },
    { id: 'i03', ord: 3, phase: 'p2', scheduledT: 1080, type: 'scheduled', channel: 'news', planRefs: ['Risk Comms Plan §3.1'], title: 'Media leak and public concern spike', content: 'Unverified social media post claims "new deadly virus". Prepare coordinated public holding statement.', targets: ['t3', 't2'], caps: ['Risk Communication', 'Incident Mgmt'], objs: ['o3'] },
    { id: 'i04', ord: 4, phase: 'p3', scheduledT: 2280, type: 'conditional', channel: 'phone', planRefs: ['Rumour Management SOP §1.3'], rule: { trigger: 'no_ack', onInject: 'i03', byTeam: 't3', thresholdMin: 10 }, title: 'Rumor amplification and hotline surge', content: 'Hotline volume triples following misinformation spread. Adjust rumor management and staffing posture.', targets: ['t3', 't2'], caps: ['Risk Communication', 'Logistics'], objs: ['o2', 'o3'] },
    { id: 'i05', ord: 5, phase: 'p3', scheduledT: 2520, type: 'scheduled', channel: 'dm', planRefs: ['Cross-Border Protocol §7.4'], title: 'Cross-border coordination call request', content: 'Neighboring country requests joint situational brief and protocol alignment for points of entry.', targets: ['t4', 't2'], caps: ['Border Health', 'Incident Mgmt'], objs: ['o2'] },
    { id: 'i06', ord: 6, phase: 'p4', scheduledT: 3420, type: 'scheduled', channel: 'email', planRefs: ['Recovery Plan §5.1'], title: 'Transition to recovery planning', content: 'Case trend stabilizes. Draft transition priorities and lessons capture process for next operational period.', targets: ['t1', 't2', 't3', 't4'], caps: ['Incident Mgmt'], objs: ['o2'] },
  ],
};

function deriveFrom(scenario, events) {
  const sent = [];
  const notes = [];
  const chats = [];
  const evals = {};
  const actions = [];
  const artefacts = [];

  for (const e of events) {
    if (e.type === 'SEND') sent.push({ id: e.injectId, t: e.t });
    else if (e.type === 'NOTE') notes.push({ t: e.t, by: e.by, text: e.text });
    else if (e.type === 'CHAT') chats.push({ t: e.t, teamId: e.teamId, sender: e.sender, text: e.text });
    else if (e.type === 'EVAL') evals[e.injectId] = e.rating;
    else if (e.type === 'ACTION') actions.push(e);
    else if (e.type === 'ARTEFACT') artefacts.push(e);
  }

  return { sent, notes, chats, evals, actions, artefacts };
}

function phaseAt(phases, t) {
  return [...phases].sort((a, b) => a.start - b.start).reduce((acc, p) => t >= p.start ? p : acc, phases[0]);
}

function StoreProvider({ children }) {
  const params = new URLSearchParams(window.location.search);
  const tokenPayload = decodeAccessToken(params.get('access'));
  const seededRole = tokenPayload?.role || params.get('role') || 'facilitator';
  const seededTeam = tokenPayload?.teamId || params.get('team') || 't1';
  const seededSeat = tokenPayload?.seat || params.get('seat') || 'eoc_lead';
  const [scenario, setScenario] = useState(() => safeJSONParse(lsGet(LS.scenario), baseScenario));
  const [scenarioLibrary, setScenarioLibrary] = useState(scenarioLibrarySeed);
  const [state, setState] = useState('idle');
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [events, setEvents] = useState(() => safeJSONParse(lsGet(LS.events), []));
  const [scrubT, setScrubT] = useState(null);
  const [me, setMe] = useState(() => {
    const saved = safeJSONParse(lsGet(LS.me), null);
    if (saved) return saved;
    return { role: seededRole, teamId: seededTeam, seat: seededSeat, name: seededRole === 'facilitator' ? 'Exercise Director' : 'Participant', access: tokenPayload ? 'signed-link' : 'magic-link-mock' };
  });

  const timerRef = useRef(null);
  const derived = useMemo(() => deriveFrom(scenario, events), [scenario, events]);

  useEffect(() => {
    if (state !== 'live') return;
    timerRef.current = setInterval(() => setTime(t => t + speed), 1000);
    return () => clearInterval(timerRef.current);
  }, [state, speed]);

  useEffect(() => { lsSet(LS.scenario, JSON.stringify(scenario)); }, [scenario]);
  useEffect(() => { lsSet(LS.events, JSON.stringify(events)); }, [events]);
  useEffect(() => { lsSet(LS.me, JSON.stringify(me)); }, [me]);

  const pushEvent = (e) => setEvents(prev => [...prev, e]);
  const start = () => { setState('live'); setTime(0); setEvents([]); setScrubT(null); };
  const pause = () => setState('paused');
  const resume = () => setState('live');
  const end = () => setState('ended');

  const sendInject = (injectId) => {
    if (derived.sent.some(s => s.id === injectId)) return;
    pushEvent({ type: 'SEND', injectId, t: time, hash: 'evt-' + (events.length + 1).toString(16) });
  };
  const addNote = (by, text) => pushEvent({ type: 'NOTE', by, text, t: time, hash: 'evt-' + (events.length + 1).toString(16) });
  const chat = (teamId, sender, text) => pushEvent({ type: 'CHAT', teamId, sender, text, t: time, hash: 'evt-' + (events.length + 1).toString(16) });
  const setEval = (injectId, rating) => pushEvent({ type: 'EVAL', injectId, rating, t: time, hash: 'evt-' + (events.length + 1).toString(16) });
  const logAction = (teamId, injectId, actor, text, consulted = '') => pushEvent({ type: 'ACTION', teamId, injectId, actor, text, consulted, t: time, hash: 'evt-' + (events.length + 1).toString(16) });
  const addArtefact = (teamId, injectId, kind, title, body, by) => pushEvent({ type: 'ARTEFACT', teamId, injectId, kind, title, body, by, t: time, hash: 'evt-' + (events.length + 1).toString(16) });

  useEffect(() => {
    if (state !== 'live') return;
    scenario.injects.forEach(i => {
      if (i.type !== 'scheduled') return;
      if (i.scheduledT > time) return;
      if (derived.sent.some(s => s.id === i.id)) return;
      sendInject(i.id);
    });
  }, [state, time, scenario, derived.sent]);

  useEffect(() => {
    if (state !== 'live') return;
    scenario.injects.forEach(i => {
      if (!i.rule || i.rule.trigger !== 'no_ack') return;
      if (derived.sent.some(s => s.id === i.id)) return;
      const source = derived.sent.find(s => s.id === i.rule.onInject);
      if (!source) return;
      const thresholdS = (i.rule.thresholdMin || 0) * 60;
      const acted = derived.actions.some(a => a.injectId === i.rule.onInject && a.teamId === i.rule.byTeam);
      if (!acted && time >= source.t + thresholdS) sendInject(i.id);
    });
  }, [state, time, scenario, derived]);

  const exportEventsJSON = () => JSON.stringify(events, null, 2);
  const exportMELCSV = () => ['ord,title,phase,scheduledT,type,channel,planRefs', ...scenario.injects.map(i => `${i.ord},"${i.title}",${i.phase},${i.scheduledT},${i.type},${i.channel || ''},"${(i.planRefs||[]).join('; ')}"`)].join('\n');
  const forkScenario = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const forked = { ...scenario, id: 'fork-' + Date.now(), name: `${scenario.name} (Fork ${stamp})`, provenance: `Forked from ${scenario.name}` };
    setScenario(forked);
    setScenarioLibrary(s => [{ id: forked.id, name: forked.name, provenance: forked.provenance, type: forked.type, framework: forked.framework, concept: forked.concept }, ...s]);
  };

  const value = {
    scenario, setScenario, scenarioLibrary, setScenarioLibrary,
    state, time, speed, events, scrubT, me,
    setScrubT, setSpeed, setMe,
    start, pause, resume, end,
    sendInject, addNote, chat, setEval, logAction, addArtefact,
    currentPhase: phaseAt(scenario.phases, time), realTime: time,
    derived, derive: deriveFrom,
    exportEventsJSON, exportMELCSV, forkScenario,
    clearSession: () => { lsRemove(LS.events); lsRemove(LS.me); setEvents([]); },
    accessTokenPayload: tokenPayload,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function useStore() { const ctx = useContext(StoreCtx); if (!ctx) throw new Error('useStore must be used within StoreProvider'); return ctx; }

function hueColor(hue, l = 68, c = 0.16) { return `oklch(${l}% ${c} ${hue})`; }
function fmtMMSS(total) { const s = Math.max(0, Math.floor(total)); const m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
const fmtT = fmtMMSS;

function Btn({ children, variant = 'primary', size = 'md', style = {}, ...props }) {
  const sizes = { sm: { padding: '6px 10px', fontSize: 11 }, md: { padding: '8px 12px', fontSize: 12 }, lg: { padding: '10px 16px', fontSize: 13 } };
  const variants = { primary: { background: 'var(--accent)', color: '#fff', border: '1px solid transparent' }, quiet: { background: 'var(--elev)', color: 'var(--t1)', border: '1px solid var(--border)' }, ghost: { background: 'transparent', color: 'var(--t2)', border: '1px solid var(--border)' }, danger: { background: 'var(--red)', color: '#fff', border: '1px solid transparent' } };
  return <button {...props} style={{ borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, ...sizes[size], ...variants[variant], ...style }}>{children}</button>;
}
function Card({ children, active, style = {}, ...props }) { return <div {...props} style={{ background: active ? 'color-mix(in oklch, var(--accent) 7%, var(--surface))' : 'var(--surface)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: 12, ...style }}>{children}</div>; }
function Chip({ children, hue = 195, small = false }) { return <span style={{ display: 'inline-block', fontSize: small ? 10 : 11, padding: small ? '2px 7px' : '3px 9px', borderRadius: 999, color: hueColor(hue), background: `color-mix(in oklch, ${hueColor(hue)} 16%, transparent)`, border: `1px solid color-mix(in oklch, ${hueColor(hue)} 40%, transparent)`, fontWeight: 700 }}>{children}</span>; }
function Mono({ children, color = 'var(--t3)', style = {} }) { return <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color, ...style }}>{children}</span>; }
function Dot({ color = 'var(--t3)', size = 8, pulse = false }) { return <span style={{ width: size, height: size, borderRadius: '50%', display: 'inline-block', background: color, animation: pulse ? 'pulse 1.25s infinite' : 'none' }} />; }
function TeamChip({ team, small = false }) { if (!team) return null; return <Chip hue={team.hue} small={small}>{team.name}</Chip>; }
function Section({ label, right, children }) { return <section><div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>{label}</div><div style={{ marginLeft: 'auto' }}>{right}</div></div>{children}</section>; }
function Empty({ children }) { return <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--t3)', fontSize: 12 }}>{children}</div>; }

if (!window.claude || typeof window.claude.complete !== 'function') {
  window.claude = { ...(window.claude || {}), complete: async () => 'AI summary unavailable in this browser runtime. Use your exercise observations and quantitative stats to complete this section.' };
}

Object.assign(window, { StoreProvider, useStore, hueColor, fmtMMSS, fmtT, Btn, Card, Chip, Mono, Dot, TeamChip, Section, Empty });
