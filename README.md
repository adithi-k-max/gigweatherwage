# 🌩️ GigWeatherWage

**An intelligent micro-insurance and financial SaaS platform designed exclusively for gig workers and daily wage earners.**

Gig workers face daily risks ranging from extreme weather (floods, heatwaves) to sudden account disruptions. **GigWeatherWage** acts as a safety net, allowing workers to access income protection via an affordable weekly subscription, powered by dynamic, actuarial AI modeling.

---

## 🔥 Features Added & Ready for Hackathon Submission

1. **Modern Premium UI Wrap (Tailwind CSS)**
   - Transformed the entire user interface using injected Tailwind UI layouts. Home, Claims, Payments, Alerts, and Profile all feature pristine, mobile-first card aesthetics.

2. **Secure Razorpay Payment Integration (Test Mode)**
   - Fully implemented Razorpay API flows. Subscriptions/Weekly premiums successfully execute order creation via our secure custom backend (`/api/razorpay-order`) and map to frontend checkouts.

3. **Intelligent Claim Engine with GPS Tracking**
   - Claims are now hard-linked to subscription status (blocked if unpaid). 
   - Instant GPS location capturing validates whether the worker is physically present in the claimed anomaly zone.

4. **Automated Fraud Detection Pipeline**
   - Implemented dynamic maturity-gate fraud validation to automatically block claims from accounts less than 7 days old, flag accounts pending maturity, and auto-approve genuine historic accounts.

5. **Advanced Insurer Admin Dashboard**
   - Complete analytics view showing Active Workers, Total Premium, Payouts, and the critical **Benefit-Cost Ratio (BCR)** ensuring actuarial and systematic economic sustainability.
   - Rain/Anomaly Simulation tools to instantly trigger broad insurance events for demoing purposes.

6. **Cross-Platform Mobile Demo Architecture**
   - Built a custom **Flutter Mobile App wrapper** (`gigweatherwage_mobile`) that flawlessly wraps our React PWA/Vercel instance into standard Android Apps (`.apk`) providing a native, hardware-accelerated experience dynamically linked to live deployments.

7. **Firebase OTP Authentication & KYC Gates**
   - Secure phone OTP login mapped to Firestore user profiles. Included DPDP user consent flows with localized policy document rendering for gig workers.

---

## 🛠️ Technology Stack

- **Frontend:** React.js, Tailwind CSS (CDN Injected for instant build execution)
- **Backend:** Node.js Serverless Functions (Vercel)
- **Database / Auth:** Firebase Firestore, Firebase Phone Authentication
- **Payments:** Razorpay API (Integration)
- **Mobile Packaging:** Flutter WebView

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

*(Ensure you have your `.env` configured properly with the `REACT_APP_RAZORPAY_KEY...` strings provided during setup!)*

*Built with ❤️ during DEVTrails 2026 • Guidewire Hackathon*
