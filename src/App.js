import { useState, useEffect } from "react";
import "./App.css";
import { PLANS, DISRUPTIONS, PERSONAS, WEATHER_FORECAST } from "./data";

// ── OFFLINE HOOK ─────────────────────────────────────────────────────────────
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const online = useOnline();
  const [screen, setScreen]     = useState("splash");
  const [worker, setWorker]     = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [disruption, setDisruption] = useState(null);
  const [balance, setBalance]   = useState(0);
  const [history, setHistory]   = useState([]);
  const [queuedClaims, setQueuedClaims] = useState([]);
  const [regData, setRegData]   = useState({});
  const [syncMsg, setSyncMsg]   = useState("");

  // splash timer
  useEffect(() => {
    const saved = localStorage.getItem("gww_worker");
    const t = setTimeout(() => {
      if (saved) { const w = JSON.parse(saved); loginAs(w); }
      else setScreen("landing");
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  // auto-sync queued claims when online
  useEffect(() => {
    if (online && queuedClaims.length > 0) {
      setSyncMsg(`Syncing ${queuedClaims.length} queued claim(s)...`);
      setTimeout(() => {
        const amt = queuedClaims.reduce((a,c) => a + c.amount, 0);
        setBalance(b => b + amt);
        setHistory(h => [...queuedClaims.map(c=>({...c, status:"Paid", synced:true})), ...h]);
        setQueuedClaims([]);
        setSyncMsg(`✓ ${queuedClaims.length} claim(s) processed — ₹${amt} credited`);
        setTimeout(() => setSyncMsg(""), 3000);
      }, 1500);
    }
  }, [online]);

  const loginAs = (w) => {
    setWorker(w);
    setBalance(w.balance);
    setHistory(w.history || []);
    setActiveTab("home");
    setScreen("dashboard");
    localStorage.setItem("gww_worker", JSON.stringify(w));
  };

  const logout = () => {
    setWorker(null); setBalance(0); setHistory([]);
    setQueuedClaims([]); setDisruption(null);
    localStorage.removeItem("gww_worker");
    setScreen("landing");
  };

  const handleClaimResult = (decision) => {
    if (decision === "safe") {
      if (!online) {
        const q = { id:`CLM-Q${Date.now()}`, date:"Mar 19, 2026", type:disruption.label, duration:"pending", amount:disruption.amount, status:"Queued", score:12, time:"queued" };
        setQueuedClaims(c => [...c, q]);
        setScreen("queued");
      } else {
        setBalance(b => b + disruption.amount);
        setHistory(h => [{ id:`CLM-${Date.now()}`, date:"Mar 19, 2026", type:disruption.label, duration:"live", amount:disruption.amount, status:"Paid", score:12, time:"now" }, ...h]);
        setScreen("payout");
      }
    } else if (decision === "medium") {
      setScreen("delayed");
    } else {
      setHistory(h => [{ id:`CLM-${Date.now()}`, date:"Mar 19, 2026", type:disruption.label, duration:"live", amount:0, status:"Blocked", score:worker.signals.reduce((a,s)=>a+s.raw,0), time:"now" }, ...h]);
      setScreen("blocked");
    }
  };

  const go = (s) => setScreen(s);

  return (
    <div className="app">
      {!online && screen === "dashboard" && (
        <div className="offline-bar">📡 Offline — cached data shown. Claims will queue.</div>
      )}
      {syncMsg && <div className="sync-bar">{syncMsg}</div>}

      {screen === "splash"     && <Splash />}
      {screen === "landing"    && <Landing onLogin={() => go("choose")} onRegister={() => go("reg1")} />}
      {screen === "choose"     && <ChooseWorker onSelect={(w) => { setWorker(w); go("login"); }} onBack={() => go("landing")} />}
      {screen === "login"      && worker && <LoginScreen worker={worker} onBack={() => go("choose")} onLogin={() => loginAs(worker)} />}

      {/* REGISTRATION */}
      {screen === "reg1" && <Reg1 onNext={(d) => { setRegData(d); go("reg2"); }} onBack={() => go("landing")} />}
      {screen === "reg2" && <Reg2 data={regData} onNext={(d) => { setRegData({...regData,...d}); go("reg3"); }} onBack={() => go("reg1")} />}
      {screen === "reg3" && <Reg3 onNext={(d) => { setRegData({...regData,...d}); go("reg4"); }} onBack={() => go("reg2")} />}
      {screen === "reg4" && <Reg4 data={regData} onNext={() => go("reg5")} onBack={() => go("reg3")} />}
      {screen === "reg5" && <Reg5 data={regData} onDone={() => { const w = PERSONAS.raju; loginAs(w); }} />}

      {/* DASHBOARD */}
      {screen === "dashboard" && worker && (
        <Dashboard
          worker={worker} balance={balance} history={history}
          disruptions={DISRUPTIONS} activeTab={activeTab}
          setActiveTab={setActiveTab} online={online}
          queuedClaims={queuedClaims}
          onDisruption={(d) => { setDisruption(d); go("claim"); }}
          onLogout={logout}
        />
      )}

      {/* CLAIM FLOW */}
      {screen === "claim"   && worker && disruption && <ClaimScreen disruption={disruption} worker={worker} online={online} onProceed={() => go("fraud")} onBack={() => go("dashboard")} />}
      {screen === "fraud"   && worker && disruption && <FraudAnalysis disruption={disruption} worker={worker} online={online} onResult={handleClaimResult} onBack={() => go("dashboard")} />}
      {screen === "payout"  && worker && disruption && <PayoutScreen disruption={disruption} worker={worker} balance={balance} onDone={() => go("dashboard")} />}
      {screen === "delayed" && worker && disruption && <DelayedScreen disruption={disruption} onDone={() => go("dashboard")} />}
      {screen === "blocked" && worker && <BlockedScreen worker={worker} onDone={() => go("dashboard")} />}
      {screen === "queued"  && disruption && <QueuedScreen disruption={disruption} onDone={() => go("dashboard")} />}
    </div>
  );
}

// ── SPLASH ───────────────────────────────────────────────────────────────────
function Splash() {
  return (
    <div className="screen splash-screen">
      <div className="splash-logo">
        <span className="s-gig">Gig</span>
        <span className="s-weather">Weather</span>
        <span className="s-wage">Wage</span>
      </div>
      <p className="splash-tag">Income protection for every delivery</p>
      <div className="splash-loader"><div className="loader-fill" /></div>
    </div>
  );
}

// ── LANDING ──────────────────────────────────────────────────────────────────
function Landing({ onLogin, onRegister }) {
  return (
    <div className="screen landing-screen">
      <div className="rain-bg">{[...Array(16)].map((_,i)=><div key={i} className="drop" style={{left:`${(i*6.5)%100}%`,animationDelay:`${(i*0.2)%2}s`,animationDuration:`${0.7+(i%4)*0.2}s`}}/>)}</div>
      <div className="landing-inner">
        <div className="lbadge">DEVTrails 2026 · Guidewire Hackathon</div>
        <h1 className="ltitle"><span className="lg">Gig</span><span className="lw">Weather</span><span className="lwa">Wage</span></h1>
        <p className="lsub">When the storm stops your deliveries,<br/>we make sure it doesn't stop your income.</p>
        <div className="lstats">
          <div className="lstat"><span className="lsn">2.8Cr+</span><span className="lsl">Gig workers</span></div>
          <div className="ldiv"/>
          <div className="lstat"><span className="lsn">₹0</span><span className="lsl">Safety net</span></div>
          <div className="ldiv"/>
          <div className="lstat"><span className="lsn">Instant</span><span className="lsl">Payouts</span></div>
        </div>
        <div className="lbtns">
          <button className="btn-primary" onClick={onLogin}>Login →</button>
          <button className="btn-outline" onClick={onRegister}>New Registration</button>
        </div>
        <p className="lfooter">Team Code Alchemists · KL University</p>
      </div>
    </div>
  );
}

// ── CHOOSE WORKER ─────────────────────────────────────────────────────────────
function ChooseWorker({ onSelect, onBack }) {
  return (
    <div className="screen choose-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="ch-header">
        <h2>Select account</h2>
        <p>4 real scenarios — 4 different fraud outcomes</p>
      </div>
      {Object.values(PERSONAS).map(w => (
        <button key={w.id} className="wcard" onClick={() => onSelect(w)}>
          <div className="wcard-top">
            <div className="wavatar" style={{background: w.tagColor==="#22c55e"?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)", color:w.tagColor}}>{w.avatar}</div>
            <div className="winfo">
              <div className="wname">{w.name}</div>
              <div className="wmeta">{w.platform} · {w.city} · {w.age}</div>
            </div>
            <span className="wtag" style={{color:w.tagColor,borderColor:w.tagColor}}>{w.tagColor==="#22c55e"?"✓":"✕"}</span>
          </div>
          <div className="wdesc">{w.description}</div>
          <div className="wscore">Expected: <strong style={{color:w.tagColor}}>{w.expectedScore}</strong></div>
        </button>
      ))}
    </div>
  );
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ worker, onBack, onLogin }) {
  const [loading, setLoading] = useState(false);
  const handle = () => { setLoading(true); setTimeout(() => { setLoading(false); onLogin(); }, 1200); };
  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="fcard">
        <div className="fhead">
          <div className="favatar" style={{background:worker.tagColor==="22c55e"?"rgba(34,197,94,0.15)":"rgba(59,130,246,0.12)"}}>{worker.avatar}</div>
          <h2>{worker.name}</h2>
          <p>{worker.platform} · {worker.city}</p>
        </div>
        <div className="field"><label>Phone</label><input readOnly defaultValue={worker.phone}/></div>
        <div className="field"><label>Password</label><input type="password" readOnly defaultValue="••••••••"/></div>
        <div className="login-tag" style={{borderColor:worker.tagColor,color:worker.tagColor}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:worker.tagColor,display:"inline-block",marginRight:6}}/>
          {worker.tag}
        </div>
        <button className="btn-primary" onClick={handle} disabled={loading}>{loading?"Verifying...":"Login →"}</button>
      </div>
    </div>
  );
}

// ── REGISTRATION ─────────────────────────────────────────────────────────────
function Reg1({ onNext, onBack }) {
  const [d, setD] = useState({name:"",phone:"",city:"Hyderabad",zone:""});
  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="reg-progress"><div className="reg-bar" style={{width:"20%"}}/></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">1 of 5</div><h2>Personal Info</h2><p>Tell us about yourself</p></div>
        <div className="field"><label>Full name</label><input placeholder="e.g. Raju Kumar" value={d.name} onChange={e=>setD({...d,name:e.target.value})}/></div>
        <div className="field"><label>Phone number</label><input placeholder="98765 43210" value={d.phone} onChange={e=>setD({...d,phone:e.target.value})}/></div>
        <div className="field"><label>City</label>
          <select value={d.city} onChange={e=>setD({...d,city:e.target.value})}>
            {["Hyderabad","Bengaluru","Chennai","Mumbai","Delhi","Pune","Kolkata"].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field"><label>Zone / Area</label><input placeholder="e.g. Madhapur" value={d.zone} onChange={e=>setD({...d,zone:e.target.value})}/></div>
        <button className="btn-primary" onClick={()=>onNext(d)} disabled={!d.name||!d.phone}>Next →</button>
      </div>
    </div>
  );
}

function Reg2({ data, onNext, onBack }) {
  const [d, setD] = useState({platform:"Swiggy",partnerId:"",hours:"8-10 hrs/day"});
  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="reg-progress"><div className="reg-bar" style={{width:"40%"}}/></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">2 of 5</div><h2>Work Info</h2><p>Your delivery details</p></div>
        <div className="field"><label>Platform</label>
          <div className="plat-grid">
            {["Swiggy","Zomato","Zepto","Amazon"].map(p=>(
              <button key={p} className={`plat-btn ${d.platform===p?"active":""}`} onClick={()=>setD({...d,platform:p})}>{p}</button>
            ))}
          </div>
        </div>
        <div className="field"><label>Partner ID</label><input placeholder="e.g. SWG-2024-HYD-4521" value={d.partnerId} onChange={e=>setD({...d,partnerId:e.target.value})}/></div>
        <div className="field"><label>Daily working hours</label>
          <select value={d.hours} onChange={e=>setD({...d,hours:e.target.value})}>
            {["4-6 hrs/day","6-8 hrs/day","8-10 hrs/day","10+ hrs/day"].map(h=><option key={h}>{h}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={()=>onNext(d)}>Next →</button>
      </div>
    </div>
  );
}

function Reg3({ onNext, onBack }) {
  const [sel, setSel] = useState("guard");
  return (
    <div className="screen form-screen" style={{paddingTop:16}}>
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="reg-progress"><div className="reg-bar" style={{width:"60%"}}/></div>
      <div style={{marginBottom:12,paddingTop:4}}>
        <div className="step-num" style={{textAlign:"center"}}>3 of 5</div>
        <h2 style={{textAlign:"center",fontFamily:"var(--fd)",fontSize:20,fontWeight:800,margin:"6px 0 4px"}}>Choose Your Plan</h2>
        <p style={{textAlign:"center",color:"var(--muted)",fontSize:13}}>Weekly premium — cancel anytime</p>
      </div>
      <div className="plan-list">
        {PLANS.map(p=>(
          <button key={p.id} className={`plan-card ${sel===p.id?"selected":""}`} style={{"--pc":p.color}} onClick={()=>setSel(p.id)}>
            {p.recommended && <div className="plan-rec">Recommended</div>}
            <div className="plan-top">
              <div>
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">₹{p.price}<span>/week</span></div>
              </div>
              <div className="plan-check">{sel===p.id?"✓":""}</div>
            </div>
            <div className="plan-stats">
              <span>Coverage: ₹{p.coverage.toLocaleString()}</span>
              <span>₹{p.payoutPerHour}/hr</span>
            </div>
            <div className="plan-feats">
              {p.features.map((f,i)=><div key={i} className="plan-feat">✓ {f}</div>)}
            </div>
          </button>
        ))}
      </div>
      <button className="btn-primary" style={{marginTop:12}} onClick={()=>onNext({plan:sel})}>Next →</button>
    </div>
  );
}

function Reg4({ data, onNext, onBack }) {
  const [method, setMethod] = useState("");
  const [paying, setPaying] = useState(false);
  const plan = PLANS.find(p=>p.id===data.plan)||PLANS[1];

  const handleUPI = (app) => {
    setMethod(app);
    setPaying(true);
    if (app === "phonepe") { try { window.open("phonepe://pay","_blank"); } catch(e){} }
    if (app === "gpay")    { try { window.open("tez://upi/pay","_blank"); } catch(e){} }
    setTimeout(() => { setPaying(false); onNext({}); }, 2000);
  };

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="reg-progress"><div className="reg-bar" style={{width:"80%"}}/></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">4 of 5</div><h2>Payment</h2><p>First week premium</p></div>
        <div className="pay-amount-box">
          <div className="pay-plan">{plan.name}</div>
          <div className="pay-amt">₹{plan.price}</div>
          <div className="pay-sub">for first week · auto-renews weekly</div>
        </div>
        {paying ? (
          <div className="paying-state">
            <div className="paying-spinner"/>
            <p>Processing payment via {method}...</p>
          </div>
        ) : (
          <div className="upi-options">
            <button className="upi-btn phonepe" onClick={()=>handleUPI("phonepe")}>
              <span className="upi-icon">💜</span> Pay with PhonePe
            </button>
            <button className="upi-btn gpay" onClick={()=>handleUPI("gpay")}>
              <span className="upi-icon">🔵</span> Pay with Google Pay
            </button>
            <div className="upi-divider"><span>or enter UPI ID</span></div>
            <div className="field" style={{margin:0}}>
              <input placeholder="yourname@upi" />
            </div>
            <button className="btn-primary" style={{marginTop:10}} onClick={()=>handleUPI("upi")}>Pay ₹{plan.price} →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Reg5({ data, onDone }) {
  const plan = PLANS.find(p=>p.id===data.plan)||PLANS[1];
  return (
    <div className="screen form-screen" style={{justifyContent:"center",textAlign:"center"}}>
      <div className="success-ring" style={{margin:"0 auto 20px"}}><div className="check-icon">✓</div></div>
      <h2 style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:800,marginBottom:8}}>Welcome to GigWeatherWage!</h2>
      <p style={{color:"var(--muted)",fontSize:14,marginBottom:24}}>Your income is now protected</p>
      <div className="reg-success-card">
        <div className="detail-row"><span>Name</span><span>{data.name||"Demo User"}</span></div>
        <div className="detail-row"><span>Platform</span><span>{data.platform||"Swiggy"}</span></div>
        <div className="detail-row"><span>Plan</span><span style={{color:plan.color}}>{plan.name}</span></div>
        <div className="detail-row"><span>Coverage</span><span>₹{plan.coverage.toLocaleString()}</span></div>
        <div className="detail-row"><span>Premium</span><span>₹{plan.price}/week</span></div>
        <div className="detail-row"><span>Status</span><span className="safe-badge">Active ✓</span></div>
      </div>
      <button className="btn-primary" style={{marginTop:20}} onClick={onDone}>Go to Dashboard →</button>
    </div>
  );
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ worker, balance, history, disruptions, activeTab, setActiveTab, online, queuedClaims, onDisruption, onLogout }) {
  return (
    <div className="dash-wrap">
      <div className="dash-content">
        {activeTab === "home"     && <HomeTab worker={worker} balance={balance} history={history} disruptions={disruptions} online={online} queuedClaims={queuedClaims} onDisruption={onDisruption} />}
        {activeTab === "claims"   && <ClaimsTab worker={worker} history={history} queuedClaims={queuedClaims} />}
        {activeTab === "payments" && <PaymentsTab worker={worker} balance={balance} history={history} />}
        {activeTab === "alerts"   && <AlertsTab worker={worker} />}
        {activeTab === "profile"  && <ProfileTab worker={worker} balance={balance} history={history} onLogout={onLogout} />}
      </div>
      <nav className="bottom-nav">
        {[
          { id:"home",     icon:"🏠", label:"Home"     },
          { id:"claims",   icon:"📋", label:"Claims"   },
          { id:"payments", icon:"💰", label:"Payments" },
          { id:"alerts",   icon:"🔔", label:"Alerts"   },
          { id:"profile",  icon:"👤", label:"Profile"  },
        ].map(t=>(
          <button key={t.id} className={`nav-btn ${activeTab===t.id?"active":""}`} onClick={()=>setActiveTab(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ worker, balance, history, disruptions, online, queuedClaims, onDisruption }) {
  const plan = PLANS.find(p=>p.id===worker.plan)||PLANS[1];
  return (
    <div className="tab-screen">
      <div className="home-header">
        <div>
          <div className="home-greet">Hey, {worker.name.split(" ")[0]} 👋</div>
          <div className="home-sub">{worker.platform} · {worker.zone}, {worker.city}</div>
        </div>
        <div className="home-status">
          {online ? <span className="online-dot">●</span> : <span className="offline-dot">●</span>}
          <span style={{fontSize:11,color:"var(--muted)"}}>{online?"Live":"Offline"}</span>
        </div>
      </div>

      {!online && (
        <div className="offline-card">
          <div className="offline-icon">📡</div>
          <div>
            <div className="offline-title">Offline Mode Active</div>
            <div className="offline-sub">Claims will queue and sync when connected</div>
          </div>
        </div>
      )}

      {queuedClaims.length > 0 && (
        <div className="queued-card">
          <span>⏳ {queuedClaims.length} claim(s) queued — will sync when online</span>
        </div>
      )}

      <div className="balance-card">
        <div className="bal-top">
          <div>
            <div className="bal-label">Total payouts received</div>
            <div className="bal-amt">₹{balance.toLocaleString()}</div>
          </div>
          <div className="plan-pill" style={{background:`${plan.color}22`,color:plan.color}}>{plan.name}</div>
        </div>
        <div className="bal-bottom">
          <span>₹{plan.price}/week · Active</span>
          <span>Since {worker.since}</span>
        </div>
      </div>

      {worker.alerts && worker.alerts.length > 0 && (
        <div className="alert-banner">
          <span className="alert-icon">⚠️</span>
          <div>
            <div className="alert-title">Live disruption in {worker.zone}</div>
            <div className="alert-sub">{worker.alerts[0].type} · Tap below to claim</div>
          </div>
        </div>
      )}

      <div className="section-title">File a disruption claim</div>
      <div className="dis-grid">
        {disruptions.filter(d => plan.triggers.some(t=>t.toLowerCase().includes(d.id==="rain"?"rain":d.id==="heat"?"heat":d.id==="aqi"?"aqi":"curfew"))||true).map(d=>(
          <button key={d.id} className="dis-card" onClick={()=>onDisruption(d)} style={{"--dc":d.color}}>
            <div className="dis-icon">{d.icon}</div>
            <div className="dis-label">{d.label}</div>
            <div className="dis-val">{d.value}</div>
            <div className="dis-pay">₹{d.amount}</div>
            {!online && <div className="dis-offline">Queues offline</div>}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <div className="section-title">Recent claims</div>
          {history.slice(0,2).map((h,i)=>(
            <div key={i} className="mini-claim">
              <div className="mc-left">
                <div className="mc-type">{h.type}</div>
                <div className="mc-date">{h.date}</div>
              </div>
              <div className="mc-right">
                <div className="mc-amt" style={{color:h.status==="Paid"?"#22c55e":h.status==="Queued"?"#F97316":"#EF4444"}}>
                  {h.status==="Paid"?`+₹${h.amount}`:h.status==="Queued"?"Queued":"Blocked"}
                </div>
                <div className="mc-score">Score: {h.score}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── CLAIMS TAB ────────────────────────────────────────────────────────────────
function ClaimsTab({ worker, history, queuedClaims }) {
  const all = [...queuedClaims.map(q=>({...q,status:"Queued"})), ...history];
  const approved = all.filter(h=>h.status==="Paid").length;
  const total    = all.reduce((a,h)=>a+(h.amount||0),0);

  return (
    <div className="tab-screen">
      <h2 className="tab-title">Claims History</h2>
      <div className="stats-row-sm">
        <div className="stat-sm"><span className="sn">{all.length}</span><span className="sl">Total</span></div>
        <div className="stat-sm"><span className="sn" style={{color:"#22c55e"}}>{approved}</span><span className="sl">Approved</span></div>
        <div className="stat-sm"><span className="sn" style={{color:"#3B82F6"}}>₹{total.toLocaleString()}</span><span className="sl">Received</span></div>
        <div className="stat-sm"><span className="sn">Instant</span><span className="sl">Avg time</span></div>
      </div>

      <div className="auto-flow">
        {["Disruption Detected","Claim Triggered","Fraud Verified","Payout Released"].map((s,i)=>(
          <div key={i} className="flow-step">
            <div className="flow-num">{i+1}</div>
            <div className="flow-label">{s}</div>
            {i<3 && <div className="flow-arrow">→</div>}
          </div>
        ))}
      </div>

      {all.length === 0 && <div className="empty-state">No claims yet. File your first claim from the home tab.</div>}

      <div className="claims-list">
        {all.map((h,i)=>(
          <div key={i} className="claim-item">
            <div className="ci-top">
              <div className="ci-type">{h.type}</div>
              <div className="ci-amt" style={{color:h.status==="Paid"?"#22c55e":h.status==="Queued"?"#F97316":"#EF4444"}}>
                {h.status==="Paid"?`+₹${h.amount}`:h.status==="Queued"?"Queued":"₹0"}
              </div>
            </div>
            <div className="ci-bottom">
              <span>{h.date} · {h.duration}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span className="ci-score">Score: {h.score}</span>
                <span className="ci-status" style={{
                  background:h.status==="Paid"?"rgba(34,197,94,0.12)":h.status==="Queued"?"rgba(249,115,22,0.12)":"rgba(239,68,68,0.12)",
                  color:h.status==="Paid"?"#22c55e":h.status==="Queued"?"#F97316":"#EF4444"
                }}>{h.status}</span>
              </div>
            </div>
            {h.status==="Blocked" && <div className="ci-reason">Fraud detection blocked this claim. Risk score too high.</div>}
            {h.status==="Queued" && <div className="ci-reason" style={{color:"#F97316"}}>Filed offline — will process when network returns.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PAYMENTS TAB ──────────────────────────────────────────────────────────────
function PaymentsTab({ worker, balance, history }) {
  const plan = PLANS.find(p=>p.id===worker.plan)||PLANS[1];
  const totalPremiums = plan.price * 4;
  const netGain = balance - totalPremiums;
  const paid = history.filter(h=>h.status==="Paid");

  const handleUPI = (app) => {
    if (app==="phonepe") { try { window.open("phonepe://pay","_blank"); } catch(e){} }
    if (app==="gpay")    { try { window.open("tez://upi/pay","_blank"); } catch(e){} }
  };

  return (
    <div className="tab-screen">
      <h2 className="tab-title">Payments & Payouts</h2>
      <div className="stats-row-sm">
        <div className="stat-sm"><span className="sn" style={{color:"#22c55e"}}>₹{balance.toLocaleString()}</span><span className="sl">Total payouts</span></div>
        <div className="stat-sm"><span className="sn">₹{totalPremiums}</span><span className="sl">Premiums paid</span></div>
        <div className="stat-sm"><span className="sn" style={{color:"#22c55e"}}>+₹{netGain}</span><span className="sl">Net gain</span></div>
        <div className="stat-sm"><span className="sn">Instant</span><span className="sl">Payout time</span></div>
      </div>

      <div className="section-title">Payment methods</div>
      <div className="pay-methods">
        <button className="pay-method-btn" onClick={()=>handleUPI("phonepe")}>
          <span>💜</span><div><div style={{fontSize:14,fontWeight:600}}>PhonePe</div><div style={{fontSize:11,color:"var(--muted)"}}>rahul@paytm · Primary</div></div>
          <span className="primary-tag">Primary</span>
        </button>
        <button className="pay-method-btn" onClick={()=>handleUPI("gpay")}>
          <span>🔵</span><div><div style={{fontSize:14,fontWeight:600}}>Google Pay</div><div style={{fontSize:11,color:"var(--muted)"}}>****4521</div></div>
        </button>
        <button className="add-method-btn">+ Add Payment Method</button>
      </div>

      <div className="premium-renewal">
        <div className="pr-left">
          <div className="pr-title">Next premium due</div>
          <div className="pr-date">Mar 21, 2026 · ₹{plan.price} auto-debit</div>
        </div>
        <button className="btn-small" onClick={()=>handleUPI("phonepe")}>Pay Now</button>
      </div>

      <div className="section-title">Transaction history</div>
      {paid.length === 0 && <div className="empty-state">No transactions yet.</div>}
      <div className="tx-list">
        {paid.map((h,i)=>(
          <div key={i} className="tx-item">
            <div className="tx-left">
              <div className="tx-type">Claim Payout · {h.type}</div>
              <div className="tx-date">{h.date} · UPI</div>
            </div>
            <div className="tx-amt">+₹{h.amount}</div>
          </div>
        ))}
        {[1,2,3].map(i=>(
          <div key={`p${i}`} className="tx-item">
            <div className="tx-left">
              <div className="tx-type">Premium Payment · {plan.name}</div>
              <div className="tx-date">Mar {21-i*7}, 2026 · PhonePe</div>
            </div>
            <div className="tx-amt" style={{color:"#EF4444"}}>-₹{plan.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ALERTS TAB ────────────────────────────────────────────────────────────────
function AlertsTab({ worker }) {
  return (
    <div className="tab-screen">
      <h2 className="tab-title">Disruption Alerts</h2>
      {worker.alerts && worker.alerts.length > 0 ? (
        <>
          <div className="section-title">Active alerts</div>
          {worker.alerts.map((a,i)=>(
            <div key={i} className="alert-card" style={{borderColor:a.color+"44",background:a.color+"11"}}>
              <div className="ac-top">
                <div className="ac-type" style={{color:a.color}}>{a.type}</div>
                <span className="ac-prob" style={{background:a.color+"22",color:a.color}}>{a.prob}% probability</span>
              </div>
              <div className="ac-zone">📍 {a.zone} · {a.time}</div>
              <div className="ac-note">Automatic claim will trigger if conditions persist</div>
            </div>
          ))}
        </>
      ) : (
        <div className="no-alerts">
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>No active alerts</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>Your zone is clear. We're monitoring 24/7.</div>
        </div>
      )}

      <div className="section-title">5-day forecast</div>
      <div className="forecast-row">
        {WEATHER_FORECAST.map((f,i)=>(
          <div key={i} className={`forecast-card ${f.risk==="HIGH"?"high-risk":""}`}>
            <div className="fc-day">{f.day}</div>
            <div className="fc-icon">{f.icon}</div>
            <div className="fc-temp">{f.temp}</div>
            <div className="fc-rain">{f.rain}</div>
            <div className="fc-aqi" style={{color:f.aqi>200?"#EF4444":f.aqi>100?"#F97316":"#22c55e"}}>AQI {f.aqi}</div>
            {f.risk==="HIGH" && <div className="fc-risk">HIGH</div>}
          </div>
        ))}
      </div>

      <div className="section-title">Zone risk levels</div>
      {[
        {zone:"Madhapur",   risk:"HIGH",   alerts:3, color:"#EF4444"},
        {zone:"Kondapur",   risk:"MEDIUM", alerts:1, color:"#F97316"},
        {zone:"Gachibowli", risk:"LOW",    alerts:0, color:"#22c55e"},
        {zone:"HITEC City", risk:"MEDIUM", alerts:2, color:"#F97316"},
      ].map((z,i)=>(
        <div key={i} className="zone-row">
          <div className="zr-left">
            <span className="zr-dot" style={{background:z.color}}/>
            <div>
              <div className="zr-name">{z.zone}</div>
              <div className="zr-alerts">{z.alerts} active alert{z.alerts!==1?"s":""}</div>
            </div>
          </div>
          <span className="zr-badge" style={{background:z.color+"22",color:z.color}}>{z.risk}</span>
        </div>
      ))}
    </div>
  );
}

// ── PROFILE TAB ───────────────────────────────────────────────────────────────
function ProfileTab({ worker, balance, history, onLogout }) {
  const plan = PLANS.find(p=>p.id===worker.plan)||PLANS[1];
  const trustScore = 100 - worker.signals.reduce((a,s)=>a+s.raw,0);

  return (
    <div className="tab-screen">
      <div className="profile-hero">
        <div className="ph-avatar">{worker.avatar}</div>
        <h2 className="ph-name">{worker.name}</h2>
        <div className="ph-meta">{worker.platform} · {worker.city}</div>
        <div className="ph-tag" style={{color:worker.tagColor,borderColor:worker.tagColor}}>{worker.tag}</div>
      </div>

      <div className="profile-section">
        <div className="ps-title">Personal Information</div>
        <div className="profile-card">
          <div className="detail-row"><span>Phone</span><span>{worker.phone}</span></div>
          <div className="detail-row"><span>Email</span><span>{worker.email}</span></div>
          <div className="detail-row"><span>City</span><span>{worker.city}</span></div>
          <div className="detail-row"><span>Zone</span><span>{worker.zone}</span></div>
        </div>
      </div>

      <div className="profile-section">
        <div className="ps-title">Work Information</div>
        <div className="profile-card">
          <div className="detail-row"><span>Platform</span><span>{worker.platform}</span></div>
          <div className="detail-row"><span>Partner ID</span><span>{worker.partnerId}</span></div>
          <div className="detail-row"><span>Working hours</span><span>{worker.hours}</span></div>
          <div className="detail-row"><span>Member since</span><span>{worker.since}</span></div>
        </div>
      </div>

      <div className="profile-section">
        <div className="ps-title">Current Plan</div>
        <div className="profile-card">
          <div className="detail-row"><span>Plan</span><span style={{color:plan.color,fontWeight:700}}>{plan.name}</span></div>
          <div className="detail-row"><span>Weekly premium</span><span>₹{plan.price}</span></div>
          <div className="detail-row"><span>Coverage</span><span>₹{plan.coverage.toLocaleString()}</span></div>
          <div className="detail-row"><span>Valid until</span><span>Mar 21, 2026</span></div>
          <div className="detail-row"><span>Status</span><span className="safe-badge">Active ✓</span></div>
        </div>
      </div>

      <div className="profile-section">
        <div className="ps-title">Account Statistics</div>
        <div className="profile-card">
          <div className="detail-row"><span>Total payouts</span><span style={{color:"#22c55e"}}>₹{balance.toLocaleString()}</span></div>
          <div className="detail-row"><span>Total claims</span><span>{worker.totalClaims}</span></div>
          <div className="detail-row"><span>Approved</span><span>{worker.approvedClaims}</span></div>
          <div className="detail-row"><span>Trust score</span><span style={{color:trustScore>70?"#22c55e":trustScore>40?"#F97316":"#EF4444"}}>{Math.max(0,trustScore)}/100</span></div>
        </div>
      </div>

      <div className="profile-section">
        <div className="ps-title">Security & Verification</div>
        <div className="profile-card">
          <div className="detail-row"><span>GPS verification</span><span className="safe-badge">Enabled ✓</span></div>
          <div className="detail-row"><span>Two-factor auth</span><span style={{color:"var(--muted)"}}>Disabled</span></div>
          <div className="detail-row"><span>Device status</span><span style={{color:worker.signals[2].status==="pass"?"#22c55e":"#EF4444"}}>{worker.signals[2].status==="pass"?"Clean ✓":"Flagged ✕"}</span></div>
        </div>
      </div>

      <div className="profile-section">
        <div className="ps-title">AI Risk Profile</div>
        <div className="profile-card">
          {worker.signals.map((s,i)=>(
            <div key={i} className="detail-row">
              <span>{s.signal}</span>
              <span style={{color:s.status==="pass"?"#22c55e":s.status==="warn"?"#F97316":"#EF4444",fontSize:12}}>
                {s.status==="pass"?"✓ Clean":s.status==="warn"?"⚠ Watch":"✕ Flagged"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn-logout" onClick={onLogout}>Logout →</button>
    </div>
  );
}

// ── CLAIM SCREEN ──────────────────────────────────────────────────────────────
function ClaimScreen({ disruption, worker, online, onProceed, onBack }) {
  return (
    <div className="screen claim-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      {!online && <div className="offline-notice">📡 Offline — claim will queue and sync when connected</div>}
      <div className="claim-hero" style={{"--dc":disruption.color}}>
        <div className="claim-icon">{disruption.icon}</div>
        <h2>{disruption.label}</h2>
        <div className="claim-val">{disruption.value}</div>
      </div>
      <div className="claim-card">
        <div className="detail-row"><span>Worker</span><span>{worker.name}</span></div>
        <div className="detail-row"><span>Platform</span><span>{worker.platform}</span></div>
        <div className="detail-row"><span>Location</span><span>{worker.zone}, {worker.city}</span></div>
        <div className="detail-row"><span>Threshold</span><span>{disruption.threshold}</span></div>
        <div className="detail-row"><span>Payout amount</span><span style={{color:"#22c55e",fontWeight:700,fontSize:16}}>₹{disruption.amount}</span></div>
        <div className="detail-row"><span>Premium status</span><span className="safe-badge">Active ✓</span></div>
      </div>
      <div className="claim-notice">
        Our AI will run 5 fraud detection signals before releasing the payout. This protects the system and genuine workers.
      </div>
      <button className="btn-primary" onClick={onProceed}>Submit Claim →</button>
    </div>
  );
}

// ── FRAUD ANALYSIS ────────────────────────────────────────────────────────────
function FraudAnalysis({ disruption, worker, online, onResult, onBack }) {
  const [step, setStep]         = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [score, setScore]       = useState(0);

  const start = () => { setStep(1); setRevealed(0); setScore(0); };

  useEffect(() => {
    if (step !== 1) return;
    if (revealed < worker.signals.length) {
      const t = setTimeout(() => { setScore(s=>s+worker.signals[revealed].raw); setRevealed(r=>r+1); }, 700);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setStep(2), 600);
      return () => clearTimeout(t);
    }
  }, [step, revealed, worker]);

  const sIcon  = { pass:"✓", warn:"⚠", fail:"✕" };
  const sColor = { pass:"#22c55e", warn:"#F97316", fail:"#EF4444" };
  const rc = worker.decision==="safe"?"#22c55e":worker.decision==="medium"?"#F97316":"#EF4444";
  const sc = score<40?"#22c55e":score<70?"#F97316":"#EF4444";

  return (
    <div className="screen fraud-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      {!online && <div className="offline-notice">📡 Offline — using cached signals for pre-verification</div>}

      <div className="fraud-header" style={{"--rc":rc}}>
        <div className="fh-dis">{disruption.icon} {disruption.label} · {disruption.value}</div>
        <h2>AI Fraud Analysis</h2>
        <p>5-signal anti-spoofing check · {worker.name.split(" ")[0]}</p>
      </div>

      {step===0 && (
        <div className="fraud-idle">
          <div style={{fontSize:52,marginBottom:14}}>🛡️</div>
          <p>Before releasing <strong>₹{disruption.amount}</strong>, our AI verifies 5 real-time signals specific to <strong>{worker.name.split(" ")[0]}'s</strong> account.</p>
          <button className="btn-primary" onClick={start}>Run Fraud Analysis →</button>
        </div>
      )}

      {(step===1||step===2) && (
        <>
          <div className="score-box">
            <div className="sb-label">Risk Score</div>
            <div className="sb-num" style={{color:sc}}>{score}</div>
            <div className="sb-bands">
              <span className="band safe-band">0–40 Safe</span>
              <span className="band warn-band">40–70 Review</span>
              <span className="band fail-band">70+ Block</span>
            </div>
          </div>

          <div className="signals">
            {worker.signals.map((sig,i)=>(
              <div key={i} className={`sig-row ${i<revealed?"vis":"dim"}`}>
                <div className="sr-left">
                  <span className="sr-icon" style={{color:i<revealed?sColor[sig.status]:"var(--muted)"}}>
                    {i<revealed?sIcon[sig.status]:"○"}
                  </span>
                  <div>
                    <div className="sr-name">{sig.signal}</div>
                    <div className="sr-detail">{i<revealed?sig.label:"Scanning..."}</div>
                  </div>
                </div>
                {i<revealed && <span className="sr-score" style={{color:sig.raw>0?sColor[sig.status]:"#22c55e"}}>{sig.raw>0?`+${sig.raw}`:"+0"}</span>}
              </div>
            ))}
          </div>

          {step===2 && (
            <div className="fraud-result" style={{"--rc":rc}}>
              <div className="fr-icon">{worker.decision==="safe"?"✓":worker.decision==="medium"?"⚠":"✕"}</div>
              <div className="fr-outcome">{worker.outcome}</div>
              <div className="fr-detail">{worker.outcomeDetail}</div>
              <button className="btn-result" style={{background:rc}} onClick={()=>onResult(worker.decision)}>
                {worker.decision==="safe"?"Release Payout →":worker.decision==="medium"?"Delay & Verify →":"Block Claim →"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── OUTCOME SCREENS ───────────────────────────────────────────────────────────
function PayoutScreen({ disruption, worker, balance, onDone }) {
  return (
    <div className="screen outcome-screen">
      <div className="success-ring"><div className="check-icon">✓</div></div>
      <h2 className="oc-title">Payout Successful</h2>
      <p className="oc-sub">Income protected for {worker.name.split(" ")[0]}</p>
      <div className="oc-amount green-amount">
        <div className="oc-rupee">₹{disruption.amount}</div>
        <div className="oc-note">credited instantly</div>
      </div>
      <div className="oc-card">
        <div className="detail-row"><span>Disruption</span><span>{disruption.label}</span></div>
        <div className="detail-row"><span>Worker</span><span>{worker.name}</span></div>
        <div className="detail-row"><span>Fraud score</span><span className="safe-badge">12 — Safe ✓</span></div>
        <div className="detail-row"><span>New balance</span><span>₹{balance.toLocaleString()}</span></div>
        <div className="detail-row"><span>Time</span><span>Mar 19, 2026 · Now</span></div>
      </div>
      <div className="oc-footnote">No manual claim filed. Disruption auto-detected and verified.</div>
      <button className="btn-primary" onClick={onDone}>Back to Dashboard →</button>
    </div>
  );
}

function DelayedScreen({ disruption, onDone }) {
  return (
    <div className="screen outcome-screen">
      <div className="success-ring" style={{borderColor:"#F97316",background:"rgba(249,115,22,0.1)"}}>
        <div className="check-icon" style={{color:"#F97316"}}>⚠</div>
      </div>
      <h2 className="oc-title">Claim Under Review</h2>
      <p className="oc-sub">Soft verification triggered</p>
      <div className="oc-amount" style={{background:"rgba(249,115,22,0.08)",borderColor:"rgba(249,115,22,0.2)"}}>
        <div className="oc-rupee" style={{color:"#F97316"}}>₹{disruption.amount}</div>
        <div className="oc-note">held — pending verification</div>
      </div>
      <div className="oc-card">
        <div className="detail-row"><span>Risk score</span><span style={{color:"#F97316"}}>55 — Medium ⚠</span></div>
        <div className="detail-row"><span>Reason</span><span>New account + low movement</span></div>
        <div className="detail-row"><span>Action</span><span>2hr re-check window opened</span></div>
        <div className="detail-row"><span>Worker notified</span><span>✓ Yes</span></div>
      </div>
      <div className="oc-footnote" style={{borderColor:"rgba(249,115,22,0.2)",background:"rgba(249,115,22,0.06)"}}>
        Genuine workers are never hard-blocked on a single signal. 2hr window gives benefit of doubt.
      </div>
      <button className="btn-primary" onClick={onDone}>Back to Dashboard →</button>
    </div>
  );
}

function BlockedScreen({ worker, onDone }) {
  const score = worker.signals.reduce((a,s)=>a+s.raw,0);
  return (
    <div className="screen outcome-screen">
      <div className="success-ring" style={{borderColor:"#EF4444",background:"rgba(239,68,68,0.1)"}}>
        <div className="check-icon" style={{color:"#EF4444"}}>✕</div>
      </div>
      <h2 className="oc-title">Claim Blocked</h2>
      <p className="oc-sub">{worker.id==="priya"?"Insider fraud detected":"GPS fraud ring detected"}</p>
      <div className="oc-amount" style={{background:"rgba(239,68,68,0.08)",borderColor:"rgba(239,68,68,0.2)"}}>
        <div className="oc-rupee" style={{color:"#EF4444"}}>₹0</div>
        <div className="oc-note">payout blocked</div>
      </div>
      <div className="oc-card">
        <div className="detail-row"><span>Risk score</span><span style={{color:"#EF4444"}}>{score} — High ✕</span></div>
        {worker.signals.filter(s=>s.status==="fail").map((s,i)=>(
          <div key={i} className="detail-row"><span>{s.signal}</span><span style={{color:"#EF4444",fontSize:11}}>✕ Failed</span></div>
        ))}
        <div className="detail-row"><span>Action</span><span>Escalated to review</span></div>
      </div>
      <div className="oc-footnote" style={{borderColor:"rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.06)"}}>
        {worker.outcomeDetail}
      </div>
      <button className="btn-primary" onClick={onDone}>Back to Dashboard →</button>
    </div>
  );
}

function QueuedScreen({ disruption, onDone }) {
  return (
    <div className="screen outcome-screen">
      <div className="success-ring" style={{borderColor:"#F97316",background:"rgba(249,115,22,0.1)"}}>
        <div className="check-icon" style={{color:"#F97316"}}>⏳</div>
      </div>
      <h2 className="oc-title">Claim Queued</h2>
      <p className="oc-sub">You're offline — saved to device</p>
      <div className="oc-amount" style={{background:"rgba(249,115,22,0.08)",borderColor:"rgba(249,115,22,0.2)"}}>
        <div className="oc-rupee" style={{color:"#F97316"}}>₹{disruption.amount}</div>
        <div className="oc-note">pending sync</div>
      </div>
      <div className="oc-card">
        <div className="detail-row"><span>Disruption</span><span>{disruption.label}</span></div>
        <div className="detail-row"><span>Status</span><span style={{color:"#F97316"}}>Queued offline</span></div>
        <div className="detail-row"><span>Saved to</span><span>Device storage</span></div>
        <div className="detail-row"><span>Will process</span><span>When network returns</span></div>
      </div>
      <div className="oc-footnote" style={{borderColor:"rgba(249,115,22,0.2)",background:"rgba(249,115,22,0.06)"}}>
        GigWeatherWage works offline. Your claim is saved and will auto-process the moment you're back online.
      </div>
      <button className="btn-primary" onClick={onDone}>Back to Dashboard →</button>
    </div>
  );
}
