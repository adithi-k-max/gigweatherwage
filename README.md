# 🌩️ GigWeatherWage

**An intelligent micro-insurance and financial SaaS platform designed exclusively for gig workers and daily wage earners.**

Gig workers face daily risks ranging from extreme weather (floods, heatwaves) to sudden account disruptions. **GigWeatherWage** acts as a safety net, allowing workers to access income protection via an affordable weekly subscription, powered by dynamic, actuarial AI modeling.

🔗 **[Pitch Deck / Demo Presentation](https://docs.google.com/presentation/d/1tS19UGPB0KvrrfY8T5RTAiPD1c2QSDupe12ODg9A8ig/edit?slide=id.p1#slide=id.p1)**

---

## 🚀 Live Demo & Downloads

| Platform | Link |
|---|---|
| 🌐 Web App (PWA) | **[gigweatherwage.vercel.app](https://gigweatherwage.vercel.app)** |
| 📱 Flutter Mobile App (PWA) | **[adithi-k-max.github.io/gigweatherwage_mobile](https://adithi-k-max.github.io/gigweatherwage_mobile/)** |
| 📲 Android APK (Direct Download) | **[Download APK](https://github.com/adithi-k-max/gigweatherwage_mobile/releases/latest)** |
| 📦 Mobile App Repo | **[gigweatherwage_mobile](https://github.com/adithi-k-max/gigweatherwage_mobile)** |

> **PWA Install:** On Android open in Chrome → 3-dot menu → "Add to Home Screen". On iPhone open in Safari → Share → "Add to Home Screen".
> **APK Install:** Download APK → enable "Install from unknown sources" on Android → open to install.

---

## 🔐 Demo Login Credentials

### 👤 4 Worker Personas (Phone / OTP Login)

Use these on the **Worker Login** screen. Enter the phone number and complete OTP (use Firebase test numbers or real OTP delivery).

| Persona | Phone | Email | Password | City | Platform | Scenario |
|---|---|---|---|---|---|---|
| **Raju Kumar** | `9000000001` | `raju.k@gmail.com` | `Raju@1234` | Hyderabad | Swiggy | ✅ Safe — auto payout approved |
| **Meena Devi** | `9000000002` | `meena.d@gmail.com` | `Meena@1234` | Chennai | Amazon | ⚠️ Delayed — new account soft verification |
| **Priya Sharma** | `9000000003` | `priya.s@gmail.com` | `Priya@1234` | Bengaluru | Zomato | ❌ Blocked — insider fraud detected |
| **Vikram (Acc #7749)** | `9000000004` | `v7749@tempmail.com` | `Vikram@1234` | Mumbai | Zepto | ❌ Blocked — GPS fraud ring detected |

> You can also log in directly using **email + password** on the login screen (click "Login with Username or Email").

---

### 🛡️ Admin Dashboard Credentials

Click **"Continue As Admin"** on the login portal screen, then use:

| Field | Value |
|---|---|
| **Email** | `admin@gigweatherwage.com` |
| **Password** | `Admin@GWW2026` |

---

## 🛡️ Admin Dashboard — Features

The **Insurer Admin Dashboard** is a role-restricted operations panel accessible only via admin credentials. It provides:

- **📊 Live Analytics** — Active workers count, total premiums collected, total payouts released, and the critical **Benefit-Cost Ratio (BCR)**
- **BCR Monitor** — Real-time BCR gauge. System target enforces BCR ≤ 0.85 for solvency. Admin can trigger funding halts if BCR exceeds threshold
- **👥 Worker Management** — View all registered workers, their plan, city, payment status, claim history, and fraud signals
- **🔍 Claim Review Panel** — Inspect individual claims with full fraud signal breakdown (GPS, device integrity, movement pattern, geo-cluster, account maturity)
- **⚡ Simulate Disruption** — Admin can trigger a live rain disruption simulation on any selected worker to test the full claim → fraud analysis → settlement pipeline
- **📋 Audit Trail** — Full billing event log per worker including premium payments, credits, claim payouts, and plan changes
- **🚨 Fraud Ring Detection** — View flagged accounts and coordinated fraud ring alerts (e.g. Vikram's 47-account Telegram syndicate)
- **🔄 Demo Worker Loader** — Load any persona directly into the dashboard for live demonstration

---

## 💡 About the Project (Our Story)

### 🌟 What Inspired Us
The gig economy powers modern convenience, but gig workers shoulder extreme risks. During the recent devastating monsoons and heatwaves across India, thousands of food delivery partners and logistics drivers lost their daily wages simply because it was unsafe to work. Unlike corporate workers who enjoy paid leave, gig workers face a harsh reality: **No ride, no wage.** We were inspired to build a scalable, data-driven safety net that acts as micro-insurance, bringing financial security to those who need it most.

### ⚙️ How We Built It
GigWeatherWage is engineered using a robust serverless architecture to ensure rapid global scalability:
- **Frontend / Client:** React.js integrated seamlessly with a Flutter WebView wrapper, giving us a cross-platform mobile application without maintaining multiple native codebases. We used heavily optimized **Tailwind CSS** delivered securely via CDN to build a premium, intuitive UI framework.
- **Backend / Authentication:** Firebase handles instant User Authentication (OTP SMS logic) while Firestore securely holds worker wallets and claim ledgers in real-time.
- **Payments:** Integrated native **Razorpay API** via secure Node.js backend functions hosted on Vercel (`/api/razorpay-order`), driving the dynamic weekly premium subscription engine.
- **Verification:** Using navigator GPS and device telemetrics, the application dynamically validates whether a gig worker is geographically within a declared anomaly zone before unlocking their eligible payouts.
- **Mobile App:** Built with Flutter as a PWA wrapper and native Android APK, available via GitHub Pages and direct APK download.

### 🧩 Challenges We Faced
1. **Actuarial Pricing:** Providing micro-insurance without bankrupting the system. We had to architect a localized risk algorithm that dynamically increases premiums for a rider in a flood-prone city like Mumbai versus a rider in a safer, dry-weather zone.
2. **Fraud Prevention:** Ensuring payouts aren't exploited by dummy accounts. We implemented forced maturity gates—restricting claims until a worker had successfully cleared a 7-day payment cycle.
3. **Cross-Platform Compatibility:** Bootstrapping a React PWA into a fully functional native Android APK with proper WebView history navigation capabilities.

### 🧠 What We Learned
We learned the profound complexities surrounding fin-tech risk modeling. By balancing the mathematical inflow of premiums against payout triggers, we learned to write deterministic algorithms capable of sustaining an insurance pool—translating complex Excel-based actuarial science into rapid JavaScript. We also mastered the hybrid approach to mobile development utilizing Flutter as a rapid deployment framework.

---

## 🔥 Features

### Worker App
1. **Dynamic Premium Calculator** — Personalized weekly premium based on city risk, zone, platform, vehicle, and work hours across 80+ Indian cities and 47+ platforms
2. **Secure Razorpay Payment Integration (Test Mode)** — Weekly premium subscriptions with billing credit system, prorated upgrades/downgrades, and grace period support
3. **Intelligent Claim Engine with GPS Tracking** — Claims hard-linked to subscription status with GPS validation and real-time weather API verification
4. **5-Signal AI Fraud Detection** — Weather API match, GPS consistency, device integrity, movement pattern, geo-cluster anomaly, and account maturity gate
5. **Offline Claims Queue** — Claims filed offline are queued and auto-synced when connectivity returns
6. **Multi-language Support** — English, Telugu, Hindi, Kannada, Marathi, Malayalam, Tamil, Bengali, Gujarati, Punjabi, Odia, Assamese, Urdu
7. **GigaSaathi AI Assistant** — In-app chatbot with voice input/output support for claims, premium, weather, and support tickets
8. **Policy & Privacy Document** — Full localized insurance policy schedule with coverage triggers and privacy governance
9. **Live GPS Tracking** — Real-time worker location tracking for claim verification
10. **WebRTC Camera** — In-app camera for geotagged claim evidence capture

### Admin Dashboard
11. **BCR Analytics** — Real-time Benefit-Cost Ratio monitoring with solvency alerts
12. **Worker Management** — Full worker registry with plan, payment, and fraud status
13. **Claim Review** — Detailed fraud signal inspection per claim
14. **Disruption Simulation** — Trigger live claim scenarios for any worker
15. **Fraud Ring Detection** — Coordinated fraud cluster identification and reporting

---

## 🧮 Mathematical Actuarial Model

To ensure economic sustainability, our AI engine computes the dynamic weekly premium $P_w$ using a base factor multiplied by environmental density risk scalars:

$$ P_w = B_w \times \left(1 + \sum_{i=1}^{n} \lambda_i (R_i) \right) \times C_f \times Z_f $$

Where:
- $B_w$ = Base weekly premium calculated from historic payout metrics
- $\lambda_i (R_i)$ = The weighted geographic anomaly risk for variable $i$ (e.g., historical flooding, AQI)
- $C_f$ = City-level disruption factor
- $Z_f$ = Zone-level density factor

Furthermore, the **Benefit-Cost Ratio (BCR)** is strictly monitored by the Insurer Admin Dashboard to dynamically trigger adjustments or funding halts. The formula is:

$$ BCR = \frac{\sum Payouts}{\sum Premiums \text{ Collected}} $$

*Note: For the system to remain solvent, the model target enforces $BCR \le 0.85$.*

---

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm start
   ```

*(Ensure you have your `.env` configured with the `REACT_APP_RAZORPAY_KEY` keys!)*

---

## 🔗 Related

- Mobile App Repo: [gigweatherwage_mobile](https://github.com/adithi-k-max/gigweatherwage_mobile)
- Live Mobile PWA: [adithi-k-max.github.io/gigweatherwage_mobile](https://adithi-k-max.github.io/gigweatherwage_mobile/)
- Android APK: [Latest Release](https://github.com/adithi-k-max/gigweatherwage_mobile/releases/latest)

*Built with ❤️ during DEVTrails 2026 • Guidewire Hackathon*
