# 🌧️ GigWeatherWage
### AI-Powered Parametric Insurance for Gig Workers

> *"The strength of a chain lies in its weakest link."*
> *We spent 15 days asking — who is the weakest link in the gig economy? The answer was obvious once we stopped rushing to code and actually looked.*

[![DEVTrails 2026](https://img.shields.io/badge/DEVTrails-2026-blue)](https://guidewiredevtrails.com)
[![Team](https://img.shields.io/badge/Team-Code%20Alchemists-purple)](https://github.com)
[![University](https://img.shields.io/badge/KL-University-green)](https://kluniversity.in)

---

## 💭 Inspiration

Have you ever thought about what happens to a Swiggy or Zomato delivery partner when it rains heavily?

They can't deliver. Which means they can't earn. Which means that day is simply gone — no income, no backup, no protection.

We are four computer science students from KL University, and when we read the DEVTrails problem statement for the first time, honestly we did what most students do — read it once and jumped straight to thinking about the tech stack.

But then we slowed down. We started grinding the problem statement again and again, reading it from different angles, thinking about the actual person on the other side of the screen — the delivery rider sitting at home watching the rain, knowing the day's earnings just disappeared.

That's when GigWeatherWage started making real sense to us.

---

## 🎯 What it Does

**GigWeatherWage** is an AI-powered parametric insurance platform built for gig delivery workers.

- Worker registers and pays a small weekly premium (₹20–₹80)
- System continuously monitors real-world disruption signals
- When a threshold is crossed, **automatic payout — no manual claim needed**
- Works **offline** — claims queue on device and sync when network returns

### Who we protect
**Persona:** Urban food delivery rider, Hyderabad
Daily income: ₹500–₹800 · Risk: Any disruption = income loss

### Disruption triggers
| Trigger | Threshold | Payout |
|--------|-----------|--------|
| Heavy rainfall | > 50mm | ₹300 |
| Heatwave | > 42°C | ₹250 |
| Extreme AQI | > 300 | ₹200 |
| City curfew | Zone alert | ₹300 |
| Platform outage | > 2 hours | ₹150 |

### Insurance plans
| Plan | Weekly Premium | Coverage | Fraud Detection |
|------|---------------|----------|-----------------|
| Basic Shield | ₹20 | ₹2,000 | Basic |
| Storm Guard | ₹45 | ₹3,500 | Advanced |
| Full Shield | ₹80 | ₹5,000 | Premium AI |

---

## 🧠 How We Built It

**Step 1 — Understand before building**
The first two weeks were entirely research. We mapped the gig worker's daily reality, identified every disruption type, and designed the payout logic before writing a single line of code.

**Step 2 — System architecture**
```
Real-world Data APIs (Weather / AQI / City Alerts)
            ↓
     Backend Risk Engine
            ↓
    Disruption Detection Layer
            ↓
   5-Signal AI Fraud Analysis Layer
            ↓
   Decision: Safe → Payout / Medium → Verify / Fraud → Block
            ↓
    Worker App + Instant Notification
            ↓
   Offline Queue (if no network) → Auto-sync when online
```

**Tech Stack**
- Frontend: React (prototype) → Flutter (production)
- Backend: Node.js + Express
- AI/ML: Python (fraud detection model)
- Database: MongoDB
- APIs: OpenWeatherMap, AQI API, Razorpay sandbox
- Offline: localStorage + IndexedDB for claim queuing

---

## 📱 App Features

### Complete screen flow
```
Splash → Landing → Login/Register
    ↓
Registration (5 steps):
  Personal Info → Work Info → Choose Plan → Payment (UPI) → Success
    ↓
Dashboard (5 tabs):
  🏠 Home → Balance, alerts, disruption claim cards
  📋 Claims → Full history with fraud scores
  💰 Payments → UPI transactions, premium renewal
  🔔 Alerts → Live weather monitoring, zone risk
  👤 Profile → Work info, plan, security, AI risk profile
    ↓
Claim Flow:
  Disruption card → Claim screen → AI Fraud Analysis → Outcome
```

### Offline-first design
The app that protects workers during storms must work during storms — even without network.

```
Storm hits → Network drops
      ↓
Worker opens GigWeatherWage
      ↓
Offline banner appears: "Cached data shown"
      ↓
Worker files claim → Saved to device (localStorage)
      ↓
"Claim queued — will sync when online"
      ↓
Network returns → Auto-sync → Payout processes
```

**What works offline:** Login, Dashboard, Filing claims, History, Profile
**What needs network:** Weather API verification, actual payout transfer

### UPI Payment integration
- PhonePe deep link: `phonepe://pay`
- Google Pay deep link: `tez://upi/pay`
- Manual UPI ID entry
- Auto-renewal tracking

---

## 🛡️ Adversarial Defense & Anti-Spoofing Strategy

During Phase 1, a market crash scenario was introduced: a syndicate of 500 delivery workers using GPS spoofing apps via Telegram groups to fake their locations in red-alert weather zones — draining the liquidity pool.

Our response: **5-signal multi-layer AI verification.**

---

### 1. Differentiation — Real Worker vs Fraud

Every claim passes through 5 signals before any payout is released.

**Signal 1 — Weather API match (max +40 risk points)**
```
System calls OpenWeatherMap at worker's claimed GPS location.
Worker claims rain → API shows clear sky → +40 points
Rain actually confirmed → +0 points
```
A spoofer can fake location. They cannot fake the weather at that fake location.

**Signal 2 — Movement pattern analysis (max +30 risk points)**
```
Real delivery rider = constantly moving (routes, stops, speed changes)
GPS spoofer at home = perfectly static coordinate → +30 points
```
Even genuine workers stuck in rain still move — to shelter, chai shops, building entrances. Complete stillness is suspicious.

**Signal 3 — Device integrity check (max +20 risk points)**
```
GPS spoofing apps run on emulators or rooted phones → detectable signatures
Multiple accounts on same device ID → +20 points
Trusted known device → +0 points
```

**Signal 4 — Historical behaviour analysis (max +15 risk points)**
```
Compares current claim against worker's 90-day behaviour:
- Usual working hours and zones
- Claim frequency and patterns
- Account age

New account (< 7 days) during first major event → +15 points
Consistent multi-year pattern → +0 points
```

**Signal 5 — Geo-cluster detection (max +30 risk points)**
```
How many workers claimed from identical coordinates in same 10-min window?

1–3 workers → normal (apartment building)
10+ workers → suspicious
47+ workers → confirmed fraud ring → +30 points
```
This catches organized Telegram syndicates. Real workers spread naturally. Fraud rings spoof the same coordinates.

---

### 2. Risk Scoring Model

```
Weather API mismatch      → +40 points
Static GPS movement       → +30 points
Suspicious device signal  → +20 points
New account anomaly       → +15 points
Geo-cluster pattern       → +30 points

Score 0–40   → SAFE   → Auto payout instantly
Score 40–70  → MEDIUM → Claim delayed, 2hr soft verification
Score 70+    → HIGH   → Claim blocked, escalated to manual review
```

### 3. Four Real-World Fraud Scenarios (Live in App)

| Persona | Type | Key failing signal | Score | Outcome |
|---------|------|--------------------|-------|---------|
| Raju Kumar | Genuine worker, 3 years | All clear | 12 | ✓ Paid instantly |
| Meena Devi | Genuine, new account (12 days) | New account + low movement | 55 | ⚠ Delayed 2hrs |
| Priya Sharma | Real worker gaming system | Weather mismatch + pattern | 85 | ✕ Blocked |
| Vikram #7749 | GPS spoofer, fraud ring | Emulator + cluster of 47 | 135 | ✕ Blocked + ring flagged |

**Priya's scenario is the most important:** She is a real registered Zomato worker with 8 months of history and a trusted device. But the weather API confirms no rain at her actual device location, and her own claim history shows a pattern. The system catches her without relying on just one signal.

### 4. UX Balance — Protecting Genuine Workers

**SAFE (0–40) → Instant payout.** No friction.

**MEDIUM (40–70) → Soft verification, 2-hour window.**
Worker notified with clear explanation. System re-checks after window. If resolved → payout. Never hard-blocked on a single signal. Genuine workers experiencing network drops in bad weather are protected here.

**HIGH (70+) → Block + manual review.**
Claim blocked with explanation. Added to review queue. If investigation confirms legitimacy → retroactive payout. If fraud confirmed → account flagged, pattern added to fraud ring database.

**The principle:** A new delivery partner who just bought a phone, joined last week, and got caught in unexpected rain should not lose their payout. The medium tier exists exactly for this person.

---

## ⚡ Challenges We Ran Into

**Understanding parametric insurance deeply**
Defining the right triggers, thresholds, and payout logic took far more thinking than expected.

**The fraud defense redesign under 24-hour pressure**
When the GPS spoofing scenario hit, our original architecture had no answer. We redesigned the entire claim flow under extreme time pressure.

**Balancing fraud resistance with user fairness**
Too aggressive → honest workers penalized. Too lenient → bad actors drain the pool. The three-tier response model was hard to get right.

**Offline-first architecture**
The realization that the app insuring against storms must work during storms was a design breakthrough. Building claim queuing on device with auto-sync required rethinking the entire data flow.

---

## 🏆 Accomplishments We're Proud Of

The fraud detection architecture — not because it's complex, but because it's **fair**. It protects the system without punishing the honest worker.

The offline-first insight — no other team thought about this. A worker in a storm with no network can still file a claim.

Spending 15 days understanding the problem before touching a keyboard — and having that show in the quality of our thinking.

---

## 📚 What We Learned

**Understanding a problem deeply is harder than building the solution.**

We also learned:
- Parametric insurance is one of the most elegant financial mechanisms ever designed
- Fraud detection is fundamentally a fairness problem, not a security problem
- The GPS spoofing scenario taught us to design for adversarial users from Day 1
- Offline-first is not optional for infrastructure that workers depend on during emergencies

---

## 🚀 What's Next

**Phase 2 — Scale**
- Build the AI risk model in Python with real training data
- Integrate live OpenWeatherMap and AQI APIs
- Implement Razorpay payout sandbox
- Full offline sync with IndexedDB
- Flutter mobile app

**Phase 3 — Soar**
- Real-time city-wide disruption dashboard
- Dynamic premium pricing based on zone risk
- Pilot with 10 real delivery workers in Hyderabad
- Fraud ring database with ML pattern learning
- Expand to Bengaluru, Chennai, Mumbai

---

## 👩‍💻 Team Code Alchemists

| Name | Role |
|------|------|
| Kotapothula Siva Raga Adithi | Team Lead |
| Rohini Yadagiri | Team Member |
| Garikipati Tejaswi | Team Member |
| Bhanu Siva Tejaswani Meesala | Team Member |

*KL University — DEVTrails 2026 — Guidewire University Hackathon*

---

*Built with curiosity, 15 days of problem grinding, and the belief that the gig worker deserves better than losing a day's earnings to the rain.*
