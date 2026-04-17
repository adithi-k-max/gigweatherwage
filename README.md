# 🌩️ GigWeatherWage

**An intelligent micro-insurance and financial SaaS platform designed exclusively for gig workers and daily wage earners.**

Gig workers face daily risks ranging from extreme weather (floods, heatwaves) to sudden account disruptions. **GigWeatherWage** acts as a safety net, allowing workers to access income protection via an affordable weekly subscription, powered by dynamic, actuarial AI modeling.

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

### 🧩 Challenges We Faced
1. **Actuarial Pricing:** Providing micro-insurance without bankrupting the system. We had to architect a localized risk algorithm that dynamically increases premiums for a rider in a flood-prone city like Mumbai versus a rider in a safer, dry-weather zone. 
2. **Fraud Prevention:** Ensuring payouts aren't exploited by dummy accounts. We implemented forced maturity gates—restricting claims until a worker had successfully cleared a 7-day payment cycle.
3. **Cross-Platform Compatibility:** Bootstrapping a React PWA into a fully functional native Android APK with proper WebView history navigation capabilities.

### 🧠 What We Learned
We learned the profound complexities surrounding fin-tech risk modeling. By balancing the mathematical inflow of premiums against payout triggers, we learned to write deterministic algorithms capable of sustaining an insurance pool—translating complex Excel-based actuarial science into rapid JavaScript. We also mastered the hybrid approach to mobile development utilizing Flutter as a rapid deployment framework.

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

## 🔥 Features Ready for Submission

1. **Modern Premium UI Wrap (Tailwind CSS)**
   - Transformed the entire user interface using injected Tailwind UI layouts. Home, Claims, Payments, Alerts, and Profile all feature pristine, mobile-first card aesthetics.
2. **Secure Razorpay Payment Integration (Test Mode)**
   - Fully implemented Razorpay API flows. Subscriptions/Weekly premiums successfully execute order creation via our secure custom backend.
3. **Intelligent Claim Engine with GPS Tracking**
   - Claims are hard-linked to subscription status (blocked if unpaid) and utilize GPS validation.
4. **Automated Fraud Detection Pipeline**
   - Implemented dynamic maturity-gate fraud validation to automatically block abuse.
5. **Advanced Insurer Admin Dashboard**
   - Analytics view exposing Active Workers, Total Premium, Payouts, and the critical **BCR**.

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

*Built with ❤️ during DEVTrails 2026 • Guidewire Hackathon*
