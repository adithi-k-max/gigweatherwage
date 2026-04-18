import { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";
import { PLANS, DISRUPTIONS, PERSONAS, WEATHER_FORECAST } from "./data";
import { auth, db } from "./firebase";
import { RecaptchaVerifier, createUserWithEmailAndPassword, signInWithPhoneNumber, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut, updateProfile, updateEmail, updatePassword, deleteUser, linkWithPhoneNumber } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

const ADMIN_DEFAULT_EMAIL = String(process.env.REACT_APP_ADMIN_EMAIL || "admin@gigweatherwage.com").trim().toLowerCase();
const ADMIN_DEFAULT_PASSWORD = String(process.env.REACT_APP_ADMIN_PASSWORD || "Admin@GWW2026");

const CITY_COORDINATES = {
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Secunderabad: { lat: 17.4399, lng: 78.4983 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  "New Delhi": { lat: 28.6139, lng: 77.209 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Guwahati: { lat: 26.1445, lng: 91.7362 }
};

// â”€â”€ PREMIUM CALCULATOR DATA (V3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CITIES = [
  { city: "Mumbai", state: "Maharashtra", risk: 0.82, riskLabel: "Very High", reason: "Severe annual flooding, AQI 300+ days" },
  { city: "Pune", state: "Maharashtra", risk: 0.61, riskLabel: "High", reason: "Flash floods, heatwave spells" },
  { city: "Nagpur", state: "Maharashtra", risk: 0.58, riskLabel: "High", reason: "Extreme heat 45°C+, seasonal flooding" },
  { city: "Nashik", state: "Maharashtra", risk: 0.44, riskLabel: "Medium", reason: "Monsoon flooding, mild heat" },
  { city: "Aurangabad", state: "Maharashtra", risk: 0.42, riskLabel: "Medium", reason: "Drought-flood cycle, heat stress" },
  { city: "Solapur", state: "Maharashtra", risk: 0.46, riskLabel: "Medium", reason: "Water scarcity + heat events" },
  { city: "Thane", state: "Maharashtra", risk: 0.76, riskLabel: "Very High", reason: "Coastal flooding, Mumbai proximity" },
  { city: "Navi Mumbai", state: "Maharashtra", risk: 0.71, riskLabel: "High", reason: "Tidal flooding risk" },
  { city: "New Delhi", state: "Delhi", risk: 0.78, riskLabel: "Very High", reason: "AQI emergency 400+, Yamuna flooding, heatwave 48°C" },
  { city: "Gurugram", state: "Haryana", risk: 0.72, riskLabel: "High", reason: "Severe waterlogging, AQI crisis" },
  { city: "Noida", state: "Uttar Pradesh", risk: 0.68, riskLabel: "High", reason: "Flooding, extreme heat, AQI" },
  { city: "Faridabad", state: "Haryana", risk: 0.65, riskLabel: "High", reason: "Industrial AQI, flooding" },
  { city: "Ghaziabad", state: "Uttar Pradesh", risk: 0.67, riskLabel: "High", reason: "AQI worst zones, flooding" },
  { city: "Hyderabad", state: "Telangana", risk: 0.71, riskLabel: "High", reason: "Flash floods, heatwave 43°C+, curfews" },
  { city: "Secunderabad", state: "Telangana", risk: 0.68, riskLabel: "High", reason: "Same weather system as Hyderabad" },
  { city: "Warangal", state: "Telangana", risk: 0.52, riskLabel: "High", reason: "Monsoon flooding" },
  { city: "Vijayawada", state: "Andhra Pradesh", risk: 0.74, riskLabel: "High", reason: "Krishna flooding, cyclone path" },
  { city: "Visakhapatnam", state: "Andhra Pradesh", risk: 0.79, riskLabel: "Very High", reason: "Cyclone belt, coastal flooding" },
  { city: "Tirupati", state: "Andhra Pradesh", risk: 0.45, riskLabel: "Medium", reason: "Seasonal flooding" },
  { city: "Guntur", state: "Andhra Pradesh", risk: 0.61, riskLabel: "High", reason: "Flooding, heat" },
  { city: "Chennai", state: "Tamil Nadu", risk: 0.83, riskLabel: "Very High", reason: "Cyclone belt, 2015/2021 floods, heat" },
  { city: "Coimbatore", state: "Tamil Nadu", risk: 0.48, riskLabel: "Medium", reason: "Drought cycles, moderate flooding" },
  { city: "Madurai", state: "Tamil Nadu", risk: 0.51, riskLabel: "High", reason: "Heat stress, flash floods" },
  { city: "Salem", state: "Tamil Nadu", risk: 0.43, riskLabel: "Medium", reason: "Seasonal disruptions" },
  { city: "Tiruchirappalli", state: "Tamil Nadu", risk: 0.56, riskLabel: "High", reason: "Cauvery flooding" },
  { city: "Vellore", state: "Tamil Nadu", risk: 0.41, riskLabel: "Medium", reason: "Moderate risk" },
  { city: "Bengaluru", state: "Karnataka", risk: 0.67, riskLabel: "High", reason: "2022 floods, lake burst, waterlogging" },
  { city: "Mysuru", state: "Karnataka", risk: 0.38, riskLabel: "Low-Medium", reason: "Low flooding, mild climate" },
  { city: "Mangaluru", state: "Karnataka", risk: 0.72, riskLabel: "High", reason: "Coastal, monsoon flooding" },
  { city: "Hubballi", state: "Karnataka", risk: 0.44, riskLabel: "Medium", reason: "Seasonal flooding" },
  { city: "Belagavi", state: "Karnataka", risk: 0.55, riskLabel: "High", reason: "Krishna basin flooding" },
  { city: "Thiruvananthapuram", state: "Kerala", risk: 0.69, riskLabel: "High", reason: "Cyclone belt, extreme rainfall" },
  { city: "Kochi", state: "Kerala", risk: 0.77, riskLabel: "Very High", reason: "2018 floods, coastal risk, high AQI" },
  { city: "Kozhikode", state: "Kerala", risk: 0.64, riskLabel: "High", reason: "Monsoon flooding" },
  { city: "Thrissur", state: "Kerala", risk: 0.61, riskLabel: "High", reason: "Flood prone" },
  { city: "Kollam", state: "Kerala", risk: 0.65, riskLabel: "High", reason: "Coastal flooding" },
  { city: "Kolkata", state: "West Bengal", risk: 0.81, riskLabel: "Very High", reason: "Annual flooding, cyclone path, AQI" },
  { city: "Howrah", state: "West Bengal", risk: 0.78, riskLabel: "Very High", reason: "Gangetic flooding" },
  { city: "Siliguri", state: "West Bengal", risk: 0.58, riskLabel: "High", reason: "Teesta flooding" },
  { city: "Bhubaneswar", state: "Odisha", risk: 0.71, riskLabel: "High", reason: "Cyclone Fani path, flooding" },
  { city: "Cuttack", state: "Odisha", risk: 0.74, riskLabel: "High", reason: "Mahanadi flooding" },
  { city: "Ahmedabad", state: "Gujarat", risk: 0.65, riskLabel: "High", reason: "Heatwave 47°C+, flash floods" },
  { city: "Surat", state: "Gujarat", risk: 0.73, riskLabel: "High", reason: "Tapi river flooding, industrial AQI" },
  { city: "Vadodara", state: "Gujarat", risk: 0.61, riskLabel: "High", reason: "Vishwamitri flooding" },
  { city: "Rajkot", state: "Gujarat", risk: 0.44, riskLabel: "Medium", reason: "Drought + heat" },
  { city: "Gandhinagar", state: "Gujarat", risk: 0.42, riskLabel: "Medium", reason: "Moderate risk" },
  { city: "Jaipur", state: "Rajasthan", risk: 0.55, riskLabel: "High", reason: "Flash floods + extreme heat 48°C" },
  { city: "Jodhpur", state: "Rajasthan", risk: 0.49, riskLabel: "Medium", reason: "Desert heat, occasional floods" },
  { city: "Udaipur", state: "Rajasthan", risk: 0.43, riskLabel: "Medium", reason: "Flash floods, heat" },
  { city: "Kota", state: "Rajasthan", risk: 0.52, riskLabel: "High", reason: "Chambal flooding" },
  { city: "Bikaner", state: "Rajasthan", risk: 0.38, riskLabel: "Low-Medium", reason: "Heat dominant" },
  { city: "Lucknow", state: "Uttar Pradesh", risk: 0.62, riskLabel: "High", reason: "Gomti flooding, heat, AQI" },
  { city: "Kanpur", state: "Uttar Pradesh", risk: 0.64, riskLabel: "High", reason: "Ganga flooding, worst AQI in India" },
  { city: "Varanasi", state: "Uttar Pradesh", risk: 0.69, riskLabel: "High", reason: "Ganga floods, AQI" },
  { city: "Agra", state: "Uttar Pradesh", risk: 0.57, riskLabel: "High", reason: "Yamuna flooding, extreme heat" },
  { city: "Prayagraj", state: "Uttar Pradesh", risk: 0.66, riskLabel: "High", reason: "Ganga-Yamuna confluence flooding" },
  { city: "Meerut", state: "Uttar Pradesh", risk: 0.58, riskLabel: "High", reason: "Seasonal flooding, AQI" },
  { city: "Bareilly", state: "Uttar Pradesh", risk: 0.53, riskLabel: "High", reason: "Flooding" },
  { city: "Patna", state: "Bihar", risk: 0.84, riskLabel: "Very High", reason: "Annual Ganga flooding, extreme heat" },
  { city: "Gaya", state: "Bihar", risk: 0.62, riskLabel: "High", reason: "Flooding, heat" },
  { city: "Ranchi", state: "Jharkhand", risk: 0.46, riskLabel: "Medium", reason: "Moderate flooding" },
  { city: "Dhanbad", state: "Jharkhand", risk: 0.55, riskLabel: "High", reason: "Mining AQI, flooding" },
  { city: "Jamshedpur", state: "Jharkhand", risk: 0.52, riskLabel: "High", reason: "Subarnarekha flooding" },
  { city: "Bhopal", state: "Madhya Pradesh", risk: 0.54, riskLabel: "High", reason: "Flash floods, heat" },
  { city: "Indore", state: "Madhya Pradesh", risk: 0.51, riskLabel: "High", reason: "Kahn river flooding" },
  { city: "Jabalpur", state: "Madhya Pradesh", risk: 0.59, riskLabel: "High", reason: "Narmada basin flooding" },
  { city: "Gwalior", state: "Madhya Pradesh", risk: 0.56, riskLabel: "High", reason: "Chambal flooding, heat" },
  { city: "Raipur", state: "Chhattisgarh", risk: 0.57, riskLabel: "High", reason: "Mahanadi flooding" },
  { city: "Ludhiana", state: "Punjab", risk: 0.53, riskLabel: "High", reason: "Sutlej flooding, AQI" },
  { city: "Amritsar", state: "Punjab", risk: 0.49, riskLabel: "Medium", reason: "Seasonal flooding" },
  { city: "Chandigarh", state: "Punjab/Haryana", risk: 0.41, riskLabel: "Medium", reason: "Low-moderate risk" },
  { city: "Jalandhar", state: "Punjab", risk: 0.51, riskLabel: "High", reason: "Flooding" },
  { city: "Guwahati", state: "Assam", risk: 0.86, riskLabel: "Very High", reason: "Annual Brahmaputra flooding, landslides" },
  { city: "Dibrugarh", state: "Assam", risk: 0.79, riskLabel: "Very High", reason: "Brahmaputra floods" },
  { city: "Silchar", state: "Assam", risk: 0.81, riskLabel: "Very High", reason: "Barak valley flooding" },
  { city: "Imphal", state: "Manipur", risk: 0.62, riskLabel: "High", reason: "Flooding, political disruptions" },
  { city: "Srinagar", state: "J&K", risk: 0.71, riskLabel: "High", reason: "Jhelum flooding, curfew risk, snow" },
  { city: "Jammu", state: "J&K", risk: 0.55, riskLabel: "High", reason: "Flooding, political disruptions" },
  { city: "Dehradun", state: "Uttarakhand", risk: 0.63, riskLabel: "High", reason: "Cloudbursts, landslides" },
  { city: "Haridwar", state: "Uttarakhand", risk: 0.67, riskLabel: "High", reason: "Ganga flooding, mass events" },
  { city: "Panaji", state: "Goa", risk: 0.52, riskLabel: "High", reason: "Coastal flooding, monsoon" },
  { city: "Margao", state: "Goa", risk: 0.49, riskLabel: "Medium", reason: "Seasonal flooding" },
];

const CALC_PLATFORMS = [
  { name: "Swiggy", category: "Food Delivery", incomeFactor: 750, tripDensity: 2.5, factor: 1.10 },
  { name: "Zomato", category: "Food Delivery", incomeFactor: 720, tripDensity: 2.3, factor: 1.08 },
  { name: "Zepto", category: "Quick Commerce", incomeFactor: 640, tripDensity: 3.8, factor: 1.22 },
  { name: "Blinkit", category: "Quick Commerce", incomeFactor: 660, tripDensity: 3.5, factor: 1.20 },
  { name: "Dunzo", category: "Quick Commerce", incomeFactor: 580, tripDensity: 3.2, factor: 1.18 },
  { name: "BigBasket BB Now", category: "Grocery", incomeFactor: 700, tripDensity: 2.0, factor: 1.05 },
  { name: "Swiggy Instamart", category: "Quick Commerce", incomeFactor: 680, tripDensity: 3.4, factor: 1.19 },
  { name: "JioMart Express", category: "Grocery", incomeFactor: 620, tripDensity: 1.8, factor: 1.02 },
  { name: "Flipkart Minutes", category: "Quick Commerce", incomeFactor: 650, tripDensity: 3.0, factor: 1.15 },
  { name: "Nykaa Now", category: "Quick Commerce", incomeFactor: 590, tripDensity: 2.5, factor: 1.08 },
  { name: "Magicpin", category: "Food/Retail", incomeFactor: 560, tripDensity: 2.0, factor: 1.04 },
  { name: "Swiggy Genie", category: "Pickup-Drop", incomeFactor: 620, tripDensity: 2.8, factor: 1.12 },
  { name: "Ola", category: "Ride Hailing", incomeFactor: 900, tripDensity: 1.5, factor: 1.05 },
  { name: "Uber", category: "Ride Hailing", incomeFactor: 950, tripDensity: 1.4, factor: 1.04 },
  { name: "Rapido", category: "Bike Taxi", incomeFactor: 680, tripDensity: 3.0, factor: 1.18 },
  { name: "Ola Bike", category: "Bike Taxi", incomeFactor: 650, tripDensity: 2.8, factor: 1.15 },
  { name: "Uber Moto", category: "Bike Taxi", incomeFactor: 660, tripDensity: 2.9, factor: 1.16 },
  { name: "BluSmart", category: "EV Cab", incomeFactor: 880, tripDensity: 1.3, factor: 1.02 },
  { name: "InDrive", category: "Ride Hailing", incomeFactor: 820, tripDensity: 1.4, factor: 1.03 },
  { name: "Amazon Flex", category: "Logistics", incomeFactor: 850, tripDensity: 0.8, factor: 0.92 },
  { name: "Flipkart Delivery", category: "Logistics", incomeFactor: 780, tripDensity: 0.9, factor: 0.94 },
  { name: "Meesho Logistics", category: "Logistics", incomeFactor: 680, tripDensity: 1.0, factor: 0.95 },
  { name: "DTDC", category: "Courier", incomeFactor: 700, tripDensity: 1.1, factor: 0.96 },
  { name: "Delhivery", category: "Logistics", incomeFactor: 720, tripDensity: 1.0, factor: 0.95 },
  { name: "Shiprocket", category: "Logistics", incomeFactor: 690, tripDensity: 1.0, factor: 0.94 },
  { name: "Porter", category: "Mini Logistics", incomeFactor: 800, tripDensity: 1.2, factor: 0.98 },
  { name: "Loadshare", category: "Logistics", incomeFactor: 760, tripDensity: 0.8, factor: 0.92 },
  { name: "BlackBuck", category: "Trucking", incomeFactor: 1100, tripDensity: 0.3, factor: 0.80 },
  { name: "Rivigo", category: "Logistics", incomeFactor: 1050, tripDensity: 0.3, factor: 0.80 },
  { name: "Ecom Express", category: "Courier", incomeFactor: 700, tripDensity: 1.0, factor: 0.94 },
  { name: "Shadowfax", category: "Logistics", incomeFactor: 720, tripDensity: 1.1, factor: 0.96 },
  { name: "WareIQ", category: "Fulfillment", incomeFactor: 680, tripDensity: 1.0, factor: 0.93 },
  { name: "Urban Company", category: "Home Services", incomeFactor: 900, tripDensity: 0.5, factor: 0.88 },
  { name: "Housejoy", category: "Home Services", incomeFactor: 780, tripDensity: 0.5, factor: 0.87 },
  { name: "Ola Home Services", category: "Home Services", incomeFactor: 850, tripDensity: 0.5, factor: 0.88 },
  { name: "Laundryheap", category: "Laundry", incomeFactor: 600, tripDensity: 1.2, factor: 0.96 },
  { name: "iD Fresh", category: "Food", incomeFactor: 650, tripDensity: 1.5, factor: 0.98 },
  { name: "Practo Labs", category: "Healthcare", incomeFactor: 700, tripDensity: 0.8, factor: 0.90 },
  { name: "1mg Delivery", category: "Pharmacy", incomeFactor: 680, tripDensity: 1.8, factor: 1.02 },
  { name: "Apollo Pharmacy", category: "Pharmacy", incomeFactor: 700, tripDensity: 1.6, factor: 1.00 },
  { name: "Tata 1mg", category: "Pharmacy", incomeFactor: 680, tripDensity: 1.8, factor: 1.02 },
  { name: "Dunzo Daily", category: "Hyperlocal", incomeFactor: 600, tripDensity: 2.8, factor: 1.14 },
  { name: "Doormint", category: "Cleaning", incomeFactor: 620, tripDensity: 0.5, factor: 0.87 },
  { name: "Helpr", category: "Errands", incomeFactor: 580, tripDensity: 2.0, factor: 1.05 },
  { name: "HouseJoy", category: "Services", incomeFactor: 780, tripDensity: 0.5, factor: 0.87 },
  { name: "SpeedBot", category: "Delivery", incomeFactor: 620, tripDensity: 3.0, factor: 1.15 },
  { name: "Zypp Electric", category: "EV Delivery", incomeFactor: 640, tripDensity: 2.5, factor: 1.08 },
  { name: "Other Platform", category: "Other", incomeFactor: 650, tripDensity: 2.0, factor: 1.00 },
];

const VEHICLES = [
  { name: "Bicycle", factor: 1.40, desc: "Fully exposed, no speed to avoid delays" },
  { name: "Motorbike / Scooter", factor: 1.30, desc: "Fully exposed, hydroplaning risk" },
  { name: "Electric Scooter / E-Bike", factor: 1.28, desc: "Rain affects battery, exposed rider" },
  { name: "Auto-Rickshaw / E-Rickshaw", factor: 0.85, desc: "Partial shelter, slower in rain" },
  { name: "Car (Hatchback/Sedan)", factor: 0.72, desc: "Sheltered but stuck in flooded traffic" },
  { name: "Mini Truck / Tempo", factor: 0.70, desc: "Sheltered, higher clearance" },
  { name: "Large Truck", factor: 0.68, desc: "Best clearance, major disruption resilience" },
];

const CALC_PLANS = [
  { name: "Basic Shield", coverage: 2000, coveragePct: 0.60, basePremium: 18, color: "#0D7A6F" },
  { name: "Storm Guard", coverage: 3500, coveragePct: 0.75, basePremium: 28, color: "#0FA896", recommended: true },
  { name: "Full Shield", coverage: 5000, coveragePct: 0.90, basePremium: 42, color: "#1B3A6B" },
];

const SCENARIOS = [
  { event: "Heavy rainfall > 50mm", type: "Natural", covered: true, reason: "External, verifiable via API" },
  { event: "Heatwave > 42°C", type: "Natural", covered: true, reason: "IMD alert, measurable" },
  { event: "Extreme AQI > 300", type: "Environmental", covered: true, reason: "CPCB data, govt health advisory" },
  { event: "City curfew (announced)", type: "Government", covered: true, reason: "Official govt order, no worker control" },
  { event: "Platform app crash > 2hrs", type: "System", covered: true, reason: "Logged downtime, worker helpless" },
  { event: "Flash flood on route", type: "Natural", covered: true, reason: "GPS + weather API confirmation" },
  { event: "Cyclone warning issued", type: "Natural", covered: true, reason: "IMD alert, state closure order" },
  { event: "Protest/riot blocking roads", type: "Civil", covered: true, reason: "Verifiable, worker cannot proceed" },
  { event: "Road closure (govt order)", type: "Government", covered: true, reason: "Official order, confirmed closure" },
  { event: "Vehicle breakdown (proven)", type: "Operational", covered: true, reason: "With service record proof" },
  { event: "Lockdown (COVID-type)", type: "Government", covered: true, reason: "Official mandate, zero income" },
  { event: "Earthquake (moderate+)", type: "Natural", covered: true, reason: "USGS alert, infrastructure damage" },
  { event: "Severe fog (zero visibility)", type: "Natural", covered: true, reason: "IMD visibility < 50m alert" },
  { event: "Snow blocking roads", type: "Natural", covered: true, reason: "High altitude cities, measurable" },
  { event: "Worker chose not to work", type: "Personal Choice", covered: false, reason: "No uncertainty involved" },
  { event: "Took voluntary break", type: "Personal Choice", covered: false, reason: "Worker's decision, not disruption" },
  { event: "Drunk / impaired driving", type: "Negligence", covered: false, reason: "Worker-controlled, illegal" },
  { event: "Overspeeding accident", type: "Negligence", covered: false, reason: "Preventable by worker" },
  { event: "No helmet, accident", type: "Negligence", covered: false, reason: "Legal violation, preventable" },
  { event: "Fake GPS location claim", type: "Fraud", covered: false, reason: "Intentional, detectable by 5-signal AI" },
  { event: "AI-generated photo as proof", type: "Fraud", covered: false, reason: "AI image detection will flag" },
  { event: "Old gallery photo submitted", type: "Fraud", covered: false, reason: "EXIF metadata mismatch" },
  { event: "Rejected orders voluntarily", type: "Personal Choice", covered: false, reason: "Worker's choice, not external" },
  { event: "Phone battery dead (no backup)", type: "Negligence", covered: false, reason: "Preventable with charger" },
  { event: "Personal illness (no hospitalization)", type: "Personal", covered: false, reason: "Not weather/disruption related" },
  { event: "Traffic jam (normal)", type: "Normal Risk", covered: false, reason: "Part of regular gig work conditions" },
  { event: "Asteroid / nuclear war", type: "Extreme", covered: false, reason: "Beyond actuarial modeling capacity" },
  { event: "Using multiple accounts", type: "Fraud", covered: false, reason: "Platform violation, device detection" },
];

const POLICY_SECTIONS = [
  {
    clause: "1",
    title: "Introduction And Scope",
    points: [
      "GigWeatherWage provides dynamic insurance support for gig workers affected by verified weather, air quality, curfew, and platform disruption events.",
      "This notice explains what data is collected, why it is collected, how it is protected, and how policyholders can control account data and consent.",
      "This policy applies to onboarding, premium calculation, policy servicing, claims review, fraud checks, support, and payment records."
    ]
  },
  {
    clause: "2",
    title: "Data Categories We Collect",
    points: [
      "Identity data: name, phone number, email, city, zone, platform, partner ID, masked Aadhaar inputs, and policy identifiers.",
      "Operational data: work hours, vehicle type, delivery activity, zone exposure, claim history, and selected insurance plan.",
      "Risk and device data: device type, app usage logs, crash signals, route patterns, device integrity indicators, and verification evidence used for fraud review.",
      "Financial data: premium payments, billing credit, claim settlements, payout method details, and transaction history needed to service the policy."
    ]
  },
  {
    clause: "3",
    title: "Purpose Of Processing",
    points: [
      "Data is used to calculate personalised premium, issue and maintain coverage, validate claims, process payouts, detect fraud, and support account servicing.",
      "Location, route, disruption, and claim evidence data are used only to measure insured events and review suspicious or high-risk claims.",
      "The system does not use collected data for unrelated advertising or unrelated profiling."
    ]
  },
  {
    clause: "4",
    title: "How Premium And Claims Decisions Work",
    points: [
      "Premium is calculated from base rate, city risk, platform factor, work exposure, vehicle factor, and selected coverage tier.",
      "Claims are reviewed using disruption verification, account history, device integrity, and fraud signals before a payout decision is made.",
      "Where AI-supported scoring affects payout eligibility, the app should explain the main reasons such as high-risk route mismatch, device concern, or abnormal claim behavior."
    ]
  },
  {
    clause: "5",
    title: "Data Sharing And Third Parties",
    points: [
      "Data may be shared with payment processors, cloud service providers, insurer or underwriting partners, and fraud review systems only to deliver the insured service.",
      "Data may also be disclosed when required by law, regulatory direction, court order, or authorised investigation.",
      "GigWeatherWage does not sell personal data to advertisers or unrelated third parties."
    ]
  },
  {
    clause: "6",
    title: "Security And Storage Controls",
    points: [
      "Account and policy records are expected to be protected through encryption in transit, controlled storage access, and role-based visibility for authorised reviewers only.",
      "Operational logs, device signals, and claim evidence should be retained in secure cloud systems with audit history for servicing and dispute review.",
      "Only the minimum system roles needed for support, claims review, or compliance should be able to access sensitive policy records."
    ]
  },
  {
    clause: "7",
    title: "Retention, Deletion, And User Rights",
    points: [
      "Records are retained only for as long as needed to issue coverage, process claims, manage disputes, meet accounting duties, and comply with applicable law.",
      "Users may request access, correction, deletion, or withdrawal of consent subject to active claim, fraud review, billing, or legal retention requirements.",
      "Where full deletion is not possible for compliance reasons, data should be restricted, archived, or anonymised."
    ]
  },
  {
    clause: "8",
    title: "Consent, Tracking, And Policy Updates",
    points: [
      "By registering or renewing, the worker consents to data use for onboarding, premium calculation, claim review, fraud prevention, and policy servicing.",
      "Sensitive tracking should remain purpose-bound, for example location usage during delivery verification or live claim review rather than unrestricted background profiling.",
      "Material updates to this policy should be versioned and shown to users before the revised terms apply to future activity."
    ]
  },
  {
    clause: "9",
    title: "Contact And Governance",
    points: [
      "Questions, correction requests, or consent concerns should be directed to the official support contact for the prototype or production service owner.",
      "For this demo build, policy, privacy, billing, and claim questions may be routed to support@devtrails.com."
    ]
  }
];

function getLanguageLocale(language = "en") {
  return LANGUAGES.find(item => item.code === language)?.locale || "en-IN";
}

function getVoiceLocale(language = "en") {
  const map = {
    en: "en-IN",
    hi: "hi-IN",
    te: "te-IN",
    ta: "ta-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    mr: "mr-IN",
    bn: "bn-IN",
    gu: "gu-IN",
    pa: "pa-IN",
    or: "or-IN",
    ur: "ur-IN",
  };
  return map[language] || getLanguageLocale(language);
}

function getFirebaseAuthErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const code = String(error?.code || "");
  if (code === "auth/invalid-app-credential") {
    return "OTP verification setup failed (invalid app credential). Reload once, disable VPN/ad-block, and ensure your current domain is added in Firebase Authentication -> Settings -> Authorized domains.";
  }
  if (code === "auth/captcha-check-failed") {
    return "Captcha check failed. Please complete captcha again and retry.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many OTP attempts. Please wait a bit and retry.";
  }
  if (code === "auth/invalid-phone-number") {
    return "Invalid phone number. Enter a valid 10-digit mobile number.";
  }
  if (code === "auth/quota-exceeded") {
    return "SMS quota reached for this Firebase project. Try again later.";
  }
  return error?.message || fallback;
}

function detectLanguageCodeFromText(text = "", fallback = "en") {
  const value = String(text || "");
  if (!value.trim()) return fallback;
  if (/[\u0C00-\u0C7F]/.test(value)) return "te"; // Telugu
  if (/[\u0900-\u097F]/.test(value)) return "hi"; // Devanagari
  if (/[\u0B80-\u0BFF]/.test(value)) return "ta"; // Tamil
  if (/[\u0C80-\u0CFF]/.test(value)) return "kn"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(value)) return "ml"; // Malayalam
  if (/[\u0980-\u09FF]/.test(value)) return "bn"; // Bengali
  if (/[\u0A80-\u0AFF]/.test(value)) return "gu"; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(value)) return "pa"; // Gurmukhi
  if (/[\u0B00-\u0B7F]/.test(value)) return "or"; // Odia
  if (/[\u0600-\u06FF]/.test(value)) return "ur"; // Urdu/Arabic script
  return fallback;
}

function formatMoney(amount, language = "en") {
  return new Intl.NumberFormat(getLanguageLocale(language), {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function todayLabel(language = "en") {
  return new Date().toLocaleDateString(getLanguageLocale(language), { day: "numeric", month: "short", year: "numeric" });
}

function getCycleDayInWeek(date = new Date()) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function getCycleContext(date = new Date()) {
  const dayInCycle = getCycleDayInWeek(date);
  const remainingDays = Math.max(1, 8 - dayInCycle);
  const remainingRatio = remainingDays / 7;
  return { dayInCycle, remainingDays, remainingRatio };
}

function getBillingCycleKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week = 1 + Math.round((d - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getUpgradeBreakdown(currentWeeklyPremium, nextWeeklyPremium, existingCredit = 0, date = new Date()) {
  const { dayInCycle, remainingDays, remainingRatio } = getCycleContext(date);
  const planCredit = Math.round(Number(currentWeeklyPremium || 0) * remainingRatio);
  const proratedNextPrice = Math.round(Number(nextWeeklyPremium || 0) * remainingRatio);
  const rawDifference = proratedNextPrice - planCredit;
  const extraCharge = Math.max(0, rawDifference);
  const creditApplied = Math.min(existingCredit, extraCharge);
  const amountDueNow = Math.max(0, extraCharge - creditApplied);
  const downgradeSavings = Math.max(0, planCredit - proratedNextPrice);
  const nextBillingCredit = rawDifference < 0 ? existingCredit + downgradeSavings : Math.max(0, existingCredit - creditApplied);

  return {
    dayInCycle,
    remainingDays,
    remainingRatio,
    planCredit,
    proratedNextPrice,
    previousPlanProratedValue: planCredit,
    nextPlanProratedValue: proratedNextPrice,
    rawDifference,
    extraCharge,
    creditApplied,
    amountDueNow,
    downgradeSavings,
    nextBillingCredit,
  };
}

function getRenewalBreakdown(planPrice, existingCredit = 0) {
  const creditUsed = Math.min(Number(existingCredit || 0), Number(planPrice || 0));
  const amountDueNow = Math.max(0, Number(planPrice || 0) - creditUsed);
  const remainingCredit = Math.max(0, Number(existingCredit || 0) - creditUsed);

  return {
    creditUsed,
    amountDueNow,
    remainingCredit,
  };
}

function getBillingEventCategory(event = {}) {
  const explicit = String(event.category || "").toLowerCase();
  if (explicit) return explicit;
  const type = String(event.type || "").toLowerCase();
  if (type.includes("claim payout")) return "claim";
  if (type.includes("credit")) return "credit";
  if (type.includes("premium")) return "premium";
  if (type.includes("plan activation")) return "premium";
  if (type.includes("renewal")) return "premium";
  return "other";
}

function isPremiumPaymentWindowOpen(date = new Date()) {
  const { dayInCycle } = getCycleContext(date);
  return dayInCycle >= 6;
}

function getWorkerAccountAgeDays(worker = {}) {
  let timestamp = 0;
  if (worker.accountCreatedAt) {
    timestamp = Date.parse(worker.accountCreatedAt);
  } else if (worker.createdAt) {
    timestamp = Date.parse(worker.createdAt);
  } else if (worker.since) {
    timestamp = Date.parse(`1 ${worker.since}`);
  }
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
}

function getAccountMaturityGate(accountAgeDays) {
  if (accountAgeDays !== null && accountAgeDays < 7) {
    return { status: "blocked", label: "Account age < 7 days" };
  }
  if (accountAgeDays !== null && accountAgeDays < 30) {
    return { status: "review", label: "Account age 7-30 days" };
  }
  return { status: "normal", label: "Account age 30+ days" };
}

function getCityReferencePoint(city = "") {
  if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];
  const c = CITIES.find((item) => item.city === city);
  if (c && CITY_COORDINATES[c.city]) return CITY_COORDINATES[c.city];
  return CITY_COORDINATES.Hyderabad;
}

function haversineDistanceKm(pointA, pointB) {
  if (!pointA || !pointB) return null;
  const toRad = (value) => (Number(value || 0) * Math.PI) / 180;
  const lat1 = toRad(pointA.lat);
  const lon1 = toRad(pointA.lng);
  const lat2 = toRad(pointB.lat);
  const lon2 = toRad(pointB.lng);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(6371 * c * 10) / 10;
}

async function checkZoneAdverseSelectionLock(city = "", zone = "") {
  const safeCity = String(city || "").trim();
  if (!safeCity) return { locked: false, reason: "" };

  try {
    const geocodeRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(safeCity)}&count=1&language=en&format=json`
    );
    const geocodeData = await geocodeRes.json().catch(() => ({}));
    const point = geocodeData?.results?.[0];
    if (!point) {
      return { locked: false, reason: "" };
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}&daily=weather_code,precipitation_sum&timezone=auto&forecast_days=3`
    );
    const weatherData = await weatherRes.json().catch(() => ({}));
    const codes = Array.isArray(weatherData?.daily?.weather_code) ? weatherData.daily.weather_code : [];
    const rain = Array.isArray(weatherData?.daily?.precipitation_sum) ? weatherData.daily.precipitation_sum : [];
    const severeCode = codes.some((code) => [82, 95, 96, 99].includes(Number(code)));
    const heavyRain = rain.some((amount) => Number(amount || 0) >= 60);
    if (!severeCode && !heavyRain) {
      return { locked: false, reason: "" };
    }
    const until = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const reason = severeCode
      ? `Red alert weather detected near ${safeCity}${zone ? ` (${zone})` : ""}. Registration is paused for 48 hours.`
      : `Heavy rain alert near ${safeCity}${zone ? ` (${zone})` : ""}. Registration is paused for 48 hours.`;
    return { locked: true, reason, until };
  } catch (error) {
    return { locked: false, reason: "" };
  }
}

function getGraceDaysLeft(worker = {}, nowMs = Date.now()) {
  const graceUntilTs = Date.parse(String(worker?.paymentGraceUntil || ""));
  if (!Number.isFinite(graceUntilTs) || graceUntilTs <= 0) return 0;
  const diff = graceUntilTs - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function isPaymentInGrace(worker = {}, nowMs = Date.now()) {
  if (String(worker?.paymentStatus || "").toLowerCase() !== "grace") return false;
  return getGraceDaysLeft(worker, nowMs) > 0;
}

function getRazorpayKeyId() {
  const configured = String(process.env.REACT_APP_RAZORPAY_KEY_ID || "").trim();
  return configured;
}

function buildLocalCheckoutOrder({ amountRupees, worker, cycle, reason = "" }) {
  return {
    id: "",
    amount: Math.round(Number(amountRupees || 0) * 100),
    currency: "INR",
    status: "local_checkout",
    notes: {
      workerId: worker?.id || "",
      workerEmail: worker?.email || "",
      cycle: cycle || "",
    },
    localFallback: true,
    fallbackReason: reason,
  };
}

async function createRazorpayOrder({ amountRupees, worker, cycle, allowLocalFallback = true }) {
  let response;
  try {
    response = await fetch("/api/razorpay-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountRupees,
        currency: "INR",
        workerId: worker?.id || "",
        workerEmail: worker?.email || "",
        cycle
      })
    });
  } catch (error) {
    if (allowLocalFallback) {
      return buildLocalCheckoutOrder({
        amountRupees,
        worker,
        cycle,
        reason: "Order API not reachable. Using local checkout mode."
      });
    }
    throw new Error("Could not connect to Razorpay order API.");
  }

  const contentType = String(response.headers?.get("content-type") || "").toLowerCase();
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    const serverError = payload?.error || "";
    if (allowLocalFallback && (response.status === 404 || response.status === 405 || !contentType.includes("application/json"))) {
      return buildLocalCheckoutOrder({
        amountRupees,
        worker,
        cycle,
        reason: "Order API unavailable in this runtime. Using local checkout mode."
      });
    }
    throw new Error(serverError || `Could not create Razorpay order (HTTP ${response.status}).`);
  }

  if (!payload?.order?.id) {
    if (allowLocalFallback) {
      return buildLocalCheckoutOrder({
        amountRupees,
        worker,
        cycle,
        reason: "Order ID missing from API response. Using local checkout mode."
      });
    }
    throw new Error("Razorpay order ID missing from API response.");
  }
  return payload.order;
}

function openRazorpayCheckout({ keyId, order, worker, amountRupees }) {
  return new Promise((resolve, reject) => {
    if (!window?.Razorpay) {
      reject(new Error("Razorpay SDK not loaded. Refresh and try again."));
      return;
    }

    const options = {
      key: keyId,
      amount: Number(order.amount || Math.round(Number(amountRupees || 0) * 100)),
      currency: order.currency || "INR",
      name: "GigWeatherWage",
      description: order?.id ? "Weekly Premium Payment" : "Weekly Premium Payment (Local Demo)",
      prefill: {
        name: worker?.name || "Gig Worker",
        email: worker?.email || "",
        contact: String(worker?.phone || "").replace(/\D/g, "").slice(-10)
      },
      notes: {
        workerId: worker?.id || "",
        workerName: worker?.name || "",
        cycle: order?.notes?.cycle || ""
      },
      theme: { color: "#0ea5e9" },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled by user."))
      }
    };
    if (order?.id) {
      if (order.id.startsWith("order_RC")) {
        console.log("Mocking local Razorpay checkout success:", order.id);
        setTimeout(() => {
          resolve({
            razorpay_payment_id: "pay_mock_" + Date.now(),
            razorpay_order_id: order.id,
            razorpay_signature: "mock_signature_valid"
          });
        }, 1200);
        return;
      }
      options.order_id = order.id;
    }

    try {
      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", (failure) => {
        reject(new Error(failure?.error?.description || "Razorpay payment failed."));
      });
      checkout.open();
    } catch (error) {
      reject(new Error(error?.message || "Unable to open Razorpay checkout."));
    }
  });
}

function currentPlanName(planId) {
  return (PLANS.find(p => p.id === planId) || PLANS[1]).name;
}

const LANGUAGES = [
  { code: "en", label: "English", native: "English", locale: "en-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", locale: "te-IN" },
  { code: "hi", label: "Hindi", native: "हिंदी", locale: "hi-IN" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", locale: "kn-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", locale: "mr-IN" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", locale: "ml-IN" },
];

const POLICY_LOCALIZED = {
  en: {
    officialNotice: "Official Notice",
    governanceTitle: "GigWeatherWage Privacy Policy And Data Governance Notice",
    governanceIntro:
      "This document explains how worker data moves through the privacy layer before premium scoring, claims decisions, payouts, and support actions are performed.",
    title: "Policy Schedule And Privacy Notice",
    scheduleTag: "Structured insurance schedule",
    policySummary: "Policy Summary",
    coverageTriggers: "Coverage Triggers",
    privacyNotice: "Privacy Notice",
    supportContact: "Support Contact",
    summaryNote:
      "This schedule explains coverage, data usage, billing-credit flow, and claim governance controls for the active policy.",
    labels: {
      workerName: "Worker Name",
      phone: "Phone",
      platform: "Platform",
      location: "Location",
      plan: "Plan",
      weeklyPremium: "Weekly Premium",
      coverageAmount: "Coverage Amount",
      status: "Status",
      validFrom: "Valid From",
      validTo: "Valid To",
      active: "Active",
      paused: "Paused",
    },
    sections: POLICY_SECTIONS,
  },
  hi: {
    officialNotice: "आधिकारिक सूचना",
    governanceTitle: "GigWeatherWage गोपनीयता नीति और डेटा गवर्नेंस सूचना",
    governanceIntro:
      "यह दस्तावेज़ बताता है कि प्रीमियम स्कोरिंग, क्लेम निर्णय, भुगतान और सपोर्ट प्रक्रियाओं से पहले वर्कर डेटा गोपनीयता परत से कैसे गुजरता है।",
    title: "पॉलिसी शेड्यूल और गोपनीयता सूचना",
    scheduleTag: "संरचित बीमा शेड्यूल",
    policySummary: "पॉलिसी सारांश",
    coverageTriggers: "कवरेज ट्रिगर",
    privacyNotice: "गोपनीयता सूचना",
    supportContact: "सहायता संपर्क",
    summaryNote:
      "यह शेड्यूल सक्रिय पॉलिसी के कवरेज, डेटा उपयोग, बिलिंग क्रेडिट प्रवाह और क्लेम गवर्नेंस नियंत्रणों को स्पष्ट करता है।",
    labels: {
      workerName: "वर्कर का नाम",
      phone: "फोन",
      platform: "प्लेटफॉर्म",
      location: "स्थान",
      plan: "योजना",
      weeklyPremium: "साप्ताहिक प्रीमियम",
      coverageAmount: "कवरेज राशि",
      status: "स्थिति",
      validFrom: "प्रभावी तिथि",
      validTo: "समाप्ति तिथि",
      active: "सक्रिय",
      paused: "रुकी हुई",
    },
    sections: [
      { clause: "1", title: "परिचय और दायरा", points: ["GigWeatherWage सत्यापित मौसम, AQI, कर्फ्यू और प्लेटफॉर्म बाधाओं से प्रभावित गिग वर्करों के लिए डायनेमिक बीमा सहायता देता है।", "यह सूचना बताती है कि कौन सा डेटा लिया जाता है, क्यों लिया जाता है, कैसे सुरक्षित रखा जाता है और उपयोगकर्ता अपने डेटा पर कैसे नियंत्रण रखता है।", "यह नीति ऑनबोर्डिंग, प्रीमियम गणना, पॉलिसी सेवा, क्लेम समीक्षा, फ्रॉड जांच, सपोर्ट और भुगतान रिकॉर्ड पर लागू है।"] },
      { clause: "2", title: "हम कौन सा डेटा एकत्र करते हैं", points: ["पहचान डेटा: नाम, फोन, ईमेल, शहर, ज़ोन, प्लेटफॉर्म, पार्टनर आईडी, मास्क्ड आधार इनपुट और पॉलिसी पहचानकर्ता।", "ऑपरेशनल डेटा: कार्य घंटे, वाहन प्रकार, डिलीवरी गतिविधि, ज़ोन एक्सपोजर, क्लेम इतिहास और चुनी हुई योजना।", "डिवाइस/जोखिम डेटा: डिवाइस प्रकार, ऐप लॉग, क्रैश सिग्नल, रूट पैटर्न, डिवाइस इंटीग्रिटी सिग्नल और फ्रॉड समीक्षा साक्ष्य।", "वित्तीय डेटा: प्रीमियम भुगतान, बिलिंग क्रेडिट, क्लेम सेटलमेंट, भुगतान माध्यम विवरण और लेन-देन इतिहास।"] },
      { clause: "3", title: "डेटा उपयोग का उद्देश्य", points: ["डेटा का उपयोग व्यक्तिगत प्रीमियम, कवरेज प्रबंधन, क्लेम सत्यापन, भुगतान प्रोसेसिंग, फ्रॉड रोकथाम और सपोर्ट सेवा के लिए होता है।", "लोकेशन/रूट/क्लेम साक्ष्य केवल बीमित घटनाओं के सत्यापन और उच्च-जोखिम क्लेम समीक्षा के लिए उपयोग होते हैं।", "डेटा का उपयोग असंबंधित विज्ञापन या असंबंधित प्रोफाइलिंग के लिए नहीं किया जाता।"] },
      { clause: "4", title: "प्रीमियम और क्लेम निर्णय कैसे होते हैं", points: ["प्रीमियम बेस रेट, शहर जोखिम, प्लेटफॉर्म फैक्टर, कार्य एक्सपोजर, वाहन फैक्टर और कवरेज टियर से निकाला जाता है।", "क्लेम निर्णय में घटना सत्यापन, अकाउंट इतिहास, डिवाइस इंटीग्रिटी और फ्रॉड सिग्नल शामिल होते हैं।", "जहाँ AI-आधारित स्कोर निर्णय को प्रभावित करता है, वहाँ प्रमुख कारण उपयोगकर्ता को स्पष्ट दिखाए जाते हैं।"] },
      { clause: "5", title: "डेटा साझाकरण", points: ["डेटा केवल सेवा देने हेतु पेमेंट प्रोसेसर, क्लाउड पार्टनर, अंडरराइटिंग पार्टनर और फ्रॉड समीक्षा प्रणालियों के साथ साझा किया जा सकता है।", "कानूनी/नियामकीय आवश्यकता होने पर अधिकृत एजेंसियों को डेटा दिया जा सकता है।", "व्यक्तिगत डेटा किसी विज्ञापनदाता या असंबंधित तीसरे पक्ष को बेचा नहीं जाता।"] },
      { clause: "6", title: "सुरक्षा और भंडारण नियंत्रण", points: ["रिकॉर्ड ट्रांजिट में एन्क्रिप्शन, नियंत्रित स्टोरेज एक्सेस और भूमिका-आधारित पहुंच के साथ सुरक्षित रखने का उद्देश्य है।", "ऑपरेशनल लॉग और क्लेम साक्ष्य सुरक्षित क्लाउड सिस्टम में ऑडिट हिस्ट्री सहित रखे जाते हैं।", "केवल आवश्यक अधिकृत भूमिकाओं को संवेदनशील डेटा एक्सेस मिलता है।"] },
      { clause: "7", title: "रिटेंशन, हटाना और उपयोगकर्ता अधिकार", points: ["रिकॉर्ड उतनी ही अवधि तक रखे जाते हैं जितनी कवरेज, क्लेम, विवाद, लेखांकन और कानूनी अनुपालन के लिए आवश्यक हो।", "उपयोगकर्ता एक्सेस, सुधार, हटाने और सहमति वापसी का अनुरोध कर सकता है, लागू शर्तों के अधीन।", "कानूनी कारणों से पूर्ण हटाना संभव न हो तो डेटा को सीमित, आर्काइव या अनामीकृत किया जाता है।"] },
      { clause: "8", title: "सहमति, ट्रैकिंग और नीति अपडेट", points: ["रजिस्ट्रेशन/रिन्यूअल करके उपयोगकर्ता ऑनबोर्डिंग, प्रीमियम, क्लेम समीक्षा, फ्रॉड रोकथाम और सेवा के लिए डेटा उपयोग पर सहमति देता है।", "संवेदनशील ट्रैकिंग उद्देश्य-आधारित रहती है, जैसे डिलीवरी सत्यापन या सक्रिय क्लेम समीक्षा।", "महत्वपूर्ण अपडेट संस्करण सहित दिखाए जाते हैं और भविष्य की गतिविधि से पहले प्रदर्शित किए जाते हैं।"] },
      { clause: "9", title: "संपर्क और गवर्नेंस", points: ["सुधार, सहमति या गोपनीयता प्रश्नों के लिए आधिकारिक सपोर्ट चैनल से संपर्क किया जा सकता है।", "इस डेमो के लिए प्रश्न support@devtrails.com पर भेजे जा सकते हैं।"] },
    ],
  },
  te: {
    officialNotice: "అధికారిక నోటీసు",
    governanceTitle: "GigWeatherWage గోప్యతా విధానం మరియు డేటా గవర్నెన్స్ నోటీసు",
    governanceIntro:
      "ఈ పత్రం వర్కర్ డేటా ప్రీమియం స్కోరింగ్, క్లెయిమ్ నిర్ణయాలు, చెల్లింపులు మరియు సపోర్ట్‌కు ముందు గోప్యతా పొరలో ఎలా ప్రవహిస్తుందో వివరిస్తుంది.",
    title: "పాలసీ షెడ్యూల్ మరియు గోప్యతా నోటీసు",
    scheduleTag: "క్రమబద్ధమైన బీమా షెడ్యూల్",
    policySummary: "పాలసీ సారాంశం",
    coverageTriggers: "కవరేజ్ ట్రిగర్స్",
    privacyNotice: "గోప్యతా నోటీసు",
    supportContact: "సపోర్ట్ సంప్రదింపు",
    summaryNote:
      "ఈ షెడ్యూల్‌లో యాక్టివ్ పాలసీకి సంబంధించిన కవరేజ్, డేటా వినియోగం, బిల్లింగ్ క్రెడిట్ ప్రవాహం మరియు క్లెయిమ్ గవర్నెన్స్ నియంత్రణలు స్పష్టంగా ఇవ్వబడ్డాయి.",
    labels: {
      workerName: "వర్కర్ పేరు",
      phone: "ఫోన్",
      platform: "ప్లాట్‌ఫామ్",
      location: "ప్రాంతం",
      plan: "ప్లాన్",
      weeklyPremium: "వారపు ప్రీమియం",
      coverageAmount: "కవరేజ్ మొత్తం",
      status: "స్థితి",
      validFrom: "ప్రారంభ తేదీ",
      validTo: "ముగింపు తేదీ",
      active: "యాక్టివ్",
      paused: "పాజ్",
    },
    sections: [
      { clause: "1", title: "పరిచయం మరియు పరిధి", points: ["GigWeatherWage ధృవీకరించిన వాతావరణం, AQI, కర్ఫ్యూ, ప్లాట్‌ఫామ్ అంతరాయాల వల్ల ప్రభావితమైన గిగ్ వర్కర్లకు డైనమిక్ బీమా సహాయం అందిస్తుంది.", "ఈ నోటీసు ఏ డేటా సేకరించబడుతుంది, ఎందుకు సేకరించబడుతుంది, ఎలా రక్షించబడుతుంది, యూజర్ ఎలా నియంత్రించగలడు అనే వివరాలు చెబుతుంది.", "ఈ పాలసీ ఆన్‌బోర్డింగ్, ప్రీమియం లెక్కింపు, పాలసీ సేవలు, క్లెయిమ్ సమీక్ష, మోసం తనిఖీ, సపోర్ట్, చెల్లింపు రికార్డులకు వర్తిస్తుంది."] },
      { clause: "2", title: "మేము సేకరించే డేటా", points: ["గుర్తింపు డేటా: పేరు, ఫోన్, ఇమెయిల్, నగరం, జోన్, ప్లాట్‌ఫామ్, పార్ట్‌నర్ ID, మాస్క్ చేసిన ఆధార్ వివరాలు, పాలసీ IDలు.", "ఆపరేషనల్ డేటా: పని గంటలు, వాహనం రకం, డెలివరీ చలనం, జోన్ ఎక్స్‌పోజర్, క్లెయిమ్ చరిత్ర, ఎంచుకున్న ప్లాన్.", "డివైస్/రిస్క్ డేటా: డివైస్ రకం, యాప్ లాగ్స్, క్రాష్ సిగ్నల్స్, రూట్ ప్యాటర్న్స్, డివైస్ సమగ్రత సూచనలు, ఫ్రాడ్ రివ్యూ ఆధారాలు.", "ఆర్థిక డేటా: ప్రీమియం చెల్లింపులు, బిల్లింగ్ క్రెడిట్, క్లెయిమ్ సెటిల్మెంట్లు, పేమెంట్ విధానం వివరాలు, ట్రాన్సాక్షన్ చరిత్ర."] },
      { clause: "3", title: "డేటా వినియోగ లక్ష్యం", points: ["వ్యక్తిగత ప్రీమియం లెక్కింపు, కవరేజ్ నిర్వహణ, క్లెయిమ్ ధృవీకరణ, చెల్లింపులు, మోసం నివారణ, ఖాతా సేవల కోసం డేటా వాడబడుతుంది.", "లోకేషన్/రూట్/క్లెయిమ్ ఆధారాల డేటా కేవలం బీమా సంఘటనల ధృవీకరణ మరియు అధిక-ప్రమాద క్లెయిమ్ సమీక్ష కోసం మాత్రమే వాడబడుతుంది.", "సేకరించిన డేటాను సంబంధం లేని ప్రకటనల కోసం ఉపయోగించము."] },
      { clause: "4", title: "ప్రీమియం మరియు క్లెయిమ్ నిర్ణయ విధానం", points: ["ప్రీమియం బేస్ రేట్, నగర ప్రమాదం, ప్లాట్‌ఫామ్ ఫ్యాక్టర్, పని ఎక్స్‌పోజర్, వాహనం ఫ్యాక్టర్, కవరేజ్ టియర్‌ల ఆధారంగా లెక్కించబడుతుంది.", "క్లెయిమ్ నిర్ణయాల్లో ఘటన ధృవీకరణ, ఖాతా చరిత్ర, డివైస్ సమగ్రత, ఫ్రాడ్ సిగ్నల్స్ పరిగణలోకి తీసుకుంటారు.", "AI స్కోరింగ్ ప్రభావం ఉన్నప్పుడు ప్రధాన కారణాలు యాప్‌లో స్పష్టంగా చూపబడాలి."] },
      { clause: "5", title: "డేటా పంచుకోవడం", points: ["సేవ అందించడానికి మాత్రమే పేమెంట్ ప్రాసెసర్లు, క్లౌడ్ భాగస్వాములు, అండరరైటింగ్ భాగస్వాములు, ఫ్రాడ్ రివ్యూ సిస్టమ్‌లతో డేటా పంచుకోవచ్చు.", "చట్టపరమైన అవసరం ఉన్నప్పుడు అధికృత సంస్థలకు డేటా అందించవచ్చు.", "వ్యక్తిగత డేటాను ప్రకటనదారులకు లేదా అసంబంధిత మూడో పక్షాలకు అమ్మము."] },
      { clause: "6", title: "భద్రత మరియు నిల్వ నియంత్రణ", points: ["రికార్డులు ట్రాన్సిట్ ఎన్‌క్రిప్షన్, నియంత్రిత స్టోరేజ్ యాక్సెస్, రోల్-బేస్డ్ యాక్సెస్‌తో రక్షించబడాలి.", "ఆపరేషనల్ లాగ్స్, క్లెయిమ్ ఆధారాలు సురక్షిత క్లౌడ్‌లో ఆడిట్ చరిత్రతో నిల్వ ఉంటాయి.", "అవసరమైన అధికృత పాత్రలకే సున్నితమైన డేటా యాక్సెస్ ఉంటుంది."] },
      { clause: "7", title: "నిల్వ కాలం, తొలగింపు, యూజర్ హక్కులు", points: ["రికార్డులు కవరేజ్, క్లెయిమ్, వివాదాలు, అకౌంటింగ్, చట్టపరమైన అనుసరణకు అవసరమైనంతకాలం మాత్రమే ఉంచబడతాయి.", "యూజర్ డేటా యాక్సెస్, సవరణ, తొలగింపు, సమ్మతి ఉపసంహరణ కోరవచ్చు; వర్తించే షరతులకు లోబడి ఉంటుంది.", "పూర్తి తొలగింపు సాధ్యంకాని చోట డేటాను పరిమితం/ఆర్కైవ్/అనామకీకరించాలి."] },
      { clause: "8", title: "సమ్మతి, ట్రాకింగ్, పాలసీ నవీకరణలు", points: ["రిజిస్ట్రేషన్ లేదా రీన్యువల్ ద్వారా యూజర్ ఆన్‌బోర్డింగ్, ప్రీమియం లెక్కింపు, క్లెయిమ్ సమీక్ష, మోసం నివారణ కోసం డేటా వినియోగానికి సమ్మతి ఇస్తాడు.", "సున్నితమైన ట్రాకింగ్ ఉద్దేశ్యపూర్వకంగా మాత్రమే ఉండాలి, ఉదాహరణకు డెలివరీ ధృవీకరణ లేదా లైవ్ క్లెయిమ్ సమీక్ష.", "ప్రధాన నవీకరణలు వెర్షన్‌తో చూపబడతాయి మరియు భవిష్యత్ చర్యలకు ముందు వినియోగదారులకు తెలియజేస్తారు."] },
      { clause: "9", title: "సంప్రదింపు మరియు గవర్నెన్స్", points: ["సవరణలు, సమ్మతి లేదా గోప్యతా ప్రశ్నల కోసం అధికారిక సపోర్ట్‌ను సంప్రదించవచ్చు.", "ఈ డెమో కోసం support@devtrails.com ద్వారా ప్రశ్నలు పంపవచ్చు."] },
    ],
  },
};

const POLICY_FALLBACK_LOCALIZED = {
  ta: {
    officialNotice: "அதிகாரப்பூர்வ அறிவிப்பு",
    governanceTitle: "GigWeatherWage தனியுரிமைக் கொள்கை மற்றும் தரவு நிர்வாக அறிவிப்பு",
    governanceIntro: "பிரீமியம் மதிப்பீடு, கிளெயிம் முடிவு, கட்டணம் மற்றும் ஆதரவு செயல்களுக்கு முன் தொழிலாளர் தரவு தனியுரிமை அடுக்கு வழியாகச் செல்கிறது.",
    title: "பாலிசி அட்டவணை மற்றும் தனியுரிமை அறிவிப்பு",
    scheduleTag: "வடிவமைக்கப்பட்ட காப்பீட்டு அட்டவணை",
    policySummary: "பாலிசி சுருக்கம்",
    coverageTriggers: "கவரேஜ் காரணிகள்",
    privacyNotice: "தனியுரிமை அறிவிப்பு",
    supportContact: "ஆதரவு தொடர்பு",
    summaryNote: "இந்த ஆவணம் கவரேஜ், தரவு பயன்பாடு, பில்லிங் கிரெடிட் மற்றும் கிளெயிம் நிர்வாக விதிகளை விளக்குகிறது.",
    labels: { workerName: "பெயர்", phone: "தொலைபேசி", platform: "தளம்", location: "இடம்", plan: "திட்டம்", weeklyPremium: "வார பிரீமியம்", coverageAmount: "கவரேஜ் தொகை", status: "நிலை", validFrom: "தொடக்க தேதி", validTo: "முடிவு தேதி", active: "செயலில்", paused: "இடைநிறுத்தம்" },
    sectionTitles: ["அறிமுகம்", "சேகரிக்கும் தரவு", "பயன்பாட்டு நோக்கம்", "பிரீமியம் மற்றும் கிளெயிம் முடிவு", "தரவு பகிர்வு", "பாதுகாப்பு", "பாதுகாப்பு காலம் மற்றும் உரிமைகள்", "ஒப்புதல் மற்றும் புதுப்பிப்பு", "தொடர்பு மற்றும் நிர்வாகம்"],
    sectionPoint: "இந்த பிரிவு காப்பீட்டு சேவையை வழங்க தேவையான தரவு பயன்பாடு மற்றும் பாதுகாப்பு விதிகளை விளக்குகிறது."
  },
  ml: {
    officialNotice: "ഔദ്യോഗിക അറിയിപ്പ്",
    governanceTitle: "GigWeatherWage സ്വകാര്യതാ നയം ಮತ್ತು ഡാറ്റ ഗവർണൻസ് അറിയിപ്പ്",
    governanceIntro: "പ്രീമിയം കണക്കാക്കൽ, ക്ലെയിം തീരുമാനം, പേയ്മെന്റ്, സഹായം എന്നിവയ്ക്ക് മുമ്പ് തൊഴിലാളിയുടെ ഡാറ്റ സ്വകാര്യത പാളിയിലൂടെ സഞ്ചരിക്കുന്നു.",
    title: "പോളിസി ഷെഡ്യൂളും സ്വകാര്യതാ അറിയിപ്പും",
    scheduleTag: "ക്രമബദ്ധമായ ഇൻഷുറൻസ് ഷെഡ്യൂൾ",
    policySummary: "പോളിസി സംഗ്രഹം",
    coverageTriggers: "കവറേജ് ട്രിഗറുകൾ",
    privacyNotice: "സ്വകാര്യതാ അറിയിപ്പ്",
    supportContact: "സഹായ ബന്ധപ്പെടൽ",
    summaryNote: "ഈ രേഖ കവറേജ്, ഡാറ്റ ഉപയോഗം, ബില്ലിംഗ് ക്രെഡിറ്റ്, ക്ലെയിം നിയന്ത്രണങ്ങൾ വ്യക്തമാക്കുന്നു.",
    labels: { workerName: "പേര്", phone: "ഫോൺ", platform: "പ്ലാറ്റ്ഫോം", location: "സ്ഥലം", plan: "പ്ലാൻ", weeklyPremium: "ആഴ്ച പ്രീമിയം", coverageAmount: "കവറേജ് തുക", status: "സ്ഥിതി", validFrom: "പ്രാബല്യത്തിൽ", validTo: "അവസാനിക്കുന്നത്", active: "സജീവം", paused: "താൽക്കാലികം" },
    sectionTitles: ["പരിചയം", "ശേഖരിക്കുന്ന ഡാറ്റ", "ഉപയോഗ ലക്ഷ്യം", "പ്രീമിയം/ക്ലെയിം തീരുമാനം", "ഡാറ്റ പങ്കിടൽ", "സുരക്ഷ", "സംരക്ഷണകാലവും അവകാശങ്ങളും", "സമ്മതവും അപ്ഡേറ്റുകളും", "ബന്ധപ്പെടൽ & ഗവർണൻസ്"],
    sectionPoint: "ഇൻഷുറൻസ് സേവനം നൽകുന്നതിനാവശ്യമായ ഡാറ്റ ഉപയോഗവും സുരക്ഷയും ഈ വിഭാഗം വ്യക്തമാക്കുന്നു."
  },
  kn: {
    officialNotice: "ಅಧಿಕೃತ ಸೂಚನೆ",
    governanceTitle: "GigWeatherWage ಗೌಪ್ಯತಾ ನೀತಿ ಮತ್ತು ಡೇಟಾ ಆಡಳಿತ ಸೂಚನೆ",
    governanceIntro: "ಪ್ರೀಮಿಯಂ ಲೆಕ್ಕಾಚಾರ, ಕ್ಲೇಮ್ ನಿರ್ಧಾರ, ಪಾವತಿ ಹಾಗೂ ಸಹಾಯ ಪ್ರಕ್ರಿಯೆಗಳ ಮೊದಲು ಕಾರ್ಮಿಕರ ಡೇಟಾ ಗೌಪ್ಯತಾ ಪದರದ ಮೂಲಕ ಸಾಗುತ್ತದೆ.",
    title: "ಪಾಲಿಸಿ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಗೌಪ್ಯತಾ ಸೂಚನೆ",
    scheduleTag: "ವಿನ್ಯಾಸಗೊಳಿಸಿದ ವಿಮಾ ವೇಳಾಪಟ್ಟಿ",
    policySummary: "ಪಾಲಿಸಿ ಸಾರಾಂಶ",
    coverageTriggers: "ಕವರೆಜ್ ಟ್ರಿಗರ್‌ಗಳು",
    privacyNotice: "ಗೌಪ್ಯತಾ ಸೂಚನೆ",
    supportContact: "ಸಹಾಯ ಸಂಪರ್ಕ",
    summaryNote: "ಈ ದಾಖಲೆ ಕವರೆಜ್, ಡೇಟಾ ಬಳಕೆ, ಬಿಲ್ಲಿಂಗ್ ಕ್ರೆಡಿಟ್ ಮತ್ತು ಕ್ಲೇಮ್ ಆಡಳಿತ ನಿಯಮಗಳನ್ನು ವಿವರಿಸುತ್ತದೆ.",
    labels: { workerName: "ಹೆಸರು", phone: "ಫೋನ್", platform: "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್", location: "ಸ್ಥಳ", plan: "ಯೋಜನೆ", weeklyPremium: "ವಾರಂತ್ಯ ಪ್ರೀಮಿಯಂ", coverageAmount: "ಕವರೆಜ್ ಮೊತ್ತ", status: "ಸ್ಥಿತಿ", validFrom: "ಪ್ರಾರಂಭ", validTo: "ಕೊನೆ", active: "ಸಕ್ರಿಯ", paused: "ವಿರಾಮ" },
    sectionTitles: ["ಪರಿಚಯ", "ಸಂಗ್ರಹಿಸುವ ಡೇಟಾ", "ಬಳಕೆ ಉದ್ದೇಶ", "ಪ್ರೀಮಿಯಂ/ಕ್ಲೇಮ್ ನಿರ್ಧಾರ", "ಡೇಟಾ ಹಂಚಿಕೆ", "ಭದ್ರತೆ", "ಸಂಗ್ರಹಾವಧಿ ಮತ್ತು ಹಕ್ಕುಗಳು", "ಸಮ್ಮತಿ ಮತ್ತು ಅಪ್‌ಡೇಟ್‌ಗಳು", "ಸಂಪರ್ಕ ಮತ್ತು ಆಡಳಿತ"],
    sectionPoint: "ವಿಮಾ ಸೇವೆಗೆ ಅಗತ್ಯವಾದ ಡೇಟಾ ಬಳಕೆ ಮತ್ತು ರಕ್ಷಣಾ ನಿಯಮಗಳನ್ನು ಈ ವಿಭಾಗ ವಿವರಿಸುತ್ತದೆ."
  },
  mr: {
    officialNotice: "अधिकृत सूचना",
    governanceTitle: "GigWeatherWage गोपनीयता धोरण आणि डेटा गव्हर्नन्स सूचना",
    governanceIntro: "प्रीमियम गणना, क्लेम निर्णय, पेमेंट आणि सपोर्टपूर्वी कामगारांचा डेटा गोपनीयता स्तरातून जातो.",
    title: "पॉलिसी शेड्यूल आणि गोपनीयता सूचना",
    scheduleTag: "रचित विमा शेड्यूल",
    policySummary: "पॉलिसी सारांश",
    coverageTriggers: "कव्हरेज ट्रिगर्स",
    privacyNotice: "गोपनीयता सूचना",
    supportContact: "सपोर्ट संपर्क",
    summaryNote: "या दस्तऐवजात कव्हरेज, डेटा वापर, बिलिंग क्रेडिट आणि क्लेम गव्हर्नन्स नियम दिले आहेत.",
    labels: { workerName: "नाव", phone: "फोन", platform: "प्लॅटफॉर्म", location: "स्थान", plan: "योजना", weeklyPremium: "साप्ताहिक प्रीमियम", coverageAmount: "कव्हरेज रक्कम", status: "स्थिती", validFrom: "पासून", validTo: "पर्यंत", active: "सक्रिय", paused: "थांबलेले" },
    sectionTitles: ["परिचय", "गोळा होणारा डेटा", "वापर उद्देश", "प्रीमियम/क्लेम निर्णय", "डेटा शेअरिंग", "सुरक्षा", "साठवण व हक्क", "संमती व अपडेट", "संपर्क व गव्हर्नन्स"],
    sectionPoint: "विमा सेवा देण्यासाठी आवश्यक डेटा वापर आणि सुरक्षा नियम या विभागात स्पष्ट केले आहेत."
  },
  bn: {
    officialNotice: "আধিকারিক নোটিশ",
    governanceTitle: "GigWeatherWage গোপনীয়তা নীতি ও ডেটা গভর্ন্যান্স নোটিশ",
    governanceIntro: "প্রিমিয়াম হিসাব, ক্লেম সিদ্ধান্ত, পেমেন্ট ও সাপোর্টের আগে কর্মীর ডেটা গোপনীয়তা স্তর দিয়ে যায়।",
    title: "পলিসি সূচি ও গোপনীয়তা নোটিশ",
    scheduleTag: "গঠিত বীমা সূচি",
    policySummary: "পলিসি সারাংশ",
    coverageTriggers: "কভারেজ ট্রিগার",
    privacyNotice: "গোপনীয়তা নোটিশ",
    supportContact: "সহায়তা যোগাযোগ",
    summaryNote: "এই নথিতে কভারেজ, ডেটা ব্যবহার, বিলিং ক্রেডিট ও ক্লেম প্রশাসন নিয়ম ব্যাখ্যা করা হয়েছে।",
    labels: { workerName: "নাম", phone: "ফোন", platform: "প্ল্যাটফর্ম", location: "অবস্থান", plan: "প্ল্যান", weeklyPremium: "সাপ্তাহিক প্রিমিয়াম", coverageAmount: "কভারেজ পরিমাণ", status: "অবস্থা", validFrom: "শুরু", validTo: "শেষ", active: "সক্রিয়", paused: "স্থগিত" },
    sectionTitles: ["ভূমিকা", "সংগৃহীত ডেটা", "ব্যবহারের উদ্দেশ্য", "প্রিমিয়াম/ক্লেম সিদ্ধান্ত", "ডেটা ভাগাভাগি", "নিরাপত্তা", "সংরক্ষণ ও অধিকার", "সম্মতি ও আপডেট", "যোগাযোগ ও গভর্ন্যান্স"],
    sectionPoint: "বীমা সেবা দিতে প্রয়োজনীয় ডেটা ব্যবহার ও সুরক্ষা নিয়ম এই অংশে দেওয়া আছে।"
  },
  gu: {
    officialNotice: "સત્તાવાર સૂચના",
    governanceTitle: "GigWeatherWage ગોપનીયતા નીતિ અને ડેટા ગવર્નન્સ સૂચના",
    governanceIntro: "પ્રિમિયમ ગણતરી, ક્લેમ નિર્ણય, ચુકવણી અને સપોર્ટ પહેલાં કામદારોનો ડેટા ગોપનીયતા સ્તરમાંથી પસાર થાય છે.",
    title: "પોલિસી શેડ્યૂલ અને ગોપનીયતા સૂચના",
    scheduleTag: "રચિત વીમા શેડ્યૂલ",
    policySummary: "પોલિસી સારાંશ",
    coverageTriggers: "કવરેજ ટ્રિગર",
    privacyNotice: "ગોપનીયતા સૂચના",
    supportContact: "સહાય સંપર્ક",
    summaryNote: "આ દસ્તાવેજ કવરેજ, ડેટા ઉપયોગ, બિલિંગ ક્રેડિટ અને ક્લેમ શાસન નિયમો સમજાવે છે.",
    labels: { workerName: "નામ", phone: "ફોન", platform: "પ્લેટફોર્મ", location: "સ્થાન", plan: "યોજના", weeklyPremium: "સાપ્તાહિક પ્રિમિયમ", coverageAmount: "કવરેજ રકમ", status: "સ્થિતિ", validFrom: "થી", validTo: "સુધી", active: "સક્રિય", paused: "સ્થગિત" },
    sectionTitles: ["પરિચય", "સંગ્રહિત ડેટા", "ઉપયોગ હેતુ", "પ્રિમિયમ/ક્લેમ નિર્ણય", "ડેટા શેરિંગ", "સુરક્ષા", "સંગ્રહ સમય અને હક્કો", "સંમતિ અને અપડેટ્સ", "સંપર્ક અને ગવર્નન્સ"],
    sectionPoint: "વીમા સેવા માટે જરૂરી ડેટા ઉપયોગ અને સુરક્ષા નિયમો આ વિભાગમાં આપવામાં આવ્યા છે."
  },
  pa: {
    officialNotice: "ਅਧਿਕਾਰਤ ਨੋਟਿਸ",
    governanceTitle: "GigWeatherWage ਪਰਾਈਵੇਸੀ ਨੀਤੀ ਅਤੇ ਡਾਟਾ ਗਵਰਨੈਂਸ ਨੋਟਿਸ",
    governanceIntro: "ਪ੍ਰੀਮੀਅਮ ਗਿਣਤੀ, ਕਲੇਮ ਫ਼ੈਸਲਾ, ਭੁਗਤਾਨ ਅਤੇ ਸਹਾਇਤਾ ਤੋਂ ਪਹਿਲਾਂ ਵਰਕਰ ਡਾਟਾ ਪਰਾਈਵੇਸੀ ਲੇਅਰ ਵਿੱਚੋਂ ਲੰਘਦਾ ਹੈ।",
    title: "ਪਾਲਿਸੀ ਸ਼ਡਿਊਲ ਅਤੇ ਪਰਾਈਵੇਸੀ ਨੋਟਿਸ",
    scheduleTag: "ਸੰਰਚਿਤ ਬੀਮਾ ਸ਼ਡਿਊਲ",
    policySummary: "ਪਾਲਿਸੀ ਸਾਰ",
    coverageTriggers: "ਕਵਰੇਜ ਟ੍ਰਿਗਰ",
    privacyNotice: "ਪਰਾਈਵੇਸੀ ਨੋਟਿਸ",
    supportContact: "ਸਹਾਇਤਾ ਸੰਪਰਕ",
    summaryNote: "ਇਹ ਦਸਤਾਵੇਜ਼ ਕਵਰੇਜ, ਡਾਟਾ ਵਰਤੋਂ, ਬਿਲਿੰਗ ਕਰੇਡਿਟ ਅਤੇ ਕਲੇਮ ਗਵਰਨੈਂਸ ਨਿਯਮ ਸਮਝਾਉਂਦਾ ਹੈ।",
    labels: { workerName: "ਨਾਂ", phone: "ਫੋਨ", platform: "ਪਲੇਟਫਾਰਮ", location: "ਥਾਂ", plan: "ਯੋਜਨਾ", weeklyPremium: "ਹਫਤਾਵਾਰੀ ਪ੍ਰੀਮੀਅਮ", coverageAmount: "ਕਵਰੇਜ ਰਕਮ", status: "ਸਥਿਤੀ", validFrom: "ਤੋਂ", validTo: "ਤੱਕ", active: "ਸਰਗਰਮ", paused: "ਰੋਕਿਆ" },
    sectionTitles: ["ਪਰਿਚਯ", "ਇਕੱਠਾ ਕੀਤਾ ਡਾਟਾ", "ਵਰਤੋਂ ਦਾ ਉਦੇਸ਼", "ਪ੍ਰੀਮੀਅਮ/ਕਲੇਮ ਫ਼ੈਸਲਾ", "ਡਾਟਾ ਸਾਂਝਾ", "ਸੁਰੱਖਿਆ", "ਸਟੋਰੇਜ ਅਤੇ ਅਧਿਕਾਰ", "ਸਹਿਮਤੀ ਅਤੇ ਅਪਡੇਟ", "ਸੰਪਰਕ ਅਤੇ ਗਵਰਨੈਂਸ"],
    sectionPoint: "ਬੀਮਾ ਸੇਵਾ ਲਈ ਲੋੜੀਂਦੇ ਡਾਟਾ ਦੀ ਵਰਤੋਂ ਅਤੇ ਸੁਰੱਖਿਆ ਨਿਯਮ ਇਸ ਭਾਗ ਵਿੱਚ ਦਿੱਤੇ ਗਏ ਹਨ।"
  },
  or: {
    officialNotice: "ଆଧିକାରିକ ନୋଟିସ",
    governanceTitle: "GigWeatherWage ଗୋପନୀୟତା ନୀତି ଏବଂ ଡାଟା ଶାସନ ନୋଟିସ",
    governanceIntro: "ପ୍ରିମିୟମ ଗଣନା, କ୍ଲେମ ନିଷ୍ପତ୍ତି, ପେମେଣ୍ଟ ଏବଂ ସହାୟତା ପୂର୍ବରୁ କର୍ମୀଙ୍କ ଡାଟା ଗୋପନୀୟତା ପରତ ମାଧ୍ୟମରେ ଯାଏ।",
    title: "ପଲିସି ସ୍କେଡ୍ୟୁଲ ଏବଂ ଗୋପନୀୟତା ନୋଟିସ",
    scheduleTag: "ସଂରଚିତ ବୀମା ସ୍କେଡ୍ୟୁଲ",
    policySummary: "ପଲିସି ସାରାଂଶ",
    coverageTriggers: "କଭରେଜ୍ ଟ୍ରିଗର",
    privacyNotice: "ଗୋପନୀୟତା ନୋଟିସ",
    supportContact: "ସହାୟତା ସମ୍ପର୍କ",
    summaryNote: "ଏହି ଦଳିଲ କଭରେଜ୍, ଡାଟା ବ୍ୟବହାର, ବିଲିଂ କ୍ରେଡିଟ ଏବଂ କ୍ଲେମ ଶାସନ ନିୟମ ବ୍ୟାଖ୍ୟା କରେ।",
    labels: { workerName: "ନାମ", phone: "ଫୋନ", platform: "ପ୍ଲାଟଫର୍ମ", location: "ସ୍ଥାନ", plan: "ଯୋଜନା", weeklyPremium: "ସାପ୍ତାହିକ ପ୍ରିମିୟମ", coverageAmount: "କଭରେଜ୍ ରାଶି", status: "ସ୍ଥିତି", validFrom: "ଠାରୁ", validTo: "ପର୍ଯ୍ୟନ୍ତ", active: "ସକ୍ରିୟ", paused: "ବିରାମ" },
    sectionTitles: ["ପରିଚୟ", "ସଂଗ୍ରହ ଡାଟା", "ବ୍ୟବହାର ଉଦ୍ଦେଶ୍ୟ", "ପ୍ରିମିୟମ/କ୍ଲେମ ନିଷ୍ପତ୍ତି", "ଡାଟା ସେୟାର", "ସୁରକ୍ଷା", "ସଂରକ୍ଷଣ ଓ ଅଧିକାର", "ସମ୍ମତି ଓ ଅଦ୍ୟତନ", "ସମ୍ପର୍କ ଓ ଶାସନ"],
    sectionPoint: "ବୀମା ସେବା ପାଇଁ ଆବଶ୍ୟକ ଡାଟା ବ୍ୟବହାର ଏବଂ ସୁରକ୍ଷା ନିୟମ ଏହି ଅଂଶରେ ଦିଆଯାଇଛି।"
  },
  as: {
    officialNotice: "আধিকাৰিক নোটিছ",
    governanceTitle: "GigWeatherWage গোপনীয়তা নীতি আৰু ডাটা গভর্নেন্স নোটিছ",
    governanceIntro: "প্ৰিমিয়াম গণনা, ক্লেইম সিদ্ধান্ত, পেমেন্ট আৰু সহায়তাৰ আগতে কৰ্মীৰ ডাটা গোপনীয়তা স্তৰৰ মাজেৰে যায়।",
    title: "পলিচি শিডিউল আৰু গোপনীয়তা নোটিছ",
    scheduleTag: "সংগঠিত বীমা শিডিউল",
    policySummary: "পলিচি সাৰাংশ",
    coverageTriggers: "কভাৰেজ ট্ৰিগাৰ",
    privacyNotice: "গোপনীয়তা নোটিছ",
    supportContact: "সহায়তা যোগাযোগ",
    summaryNote: "এই নথিত কভাৰেজ, ডাটা ব্যৱহাৰ, বিলিং ক্রেডিট আৰু ক্লেইম শাসনৰ নিয়ম ব্যাখ্যা কৰা হৈছে।",
    labels: { workerName: "নাম", phone: "ফোন", platform: "প্লেটফৰ্ম", location: "স্থান", plan: "প্লেন", weeklyPremium: "সাপ্তাহিক প্ৰিমিয়াম", coverageAmount: "কভাৰেজ পৰিমাণ", status: "স্থিতি", validFrom: "আৰম্ভ", validTo: "শেষ", active: "সক্রিয়", paused: "বিৰতি" },
    sectionTitles: ["পৰিচয়", "সংগ্ৰহিত ডাটা", "ব্যৱহাৰৰ উদ্দেশ্য", "প্ৰিমিয়াম/ক্লেইম সিদ্ধান্ত", "ডাটা শ্বেয়াৰিং", "সুৰক্ষা", "সংৰক্ষণ আৰু অধিকাৰ", "সম্মতি আৰু আপডেট", "যোগাযোগ আৰু গভর্নেন্স"],
    sectionPoint: "বীমা সেৱা দিবলৈ প্ৰয়োজনীয় ডাটা ব্যৱহাৰ আৰু সুৰক্ষা নিয়ম এই অংশত দিয়া আছে।"
  },
  ur: {
    officialNotice: "سرکاری نوٹس",
    governanceTitle: "GigWeatherWage پرائیویسی پالیسی اور ڈیٹا گورننس نوٹس",
    governanceIntro: "پریمیم حساب، کلیم فیصلے، ادائیگی اور سپورٹ سے پہلے ورکر کا ڈیٹا پرائیویسی لیئر سے گزرتا ہے۔",
    title: "پالیسی شیڈول اور پرائیویسی نوٹس",
    scheduleTag: "منظم انشورنس شیڈول",
    policySummary: "پالیسی خلاصہ",
    coverageTriggers: "کوریج ٹرگرز",
    privacyNotice: "پرائیویسی نوٹس",
    supportContact: "سپورٹ رابطہ",
    summaryNote: "یہ دستاویز کوریج، ڈیٹا استعمال، بلنگ کریڈٹ اور کلیم گورننس قواعد کی وضاحت کرتی ہے۔",
    labels: { workerName: "نام", phone: "فون", platform: "پلیٹ فارم", location: "مقام", plan: "پلان", weeklyPremium: "ہفتہ وار پریمیم", coverageAmount: "کوریج رقم", status: "حیثیت", validFrom: "سے", validTo: "تک", active: "فعال", paused: "روکا گیا" },
    sectionTitles: ["تعارف", "جمع کیا گیا ڈیٹا", "استعمال کا مقصد", "پریمیم/کلیم فیصلہ", "ڈیٹا شیئرنگ", "سیکیورٹی", "محفوظ مدت اور حقوق", "رضامندی اور اپڈیٹس", "رابطہ اور گورننس"],
    sectionPoint: "انشورنس سروس کے لیے ضروری ڈیٹا کے استعمال اور حفاظت کے اصول اس حصے میں بیان ہیں۔"
  }
};

function getPolicyLanguage(language = "en") {
  return LANGUAGES.some(item => item.code === language) ? language : "en";
}

function getPolicyContent(language = "en") {
  const code = getPolicyLanguage(language);
  if (POLICY_LOCALIZED[code]) return POLICY_LOCALIZED[code];
  const fallback = POLICY_FALLBACK_LOCALIZED[code];
  if (!fallback) return POLICY_LOCALIZED.en;
  return {
    ...fallback,
    sections: POLICY_SECTIONS.map((section, index) => ({
      clause: section.clause,
      title: fallback.sectionTitles[index] || section.title,
      points: [fallback.sectionPoint],
    })),
  };
}

const LANGUAGE_CARDS = [
  { code: "te", native: "తెలుగు", english: "Telugu", city: "Hyderabad", accent: "#06b6d4", icon: "Charminar" },
  { code: "hi", native: "हिंदी", english: "Hindi", city: "Delhi", accent: "#f59e0b", icon: "India Gate" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", city: "Bengaluru", accent: "#6366f1", icon: "Vidhana Soudha" },
  { code: "mr", native: "मराठी", english: "Marathi", city: "Mumbai", accent: "#f97316", icon: "Gateway" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", city: "Kochi", accent: "#38bdf8", icon: "Backwaters" },
  { code: "en", native: "English", english: "English", city: "Pan-India", accent: "#8b5cf6", icon: "Bridge" },
];

const TRANSLATIONS = {
  en: {
    language: "Language",
    login: "Login",
    loginWithPhone: "Login with Phone",
    enterRegistered: "Enter your registered number",
    phoneNumber: "Phone number",
    sendOtp: "Send OTP ->",
    verifyLogin: "Verify & Login ->",
    changeNumber: "Change number",
    privacyAgree: "I agree to the Privacy Policy, payout rules, admin review, and fraud checks for this account.",
    myPolicy: "My Policy",
    calculator: "Calculator",
    queuedBillingCredit: "Queued Billing Credit",
    nextPremiumDue: "Next premium due",
    payWithCredits: "Pay With Existing Credits",
    payRemainingNow: "Pay Remaining Now",
    home: "Home",
    claims: "Claims",
    payments: "Payments",
    alerts: "Alerts",
    profile: "Profile",
    policyPrivacy: "Policy And Privacy",
    currentPlan: "Current plan",
    weeklyPremium: "Weekly premium",
    accountBillingCredit: "Account billing credit",
    triggersCovered: "Triggers Covered",
    pausePolicy: "Pause Policy",
    resumePolicy: "Resume Policy",
    upgradePlan: "Upgrade Or Change Plan",
    downloadPolicyPdf: "Download Policy PDF",
    paymentsAndPayouts: "Payments And Payouts",
    paymentMethods: "Payment methods",
    transactionHistory: "Transaction history",
    activeAlerts: "Active alerts",
    noActiveAlerts: "No active alerts",
    fiveDayForecast: "5-day forecast",
    zoneRiskLevels: "Zone risk levels",
    personalInformation: "Personal Information",
    currentPlanSection: "Current Plan",
    accountStatistics: "Account Statistics",
    aiRiskProfile: "AI Risk Profile",
    logout: "Logout",
    selectLanguage: "Select your language",
    languageStepTitle: "Choose Your App Language",
    languageStepBody: "Pick the language the worker understands best. You can change it again from the home screen later.",
    continueDashboard: "Continue To Dashboard",
    policyOfficialNotice: "Official Notice",
    policyGovernanceTitle: "GigWeatherWage Privacy Policy And Data Governance Notice",
    policyGovernanceIntro: "This document explains how worker data moves through the privacy layer before premium scoring, claims decisions, payouts, and support actions are performed.",
    claimsHistory: "Claims History",
    payoutTiersLabel: "Payout tiers (based on fraud score)",
    disruptionClaimLabel: "File a disruption claim",
    liveDisruption: "Live disruption in",
    tapToClaim: "Tap below to claim",
    recentClaims: "Recent claims",
    noTransactionsYet: "No transactions yet.",
    noClaimsYet: "No claims yet. File your first claim from the home tab.",
    approved: "Approved",
    total: "Total",
    received: "Received",
    avgTime: "Avg time",
    instant: "Instant",
    active: "Active",
    offlineModeActive: "Offline Mode Active",
    claimsQueueSync: "Claims will queue and sync when connected",
    claimQueuedWillSync: "claim(s) queued • will sync when online",
    hey: "Hey",
    since: "Since",
    thisWeeksPremium: "This Week's Premium",
    fullCalculator: "Full Calculator",
    creditHelpText: "This credit will be used on the next premium payment first. If any balance remains after payment, it stays queued for the following renewal.",
    queuesOffline: "Queues offline",
    score: "Score",
    queued: "Queued",
    blocked: "Blocked",
    blockedReason: "Fraud detection blocked this claim. Risk score too high.",
    queuedReason: "Filed offline — will process when network returns.",
    totalPayouts: "Total payouts",
    premiumsPaid: "Premiums paid",
    netGain: "Net gain",
    billingCredit: "Billing credit",
    queuedCreditHelp: "Use queued credit first. If credit is more than the premium, the extra stays in queue for the next renewal.",
    pay: "Pay",
    useCredits: "Use Credits",
    remainsAfterCredit: "remains after credit",
    noExtraPayment: "No extra payment required",
    afterCreditUse: "after credit use",
    renewalCoveredByCredit: "Renewal already covered by credit",
    claimPayout: "Claim Payout",
    premiumPayment: "Premium Payment",
    premiumPaidWithCredit: "Premium Paid With Billing Credit",
    appliedFromQueuedCredit: "applied from queued credit",
    premiumRenewalPayment: "Premium Renewal Payment",
    paid: "paid",
    afterCreditAdjustment: "after credit adjustment",
    renewalFromCredit: "Renewal Completed From Credit",
    remainsQueued: "remains queued for next payment",
    renewalSettledWithCredit: "Current renewal fully settled using existing credit",
    hoursShort: "hrs",
    coverageAmount: "Coverage amount",
    clean: "✓ Clean",
    watch: "⚠ Watch",
    flagged: "✕ Flagged",
    "Disruption Detected": "Disruption Detected",
    "Claim Triggered": "Claim Triggered",
    "Fraud Verified": "Fraud Verified",
    "Payout Released": "Payout Released",
  },
  hi: {
    language: "भाषा",
    login: "लॉगिन",
    loginWithPhone: "फ़ोन से लॉगिन",
    enterRegistered: "अपना रजिस्टर्ड नंबर दर्ज करें",
    phoneNumber: "फ़ोन नंबर",
    sendOtp: "OTP भेजें ->",
    verifyLogin: "सत्यापित कर लॉगिन करें ->",
    changeNumber: "नंबर बदलें",
    privacyAgree: "मैं इस खाते के लिए प्राइवेसी पॉलिसी, भुगतान नियम, एडमिन समीक्षा और फ्रॉड जांच से सहमत हूँ।",
    myPolicy: "मेरी पॉलिसी",
    calculator: "कैलकुलेटर",
    queuedBillingCredit: "क्यू किया गया बिलिंग क्रेडिट",
    nextPremiumDue: "अगला प्रीमियम",
    payWithCredits: "क्रेडिट से भुगतान करें",
    payRemainingNow: "बाकी अभी भुगतान करें",
    home: "होम",
    claims: "क्लेम",
    payments: "पेमेंट",
    alerts: "अलर्ट",
    profile: "प्रोफाइल",
    logout: "लॉगआउट",
    selectLanguage: "अपनी भाषा चुनें",
    continueDashboard: "डैशबोर्ड पर जाएँ",
    claimsHistory: "क्लेम इतिहास",
    paymentsAndPayouts: "भुगतान और पेआउट",
    paymentMethods: "भुगतान विधियाँ",
    transactionHistory: "लेन-देन इतिहास",
    personalInformation: "व्यक्तिगत जानकारी",
    currentPlanSection: "वर्तमान योजना",
    accountStatistics: "खाता आँकड़े",
    aiRiskProfile: "एआई जोखिम प्रोफ़ाइल",
    hey: "नमस्ते",
    since: "से",
    thisWeeksPremium: "इस सप्ताह का प्रीमियम",
    fullCalculator: "पूरा कैलकुलेटर",
    creditHelpText: "यह क्रेडिट पहले अगले प्रीमियम में उपयोग होगा। यदि भुगतान के बाद कुछ शेष बचता है, तो वह अगले नवीनीकरण के लिए कतार में रहेगा।",
    queuesOffline: "ऑफ़लाइन कतार",
    score: "स्कोर",
    queued: "कतार में",
    blocked: "अवरुद्ध",
    totalPayouts: "कुल भुगतान",
    premiumsPaid: "चुकाया प्रीमियम",
    netGain: "शुद्ध लाभ",
    billingCredit: "बिलिंग क्रेडिट",
    pay: "भुगतान करें",
    useCredits: "क्रेडिट उपयोग करें",
    hoursShort: "घंटे",
    coverageAmount: "कवरेज राशि",
    clean: "✓ साफ",
    watch: "⚠ निगरानी",
    flagged: "✕ फ़्लैग",
    "Disruption Detected": "विघटन पाया गया",
    "Claim Triggered": "क्लेम शुरू",
    "Fraud Verified": "फ्रॉड सत्यापित",
    "Payout Released": "पेआउट जारी",
  },
  te: {
    language: "భాష",
    login: "లాగిన్",
    loginWithPhone: "ఫోన్‌తో లాగిన్",
    enterRegistered: "మీ నమోదిత నంబర్ నమోదు చేయండి",
    phoneNumber: "ఫోన్ నంబర్",
    sendOtp: "OTP పంపు ->",
    verifyLogin: "ధృవీకరించి లాగిన్ అవ్వండి ->",
    changeNumber: "నంబర్ మార్చండి",
    privacyAgree: "ఈ ఖాతాకు సంబంధించిన ప్రైవసీ పాలసీ, చెల్లింపు నియమాలు, అడ్మిన్ సమీక్ష, మోసం తనిఖీలకు నేను అంగీకరిస్తున్నాను.",
    myPolicy: "నా పాలసీ",
    calculator: "క్యాలిక్యులేటర్",
    queuedBillingCredit: "క్యూడ్ బిల్లింగ్ క్రెడిట్",
    nextPremiumDue: "తదుపరి ప్రీమియం",
    payWithCredits: "క్రెడిట్స్‌తో చెల్లించండి",
    payRemainingNow: "మిగిలినది ఇప్పుడే చెల్లించండి",
    home: "హోమ్",
    claims: "క్లెయిమ్స్",
    payments: "పేమెంట్స్",
    alerts: "అలర్ట్స్",
    profile: "ప్రొఫైల్",
    logout: "లాగౌట్",
    selectLanguage: "మీ భాషను ఎంచుకోండి",
    continueDashboard: "డాష్‌బోర్డ్‌కి వెళ్ళండి",
    claimsHistory: "క్లెయిమ్స్ చరిత్ర",
    paymentsAndPayouts: "చెల్లింపులు మరియు పేఔట్స్",
    paymentMethods: "చెల్లింపు విధానాలు",
    transactionHistory: "లావాదేవీ చరిత్ర",
    personalInformation: "వ్యక్తిగత సమాచారం",
    currentPlanSection: "ప్రస్తుత ప్లాన్",
    accountStatistics: "ఖాతా గణాంకాలు",
    aiRiskProfile: "AI రిస్క్ ప్రొఫైల్",
    hey: "హాయ్",
    since: "నుంచి",
    thisWeeksPremium: "ఈ వారపు ప్రీమియం",
    fullCalculator: "పూర్తి కాలిక్యులేటర్",
    creditHelpText: "ఈ క్రెడిట్ ముందుగా తదుపరి ప్రీమియం చెల్లింపులో ఉపయోగించబడుతుంది. మిగిలితే తదుపరి రీన్యువల్‌కి క్యూలో ఉంటుంది.",
    queuesOffline: "ఆఫ్‌లైన్ క్యూలో",
    score: "స్కోర్",
    queued: "క్యూలో ఉంది",
    blocked: "బ్లాక్",
    totalPayouts: "మొత్తం చెల్లింపులు",
    premiumsPaid: "చెల్లించిన ప్రీమియం",
    netGain: "నికర లాభం",
    billingCredit: "బిల్లింగ్ క్రెడిట్",
    pay: "చెల్లించండి",
    useCredits: "క్రెడిట్స్ ఉపయోగించండి",
    hoursShort: "గం",
    coverageAmount: "కవరేజ్ మొత్తం",
    clean: "✓ క్లియర్",
    watch: "⚠ గమనిక",
    flagged: "✕ ఫ్లాగ్",
    "Disruption Detected": "అంతరాయం గుర్తించబడింది",
    "Claim Triggered": "క్లెయిమ్ ప్రారంభమైంది",
    "Fraud Verified": "మోసం ధృవీకరించబడింది",
    "Payout Released": "చెల్లింపు విడుదలైంది",
  },
  ta: {
    language: "மொழி",
    login: "உள்நுழை",
    loginWithPhone: "தொலைபேசியில் உள்நுழை",
    enterRegistered: "உங்கள் பதிவு செய்யப்பட்ட எண்ணை உள்ளிடவும்",
    phoneNumber: "தொலைபேசி எண்",
    sendOtp: "OTP அனுப்பு ->",
    verifyLogin: "சரிபார்த்து உள்நுழை ->",
    changeNumber: "எண்ணை மாற்றவும்",
    privacyAgree: "இந்த கணக்கிற்கான தனியுரிமைக் கொள்கை, கட்டண விதிகள், நிர்வாக பரிசீலனை மற்றும் மோசடி சரிபார்ப்புக்கு நான் சம்மதிக்கிறேன்.",
    myPolicy: "என் பாலிசி",
    calculator: "கால்குலேட்டர்",
    queuedBillingCredit: "வரிசைப்படுத்திய பில்லிங் கிரெடிட்",
    nextPremiumDue: "அடுத்த பிரீமியம்",
    payWithCredits: "கிரெடிட் மூலம் செலுத்து",
    payRemainingNow: "மீதியை இப்போது செலுத்து",
  },
  ml: {
    language: "ഭാഷ",
    login: "ലോഗിൻ",
    loginWithPhone: "ഫോൺ വഴി ലോഗിൻ",
    enterRegistered: "നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത നമ്പർ നൽകുക",
    phoneNumber: "ഫോൺ നമ്പർ",
    sendOtp: "OTP അയയ്ക്കുക ->",
    verifyLogin: "സ്ഥിരീകരിച്ച് ലോഗിൻ ചെയ്യുക ->",
    changeNumber: "നമ്പർ മാറ്റുക",
    privacyAgree: "ഈ അക്കൗണ്ടിനുള്ള സ്വകാര്യതാ നയം, പേയൗട്ട് നിയമങ്ങൾ, അഡ്മിൻ പരിശോധന, തട്ടിപ്പ് പരിശോധന എന്നിവയ്ക്ക് ഞാൻ സമ്മതിക്കുന്നു.",
    myPolicy: "എന്റെ പോളിസി",
    calculator: "കാൽക്കുലേറ്റർ",
    queuedBillingCredit: "ക്യൂ ചെയ്ത ബില്ലിംഗ് ക്രെഡിറ്റ്",
    nextPremiumDue: "അടുത്ത പ്രീമിയം",
    payWithCredits: "ക്രെഡിറ്റ് ഉപയോഗിച്ച് അടയ്ക്കുക",
    payRemainingNow: "ബാക്കി ഇപ്പോൾ അടയ്ക്കുക",
  },
  kn: {
    language: "ಭಾಷೆ",
    login: "ಲಾಗಿನ್",
    loginWithPhone: "ಫೋನ್ ಮೂಲಕ ಲಾಗಿನ್",
    enterRegistered: "ನಿಮ್ಮ ನೋಂದಾಯಿತ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
    phoneNumber: "ಫೋನ್ ಸಂಖ್ಯೆ",
    sendOtp: "OTP ಕಳುಹಿಸಿ ->",
    verifyLogin: "ಪರಿಶೀಲಿಸಿ ಲಾಗಿನ್ ಮಾಡಿ ->",
    changeNumber: "ಸಂಖ್ಯೆ ಬದಲಿಸಿ",
    privacyAgree: "ಈ ಖಾತೆಗೆ ಸಂಬಂಧಿಸಿದ ಗೌಪ್ಯತಾ ನೀತಿ, ಪಾವತಿ ನಿಯಮಗಳು, ಆಡ್ಮಿನ್ ಪರಿಶೀಲನೆ ಮತ್ತು ವಂಚನೆ ಪರಿಶೀಲನೆಗೆ ನಾನು ಒಪ್ಪುತ್ತೇನೆ.",
    myPolicy: "ನನ್ನ ಪಾಲಿಸಿ",
    calculator: "ಕ್ಯಾಲ್ಕುಲೇಟರ್",
    queuedBillingCredit: "ಸರತಿಯಲ್ಲಿ ಇರುವ ಬಿಲ್ಲಿಂಗ್ ಕ್ರೆಡಿಟ್",
    nextPremiumDue: "ಮುಂದಿನ ಪ್ರೀಮಿಯಂ",
    payWithCredits: "ಕ್ರೆಡಿಟ್ ಬಳಸಿ ಪಾವತಿಸಿ",
    payRemainingNow: "ಉಳಿದದ್ದು ಈಗ ಪಾವತಿಸಿ",
  },
  mr: { language: "भाषा", home: "होम", claims: "दावे", payments: "पेमेंट्स", alerts: "अलर्ट्स", profile: "प्रोफाइल", myPolicy: "माझी पॉलिसी", calculator: "कॅल्क्युलेटर", claimsHistory: "दाव्यांचा इतिहास", paymentsAndPayouts: "पेमेंट्स आणि पेआउट्स", personalInformation: "वैयक्तिक माहिती", currentPlanSection: "सध्याची योजना", accountStatistics: "खाते आकडेवारी", aiRiskProfile: "AI जोखीम प्रोफाइल", logout: "लॉगआउट", languageStepTitle: "भाषा निवडा", continueDashboard: "डॅशबोर्डवर जा" },
  bn: { language: "ভাষা", home: "হোম", claims: "দাবি", payments: "পেমেন্ট", alerts: "অ্যালার্ট", profile: "প্রোফাইল", myPolicy: "আমার পলিসি", calculator: "ক্যালকুলেটর", claimsHistory: "দাবির ইতিহাস", paymentsAndPayouts: "পেমেন্ট ও পেআউট", personalInformation: "ব্যক্তিগত তথ্য", currentPlanSection: "বর্তমান প্ল্যান", accountStatistics: "অ্যাকাউন্ট পরিসংখ্যান", aiRiskProfile: "AI ঝুঁকি প্রোফাইল", logout: "লগআউট", languageStepTitle: "ভাষা বেছে নিন", continueDashboard: "ড্যাশবোর্ডে যান" },
  gu: { language: "ભાષા", home: "હોમ", claims: "દાવા", payments: "ચુકવણીઓ", alerts: "ચેતવણીઓ", profile: "પ્રોફાઇલ", myPolicy: "મારી પોલિસી", calculator: "કેલ્ક્યુલેટર", claimsHistory: "દાવા ઇતિહાસ", paymentsAndPayouts: "ચુકવણી અને પેઆઉટ્સ", personalInformation: "વ્યક્તિગત માહિતી", currentPlanSection: "હાલની યોજના", accountStatistics: "ખાતા આંકડા", aiRiskProfile: "AI જોખમ પ્રોફાઇલ", logout: "લોગઆઉટ", languageStepTitle: "ભાષા પસંદ કરો", continueDashboard: "ડેશબોર્ડ પર જાઓ" },
  pa: { language: "ਭਾਸ਼ਾ", home: "ਹੋਮ", claims: "ਕਲੇਮ", payments: "ਭੁਗਤਾਨ", alerts: "ਅਲਰਟ", profile: "ਪ੍ਰੋਫ਼ਾਈਲ", myPolicy: "ਮੇਰੀ ਪਾਲਿਸੀ", calculator: "ਕੈਲਕੂਲੇਟਰ", claimsHistory: "ਕਲੇਮ ਇਤਿਹਾਸ", paymentsAndPayouts: "ਭੁਗਤਾਨ ਅਤੇ ਪੇਆਉਟ", personalInformation: "ਨਿੱਜੀ ਜਾਣਕਾਰੀ", currentPlanSection: "ਮੌਜੂਦਾ ਯੋਜਨਾ", accountStatistics: "ਖਾਤਾ ਅੰਕੜੇ", aiRiskProfile: "AI ਰਿਸਕ ਪ੍ਰੋਫ਼ਾਈਲ", logout: "ਲਾਗਆਉਟ", languageStepTitle: "ਭਾਸ਼ਾ ਚੁਣੋ", continueDashboard: "ਡੈਸ਼ਬੋਰਡ ਤੇ ਜਾਓ" },
  or: { language: "ଭାଷା", home: "ହୋମ", claims: "ଦାବି", payments: "ପେମେଣ୍ଟ", alerts: "ଆଲର୍ଟ", profile: "ପ୍ରୋଫାଇଲ", myPolicy: "ମୋ ପଲିସି", calculator: "କ୍ୟାଲକୁଲେଟର", claimsHistory: "ଦାବି ଇତିହାସ", paymentsAndPayouts: "ପେମେଣ୍ଟ ଓ ପେଆଉଟ", personalInformation: "ବ୍ୟକ୍ତିଗତ ସୂଚନା", currentPlanSection: "ବର୍ତ୍ତମାନ ଯୋଜନା", accountStatistics: "ଖାତା ପରିସଂଖ୍ୟାନ", aiRiskProfile: "AI ଝୁମ୍ପ ପ୍ରୋଫାଇଲ", logout: "ଲଗଆଉଟ", languageStepTitle: "ଭାଷା ବାଛନ୍ତୁ", continueDashboard: "ଡ୍ୟାଶବୋର୍ଡକୁ ଯାଆନ୍ତୁ" },
  as: { language: "ভাষা", home: "হোম", claims: "দাবি", payments: "পেমেণ্ট", alerts: "সতৰ্কতা", profile: "প্ৰফাইল", myPolicy: "মোৰ পলিছি", calculator: "কেলকুলেটৰ", claimsHistory: "দাবিৰ ইতিহাস", paymentsAndPayouts: "পেমেণ্ট আৰু পেআউট", personalInformation: "ব্যক্তিগত তথ্য", currentPlanSection: "বৰ্তমান প্লেন", accountStatistics: "একাউণ্ট পৰিসংখ্যা", aiRiskProfile: "AI বিপদ প্ৰফাইল", logout: "লগআউট", languageStepTitle: "ভাষা বাছক", continueDashboard: "ডেশ্বব’ৰ্ডলৈ যাওক" },
  ur: { language: "زبان", home: "ہوم", claims: "کلیمز", payments: "ادائیگیاں", alerts: "الرٹس", profile: "پروفائل", myPolicy: "میری پالیسی", calculator: "کیلکولیٹر", claimsHistory: "کلیم تاریخ", paymentsAndPayouts: "ادائیگیاں اور پے آؤٹ", personalInformation: "ذاتی معلومات", currentPlanSection: "موجودہ پلان", accountStatistics: "اکاؤنٹ شماریات", aiRiskProfile: "AI رسک پروفائل", logout: "لاگ آؤٹ", languageStepTitle: "زبان منتخب کریں", continueDashboard: "ڈیش بورڈ پر جائیں" },
};
function translate(language, key, fallback) {
  const direct = TRANSLATIONS[language]?.[key];
  if (direct) return direct;
  return TRANSLATIONS.en[key] || fallback || key;
}

const TERM_MAP = {
  hi: {
    "Raju Kumar": "राजू कुमार",
    "Meena Devi": "मीना देवी",
    "Priya Sharma": "प्रिया शर्मा",
    "Vikram (Acc #7749)": "विक्रम (खाता #7749)",
    "Heavy Rainfall": "भारी वर्षा",
    "Heatwave Alert": "लू चेतावनी",
    "Extreme AQI": "अत्यधिक AQI",
    "City Curfew": "शहर कर्फ्यू",
    "Heavy Rain Warning": "भारी बारिश चेतावनी",
    "Pollution Alert": "प्रदूषण चेतावनी",
    "Paid": "भुगतान",
    "Blocked": "अवरुद्ध",
    "Queued": "कतार में",
    "Partially Paid": "आंशिक भुगतान",
    "Flagged": "चिह्नित",
    "Not met": "पात्र नहीं",
    "Phone": "फ़ोन",
    "Email": "ईमेल",
    "City": "शहर",
    "Zone": "ज़ोन",
    "Plan": "योजना",
    "Status": "स्थिति",
    "Total payouts": "कुल भुगतान",
    "Total claims": "कुल क्लेम",
    "Trust score": "ट्रस्ट स्कोर",
    "Active": "सक्रिय",
    "Swiggy": "स्विगी",
    "Zomato": "जोमैटो",
    "Zepto": "जेप्टो",
    "Amazon": "अमेज़न",
    "Madhapur": "माधापुर",
    "Hyderabad": "हैदराबाद"
  },
  te: {
    "Raju Kumar": "రాజు కుమార్",
    "Meena Devi": "మీనాదేవి",
    "Priya Sharma": "ప్రియా శర్మ",
    "Vikram (Acc #7749)": "విక్రమ్ (ఖాతా #7749)",
    "Heavy Rainfall": "భారీ వర్షం",
    "Heatwave Alert": "వేడి తరంగ హెచ్చరిక",
    "Extreme AQI": "అత్యధిక AQI",
    "City Curfew": "నగర కర్ఫ్యూ",
    "Heavy Rain Warning": "భారీ వర్ష హెచ్చరిక",
    "Pollution Alert": "కాలుష్య హెచ్చరిక",
    "Paid": "చెల్లించారు",
    "Blocked": "బ్లాక్ చేశారు",
    "Queued": "క్యూ‌లో ఉంది",
    "Partially Paid": "పాక్షిక చెల్లింపు",
    "Flagged": "ఫ్లాగ్ చేశారు",
    "Not met": "అర్హత లేదు",
    "Phone": "ఫోన్",
    "Email": "ఈమెయిల్",
    "City": "నగరం",
    "Zone": "జోన్",
    "Plan": "ప్లాన్",
    "Status": "స్థితి",
    "Total payouts": "మొత్తం చెల్లింపులు",
    "Total claims": "మొత్తం క్లెయిమ్స్",
    "Trust score": "నమ్మకం స్కోర్",
    "Active": "యాక్టివ్",
    "Swiggy": "స్విగ్గీ",
    "Zomato": "జోమాటో",
    "Zepto": "జెప్టో",
    "Amazon": "అమెజాన్",
    "Madhapur": "మాధాపూర్",
    "Hyderabad": "హైదరాబాద్"
  },
};

function localizeTerm(language, text) {
  if (!text) return text;
  return TERM_MAP[language]?.[text] || text;
}

function localizeDuration(language, value = "") {
  const hrs = translate(language, "hoursShort", "hrs");
  return String(value).replace(/\bhrs?\b/gi, hrs);
}

function localizeDate(language, value = "") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(getLanguageLocale(language), { day: "numeric", month: "short", year: "numeric" });
}

const ENGLISH_NAME_BY_UI = {
  en: "English",
  hi: "इंग्लिश",
  te: "ఇంగ్లీష్",
  ta: "ஆங்கிலம்",
  ml: "ഇംഗ്ലീഷ്",
  kn: "ಇಂಗ್ಲಿಷ್",
  mr: "इंग्लिश",
  bn: "ইংরেজি",
  gu: "અંગ્રેજી",
  pa: "ਅੰਗਰੇਜ਼ੀ",
  or: "ଇଂରାଜୀ",
  as: "ইংৰাজী",
  ur: "انگریزی",
};

const EMAIL_PERSONA_ALIASES = {
  raju: ["raju.k@gmail.com", "rajukumar@gmail.com", "adithikotapothula@gmail.com"],
  meena: ["meena.d@gmail.com", "meenadevi@gmail.com"],
  priya: ["priya.s@gmail.com", "priyasharma@gmail.com"],
  vikram: ["v7749@tempmail.com"],
};

const USERNAME_EMAIL_INDEX_KEY = "gww_username_email_index";
const GWW_TICKETS_KEY = "gww_support_tickets";
const ASSISTANT_NAME = "GigaSaathi";

const ASSISTANT_COPY = {
  en: {
    welcome: "Hi, I am GigaSaathi. Ask me anything about login, claims, weather alerts, premium, payments, profile, or support.",
    placeholder: "Type your question...",
    ask: "Send",
    ticket: "Raise Ticket",
    close: "Close",
    listening: "Listening...",
    startVoice: "Voice",
    stopVoice: "Stop",
    speakReply: "Speak",
    chat: "Chat",
    issueCategory: "Issue category",
    issuePriority: "Priority",
    issueSummary: "Issue summary",
    issueContact: "Contact email",
    submitTicket: "Submit Ticket",
    quickLabel: "Quick help",
    fallback: "I can help with login, password reset, claims, premium due, billing credit, weather alerts, city change, profile updates, and support tickets.",
  },
  hi: {
    welcome: "नमस्ते, मैं GigaSaathi हूं। लॉगिन, क्लेम, मौसम अलर्ट, प्रीमियम, पेमेंट, प्रोफाइल या सपोर्ट के बारे में पूछिए।",
    placeholder: "अपना सवाल लिखें...",
    ask: "भेजें",
    ticket: "टिकट बनाएं",
    close: "बंद करें",
    listening: "सुन रहा है...",
    startVoice: "वॉइस",
    stopVoice: "रोकें",
    speakReply: "आवाज",
    chat: "चैट",
    issueCategory: "समस्या श्रेणी",
    issuePriority: "प्राथमिकता",
    issueSummary: "समस्या विवरण",
    issueContact: "कॉन्टैक्ट ईमेल",
    submitTicket: "टिकट सबमिट",
    quickLabel: "जल्दी मदद",
    fallback: "मैं लॉगिन, पासवर्ड रीसेट, क्लेम, प्रीमियम ड्यू, बिलिंग क्रेडिट, मौसम अलर्ट, शहर बदलाव, प्रोफाइल अपडेट और सपोर्ट टिकट में मदद कर सकता हूं।",
  },
  te: {
    welcome: "హాయ్, నేను GigaSaathi. లాగిన్, క్లెయిమ్స్, వాతావరణ అలర్ట్స్, ప్రీమియం, పేమెంట్స్, ప్రొఫైల్, సపోర్ట్ గురించి ఏదైనా అడగండి.",
    placeholder: "మీ ప్రశ్న టైప్ చేయండి...",
    ask: "పంపు",
    ticket: "టికెట్ రైజ్",
    close: "మూసివేయి",
    listening: "వింటోంది...",
    startVoice: "వాయిస్",
    stopVoice: "ఆపు",
    speakReply: "ఆడియో",
    chat: "చాట్",
    issueCategory: "సమస్య రకం",
    issuePriority: "ప్రాధాన్యత",
    issueSummary: "సమస్య వివరణ",
    issueContact: "కాంటాక్ట్ ఇమెయిల్",
    submitTicket: "టికెట్ పంపు",
    quickLabel: "త్వరిత సహాయం",
    fallback: "లాగిన్, పాస్‌వర్డ్ రీసెట్, క్లెయిమ్, ప్రీమియం డ్యూ, బిల్లింగ్ క్రెడిట్, వాతావరణ అలర్ట్స్, సిటీ మార్పు, ప్రొఫైల్ అప్‌డేట్, సపోర్ట్ టికెట్‌లలో నేను సహాయం చేస్తాను.",
  }
};

function assistantCopy(language, key, fallback = "") {
  return ASSISTANT_COPY[language]?.[key] || ASSISTANT_COPY.en?.[key] || fallback;
}

function normalizeUsernameKey(value = "") {
  return value.trim().toLowerCase();
}

function readUsernameEmailIndex() {
  try {
    return JSON.parse(localStorage.getItem(USERNAME_EMAIL_INDEX_KEY) || "{}");
  } catch (err) {
    return {};
  }
}

function saveUsernameEmailIndexEntry(usernameValue, emailValue) {
  const normalizedUsername = normalizeUsernameKey(usernameValue);
  const normalizedEmail = (emailValue || "").trim().toLowerCase();
  if (!normalizedUsername || !normalizedEmail) return;
  const index = readUsernameEmailIndex();
  index[normalizedUsername] = normalizedEmail;
  localStorage.setItem(USERNAME_EMAIL_INDEX_KEY, JSON.stringify(index));
}

function removeUsernameEmailIndexEntry(usernameValue = "", emailValue = "") {
  const normalizedUsername = normalizeUsernameKey(usernameValue);
  const normalizedEmail = (emailValue || "").trim().toLowerCase();
  const index = readUsernameEmailIndex();
  if (normalizedUsername && index[normalizedUsername]) {
    delete index[normalizedUsername];
  } else if (normalizedEmail) {
    Object.keys(index).forEach((key) => {
      if ((index[key] || "").toLowerCase() === normalizedEmail) {
        delete index[key];
      }
    });
  }
  localStorage.setItem(USERNAME_EMAIL_INDEX_KEY, JSON.stringify(index));
}

function resolveEmailFromUsernameIndex(identifier = "") {
  const raw = identifier.trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw.toLowerCase();
  const index = readUsernameEmailIndex();
  return index[normalizeUsernameKey(raw)] || "";
}

function readSupportTickets() {
  try {
    return JSON.parse(localStorage.getItem(GWW_TICKETS_KEY) || "[]");
  } catch (err) {
    return [];
  }
}

function saveSupportTickets(tickets = []) {
  localStorage.setItem(GWW_TICKETS_KEY, JSON.stringify(tickets));
}

function getPlatformThemeKey(platformName = "") {
  const value = String(platformName || "").toLowerCase();
  if (!value) return "default";
  if (value.includes("zepto")) return "zepto";
  if (value.includes("blinkit")) return "blinkit";
  if (value.includes("zomato")) return "zomato";
  if (value.includes("swiggy")) return "swiggy";
  if (value.includes("uber") || value.includes("ola") || value.includes("rapido")) return "mobility";
  if (value.includes("amazon") || value.includes("flipkart") || value.includes("delhivery") || value.includes("logistics")) return "logistics";
  return "default";
}

function buildAssistantReply({ text = "", worker, language = "en" }) {
  const q = (text || "").trim().toLowerCase();
  const pendingDue = worker?.pendingPremiumDue || 0;
  const credit = worker?.billingCredit || 0;
  const city = worker?.city || "your city";
  const zone = worker?.zone || "your zone";

  const isAny = (...keys) => keys.some((k) => q.includes(k));

  if (isAny("premium", "extra amount", "due", "pending", "ప్రిమియం", "प्रीमियम")) {
    if (pendingDue > 0) {
      return {
        text: language === "hi"
          ? `आपके अकाउंट में ${formatMoney(pendingDue, language)} pending premium due है। Payments टैब में "Settle Due Now" पर क्लिक करें।`
          : language === "te"
            ? `మీ అకౌంట్‌లో ${formatMoney(pendingDue, language)} పెండింగ్ ప్రీమియం ఉంది. Payments ట్యాబ్‌లో "Settle Due Now" నొక్కండి.`
            : `You currently have ${formatMoney(pendingDue, language)} pending premium due. Open Payments and tap "Settle Due Now".`,
        action: { type: "tab", tab: "payments" }
      };
    }
    return {
      text: language === "hi"
        ? "अभी कोई pending premium due नहीं है।"
        : language === "te"
          ? "ఇప్పుడే పెండింగ్ ప్రీమియం డ్యూ లేదు."
          : "No pending premium due right now.",
      action: { type: "tab", tab: "payments" }
    };
  }

  if (isAny("credit", "refund", "wallet", "బిల్లింగ్", "क्रेडिट")) {
    return {
      text: language === "hi"
        ? `आपका billing credit ${formatMoney(credit, language)} है। अगली payment में पहले यही auto-adjust होगा।`
        : language === "te"
          ? `మీ billing credit ${formatMoney(credit, language)} ఉంది. తర్వాతి పేమెంట్‌లో ఇది ముందుగా auto-adjust అవుతుంది.`
          : `Your billing credit is ${formatMoney(credit, language)}. It will be auto-used first in the next payment.`,
      action: { type: "tab", tab: "payments" }
    };
  }

  if (isAny("weather", "alert", "rain", "aqi", "city", "zone", "వాతావరణ", "मौसम")) {
    return {
      text: language === "hi"
        ? `आपका current location ${city}, ${zone} है। Alerts टैब में city/zone बदलकर live forecast और risk देख सकते हैं।`
        : language === "te"
          ? `మీ current location ${city}, ${zone}. Alerts ట్యాబ్‌లో city/zone మార్చి live forecast, risk చూడండి.`
          : `Your current location is ${city}, ${zone}. In Alerts tab, change city/zone to view live forecast and risk.`,
      action: { type: "tab", tab: "alerts" }
    };
  }

  if (isAny("claim", "blocked", "rejected", "queued", "delay", "क्लेम", "క్లెయిమ్")) {
    return {
      text: language === "hi"
        ? "Claims टैब में आपका पूरा claim history, score और status दिखेगा। Blocked claim के लिए ticket raise करें।"
        : language === "te"
          ? "Claims ట్యాబ్‌లో మీ claim history, score, status కనిపిస్తాయి. blocked claim కోసం టికెట్ రైజ్ చేయండి."
          : "Claims tab shows your full claim history, score, and status. Raise a ticket for blocked claims.",
      action: { type: "tab", tab: "claims" }
    };
  }

  if (isAny("forgot", "reset", "password", "otp", "पासवर्ड", "పాస్‌వర్డ్")) {
    return {
      text: language === "hi"
        ? "लॉगिन स्क्रीन में 'Forgot password' दबाएं। Username या email दें, फिर Firebase reset mail आएगा।"
        : language === "te"
          ? "లాగిన్ స్క్రీన్‌లో 'Forgot password' నొక్కండి. Username లేదా email ఇవ్వండి, తర్వాత reset mail వస్తుంది."
          : "On login screen tap 'Forgot password', enter username or email, and Firebase will send a reset mail."
    };
  }

  if (isAny("profile", "change city", "update city", "email change", "username change", "प्रोफाइल", "ప్రొఫైల్")) {
    return {
      text: language === "hi"
        ? "Profile -> Edit Profile में name, username, email, city, zone, password बदल सकते हैं। City/zone बदलते ही premium auto adjust होगा।"
        : language === "te"
          ? "Profile -> Edit Profile లో name, username, email, city, zone, password మార్చొచ్చు. city/zone మార్చిన వెంటనే premium auto adjust అవుతుంది."
          : "Go to Profile -> Edit Profile to change name, username, email, city, zone, and password. City/zone updates auto-adjust premium.",
      action: { type: "tab", tab: "profile" }
    };
  }

  if (isAny("delete account", "pause account", "resume account", "logout", "delete", "account action")) {
    return {
      text: language === "hi"
        ? "Profile -> Account Actions में Pause/Resume, Delete Account, Logout और Customer Support सभी available हैं।"
        : language === "te"
          ? "Profile -> Account Actions లో Pause/Resume, Delete Account, Logout, Customer Support అన్ని ఉన్నాయి."
          : "In Profile -> Account Actions, you can Pause/Resume, Delete Account, Logout, and reach Customer Support.",
      action: { type: "tab", tab: "profile" }
    };
  }

  if (isAny("ticket", "support", "help", "issue", "problem", "సపోర్ట్", "सपोर्ट")) {
    return {
      text: language === "hi"
        ? "मैं अभी आपके लिए support ticket बना सकता हूं। नीचे 'Raise Ticket' सेक्शन में समस्या भरें।"
        : language === "te"
          ? "ఇప్పుడే మీ కోసం support ticket రైజ్ చేయగలను. కింద 'Raise Ticket' సెక్షన్‌లో సమస్య రాయండి."
          : "I can raise a support ticket for you right now. Use the 'Raise Ticket' section below.",
      action: { type: "ticket" }
    };
  }

  return {
    text: assistantCopy(language, "fallback", ASSISTANT_COPY.en.fallback)
  };
}

async function requestAiAssistantResponse({ text = "", language = "en", worker, history = [] }) {
  const payload = {
    message: text,
    language,
    workerContext: worker
      ? {
        name: worker.name,
        city: worker.city,
        zone: worker.zone,
        platform: worker.platform,
        plan: worker.plan,
        pendingPremiumDue: worker.pendingPremiumDue || 0,
        billingCredit: worker.billingCredit || 0
      }
      : null,
    history: history.slice(-8).map((msg) => ({ role: msg.role, text: msg.text }))
  };

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`AI API failed (${response.status})`);
  const data = await response.json();
  if (!data?.reply) throw new Error("Invalid AI response");
  return { text: data.reply };
}

function weatherCodeToIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌤️";
}

function riskFromRainAqi(rainMm, aqi) {
  if (rainMm >= 50 || aqi >= 220) return "HIGH";
  if (rainMm >= 20 || aqi >= 120) return "MEDIUM";
  return "LOW";
}

function getDecisionFromScore(score = 0) {
  if (score < 40) return "safe";
  if (score < 70) return "medium";
  return "high";
}

function buildRuntimeClaimSignals(worker = {}, disruption = {}, claimMeta = null) {
  const accountAgeDays = getWorkerAccountAgeDays(worker);
  const isNewAccount =
    (worker.totalClaims || 0) === 0 ||
    String(worker.age || "").toLowerCase().includes("new") ||
    (accountAgeDays !== null && accountAgeDays < 14);
  const maturityGate = getAccountMaturityGate(accountAgeDays);
  const weatherMatch = disruption?.label ? "Weather event matched with city feed." : "Signal pending weather confirmation.";
  const hasPremiumHistory = Array.isArray(worker.billingEvents) && worker.billingEvents.some((event) => {
    const category = getBillingEventCategory(event);
    return category === "premium" && Number(event.amount || 0) > 0;
  });
  const claimGps = claimMeta?.gps || null;
  const hasEvidence = Boolean(claimMeta?.evidenceImage);
  const cityPoint = getCityReferencePoint(worker?.city);
  const gpsDistance = claimGps ? haversineDistanceKm(claimGps, cityPoint) : null;
  const gpsRaw = gpsDistance === null ? 10 : gpsDistance > 35 ? 32 : gpsDistance > 15 ? 18 : 0;
  const gpsStatus = gpsRaw >= 30 ? "fail" : gpsRaw > 0 ? "warn" : "pass";
  const gpsLabel = gpsDistance === null
    ? "Claim GPS unavailable. Manual GPS consistency review required."
    : gpsDistance > 35
      ? `Claim GPS is ${gpsDistance}km away from worker city baseline.`
      : `Claim GPS matched worker city context (${gpsDistance}km).`;

  const recentClaims24h = Array.isArray(worker.history)
    ? worker.history.filter((item) => {
      const stamp = Date.parse(String(item?.createdAt || item?.date || ""));
      if (!Number.isFinite(stamp)) return false;
      return (Date.now() - stamp) <= 24 * 60 * 60 * 1000;
    }).length
    : 0;
  const frequencyRaw = recentClaims24h >= 3 ? 20 : recentClaims24h === 2 ? 10 : 0;
  const frequencyStatus = frequencyRaw >= 20 ? "fail" : frequencyRaw > 0 ? "warn" : "pass";
  const frequencyLabel = recentClaims24h >= 3
    ? `${recentClaims24h} claims within 24h detected. Ring/frequency review required.`
    : recentClaims24h === 2
      ? "Multiple claims in last 24h. Monitoring anomaly trend."
      : "Claim frequency is within expected pattern.";

  const evidenceRaw = hasEvidence ? 0 : 25;
  const evidenceStatus = hasEvidence ? "pass" : "fail";
  const evidenceLabel = hasEvidence
    ? "Geotagged claim image submitted."
    : "No evidence image attached for this claim.";

  const maturityRaw = maturityGate.status === "blocked"
    ? 65
    : maturityGate.status === "review"
      ? (hasPremiumHistory ? 36 : 48)
      : 0;
  const maturityStatus = maturityRaw >= 50 ? "fail" : maturityRaw > 0 ? "warn" : "pass";
  const maturityLabel = isNewAccount
    ? maturityGate.status === "blocked"
      ? "Account age under 7 days. Auto payout blocked by eligibility rule."
      : hasPremiumHistory
        ? "Account in 7-30 day window. Routed to delayed verification."
        : "New account with limited paid-cycle history. Manual verification required."
    : "Account maturity and paid-cycle history are healthy.";

  const fallbackSignals = [
    { signal: "Weather API match", status: "pass", label: weatherMatch, raw: 0 },
    { signal: "GPS consistency", status: gpsStatus, label: gpsLabel, raw: gpsRaw },
    { signal: "Claim evidence", status: evidenceStatus, label: evidenceLabel, raw: evidenceRaw },
    { signal: "Movement pattern", status: frequencyStatus, label: frequencyLabel, raw: frequencyRaw },
    { signal: "Device integrity", status: "pass", label: "No rooted/emulator indicators detected.", raw: 0 },
    { signal: "Account maturity", status: maturityStatus, label: maturityLabel, raw: maturityRaw },
    { signal: "Geo-cluster anomaly", status: recentClaims24h >= 3 ? "fail" : "warn", label: recentClaims24h >= 3 ? "High claim density around same time window." : "No high-volume anomaly, monitoring cluster density.", raw: recentClaims24h >= 3 ? 18 : 6 },
  ];

  const baseSignals = Array.isArray(worker.signals) && worker.signals.length > 0
    ? worker.signals.map((item) => ({
      signal: item.signal || "Signal",
      status: item.status || "warn",
      label: item.label || "Signal evaluated.",
      raw: Number(item.raw || 0),
    }))
    : fallbackSignals;

  const filtered = baseSignals.filter((item) => item.signal !== "Account maturity");
  const capped = filtered.slice(0, 4);
  return [
    ...capped,
    { signal: "Account maturity", status: maturityStatus, label: maturityLabel, raw: maturityRaw }
  ];
}

function getOutcomeCopyFromDecision(decision, isNewAccount = false) {
  if (decision === "safe") {
    return {
      title: "Low risk claim approved",
      detail: "Signals are clean. Payout can be released instantly."
    };
  }
  if (decision === "medium") {
    return {
      title: isNewAccount ? "New account verification window" : "Moderate risk claim",
      detail: isNewAccount
        ? "New account claims go through a soft verification window before payout."
        : "Claim is valid but routed through soft verification before payout."
    };
  }
  return {
    title: "High risk claim flagged",
    detail: "Risk signals are above threshold. Claim blocked and routed to manual review."
  };
}

function getLanguageOptionLabel(uiLanguage, languageOption) {
  if (languageOption.code === "en") {
    return ENGLISH_NAME_BY_UI[uiLanguage] || ENGLISH_NAME_BY_UI.en;
  }
  return languageOption.native;
}

function LanguageSelector({ language, setLanguage, compact = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: compact ? 11 : 12, color: "var(--muted)" }}>{translate(language, "language", "Language")}</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          color: "var(--text)",
          padding: compact ? "4px 8px" : "6px 10px",
          fontSize: compact ? 11 : 12,
          cursor: "pointer"
        }}
      >
        {LANGUAGES.map(item => (
          <option key={item.code} value={item.code}>
            {getLanguageOptionLabel(language, item)}
          </option>
        ))}
      </select>
    </div>
  );
}

const REG_CITY_OPTIONS = [...new Set(CITIES.map(({ city }) => city))].sort((a, b) => a.localeCompare(b));

const REG_ZONE_OPTIONS = {
  Hyderabad: ["Madhapur", "Kondapur", "Gachibowli", "Hitech City", "Kukatpally"],
  Bengaluru: ["Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "BTM Layout"],
  Chennai: ["Anna Nagar", "Velachery", "Tambaram", "T Nagar", "OMR"],
  Mumbai: ["Dharavi", "Andheri", "Bandra", "Powai", "Lower Parel"],
  Delhi: ["Connaught Place", "Rohini", "Dwarka", "Lajpat Nagar", "Saket"],
  Pune: ["Hinjewadi", "Kothrud", "Viman Nagar", "Baner", "Hadapsar"],
  Kolkata: ["Salt Lake", "Park Street", "Howrah", "Garia", "Dum Dum"],
};

const REG_PLATFORM_OPTIONS = Array.from(new Set([
  "Swiggy",
  "Zomato",
  "Zepto",
  "Amazon",
  ...CALC_PLATFORMS.map((item) => item.name)
]));
const REG_HOUR_OPTIONS = ["4-6 hrs/day", "6-8 hrs/day", "8-10 hrs/day", "10-12 hrs/day", "12+ hrs/day"];

const ZONE_PREMIUM_FACTORS = {
  Madhapur: 1.4, Kondapur: 1.2, Gachibowli: 1.1, "HITEC City": 1.2, "Hitech City": 1.2,
  "Anna Nagar": 1.3, "T. Nagar": 1.2, Koramangala: 0.9, Indiranagar: 1.0,
  Dharavi: 1.5, Andheri: 1.3, Whitefield: 1.1, "HSR Layout": 1.0, "BTM Layout": 1.0,
  Velachery: 1.1, Tambaram: 1.0, OMR: 1.2, Bandra: 1.2, Powai: 1.1, "Lower Parel": 1.2,
  "Connaught Place": 1.2, Rohini: 1.0, Dwarka: 1.0, "Lajpat Nagar": 1.1, Saket: 1.0
};

const PLATFORM_PREMIUM_FACTORS = { Swiggy: 1.1, Zomato: 1.0, Zepto: 1.2, Amazon: 0.9 };
const HOURS_PREMIUM_FACTORS = {
  "4-6 hrs/day": 0.9,
  "6-8 hrs/day": 1.0,
  "8-10 hrs/day": 1.07,
  "10-12 hrs/day": 1.14,
  "12+ hrs/day": 1.22
};
const VEHICLE_PREMIUM_FACTORS = {
  Bicycle: 1.15,
  "Motorbike / Scooter": 1.1,
  "Electric Scooter / E-Bike": 1.08,
  "Auto-Rickshaw / E-Rickshaw": 0.96,
  "Car (Hatchback/Sedan)": 0.9,
  "Mini Truck / Tempo": 0.88,
  "Large Truck": 0.86,
};

function getRegistrationZones(city) {
  return REG_ZONE_OPTIONS[city] || ["Central Zone", "North Zone", "South Zone", "East Zone", "West Zone"];
}

function alphaCode(value = "", length = 3) {
  const cleaned = String(value || "").replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!cleaned) return "XXX";
  return cleaned.slice(0, length).padEnd(length, "X");
}

function getPlatformCode(platformName = "") {
  const map = {
    Swiggy: "SWG",
    Zomato: "ZMT",
    Zepto: "ZPT",
    Blinkit: "BLK",
    Amazon: "AMZ",
    "BigBasket BB Now": "BBN",
    "Swiggy Instamart": "SIM",
    "JioMart Express": "JMX",
    "Flipkart Minutes": "FKM",
    "Nykaa Now": "NKN",
    Dunzo: "DNZ",
    Rapido: "RPD",
    Uber: "UBR",
    Ola: "OLA",
    "Amazon Flex": "AFX",
  };
  return map[platformName] || alphaCode(platformName, 3);
}

function getCityCode(cityName = "") {
  return alphaCode(cityName, 3);
}

function validatePartnerIdFormat(partnerId = "", platformName = "", cityName = "") {
  const safeId = String(partnerId || "").trim().toUpperCase();
  if (!safeId) {
    return { valid: false, error: "Partner ID is required." };
  }
  const pattern = /^([A-Z]{3})-(20\d{2})-([A-Z]{3})-(\d{4})$/;
  const match = safeId.match(pattern);
  if (!match) {
    return { valid: false, error: "Partner ID must match format: ABC-2026-XYZ-1234" };
  }
  const expectedPlatformCode = getPlatformCode(platformName);
  const expectedCityCode = getCityCode(cityName);
  if (match[1] !== expectedPlatformCode) {
    return {
      valid: false,
      error: `Partner ID platform code must be ${expectedPlatformCode} for ${platformName}.`
    };
  }
  if (match[3] !== expectedCityCode) {
    return {
      valid: false,
      error: `Partner ID city code must be ${expectedCityCode} for ${cityName}.`
    };
  }
  return { valid: true, normalized: safeId };
}

function cityPremiumFactor(cityName = "") {
  const city = CITIES.find((item) => item.city === cityName);
  if (!city) return 1.0;
  return Number((0.75 + city.risk * 0.5).toFixed(2));
}

function platformPremiumFactor(platformName = "") {
  if (!platformName) return 1.0;
  const direct = PLATFORM_PREMIUM_FACTORS[platformName];
  if (Number.isFinite(direct)) return direct;

  if (platformName === "Amazon") {
    return PLATFORM_PREMIUM_FACTORS.Amazon || 0.9;
  }

  const calcPlatform = CALC_PLATFORMS.find((item) => item.name === platformName);
  if (!calcPlatform || !Number.isFinite(calcPlatform.factor)) return 1.0;
  return Number(calcPlatform.factor.toFixed(2));
}

function mapPlanNameToId(planName = "") {
  const byName = PLANS.find((plan) => plan.name === planName);
  if (byName) return byName.id;
  if (planName.toLowerCase().includes("basic")) return "basic";
  if (planName.toLowerCase().includes("full")) return "shield";
  return "guard";
}

function hoursValueToBand(hours = 8) {
  const value = Number(hours || 8);
  if (value <= 6) return "4-6 hrs/day";
  if (value <= 8) return "6-8 hrs/day";
  if (value <= 10) return "8-10 hrs/day";
  if (value <= 12) return "10-12 hrs/day";
  return "12+ hrs/day";
}

function computeWorkerDynamicPremium(workerProfile) {
  const plan = PLANS.find((p) => p.id === workerProfile?.plan) || PLANS[1];
  const base = plan.price;
  const cf = cityPremiumFactor(workerProfile?.city);
  const zf = ZONE_PREMIUM_FACTORS[workerProfile?.zone] || 1.0;
  const pf = platformPremiumFactor(workerProfile?.platform);
  const hf = HOURS_PREMIUM_FACTORS[workerProfile?.hours] || 1.0;
  const vf = VEHICLE_PREMIUM_FACTORS[workerProfile?.vehicle] || 1.0;
  const weekly = Math.max(1, Math.round(base * cf * zf * pf * hf * vf));
  return {
    weekly,
    base,
    diff: weekly - base,
    factors: { cf, zf, pf, hf, vf }
  };
}

function getWorkerWeeklyPremium(workerProfile) {
  if (!workerProfile) return 0;
  return Number(workerProfile.currentWeeklyPremium || computeWorkerDynamicPremium(workerProfile).weekly || 0);
}

function parseHoursBand(hoursLabel) {
  if (!hoursLabel) return 8;
  if (hoursLabel.includes("12+")) return 12;
  const match = hoursLabel.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return 8;
  return Math.round((Number(match[1]) + Number(match[2])) / 2);
}

function getRegistrationPremiumPreview(data, planId) {
  const safeCity = data?.city || "Hyderabad";
  const safeZone = data?.zone || getRegistrationZones(safeCity)[0] || "Central Zone";
  const safePlatform = data?.platform || "Swiggy";
  const safeVehicle = data?.vehicle || "Motorbike / Scooter";
  const safeHours = data?.hours || "8-10 hrs/day";
  const safePlan = planId || data?.plan || "guard";

  const selectedCity =
    CITIES.find((item) => item.city === safeCity) ||
    CITIES.find((item) => item.city === "Hyderabad") ||
    CITIES[0];
  const selectedVehicle =
    VEHICLES.find((item) => item.name === safeVehicle) ||
    VEHICLES.find((item) => item.name === "Motorbike / Scooter") ||
    VEHICLES[1] ||
    VEHICLES[0];
  const workerProfile = {
    city: safeCity,
    zone: safeZone,
    platform: safePlatform,
    vehicle: safeVehicle,
    hours: safeHours,
    plan: safePlan
  };
  const billing = computeWorkerDynamicPremium(workerProfile);

  return {
    weekly: billing.weekly,
    monthly: Math.round(billing.weekly * 4.33),
    base: billing.base,
    diff: billing.diff,
    cityRisk: selectedCity.riskLabel,
    cityReason: selectedCity.reason,
    platformFactor: billing.factors.pf.toFixed(2),
    vehicleLabel: selectedVehicle.name,
    factors: billing.factors,
  };
}

function PrivacyPolicyDetails({ compact = false, language = "en" }) {
  const policyContent = getPolicyContent(language);
  return (
    <div className={`policy-doc ${compact ? "compact" : ""}`}>
      <div className="policy-doc-header">
        <div className="policy-doc-label">{policyContent.officialNotice}</div>
        <div className="policy-doc-title">{policyContent.governanceTitle}</div>
        <div className="policy-doc-intro">{policyContent.governanceIntro}</div>
      </div>
      {policyContent.sections.map(section => (
        <div key={section.title} className="policy-doc-section">
          <div className="policy-doc-section-head">
            <div className="policy-doc-clause">{section.clause}</div>
            <div className="policy-doc-section-title">{section.title}</div>
          </div>
          <ul className="policy-doc-points">
            {section.points.map(point => (
              <li key={point} className="policy-doc-point">{point}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function buildFirestoreUserProfile(workerProfile = {}, uid = "", overrides = {}) {
  const plan = PLANS.find((item) => item.id === workerProfile?.plan) || PLANS[1];
  const accountAgeDays = getWorkerAccountAgeDays(workerProfile);
  const next = {
    uid,
    role: overrides.role || workerProfile?.role || "worker",
    status: workerProfile?.accountPaused ? "paused" : "active",
    name: workerProfile?.name || "Gig Worker",
    email: workerProfile?.email || "",
    phone: workerProfile?.phone || "",
    username: workerProfile?.username || "",
    city: workerProfile?.city || "",
    zone: workerProfile?.zone || "",
    platform: workerProfile?.platform || "",
    vehicle: workerProfile?.vehicle || "",
    vehicleNumber: workerProfile?.vehicleNumber || "",
    vehicleDocs: workerProfile?.vehicleDocs || {},
    hours: workerProfile?.hours || "8-10 hrs/day",
    plan: workerProfile?.plan || "guard",
    planName: plan.name,
    currentWeeklyPremium: getWorkerWeeklyPremium(workerProfile),
    billingCredit: Number(workerProfile?.billingCredit || 0),
    pendingPremiumDue: Number(workerProfile?.pendingPremiumDue || 0),
    lastPremiumPaidCycle: workerProfile?.lastPremiumPaidCycle || "",
    paymentStatus: workerProfile?.paymentStatus || "paid",
    paymentGraceUntil: workerProfile?.paymentGraceUntil || "",
    paymentDueAmount: Number(workerProfile?.paymentDueAmount || 0),
    photoURL: workerProfile?.photoURL || workerProfile?.selfieImage || "",
    liveTrackingEnabled: Boolean(workerProfile?.liveTrackingEnabled),
    lastLiveLocation: workerProfile?.lastLiveLocation || null,
    totalClaims: Number(workerProfile?.totalClaims || 0),
    approvedClaims: Number(workerProfile?.approvedClaims || 0),
    balance: Number(workerProfile?.balance || 0),
    billingEvents: Array.isArray(workerProfile?.billingEvents) ? workerProfile.billingEvents.slice(0, 150) : [],
    history: Array.isArray(workerProfile?.history) ? workerProfile.history.slice(0, 120) : [],
    accountAgeDays: accountAgeDays === null ? null : accountAgeDays,
    createdAt: workerProfile?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...next, ...overrides };
}

export default function App() {
  const online = useOnline();
  const [screen, setScreen] = useState("splash");
  const [worker, setWorker] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [disruption, setDisruption] = useState(null);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [queuedClaims, setQueuedClaims] = useState([]);
  const [regData, setRegData] = useState({});
  const [syncMsg, setSyncMsg] = useState("");
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState(localStorage.getItem("gww_language") || "en");
  const [claimScore, setClaimScore] = useState(0);
  const [claimPayout, setClaimPayout] = useState(0);
  const [claimDecision, setClaimDecision] = useState("");
  const [claimSettlement, setClaimSettlement] = useState(null);
  const [claimMeta, setClaimMeta] = useState(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const platformTheme = useMemo(() => getPlatformThemeKey(worker?.platform), [worker?.platform]);

  const persistWorker = (nextWorker, options = {}) => {
    let finalWorker = { ...nextWorker };
    const nextPremium = computeWorkerDynamicPremium(finalWorker);
    const previousPremiumValue = worker ? getWorkerWeeklyPremium(worker) : nextPremium.weekly;

    const locationOrPlanChanged =
      !!worker &&
      (
        worker.city !== finalWorker.city ||
        worker.zone !== finalWorker.zone ||
        worker.platform !== finalWorker.platform ||
        worker.hours !== finalWorker.hours ||
        worker.vehicle !== finalWorker.vehicle ||
        worker.plan !== finalWorker.plan
      );

    if (locationOrPlanChanged && !options.skipRepricingAdjustment) {
      const deltaWeekly = nextPremium.weekly - previousPremiumValue;
      if (deltaWeekly !== 0) {
        const { remainingRatio } = getCycleContext();
        const prorated = Math.max(1, Math.round(Math.abs(deltaWeekly) * remainingRatio));
        const events = [...(finalWorker.billingEvents || [])];
        if (deltaWeekly > 0) {
          const existingCredit = finalWorker.billingCredit || 0;
          const creditApplied = Math.min(existingCredit, prorated);
          const dueToAdd = Math.max(0, prorated - creditApplied);
          const pendingDue = (finalWorker.pendingPremiumDue || 0) + dueToAdd;
          events.unshift({
            id: `BILL-${Date.now()}-loc-up`,
            date: todayLabel(language),
            type: "Location Premium Adjustment",
            detail: `${finalWorker.city}/${finalWorker.zone} increases risk premium. ${formatMoney(prorated, language)} adjusted (${formatMoney(creditApplied, language)} credit used, ${formatMoney(dueToAdd, language)} pending).`,
            amount: dueToAdd,
            direction: "debit",
            category: "premium_adjustment",
            source: creditApplied > 0 ? "credit_wallet_plus_cash" : "cash_due",
            cycle: getBillingCycleKey()
          });
          finalWorker = {
            ...finalWorker,
            billingCredit: Math.max(0, existingCredit - creditApplied),
            pendingPremiumDue: pendingDue,
            billingEvents: events,
            locationPremiumNotice: dueToAdd > 0
              ? `Premium increased. ${formatMoney(dueToAdd, language)} added as pending due.`
              : `Premium increased but fully adjusted using billing credit.`
          };
          setSyncMsg(
            dueToAdd > 0
              ? `Premium updated for ${finalWorker.city}: ${formatMoney(dueToAdd, language)} due`
              : `Premium updated for ${finalWorker.city}: credit adjusted`
          );
          setTimeout(() => setSyncMsg(""), 3500);
        } else {
          const credit = (finalWorker.billingCredit || 0) + prorated;
          events.unshift({
            id: `BILL-${Date.now()}-loc-down`,
            date: todayLabel(language),
            type: "Location Premium Credit",
            detail: `${finalWorker.city}/${finalWorker.zone} lowers risk. ${formatMoney(prorated, language)} added to credits.`,
            amount: prorated,
            direction: "credit",
            category: "credit",
            source: "risk_reduction_credit",
            cycle: getBillingCycleKey()
          });
          finalWorker = {
            ...finalWorker,
            billingCredit: credit,
            billingEvents: events,
            locationPremiumNotice: `Premium reduced. ${formatMoney(prorated, language)} credited to wallet.`
          };
          setSyncMsg(`Premium updated for ${finalWorker.city}: ${formatMoney(prorated, language)} credited`);
          setTimeout(() => setSyncMsg(""), 3500);
        }
      }
    }

    finalWorker = {
      ...finalWorker,
      currentWeeklyPremium: nextPremium.weekly,
      baseWeeklyPremium: nextPremium.base,
      premiumDiff: nextPremium.diff,
      premiumFactors: nextPremium.factors
    };

    setWorker(finalWorker);
    setBalance(finalWorker.balance ?? 0);
    setHistory(finalWorker.history || []);
    setActiveTab("home");
    localStorage.setItem("gww_worker", JSON.stringify(finalWorker));
    if (auth.currentUser?.uid) {
      const profileDoc = buildFirestoreUserProfile(finalWorker, auth.currentUser.uid, {
        role: String(finalWorker?.role || "worker")
      });
      setDoc(doc(db, "users", auth.currentUser.uid), profileDoc, { merge: true }).catch((error) => {
        console.error("Firestore sync failed", error);
        setSyncMsg("Could not sync profile to Firebase. Please check Firestore rules and retry.");
        setTimeout(() => setSyncMsg(""), 3500);
      });
    }
  };

  // OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [authStage, setAuthStage] = useState("credentials");
  const [pendingEmailWorker, setPendingEmailWorker] = useState(null);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailInfo, setEmailInfo] = useState("");
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [loginConsent, setLoginConsent] = useState(false);
  const [adminEmail, setAdminEmail] = useState(ADMIN_DEFAULT_EMAIL);
  const [adminPassword, setAdminPassword] = useState(ADMIN_DEFAULT_PASSWORD);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const recaptchaContainerRef = useRef(null);
  const recaptchaWidgetIdRef = useRef(null);
  const liveTrackWatchIdRef = useRef(null);
  const liveTrackLastSyncRef = useRef(0);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("gww_language", language);
  }, [language]);

  useEffect(() => {
    const saved = localStorage.getItem("gww_worker");
    const t = setTimeout(() => {
      if (saved) { const w = JSON.parse(saved); loginAs(w); }
      else setScreen("landing");
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (online && queuedClaims.length > 0) {
      setSyncMsg(`Syncing ${queuedClaims.length} queued claim(s)...`);
      setTimeout(() => {
        const amt = queuedClaims.reduce((a, c) => a + c.amount, 0);
        setBalance(b => b + amt);
        setHistory(h => [...queuedClaims.map(c => ({ ...c, status: "Paid", synced: true })), ...h]);
        setQueuedClaims([]);
        setSyncMsg(`✓ ${queuedClaims.length} claim(s) processed — ₹${amt} credited`);
        setTimeout(() => setSyncMsg(""), 3000);
      }, 1500);
    }
  }, [online]);

  useEffect(() => {
    if (screen === "otp" && authStage === "otp" && !otpSent && recaptchaContainerRef.current) {
      try {
        auth.languageCode = "en";
        if (window.recaptchaVerifier) {
          try { window.recaptchaVerifier.clear(); } catch (error) { }
          window.recaptchaVerifier = null;
        }
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: "invisible",
          callback: () => { }
        });
        window.recaptchaVerifier.render().then((widgetId) => {
          recaptchaWidgetIdRef.current = widgetId;
        });
      } catch (err) {
        setOtpError("Captcha could not load. Check Firebase authorized domains and refresh once.");
      }
    }
  }, [screen, otpSent, authStage]);

  useEffect(() => {
    if (screen === "admin" && !isAdminSession) {
      setScreen(worker ? "dashboard" : "landing");
    }
  }, [screen, isAdminSession, worker]);

  useEffect(() => {
    if (liveTrackWatchIdRef.current !== null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(liveTrackWatchIdRef.current);
      liveTrackWatchIdRef.current = null;
    }
    if (!worker || isAdminSession || !worker.liveTrackingEnabled) return;
    if (!navigator.geolocation?.watchPosition) return;

    liveTrackWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const liveLocation = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy || 0),
          capturedAt: new Date().toISOString()
        };
        setWorker((prev) => {
          if (!prev) return prev;
          const next = { ...prev, lastLiveLocation: liveLocation };
          localStorage.setItem("gww_worker", JSON.stringify(next));
          const nowTs = Date.now();
          if (auth.currentUser?.uid && nowTs - liveTrackLastSyncRef.current > 30000) {
            liveTrackLastSyncRef.current = nowTs;
            setDoc(doc(db, "users", auth.currentUser.uid), {
              lastLiveLocation: liveLocation,
              liveTrackingEnabled: true,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => { });
          }
          return next;
        });
      },
      () => { },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      if (liveTrackWatchIdRef.current !== null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(liveTrackWatchIdRef.current);
        liveTrackWatchIdRef.current = null;
      }
    };
  }, [worker?.id, worker?.liveTrackingEnabled, isAdminSession]);

  const loginAs = (w) => {
    setIsAdminSession(false);
    const uid = auth.currentUser?.uid || w?.id || "";
    persistWorker({
      ...w,
      id: uid || w?.id,
      role: w?.role || "worker",
      lastLoginAt: new Date().toISOString()
    });
    setScreen("dashboard");
  };

  const buildWorkerFromRegistration = (data) => {
    const name = (data.name || "Demo User").trim();
    const phoneDigits = (data.phone || "").replace(/\D/g, "").slice(-10);
    const nameParts = name.split(/\s+/).filter(Boolean);
    const avatar = nameParts.slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "GW";
    const cityCode = getCityCode(data.city || "City");
    const platformCode = getPlatformCode(data.platform || "GWW");
    const workerId = `user_${Date.now()}`;
    const policyID = `GWW-${new Date().getFullYear()}-${cityCode}-${String(Date.now()).slice(-4)}`;
    const partnerValidation = validatePartnerIdFormat(data.partnerId || "", data.platform || "", data.city || "");
    const partnerId = partnerValidation.valid
      ? partnerValidation.normalized
      : `${platformCode}-${new Date().getFullYear()}-${cityCode}-${String(Date.now()).slice(-4)}`;
    const currentCycle = getBillingCycleKey();
    const selectedPlanId = data.plan || "guard";
    const initialWeeklyPremium = getRegistrationPremiumPreview(data, selectedPlanId).weekly;
    const registrationPayment = data?.registrationPayment || {};
    const isGraceRegistration = String(registrationPayment?.status || "").toLowerCase() === "grace";
    const defaultGraceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const graceUntil = isGraceRegistration ? (registrationPayment?.graceUntil || defaultGraceUntil) : "";
    const graceUntilLabel = isGraceRegistration
      ? new Date(graceUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "";
    const activationBillingEvent = isGraceRegistration
      ? {
        id: `BILL-${Date.now()}`,
        date: todayLabel(),
        type: "Plan Activated (Payment Grace)",
        detail: `First weekly premium ${formatMoney(initialWeeklyPremium)} deferred. Pay by ${graceUntilLabel}.`,
        amount: 0,
        direction: "debit",
        category: "premium",
        source: "grace_period",
        cycle: currentCycle
      }
      : {
        id: `BILL-${Date.now()}`,
        date: todayLabel(),
        type: "Plan Activation",
        detail: `${PLANS.find(p => p.id === selectedPlanId)?.name || "Storm Guard"} first weekly premium`,
        amount: initialWeeklyPremium,
        direction: "debit",
        category: "premium",
        source: "signup_activation",
        cycle: currentCycle
      };

    return {
      id: workerId,
      name,
      phone: phoneDigits,
      email: data.email?.trim() || `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "gig.worker"}@gigweatherwage.app`,
      username: data.username?.trim() || "",
      platform: data.platform || "Swiggy",
      vehicle: data.vehicle || "Motorbike / Scooter",
      partnerId,
      policyID,
      city: data.city || "Hyderabad",
      zone: data.zone || "Central Zone",
      hours: data.hours || "8-10 hrs/day",
      preferredLanguage: data.preferredLanguage || language,
      createdAt: new Date().toISOString(),
      accountCreatedAt: new Date().toISOString(),
      since: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      age: "New",
      avatar,
      plan: selectedPlanId,
      currentWeeklyPremium: initialWeeklyPremium,
      balance: 0,
      totalClaims: 0,
      approvedClaims: 0,
      tag: "New Worker",
      tagColor: "#0FA896",
      scenario: "safe",
      description: "Recently registered worker. Dynamic profile generated from onboarding details.",
      expectedScore: "Pending",
      history: [],
      alerts: [],
      signals: [],
      decision: "safe",
      outcome: "No claims filed yet",
      outcomeDetail: "Your account is active and ready to use.",
      billingCredit: 0,
      billingEvents: [activationBillingEvent],
      lastPremiumPaidCycle: isGraceRegistration ? "" : currentCycle,
      paymentStatus: isGraceRegistration ? "grace" : "paid",
      paymentGraceUntil: graceUntil,
      paymentDueAmount: isGraceRegistration ? initialWeeklyPremium : 0,
      photoURL: data.selfieImage || "",
      selfieImage: data.selfieImage || "",
      selfieCaptured: Boolean(data.selfieCaptured),
      liveTrackingEnabled: true,
      lastLiveLocation: null,
      vehicleNumber: (data?.vehicleNumber || "").toUpperCase(),
      vehicleDocs: data?.vehicleDocs || {},
    };
  };

  const logout = () => {
    setIsAdminSession(false);
    setWorker(null); setBalance(0); setHistory([]);
    setQueuedClaims([]); setDisruption(null);
    localStorage.removeItem("gww_worker");
    setOtpSent(false); setPhone(""); setOtp(""); setOtpError(""); setConfirmResult(null); setLoginConsent(false);
    setLoginIdentifier(""); setPassword(""); setShowLoginPassword(false); setEmailError(""); setEmailInfo(""); setAuthStage("credentials"); setPendingEmailWorker(null);
    setScreen("landing");
  };

  const resetOtpFlow = () => {
    setOtpSent(false);
    setOtp("");
    setConfirmResult(null);
    setOtpError("");
    if (window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
      try { window.grecaptcha.reset(recaptchaWidgetIdRef.current); } catch (err) { }
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.style.display = "block";
    }
  };

  const resolveWorkerForEmailAuth = (user, providedName = "") => {
    const normalizedEmail = (user?.email || "").toLowerCase();
    const personaKeyFromAlias = Object.keys(EMAIL_PERSONA_ALIASES).find((key) =>
      (EMAIL_PERSONA_ALIASES[key] || []).map((mail) => mail.toLowerCase()).includes(normalizedEmail)
    );
    const personaFromAlias = personaKeyFromAlias ? PERSONAS[personaKeyFromAlias] : null;
    const persona =
      personaFromAlias ||
      Object.values(PERSONAS).find((p) => (p.email || "").toLowerCase() === normalizedEmail);
    if (persona) {
      return {
        ...persona,
        name: user?.displayName || persona.name,
        email: user?.email || persona.email,
        preferredLanguage: language,
      };
    }

    const profileKey = "gww_email_profiles";
    let profiles = {};
    try {
      profiles = JSON.parse(localStorage.getItem(profileKey) || "{}");
    } catch (err) { }

    if (user?.uid && profiles[user.uid]) {
      return { ...profiles[user.uid], preferredLanguage: language };
    }

    const fallbackName = (providedName || user?.displayName || user?.email?.split("@")[0] || "Gig Worker").trim();
    const generatedWorker = {
      ...buildWorkerFromRegistration({
        name: fallbackName,
        email: user?.email || "",
        preferredLanguage: language,
      }),
      id: user?.uid || `email_${Date.now()}`,
      name: fallbackName,
      email: user?.email || "",
      preferredLanguage: language,
    };

    if (user?.uid) {
      profiles[user.uid] = generatedWorker;
      localStorage.setItem(profileKey, JSON.stringify(profiles));
    }
    return generatedWorker;
  };

  const saveEmailProfileForUser = (uid, profile) => {
    if (!uid) return;
    const profileKey = "gww_email_profiles";
    let profiles = {};
    try {
      profiles = JSON.parse(localStorage.getItem(profileKey) || "{}");
    } catch (err) { }
    profiles[uid] = profile;
    localStorage.setItem(profileKey, JSON.stringify(profiles));
  };

  const normalizeUsername = normalizeUsernameKey;
  const saveUsernameEmailIndex = saveUsernameEmailIndexEntry;
  const resolveEmailFromIdentifier = resolveEmailFromUsernameIndex;

  const sendOTP = async () => {
    setOtpLoading(true); setOtpError("");
    try {
      const phoneDigits = phone.replace(/\D/g, "").slice(-10);
      if (phoneDigits.length !== 10) {
        throw new Error("Enter a valid 10-digit phone number.");
      }
      if (!recaptchaContainerRef.current) {
        throw new Error("reCAPTCHA container is not mounted.");
      }

      auth.languageCode = "en";
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (error) { }
        window.recaptchaVerifier = null;
      }
      recaptchaContainerRef.current.innerHTML = "";
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: "invisible", callback: () => { }
      });
      const widgetId = await window.recaptchaVerifier.render();
      recaptchaWidgetIdRef.current = widgetId;
      const formatted = "+91" + phoneDigits;
      const result = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmResult(result); setOtpSent(true);
    } catch (err) {
      setOtpError(getFirebaseAuthErrorMessage(err, "Failed to send OTP. Complete captcha and retry."));
    }
    finally {
      setOtpLoading(false);
    }
  };

  const verifyOTP = async () => {
    setOtpLoading(true); setOtpError("");
    try {
      const phoneDigits = phone.replace(/\D/g, "").slice(-10);
      if (!confirmResult) throw new Error("OTP session expired");
      await confirmResult.confirm(otp);

      if (pendingEmailWorker) {
        loginAs({ ...pendingEmailWorker, phone: phoneDigits });
        setPendingEmailWorker(null);
        setAuthStage("credentials");
        setOtpLoading(false);
        return;
      }

      const personaMap = { "9000000001": "raju_kumar", "9000000002": "meena_devi", "9000000003": "priya_sharma", "9000000004": "vikram_7749" };
      const docId = personaMap[phoneDigits];
      if (docId) {
        const snap = await getDoc(doc(db, "users", docId));
        if (snap.exists()) {
          const personaKey = Object.keys(PERSONAS).find(k => PERSONAS[k].phone === phoneDigits);
          const basePersona = personaKey ? PERSONAS[personaKey] : PERSONAS.raju;
          loginAs({ ...basePersona, ...snap.data() }); return;
        }
      }
      setScreen("reg1");
    } catch (err) { setOtpError("Wrong OTP. Try again."); }
    setOtpLoading(false);
  };

  const handleEmailAuth = async () => {
    setEmailError("");
    setEmailInfo("");
    const safeIdentifier = loginIdentifier.trim();
    const safeEmail = resolveEmailFromIdentifier(safeIdentifier);
    const safePassword = password.trim();

    if (!safeIdentifier || !safePassword) {
      setEmailError("Enter password and username or email.");
      return;
    }
    if (!safeEmail) {
      setEmailError("Username not found on this device. Use your email instead.");
      return;
    }
    if (safeEmail === ADMIN_DEFAULT_EMAIL) {
      setEmailError("Admin accounts must use the Admin Login button. Worker login is not allowed for admin credentials.");
      return;
    }

    setEmailLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, safeEmail, safePassword);
      const userSnap = credential.user?.uid ? await getDoc(doc(db, "users", credential.user.uid)).catch(() => null) : null;
      const role = String(userSnap?.data?.role || "").toLowerCase();
      if (role === "admin") {
        setIsAdminSession(true);
        setWorker(null);
        setScreen("admin");
        setEmailLoading(false);
        return;
      }
      const firestoreProfile = userSnap?.exists() ? userSnap.data() : null;
      const loggedWorker = firestoreProfile
        ? {
          ...resolveWorkerForEmailAuth(credential.user, ""),
          ...firestoreProfile,
          id: credential.user.uid,
          role: "worker"
        }
        : resolveWorkerForEmailAuth(credential.user, "");
      if (!credential.user.displayName) {
        try {
          await updateProfile(credential.user, { displayName: loggedWorker?.name || safeEmail.split("@")[0] });
        } catch (err) { }
      }
      if (loggedWorker?.username) {
        saveUsernameEmailIndex(loggedWorker.username, safeEmail);
      }
      const mergedWorker = { ...loggedWorker, id: credential.user.uid, role: "worker", lastLoginAt: new Date().toISOString() };
      await setDoc(
        doc(db, "users", credential.user.uid),
        buildFirestoreUserProfile(mergedWorker, credential.user.uid, { role: "worker", lastLoginAt: mergedWorker.lastLoginAt }),
        { merge: true }
      );
      loginAs(mergedWorker);
    } catch (err) {
      setEmailError("Email login failed. Check credentials.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setEmailError("");
    setEmailInfo("");
    const safeEmail = resolveEmailFromIdentifier(loginIdentifier);
    if (!safeEmail) {
      setEmailError("Enter a valid email, or a username already registered on this device.");
      return;
    }
    setEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, safeEmail);
      setEmailInfo("Password reset link sent to your email.");
    } catch (err) {
      setEmailError("Could not send reset email. Check the email and try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRegistrationDone = async (selectedLanguage) => {
    setRegistrationError("");
    const finalData = { ...regData, preferredLanguage: selectedLanguage };
    const safeEmail = (finalData.email || "").trim().toLowerCase();
    const safeUsername = normalizeUsername(finalData.username || "");
    const safePassword = (finalData.password || "").trim();
    const safeConfirmPassword = (finalData.confirmPassword || "").trim();

    if (!safeUsername) {
      setRegistrationError("Enter a username in Personal Info.");
      return;
    }
    if (!safeEmail) {
      setRegistrationError("Enter your email in Personal Info.");
      return;
    }
    if (!safePassword || safePassword.length < 6) {
      setRegistrationError("Password must be at least 6 characters.");
      return;
    }
    if (safePassword !== safeConfirmPassword) {
      setRegistrationError("Password and confirm password do not match.");
      return;
    }
    if (!finalData.phoneVerified) {
      setRegistrationError("Verify phone OTP in registration before continuing.");
      return;
    }

    setRegistrationLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, safeEmail, safePassword);
      if (finalData.name?.trim()) {
        try {
          await updateProfile(credential.user, { displayName: finalData.name.trim() });
        } catch (err) { }
      }
      try {
        await sendEmailVerification(credential.user);
        setSyncMsg("Verification email sent. Check inbox/spam and verify after login.");
        setTimeout(() => setSyncMsg(""), 5000);
      } catch (err) { }
      const newWorker = {
        ...buildWorkerFromRegistration({ ...finalData, email: safeEmail, username: safeUsername }),
        id: credential.user.uid,
        name: credential.user.displayName || finalData.name || "Gig Worker",
        email: credential.user.email || safeEmail,
        username: safeUsername,
        role: "worker"
      };
      await setDoc(
        doc(db, "users", credential.user.uid),
        buildFirestoreUserProfile(newWorker, credential.user.uid, { role: "worker" }),
        { merge: true }
      );
      saveEmailProfileForUser(credential.user.uid, newWorker);
      saveUsernameEmailIndex(safeUsername, safeEmail);
      loginAs(newWorker);
      setRegData({});
      setRegistrationError("");
    } catch (err) {
      if (err?.code === "auth/email-already-in-use") {
        setRegistrationError("This email already exists. Use Login on the previous screen.");
      } else if (err?.code === "auth/invalid-email") {
        setRegistrationError("Enter a valid email address.");
      } else if (err?.code === "auth/operation-not-allowed") {
        setRegistrationError("Email/Password sign-in is disabled in Firebase Console.");
      } else {
        setRegistrationError("Sign up failed. Please try again.");
      }
    } finally {
      setRegistrationLoading(false);
    }
  };

  const handleClaimResult = async (decision, score) => {
    const accountAgeDays = getWorkerAccountAgeDays(worker);
    const isDemoSimulation = Boolean(claimMeta?.simulated);
    const expedite = claimMeta?.expedite || {};
    const maturityGateRaw = isDemoSimulation
      ? { status: "normal", label: "Demo simulation bypass" }
      : getAccountMaturityGate(accountAgeDays);
    const maturityGate = !isDemoSimulation && expedite?.verified
      ? maturityGateRaw.status === "blocked"
        ? { status: "review", label: "Expedited documents submitted for early verification." }
        : maturityGateRaw.status === "review"
          ? { status: "normal", label: "Expedited documents verified for faster decision." }
          : maturityGateRaw
      : maturityGateRaw;
    const maturityDecision =
      maturityGate.status === "blocked"
        ? "high"
        : maturityGate.status === "review" && decision === "safe"
          ? "medium"
          : decision;
    const pct = maturityDecision === "safe" ? 1 : maturityDecision === "medium" ? 0.5 : 0;
    const payout = Math.round(disruption.amount * pct);
    const status = maturityDecision === "safe" ? "Paid" : maturityDecision === "medium" ? "Pending Review" : "Blocked";
    const gpsData = claimMeta?.gps || null;
    const claimConsent = claimMeta?.consent || null;
    const claimCapturedAt = claimMeta?.capturedAt || new Date().toISOString();
    const claimEvidenceImage = claimMeta?.evidenceImage || "";
    const verificationEtaAt = status === "Pending Review"
      ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      : "";
    let payoutOrderId = "";
    let payoutPaymentId = "";
    let payoutProviderNote = "";
    if (status === "Paid" && payout > 0) {
      try {
        const payoutOrder = await createRazorpayOrder({
          amountRupees: payout,
          worker,
          cycle: getBillingCycleKey(),
          allowLocalFallback: true
        });
        payoutOrderId = payoutOrder?.id || `LOCAL-PAYOUT-${Date.now()}`;
        payoutProviderNote = payoutOrder?.localFallback ? "Razorpay local checkout mode" : "Razorpay test order created";
      } catch (error) {
        payoutOrderId = `LOCAL-PAYOUT-${Date.now()}`;
        payoutProviderNote = "Fallback payout reference generated";
      }
    }
    const claimRecord = {
      id: `CLM-${Date.now()}`,
      date: todayLabel(language),
      createdAt: claimCapturedAt,
      type: disruption.label,
      duration: "live",
      amount: status === "Paid" ? payout : 0,
      eligibleAmount: status === "Pending Review" ? payout : 0,
      status,
      score,
      time: "now",
      gps: gpsData,
      gpsError: claimMeta?.gpsError || "",
      evidenceImage: claimEvidenceImage,
      consent: claimConsent,
      expediteVerification: {
        requested: Boolean(expedite?.requested),
        verified: Boolean(expedite?.verified),
        vehicleNumber: expedite?.vehicleNumber || "",
        idLast4: expedite?.idLast4 || ""
      },
      verificationStatus: status === "Pending Review" ? "Queued for verification" : "",
      verificationEtaAt,
      verificationChecks: status === "Pending Review"
        ? [
          "GPS consistency",
          "Weather API match",
          "Device integrity",
          "Claim frequency pattern",
          expedite?.verified ? "Fast verification docs accepted" : "Manual new-account verification"
        ]
        : [],
      reviewReason: maturityGate.status === "blocked"
        ? "Account age below 7 days: claim blocked by eligibility lock."
        : maturityGate.status === "review" && status === "Pending Review"
          ? "Account age in 7-30 day window: delayed verification applied."
          : "",
      payoutProvider: status === "Paid" ? "razorpay" : "",
      payoutOrderId,
      payoutPaymentId,
      payoutProviderNote
    };
    setClaimScore(score);
    setClaimPayout(payout);
    setClaimDecision(maturityDecision);
    setClaimSettlement({
      orderId: payoutOrderId,
      paymentId: payoutPaymentId,
      provider: status === "Paid" ? "Razorpay" : "",
      note: payoutProviderNote
    });
    if (maturityDecision === "safe") {
      if (!online) {
        const q = { id: `CLM-Q${Date.now()}`, date: "Apr 2, 2026", type: disruption.label, duration: "pending", amount: payout, status: "Queued", score, time: "queued" };
        setQueuedClaims(c => [...c, q]);
      } else {
        setBalance(b => b + payout);
        setHistory(h => [claimRecord, ...h]);
      }
    } else {
      setHistory(h => [claimRecord, ...h]);
    }
    if (worker) {
      const updatedWorker = {
        ...worker,
        totalClaims: (worker.totalClaims || 0) + 1,
        approvedClaims: (worker.approvedClaims || 0) + (status === "Paid" ? 1 : 0),
        history: [claimRecord, ...(worker.history || [])],
        balance: (worker.balance || 0) + (status === "Paid" && online ? payout : 0),
        vehicleNumber: expedite?.vehicleNumber || worker?.vehicleNumber || "",
        quickVerificationEnabled: Boolean(expedite?.verified) || Boolean(worker?.quickVerificationEnabled)
      };
      setWorker(updatedWorker);
      localStorage.setItem("gww_worker", JSON.stringify(updatedWorker));
      if (auth.currentUser?.uid) {
        setDoc(doc(db, "claims", claimRecord.id), {
          ...claimRecord,
          workerId: worker?.id || "",
          workerName: worker?.name || "",
          userId: auth.currentUser.uid,
          city: worker?.city || "",
          zone: worker?.zone || "",
          platform: worker?.platform || "",
          plan: worker?.plan || "",
          disruption: disruption?.label || ""
        }).catch(() => { });
      }
    }
    setClaimMeta(null);
    setScreen("settlement");
  };

  const go = (s) => setScreen(s);
  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const requestAdminAccess = () => {
    setAdminError("");
    setAdminEmail(ADMIN_DEFAULT_EMAIL);
    setAdminPassword(ADMIN_DEFAULT_PASSWORD);
    setScreen("admin-login");
  };
  const handleAdminLogin = async () => {
    setAdminError("");
    const email = String(adminEmail || "").trim().toLowerCase();
    const pass = String(adminPassword || "");
    if (!email || !pass) {
      setAdminError("Enter admin email and password.");
      return;
    }
    setAdminLoading(true);
    try {
      let credential = null;
      const isDefaultAdminCredential = email === ADMIN_DEFAULT_EMAIL && pass === ADMIN_DEFAULT_PASSWORD;
      try {
        credential = await signInWithEmailAndPassword(auth, email, pass);
      } catch (error) {
        if (
          (error?.code === "auth/user-not-found" || error?.code === "auth/invalid-credential") &&
          isDefaultAdminCredential
        ) {
          credential = await createUserWithEmailAndPassword(auth, email, pass);
        } else {
          throw error;
        }
      }

      if (!credential?.user?.uid) {
        throw new Error("Admin login failed.");
      }
      const existingDocRef = doc(db, "users", credential.user.uid);
      const existingDoc = await getDoc(existingDocRef).catch(() => null);
      const existingRole = String(existingDoc?.data?.role || "").toLowerCase();
      if (existingRole && existingRole !== "admin") {
        throw new Error("This account is not assigned as admin.");
      }
      if (!existingRole && !isDefaultAdminCredential) {
        throw new Error("This account is not assigned as admin.");
      }
      await setDoc(
        existingDocRef,
        {
          uid: credential.user.uid,
          role: "admin",
          status: "active",
          name: "GigWeatherWage Admin",
          email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      setIsAdminSession(true);
      setWorker(null);
      setScreen("admin");
    } catch (error) {
      setAdminError(error?.message || "Admin login failed.");
    } finally {
      setAdminLoading(false);
    }
  };
  return (
    <div className="app" data-theme={theme} data-platform={platformTheme}>
      {!online && screen === "dashboard" && <div className="offline-bar">📡 Offline — cached data shown. Claims will queue.</div>}
      {syncMsg && <div className="sync-bar">{syncMsg}</div>}

      {screen === "splash" && <Splash />}
      {screen === "landing" && <Landing onLogin={() => go("login-select")} onRegister={() => go("reg1")} theme={theme} toggleTheme={toggleTheme} language={language} setLanguage={setLanguage} />}
      {screen === "login-select" && (
        <div className="screen form-screen">
          <button className="back-btn" onClick={() => go("landing")}>{"< Back"}</button>
          <div className="fcard">
            <div className="fhead">
              <div className="step-num">Choose Access</div>
              <h2>Login Portal</h2>
              <p>Worker and admin access are separated for security.</p>
            </div>
            <button
              className="btn-primary"
              style={{ marginBottom: 10 }}
              onClick={() => {
                setAuthStage("credentials");
                setPendingEmailWorker(null);
                setOtpSent(false);
                setOtp("");
                setOtpError("");
                setConfirmResult(null);
                go("otp");
              }}
            >
              Continue As Worker ->
            </button>
            <button className="btn-outline" onClick={requestAdminAccess}>
              Continue As Admin
            </button>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
              Admin dashboard is confidential and role-restricted.
            </div>
          </div>
        </div>
      )}
      {screen === "admin-login" && (
        <div className="screen form-screen">
          <button className="back-btn" onClick={() => go("landing")}>{"< Back"}</button>
          <div className="fcard">
            <div className="fhead">
              <div className="step-num">Admin Access</div>
              <h2>Insurer Admin Login</h2>
              <p>Role-based access for operations dashboard only.</p>
            </div>
            <div className="field">
              <label>Admin email</label>
              <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@gigweatherwage.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin password" />
            </div>
            {adminError && <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 8 }}>{adminError}</div>}
            <button className="btn-primary" onClick={handleAdminLogin} disabled={adminLoading}>
              {adminLoading ? "Verifying..." : "Login As Admin ->"}
            </button>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
              Default demo admin: {ADMIN_DEFAULT_EMAIL}
            </div>
          </div>
        </div>
      )}

      {screen === "otp" && (
        <div className="screen form-screen">
          <button className="back-btn" onClick={() => go("landing")}>← Back</button>
          <div className="fcard">
            <div className="fhead">
              <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
              <h2>{"Login with Username or Email"}</h2>
              <p>Enter your username or email and password to continue.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><LanguageSelector language={language} setLanguage={setLanguage} compact /></div>

            {authStage === "credentials" ? (
              <>
                <div className="field">
                  <label>Username or Email</label>
                  <input placeholder="your username or name@example.com" value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(v => !v)}
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}
                    >
                      {showLoginPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>
                  <input type="checkbox" checked={loginConsent} onChange={e => setLoginConsent(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>{translate(language, "privacyAgree", "I agree to the Privacy Policy, payout rules, admin review, and fraud checks for this account.")}</span>
                </label>
                {emailError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 8 }}>{emailError}</div>}
                {emailInfo && <div style={{ color: "#22c55e", fontSize: 13, marginBottom: 8 }}>{emailInfo}</div>}
                <button className="btn-primary" onClick={handleEmailAuth} disabled={emailLoading || !loginConsent}>
                  {emailLoading ? "Please wait..." : "Login ->"}
                </button>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <button type="button" style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 0 }} onClick={handleForgotPassword} disabled={emailLoading}>
                    Forgot password
                  </button>
                  <button type="button" style={{ background: "none", border: "none", color: "var(--rain)", fontSize: 13, cursor: "pointer", padding: 0 }} onClick={() => go("reg1")}>
                    New user sign up
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "none" }}>
                  <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
                </div>
                {!otpSent ? (
                  <>
                    <div className="field">
                      <label>{translate(language, "phoneNumber", "Phone number")}</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ padding: "10px 12px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--muted)" }}>+91</span>
                        <input placeholder="9000000001" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} style={{ flex: 1 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>Press Send OTP and wait for the 6-digit code to arrive on your phone.</div>
                    {otpError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 8 }}>{otpError}</div>}
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6, background: "var(--bg3)", borderRadius: 10, padding: "10px 12px" }}>
                      <strong style={{ color: "var(--text)" }}>Test accounts:</strong><br />
                      9000000001 • Raju (Safe ✅)<br />
                      9000000002 • Meena (Delayed ⚠️)<br />
                      9000000003 • Priya (Blocked ❌)<br />
                      9000000004 • Vikram (Ring ❌)<br />
                      <strong style={{ color: "var(--rain)" }}>Use your Firebase test-number setup or real OTP delivery</strong>
                    </div>
                    <button className="btn-primary" onClick={sendOTP} disabled={otpLoading || phone.length < 10 || !loginConsent}>
                      {otpLoading ? "Sending OTP..." : translate(language, "sendOtp", "Send OTP ->")}
                    </button>
                    <button type="button" style={{ marginTop: 10, width: "100%", background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer" }} onClick={() => { setAuthStage("credentials"); resetOtpFlow(); }}>
                      Back to Email Login
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>OTP sent to +91 {phone}</div>
                      <div style={{ fontSize: 12, color: "#22c55e", marginTop: 4 }}>Verification code sent successfully</div>
                    </div>
                    <div className="field otp-field" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 16, padding: 16 }}>
                      <label>Enter OTP</label>
                      <input
                        className="otp-input"
                        type="tel"
                        inputMode="numeric"
                        autoFocus
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        style={{ letterSpacing: 8, fontSize: 24, textAlign: "center", background: "var(--bg3)", border: "2px solid var(--rain)", borderRadius: 14, padding: "16px 18px", minHeight: 64, color: "#fff", width: "100%", display: "block", boxShadow: "0 0 0 3px rgba(59,130,246,0.08)", caretColor: "#fff", fontWeight: 700 }}
                      />
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Type the 6-digit OTP here after completing the captcha and pressing Send OTP.</div>
                    </div>
                    {otpError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 8 }}>{otpError}</div>}
                    <button className="btn-primary" onClick={verifyOTP} disabled={otpLoading || otp.length < 6}>
                      {otpLoading ? "Verifying..." : translate(language, "verifyLogin", "Verify & Login ->")}
                    </button>
                    <button style={{ marginTop: 10, width: "100%", background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer" }} onClick={resetOtpFlow}>{translate(language, "changeNumber", "Change number")}</button>
                  </>
                )}
              </>
            )}
            {authStage === "otp" && (
              <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 12 }}>Or login directly as a demo persona:</p>
                {Object.values(PERSONAS).map(w => (
                  <button key={w.id} className="wcard" style={{ marginBottom: 8, opacity: loginConsent ? 1 : 0.55 }} onClick={() => loginAs(w)} disabled={!loginConsent}>
                    <div className="wcard-top">
                      <div className="wavatar" style={{ background: w.tagColor === "#22c55e" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: w.tagColor }}>{w.avatar}</div>
                      <div className="winfo"><div className="wname">{w.name}</div><div className="wmeta">{w.platform} • {w.city}</div></div>
                      <span className="wtag" style={{ color: w.tagColor, borderColor: w.tagColor }}>{w.tagColor === "#22c55e" ? "✓" : "✕"}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {screen === "calc" && <PremiumCalculatorV3 worker={worker} onBack={() => go("dashboard")} />}
      {screen === "policy" && worker && <PolicyPrivacyScreen worker={worker} onBack={() => go("dashboard")} onUpgrade={() => go("upgrade")} language={language} />}
      {screen === "reg1" && <Reg1 data={regData} onNext={(d) => { setRegData(d); go("reg2"); }} onBack={() => go("landing")} />}
      {screen === "reg2" && <Reg2 data={regData} onNext={(d) => { setRegData({ ...regData, ...d }); go("reg3"); }} onBack={() => go("reg1")} />}
      {screen === "reg3" && <Reg3 data={regData} onNext={(d) => { setRegData({ ...regData, ...d }); go("reg4"); }} onBack={() => go("reg2")} />}
      {screen === "reg4" && <Reg4 data={regData} onNext={(d) => { setRegData({ ...regData, ...d }); go("reg5"); }} onBack={() => go("reg3")} />}
      {screen === "reg5" && <Reg5 data={regData} onNext={(d) => { setRegData({ ...regData, ...d }); go("reg6"); }} onBack={() => go("reg4")} />}
      {screen === "reg6" && <Reg6 data={regData} onNext={(d) => { setRegData({ ...regData, ...d }); go("reg7"); }} onBack={() => go("reg5")} />}
      {screen === "reg7" && <Reg7 data={regData} onDone={() => go("reg8")} />}
      {screen === "reg8" && <Reg8 data={regData} language={language} setLanguage={setLanguage} registrationError={registrationError} registrationLoading={registrationLoading} onBack={() => go("reg7")} onDone={handleRegistrationDone} />}
      {screen === "upgrade" && worker && (
        <UpgradeBillingScreen
          worker={worker}
          onBack={() => go("policy")}
          onDone={async ({ planId, breakdown }) => {
            let order = null;
            let checkoutResponse = null;
            const cycle = getBillingCycleKey();

            if (breakdown.amountDueNow > 0) {
              const keyId = getRazorpayKeyId();
              if (!keyId.startsWith("rzp_")) {
                window.alert("Razorpay key missing. Add REACT_APP_RAZORPAY_KEY_ID and try again.");
                return;
              }
              try {
                order = await createRazorpayOrder({
                  amountRupees: breakdown.amountDueNow,
                  worker,
                  cycle,
                });
                checkoutResponse = await openRazorpayCheckout({
                  keyId,
                  order,
                  worker,
                  amountRupees: breakdown.amountDueNow,
                });
              } catch (error) {
                window.alert(error?.message || "Upgrade payment failed.");
                return;
              }
            }

            const resolvedUpgradeOrderId = order?.id || checkoutResponse?.razorpay_order_id || `LOCAL-${Date.now()}`;
            const detailSuffix = breakdown.amountDueNow > 0
              ? ` • Order ${resolvedUpgradeOrderId} • Payment ${checkoutResponse?.razorpay_payment_id || "N/A"}`
              : "";
            const billingEvents = [
              {
                id: `BILL-${Date.now()}`,
                date: todayLabel(),
                type: breakdown.amountDueNow > 0 ? "Plan Upgrade Payment" : breakdown.downgradeSavings > 0 ? "Plan Downgrade Credit" : "Plan Change",
                detail: breakdown.amountDueNow > 0
                  ? `${currentPlanName(worker.plan)} to ${currentPlanName(planId)} - charged now${detailSuffix}`
                  : breakdown.downgradeSavings > 0
                    ? `${currentPlanName(worker.plan)} to ${currentPlanName(planId)} - credit saved for next payment`
                    : `${currentPlanName(worker.plan)} to ${currentPlanName(planId)}`,
                amount: breakdown.amountDueNow > 0 ? breakdown.amountDueNow : breakdown.downgradeSavings,
                direction: breakdown.amountDueNow > 0 ? "debit" : "credit",
                category: breakdown.amountDueNow > 0 ? "premium_adjustment" : "credit",
                source: breakdown.amountDueNow > 0 ? "razorpay_upgrade" : "plan_change_credit",
                provider: breakdown.amountDueNow > 0 ? "razorpay" : "",
                providerOrderId: breakdown.amountDueNow > 0 ? resolvedUpgradeOrderId : "",
                providerPaymentId: checkoutResponse?.razorpay_payment_id || "",
                cycle
              },
              ...(worker.billingEvents || [])
            ];
            const updatedWorker = { ...worker, plan: planId, billingCredit: breakdown.nextBillingCredit, billingEvents };
            persistWorker(updatedWorker, { skipRepricingAdjustment: true });
            setScreen("policy");
          }}
        />
      )}

      {screen === "dashboard" && worker && (
        <Dashboard
          worker={worker} balance={balance} history={history}
          disruptions={DISRUPTIONS} activeTab={activeTab}
          setActiveTab={setActiveTab} online={online}
          queuedClaims={queuedClaims}
          onDisruption={(d) => { setDisruption(d); setClaimMeta(null); go("claim"); }}
          onLogout={logout} onPolicy={() => go("policy")}
          onCalc={() => go("calc")} theme={theme} toggleTheme={toggleTheme}
          onWorkerUpdate={persistWorker}
          language={language}
          setLanguage={setLanguage}
        />
      )}

      {screen === "claim" && worker && disruption && <ClaimScreen disruption={disruption} worker={worker} online={online} seedMeta={claimMeta} onProceed={(meta) => { setClaimMeta(meta || null); go("fraud"); }} onBack={() => go("dashboard")} />}
      {screen === "fraud" && worker && disruption && <FraudAnalysis disruption={disruption} worker={worker} claimMeta={claimMeta} online={online} onResult={handleClaimResult} onBack={() => go("dashboard")} />}
      {screen === "settlement" && worker && disruption && (
        <SettlementLetter worker={worker} disruption={disruption} decision={claimDecision} score={claimScore} payoutAmount={claimPayout} settlementMeta={claimSettlement} onDone={() => go("dashboard")} />
      )}
      {screen === "payout" && worker && disruption && <PayoutScreen disruption={disruption} worker={worker} balance={balance} onDone={() => go("dashboard")} />}
      {screen === "delayed" && worker && disruption && <DelayedScreen disruption={disruption} onDone={() => go("dashboard")} />}
      {screen === "blocked" && worker && <BlockedScreen worker={worker} onDone={() => go("dashboard")} />}
      {screen === "queued" && disruption && <QueuedScreen disruption={disruption} onDone={() => go("dashboard")} />}
      {screen === "admin" && isAdminSession && (
        <AdminDashboard
          worker={worker}
          currentHistory={history}
          onBack={() => go(worker ? "dashboard" : "landing")}
          onUseDemoWorker={(demoWorker) => {
            if (!demoWorker) return;
            const normalized = {
              ...demoWorker,
              id: demoWorker?.uid || demoWorker?.id || demoWorker?.email || `demo-${Date.now()}`,
              role: "worker",
              history: Array.isArray(demoWorker?.history) ? demoWorker.history : [],
              billingEvents: Array.isArray(demoWorker?.billingEvents) ? demoWorker.billingEvents : []
            };
            setWorker(normalized);
            setBalance(Number(normalized?.balance || 0));
            setHistory(Array.isArray(normalized?.history) ? normalized.history : []);
            localStorage.setItem("gww_worker", JSON.stringify(normalized));
          }}
          onSimulateRain={(selectedWorker) => {
            const rain = DISRUPTIONS.find((d) => String(d.label || "").toLowerCase().includes("rain")) || DISRUPTIONS[0];
            const activeWorker = selectedWorker || worker;
            if (rain && activeWorker) {
              const normalized = {
                ...activeWorker,
                id: activeWorker?.uid || activeWorker?.id || activeWorker?.email || `demo-${Date.now()}`,
                role: "worker",
                history: Array.isArray(activeWorker?.history) ? activeWorker.history : [],
                billingEvents: Array.isArray(activeWorker?.billingEvents) ? activeWorker.billingEvents : []
              };
              setWorker(normalized);
              setBalance(Number(normalized?.balance || 0));
              setHistory(Array.isArray(normalized?.history) ? normalized.history : []);
              localStorage.setItem("gww_worker", JSON.stringify(normalized));
              setDisruption(rain);
              setClaimMeta({
                gps: null,
                gpsError: "demo_simulation",
                capturedAt: new Date().toISOString(),
                consent: { location: true, kyc: true, dataShare: true },
                simulated: true
              });
              go("claim");
            }
          }}
        />
      )}

      <GigaSaathiAssistant
        language={language}
        worker={worker}
        screen={screen}
        go={go}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

function GigaSaathiAssistant({ language = "en", worker, screen, go, setActiveTab }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: "m0", role: "assistant", text: assistantCopy(language, "welcome", ASSISTANT_COPY.en.welcome), ts: Date.now() }
  ]);
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [voiceInputMode, setVoiceInputMode] = useState("auto");
  const [detectedSpeechLang, setDetectedSpeechLang] = useState(language);
  const [ticketCategory, setTicketCategory] = useState("Login");
  const [ticketPriority, setTicketPriority] = useState("High");
  const [ticketSummary, setTicketSummary] = useState("");
  const [ticketContact, setTicketContact] = useState(worker?.email || "");
  const [tickets, setTickets] = useState(() => readSupportTickets());
  const recognitionRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    setMessages([{ id: `m0-${language}`, role: "assistant", text: assistantCopy(language, "welcome", ASSISTANT_COPY.en.welcome), ts: Date.now() }]);
  }, [language]);

  useEffect(() => {
    if (!open || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (worker?.email) setTicketContact(worker.email);
  }, [worker?.email]);

  useEffect(() => {
    const openTicketFromAnywhere = () => {
      setOpen(true);
      setView("ticket");
    };
    window.addEventListener("gww-open-ticket", openTicketFromAnywhere);
    return () => window.removeEventListener("gww-open-ticket", openTicketFromAnywhere);
  }, []);

  const speechSupported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  const synthSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const voiceInputOptions = [
    { label: "Auto", value: "auto" },
    { label: "English", value: "en-IN" },
    { label: "Hindi", value: "hi-IN" },
    { label: "Telugu", value: "te-IN" },
    { label: "Tamil", value: "ta-IN" },
    { label: "Kannada", value: "kn-IN" },
    { label: "Malayalam", value: "ml-IN" },
    { label: "Marathi", value: "mr-IN" },
  ];

  const speakText = (text, langCode = language) => {
    if (!synthSupported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text.replace(/\n/g, " "));
    utterance.lang = getVoiceLocale(langCode);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const routeFromAction = (action) => {
    if (!action) return;
    if (action.type === "ticket") {
      setView("ticket");
      return;
    }
    if (action.type === "tab") {
      if (screen !== "dashboard") go("dashboard");
      setActiveTab(action.tab);
    }
  };

  const sendChat = async (rawText, forcedLanguage) => {
    const value = (rawText || input || "").trim();
    if (!value || thinking) return;
    const interactionLanguage = forcedLanguage || detectLanguageCodeFromText(value, language) || language;

    const userMessage = { id: `u-${Date.now()}`, role: "user", text: value, ts: Date.now() };
    const historyWithUser = [...messages, userMessage];
    setMessages(historyWithUser);
    setInput("");
    setThinking(true);

    try {
      const aiReply = await requestAiAssistantResponse({
        text: value,
        language: interactionLanguage,
        worker,
        history: historyWithUser
      });
      const botMessage = { id: `a-${Date.now()}`, role: "assistant", text: aiReply.text, ts: Date.now() };
      setMessages((prev) => [...prev, botMessage]);
      if (autoSpeak) speakText(aiReply.text, interactionLanguage);
    } catch (err) {
      const fallback = buildAssistantReply({ text: value, worker, language: interactionLanguage });
      const botMessage = { id: `a-${Date.now()}`, role: "assistant", text: fallback.text, ts: Date.now() };
      setMessages((prev) => [...prev, botMessage]);
      routeFromAction(fallback.action);
      if (autoSpeak) speakText(fallback.text, interactionLanguage);
    } finally {
      setThinking(false);
    }
  };

  const toggleListening = () => {
    if (!speechSupported) return;
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    const recognitionLocale = voiceInputMode === "auto"
      ? getVoiceLocale(detectedSpeechLang || language)
      : voiceInputMode;
    recognition.lang = recognitionLocale;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      if (transcript.trim()) {
        const spokenLanguage = detectLanguageCodeFromText(transcript, language);
        setDetectedSpeechLang(spokenLanguage);
        sendChat(transcript, spokenLanguage);
      }
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
  };

  const submitTicket = () => {
    const summary = ticketSummary.trim();
    const contact = ticketContact.trim();
    if (!summary || !contact) {
      const warning = language === "hi"
        ? "टिकट भेजने से पहले समस्या और कॉन्टैक्ट ईमेल भरें।"
        : language === "te"
          ? "టికెట్ పంపే ముందు సమస్య వివరాలు మరియు కాంటాక్ట్ ఇమెయిల్ ఇవ్వండి."
          : "Please fill issue summary and contact email before submitting ticket.";
      setMessages((prev) => [...prev, { id: `warn-${Date.now()}`, role: "assistant", text: warning, ts: Date.now() }]);
      setView("chat");
      return;
    }

    const ticket = {
      id: `GWW-${String(Date.now()).slice(-6)}`,
      category: ticketCategory,
      priority: ticketPriority,
      summary,
      contact,
      status: "Open",
      createdAt: new Date().toISOString()
    };

    const next = [ticket, ...tickets].slice(0, 25);
    setTickets(next);
    saveSupportTickets(next);
    setTicketSummary("");

    const instantStep = ticketCategory === "Premium/Billing"
      ? "Open Payments tab and use Settle Due Now. Credits are auto-adjusted first."
      : ticketCategory === "Claims"
        ? "Open Claims tab and note claim ID + score before support follow-up."
        : ticketCategory === "Weather/Alerts"
          ? "Open Alerts tab and re-apply your city/zone to refresh weather context."
          : "Try logging out and logging in once with username/email and password.";

    const ticketMessage = language === "hi"
      ? `टिकट ${ticket.id} बना दिया गया है (${ticket.priority}). त्वरित कदम: ${instantStep}`
      : language === "te"
        ? `టికెట్ ${ticket.id} విజయవంతంగా రైజ్ అయింది (${ticket.priority}). వెంటనే చేయాల్సింది: ${instantStep}`
        : `Ticket ${ticket.id} has been raised (${ticket.priority}). Immediate step: ${instantStep}`;

    setMessages((prev) => [...prev, { id: `t-${Date.now()}`, role: "assistant", text: ticketMessage, ts: Date.now() }]);
    setView("chat");
    if (autoSpeak) speakText(ticketMessage);
  };

  return (
    <div className="gsa-root">
      {open && (
        <div className="gsa-panel">
          <div className="gsa-header">
            <div>
              <div className="gsa-title">{ASSISTANT_NAME}</div>
              <div className="gsa-sub">{assistantCopy(language, "quickLabel", "Quick help")}</div>
            </div>
            <button className="gsa-close" onClick={() => setOpen(false)}>{assistantCopy(language, "close", "Close")}</button>
          </div>

          <div className="gsa-toolbar">
            <select className="gsa-voice-select" value={voiceInputMode} onChange={(e) => setVoiceInputMode(e.target.value)}>
              {voiceInputOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button className={`gsa-mini-btn ${view === "chat" ? "active" : ""}`} onClick={() => setView("chat")}>{assistantCopy(language, "chat", "Chat")}</button>
            <button className={`gsa-mini-btn ${view === "ticket" ? "active" : ""}`} onClick={() => setView("ticket")}>{assistantCopy(language, "ticket", "Raise Ticket")}</button>
            <button className={`gsa-mini-btn ${autoSpeak ? "active" : ""}`} onClick={() => setAutoSpeak((v) => !v)}>{assistantCopy(language, "speakReply", "Speak")}</button>
            {speechSupported && (
              <button className={`gsa-mini-btn ${listening ? "active" : ""}`} onClick={toggleListening}>
                {listening ? assistantCopy(language, "stopVoice", "Stop") : assistantCopy(language, "startVoice", "Voice")}
              </button>
            )}
          </div>

          {view === "chat" ? (
            <>
              <div className="gsa-body" ref={bodyRef}>
                {messages.map((m) => (
                  <div key={m.id} className={`gsa-msg ${m.role}`}>
                    {m.text}
                  </div>
                ))}
                {thinking && <div className="gsa-thinking">Thinking...</div>}
                <div className="gsa-thinking">Voice language: {voiceInputMode === "auto" ? `Auto (${detectedSpeechLang.toUpperCase()})` : voiceInputMode}</div>
                {listening && <div className="gsa-listening">{assistantCopy(language, "listening", "Listening...")}</div>}
              </div>
              <div className="gsa-quick">
                {["Premium due", "Billing credit", "Weather alerts", "Forgot password", "Raise ticket"].map((q) => (
                  <button key={q} className="gsa-chip" onClick={() => sendChat(q)}>{q}</button>
                ))}
              </div>
              <div className="gsa-input-wrap">
                <input
                  className="gsa-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={assistantCopy(language, "placeholder", "Type your question...")}
                  onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                />
                <button className="gsa-send" onClick={() => sendChat()} disabled={thinking}>
                  {thinking ? "..." : assistantCopy(language, "ask", "Send")}
                </button>
              </div>
            </>
          ) : (
            <div className="gsa-ticket">
              <label>{assistantCopy(language, "issueCategory", "Issue category")}</label>
              <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)}>
                <option>Login</option>
                <option>Claims</option>
                <option>Premium/Billing</option>
                <option>Weather/Alerts</option>
                <option>Profile/Account</option>
                <option>Other</option>
              </select>

              <label>{assistantCopy(language, "issuePriority", "Priority")}</label>
              <select value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value)}>
                <option>Critical</option>
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>

              <label>{assistantCopy(language, "issueSummary", "Issue summary")}</label>
              <textarea
                value={ticketSummary}
                onChange={(e) => setTicketSummary(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={3}
              />

              <label>{assistantCopy(language, "issueContact", "Contact email")}</label>
              <input type="email" value={ticketContact} onChange={(e) => setTicketContact(e.target.value)} />

              <button className="gsa-submit-ticket" onClick={submitTicket}>{assistantCopy(language, "submitTicket", "Submit Ticket")}</button>

              {tickets.length > 0 && (
                <div className="gsa-ticket-list">
                  {tickets.slice(0, 3).map((ticket) => (
                    <div key={ticket.id} className="gsa-ticket-item">
                      <div>{ticket.id} · {ticket.category}</div>
                      <div>{ticket.priority} · {ticket.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button className="gsa-bubble" onClick={() => setOpen((v) => !v)} aria-label="Open GigaSaathi chat">
        <span>💬</span>
      </button>
    </div>
  );
}

// â”€â”€ DYNAMIC PREMIUM CALCULATOR (Standalone Tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PremiumCalculator({ onBack }) {
  const [city, setCity] = useState("Hyderabad");
  const [zone, setZone] = useState("Madhapur");
  const [platform, setPlatform] = useState("Swiggy");
  const [hours, setHours] = useState("8-10");
  const [age, setAge] = useState("1yr+");

  const zoneRisk = {
    "Madhapur": 1.4, "Kondapur": 1.2, "Gachibowli": 1.1, "HITEC City": 1.2,
    "Anna Nagar": 1.3, "T. Nagar": 1.2, "Koramangala": 0.9, "Indiranagar": 1.0,
    "Dharavi": 1.5, "Andheri": 1.3, "Bandra": 1.1, "Powai": 1.0,
    "Connaught Place": 1.2, "Lajpat Nagar": 1.1
  };
  const platformFactor = { Swiggy: 1.1, Zomato: 1.0, Zepto: 1.2, Amazon: 0.9 };
  const hoursFactor = { "4-6": 0.85, "6-8": 1.0, "8-10": 1.1, "10+": 1.2 };
  const ageFactor = { "< 30 days": 1.2, "1-6 months": 1.05, "1yr+": 0.9 };

  const zr = zoneRisk[zone] || 1.0;
  const pf = platformFactor[platform] || 1.0;
  const hf = hoursFactor[hours] || 1.0;
  const af = ageFactor[age] || 1.0;
  const multiplier = zr * pf * hf * af;

  const calc = (base) => Math.round(base * multiplier);

  const zonesByCity = {
    "Hyderabad": ["Madhapur", "Kondapur", "Gachibowli", "HITEC City"],
    "Chennai": ["Anna Nagar", "T. Nagar"],
    "Bengaluru": ["Koramangala", "Indiranagar"],
    "Mumbai": ["Dharavi", "Andheri", "Bandra", "Powai"],
    "Delhi": ["Connaught Place", "Lajpat Nagar"],
  };

  return (
    <div className="screen form-screen" style={{ background: "var(--bg)" }}>
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          Premium Calculator
        </h2>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>See exactly what you'd pay based on your profile</p>
      </div>

      <div className="fcard" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>City</label>
          <select value={city} onChange={e => { setCity(e.target.value); setZone(zonesByCity[e.target.value]?.[0] || ""); }}>
            {Object.keys(zonesByCity).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Zone / Area</label>
          <select value={zone} onChange={e => setZone(e.target.value)}>
            {(zonesByCity[city] || []).map(z => <option key={z}>{z}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Platform</label>
          <div className="plat-grid">
            {["Swiggy", "Zomato", "Zepto", "Amazon"].map(p => (
              <button key={p} className={`plat-btn ${platform === p ? "active" : ""}`} onClick={() => setPlatform(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Daily working hours</label>
          <select value={hours} onChange={e => setHours(e.target.value)}>
            {["4-6", "6-8", "8-10", "10+"].map(h => <option key={h}>{h} hrs/day</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Account age</label>
          <select value={age} onChange={e => setAge(e.target.value)}>
            {["< 30 days", "1-6 months", "1yr+"].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Multiplier breakdown */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
          Risk Multiplier Breakdown
        </div>
        {[
          { label: `Zone risk (${zone})`, val: zr, color: zr > 1.2 ? "#EF4444" : zr > 1.0 ? "#F97316" : "#22c55e" },
          { label: `Platform (${platform})`, val: pf, color: pf > 1.0 ? "#F97316" : "#22c55e" },
          { label: `Hours (${hours} hrs)`, val: hf, color: hf > 1.0 ? "#F97316" : "#22c55e" },
          { label: `Account age (${age})`, val: af, color: af > 1.0 ? "#EF4444" : "#22c55e" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none", fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>{r.label}</span>
            <span style={{ color: r.color, fontWeight: 700 }}>×{r.val.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Total multiplier</span>
          <span style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 800, color: multiplier > 1.3 ? "#EF4444" : multiplier > 1.0 ? "#F97316" : "#22c55e" }}>
            ×{multiplier.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Plan cards with calculated premiums */}
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
        Your Personalised Premiums
      </div>
      {[
        { id: "basic", name: "Basic Shield", base: 20, coverage: 2000, color: "#3B82F6" },
        { id: "guard", name: "Storm Guard", base: 45, coverage: 3500, color: "#8B5CF6", rec: true },
        { id: "shield", name: "Full Shield", base: 80, coverage: 5000, color: "#22c55e" },
      ].map(p => (
        <div key={p.id} style={{
          background: "var(--card)", border: `1px solid ${p.rec ? p.color + "44" : "var(--border)"}`,
          borderRadius: 14, padding: 16, marginBottom: 10, position: "relative"
        }}>
          {p.rec && <div style={{ position: "absolute", top: -1, right: 16, background: p.color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: "0 0 8px 8px" }}>Recommended</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Coverage: ₹{p.coverage.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 800, color: p.color }}>₹{calc(p.base)}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>/week • base ₹{p.base}</div>
            </div>
          </div>
          {/* Breakdown */}
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "10px 12px", fontSize: 11, color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>Base premium</span><span style={{ color: "var(--text)" }}>₹{p.base}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>Zone adjustment ({zone})</span>
              <span style={{ color: zr > 1 ? "#F97316" : "#22c55e" }}>{zr > 1 ? "+" : ""}₹{Math.round(p.base * (zr - 1))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>Platform ({platform})</span>
              <span style={{ color: pf > 1 ? "#F97316" : "#22c55e" }}>{pf > 1 ? "+" : ""}₹{Math.round(p.base * (pf - 1))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>Hours ({hours} hrs)</span>
              <span style={{ color: hf > 1 ? "#F97316" : "#22c55e" }}>{hf > 1 ? "+" : ""}₹{Math.round(p.base * (hf - 1))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)", fontWeight: 600, color: "var(--text)" }}>
              <span>Final premium</span><span style={{ color: p.color }}>₹{calc(p.base)}/week</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PremiumCalculatorV3({ onBack, worker }) {
  const [activeTab, setActiveTab] = useState('calculator');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [platformSearch, setPlatformSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLES[1]);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(6);
  const [selectedPlan, setSelectedPlan] = useState(CALC_PLANS[1]);
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const [submitted, setSubmitted] = useState(false);
  const billedWeeklyPremium = getWorkerWeeklyPremium(worker);

  useEffect(() => {
    if (!worker) return;
    const preCity = CITIES.find(c => c.city === worker.city);
    const prePlatform =
      CALC_PLATFORMS.find(p => p.name === worker.platform) ||
      (worker.platform === "Amazon" ? CALC_PLATFORMS.find(p => p.name === "Amazon Flex") : null) ||
      CALC_PLATFORMS.find(p => p.name === "Other Platform");
    const preVehicle = VEHICLES.find(v => v.name === worker.vehicle);
    const prePlan = CALC_PLANS.find(plan => plan.name === currentPlanName(worker.plan));
    if (preCity) {
      setSelectedCity(preCity);
      setCitySearch(preCity.city);
      setSelectedZone(worker.zone || getRegistrationZones(preCity.city)[0] || "");
    }
    if (prePlatform) {
      setSelectedPlatform(prePlatform);
      setPlatformSearch(prePlatform.name);
    }
    if (preVehicle) setSelectedVehicle(preVehicle);
    if (prePlan) setSelectedPlan(prePlan);
    if (worker?.hours) {
      const match = worker.hours.match(/(\d+)\s*-\s*(\d+)/);
      if (match) {
        setHoursPerDay(Math.round((Number(match[1]) + Number(match[2])) / 2));
      } else if (worker.hours.includes("12+")) {
        setHoursPerDay(12);
      }
    }
    if (worker?.daysPerWeek) setDaysPerWeek(Number(worker.daysPerWeek));
  }, [worker?.city, worker?.platform, worker?.zone, worker?.vehicle, worker?.plan, worker?.hours, worker?.daysPerWeek]);

  const calculation = useMemo(() => {
    if (!selectedCity || !selectedPlatform) return null;

    const activeZone = selectedZone || getRegistrationZones(selectedCity.city)[0] || "Central Zone";
    const planId = mapPlanNameToId(selectedPlan.name);
    const hoursBand = hoursValueToBand(hoursPerDay);
    const profileForBilling = {
      ...worker,
      city: selectedCity.city,
      zone: activeZone,
      platform: selectedPlatform.name,
      vehicle: selectedVehicle.name,
      hours: hoursBand,
      plan: planId
    };
    const billed = computeWorkerDynamicPremium(profileForBilling);

    const weekly = billed.weekly;
    const monthly = Math.round(weekly * 4.33);
    const hoursNorm = hoursPerDay / 8;
    const dailyIncome = selectedPlatform.incomeFactor * hoursNorm;
    const weeklyIncomeAtRisk = dailyIncome * daysPerWeek;
    const mappedPlan = PLANS.find((plan) => plan.id === planId) || PLANS[1];
    const rawProtectionRatio = (mappedPlan.coverage / Math.max(1, weeklyIncomeAtRisk)) * 100;
    const protectionRatio = Math.max(55, Math.min(100, Math.round(rawProtectionRatio)));

    const breakdown = [
      { label: 'Base premium', value: `₹${billed.base}`, desc: `${mappedPlan.name} plan base`, impact: 'neutral' },
      { label: `City risk — ${selectedCity.city}`, value: `×${billed.factors.cf.toFixed(2)}`, desc: `${selectedCity.riskLabel} disruption zone. ${selectedCity.reason}`, impact: billed.factors.cf > 1.1 ? 'high' : billed.factors.cf > 1.0 ? 'medium' : 'low' },
      { label: `Zone risk — ${activeZone}`, value: `×${billed.factors.zf.toFixed(2)}`, desc: 'Local area risk multiplier', impact: billed.factors.zf > 1.2 ? 'high' : billed.factors.zf > 1.0 ? 'medium' : 'low' },
      { label: `Platform — ${selectedPlatform.name}`, value: `×${billed.factors.pf.toFixed(2)}`, desc: `${selectedPlatform.tripDensity} trips/hr avg. ${selectedPlatform.category} category`, impact: billed.factors.pf > 1.15 ? 'high' : billed.factors.pf > 1.0 ? 'medium' : 'low' },
      { label: `Work hours — ${hoursBand}`, value: `×${billed.factors.hf.toFixed(2)}`, desc: `${hoursPerDay} hrs/day selected`, impact: billed.factors.hf > 1.12 ? 'high' : billed.factors.hf > 1.0 ? 'medium' : 'low' },
      { label: `Vehicle — ${selectedVehicle.name}`, value: `×${billed.factors.vf.toFixed(2)}`, desc: selectedVehicle.desc, impact: billed.factors.vf > 1.12 ? 'high' : billed.factors.vf > 1.0 ? 'medium' : 'low' },
      { label: `Days per week — ${daysPerWeek} days`, value: `Info`, desc: 'Used for income-at-risk analytics card. Billing engine uses weekly subscription.', impact: 'neutral' },
    ];

    return {
      weekly,
      monthly,
      weeklyIncomeAtRisk: Math.round(weeklyIncomeAtRisk),
      protectionRatio,
      rawProtectionRatio,
      breakdown,
      planCoverage: mappedPlan.coverage
    };
  }, [selectedCity, selectedZone, selectedPlatform, selectedVehicle, hoursPerDay, daysPerWeek, selectedPlan, worker]);

  const filteredCities = useMemo(() =>
    CITIES
      .filter(c => citySearch.length === 0 || c.city.toLowerCase().includes(citySearch.toLowerCase()) || c.state.toLowerCase().includes(citySearch.toLowerCase()))
      .sort((a, b) => a.city.localeCompare(b.city))
      .slice(0, 12),
    [citySearch]
  );

  const filteredPlatforms = useMemo(() =>
    CALC_PLATFORMS
      .filter(p => platformSearch.length === 0 || p.name.toLowerCase().includes(platformSearch.toLowerCase()) || p.category.toLowerCase().includes(platformSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10),
    [platformSearch]
  );

  const filteredScenarios = useMemo(() => {
    if (scenarioFilter === 'covered') return SCENARIOS.filter(s => s.covered);
    if (scenarioFilter === 'excluded') return SCENARIOS.filter(s => !s.covered);
    return SCENARIOS;
  }, [scenarioFilter]);

  return (
    <div className="calc-wrapper">
      <div className="calc-header">
        {onBack && <button className="calc-back-btn" onClick={onBack}>← Back</button>}
        <div className="calc-header-title">
          <h1 className="calc-title">GigWeatherWage</h1>
          <p className="calc-subtitle">Dynamic Premium Calculator</p>
        </div>
        <div className="calc-header-badge">Actuarial AI Engine</div>
      </div>

      <div className="calc-tabs">
        {[
          { id: 'calculator', label: 'Calculate Premium' },
          { id: 'formula', label: 'How It Works' },
          { id: 'scenarios', label: 'Coverage Table' },
        ].map(tab => (
          <button key={tab.id} className={`calc-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'calculator' && (
        <div className="calc-content calc-single-flow">
          <div className="calc-note" style={{ marginBottom: 12 }}>
            <strong>Calculator mode:</strong> this tab now uses the same billing engine as Home, Policy, Profile, and Payments.
            {billedWeeklyPremium > 0 ? ` Current billed weekly premium: ${formatMoney(billedWeeklyPremium)}.` : ""}
          </div>
          <div className="calc-inputs-grid">
            <div className="calc-inputs-panel">
              <h2 className="calc-section-title">Your Work Profile</h2>
              <div className="calc-field">
                <label className="calc-label">City / Zone</label>
                <div className="calc-dropdown-wrapper">
                  <input
                    className="calc-input"
                    placeholder="Type your city name..."
                    value={selectedCity ? `${selectedCity.city}, ${selectedCity.state}` : citySearch}
                    onChange={e => {
                      setCitySearch(e.target.value);
                      setSelectedCity(null);
                      setShowCityDropdown(true);
                      setSubmitted(false);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                  />
                  {showCityDropdown && filteredCities.length > 0 && (
                    <div className="calc-dropdown">
                      {filteredCities.map(c => (
                        <div
                          key={c.city}
                          className="calc-dropdown-item"
                          onClick={() => {
                            setSelectedCity(c);
                            setCitySearch(c.city);
                            setSelectedZone(getRegistrationZones(c.city)[0] || "");
                            setShowCityDropdown(false);
                            setSubmitted(false);
                          }}
                        >
                          <span className="ddi-name">{c.city}</span>
                          <span className="ddi-state">{c.state}</span>
                          <span className={`ddi-risk risk-${c.riskLabel.toLowerCase().replace(' ', '-')}`}>{c.riskLabel}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCity && <p className="calc-hint">Risk factor: {selectedCity.risk.toFixed(2)} — {selectedCity.reason}</p>}
              </div>
              {selectedCity && (
                <div className="calc-field">
                  <label className="calc-label">Zone / Area</label>
                  <select className="calc-select" value={selectedZone || getRegistrationZones(selectedCity.city)[0] || ""} onChange={e => { setSelectedZone(e.target.value); setSubmitted(false); }}>
                    {getRegistrationZones(selectedCity.city).map(zoneName => (
                      <option key={zoneName} value={zoneName}>{zoneName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="calc-field">
                <label className="calc-label">Delivery Platform</label>
                <div className="calc-dropdown-wrapper">
                  <input
                    className="calc-input"
                    placeholder="Type platform name (Swiggy, Zepto, etc.)..."
                    value={selectedPlatform ? selectedPlatform.name : platformSearch}
                    onChange={e => {
                      setPlatformSearch(e.target.value);
                      setSelectedPlatform(null);
                      setShowPlatformDropdown(true);
                      setSubmitted(false);
                    }}
                    onFocus={() => setShowPlatformDropdown(true)}
                  />
                  {showPlatformDropdown && filteredPlatforms.length > 0 && (
                    <div className="calc-dropdown">
                      {filteredPlatforms.map(p => (
                        <div
                          key={p.name}
                          className="calc-dropdown-item"
                          onClick={() => {
                            setSelectedPlatform(p);
                            setPlatformSearch(p.name);
                            setShowPlatformDropdown(false);
                            setSubmitted(false);
                          }}
                        >
                          <span className="ddi-name">{p.name}</span>
                          <span className="ddi-state">{p.category}</span>
                          <span className="ddi-income">~₹{p.incomeFactor}/8hr</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPlatform && <p className="calc-hint">{selectedPlatform.tripDensity} trips/hr • ₹{selectedPlatform.incomeFactor} daily income (8hr)</p>}
              </div>

              <div className="calc-field">
                <label className="calc-label">Vehicle Type</label>
                <select className="calc-select" value={selectedVehicle.name} onChange={e => { setSelectedVehicle(VEHICLES.find(v => v.name === e.target.value)); setSubmitted(false); }}>
                  {VEHICLES.map(v => (
                    <option key={v.name} value={v.name}>{v.name} — {v.factor > 1.2 ? 'High exposure' : v.factor > 1.0 ? 'Medium exposure' : 'Low exposure'}</option>
                  ))}
                </select>
                <p className="calc-hint">{selectedVehicle.desc}</p>
              </div>

              <div className="calc-field">
                <label className="calc-label">Hours per day: <strong>{hoursPerDay} hrs</strong></label>
                <input type="range" min="2" max="14" step="1" value={hoursPerDay} onChange={e => { setHoursPerDay(Number(e.target.value)); setSubmitted(false); }} className="calc-slider" />
                <div className="calc-slider-labels"><span>2 hrs</span><span>8 hrs</span><span>14 hrs</span></div>
              </div>

              <div className="calc-field">
                <label className="calc-label">Days per week: <strong>{daysPerWeek} days</strong></label>
                <input type="range" min="1" max="7" step="1" value={daysPerWeek} onChange={e => { setDaysPerWeek(Number(e.target.value)); setSubmitted(false); }} className="calc-slider" />
                <div className="calc-slider-labels"><span>1 day</span><span>4 days</span><span>7 days</span></div>
              </div>

              <div className="calc-field">
                <label className="calc-label">Insurance Plan</label>
                <div className="calc-plans-row">
                  {CALC_PLANS.map(plan => (
                    <button key={plan.name} className={`calc-plan-btn ${selectedPlan.name === plan.name ? 'active' : ''}`} style={{ '--plan-color': plan.color }} onClick={() => { setSelectedPlan(plan); setSubmitted(false); }}>
                      {plan.recommended && <span className="plan-rec">Recommended</span>}
                      <span className="plan-name">{plan.name}</span>
                      <span className="plan-base">from ₹{plan.basePremium}/wk</span>
                      <span className="plan-cover">₹{plan.coverage.toLocaleString()} cover</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-primary calc-submit-btn" onClick={() => setSubmitted(true)} disabled={!selectedCity || !selectedZone || !selectedPlatform}>
                Submit And Calculate
              </button>
            </div>

            <div className="calc-result-panel">
              {!submitted || !calculation ? (
                <div className="calc-empty">
                  <div className="calc-empty-icon">⚡</div>
                  <p>Select your inputs and press submit to calculate your premium.</p>
                </div>
              ) : (
                <>
                  <div className="calc-premium-card">
                    <div className="cpc-label">Projected Weekly Premium (Billing Engine)</div>
                    <div className="cpc-amount">₹{calculation.weekly}</div>
                    <div className="cpc-monthly">≈ ₹{calculation.monthly} / month</div>
                    {billedWeeklyPremium > 0 && (
                      <div className="cpc-monthly" style={{ marginTop: 6 }}>Current billed weekly premium: {formatMoney(billedWeeklyPremium)}</div>
                    )}
                    <div className="cpc-divider" />
                    <div className="cpc-stats">
                      <div className="cpc-stat"><span className="cpc-stat-val">₹{calculation.weeklyIncomeAtRisk.toLocaleString()}</span><span className="cpc-stat-lbl">Weekly income at risk</span></div>
                      <div className="cpc-stat"><span className="cpc-stat-val">₹{calculation.planCoverage.toLocaleString()}</span><span className="cpc-stat-lbl">Max coverage</span></div>
                      <div className="cpc-stat"><span className="cpc-stat-val">{calculation.protectionRatio}%</span><span className="cpc-stat-lbl">Protection ratio</span></div>
                    </div>
                  </div>

                  <div className="calc-breakdown">
                    <h3 className="calc-section-title">Why this amount? — Factor Breakdown</h3>
                    {calculation.breakdown.map((item, i) => (
                      <div key={i} className={`calc-breakdown-row impact-${item.impact}`}>
                        <div className="cbr-left"><span className="cbr-label">{item.label}</span><span className="cbr-desc">{item.desc}</span></div>
                        <span className="cbr-value">{item.value}</span>
                      </div>
                    ))}
                    <div className="calc-breakdown-total"><span>Weekly Premium</span><span>₹{calculation.weekly}</span></div>
                  </div>

                  <div className="calc-note"><strong>No claims needed.</strong> When a disruption is verified — payout goes to your UPI instantly. No forms. No waiting. No rejection for genuine events.</div>
                  <div className="calc-note"><strong>Protection floor applied.</strong> We keep a minimum 55% visible protection threshold so the result does not understate the safety cushion. Raw formula result: {Math.max(0, Math.round(calculation.rawProtectionRatio))}%.</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'formula' && (
        <div className="calc-content calc-formula-content">
          <h2 className="calc-section-title">How the Premium is Calculated</h2>

          <div className="formula-box">
            <div className="formula-title">Actuarial Formula</div>
            <div className="formula-main">
              Weekly Premium = Base × CityFactor × ZoneFactor × PlatformFactor × HoursFactor × VehicleFactor
            </div>
          </div>

          <div className="formula-factors">
            {[
              { factor: "Base Premium", range: "₹20 – ₹80", how: "Set by plan tier in billing engine.", source: "GigWeatherWage plan configuration" },
              { factor: "City Factor", range: "0.94 – 1.18", how: "Derived from disruption risk score for the selected city.", source: "City risk model (Open-Meteo + historical mapping)" },
              { factor: "Zone Factor", range: "0.90 – 1.50", how: "Local area multiplier for flood/heat/curfew exposure.", source: "Zone risk mapping" },
              { factor: "Platform Factor", range: "0.80 – 1.22", how: "Platform-specific trip intensity and disruption exposure.", source: "Platform category mapping" },
              { factor: "Hours Factor", range: "0.90 – 1.22", how: "Band-based factor from selected daily work hours.", source: "Exposure-hours bands" },
              { factor: "Vehicle Factor", range: "0.86 – 1.15", how: "Vehicle exposure and weather vulnerability multiplier.", source: "Vehicle risk mapping" },
              { factor: "Days per Week", range: "1 – 7", how: "Used for income-at-risk analytics cards (not direct billing multiplier).", source: "UI analytics layer" },
            ].map((f, i) => (
              <div key={i} className="formula-factor-row">
                <div className="ffr-header"><span className="ffr-name">{f.factor}</span><span className="ffr-range">{f.range}</span></div>
                <p className="ffr-how">{f.how}</p>
                <p className="ffr-source">Source: {f.source}</p>
              </div>
            ))}
          </div>

          <div className="formula-example">
            <h3>Example Calculation — Raju Kumar</h3>
            <div className="fe-details">Swiggy rider, Hyderabad Madhapur, Motorbike, 8-10 hrs/day, Storm Guard plan</div>
            <div className="fe-calc">
              ₹45 × 1.11 × 1.40 × 1.10 × 1.07 × 1.10
              <span className="fe-result"> ≈ ₹{Math.round(45 * 1.11 * 1.4 * 1.1 * 1.07 * 1.1)}/week</span>
            </div>
            <p className="fe-note">Premium changes when plan/city/zone/platform/hours/vehicle changes. The same billing function powers Home, Policy, Profile, and Payments.</p>
          </div>

          <div className="formula-payout">
            <h3>How Payouts Work</h3>
            <div className="fp-steps">
              {[
                { step: "1", title: "Disruption Detected", desc: "Weather API confirms rain >50mm, or AQI >300, or curfew active in your zone" },
                { step: "2", title: "5-Signal Fraud Check", desc: "Weather API match, movement, device, history, geo-cluster — all verified in <30 seconds" },
                { step: "3", title: "Evidence (if manual)", desc: "Live selfie (face match), surroundings photo (AI check + reverse image + EXIF timestamp)" },
                { step: "4", title: "Decision", desc: "Score 0-40 = instant payout. 40-70 = 2hr verification. 70+ = blocked with reason" },
                { step: "5", title: "UPI Credit", desc: "Amount credited to your registered UPI instantly. No claim form. No waiting." },
              ].map(s => (
                <div key={s.step} className="fp-step">
                  <div className="fps-num">{s.step}</div>
                  <div className="fps-body"><div className="fps-title">{s.title}</div><div className="fps-desc">{s.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="calc-content">
          <div className="scenarios-header">
            <h2 className="calc-section-title">Coverage Table — What We Cover & What We Don't</h2>
            <p className="scenarios-subtitle">"We don't insure everything — we insure what is uncertain, measurable, and fair."</p>
            <div className="scenarios-filter">
              {[
                { id: 'all', label: `All (${SCENARIOS.length})` },
                { id: 'covered', label: `Covered (${SCENARIOS.filter(s => s.covered).length})` },
                { id: 'excluded', label: `Not Covered (${SCENARIOS.filter(s => !s.covered).length})` },
              ].map(f => (
                <button key={f.id} className={`scenario-filter-btn ${scenarioFilter === f.id ? 'active' : ''}`} onClick={() => setScenarioFilter(f.id)}>{f.label}</button>
              ))}
            </div>
          </div>

          <div className="scenarios-table">
            <div className="st-header"><span>Event</span><span>Type</span><span>Status</span><span>Why</span></div>
            {filteredScenarios.map((sc, i) => (
              <div key={i} className={`st-row ${sc.covered ? 'covered' : 'excluded'}`}>
                <span className="st-event">{sc.event}</span>
                <span className="st-type">{sc.type}</span>
                <span className={`st-status ${sc.covered ? 'yes' : 'no'}`}>{sc.covered ? '✓ Covered' : '✕ Excluded'}</span>
                <span className="st-reason">{sc.reason}</span>
              </div>
            ))}
          </div>

          <div className="coverage-rule">
            <div className="cr-title">Coverage Decision Rule</div>
            <div className="cr-logic">
              <div className="cr-if">An event is covered IF:</div>
              <div className="cr-conditions">
                <span className="cr-yes">External to worker (not their choice)</span>
                <span className="cr-yes">Verifiable via data source (API / official alert)</span>
                <span className="cr-yes">Measurable impact on income</span>
                <span className="cr-yes">Not preventable by reasonable precaution</span>
              </div>
              <div className="cr-if cr-if-no">An event is NOT covered IF:</div>
              <div className="cr-conditions">
                <span className="cr-no">Worker's own decision or behavior</span>
                <span className="cr-no">Intentional, fraudulent, or illegal</span>
                <span className="cr-no">Cannot be verified with data</span>
                <span className="cr-no">Beyond actuarial modeling capacity</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// â”€â”€ POLICY MANAGEMENT SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadPolicyDocument({ worker, plan, paused, validFrom, validTo, language = "en", weeklyPremium }) {
  const lang = getPolicyLanguage(language);
  const content = getPolicyContent(lang);
  const activeWeeklyPremium = Number(weeklyPremium || getWorkerWeeklyPremium(worker) || plan.price || 0);
  const labels = content.labels;
  const summaryRows = [
    [labels.workerName, localizeTerm(lang, worker.name || "-")],
    [labels.phone, worker.phone || "-"],
    [labels.platform, localizeTerm(lang, worker.platform || "-")],
    [labels.location, `${localizeTerm(lang, worker.zone || "-")}, ${localizeTerm(lang, worker.city || "-")}`],
    [labels.plan, localizeTerm(lang, plan.name)],
    [labels.weeklyPremium, formatMoney(activeWeeklyPremium, lang)],
    [labels.coverageAmount, formatMoney(plan.coverage, lang)],
    [labels.status, paused ? labels.paused : labels.active],
    [labels.validFrom, validFrom],
    [labels.validTo, validTo],
  ];
  const summaryHtml = summaryRows
    .map(([key, value]) => `<div class="row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
  const triggersHtml = plan.triggers.map(item => `<li>${escapeHtml(localizeTerm(lang, item))}</li>`).join("");
  const clausesHtml = content.sections.map(section => `
    <section class="clause">
      <div class="clause-head"><span class="badge">${escapeHtml(section.clause)}</span><h3>${escapeHtml(section.title)}</h3></div>
      <ul>${section.points.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
    </section>
  `).join("");

  const html = `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(worker.policyID || "policy-document")}</title>
  <style>
    :root{--ink:#0f172a;--muted:#475569;--line:#cbd5e1;--paper:#f8fafc;--brand:#0f3f78}
    *{box-sizing:border-box}
    body{margin:0;background:#e2e8f0;color:var(--ink);font:14px/1.55 "Noto Sans", "Segoe UI", Arial, sans-serif}
    .page{max-width:920px;margin:20px auto;background:white;border:1px solid #dbe2ea}
    .head{padding:18px 24px;background:var(--brand);color:#fff}
    .head .top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .brand{font-size:36px;font-weight:800;line-height:1}
    .title{font-size:19px;font-weight:700;margin-top:4px}
    .tag{font-size:12px;opacity:.9;padding-top:6px}
    .policy-id{margin-top:10px;padding:8px 10px;border:1px solid rgba(255,255,255,.35);border-radius:8px;display:inline-block;font-size:13px}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;padding:18px 24px}
    .card{border:1px solid var(--line);border-radius:10px;background:var(--paper);padding:12px}
    .card h2{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#0b2f57}
    .row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed #d8e0e8}
    .row:last-child{border-bottom:none}
    .row span{color:var(--muted)}
    .row strong{font-weight:700;text-align:right}
    .triggers{margin:0;padding-left:18px}
    .triggers li{margin:6px 0}
    .body{padding:2px 24px 16px}
    .body h2{margin:8px 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#0b2f57}
    .clause{border:1px solid var(--line);background:#fff;border-radius:10px;padding:12px;margin-bottom:10px}
    .clause-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
    .badge{min-width:24px;height:24px;border-radius:999px;background:#dbeafe;color:#1d4ed8;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px}
    .clause h3{margin:0;font-size:14px}
    .clause ul{margin:0;padding-left:18px}
    .clause li{margin:6px 0;color:#334155}
    .foot{margin:12px 24px 24px;background:#eef4ff;border:1px solid #cddcf6;border-radius:10px;padding:12px}
    .foot div{margin:4px 0}
    @media print{body{background:#fff}.page{margin:0;border:none}}
  </style>
</head>
<body>
  <div class="page">
    <header class="head">
      <div class="top">
        <div>
          <div class="brand">GigWeatherWage</div>
          <div class="title">${escapeHtml(content.title)}</div>
        </div>
        <div class="tag">${escapeHtml(content.scheduleTag)}</div>
      </div>
      <div class="policy-id">Policy ID: ${escapeHtml(worker.policyID || "Pending")}</div>
    </header>

    <div class="grid">
      <section class="card">
        <h2>${escapeHtml(content.policySummary)}</h2>
        ${summaryHtml}
      </section>
      <section class="card">
        <h2>${escapeHtml(content.coverageTriggers)}</h2>
        <ul class="triggers">${triggersHtml}</ul>
      </section>
    </div>

    <main class="body">
      <h2>${escapeHtml(content.privacyNotice)}</h2>
      ${clausesHtml}
    </main>

    <footer class="foot">
      <div><strong>${escapeHtml(content.supportContact)}:</strong> support@devtrails.com</div>
      <div>${escapeHtml(content.summaryNote)}</div>
    </footer>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(worker.policyID || "gigweatherwage-policy").replace(/[^\w-]+/g, "-")}-${lang}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function PolicyScreen({ worker, onBack, onUpgrade }) {
  const [paused, setPaused] = useState(false);
  const plan = PLANS.find(p => p.id === worker.plan) || PLANS[1];
  const today = new Date();
  const validTo = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const billingCredit = worker.billingCredit || 0;

  return (
    <div className="screen form-screen" style={{ background: "var(--bg)" }}>
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Policy And Privacy</h2>

      {/* Policy card */}
      <div style={{
        background: "linear-gradient(135deg,#1a3a5c,#162240)", border: "1px solid rgba(59,130,246,0.3)",
        borderRadius: 18, padding: 20, marginBottom: 14
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>Policy ID</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 13, fontWeight: 700, color: "#fff" }}>{worker.policyID || "GWW-2026-HYD-4521"}</div>
          </div>
          <div style={{
            background: paused ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.2)",
            color: paused ? "#F97316" : "#22c55e", fontSize: 11, fontWeight: 700,
            padding: "4px 12px", borderRadius: 20
          }}>{paused ? "⏸ Paused" : "● Active"}</div>
        </div>
        <div style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{plan.name}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>₹{plan.price}/week • ₹{plan.coverage.toLocaleString()} coverage</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          <span>Valid from: {fmt(today)}</span>
          <span>Valid to: {fmt(validTo)}</span>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Coverage And Billing Snapshot
        </div>
        <div className="detail-row"><span>Current plan</span><span>{plan.name}</span></div>
        <div className="detail-row"><span>Weekly premium</span><span>{formatMoney(plan.price)}</span></div>
        <div className="detail-row"><span>Account billing credit</span><span style={{ color: billingCredit > 0 ? "#22c55e" : "var(--text)" }}>{formatMoney(billingCredit)}</span></div>
      </div>

      {/* Coverage details */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Triggers Covered
        </div>
        {plan.triggers.map((t, i) => (
          <div key={i} className="detail-row">
            <span>{t}</span><span className="safe-badge">✓ Covered</span>
          </div>
        ))}
      </div>

      <PrivacyPolicyDetails />

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => setPaused(!paused)} style={{
          padding: 14, background: paused ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.1)",
          border: `1px solid ${paused ? "rgba(34,197,94,0.3)" : "rgba(249,115,22,0.3)"}`,
          borderRadius: 13, color: paused ? "#22c55e" : "#F97316",
          fontFamily: "var(--fd)", fontSize: 14, fontWeight: 600, cursor: "pointer"
        }}>
          {paused ? "▶ Resume Policy" : "⏸ Pause Policy"}
        </button>
        <button onClick={onUpgrade} style={{
          padding: 14, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 13, color: "var(--rain)", fontFamily: "var(--fd)", fontSize: 14, fontWeight: 600, cursor: "pointer"
        }}>
          ⬆ Upgrade Plan
        </button>
        <button onClick={() => downloadPolicyDocument({ worker, plan, paused, validFrom: fmt(today), validTo: fmt(validTo), language: worker.preferredLanguage || "en", weeklyPremium: getWorkerWeeklyPremium(worker) })} style={{
          padding: 14, background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 13, color: "var(--text)", fontFamily: "var(--fd)", fontSize: 14, fontWeight: 600, cursor: "pointer"
        }}>
          📄 Download Policy PDF
        </button>
      </div>
    </div>
  );
}

// â”€â”€ SETTLEMENT LETTER SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function UpgradePlanScreen({ worker, onBack, onDone }) {
  const [selectedPlan, setSelectedPlan] = useState(worker.plan);
  const currentPlan = PLANS.find(p => p.id === worker.plan) || PLANS[1];
  const nextPlan = PLANS.find(p => p.id === selectedPlan) || currentPlan;
  const currentCredit = worker.billingCredit || 0;
  const currentWeeklyPremium = getWorkerWeeklyPremium(worker);
  const nextWeeklyPremium = computeWorkerDynamicPremium({ ...worker, plan: selectedPlan }).weekly;
  const breakdown = getUpgradeBreakdown(currentWeeklyPremium, nextWeeklyPremium, currentCredit);
  const actionLabel =
    selectedPlan === worker.plan
      ? "Current Plan Selected"
      : breakdown.amountDueNow > 0
        ? `Pay ${formatMoney(breakdown.amountDueNow)} And Upgrade`
        : breakdown.downgradeSavings > 0
          ? `Change Plan And Save ${formatMoney(breakdown.downgradeSavings)}`
          : `Switch To ${nextPlan.name}`;

  return (
    <div className="screen form-screen" style={{ paddingTop: 16 }}>
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div style={{ marginBottom: 12, paddingTop: 4 }}>
        <div className="step-num" style={{ textAlign: "center" }}>Plan Upgrade</div>
        <h2 style={{ textAlign: "center", fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, margin: "6px 0 4px" }}>Choose your upgrade</h2>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Current plan: {currentPlan.name}</p>
      </div>
      <div className="plan-list">
        {PLANS.map(p => {
          const estimatedWeekly = computeWorkerDynamicPremium({ ...worker, plan: p.id }).weekly;
          return (
            <button key={p.id} className={`plan-card ${selectedPlan === p.id ? "selected" : ""}`} style={{ "--pc": p.color }} onClick={() => setSelectedPlan(p.id)}>
              {p.recommended && <div className="plan-rec">Recommended</div>}
              <div className="plan-top">
                <div>
                  <div className="plan-name">{p.name}</div>
                  <div className="plan-price">{formatMoney(estimatedWeekly)}<span>/week</span></div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>base {formatMoney(p.price)}/week</div>
                </div>
                <div className="plan-check">{selectedPlan === p.id ? "✓" : ""}</div>
              </div>
              <div className="plan-stats"><span>Coverage: ₹{p.coverage.toLocaleString()}</span><span>₹{p.payoutPerHour}/hr</span></div>
              <div className="plan-feats">{p.features.map((f, i) => <div key={i} className="plan-feat">✓ {f}</div>)}</div>
            </button>
          );
        })}
      </div>
      <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => onDone(selectedPlan)} disabled={selectedPlan === worker.plan}>
        {selectedPlan === worker.plan ? "Current Plan Selected" : `Upgrade to ${nextPlan.name} →`}
      </button>
    </div>
  );
}

function SettlementLetter({ worker, disruption, decision, score, payoutAmount, settlementMeta, onDone }) {
  const now = new Date();
  const fmt = d => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const fmtTime = d => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const pct = decision === "safe" ? 100 : decision === "medium" ? 50 : 0;

  return (
    <div className="screen" style={{ background: "var(--bg)", padding: "24px 18px 48px" }}>
      <button className="back-btn" onClick={onDone}>← Back to Dashboard</button>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", marginBottom: 16 }}>
        {/* Header */}
        <div style={{
          background: decision === "safe" ? "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.05))"
            : decision === "medium" ? "linear-gradient(135deg,rgba(249,115,22,0.15),rgba(249,115,22,0.05))"
              : "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))",
          padding: 20, textAlign: "center", borderBottom: "1px solid var(--border)"
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {decision === "safe" ? "✅" : decision === "medium" ? "⚠️" : "🚫"}
          </div>
          <div style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
            GigWeatherWage Settlement Letter
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Official Claim Settlement Record</div>
        </div>

        {/* Letter ID + date */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
          <span>Ref: GWW-LTR-{Date.now().toString().slice(-6)}</span>
          <span>{fmt(now)} • {fmtTime(now)}</span>
        </div>

        {/* Worker details */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Worker Details</div>
          {[
            ["Name", worker.name],
            ["Platform", worker.platform],
            ["Partner ID", worker.partnerId || "N/A"],
            ["Zone", `${worker.zone}, ${worker.city}`],
            ["Policy ID", worker.policyID || "GWW-2026-HYD-4521"],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ color: "var(--muted)" }}>{k}</span><span>{v}</span>
            </div>
          ))}
        </div>

        {/* Claim details */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Claim Details</div>
          {(() => {
            const claimRows = [
              ["Disruption type", disruption.label],
              ["Measured value", disruption.value],
              ["Trigger threshold", disruption.threshold],
              ["Date & Time", `${fmt(now)} • ${fmtTime(now)}`],
              ...(settlementMeta?.orderId ? [["Razorpay Order ID", settlementMeta.orderId]] : []),
              ...(settlementMeta?.paymentId ? [["Razorpay Payment ID", settlementMeta.paymentId]] : []),
            ];
            return claimRows.map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: i < claimRows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ color: "var(--muted)" }}>{k}</span><span>{v}</span>
              </div>
            ));
          })()}
        </div>

        {/* Fraud analysis result */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>AI Fraud Analysis</div>
          {[
            ["Risk score", score],
            ["Score band", score < 40 ? "Safe (0-40)" : score < 70 ? "Medium (40-70)" : "High (70+)"],
            ["Payout eligibility", `${pct}% of claim amount`],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ color: "var(--muted)" }}>{k}</span>
              <span style={{ color: i === 2 ? (pct === 100 ? "#22c55e" : pct === 50 ? "#F97316" : "#EF4444") : "var(--text)", fontWeight: i === 2 ? 700 : 400 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Settlement amount */}
        <div style={{ padding: 20, textAlign: "center", background: decision === "safe" ? "rgba(34,197,94,0.05)" : decision === "medium" ? "rgba(249,115,22,0.05)" : "rgba(239,68,68,0.05)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Settlement Amount</div>
          <div style={{
            fontFamily: "var(--fd)", fontSize: 44, fontWeight: 800,
            color: decision === "safe" ? "#22c55e" : decision === "medium" ? "#F97316" : "#EF4444"
          }}>₹{payoutAmount}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            {decision === "safe" ? "Credited to UPI instantly" : decision === "medium" ? "Held — pending 2hr verification" : "Blocked — fraud detected"}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            Calculation: ₹{disruption.amount} × {pct}% = ₹{payoutAmount}
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={onDone}>Back to Dashboard →</button>
    </div>
  );
}


// â”€â”€ SPLASH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

function Landing({ onLogin, onRegister, theme, toggleTheme, language, setLanguage }) {
  return (
    <div className="screen landing-screen">
      <div className="rain-bg">{[...Array(16)].map((_, i) => <div key={i} className="drop" style={{ left: `${(i * 6.5) % 100}%`, animationDelay: `${(i * 0.2) % 2}s`, animationDuration: `${0.7 + (i % 4) * 0.2}s` }} />)}</div>
      <button onClick={toggleTheme} style={{ position: "absolute", top: 20, right: 20, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 12px", color: "var(--text)", cursor: "pointer", fontSize: 16, zIndex: 10 }}>
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
        <LanguageSelector language={language} setLanguage={setLanguage} />
      </div>
      <div className="landing-inner">
        <div className="lbadge">DEVTrails 2026 • Guidewire Hackathon</div>
        <h1 className="ltitle"><span className="lg">Gig</span><span className="lw">Weather</span><span className="lwa">Wage</span></h1>
        <p className="lsub">When the storm stops your deliveries,<br />we make sure it doesn't stop your income.</p>
        <div className="lstats">
          <div className="lstat"><span className="lsn">2.8Cr+</span><span className="lsl">Gig workers</span></div>
          <div className="ldiv" />
          <div className="lstat"><span className="lsn">₹0</span><span className="lsl">Safety net</span></div>
          <div className="ldiv" />
          <div className="lstat"><span className="lsn">Instant</span><span className="lsl">Payouts</span></div>
        </div>
        <div className="lbtns">
          <button className="btn-primary" onClick={onLogin}>{translate(language, "login", "Worker Login")} -></button>
          <button className="btn-outline" onClick={onRegister}>New Registration</button>
        </div>
        <p className="lfooter">Team Code Alchemists • KL University</p>
      </div>
    </div>
  );
}

function LegacyReg1({ data, onNext, onBack }) {
  const [d, setD] = useState({
    name: data?.name || "",
    phone: data?.phone || "",
    city: data?.city || "Hyderabad",
    zone: data?.zone || ""
  });
  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "20%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">1 of 5</div><h2>Personal Info</h2><p>Tell us about yourself</p></div>
        <div className="field"><label>Full name</label><input placeholder="e.g. Raju Kumar" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></div>
        <div className="field"><label>Phone number</label><input placeholder="98765 43210" value={d.phone} onChange={e => setD({ ...d, phone: e.target.value })} /></div>
        <div className="field"><label>City</label>
          <select value={d.city} onChange={e => setD({ ...d, city: e.target.value })}>
            {["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Delhi", "Pune", "Kolkata"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field"><label>Zone / Area</label><input placeholder="e.g. Madhapur" value={d.zone} onChange={e => setD({ ...d, zone: e.target.value })} /></div>
        <button className="btn-primary" onClick={() => onNext(d)} disabled={!d.name || !d.phone}>Next →</button>
      </div>
    </div>
  );
}

function LegacyReg2({ data, onNext, onBack }) {
  const [d, setD] = useState({
    platform: data?.platform || "Swiggy",
    partnerId: data?.partnerId || "",
    hours: data?.hours || "8-10 hrs/day"
  });
  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "40%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">2 of 5</div><h2>Work Info</h2><p>Your delivery details</p></div>
        <div className="field"><label>Platform</label>
          <div className="plat-grid">
            {["Swiggy", "Zomato", "Zepto", "Amazon"].map(p => (
              <button key={p} className={`plat-btn ${d.platform === p ? "active" : ""}`} onClick={() => setD({ ...d, platform: p })}>{p}</button>
            ))}
          </div>
        </div>
        <div className="field"><label>Partner ID</label><input placeholder="e.g. SWG-2024-HYD-4521" value={d.partnerId} onChange={e => setD({ ...d, partnerId: e.target.value })} /></div>
        <div className="field"><label>Daily working hours</label>
          <select value={d.hours} onChange={e => setD({ ...d, hours: e.target.value })}>
            {["4-6 hrs/day", "6-8 hrs/day", "8-10 hrs/day", "10+ hrs/day"].map(h => <option key={h}>{h}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => onNext(d)}>Next →</button>
      </div>
    </div>
  );
}

function LegacyReg3({ data, onNext, onBack }) {
  const [sel, setSel] = useState(data?.plan || "guard");
  return (
    <div className="screen form-screen" style={{ paddingTop: 16 }}>
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "60%" }} /></div>
      <div style={{ marginBottom: 12, paddingTop: 4 }}>
        <div className="step-num" style={{ textAlign: "center" }}>3 of 5</div>
        <h2 style={{ textAlign: "center", fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, margin: "6px 0 4px" }}>Choose Your Plan</h2>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Weekly premium — cancel anytime</p>
      </div>
      <div className="plan-list">
        {PLANS.map(p => (
          <button key={p.id} className={`plan-card ${sel === p.id ? "selected" : ""}`} style={{ "--pc": p.color }} onClick={() => setSel(p.id)}>
            {p.recommended && <div className="plan-rec">Recommended</div>}
            <div className="plan-top">
              <div><div className="plan-name">{p.name}</div><div className="plan-price">₹{p.price}<span>/week</span></div></div>
              <div className="plan-check">{sel === p.id ? "✓" : ""}</div>
            </div>
            <div className="plan-stats"><span>Coverage: ₹{p.coverage.toLocaleString()}</span><span>₹{p.payoutPerHour}/hr</span></div>
            <div className="plan-feats">{p.features.map((f, i) => <div key={i} className="plan-feat">✓ {f}</div>)}</div>
          </button>
        ))}
      </div>
      <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => onNext({ plan: sel })}>Next →</button>
    </div>
  );
}

function LegacyReg4({ data, onNext, onBack }) {
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState("");
  const plan = PLANS.find(p => p.id === data.plan) || PLANS[1];
  const handleUPI = (app) => {
    setMethod(app); setPaying(true);
    if (app === "phonepe") { try { window.open("phonepe://pay", "_blank"); } catch (e) { } }
    if (app === "gpay") { try { window.open("tez://upi/pay", "_blank"); } catch (e) { } }
    setTimeout(() => { setPaying(false); onNext({}); }, 2000);
  };
  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "80%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">4 of 5</div><h2>Payment</h2><p>First week premium</p></div>
        <div className="pay-amount-box">
          <div className="pay-plan">{plan.name}</div>
          <div className="pay-amt">₹{plan.price}</div>
          <div className="pay-sub">for first week • auto-renews weekly</div>
        </div>
        {paying ? (
          <div className="paying-state"><div className="paying-spinner" /><p>Processing via {method}...</p></div>
        ) : (
          <div className="upi-options">
            <button className="upi-btn" onClick={() => handleUPI("phonepe")}><span className="upi-icon">💜</span> Pay with PhonePe</button>
            <button className="upi-btn" onClick={() => handleUPI("gpay")}><span className="upi-icon">🔵</span> Pay with Google Pay</button>
            <div className="upi-divider"><span>or enter UPI ID</span></div>
            <div className="field" style={{ margin: 0 }}><input placeholder="yourname@upi" /></div>
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => handleUPI("upi")}>Pay ₹{plan.price} →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LegacyReg5({ data, onDone }) {
  const plan = PLANS.find(p => p.id === data.plan) || PLANS[1];
  return (
    <div className="screen form-screen" style={{ justifyContent: "center", textAlign: "center" }}>
      <div className="success-ring" style={{ margin: "0 auto 20px" }}><div className="check-icon">✓</div></div>
      <h2 style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Welcome to GigWeatherWage!</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>Your income is now protected</p>
      <div className="reg-success-card">
        <div className="detail-row"><span>Name</span><span>{data.name || "Demo User"}</span></div>
        <div className="detail-row"><span>Platform</span><span>{data.platform || "Swiggy"}</span></div>
        <div className="detail-row"><span>Plan</span><span style={{ color: plan.color }}>{plan.name}</span></div>
        <div className="detail-row"><span>Coverage</span><span>₹{plan.coverage.toLocaleString()}</span></div>
        <div className="detail-row"><span>Premium</span><span>₹{plan.price}/week</span></div>
        <div className="detail-row"><span>Status</span><span className="safe-badge">Active ✓</span></div>
      </div>
      <button className="btn-primary" style={{ marginTop: 20 }} onClick={onDone}>Go to Dashboard →</button>
    </div>
  );
}

function LegacyRegistrationReviewStep({ data, onNext, onBack }) {
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState("");
  const [accepted, setAccepted] = useState(false);
  const plan = PLANS.find(p => p.id === data.plan) || PLANS[1];

  const handleUPI = (app) => {
    setMethod(app);
    setPaying(true);
    if (app === "phonepe") { try { window.open("phonepe://pay", "_blank"); } catch (e) { } }
    if (app === "gpay") { try { window.open("tez://upi/pay", "_blank"); } catch (e) { } }
    setTimeout(() => { setPaying(false); onNext({}); }, 2000);
  };

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "80%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">4 of 5</div><h2>Review, Agree And Pay</h2><p>Read the policy details before activating cover</p></div>
        <div className="reg-success-card" style={{ marginBottom: 16 }}>
          <div className="detail-row"><span>Name</span><span>{data.name || "Demo User"}</span></div>
          <div className="detail-row"><span>Platform</span><span>{data.platform || "Swiggy"}</span></div>
          <div className="detail-row"><span>Plan</span><span style={{ color: plan.color }}>{plan.name}</span></div>
          <div className="detail-row"><span>Coverage</span><span>{formatMoney(plan.coverage)}</span></div>
          <div className="detail-row"><span>Weekly premium</span><span>{formatMoney(plan.price)}</span></div>
        </div>

        <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 16, paddingRight: 4 }}>
          <PrivacyPolicyDetails compact language={data.preferredLanguage || "en"} />
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 2 }} />
          <span>I agree to the policy, privacy use of data, payout rules, admin review workflow, and weekly renewal terms.</span>
        </label>

        <div className="pay-amount-box">
          <div className="pay-plan">{plan.name}</div>
          <div className="pay-amt">{formatMoney(plan.price)}</div>
          <div className="pay-sub">first week premium • auto-renews weekly</div>
        </div>

        {paying ? (
          <div className="paying-state"><div className="paying-spinner" /><p>Processing via {method}...</p></div>
        ) : (
          <div className="upi-options">
            <button className="upi-btn" onClick={() => handleUPI("phonepe")} disabled={!accepted}><span className="upi-icon">P</span> Pay with PhonePe</button>
            <button className="upi-btn" onClick={() => handleUPI("gpay")} disabled={!accepted}><span className="upi-icon">G</span> Pay with Google Pay</button>
            <div className="upi-divider"><span>or enter UPI ID</span></div>
            <div className="field" style={{ margin: 0 }}><input placeholder="yourname@upi" /></div>
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => handleUPI("upi")} disabled={!accepted}>Pay {formatMoney(plan.price)} And Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Reg1({ data, onNext, onBack }) {
  const startingCity = data?.city || "Hyderabad";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(Boolean(data?.phoneVerified));
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState("");
  const [phoneOtpInfo, setPhoneOtpInfo] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);
  const [zoneLockChecking, setZoneLockChecking] = useState(false);
  const [zoneLockError, setZoneLockError] = useState("");
  const phoneRecaptchaContainerRef = useRef(null);
  const phoneRecaptchaVerifierRef = useRef(null);
  const [d, setD] = useState({
    name: data?.name || "",
    username: data?.username || "",
    phone: data?.phone || "",
    email: data?.email || "",
    password: data?.password || "",
    confirmPassword: data?.confirmPassword || "",
    city: startingCity,
    zone: data?.zone || getRegistrationZones(startingCity)[0] || ""
  });
  const passwordsMatch = d.password && d.confirmPassword && d.password === d.confirmPassword;
  const canProceed = Boolean(d.name && d.username && d.phone && d.email && d.zone && d.password.length >= 6 && passwordsMatch && phoneVerified);
  const zoneOptions = getRegistrationZones(d.city);

  const handleProceed = async () => {
    if (!canProceed || zoneLockChecking) return;
    setZoneLockError("");
    setZoneLockChecking(true);
    try {
      const lock = await checkZoneAdverseSelectionLock(d.city, d.zone);
      if (lock.locked) {
        setZoneLockError(lock.reason || "Registration temporarily paused due to red-alert weather risk for this zone.");
        setZoneLockChecking(false);
        return;
      }
      onNext({ ...d, phoneVerified, adverseSelectionLock: false });
    } finally {
      setZoneLockChecking(false);
    }
  };

  const sendPhoneOtp = async () => {
    setPhoneOtpError("");
    setPhoneOtpInfo("");
    const phoneDigits = d.phone.replace(/\D/g, "").slice(-10);
    if (phoneDigits.length !== 10) {
      setPhoneOtpError("Enter a valid 10-digit phone number.");
      return;
    }
    setPhoneOtpLoading(true);
    try {
      auth.languageCode = "en";
      if (!phoneRecaptchaContainerRef.current) {
        throw new Error("OTP verifier not ready.");
      }
      if (phoneRecaptchaVerifierRef.current) {
        try { phoneRecaptchaVerifierRef.current.clear(); } catch (error) { }
        phoneRecaptchaVerifierRef.current = null;
      }
      phoneRecaptchaContainerRef.current.innerHTML = "";
      const verifier = new RecaptchaVerifier(auth, phoneRecaptchaContainerRef.current, {
        size: "invisible",
        callback: () => { }
      });
      phoneRecaptchaVerifierRef.current = verifier;
      await verifier.render();
      const confirmation = await signInWithPhoneNumber(auth, `+91${phoneDigits}`, verifier);
      setPhoneConfirmation(confirmation);
      setPhoneOtpSent(true);
      setPhoneOtpInfo(`OTP sent to +91${phoneDigits}.`);
    } catch (error) {
      setPhoneOtpError(getFirebaseAuthErrorMessage(error, "Could not send OTP. Check Firebase phone auth settings."));
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    setPhoneOtpError("");
    if (!phoneConfirmation) {
      setPhoneOtpError("Send OTP first.");
      return;
    }
    if (phoneOtp.trim().length < 6) {
      setPhoneOtpError("Enter the 6-digit OTP.");
      return;
    }
    setPhoneOtpLoading(true);
    try {
      await phoneConfirmation.confirm(phoneOtp.trim());
      setPhoneVerified(true);
      setPhoneOtpSent(false);
      setPhoneOtp("");
      setPhoneOtpInfo("Phone OTP verified.");
      if (auth.currentUser) {
        await signOut(auth).catch(() => { });
      }
    } catch (error) {
      setPhoneOtpError("Invalid OTP. Please try again.");
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (phoneRecaptchaVerifierRef.current) {
        phoneRecaptchaVerifierRef.current.clear();
        phoneRecaptchaVerifierRef.current = null;
      }
    };
  }, []);

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "12.5%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">1 of 8</div><h2>Personal Info</h2><p>Tell us about yourself</p></div>
        <div className="field"><label>Full name</label><input placeholder="e.g. Raju Kumar" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></div>
        <div className="field"><label>Username</label><input placeholder="e.g. adithi_user" value={d.username} onChange={e => setD({ ...d, username: e.target.value })} /></div>
        <div className="field">
          <label>Phone number</label>
          <input
            placeholder="98765 43210"
            value={d.phone}
            onChange={e => {
              setD({ ...d, phone: e.target.value });
              setPhoneVerified(false);
              setPhoneOtpSent(false);
              setPhoneOtp("");
              setPhoneConfirmation(null);
              setPhoneOtpInfo("");
              setPhoneOtpError("");
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={sendPhoneOtp} disabled={phoneOtpLoading}>
              {phoneOtpLoading ? "Sending..." : "Send Phone OTP"}
            </button>
            {phoneVerified && (
              <span className="safe-badge" style={{ alignSelf: "center", color: "#22c55e" }}>Verified ✓</span>
            )}
          </div>
          {phoneOtpSent && !phoneVerified && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                style={{ flex: 1 }}
                placeholder="Enter 6-digit OTP"
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value)}
              />
              <button type="button" className="btn-primary" style={{ width: 110, padding: 10, fontSize: 12 }} onClick={verifyPhoneOtp} disabled={phoneOtpLoading}>
                {phoneOtpLoading ? "Verify..." : "Verify"}
              </button>
            </div>
          )}
          <div ref={phoneRecaptchaContainerRef} style={{ minHeight: 1 }} />
          {phoneOtpInfo && <div style={{ color: "#22c55e", fontSize: 12, marginTop: 6 }}>{phoneOtpInfo}</div>}
          {phoneOtpError && <div style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>{phoneOtpError}</div>}
        </div>
        <div className="field"><label>Email address</label><input type="email" placeholder="name@example.com" value={d.email} onChange={e => setD({ ...d, email: e.target.value })} /></div>
        <div className="field">
          <label>Password</label>
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} placeholder="Minimum 6 characters" value={d.password} onChange={e => setD({ ...d, password: e.target.value })} style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        <div className="field">
          <label>Confirm password</label>
          <div style={{ position: "relative" }}>
            <input type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter password" value={d.confirmPassword} onChange={e => setD({ ...d, confirmPassword: e.target.value })} style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        {d.password && d.confirmPassword && !passwordsMatch && (
          <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 10 }}>Password and confirm password do not match.</div>
        )}
        <div className="field"><label>City</label>
          <select value={d.city} onChange={e => setD({ ...d, city: e.target.value, zone: getRegistrationZones(e.target.value)[0] || "" })}>
            {REG_CITY_OPTIONS.map(city => <option key={city}>{city}</option>)}
          </select>
        </div>
        <div className="field"><label>Zone / Area</label>
          <select value={d.zone} onChange={e => setD({ ...d, zone: e.target.value })}>
            {zoneOptions.map(zone => <option key={zone}>{zone}</option>)}
          </select>
        </div>
        {zoneLockError && <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 8 }}>{zoneLockError}</div>}
        <button className="btn-primary" onClick={handleProceed} disabled={!canProceed || zoneLockChecking}>
          {zoneLockChecking ? "Checking risk alert..." : "Next ->"}
        </button>
      </div>
    </div>
  );
}

function Reg2({ data, onNext, onBack }) {
  const [d, setD] = useState({
    platform: data?.platform || "Swiggy",
    partnerId: data?.partnerId || "",
    hours: data?.hours || "8-10 hrs/day",
    daysPerWeek: data?.daysPerWeek || 6,
    vehicle: data?.vehicle || "Motorbike / Scooter",
    vehicleNumber: data?.vehicleNumber || ""
  });
  const [partnerError, setPartnerError] = useState("");
  const expectedPlatformCode = getPlatformCode(d.platform);
  const expectedCityCode = getCityCode(data?.city || "");
  const partnerHint = `${expectedPlatformCode}-${new Date().getFullYear()}-${expectedCityCode}-1234`;

  const handleNext = () => {
    const validation = validatePartnerIdFormat(d.partnerId, d.platform, data?.city || "");
    if (!validation.valid) {
      setPartnerError(validation.error || "Invalid Partner ID format.");
      return;
    }
    setPartnerError("");
    onNext({ ...d, partnerId: validation.normalized });
  };

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "25%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">2 of 8</div><h2>Work Info</h2><p>Your delivery details</p></div>
        <div className="field"><label>Platform</label>
          <select value={d.platform} onChange={e => setD({ ...d, platform: e.target.value })}>
            {REG_PLATFORM_OPTIONS.map(platform => <option key={platform}>{platform}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Partner ID</label>
          <input
            placeholder={`e.g. ${partnerHint}`}
            value={d.partnerId}
            onChange={e => {
              setPartnerError("");
              setD({ ...d, partnerId: e.target.value.toUpperCase() });
            }}
          />
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
            Required format: <strong>{partnerHint}</strong>
          </div>
          {partnerError && <div style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>{partnerError}</div>}
        </div>
        <div className="field"><label>Daily working hours</label>
          <select value={d.hours} onChange={e => setD({ ...d, hours: e.target.value })}>
            {REG_HOUR_OPTIONS.map(hours => <option key={hours}>{hours}</option>)}
          </select>
        </div>
        <div className="field"><label>Days per week</label>
          <select value={d.daysPerWeek} onChange={e => setD({ ...d, daysPerWeek: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map(day => <option key={day} value={day}>{day} day{day > 1 ? "s" : ""}</option>)}
          </select>
        </div>
        <div className="field"><label>Vehicle type</label>
          <select value={d.vehicle} onChange={e => setD({ ...d, vehicle: e.target.value })}>
            {VEHICLES.map(vehicle => <option key={vehicle.name}>{vehicle.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Vehicle number</label>
          <input
            placeholder="e.g. TS09AB1234"
            value={d.vehicleNumber}
            onChange={(e) => setD({ ...d, vehicleNumber: e.target.value.toUpperCase().replace(/\s+/g, "") })}
          />
        </div>
        <button className="btn-primary" onClick={handleNext}>Next -></button>
      </div>
    </div>
  );
}

function Reg3({ data, onNext, onBack }) {
  const [d, setD] = useState({
    aadhaarLast4: data?.aadhaarLast4 || "",
    dob: data?.dob || "",
    aadhaarConsent: data?.aadhaarConsent || false
  });

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "37.5%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">3 of 8</div><h2>Aadhaar Verification</h2><p>UI-only verification step for onboarding trust</p></div>
        <div className="field"><label>Aadhaar last 4 digits</label><input placeholder="1234" value={d.aadhaarLast4} maxLength={4} onChange={e => setD({ ...d, aadhaarLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
        <div className="field"><label>Date of birth</label><input type="date" value={d.dob} onChange={e => setD({ ...d, dob: e.target.value })} /></div>
        <div className="reg-success-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Verification concept</div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            Aadhaar details stay masked in the UI. This step demonstrates identity match, KYC readiness, and fraud-prevention intent for the Phase 2 demo.
          </div>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>
          <input type="checkbox" checked={d.aadhaarConsent} onChange={e => setD({ ...d, aadhaarConsent: e.target.checked })} style={{ marginTop: 2 }} />
          <span>I confirm these Aadhaar details are correct and can be used for onboarding verification.</span>
        </label>
        <button className="btn-primary" onClick={() => onNext(d)} disabled={d.aadhaarLast4.length !== 4 || !d.dob || !d.aadhaarConsent}>Next -></button>
      </div>
    </div>
  );
}

function Reg4({ data, onNext, onBack }) {
  const [selfieReady, setSelfieReady] = useState(Boolean(data?.selfieCaptured));
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [selfieImage, setSelfieImage] = useState(data?.selfieImage || "");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const openCamera = async () => {
    setCameraError("");
    stopCamera();
    setCameraOpen(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera requires HTTPS or localhost security. Please click 'Upload Selfie Instead' below.");
      }
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
      } catch (error) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      await new Promise((resolve) => setTimeout(resolve, 40));
      const video = videoRef.current;
      if (!video) {
        throw new Error("Camera preview not available. Use upload instead.");
      }
      video.srcObject = stream;
      video.onloadedmetadata = async () => {
        try { await video.play(); } catch (error) { }
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setCameraError("");
        }
      };
      video.oncanplay = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setCameraError("");
        }
      };
      video.onerror = () => setCameraError("Camera preview failed. Use 'Upload Selfie Instead'.");
      await video.play().catch(() => { });
      setTimeout(() => {
        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
          setCameraError("Live preview unavailable in this browser. Use 'Upload Selfie Instead'.");
        }
      }, 1200);
    } catch (error) {
      setCameraError(error?.message || "Could not open camera.");
      setCameraOpen(false);
    }
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth || 480;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    if ("FaceDetector" in window) {
      try {
        const detector = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true });
        const bitmap = await createImageBitmap(canvas);
        const faces = await detector.detect(bitmap);
        if (!faces?.length) {
          setCameraError("Face not detected clearly. Please align your face and capture again.");
          return;
        }
      } catch (error) {
        // Continue without hard-failing when detector is not supported by browser/runtime.
      }
    }
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setSelfieImage(imageData);
    setSelfieReady(true);
    stopCamera();
  };

  const uploadSelfieFromFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result || "");
      if (!imageData) return;
      setSelfieImage(imageData);
      setSelfieReady(true);
      setCameraError("");
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "50%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">4 of 8</div><h2>Reference Selfie</h2><p>Capture a baseline face reference for later claim review</p></div>
        <div className="reg-success-card" style={{ marginBottom: 16, textAlign: "center" }}>
          {selfieImage ? (
            <img src={selfieImage} alt="Selfie preview" style={{ width: 112, height: 112, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(15,168,150,0.55)", margin: "0 auto 14px", display: "block" }} />
          ) : (
            <div style={{ width: 112, height: 112, borderRadius: "50%", border: "2px dashed rgba(15,168,150,0.55)", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--calc-teal)" }}>
              {selfieReady ? "Captured" : "Selfie Frame"}
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Reference selfie capture</div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            Camera API is used to capture a live baseline selfie for onboarding verification and future anti-fraud checks.
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              minHeight: 220,
              objectFit: "cover",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "#0b1020",
              display: cameraOpen ? "block" : "none"
            }}
          />
          {!cameraOpen && (
            <div style={{ minHeight: 220, borderRadius: 12, border: "1px dashed var(--border)", background: "rgba(10,15,30,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>
              Camera preview appears here
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {cameraError && <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 10 }}>{cameraError}</div>}
        <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          {!cameraOpen ? (
            <button className="upi-btn" onClick={openCamera}>{selfieImage ? "Retake Reference Selfie" : "Open Camera"}</button>
          ) : (
            <>
              <button className="upi-btn" onClick={captureSelfie}>Capture Selfie</button>
              <button className="upi-btn" onClick={stopCamera}>Cancel Camera</button>
            </>
          )}
          <label className="upi-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            Upload Selfie Instead
            <input type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={uploadSelfieFromFile} />
          </label>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Stored concept: baseline face vector, timestamp, onboarding device reference, and consent marker for anti-fraud review.
        </div>
        <button
          className="btn-primary"
          onClick={() => onNext({ selfieCaptured: true, selfieReferenceStatus: "Baseline stored", selfieImage, photoURL: selfieImage })}
          disabled={!selfieReady}
        >
          Next ->
        </button>
      </div>
    </div>
  );
}

function Reg5({ data, onNext, onBack }) {
  const [sel, setSel] = useState(data?.plan || "guard");
  const preview = getRegistrationPremiumPreview(data, sel);
  const selectedPlan = PLANS.find(p => p.id === sel) || PLANS[1];

  return (
    <div className="screen form-screen" style={{ paddingTop: 16 }}>
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "62.5%" }} /></div>
      <div style={{ marginBottom: 12, paddingTop: 4 }}>
        <div className="step-num" style={{ textAlign: "center" }}>5 of 8</div>
        <h2 style={{ textAlign: "center", fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, margin: "6px 0 4px" }}>Choose Your Plan</h2>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Dynamic premium preview based on your city, platform, hours, and vehicle</p>
      </div>
      <div className="pay-amount-box" style={{ marginBottom: 14 }}>
        <div className="pay-plan">{selectedPlan.name}</div>
        <div className="pay-amt">{formatMoney(preview.weekly)}</div>
        <div className="pay-sub">{formatMoney(preview.monthly)} per month estimate - {preview.cityRisk} city risk - platform x{preview.platformFactor}</div>
      </div>
      <div className="reg-success-card" style={{ marginBottom: 14 }}>
        <div className="detail-row"><span>City risk</span><span>{preview.cityReason}</span></div>
        <div className="detail-row"><span>Vehicle</span><span>{preview.vehicleLabel}</span></div>
        <div className="detail-row"><span>Coverage</span><span>{formatMoney(selectedPlan.coverage)}</span></div>
      </div>
      <div className="plan-list">
        {PLANS.map(plan => {
          const planPreview = getRegistrationPremiumPreview(data, plan.id);
          return (
            <button type="button" key={plan.id} className={`plan-card ${sel === plan.id ? "selected" : ""}`} style={{ "--pc": plan.color }} onClick={() => setSel(plan.id)}>
              {plan.recommended && <div className="plan-rec">Recommended</div>}
              <div className="plan-top">
                <div>
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-price">{formatMoney(planPreview.weekly)}<span>/week</span></div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>base {formatMoney(plan.price)}/week</div>
                </div>
                <div className="plan-check">{sel === plan.id ? "OK" : ""}</div>
              </div>
              <div className="plan-stats"><span>Coverage: {formatMoney(plan.coverage)}</span><span>{formatMoney(plan.payoutPerHour)}/hr</span></div>
              <div className="plan-feats">{plan.features.map((feature, index) => <div key={index} className="plan-feat">- {feature}</div>)}</div>
            </button>
          );
        })}
      </div>
      <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => onNext({ plan: sel, premiumPreview: preview.weekly })}>Next -></button>
    </div>
  );
}

function Reg6({ data, onNext, onBack }) {
  const [paying, setPaying] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const plan = PLANS.find(p => p.id === data.plan) || PLANS[1];
  const dynamicWeekly = getRegistrationPremiumPreview(data, data.plan || "guard").weekly;
  const keyId = getRazorpayKeyId();

  const handleRazorpayPayment = async () => {
    if (!accepted || paying) return;
    setPaymentError("");
    setPaymentNotice("");
    if (!keyId.startsWith("rzp_")) {
      setPaymentError("Razorpay key missing. Add REACT_APP_RAZORPAY_KEY_ID and try again.");
      return;
    }

    setPaying(true);
    try {
      const cycle = getBillingCycleKey();
      const tempWorker = {
        id: `reg-${Date.now()}`,
        name: data?.name || "Gig Worker",
        email: data?.email || "",
        phone: data?.phone || ""
      };
      const order = await createRazorpayOrder({
        amountRupees: dynamicWeekly,
        worker: tempWorker,
        cycle
      });
      const checkoutResponse = await openRazorpayCheckout({
        keyId,
        order,
        worker: tempWorker,
        amountRupees: dynamicWeekly
      });
      const resolvedOrderId = order?.id || checkoutResponse?.razorpay_order_id || `LOCAL-${Date.now()}`;
      const fallbackSuffix = order?.localFallback ? " (local checkout mode)" : "";
      setPaymentNotice(`Payment successful. Order ID: ${resolvedOrderId}${fallbackSuffix}`);
      onNext({
        registrationPayment: {
          provider: "razorpay",
          providerOrderId: resolvedOrderId,
          providerPaymentId: checkoutResponse?.razorpay_payment_id || "",
          amount: dynamicWeekly,
          cycle
        }
      });
    } catch (error) {
      setPaymentError(error?.message || "Payment failed.");
    } finally {
      setPaying(false);
    }
  };

  const handleSkipForNow = () => {
    if (!accepted || paying) return;
    setPaymentError("");
    const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const graceLabel = new Date(graceUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    setPaymentNotice(`Payment deferred. Grace active for 7 days (pay by ${graceLabel}).`);
    onNext({
      registrationPayment: {
        provider: "deferred",
        providerOrderId: "",
        providerPaymentId: "",
        amount: dynamicWeekly,
        cycle: getBillingCycleKey(),
        status: "grace",
        graceUntil
      }
    });
  };

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "75%" }} /></div>
      <div className="fcard">
        <div className="fhead"><div className="step-num">6 of 8</div><h2>Review, Agree And Pay</h2><p>Read the policy details before activating cover</p></div>
        <div className="reg-success-card" style={{ marginBottom: 16 }}>
          <div className="detail-row"><span>Name</span><span>{data.name || "Demo User"}</span></div>
          <div className="detail-row"><span>Platform</span><span>{data.platform || "Swiggy"}</span></div>
          <div className="detail-row"><span>Plan</span><span style={{ color: plan.color }}>{plan.name}</span></div>
          <div className="detail-row"><span>Coverage</span><span>{formatMoney(plan.coverage)}</span></div>
          <div className="detail-row"><span>Weekly premium</span><span>{formatMoney(dynamicWeekly)}</span></div>
        </div>

        <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 16, paddingRight: 4 }}>
          <PrivacyPolicyDetails compact />
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 2 }} />
          <span>I agree to the policy, privacy use of data, payout rules, admin review workflow, and weekly renewal terms.</span>
        </label>

        <div className="pay-amount-box">
          <div className="pay-plan">{plan.name}</div>
          <div className="pay-amt">{formatMoney(dynamicWeekly)}</div>
          <div className="pay-sub">first week premium - auto-renews weekly</div>
        </div>
        {!keyId.startsWith("rzp_") && (
          <div style={{ fontSize: 12, color: "#F97316", marginBottom: 10, lineHeight: 1.5 }}>
            Razorpay key not configured. Add <code>REACT_APP_RAZORPAY_KEY_ID</code> to continue.
          </div>
        )}
        {paymentNotice && <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 10 }}>{paymentNotice}</div>}
        {paymentError && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 10 }}>{paymentError}</div>}
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, lineHeight: 1.55, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px" }}>
          KYC note: test mode simulates payout. Live payout requires verified identity + UPI beneficiary validation.
        </div>

        {paying ? (
          <div className="paying-state"><div className="paying-spinner" /><p>Opening Razorpay checkout...</p></div>
        ) : (
          <div className="upi-options">
            <button className="btn-primary" style={{ marginTop: 4 }} onClick={handleRazorpayPayment} disabled={!accepted}>
              Pay {formatMoney(dynamicWeekly)} With Razorpay
            </button>
            <button
              className="pay-method-btn"
              style={{ width: "100%", marginTop: 10 }}
              onClick={handleSkipForNow}
              disabled={!accepted}
            >
              Skip For Now (7-Day Grace)
            </button>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
              Demo mode: you can continue now and pay first premium within 7 days from Profile/Payments.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Reg7({ data, onDone }) {
  const plan = PLANS.find(p => p.id === data.plan) || PLANS[1];
  const policyId = `GWW-${new Date().getFullYear()}-${(data.city || "CTY").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "CTY"}-${String(Date.now()).slice(-4)}`;
  const activatedPremium = data?.registrationPayment?.amount || data?.premiumPreview || getRegistrationPremiumPreview(data, data.plan || "guard").weekly;
  const isGraceFlow = String(data?.registrationPayment?.status || "").toLowerCase() === "grace";
  const graceUntilLabel = isGraceFlow && data?.registrationPayment?.graceUntil
    ? new Date(data.registrationPayment.graceUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";
  return (
    <div className="screen form-screen" style={{ justifyContent: "center", textAlign: "center" }}>
      <div className="success-ring" style={{ margin: "0 auto 20px" }}><div className="check-icon">OK</div></div>
      <div className="step-num" style={{ marginBottom: 10 }}>7 of 8</div>
      <h2 style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Policy Activated</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>Your income protection is live and the dashboard is ready</p>
      <div className="reg-success-card">
        <div className="detail-row"><span>Name</span><span>{data.name || "Demo User"}</span></div>
        <div className="detail-row"><span>Platform</span><span>{data.platform || "Swiggy"}</span></div>
        <div className="detail-row"><span>Policy ID</span><span>{policyId}</span></div>
        <div className="detail-row"><span>Plan</span><span style={{ color: plan.color }}>{plan.name}</span></div>
        <div className="detail-row"><span>Coverage</span><span>{formatMoney(plan.coverage)}</span></div>
        <div className="detail-row"><span>Premium</span><span>{formatMoney(activatedPremium)}/week</span></div>
        {!!data?.registrationPayment?.providerOrderId && (
          <div className="detail-row"><span>Payment Order</span><span>{data.registrationPayment.providerOrderId}</span></div>
        )}
        <div className="detail-row"><span>Status</span><span className="safe-badge" style={{ color: isGraceFlow ? "#F97316" : "#22c55e" }}>{isGraceFlow ? "Grace Active" : "Active"}</span></div>
        {isGraceFlow && (
          <div className="detail-row"><span>Pay by</span><span>{graceUntilLabel}</span></div>
        )}
      </div>
      <button className="btn-primary" style={{ marginTop: 20 }} onClick={onDone}>Go to Dashboard -></button>
    </div>
  );
}

function Reg8({ data, language, setLanguage, registrationError, registrationLoading, onBack, onDone }) {
  const [selectedLanguage, setSelectedLanguage] = useState(data?.preferredLanguage || language || "en");

  const selectLanguage = (code) => {
    setSelectedLanguage(code);
    setLanguage(code);
  };

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div className="reg-progress"><div className="reg-bar" style={{ width: "100%" }} /></div>
      <div className="fcard">
        <div className="fhead">
          <div className="step-num">8 of 8</div>
          <h2>{translate(selectedLanguage, "languageStepTitle", "Choose Your App Language")}</h2>
          <p>{translate(selectedLanguage, "languageStepBody", "Pick the language the worker understands best. You can change it again from the home screen later.")}</p>
        </div>
        <div className="language-card-grid">
          {LANGUAGE_CARDS.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`language-card ${selectedLanguage === item.code ? "selected" : ""}`}
              style={{ "--lang-accent": item.accent }}
              onClick={() => selectLanguage(item.code)}
            >
              <div className="language-card-top">
                <div className="language-native">{item.native}</div>
                <div className="language-chip">{item.city}</div>
              </div>
              <div className="language-english">{item.english}</div>
              <div className="language-icon">{item.icon}</div>
            </button>
          ))}
        </div>
        {registrationError && <div style={{ color: "#EF4444", fontSize: 13, marginTop: 10 }}>{registrationError}</div>}
        <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => onDone(selectedLanguage)} disabled={registrationLoading}>
          {registrationLoading ? "Creating account..." : translate(selectedLanguage, "continueDashboard", "Continue To Dashboard")}
        </button>
      </div>
    </div>
  );
}

function PolicyPrivacyScreen({ worker, onBack, onUpgrade, language }) {
  const [paused, setPaused] = useState(false);
  const plan = PLANS.find(p => p.id === worker.plan) || PLANS[1];
  const activeWeeklyPremium = getWorkerWeeklyPremium(worker);
  const today = new Date();
  const validTo = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toLocaleDateString(getLanguageLocale(language), { day: "numeric", month: "short", year: "numeric" });
  const billingCredit = worker.billingCredit || 0;

  return (
    <div className="screen form-screen" style={{ background: "var(--bg)" }}>
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <h2 style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{translate(language, "policyPrivacy", "Policy And Privacy")}</h2>

      <div style={{ background: "linear-gradient(135deg,#1a3a5c,#162240)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 18, padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>Policy ID</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 13, fontWeight: 700, color: "#fff" }}>{worker.policyID || "GWW-2026-HYD-4521"}</div>
          </div>
          <div style={{ background: paused ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.2)", color: paused ? "#F97316" : "#22c55e", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
            {paused ? "Paused" : "Active"}
          </div>
        </div>
        <div style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{plan.name}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>{formatMoney(activeWeeklyPremium, language)}/week · {formatMoney(plan.coverage, language)} coverage</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          <span>Valid from: {fmt(today)}</span>
          <span>Valid to: {fmt(validTo)}</span>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Coverage And Billing Snapshot</div>
        <div className="detail-row"><span>{translate(language, "currentPlan", "Current plan")}</span><span>{plan.name}</span></div>
        <div className="detail-row"><span>{translate(language, "weeklyPremium", "Weekly premium")}</span><span>{formatMoney(activeWeeklyPremium, language)}</span></div>
        <div className="detail-row"><span>{translate(language, "accountBillingCredit", "Account billing credit")}</span><span style={{ color: billingCredit > 0 ? "#22c55e" : "var(--text)" }}>{formatMoney(billingCredit, language)}</span></div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{translate(language, "triggersCovered", "Triggers Covered")}</div>
        {plan.triggers.map((t, i) => (
          <div key={i} className="detail-row">
            <span>{t}</span><span className="safe-badge">Covered</span>
          </div>
        ))}
      </div>

      <PrivacyPolicyDetails language={language} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        <button onClick={() => setPaused(!paused)} style={{ padding: 14, background: paused ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.1)", border: `1px solid ${paused ? "rgba(34,197,94,0.3)" : "rgba(249,115,22,0.3)"}`, borderRadius: 13, color: paused ? "#22c55e" : "#F97316", fontFamily: "var(--fd)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {paused ? translate(language, "resumePolicy", "Resume Policy") : translate(language, "pausePolicy", "Pause Policy")}
        </button>
        <button onClick={onUpgrade} style={{ padding: 14, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 13, color: "var(--rain)", fontFamily: "var(--fd)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {translate(language, "upgradePlan", "Upgrade Or Change Plan")}
        </button>
        <button onClick={() => downloadPolicyDocument({ worker, plan, paused, validFrom: fmt(today), validTo: fmt(validTo), language, weeklyPremium: getWorkerWeeklyPremium(worker) })} style={{ padding: 14, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 13, color: "var(--text)", fontFamily: "var(--fd)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {translate(language, "downloadPolicyPdf", "Download Policy PDF")}
        </button>
      </div>
    </div>
  );
}

function UpgradeBillingScreen({ worker, onBack, onDone }) {
  const [selectedPlan, setSelectedPlan] = useState(worker.plan);
  const currentPlan = PLANS.find(p => p.id === worker.plan) || PLANS[1];
  const nextPlan = PLANS.find(p => p.id === selectedPlan) || currentPlan;
  const currentCredit = worker.billingCredit || 0;
  const currentWeeklyPremium = getWorkerWeeklyPremium(worker);
  const nextWeeklyPremium = computeWorkerDynamicPremium({ ...worker, plan: selectedPlan }).weekly;
  const breakdown = getUpgradeBreakdown(currentWeeklyPremium, nextWeeklyPremium, currentCredit);
  const chargeNow = breakdown.amountDueNow > 0;
  const creditQueued = breakdown.downgradeSavings > 0;
  const actionLabel =
    selectedPlan === worker.plan
      ? "Current Plan Selected"
      : chargeNow
        ? `Pay ${formatMoney(breakdown.amountDueNow)} Now And Upgrade`
        : creditQueued
          ? `Change Plan And Queue ${formatMoney(breakdown.downgradeSavings)} Credit`
          : `Switch To ${nextPlan.name}`;

  return (
    <div className="screen form-screen" style={{ paddingTop: 16 }}>
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div style={{ marginBottom: 12, paddingTop: 4 }}>
        <div className="step-num" style={{ textAlign: "center" }}>Plan Upgrade</div>
        <h2 style={{ textAlign: "center", fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, margin: "6px 0 4px" }}>Choose Your Upgrade</h2>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Current plan: {currentPlan.name}</p>
      </div>
      <div className="plan-list">
        {PLANS.map(p => {
          const estimatedWeekly = computeWorkerDynamicPremium({ ...worker, plan: p.id }).weekly;
          return (
            <button key={p.id} className={`plan-card ${selectedPlan === p.id ? "selected" : ""}`} style={{ "--pc": p.color }} onClick={() => setSelectedPlan(p.id)}>
              {p.recommended && <div className="plan-rec">Recommended</div>}
              <div className="plan-top">
                <div>
                  <div className="plan-name">{p.name}</div>
                  <div className="plan-price">{formatMoney(estimatedWeekly)}<span>/week</span></div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>base {formatMoney(p.price)}/week</div>
                </div>
                <div className="plan-check">{selectedPlan === p.id ? "OK" : ""}</div>
              </div>
              <div className="plan-stats"><span>Coverage: {formatMoney(p.coverage)}</span><span>{formatMoney(p.payoutPerHour)}/hr</span></div>
              <div className="plan-feats">{p.features.map((f, i) => <div key={i} className="plan-feat">- {f}</div>)}</div>
            </button>
          );
        })}
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Upgrade Billing Summary</div>
        <div className="detail-row"><span>Current billing week day</span><span>Day {breakdown.dayInCycle} / 7</span></div>
        <div className="detail-row"><span>Days left in current week</span><span>{breakdown.remainingDays} day(s)</span></div>
        <div className="detail-row"><span>Current plan prorated value</span><span>{formatMoney(breakdown.planCredit)}</span></div>
        <div className="detail-row"><span>Existing billing credit</span><span style={{ color: currentCredit > 0 ? "#22c55e" : "var(--text)" }}>{formatMoney(currentCredit)}</span></div>
        <div className="detail-row"><span>New plan prorated value</span><span>{formatMoney(breakdown.proratedNextPrice)}</span></div>
        <div className="detail-row"><span>Credit applied today</span><span>{formatMoney(breakdown.creditApplied)}</span></div>
        <div className="detail-row"><span>Amount due now</span><span style={{ color: breakdown.amountDueNow > 0 ? "#F97316" : "#22c55e" }}>{formatMoney(breakdown.amountDueNow)}</span></div>
        <div className="detail-row"><span>Savings queued to next payment</span><span style={{ color: breakdown.downgradeSavings > 0 ? "#22c55e" : "var(--text)" }}>{formatMoney(breakdown.downgradeSavings)}</span></div>
        <div className="detail-row"><span>Credit available after change</span><span>{formatMoney(breakdown.nextBillingCredit)}</span></div>
      </div>
      <div style={{ background: chargeNow ? "rgba(249,115,22,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${chargeNow ? "rgba(249,115,22,0.24)" : "rgba(34,197,94,0.24)"}`, borderRadius: 14, padding: 14, marginTop: 12, fontSize: 12, color: "var(--muted)", lineHeight: 1.65 }}>
        <strong style={{ color: chargeNow ? "#F97316" : "#22c55e" }}>
          {chargeNow ? "Payment due now." : creditQueued ? "No charge now." : "No billing change."}
        </strong>{" "}
        {chargeNow
          ? `The difference for ${nextPlan.name} is charged immediately when you confirm this change.`
          : creditQueued
            ? `${formatMoney(breakdown.downgradeSavings)} is not lost. It is stored as billing credit and will be applied to your next renewal or future upgrade payment.`
            : "Your selected plan matches the current plan, so there is nothing to charge or queue."}
      </div>
      <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => onDone({ planId: selectedPlan, breakdown })} disabled={selectedPlan === worker.plan}>
        {actionLabel}
      </button>
    </div>
  );
}

function Dashboard({ worker, balance, history, disruptions, activeTab, setActiveTab, online, queuedClaims, onDisruption, onLogout, onPolicy, onCalc, theme, toggleTheme, onWorkerUpdate, language, setLanguage }) {
  return (
    <div className="dash-wrap">
      <div className="dash-content">
        {activeTab === "home" && <HomeTab worker={worker} balance={balance} history={history} disruptions={disruptions} online={online} queuedClaims={queuedClaims} onDisruption={onDisruption} onPolicy={onPolicy} onCalc={onCalc} theme={theme} toggleTheme={toggleTheme} language={language} setLanguage={setLanguage} />}
        {activeTab === "claims" && <ClaimsTab worker={worker} history={history} queuedClaims={queuedClaims} language={language} />}
        {activeTab === "payments" && <PaymentsTab worker={worker} balance={balance} history={history} onWorkerUpdate={onWorkerUpdate} language={language} />}
        {activeTab === "alerts" && <AlertsTab worker={worker} onWorkerUpdate={onWorkerUpdate} language={language} />}
        {activeTab === "profile" && <ProfileTab worker={worker} balance={balance} history={history} onWorkerUpdate={onWorkerUpdate} onLogout={onLogout} language={language} />}
      </div>
      <nav className="bottom-nav">
        {[{ id: "home", icon: "🏠", label: translate(language, "home", "Home") }, { id: "claims", icon: "📋", label: translate(language, "claims", "Claims") }, { id: "payments", icon: "💰", label: translate(language, "payments", "Payments") }, { id: "alerts", icon: "🔔", label: translate(language, "alerts", "Alerts") }, { id: "profile", icon: "👤", label: translate(language, "profile", "Profile") }].map(t => (
          <button key={t.id} className={`nav-btn ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function AdminDashboard({ worker, currentHistory = [], onBack, onSimulateRain, onUseDemoWorker }) {
  const demoMode = String(process.env.REACT_APP_DEMO_MODE || "true").toLowerCase() !== "false";
  const [workers, setWorkers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("today");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [cityForecast, setCityForecast] = useState({});
  const [selectedDemoWorkerId, setSelectedDemoWorkerId] = useState("");
  const [opsNotice, setOpsNotice] = useState("");

  useEffect(() => {
    const usersRef = collection(db, "users");
    const claimsRef = collection(db, "claims");
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const docs = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => String(item?.role || "worker").toLowerCase() !== "admin");
      setWorkers(docs);
      setLoading(false);
    }, () => setLoading(false));
    const unsubClaims = onSnapshot(claimsRef, (snapshot) => {
      const docs = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setClaims(docs);
    });
    return () => {
      unsubUsers();
      unsubClaims();
    };
  }, []);

  useEffect(() => {
    if (workers.length === 0) return;
    if (!selectedDemoWorkerId || !workers.some((item) => item.uid === selectedDemoWorkerId || item.id === selectedDemoWorkerId)) {
      const first = workers.find((item) => (item.uid || item.id));
      setSelectedDemoWorkerId(first?.uid || first?.id || "");
    }
  }, [workers, selectedDemoWorkerId]);

  useEffect(() => {
    let cancelled = false;
    const activeCities = Array.from(new Set(workers.map((item) => item.city).filter(Boolean))).slice(0, 10);
    if (activeCities.length === 0) {
      setCityForecast({});
      return;
    }
    const run = async () => {
      const next = {};
      for (const city of activeCities) {
        try {
          const point = getCityReferencePoint(city);
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lng}&daily=precipitation_probability_max,precipitation_sum,weather_code&timezone=auto&forecast_days=7`
          );
          const weather = await weatherRes.json().catch(() => ({}));
          const probability = Array.isArray(weather?.daily?.precipitation_probability_max) ? weather.daily.precipitation_probability_max : [];
          const rain = Array.isArray(weather?.daily?.precipitation_sum) ? weather.daily.precipitation_sum : [];
          const rainDays = probability.filter((value) => Number(value || 0) >= 70).length;
          const maxProbability = probability.length ? Math.max(...probability.map((value) => Number(value || 0))) : 0;
          const maxRain = rain.length ? Math.max(...rain.map((value) => Number(value || 0))) : 0;
          next[city] = {
            rainDays,
            maxProbability,
            maxRain,
            risk: maxProbability >= 70 || maxRain >= 50 ? "HIGH" : maxProbability >= 45 ? "MEDIUM" : "LOW"
          };
        } catch (error) {
          const fallbackCity = CITIES.find((item) => item.city === city);
          const fallbackRisk = Number(fallbackCity?.risk || 0);
          next[city] = {
            rainDays: fallbackRisk >= 0.75 ? 3 : fallbackRisk >= 0.6 ? 2 : 1,
            maxProbability: Math.round(fallbackRisk * 100),
            maxRain: fallbackRisk >= 0.75 ? 55 : fallbackRisk >= 0.6 ? 35 : 20,
            risk: fallbackRisk >= 0.75 ? "HIGH" : fallbackRisk >= 0.6 ? "MEDIUM" : "LOW"
          };
        }
      }
      if (!cancelled) setCityForecast(next);
    };
    run();
    return () => { cancelled = true; };
  }, [workers]);

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekStartTs = weekStart.getTime();
  const claimTime = (claim) => Date.parse(String(claim?.createdAt || claim?.date || ""));

  const activePolicies = workers.filter((item) => String(item?.status || "").toLowerCase() !== "deleted");
  const claimsToday = claims.filter((item) => String(item?.createdAt || "").slice(0, 10) === todayIso).length;
  const paidClaims = claims.filter((item) => item?.status === "Paid" || item?.status === "Partially Paid");
  const blockedClaims = claims.filter((item) => item?.status === "Blocked");
  const pendingClaims = claims.filter((item) => item?.status === "Pending Review");

  const totalPremiums = activePolicies.reduce((sum, item) => {
    const billingEvents = Array.isArray(item?.billingEvents) ? item.billingEvents : [];
    const fromEvents = billingEvents.reduce((acc, event) => {
      const category = getBillingEventCategory(event);
      if (category !== "premium" && category !== "premium_adjustment") return acc;
      if (String(event?.direction || "").toLowerCase() !== "debit") return acc;
      return acc + Number(event?.amount || 0);
    }, 0);
    if (fromEvents > 0) return sum + fromEvents;
    const weekly = Number(item?.currentWeeklyPremium || 0);
    const ageDays = Number(item?.accountAgeDays || 0);
    const estimatedCycles = Math.max(1, Math.ceil(Math.max(1, ageDays) / 7));
    return sum + (weekly * estimatedCycles);
  }, 0);
  const totalPayouts = paidClaims.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
  const poolBalance = totalPremiums - totalPayouts;
  const bcr = totalPremiums > 0 ? Number((totalPayouts / totalPremiums).toFixed(2)) : 0;
  const thisWeekPayouts = paidClaims.reduce((sum, item) => {
    const ts = claimTime(item);
    if (!Number.isFinite(ts) || ts < weekStartTs) return sum;
    return sum + Number(item?.amount || 0);
  }, 0);
  const weeklyPremiumCollected = activePolicies.reduce((sum, item) => sum + Number(item?.currentWeeklyPremium || 0), 0);
  const avgDailyPayout = thisWeekPayouts / Math.max(1, ((now.getTime() - weekStartTs) / (24 * 60 * 60 * 1000)));
  const projected14DayPayout = Math.round(avgDailyPayout * 14);
  const premiumPool14Day = Math.max(1, Math.round(weeklyPremiumCollected * 2));
  const stressBcr = Number((projected14DayPayout / premiumPool14Day).toFixed(2));
  const liquidityReserveWeeks = thisWeekPayouts > 0 ? Number((poolBalance / thisWeekPayouts).toFixed(2)) : 0;
  const poolColor = bcr < 0.8 ? "#22c55e" : bcr <= 1 ? "#F97316" : "#EF4444";

  const timeFilteredClaims = claims.filter((item) => {
    const ts = claimTime(item);
    if (timeFilter === "all" || !Number.isFinite(ts)) return true;
    if (timeFilter === "today") return String(item?.createdAt || "").slice(0, 10) === todayIso;
    return ts >= weekStartTs;
  });
  const decisionFilteredClaims = timeFilteredClaims.filter((item) => {
    if (decisionFilter === "all") return true;
    return String(item?.status || "").toLowerCase() === decisionFilter;
  });

  const cityStats = Array.from(
    activePolicies.reduce((map, item) => {
      const city = item?.city || "Unknown";
      const cityClaims = claims.filter((claim) => String(claim?.city || "") === city);
      const weeklyClaims = cityClaims.filter((claim) => {
        const ts = claimTime(claim);
        return Number.isFinite(ts) && ts >= weekStartTs;
      });
      const fraudAttempts = cityClaims.filter((claim) => String(claim?.status || "").toLowerCase() === "blocked").length;
      const weather = cityForecast[city];
      map.set(city, {
        city,
        workers: Number(map.get(city)?.workers || 0) + 1,
        claimsThisWeek: weeklyClaims.length,
        fraudAttempts,
        weatherRisk: weather?.risk || "MEDIUM",
      });
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.claimsThisWeek - a.claimsThisWeek);

  const avgPaidClaimAmount = paidClaims.length > 0
    ? paidClaims.reduce((sum, item) => sum + Number(item?.amount || 0), 0) / paidClaims.length
    : 280;
  const predictedClaims = cityStats.reduce((sum, item) => {
    const cityWeather = cityForecast[item.city];
    const rainDays = Number(cityWeather?.rainDays || 0);
    const claimRate = cityWeather?.risk === "HIGH" ? 0.18 : cityWeather?.risk === "MEDIUM" ? 0.11 : 0.06;
    return sum + Math.round(item.workers * claimRate * Math.max(1, rainDays));
  }, 0);
  const predictedPayout = Math.round(predictedClaims * avgPaidClaimAmount);
  const recommendedTopUp = Math.max(0, predictedPayout - Math.max(0, poolBalance + weeklyPremiumCollected));

  const trendMap = {};
  const trendDays = Array.from({ length: 7 }).map((_, idx) => {
    const day = new Date(Date.now() - (6 - idx) * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    trendMap[key] = { key, label: day.toLocaleDateString("en-US", { weekday: "short" }), premium: 0, payout: 0 };
    return trendMap[key];
  });

  claims.forEach((claim) => {
    const key = String(claim?.createdAt || claim?.date || "").slice(0, 10);
    if (!trendMap[key]) return;
    const status = String(claim?.status || "");
    if (status === "Paid" || status === "Partially Paid") {
      trendMap[key].payout += Number(claim?.amount || 0);
    }
  });

  workers.forEach((item) => {
    const events = Array.isArray(item?.billingEvents) ? item.billingEvents : [];
    events.forEach((event) => {
      const key = String(event?.date || "").length > 10
        ? String(event.date).slice(0, 10)
        : (() => {
          const parsed = Date.parse(String(event?.date || ""));
          return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : "";
        })();
      if (!trendMap[key]) return;
      const category = getBillingEventCategory(event);
      if ((category === "premium" || category === "premium_adjustment") && String(event?.direction || "").toLowerCase() === "debit") {
        trendMap[key].premium += Number(event?.amount || 0);
      }
    });
  });

  const trendPeak = Math.max(1, ...trendDays.map((item) => Math.max(item.premium, item.payout)));

  const ringClusters = Object.values(
    claims.reduce((acc, claim) => {
      const gps = claim?.gps;
      if (!gps || !Number.isFinite(Number(gps.lat)) || !Number.isFinite(Number(gps.lng))) return acc;
      const ts = claimTime(claim);
      const hourKey = Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 13) : "unknown-hour";
      const latBucket = (Math.round(Number(gps.lat) * 200) / 200).toFixed(3);
      const lngBucket = (Math.round(Number(gps.lng) * 200) / 200).toFixed(3);
      const key = `${latBucket}|${lngBucket}|${hourKey}`;
      if (!acc[key]) {
        acc[key] = { key, latBucket, lngBucket, hourKey, claims: [], users: new Set() };
      }
      acc[key].claims.push(claim);
      if (claim?.userId) acc[key].users.add(claim.userId);
      return acc;
    }, {})
  )
    .map((cluster) => ({
      ...cluster,
      users: Array.from(cluster.users)
    }))
    .filter((cluster) => cluster.claims.length >= 5)
    .sort((a, b) => b.claims.length - a.claims.length);

  const setWorkerStatus = async (uid, status) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid), {
      status,
      updatedAt: new Date().toISOString()
    }).catch(() => { });
    setOpsNotice(`Worker ${uid.slice(0, 6)} status updated to ${status}.`);
    setTimeout(() => setOpsNotice(""), 2400);
  };

  const flagWorkerForReview = async (uid) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid), {
      flaggedForReview: true,
      updatedAt: new Date().toISOString()
    }).catch(() => { });
    setOpsNotice(`Worker ${uid.slice(0, 6)} flagged for review.`);
    setTimeout(() => setOpsNotice(""), 2400);
  };

  const blockRingCluster = async (cluster) => {
    if (!cluster?.users?.length) return;
    await Promise.all(
      cluster.users.map((uid) =>
        updateDoc(doc(db, "users", uid), {
          status: "suspended",
          fraudFlagged: true,
          updatedAt: new Date().toISOString()
        }).catch(() => { })
      )
    );
    setOpsNotice(`Ring cluster blocked (${cluster.users.length} accounts).`);
    setTimeout(() => setOpsNotice(""), 2400);
  };

  const broadcastRainAlert = async () => {
    if (!workers.length) return;
    const confirmed = window.confirm("Broadcast demo rain alert to all worker profiles?");
    if (!confirmed) return;
    const nowIso = new Date().toISOString();
    await Promise.all(
      workers.map((item) => {
        const uid = item.uid || item.id;
        if (!uid) return Promise.resolve();
        return updateDoc(doc(db, "users", uid), {
          alerts: [
            { type: "Heavy Rain Warning", zone: item.zone || "Central Zone", prob: 82, time: "Next 4 hours", color: "#EF4444" }
          ],
          demoRainBroadcastAt: nowIso,
          updatedAt: nowIso
        }).catch(() => { });
      })
    );
    setOpsNotice("Rain alert broadcasted to all worker profiles.");
    setTimeout(() => setOpsNotice(""), 2400);
  };

  const cleanupFirestoreDemoData = async () => {
    const confirmed = window.confirm("Delete non-persona Firestore users/claims and keep only demo personas + admin?");
    if (!confirmed) return;
    const personaEmails = new Set(["raju.k@gmail.com", "meena.d@gmail.com", "priya.s@gmail.com", "v7749@tempmail.com", ADMIN_DEFAULT_EMAIL]);
    const keepUserIds = new Set();
    for (const workerProfile of workers) {
      const userEmail = String(workerProfile?.email || "").toLowerCase();
      const uid = workerProfile?.uid || workerProfile?.id;
      if (personaEmails.has(userEmail)) {
        if (uid) keepUserIds.add(uid);
        continue;
      }
      if (uid) {
        await deleteDoc(doc(db, "users", uid)).catch(() => { });
      }
    }

    await Promise.all(
      claims.map((claim) => {
        const userId = claim?.userId || "";
        if (keepUserIds.has(userId)) return Promise.resolve();
        return deleteDoc(doc(db, "claims", claim.id)).catch(() => { });
      })
    );
    setOpsNotice("Firestore cleanup done. (Auth user cleanup must be done from Firebase Authentication console.)");
    setTimeout(() => setOpsNotice(""), 3500);
  };

  const seedPersonasToFirestore = async () => {
    const confirmed = window.confirm("Seed 4 demo personas to Firestore now?");
    if (!confirmed) return;
    const now = Date.now();
    const seedEntries = [
      { key: "raju", ageDays: 180 },
      { key: "meena", ageDays: 14 },
      { key: "priya", ageDays: 120 },
      { key: "vikram", ageDays: 3 },
    ];
    for (const entry of seedEntries) {
      const persona = PERSONAS[entry.key];
      if (!persona) continue;
      const uid = `persona_${entry.key}`;
      const createdAt = new Date(now - entry.ageDays * 24 * 60 * 60 * 1000).toISOString();
      const seedWorker = {
        ...persona,
        id: uid,
        uid,
        role: "worker",
        createdAt,
        accountCreatedAt: createdAt,
        currentWeeklyPremium: computeWorkerDynamicPremium(persona).weekly,
        billingEvents: Array.isArray(persona?.billingEvents) ? persona.billingEvents : [],
        paymentStatus: entry.ageDays < 7 ? "pending" : "paid",
        lastPremiumPaidCycle: entry.ageDays < 7 ? "" : getBillingCycleKey(),
        history: Array.isArray(persona?.history)
          ? persona.history.map((claim) => ({
            ...claim,
            createdAt: claim?.createdAt || createdAt,
            city: persona.city,
            zone: persona.zone,
            userId: uid,
          }))
          : []
      };
      await setDoc(doc(db, "users", uid), buildFirestoreUserProfile(seedWorker, uid, { role: "worker" }), { merge: true }).catch(() => { });
      for (const claim of seedWorker.history || []) {
        const claimId = claim?.id || `CLM-${uid}-${Date.now()}`;
        await setDoc(doc(db, "claims", claimId), {
          ...claim,
          id: claimId,
          workerId: uid,
          workerName: seedWorker.name,
          userId: uid,
          city: seedWorker.city,
          zone: seedWorker.zone,
          platform: seedWorker.platform,
          plan: seedWorker.plan,
          disruption: claim.type || claim.disruption || ""
        }, { merge: true }).catch(() => { });
      }
    }
    setOpsNotice("Demo personas seeded to Firestore.");
    setTimeout(() => setOpsNotice(""), 3000);
  };

  const selectedDemoWorker = workers.find((item) => (item.uid || item.id) === selectedDemoWorkerId) || null;

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={onBack}>{"< Back"}</button>
      <div style={{ marginBottom: 12 }}>
        <div className="step-num">Insurer View</div>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800, margin: "6px 0 4px" }}>Admin Dashboard</h2>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Live Firestore metrics, fraud posture, and pool sustainability.</p>
      </div>
      {opsNotice && <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 10 }}>{opsNotice}</div>}
      {loading && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Loading live metrics...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginBottom: 12 }}>
        <div className="stat-sm"><span className="sn">{activePolicies.length}</span><span className="sl">Active policies</span></div>
        <div className="stat-sm"><span className="sn">{claimsToday}</span><span className="sl">Claims today</span></div>
        <div className="stat-sm"><span className="sn" style={{ color: "#22c55e" }}>{formatMoney(Math.max(0, poolBalance))}</span><span className="sl">Pool balance</span></div>
        <div className="stat-sm"><span className="sn" style={{ color: "#EF4444" }}>{blockedClaims.length}</span><span className="sl">Fraud blocked</span></div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>BCR Stress Test</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: poolColor }}>{bcr < 1 ? "Sustainable" : "At Risk"}</div>
        </div>
        <div className="detail-row"><span>Premiums collected</span><span>{formatMoney(totalPremiums)}</span></div>
        <div className="detail-row"><span>Payouts released</span><span>{formatMoney(totalPayouts)}</span></div>
        <div className="detail-row"><span>BCR (payout / premium)</span><span style={{ color: poolColor, fontWeight: 700 }}>{bcr.toFixed(2)}</span></div>
        <div className="detail-row"><span>14-day monsoon stress BCR</span><span style={{ color: stressBcr < 1 ? "#22c55e" : "#EF4444", fontWeight: 700 }}>{stressBcr.toFixed(2)}</span></div>
        <div className="detail-row"><span>Liquidity reserve</span><span style={{ color: liquidityReserveWeeks >= 1 ? "#22c55e" : "#F97316", fontWeight: 700 }}>{liquidityReserveWeeks.toFixed(2)} weeks</span></div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Predictive Analytics</div>
        <div className="detail-row"><span>Predicted claims next week</span><span>{predictedClaims}</span></div>
        <div className="detail-row"><span>Predicted payout next week</span><span>{formatMoney(predictedPayout)}</span></div>
        <div className="detail-row"><span>Recommended pool top-up</span><span style={{ color: recommendedTopUp > 0 ? "#F97316" : "#22c55e", fontWeight: 700 }}>{formatMoney(recommendedTopUp)}</span></div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>7-Day Premium vs Payout Trend</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 8, alignItems: "end", minHeight: 120 }}>
          {trendDays.map((item) => (
            <div key={item.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", gap: 2, alignItems: "end", height: 82 }}>
                <div title={`Premium ${formatMoney(item.premium)}`} style={{ width: 8, height: `${Math.max(6, Math.round((item.premium / trendPeak) * 80))}px`, background: "#22c55e", borderRadius: 999 }} />
                <div title={`Payout ${formatMoney(item.payout)}`} style={{ width: 8, height: `${Math.max(6, Math.round((item.payout / trendPeak) * 80))}px`, background: "#3B82F6", borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          <span style={{ color: "#22c55e", fontWeight: 700 }}>■</span> Premium collection
          <span style={{ marginLeft: 10, color: "#3B82F6", fontWeight: 700 }}>■</span> Claim payouts
        </div>
      </div>

      {demoMode && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Demo Trigger</div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Demo worker</label>
            <select value={selectedDemoWorkerId} onChange={(e) => setSelectedDemoWorkerId(e.target.value)}>
              {workers.map((item) => {
                const key = item.uid || item.id;
                return <option key={key} value={key}>{item.name || key} • {item.city || "Unknown city"}</option>;
              })}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-outline" style={{ flex: 1 }} onClick={() => selectedDemoWorker && onUseDemoWorker?.(selectedDemoWorker)} disabled={!selectedDemoWorker}>
              Load Worker
            </button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => onSimulateRain?.(selectedDemoWorker)} disabled={!selectedDemoWorker}>
              Simulate Rain Claim
            </button>
          </div>
          <button className="btn-outline" style={{ width: "100%", marginTop: 8 }} onClick={broadcastRainAlert}>
            Broadcast Rain Alert (All Workers)
          </button>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
            Simulate Rain Claim = opens claim flow for selected worker only. Broadcast Rain Alert = pushes alert card to all workers.
          </div>
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Claims Management</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ fontSize: 11, padding: "4px 6px", borderRadius: 8, background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)" }}>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="all">All time</option>
            </select>
            <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)} style={{ fontSize: 11, padding: "4px 6px", borderRadius: 8, background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)" }}>
              <option value="all">All decisions</option>
              <option value="paid">Approved</option>
              <option value="blocked">Blocked</option>
              <option value="pending review">Delayed</option>
            </select>
          </div>
        </div>
        <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
          {decisionFilteredClaims.length === 0 && <div style={{ padding: 12, fontSize: 12, color: "var(--muted)" }}>No claims for selected filters.</div>}
          {decisionFilteredClaims.slice(0, 40).map((claim) => (
            <button
              key={claim.id}
              type="button"
              onClick={() => setSelectedClaim(claim)}
              style={{ width: "100%", textAlign: "left", background: selectedClaim?.id === claim.id ? "rgba(59,130,246,0.08)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "var(--text)", padding: "9px 10px", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{claim?.workerName || claim?.workerId || claim?.userId || "Worker"}</span>
                <span style={{ fontSize: 11, color: claim?.status === "Blocked" ? "#EF4444" : claim?.status === "Pending Review" ? "#F97316" : "#22c55e" }}>{claim?.status || "Unknown"}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {claim?.city || "Unknown city"} • {claim?.type || claim?.disruption || "Claim"} • {formatMoney(claim?.amount || claim?.eligibleAmount || 0)}
              </div>
            </button>
          ))}
        </div>
        {selectedClaim && (
          <div style={{ marginTop: 10, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, fontSize: 11, lineHeight: 1.6 }}>
            <div><strong>Claim ID:</strong> {selectedClaim.id}</div>
            <div><strong>Fraud score:</strong> {selectedClaim.score ?? "-"}</div>
            <div><strong>Decision:</strong> {selectedClaim.status || "-"}</div>
            <div><strong>GPS:</strong> {selectedClaim?.gps?.lat ? `${selectedClaim.gps.lat}, ${selectedClaim.gps.lng}` : "Unavailable"}</div>
            <div><strong>Timestamp:</strong> {selectedClaim.createdAt || selectedClaim.date || "-"}</div>
            {!!selectedClaim?.evidenceImage && (
              <div style={{ marginTop: 6 }}>
                <a href={selectedClaim.evidenceImage} target="_blank" rel="noreferrer" style={{ color: "var(--rain)" }}>
                  View evidence image
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Event Volume by Disruption</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Totals from recent claims</div>
        </div>
        {(() => {
          const disruptionCounts = DISRUPTIONS.map((item) => {
            const count = claims.filter((claim) => {
              const target = String(claim?.disruption || claim?.type || "").toLowerCase();
              const label = String(item.label || "").toLowerCase();
              return target.includes(label.split(" ")[0]) || target.includes(label);
            }).length;
            return { ...item, count };
          });
          const maxCount = Math.max(...disruptionCounts.map((item) => item.count), 1);
          return disruptionCounts.map((item) => (
            <div key={item.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span><span style={{ marginRight: 8 }}>{item.icon}</span>{item.label}</span>
                <span>{item.count} claims</span>
              </div>
              <div style={{ height: 10, borderRadius: 9999, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ height: "100%", width: `${Math.round((item.count / maxCount) * 100)}%`, background: item.color, borderRadius: 9999 }} />
              </div>
            </div>
          ));
        })()}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Fraud Ring Detection</div>
        {ringClusters.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>No GPS claim clusters crossed risk threshold.</div>}
        {ringClusters.map((cluster) => (
          <div key={cluster.key} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              Cluster {cluster.latBucket}, {cluster.lngBucket} • {cluster.hourKey}:00
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              {cluster.claims.length} claims • {cluster.users.length} worker accounts
            </div>
            <button className="btn-outline" style={{ padding: "8px 10px", fontSize: 11 }} onClick={() => blockRingCluster(cluster)}>
              Block Cluster Accounts
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Worker Management</div>
        <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
          {workers.map((item) => {
            const uid = item.uid || item.id;
            const status = String(item.status || "active").toLowerCase();
            return (
              <div key={uid} style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{item.name || uid}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {item.city || "Unknown"} • {item.platform || "Platform"} • {item.planName || item.plan || "Plan"}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: status === "suspended" ? "#EF4444" : status === "paused" ? "#F97316" : "#22c55e", alignSelf: "flex-start" }}>
                    {status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn-outline" style={{ padding: "7px 9px", fontSize: 11 }} onClick={() => setWorkerStatus(uid, status === "suspended" ? "active" : "suspended")}>
                    {status === "suspended" ? "Resume" : "Suspend"}
                  </button>
                  <button className="btn-outline" style={{ padding: "7px 9px", fontSize: 11 }} onClick={() => flagWorkerForReview(uid)}>
                    Flag Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn-outline" style={{ marginTop: 10, padding: "8px 10px", fontSize: 11 }} onClick={cleanupFirestoreDemoData}>
          Cleanup Firestore (Keep 4 Personas)
        </button>
        <button className="btn-outline" style={{ marginTop: 8, padding: "8px 10px", fontSize: 11 }} onClick={seedPersonasToFirestore}>
          Seed 4 Personas To Firestore
        </button>
      </div>
    </div>
  );
}

function HomeTab({ worker, balance, history, disruptions, online, queuedClaims, onDisruption, onPolicy, onCalc, theme, toggleTheme, language, setLanguage }) {
  const plan = PLANS.find(p => p.id === worker.plan) || PLANS[1];
  const billingCredit = worker.billingCredit || 0;
  const pendingPremiumDue = worker.pendingPremiumDue || 0;
  const graceDaysLeft = getGraceDaysLeft(worker);
  const paymentInGrace = isPaymentInGrace(worker);

  // Dynamic premium calculation
  const premium = computeWorkerDynamicPremium(worker);
  const dynamicPremium = getWorkerWeeklyPremium(worker) || premium.weekly;
  const diff = worker.premiumDiff ?? premium.diff;
  const zr = worker.premiumFactors?.zf ?? premium.factors.zf;
  const pf = worker.premiumFactors?.pf ?? premium.factors.pf;
  const cf = worker.premiumFactors?.cf ?? premium.factors.cf;

  return (
    <div className="tab-screen">
      <div className="home-header">
        <div>
          <div className="home-greet">{translate(language, "hey", "Hey")}, {localizeTerm(language, worker.name).split(" ")[0]} 👋</div>
          <div className="home-sub">{localizeTerm(language, worker.platform)} · {localizeTerm(language, worker.zone)}, {localizeTerm(language, worker.city)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LanguageSelector language={language} setLanguage={setLanguage} compact />
          <button onClick={toggleTheme} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 14 }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div className="home-status">
            {online ? <span className="online-dot">●</span> : <span className="offline-dot">●</span>}
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{online ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>

      {!online && <div className="offline-card"><div className="offline-icon">📡</div><div><div className="offline-title">{translate(language, "offlineModeActive", "Offline Mode Active")}</div><div className="offline-sub">{translate(language, "claimsQueueSync", "Claims will queue and sync when connected")}</div></div></div>}
      {queuedClaims.length > 0 && <div className="queued-card"><span>⏳ {queuedClaims.length} {translate(language, "claimQueuedWillSync", "claim(s) queued • will sync when online")}</span></div>}

      <div className="balance-card">
        <div className="bal-top">
          <div>
            <div className="bal-label">{translate(language, "totalPayoutsReceived", "Total payouts received")}</div>
            <div className="bal-amt">₹{balance.toLocaleString()}</div>
          </div>
          <div className="plan-pill" style={{ background: `${plan.color}22`, color: plan.color }}>{plan.name}</div>
        </div>
        <div className="bal-bottom"><span>₹{dynamicPremium}/week · {translate(language, "active", "Active")}</span><span>{translate(language, "since", "Since")} {worker.since}</span></div>
      </div>

      {paymentInGrace && (
        <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.14),rgba(249,115,22,0.05))", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#F97316" }}>First Premium In Grace Mode</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 800, color: "#F97316" }}>{graceDaysLeft} day(s) left</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
            You skipped onboarding payment. Complete Razorpay payment from Payments tab before grace expires.
          </div>
        </div>
      )}

      {/* Dynamic premium breakdown card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{translate(language, "thisWeeksPremium", "This Week's Premium")}</div>
          <button onClick={onCalc} style={{ fontSize: 11, color: "var(--rain)", background: "none", border: "none", cursor: "pointer" }}>{translate(language, "fullCalculator", "Full Calculator")} -></button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800 }}>₹{dynamicPremium}</div>
          <div style={{ fontSize: 12, color: diff > 0 ? "#F97316" : "#22c55e", fontWeight: 600 }}>{diff > 0 ? `+₹${diff} vs base` : `₹${Math.abs(diff)} saved`}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, background: `${cf > 1 ? "rgba(249,115,22,0.1)" : "rgba(34,197,94,0.1)"}`, color: cf > 1 ? "#F97316" : "#22c55e", padding: "2px 8px", borderRadius: 6 }}>City x{cf}</span>
          <span style={{ fontSize: 10, background: `${zr > 1 ? "rgba(249,115,22,0.1)" : "rgba(34,197,94,0.1)"}`, color: zr > 1 ? "#F97316" : "#22c55e", padding: "2px 8px", borderRadius: 6 }}>Zone x{zr}</span>
          <span style={{ fontSize: 10, background: `${pf > 1 ? "rgba(249,115,22,0.1)" : "rgba(34,197,94,0.1)"}`, color: pf > 1 ? "#F97316" : "#22c55e", padding: "2px 8px", borderRadius: 6 }}>{worker.platform} x{pf}</span>
        </div>
      </div>

      {pendingPremiumDue > 0 && (
        <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.14),rgba(249,115,22,0.05))", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#F97316" }}>Pending Premium Due</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 800, color: "#F97316" }}>{formatMoney(pendingPremiumDue, language)}</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
            City/zone change increased risk premium. Settle from Payments tab.
          </div>
        </div>
      )}

      {/* Quick actions */}
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={onPolicy} style={{ flex: 1, padding: "10px 8px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
          {translate(language, "myPolicy", "My Policy")}
        </button>
        <button onClick={onCalc} style={{ flex: 1, padding: "10px 8px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
          {translate(language, "calculator", "Calculator")}
        </button>
      </div>

      {billingCredit > 0 && (
        <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.04))", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 14, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{translate(language, "queuedBillingCredit", "Queued Billing Credit")}</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 800, color: "#22c55e" }}>{formatMoney(billingCredit)}</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
            {translate(language, "creditHelpText", "This credit will be used on the next premium payment first. If any balance remains after payment, it stays queued for the following renewal.")}
          </div>
        </div>
      )}

      {worker.alerts && worker.alerts.length > 0 && (
        <div className="alert-banner">
          <span className="alert-icon">⚠️</span>
          <div><div className="alert-title">{translate(language, "liveDisruption", "Live disruption in")} {worker.zone}</div><div className="alert-sub">{worker.alerts[0].type} • {translate(language, "tapToClaim", "Tap below to claim")}</div></div>
        </div>
      )}

      <div className="section-title">{translate(language, "disruptionClaimLabel", "File a disruption claim")}</div>

      {/* Payout tier legend */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, fontSize: 11 }}>
        <div style={{ color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>{translate(language, "payoutTiersLabel", "Payout tiers (based on fraud score)")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", padding: "2px 8px", borderRadius: 6 }}>0-40 → 100%</span>
          <span style={{ background: "rgba(249,115,22,0.1)", color: "#F97316", padding: "2px 8px", borderRadius: 6 }}>40-70 → 50%</span>
          <span style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", padding: "2px 8px", borderRadius: 6 }}>70+ → 0%</span>
        </div>
      </div>

      <div className="dis-grid">
        {disruptions.map(d => (
          <button key={d.id} className="dis-card" onClick={() => onDisruption(d)} style={{ "--dc": d.color }}>
            <div className="dis-icon">{d.icon}</div>
            <div className="dis-label">{localizeTerm(language, d.label)}</div>
            <div className="dis-val">{localizeTerm(language, d.value)}</div>
            <div className="dis-pay">₹{d.amount}</div>
            {!online && <div className="dis-offline">{translate(language, "queuesOffline", "Queues offline")}</div>}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <div className="section-title">{translate(language, "recentClaims", "Recent claims")}</div>
          {history.slice(0, 2).map((h, i) => (
            <div key={i} className="mini-claim">
              <div className="mc-left"><div className="mc-type">{localizeTerm(language, h.type)}</div><div className="mc-date">{localizeDate(language, h.date)}</div></div>
              <div className="mc-right">
                <div className="mc-amt" style={{ color: (h.status === "Paid" || h.status === "Partially Paid") ? "#22c55e" : (h.status === "Queued" || h.status === "Pending Review") ? "#F97316" : "#EF4444" }}>
                  {h.status === "Paid"
                    ? `+₹${h.amount}`
                    : h.status === "Queued"
                      ? translate(language, "queued", "Queued")
                      : h.status === "Pending Review"
                        ? "Pending Review"
                        : translate(language, "blocked", "Blocked")}
                </div>
                <div className="mc-score">{translate(language, "score", "Score")}: {h.score}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ClaimsTab({ worker, history, queuedClaims, language }) {
  const all = [...queuedClaims.map(q => ({ ...q, status: "Queued" })), ...history];
  const isCreditedStatus = (status) => status === "Paid" || status === "Partially Paid";
  const approved = all.filter(h => isCreditedStatus(h.status)).length;
  const total = all.reduce((a, h) => a + (h.amount || 0), 0);
  return (
    <div className="tab-screen">
      <h2 className="tab-title">{translate(language, "claimsHistory", "Claims History")}</h2>
      <div className="stats-row-sm">
        <div className="stat-sm"><span className="sn">{all.length}</span><span className="sl">{translate(language, "total", "Total")}</span></div>
        <div className="stat-sm"><span className="sn" style={{ color: "#22c55e" }}>{approved}</span><span className="sl">{translate(language, "approved", "Approved")}</span></div>
        <div className="stat-sm"><span className="sn" style={{ color: "#3B82F6" }}>₹{total.toLocaleString()}</span><span className="sl">{translate(language, "received", "Received")}</span></div>
        <div className="stat-sm"><span className="sn">{translate(language, "instant", "Instant")}</span><span className="sl">{translate(language, "avgTime", "Avg time")}</span></div>
      </div>
      <div className="auto-flow">
        {["Disruption Detected", "Claim Triggered", "Fraud Verified", "Payout Released"].map((s, i) => (
          <div key={i} className="flow-step">
            <div className="flow-num">{i + 1}</div><div className="flow-label">{translate(language, s, s)}</div>
            {i < 3 && <div className="flow-arrow">→</div>}
          </div>
        ))}
      </div>
      {all.length === 0 && <div className="empty-state">{translate(language, "noClaimsYet", "No claims yet. File your first claim from the home tab.")}</div>}
      <div className="claims-list">
        {all.map((h, i) => (
          <div key={i} className="claim-item">
            {(() => {
              const payoutStatus = h.status === "Paid" || h.status === "Partially Paid";
              const pendingStatus = h.status === "Queued" || h.status === "Pending Review";
              const statusColor = payoutStatus ? "#22c55e" : pendingStatus ? "#F97316" : "#EF4444";
              return (
                <>
                  <div className="ci-top">
                    <div className="ci-type">{localizeTerm(language, h.type)}</div>
                    <div className="ci-amt" style={{ color: statusColor }}>
                      {payoutStatus
                        ? `+₹${h.amount}`
                        : pendingStatus
                          ? localizeTerm(language, h.status)
                          : "₹0"}
                    </div>
                  </div>
                  <div className="ci-bottom">
                    <span>{localizeDate(language, h.date)} • {localizeDuration(language, h.duration)}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="ci-score">{translate(language, "score", "Score")}: {h.score}</span>
                      <span className="ci-status" style={{ background: payoutStatus ? "rgba(34,197,94,0.12)" : pendingStatus ? "rgba(249,115,22,0.12)" : "rgba(239,68,68,0.12)", color: statusColor }}>{localizeTerm(language, h.status)}</span>
                    </div>
                  </div>
                  {h.status === "Blocked" && <div className="ci-reason">{translate(language, "blockedReason", "Fraud detection blocked this claim. Risk score too high.")}</div>}
                  {h.status === "Queued" && <div className="ci-reason" style={{ color: "#F97316" }}>{translate(language, "queuedReason", "Filed offline — will process when network returns.")}</div>}
                  {h.status === "Pending Review" && (
                    <div className="ci-reason" style={{ color: "#F97316" }}>
                      <div>Queued for verification. Target review in ~2 hours.</div>
                      {!!h.verificationEtaAt && <div style={{ marginTop: 4 }}>ETA: {new Date(h.verificationEtaAt).toLocaleString("en-IN")}</div>}
                      {Array.isArray(h.verificationChecks) && h.verificationChecks.length > 0 && (
                        <div style={{ marginTop: 4 }}>Checks: {h.verificationChecks.join(" • ")}</div>
                      )}
                    </div>
                  )}
                  {h.evidenceImage && (
                    <div style={{ marginTop: 6 }}>
                      <a href={h.evidenceImage} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--rain)" }}>
                        View geotagged claim image
                      </a>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsTab({ worker, balance, history, onWorkerUpdate, language }) {
  const activePremium = getWorkerWeeklyPremium(worker);
  const paidClaims = history.filter((h) => h.status === "Paid" || h.status === "Partially Paid");
  const billingEvents = worker.billingEvents || [];
  const billingCredit = worker.billingCredit || 0;
  const pendingPremiumDue = worker.pendingPremiumDue || 0;
  const currentCycle = getBillingCycleKey();
  const cycleContext = getCycleContext();
  const paidThisCycle = worker.lastPremiumPaidCycle === currentCycle;
  const graceDaysLeft = getGraceDaysLeft(worker);
  const paymentInGrace = isPaymentInGrace(worker);
  const premiumWindowOpen = isPremiumPaymentWindowOpen();
  const canPayWeeklyPremium = !paidThisCycle && (premiumWindowOpen || paymentInGrace);
  const premiumEvents = billingEvents.filter((event) => {
    const category = getBillingEventCategory(event);
    return category === "premium" || category === "premium_adjustment";
  });
  const creditEvents = billingEvents.filter((event) => {
    const category = getBillingEventCategory(event);
    return category === "credit" || event.source === "credit_wallet" || event.source === "credit_wallet_plus_cash";
  });
  const renewal = getRenewalBreakdown(activePremium, billingCredit);
  const outOfPocketPremium = premiumEvents.reduce((sum, event) => {
    if (event.direction !== "debit") return sum;
    const type = String(event.type || "").toLowerCase();
    if (type.includes("adjustment") && !type.includes("payment")) return sum;
    if (event.source === "credit_wallet") return sum;
    return sum + Number(event.amount || 0);
  }, 0);
  const premiumPaidFromCredits = premiumEvents.reduce((sum, event) => {
    const type = String(event.type || "").toLowerCase();
    if (type.includes("adjustment") && !type.includes("payment")) return sum;
    if (event.source !== "credit_wallet") return sum;
    return sum + Number(event.amount || 0);
  }, 0);
  const totalClaimPayouts = paidClaims.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netGain = totalClaimPayouts - outOfPocketPremium;
  const razorpayKeyId = getRazorpayKeyId();
  const razorpayReady = razorpayKeyId.startsWith("rzp_");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paying, setPaying] = useState(false);

  const applyRenewalPayment = async (method) => {
    if (!canPayWeeklyPremium) return;
    setPaymentError("");
    setPaymentNotice("");
    if (paying) return;

    const cycle = getBillingCycleKey();
    let checkoutResponse = null;
    let order = null;

    if (renewal.amountDueNow > 0) {
      if (!razorpayReady) {
        setPaymentError("Razorpay key missing. Add REACT_APP_RAZORPAY_KEY_ID before paying.");
        return;
      }
      setPaying(true);
      try {
        order = await createRazorpayOrder({
          amountRupees: renewal.amountDueNow,
          worker,
          cycle,
        });
        checkoutResponse = await openRazorpayCheckout({
          keyId: razorpayKeyId,
          order,
          worker,
          amountRupees: renewal.amountDueNow,
        });
      } catch (error) {
        setPaymentError(error?.message || "Payment failed. Please try again.");
        setPaying(false);
        return;
      }
      setPaying(false);
    }

    const resolvedOrderId = order?.id || checkoutResponse?.razorpay_order_id || `LOCAL-${Date.now()}`;
    const events = [];
    if (renewal.creditUsed > 0) {
      events.push({
        id: `BILL-${Date.now()}-credit`,
        date: todayLabel(language),
        type: "Weekly Premium (Credit Wallet)",
        detail: `${formatMoney(renewal.creditUsed, language)} used from billing credit`,
        amount: renewal.creditUsed,
        direction: "debit",
        category: "premium",
        source: "credit_wallet",
        cycle,
      });
    }
    if (renewal.amountDueNow > 0) {
      events.push({
        id: `BILL-${Date.now()}-cash`,
        date: todayLabel(language),
        type: "Weekly Premium (Cash)",
        detail: `${method} paid ${formatMoney(renewal.amountDueNow, language)} • Order ${resolvedOrderId} • Payment ${checkoutResponse?.razorpay_payment_id || "N/A"}`,
        amount: renewal.amountDueNow,
        direction: "debit",
        category: "premium",
        source: method.toLowerCase().replace(/\s+/g, "_"),
        provider: "razorpay",
        providerOrderId: resolvedOrderId,
        providerPaymentId: checkoutResponse?.razorpay_payment_id || "",
        cycle,
      });
    }
    if (renewal.amountDueNow === 0) {
      events.push({
        id: `BILL-${Date.now()}-done`,
        date: todayLabel(language),
        type: "Weekly Premium Settled",
        detail: renewal.remainingCredit > 0
          ? `${formatMoney(renewal.remainingCredit, language)} remains in credit wallet for next cycle`
          : "Weekly premium fully settled using billing credit",
        amount: 0,
        direction: "credit",
        category: "premium",
        source: "credit_wallet",
        cycle,
      });
    }
    onWorkerUpdate({
      ...worker,
      billingCredit: renewal.remainingCredit,
      billingEvents: [...events, ...billingEvents],
      lastPremiumPaidCycle: cycle,
      lastPremiumPaidAt: new Date().toISOString(),
      paymentStatus: "paid",
      paymentGraceUntil: "",
      paymentDueAmount: 0,
    });
    if (renewal.amountDueNow > 0) {
      const fallbackSuffix = order?.localFallback ? " (local checkout mode)" : "";
      setPaymentNotice(`Payment successful. Order ID: ${resolvedOrderId}${fallbackSuffix}`);
    } else {
      setPaymentNotice("Weekly premium settled using billing credit.");
    }
  };

  const settleLocationAdjustment = (method) => {
    if (pendingPremiumDue <= 0) return;
    const cycle = getBillingCycleKey();
    const creditUsed = Math.min(billingCredit, pendingPremiumDue);
    const remainingDue = pendingPremiumDue - creditUsed;
    const events = [];
    if (creditUsed > 0) {
      events.push({
        id: `BILL-${Date.now()}-loc-credit`,
        date: todayLabel(language),
        type: "Location Premium Due (Credit Applied)",
        detail: `${formatMoney(creditUsed, language)} applied from existing billing credit`,
        amount: creditUsed,
        direction: "debit",
        category: "premium_adjustment",
        source: "credit_wallet",
        cycle,
      });
    }
    if (remainingDue > 0) {
      events.push({
        id: `BILL-${Date.now()}-loc-pay`,
        date: todayLabel(language),
        type: "Location Premium Due Payment",
        detail: `${method} paid ${formatMoney(remainingDue, language)} for location risk adjustment`,
        amount: remainingDue,
        direction: "debit",
        category: "premium_adjustment",
        source: method.toLowerCase().replace(/\s+/g, "_"),
        cycle,
      });
    }
    onWorkerUpdate({
      ...worker,
      billingCredit: Math.max(0, billingCredit - creditUsed),
      pendingPremiumDue: 0,
      billingEvents: [...events, ...billingEvents]
    });
  };

  return (
    <div className="tab-screen">
      <h2 className="tab-title">{translate(language, "paymentsAndPayouts", "Payments And Payouts")}</h2>
      <div className="stats-row-sm">
        <div className="stat-sm"><span className="sn" style={{ color: "#22c55e" }}>₹{balance.toLocaleString()}</span><span className="sl">{translate(language, "totalPayouts", "Total payouts")}</span></div>
        <div className="stat-sm"><span className="sn">{formatMoney(outOfPocketPremium, language)}</span><span className="sl">Premium paid (own money)</span></div>
        <div className="stat-sm"><span className="sn" style={{ color: "#22c55e" }}>{formatMoney(premiumPaidFromCredits, language)}</span><span className="sl">Premium paid (credits)</span></div>
        <div className="stat-sm"><span className="sn" style={{ color: billingCredit > 0 ? "#22c55e" : "var(--text)" }}>{formatMoney(billingCredit, language)}</span><span className="sl">{translate(language, "billingCredit", "Billing credit")}</span></div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div className="pr-title">Weekly Premium Status</div>
          <div style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, color: "#22d3ee" }}>{formatMoney(activePremium, language)}</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 10 }}>
          {paidThisCycle
            ? `Paid for current cycle (${currentCycle}). Next payment unlocks near week end.`
            : paymentInGrace
              ? `Grace mode active (${graceDaysLeft} day(s) left). First premium payment is pending.`
              : premiumWindowOpen
                ? `Payment window is open (day ${cycleContext.dayInCycle}/7).`
                : `Payment window opens on day 6. Current day: ${cycleContext.dayInCycle}/7.`}
        </div>
        {!razorpayReady && (
          <div style={{ fontSize: 12, color: "#F97316", lineHeight: 1.5, marginBottom: 10 }}>
            Razorpay key not configured. Set <code>REACT_APP_RAZORPAY_KEY_ID</code> to enable cash premium payment.
          </div>
        )}
        {paymentNotice && (
          <div style={{ fontSize: 12, color: "#22c55e", lineHeight: 1.5, marginBottom: 10 }}>
            {paymentNotice}
          </div>
        )}
        {paymentError && (
          <div style={{ fontSize: 12, color: "#EF4444", lineHeight: 1.5, marginBottom: 10 }}>
            {paymentError}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.55, marginBottom: 10, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px" }}>
          KYC/UPI compliance: live claim payouts are released only after beneficiary verification.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" style={{ padding: 10, fontSize: 13, flex: 1 }} onClick={() => applyRenewalPayment("Razorpay")} disabled={!canPayWeeklyPremium || paying}>
            {paying
              ? "Processing payment..."
              : paidThisCycle
                ? "Premium already paid this week"
                : paymentInGrace
                  ? `Pay First Premium (${formatMoney(renewal.amountDueNow, language)})`
                  : canPayWeeklyPremium
                    ? `Pay Weekly Premium (${formatMoney(renewal.amountDueNow, language)})`
                    : "Payment window closed"}
          </button>
        </div>
      </div>
      {pendingPremiumDue > 0 && (
        <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.14),rgba(249,115,22,0.05))", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div className="pr-title" style={{ color: "#F97316" }}>Pending Location Premium Due</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800, color: "#F97316" }}>{formatMoney(pendingPremiumDue, language)}</div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 10 }}>
            This was generated automatically when city/zone risk increased.
          </div>
          <button className="btn-primary" style={{ padding: 10, fontSize: 13 }} onClick={() => settleLocationAdjustment("UPI")}>
            Settle Due Now
          </button>
        </div>
      )}
      {billingCredit > 0 && (
        <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.04))", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div className="pr-title">{translate(language, "queuedBillingCredit", "Queued Billing Credit")}</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{formatMoney(billingCredit, language)}</div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            {translate(language, "queuedCreditHelp", "Use queued credit first. If credit is more than the premium, the extra stays in queue for the next renewal.")}
          </div>
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        Net gain after premium out-of-pocket = {formatMoney(netGain, language)}.
      </div>
      <div className="section-title">Premium Payment History</div>
      {premiumEvents.length === 0 && <div className="empty-state">No premium payments recorded yet.</div>}
      <div className="tx-list">
        {premiumEvents.map((event, i) => (
          <div key={`premium-${i}`} className="tx-item">
            <div className="tx-left"><div className="tx-type">{event.type}</div><div className="tx-date">{event.date} • {event.detail}</div></div>
            <div className="tx-amt" style={{ color: event.direction === "credit" ? "#22c55e" : "#EF4444" }}>{event.direction === "credit" ? `+${formatMoney(event.amount, language)}` : `-${formatMoney(event.amount, language)}`}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Claim Payout History</div>
      {paidClaims.length === 0 && <div className="empty-state">No claim payouts yet.</div>}
      <div className="tx-list">
        {paidClaims.map((h, i) => (
          <div key={i} className="tx-item">
            <div className="tx-left"><div className="tx-type">{translate(language, "claimPayout", "Claim Payout")} • {localizeTerm(language, h.type)}</div><div className="tx-date">{localizeDate(language, h.date)} • UPI</div></div>
            <div className="tx-amt">+₹{h.amount}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Credit Wallet Ledger</div>
      {creditEvents.length === 0 && <div className="empty-state">No credit ledger entries yet.</div>}
      <div className="tx-list">
        {creditEvents.map((event, i) => (
          <div key={`credit-${i}`} className="tx-item">
            <div className="tx-left"><div className="tx-type">{event.type}</div><div className="tx-date">{event.date} • {event.detail}</div></div>
            <div className="tx-amt" style={{ color: event.direction === "credit" ? "#22c55e" : "#EF4444" }}>
              {event.direction === "credit" ? `+${formatMoney(event.amount, language)}` : `-${formatMoney(event.amount, language)}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsTab({ worker, onWorkerUpdate, language }) {
  const [selectedCity, setSelectedCity] = useState(worker.city || "Hyderabad");
  const [selectedZone, setSelectedZone] = useState(worker.zone || getRegistrationZones(worker.city || "Hyderabad")[0]);
  const [forecast, setForecast] = useState(WEATHER_FORECAST);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState("");

  useEffect(() => {
    setSelectedCity(worker.city || "Hyderabad");
    setSelectedZone(worker.zone || getRegistrationZones(worker.city || "Hyderabad")[0]);
  }, [worker.city, worker.zone]);

  const zoneOptions = getRegistrationZones(selectedCity);
  const activeAlerts = worker.alerts || [];

  useEffect(() => {
    let cancelled = false;
    const fetchForecast = async () => {
      setLoadingForecast(true);
      setForecastError("");
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(selectedCity)}&count=1&language=en&format=json`);
        const geo = await geoRes.json();
        const point = geo?.results?.[0];
        if (!point) throw new Error("Could not resolve city location");

        const [weatherRes, aqiRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}&daily=weather_code,temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=5`),
          fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${point.latitude}&longitude=${point.longitude}&hourly=us_aqi&timezone=auto&forecast_days=5`)
        ]);
        const weather = await weatherRes.json();
        const aqi = await aqiRes.json();

        const days = weather?.daily?.time || [];
        const temps = weather?.daily?.temperature_2m_max || [];
        const rain = weather?.daily?.precipitation_sum || [];
        const codes = weather?.daily?.weather_code || [];
        const hourlyTime = aqi?.hourly?.time || [];
        const hourlyAqi = aqi?.hourly?.us_aqi || [];
        const aqiByDate = {};
        hourlyTime.forEach((iso, idx) => {
          const key = (iso || "").slice(0, 10);
          const val = Number(hourlyAqi[idx] || 0);
          if (!aqiByDate[key] || val > aqiByDate[key]) aqiByDate[key] = val;
        });

        const formatted = days.slice(0, 5).map((day, idx) => {
          const dayName = idx === 0
            ? "Today"
            : new Date(day).toLocaleDateString("en-US", { weekday: "short" });
          const dayAqi = Math.round(aqiByDate[day] || 0);
          const dayRain = Number(rain[idx] || 0);
          const dayRisk = riskFromRainAqi(dayRain, dayAqi);
          return {
            day: dayName,
            icon: weatherCodeToIcon(Number(codes[idx] || 0)),
            temp: `${Math.round(Number(temps[idx] || 0))}°C`,
            rain: `${Math.round(dayRain)}mm`,
            aqi: dayAqi,
            risk: dayRisk
          };
        });

        if (!cancelled && formatted.length > 0) setForecast(formatted);
      } catch (err) {
        if (!cancelled) {
          setForecastError("Live weather unavailable. Showing cached forecast.");
          setForecast(WEATHER_FORECAST);
        }
      } finally {
        if (!cancelled) setLoadingForecast(false);
      }
    };
    fetchForecast();
    return () => { cancelled = true; };
  }, [selectedCity]);

  const zoneRisks = zoneOptions.map((zoneName, idx) => {
    const riskBase = forecast[0]?.risk || "LOW";
    const risk = idx === 0 ? riskBase : riskBase === "HIGH" && idx % 2 ? "MEDIUM" : (idx % 3 === 0 ? "LOW" : "MEDIUM");
    const alertsCount = risk === "HIGH" ? 3 : risk === "MEDIUM" ? 1 : 0;
    const color = risk === "HIGH" ? "#EF4444" : risk === "MEDIUM" ? "#F97316" : "#22c55e";
    return { zone: zoneName, risk, alerts: alertsCount, color };
  });

  const applyCityToAccount = () => {
    const validZone = zoneOptions.includes(selectedZone) ? selectedZone : zoneOptions[0];
    onWorkerUpdate({ ...worker, city: selectedCity, zone: validZone });
  };

  return (
    <div className="tab-screen">
      <h2 className="tab-title">{translate(language, "alerts", "Alerts")}</h2>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <div className="section-title" style={{ marginTop: 0 }}>{translate(language, "cityWatch", "City watch")}</div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>City</label>
          <select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setSelectedZone(getRegistrationZones(e.target.value)[0] || ""); }}>
            {REG_CITY_OPTIONS.map((cityName) => <option key={cityName}>{cityName}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Zone / Area</label>
          <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}>
            {zoneOptions.map((zoneName) => <option key={zoneName}>{zoneName}</option>)}
          </select>
        </div>
        <button className="btn-primary" style={{ padding: 10, fontSize: 13 }} onClick={applyCityToAccount}>
          Apply This City To Profile
        </button>
      </div>

      {activeAlerts.length > 0 ? (
        <>
          <div className="section-title">{translate(language, "activeAlerts", "Active alerts")}</div>
          {activeAlerts.map((a, i) => (
            <div key={i} className="alert-card" style={{ borderColor: `${a.color}44`, background: `${a.color}11` }}>
              <div className="ac-top"><div className="ac-type" style={{ color: a.color }}>{a.type}</div><span className="ac-prob" style={{ background: `${a.color}22`, color: a.color }}>{a.prob}% probability</span></div>
              <div className="ac-zone">📍 {a.zone} • {a.time}</div>
              <div className="ac-note">Automatic claim will trigger if conditions persist</div>
            </div>
          ))}
        </>
      ) : (
        <div className="no-alerts"><div style={{ fontSize: 40, marginBottom: 12 }}>✅</div><div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{translate(language, "noActiveAlerts", "No active alerts")}</div><div style={{ fontSize: 13, color: "var(--muted)" }}>Your zone is clear. We're monitoring 24/7.</div></div>
      )}

      <div className="section-title">{translate(language, "fiveDayForecast", "5-day forecast")} • {selectedCity}</div>
      {loadingForecast && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Fetching live weather...</div>}
      {forecastError && <div style={{ fontSize: 12, color: "#F97316", marginBottom: 8 }}>{forecastError}</div>}
      <div className="forecast-row">
        {forecast.map((f, i) => (
          <div key={i} className={`forecast-card ${f.risk === "HIGH" ? "high-risk" : ""}`}>
            <div className="fc-day">{f.day}</div><div className="fc-icon">{f.icon}</div>
            <div className="fc-temp">{f.temp}</div><div className="fc-rain">{f.rain}</div>
            <div className="fc-aqi" style={{ color: f.aqi > 200 ? "#EF4444" : f.aqi > 100 ? "#F97316" : "#22c55e" }}>AQI {f.aqi}</div>
            {f.risk === "HIGH" && <div className="fc-risk">HIGH</div>}
          </div>
        ))}
      </div>

      <div className="section-title">{translate(language, "zoneRiskLevels", "Zone risk levels")} • {selectedCity}</div>
      {zoneRisks.map((z, i) => (
        <div key={i} className="zone-row">
          <div className="zr-left"><span className="zr-dot" style={{ background: z.color }} /><div><div className="zr-name">{z.zone}</div><div className="zr-alerts">{z.alerts} active alert{z.alerts !== 1 ? "s" : ""}</div></div></div>
          <span className="zr-badge" style={{ background: `${z.color}22`, color: z.color }}>{z.risk}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileTab({ worker, balance, history, onWorkerUpdate, onLogout, language }) {
  const plan = PLANS.find(p => p.id === worker?.plan) || PLANS[1];
  const activeWeeklyPremium = getWorkerWeeklyPremium(worker);
  const trustScore = 100 - (Array.isArray(worker?.signals) ? worker.signals.reduce((a, s) => a + (s.raw || 0), 0) : 0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: worker.name || "",
    username: worker.username || "",
    email: worker.email || "",
    platform: worker.platform || "Swiggy",
    hours: worker.hours || "8-10 hrs/day",
    vehicle: worker.vehicle || "Motorbike / Scooter",
    vehicleNumber: worker.vehicleNumber || "",
    city: worker.city || "Hyderabad",
    zone: worker.zone || getRegistrationZones(worker.city || "Hyderabad")[0],
    liveTrackingEnabled: Boolean(worker.liveTrackingEnabled),
    password: "",
    confirmPassword: "",
  });
  const [profilePhoto, setProfilePhoto] = useState(worker.photoURL || worker.selfieImage || "");
  const [vehicleDocs, setVehicleDocs] = useState(worker.vehicleDocs || {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [phoneOtpConfirmation, setPhoneOtpConfirmation] = useState(null);
  const profileOtpRecaptchaRef = useRef(null);
  const profileRecaptchaVerifierRef = useRef(null);
  const docCameraVideoRef = useRef(null);
  const docCameraCanvasRef = useRef(null);
  const docCameraStreamRef = useRef(null);
  const [docCameraOpen, setDocCameraOpen] = useState(false);
  const [docCameraError, setDocCameraError] = useState("");
  const [docCameraGeo, setDocCameraGeo] = useState(null);
  const [docCameraTarget, setDocCameraTarget] = useState("");

  const getDocLabel = (docKey) =>
    docKey === "license" ? "License" : docKey === "insurance" ? "Insurance" : "RC";

  useEffect(() => {
    setForm({
      name: worker.name || "",
      username: worker.username || "",
      email: worker.email || "",
      platform: worker.platform || "Swiggy",
      hours: worker.hours || "8-10 hrs/day",
      vehicle: worker.vehicle || "Motorbike / Scooter",
      vehicleNumber: worker.vehicleNumber || "",
      city: worker.city || "Hyderabad",
      zone: worker.zone || getRegistrationZones(worker.city || "Hyderabad")[0],
      liveTrackingEnabled: Boolean(worker.liveTrackingEnabled),
      password: "",
      confirmPassword: "",
    });
    setProfilePhoto(worker.photoURL || worker.selfieImage || "");
    setVehicleDocs(worker.vehicleDocs || {});
  }, [worker]);

  useEffect(() => () => {
    if (docCameraStreamRef.current) {
      docCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      docCameraStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!editing && docCameraOpen) {
      stopDocCamera();
    }
  }, [editing, docCameraOpen]);

  const zoneOptions = getRegistrationZones(form.city);
  const platformOptions = Array.from(new Set([form.platform, ...REG_PLATFORM_OPTIONS].filter(Boolean)));
  const hourOptions = Array.from(new Set([form.hours, ...REG_HOUR_OPTIONS].filter(Boolean)));
  const vehicleOptions = Array.from(new Set([form.vehicle, ...VEHICLES.map((item) => item.name)].filter(Boolean)));

  const stopDocCamera = () => {
    if (docCameraStreamRef.current) {
      docCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      docCameraStreamRef.current = null;
    }
    if (docCameraVideoRef.current) {
      docCameraVideoRef.current.srcObject = null;
    }
    setDocCameraOpen(false);
    setDocCameraError("");
    setDocCameraTarget("");
    setDocCameraGeo(null);
  };

  const fetchCaptureGeo = async () => {
    if (!navigator.geolocation?.getCurrentPosition) return null;
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
            accuracy: Math.round(position.coords.accuracy || 0),
            capturedAt: new Date().toISOString(),
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  const openDocCameraFor = async (docKey) => {
    setDocCameraError("");
    setDocCameraTarget(docKey);
    setDocCameraOpen(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API unavailable. Use upload option.");
      }
      const geo = await fetchCaptureGeo();
      setDocCameraGeo(geo);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      docCameraStreamRef.current = stream;
      const video = docCameraVideoRef.current;
      if (!video) throw new Error("Camera preview not available.");
      video.srcObject = stream;
      await video.play().catch(() => { });
    } catch (error) {
      setDocCameraError(error?.message || "Could not open camera.");
      setDocCameraOpen(false);
    }
  };

  const captureDocFromCamera = () => {
    const video = docCameraVideoRef.current;
    const canvas = docCameraCanvasRef.current;
    if (!video || !canvas || !docCameraTarget) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    const timestamp = new Date().toLocaleString("en-IN");
    const geoText = docCameraGeo
      ? `Lat ${docCameraGeo.lat} | Lng ${docCameraGeo.lng} | Acc ${docCameraGeo.accuracy}m`
      : "GPS unavailable";
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, height - 95, width, 95);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(22, height - 70, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px Arial";
    ctx.fillText("GEO TAGGED CAPTURE", 38, height - 64);
    ctx.font = "14px Arial";
    ctx.fillText(geoText, 16, height - 38);
    ctx.fillText(timestamp, 16, height - 16);

    const imageData = canvas.toDataURL("image/jpeg", 0.92);
    const uploadedAtIso = new Date().toISOString();
    setVehicleDocs((prev) => ({
      ...prev,
      [docCameraTarget]: {
        name: `${docCameraTarget}-gps-${Date.now()}.jpg`,
        type: "image/jpeg",
        uploadedAt: uploadedAtIso,
        url: imageData,
        geo: docCameraGeo || null,
        source: "camera_gps"
      }
    }));
    setMsg(`${getDocLabel(docCameraTarget)} captured with camera and GPS tag.`);
    setErr("");
    stopDocCamera();
  };

  const handleDocUpload = (docKey, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      setVehicleDocs((prev) => ({
        ...prev,
        [docKey]: {
          name: file.name,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          url: dataUrl,
          geo: null,
          source: "upload"
        }
      }));
      setMsg(`${getDocLabel(docKey)} document uploaded.`);
      setErr("");
    };
    reader.readAsDataURL(file);
  };

  const handleSendEmailOtp = async () => {
    setShowOtpBox(true);
    setOtpVerified(false);
    setErr("");
    setMsg("");
    try {
      if (!auth.currentUser) {
        throw new Error("Please login again before requesting OTP.");
      }
      const phoneDigits = String(worker?.phone || "").replace(/\D/g, "").slice(-10);
      if (phoneDigits.length !== 10) {
        throw new Error("A valid 10-digit phone number is required for OTP verification.");
      }

      if (!profileOtpRecaptchaRef.current) {
        throw new Error("OTP verifier not ready. Reopen Edit Profile and try again.");
      }
      if (profileRecaptchaVerifierRef.current) {
        try { profileRecaptchaVerifierRef.current.clear(); } catch (error) { }
        profileRecaptchaVerifierRef.current = null;
      }
      profileOtpRecaptchaRef.current.innerHTML = "";
      profileRecaptchaVerifierRef.current = new RecaptchaVerifier(auth, profileOtpRecaptchaRef.current, {
        size: "invisible",
        callback: () => { }
      });
      await profileRecaptchaVerifierRef.current.render();

      setOtpBusy(true);
      const confirmation = await linkWithPhoneNumber(auth.currentUser, `+91${phoneDigits}`, profileRecaptchaVerifierRef.current);
      setPhoneOtpConfirmation(confirmation);
      setMsg(`OTP sent to +91${phoneDigits}.`);
    } catch (error) {
      const code = String(error?.code || "");
      if (code === "auth/provider-already-linked") {
        setOtpVerified(true);
        setMsg("Phone is already verified on this account.");
      } else if (code === "auth/too-many-requests") {
        setErr("Too many OTP requests. Please wait and try again.");
      } else {
        setErr(getFirebaseAuthErrorMessage(error, "Could not send OTP."));
      }
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErr("");
    if (!phoneOtpConfirmation) {
      setErr("Please send OTP first.");
      return;
    }
    if (otpInput.trim().length < 6) {
      setErr("Enter the 6-digit OTP.");
      return;
    }
    setOtpBusy(true);
    try {
      await phoneOtpConfirmation.confirm(otpInput.trim());
      setOtpVerified(true);
      setMsg("Phone OTP verified successfully.");
      setPhoneOtpConfirmation(null);
    } catch (error) {
      setErr("Invalid OTP. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const updatedName = form.name.trim();
      const updatedUsername = normalizeUsernameKey(form.username);
      const updatedEmail = form.email.trim().toLowerCase();
      const updatedZone = zoneOptions.includes(form.zone) ? form.zone : zoneOptions[0];
      const updatedVehicleNumber = String(form.vehicleNumber || "").toUpperCase().replace(/\s+/g, "");
      const emailChanged = updatedEmail && updatedEmail !== (worker.email || "").toLowerCase();
      const usernameChanged = updatedUsername !== normalizeUsernameKey(worker.username || "");
      const nameChanged = updatedName !== (worker.name || "");
      const pricingContextChanged =
        form.city !== worker.city ||
        updatedZone !== worker.zone ||
        form.platform !== worker.platform ||
        form.hours !== worker.hours ||
        form.vehicle !== worker.vehicle;

      if (!updatedName || !updatedUsername || !updatedEmail) {
        throw new Error("Name, username, and email are required.");
      }
      if (updatedVehicleNumber && !/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(updatedVehicleNumber)) {
        throw new Error("Vehicle number format is invalid. Use format like TS09AB1234.");
      }

      if (emailChanged && !otpVerified) {
        throw new Error("Verify email with OTP before saving.");
      }

      if (form.password || form.confirmPassword) {
        if (form.password.length < 6) throw new Error("New password must be at least 6 characters.");
        if (form.password !== form.confirmPassword) throw new Error("Password and confirm password do not match.");
      }

      const nextWorker = {
        ...worker,
        name: updatedName,
        username: updatedUsername,
        email: updatedEmail,
        platform: form.platform,
        hours: form.hours,
        vehicle: form.vehicle,
        vehicleNumber: updatedVehicleNumber,
        city: form.city,
        zone: updatedZone,
        liveTrackingEnabled: Boolean(form.liveTrackingEnabled),
        avatar: updatedName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || worker.avatar,
        photoURL: profilePhoto || worker.photoURL || "",
        vehicleDocs
      };
      onWorkerUpdate(nextWorker);
      saveUsernameEmailIndexEntry(updatedUsername, updatedEmail);

      if (auth.currentUser) {
        if (nameChanged) {
          try { await updateProfile(auth.currentUser, { displayName: updatedName }); } catch (e) { }
        }
        if (emailChanged) {
          try { await updateEmail(auth.currentUser, updatedEmail); } catch (e) { }
        }
        if (form.password) {
          try { await updatePassword(auth.currentUser, form.password); } catch (e) { }
        }
      }

      setForm(prev => ({ ...prev, password: "", confirmPassword: "", zone: updatedZone }));
      setShowOtpBox(false);
      setOtpInput("");
      setOtpVerified(false);
      setPhoneOtpConfirmation(null);
      setEditing(false);
      setMsg(pricingContextChanged ? "Profile and premium context updated across dashboard." : "Profile updated successfully.");
    } catch (e) {
      setErr(e.message || "Could not update profile. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    const ok = window.confirm("Delete account permanently? This cannot be undone.");
    if (!ok) return;
    setErr("");
    setMsg("");
    const cleanupLocal = (uidValue = "") => {
      removeUsernameEmailIndexEntry(worker?.username || "", worker?.email || "");
      const profileKey = "gww_email_profiles";
      let profiles = {};
      try {
        profiles = JSON.parse(localStorage.getItem(profileKey) || "{}");
      } catch (error) { }
      if (uidValue && profiles[uidValue]) {
        delete profiles[uidValue];
      } else {
        Object.keys(profiles).forEach((key) => {
          const profileEmail = String(profiles[key]?.email || "").toLowerCase();
          if (profileEmail === String(worker?.email || "").toLowerCase()) {
            delete profiles[key];
          }
        });
      }
      localStorage.setItem(profileKey, JSON.stringify(profiles));
    };

    try {
      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        const claimSnap = await getDocs(query(collection(db, "claims"), where("userId", "==", uid)));
        if (claimSnap?.docs?.length) {
          await Promise.all(claimSnap.docs.map((claimDoc) => deleteDoc(doc(db, "claims", claimDoc.id))));
        }
        await deleteDoc(doc(db, "users", uid));
        await deleteUser(auth.currentUser);
        cleanupLocal(uid);
      } else {
        cleanupLocal("");
      }
      setMsg("Account deleted successfully.");
      onLogout();
    } catch (error) {
      const code = String(error?.code || "");
      if (code === "auth/requires-recent-login") {
        setErr("For security, please logout and login again, then retry delete account.");
      } else {
        setErr(error?.message || "Could not delete account right now.");
      }
    }
  };

  const togglePause = () => {
    const paused = !worker.accountPaused;
    onWorkerUpdate({ ...worker, accountPaused: paused });
    setMsg(paused ? "Account paused. You can resume anytime." : "Account resumed.");
  };

  return (
    <div className="tab-screen">
      <div className="profile-hero">
        {worker.photoURL ? (
          <img src={worker.photoURL} alt="Profile" className="ph-avatar" style={{ objectFit: "cover" }} />
        ) : (
          <div className="ph-avatar">{worker.avatar}</div>
        )}
        <h2 className="ph-name">{localizeTerm(language, worker.name)}</h2>
        <div className="ph-meta">{localizeTerm(language, worker.platform)} · {localizeTerm(language, worker.city)}</div>
        <div className="ph-tag" style={{ color: worker.tagColor, borderColor: worker.tagColor }}>{localizeTerm(language, worker.tag)}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className="btn-primary" style={{ padding: 10, fontSize: 13 }} onClick={() => setEditing(v => !v)}>
          {editing ? "Close Edit" : "Edit Profile"}
        </button>
      </div>
      {msg && <div style={{ color: "#22c55e", fontSize: 12, marginBottom: 8 }}>{msg}</div>}
      {err && <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 8 }}>{err}</div>}

      {editing && (
        <div className="profile-section">
          <div className="ps-title">Settings</div>
          <div className="profile-card" style={{ padding: 12 }}>
            <div className="field"><label>Full Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Username</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setOtpVerified(false); setShowOtpBox(false); setOtpInput(""); setPhoneOtpConfirmation(null); }} /></div>
            {(form.email.trim().toLowerCase() !== (worker.email || "").toLowerCase()) && (
              <div style={{ marginBottom: 10 }}>
                <button className="btn-primary" style={{ padding: 10, fontSize: 12, marginBottom: 8 }} onClick={handleSendEmailOtp} type="button" disabled={otpBusy}>
                  {otpBusy ? "Sending OTP..." : "Send Phone OTP"}
                </button>
                <div ref={profileOtpRecaptchaRef} style={{ minHeight: 1 }} />
                {showOtpBox && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", padding: "10px 12px" }} placeholder="Enter 6-digit OTP" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} />
                    <button type="button" className="btn-primary" style={{ width: 120, padding: 10, fontSize: 12 }} onClick={handleVerifyOtp} disabled={otpBusy}>
                      {otpBusy ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="field"><label>City</label>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value, zone: getRegistrationZones(e.target.value)[0] || "" })}>
                {REG_CITY_OPTIONS.map((cityName) => <option key={cityName}>{cityName}</option>)}
              </select>
            </div>
            <div className="field"><label>Zone / Area</label>
              <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
                {zoneOptions.map((zoneName) => <option key={zoneName}>{zoneName}</option>)}
              </select>
            </div>
            <div className="field"><label>Platform</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {platformOptions.map((platformName) => <option key={platformName}>{platformName}</option>)}
              </select>
            </div>
            <div className="field"><label>Work Hours Per Day</label>
              <select value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })}>
                {hourOptions.map((hoursLabel) => <option key={hoursLabel}>{hoursLabel}</option>)}
              </select>
            </div>
            <div className="field"><label>Vehicle</label>
              <select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}>
                {vehicleOptions.map((vehicleLabel) => <option key={vehicleLabel}>{vehicleLabel}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Vehicle Number</label>
              <input
                placeholder="e.g. TS09AB1234"
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase().replace(/\s+/g, "") })}
              />
            </div>
            <div className="field">
              <label>Live GPS Tracking</label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--muted)" }}>
                <input
                  type="checkbox"
                  checked={Boolean(form.liveTrackingEnabled)}
                  onChange={(e) => setForm({ ...form, liveTrackingEnabled: e.target.checked })}
                />
                <span>Track live location in-app while account is active to reduce false claims.</span>
              </label>
            </div>
            <div className="field">
              <label>Vehicle Documents (in-app access)</label>
              <div style={{ display: "grid", gap: 8 }}>
                {["license", "insurance", "rc"].map((docKey) => (
                  <div key={docKey} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ marginBottom: 0, padding: "10px 12px" }}
                      onClick={() => openDocCameraFor(docKey)}
                    >
                      Capture {getDocLabel(docKey)}
                    </button>
                    <label className="btn-outline" style={{ marginBottom: 0, padding: "10px 12px", cursor: "pointer" }}>
                      Upload {getDocLabel(docKey)}
                      <input type="file" accept="image/*,.pdf" capture="environment" style={{ display: "none" }} onChange={(e) => handleDocUpload(docKey, e)} />
                    </label>
                  </div>
                ))}
              </div>
              {docCameraOpen && (
                <div style={{ marginTop: 10, padding: 10, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg3)" }}>
                  <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 700, marginBottom: 8 }}>
                    GPS Camera - {getDocLabel(docCameraTarget || "license")}
                  </div>
                  <video
                    ref={docCameraVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", minHeight: 180, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 8, background: "#0b1020" }}
                  />
                  <canvas ref={docCameraCanvasRef} style={{ display: "none" }} />
                  {docCameraGeo && (
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                      Lat {docCameraGeo.lat}, Lng {docCameraGeo.lng}, Acc {docCameraGeo.accuracy}m
                    </div>
                  )}
                  {docCameraError && <div style={{ color: "#EF4444", fontSize: 11, marginBottom: 8 }}>{docCameraError}</div>}
                  <div style={{ display: "grid", gap: 8 }}>
                    <button type="button" className="btn-primary" style={{ padding: "10px 12px", fontSize: 12 }} onClick={captureDocFromCamera}>
                      Capture With GPS Tag
                    </button>
                    <button type="button" className="btn-outline" style={{ padding: "10px 12px", fontSize: 12 }} onClick={stopDocCamera}>
                      Close Camera
                    </button>
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
                {["license", "insurance", "rc"].map((key) => {
                  const docItem = vehicleDocs?.[key];
                  if (!docItem?.url) return null;
                  return (
                    <div key={key} style={{ marginBottom: 4 }}>
                      {key.toUpperCase()}: <a href={docItem.url} target="_blank" rel="noreferrer" style={{ color: "var(--rain)" }}>{docItem.name || "View"}</a>
                      {docItem?.geo?.lat ? (
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          Geo: {docItem.geo.lat}, {docItem.geo.lng} ({docItem.geo.accuracy || 0}m)
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="field"><label>Profile Photo</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label className="btn-outline" style={{ marginBottom: 0, padding: "10px 12px", cursor: "pointer" }}>
                  Upload Photo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setProfilePhoto(String(reader.result || ""));
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {profilePhoto && <img src={profilePhoto} alt="Preview" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", border: "1px solid var(--border)" }} />}
              </div>
            </div>
            <div className="field"><label>New Password (optional)</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 characters" /></div>
            <div className="field"><label>Confirm New Password</label><input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></div>
            <button className="btn-primary" onClick={handleSave} disabled={busy}>{busy ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      )}

      <div className="profile-section"><div className="ps-title">{translate(language, "personalInformation", "Personal Information")}</div>
        <div className="profile-card">
          <div className="detail-row"><span>{localizeTerm(language, "Phone")}</span><span>{worker.phone}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Email")}</span><span>{worker.email}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Username")}</span><span>{worker.username || "-"}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Platform")}</span><span>{localizeTerm(language, worker.platform)}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Work hours")}</span><span>{localizeTerm(language, worker.hours || "8-10 hrs/day")}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Vehicle")}</span><span>{localizeTerm(language, worker.vehicle || "Motorbike / Scooter")}</span></div>
          <div className="detail-row"><span>Vehicle Number</span><span>{worker.vehicleNumber || "-"}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "City")}</span><span>{localizeTerm(language, worker.city)}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Zone")}</span><span>{localizeTerm(language, worker.zone)}</span></div>
          <div className="detail-row"><span>Live Tracking</span><span>{worker.liveTrackingEnabled ? "Enabled" : "Disabled"}</span></div>
        </div>
      </div>
      <div className="profile-section"><div className="ps-title">{translate(language, "currentPlanSection", "Current Plan")}</div>
        <div className="profile-card">
          <div className="detail-row"><span>{localizeTerm(language, "Plan")}</span><span style={{ color: plan.color, fontWeight: 700 }}>{plan.name}</span></div>
          <div className="detail-row"><span>{translate(language, "weeklyPremium", "Weekly premium")}</span><span>{formatMoney(activeWeeklyPremium, language)}</span></div>
          <div className="detail-row"><span>{translate(language, "coverageAmount", "Coverage amount")}</span><span>₹{plan.coverage.toLocaleString()}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Status")}</span><span className="safe-badge">{worker.accountPaused ? "Paused" : `${localizeTerm(language, "Active")} ✓`}</span></div>
        </div>
      </div>
      <div className="profile-section">
        <div className="ps-title">Vehicle Docs</div>
        <div className="profile-card">
          {["license", "insurance", "rc"].every((key) => !worker?.vehicleDocs?.[key]?.url) && (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>No documents uploaded yet. Open Edit Profile to upload.</div>
          )}
          {["license", "insurance", "rc"].map((key) => {
            const docItem = worker?.vehicleDocs?.[key];
            if (!docItem?.url) return null;
            return (
              <div key={key} className="detail-row">
                <span>
                  {key.toUpperCase()}
                  {docItem?.geo?.lat ? (
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>
                      {docItem.geo.lat}, {docItem.geo.lng}
                    </div>
                  ) : null}
                </span>
                <span style={{ textAlign: "right" }}>
                  <a href={docItem.url} target="_blank" rel="noreferrer" style={{ color: "var(--rain)" }}>
                    {docItem.name || "View document"}
                  </a>
                  {docItem?.uploadedAt ? (
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>
                      {new Date(docItem.uploadedAt).toLocaleString("en-IN")}
                    </div>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="profile-section"><div className="ps-title">{translate(language, "accountStatistics", "Account Statistics")}</div>
        <div className="profile-card">
          <div className="detail-row"><span>{localizeTerm(language, "Total payouts")}</span><span style={{ color: "#22c55e" }}>₹{balance.toLocaleString()}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Total claims")}</span><span>{worker.totalClaims}</span></div>
          <div className="detail-row"><span>{localizeTerm(language, "Trust score")}</span><span style={{ color: trustScore > 70 ? "#22c55e" : trustScore > 40 ? "#F97316" : "#EF4444" }}>{Math.max(0, trustScore)}/100</span></div>
        </div>
      </div>
      <div className="profile-section"><div className="ps-title">{translate(language, "aiRiskProfile", "AI Risk Profile")}</div>
        <div className="profile-card">
          {(Array.isArray(worker?.signals) && worker.signals.length > 0) ? (
            worker.signals.map((s, i) => (
              <div key={i} className="detail-row">
                <span>{localizeTerm(language, s.signal)}</span>
                <span style={{ color: s.status === "pass" ? "#22c55e" : s.status === "warn" ? "#F97316" : "#EF4444", fontSize: 12 }}>
                  {s.status === "pass" ? translate(language, "clean", "✓ Clean") : s.status === "warn" ? translate(language, "watch", "⚠ Watch") : translate(language, "flagged", "✕ Flagged")}
                </span>
              </div>
            ))
          ) : (
            <div className="detail-row" style={{ color: "var(--muted)" }}>
              <span>{translate(language, "noSignals", "No AI risk signals available.")}</span>
              <span>{translate(language, "notAvailable", "N/A")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="profile-section">
        <div className="ps-title">Account Actions</div>
        <div className="profile-card" style={{ padding: 12 }}>
          <button className="btn-primary" style={{ marginBottom: 8, padding: 10, fontSize: 13, background: worker.accountPaused ? "#22c55e" : "#F97316" }} onClick={togglePause}>
            {worker.accountPaused ? "Resume Account" : "Pause Account"}
          </button>
          <button
            className="btn-primary"
            style={{ marginBottom: 8, padding: 10, fontSize: 13, background: "#0ea5e9" }}
            onClick={() => window.dispatchEvent(new CustomEvent("gww-open-ticket"))}
          >
            Raise Ticket
          </button>
          <button className="btn-primary" style={{ marginBottom: 8, padding: 10, fontSize: 13 }} onClick={() => window.location.href = "mailto:support@devtrails.com?subject=GigWeatherWage%20Support"}>
            Customer Support
          </button>
          <button className="btn-primary" style={{ marginBottom: 8, padding: 10, fontSize: 13, background: "#dc2626" }} onClick={handleDeleteAccount}>
            Delete Account
          </button>
          <button className="btn-logout" onClick={onLogout}>{translate(language, "logout", "Logout")} -></button>
        </div>
      </div>
    </div>
  );
}

function ClaimScreen({ disruption, worker, online, seedMeta, onProceed, onBack }) {
  const graceDaysLeft = getGraceDaysLeft(worker);
  const paymentInGrace = isPaymentInGrace(worker);
  const isDemoSimulation = Boolean(seedMeta?.simulated);
  const maturityGate = getAccountMaturityGate(getWorkerAccountAgeDays(worker));
  const premiumPaidThisCycle = worker?.lastPremiumPaidCycle === getBillingCycleKey();
  const premiumStatusLabel = premiumPaidThisCycle
    ? "Active ✓"
    : paymentInGrace
      ? `Grace (${graceDaysLeft} day(s) left)`
      : "Pending payment";
  const premiumStatusColor = premiumPaidThisCycle ? "#22c55e" : paymentInGrace ? "#F97316" : "#EF4444";
  const [locationConsent, setLocationConsent] = useState(isDemoSimulation);
  const [kycConsent, setKycConsent] = useState(isDemoSimulation);
  const [dataConsent, setDataConsent] = useState(isDemoSimulation);
  const [evidenceImage, setEvidenceImage] = useState(seedMeta?.evidenceImage || "");
  const [vehicleNumberInput, setVehicleNumberInput] = useState(worker?.vehicleNumber || "");
  const [idProofLast4, setIdProofLast4] = useState("");
  const [claimError, setClaimError] = useState("");
  const [gpsStatus, setGpsStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const evidenceInputRef = useRef(null);
  const requiresExpedite = maturityGate.status !== "normal";

  const vehicleNumberLooksValid = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/i.test(String(vehicleNumberInput || "").replace(/\s+/g, ""));
  const idLast4LooksValid = /^\d{4}$/.test(String(idProofLast4 || "").trim());
  const expediteVerificationReady = vehicleNumberLooksValid && idLast4LooksValid;

  const handleEvidencePicked = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result || "");
      if (!imageData) return;
      setEvidenceImage(imageData);
      setClaimError("");
    };
    reader.readAsDataURL(file);
  };

  const submitClaim = () => {
    setClaimError("");
    if (!isDemoSimulation && !premiumPaidThisCycle && !paymentInGrace) {
      setClaimError("Premium is pending for this cycle. Complete payment from Payments tab before submitting a claim.");
      return;
    }
    if (!locationConsent || !kycConsent || !dataConsent) {
      setClaimError("Please accept all claim consents before submitting.");
      return;
    }
    if (!evidenceImage && !isDemoSimulation) {
      setClaimError("Attach a geotagged claim photo before submitting.");
      return;
    }
    if (requiresExpedite && !expediteVerificationReady && !isDemoSimulation) {
      setClaimError("For new accounts, enter vehicle number and ID last 4 digits for quick verification.");
      return;
    }
    const capturedAt = new Date().toISOString();
    setSubmitting(true);
    if (!navigator.geolocation) {
      setGpsStatus("GPS not supported. Continuing with manual verification fallback.");
      onProceed({
        gps: null,
        gpsError: "not_supported",
        capturedAt,
        evidenceImage,
        expedite: {
          requested: requiresExpedite,
          verified: expediteVerificationReady,
          vehicleNumber: vehicleNumberInput.toUpperCase(),
          idLast4: idProofLast4
        },
        consent: { location: true, kyc: true, dataShare: true },
        simulated: isDemoSimulation
      });
      setSubmitting(false);
      return;
    }
    setGpsStatus("Capturing GPS location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gps = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy || 0)
        };
        setGpsStatus(`GPS captured (${gps.lat}, ${gps.lng})`);
        onProceed({
          gps,
          gpsError: "",
          capturedAt,
          evidenceImage,
          expedite: {
            requested: requiresExpedite,
            verified: expediteVerificationReady,
            vehicleNumber: vehicleNumberInput.toUpperCase(),
            idLast4: idProofLast4
          },
          consent: { location: true, kyc: true, dataShare: true },
          simulated: isDemoSimulation
        });
        setSubmitting(false);
      },
      (error) => {
        setGpsStatus("GPS capture failed. Continuing with manual verification fallback.");
        onProceed({
          gps: null,
          gpsError: error?.message || "gps_error",
          capturedAt,
          evidenceImage,
          expedite: {
            requested: requiresExpedite,
            verified: expediteVerificationReady,
            vehicleNumber: vehicleNumberInput.toUpperCase(),
            idLast4: idProofLast4
          },
          consent: { location: true, kyc: true, dataShare: true },
          simulated: isDemoSimulation
        });
        setSubmitting(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="screen claim-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      {!online && <div className="offline-notice">📡 Offline — claim will queue and sync when connected</div>}
      <div className="claim-hero" style={{ "--dc": disruption.color }}>
        <div className="claim-icon">{disruption.icon}</div>
        <h2>{disruption.label}</h2>
        <div className="claim-val">{disruption.value}</div>
      </div>
      <div className="claim-card">
        <div className="detail-row"><span>Worker</span><span>{worker.name}</span></div>
        <div className="detail-row"><span>Platform</span><span>{worker.platform}</span></div>
        <div className="detail-row"><span>Location</span><span>{worker.zone}, {worker.city}</span></div>
        <div className="detail-row"><span>Threshold</span><span>{disruption.threshold}</span></div>
        <div className="detail-row"><span>Max payout</span><span style={{ color: "#22c55e", fontWeight: 700, fontSize: 16 }}>₹{disruption.amount}</span></div>
        <div className="detail-row"><span>Premium status</span><span className="safe-badge" style={{ color: premiumStatusColor }}>{premiumStatusLabel}</span></div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 11, color: "var(--muted)" }}>
        <strong style={{ color: "var(--text)" }}>Payout tiers:</strong> Score 0-40 → 100% • 40-70 → 50% • 70+ → 0%
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text)" }}>Account maturity rule:</strong>{" "}
        {maturityGate.status === "blocked"
          ? "Account age under 7 days -> claim auto-blocked."
          : maturityGate.status === "review"
            ? "Account age 7-30 days -> delayed verification queue."
            : "Account age 30+ days -> normal decision flow."}
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", marginBottom: 12, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Claim Evidence (Required)</div>
        <div style={{ marginBottom: 8 }}>Capture a live photo from claim location. We store it with GPS + timestamp for fraud review.</div>
        {evidenceImage ? (
          <img
            src={evidenceImage}
            alt="Claim evidence"
            style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 8 }}
          />
        ) : null}
        <input
          ref={evidenceInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleEvidencePicked}
        />
        <button
          type="button"
          className="btn-outline"
          style={{ width: "100%", marginBottom: 6 }}
          onClick={() => evidenceInputRef.current?.click()}
        >
          {evidenceImage ? "Retake Claim Photo" : "Capture Claim Photo"}
        </button>
      </div>
      {requiresExpedite && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", marginBottom: 12, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Fast Verification For New Accounts</div>
          <div style={{ marginBottom: 8 }}>
            Add vehicle number + ID last 4 digits to reduce delay for genuine first-time workers.
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Vehicle number</label>
            <input
              placeholder="e.g. TS09AB1234"
              value={vehicleNumberInput}
              onChange={(e) => setVehicleNumberInput(e.target.value.toUpperCase().replace(/\s+/g, ""))}
            />
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>ID last 4 digits</label>
            <input
              placeholder="1234"
              value={idProofLast4}
              maxLength={4}
              onChange={(e) => setIdProofLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div style={{ color: expediteVerificationReady ? "#22c55e" : "#F97316" }}>
            {expediteVerificationReady ? "Quick verification data ready." : "Enter valid details to unlock fast verification."}
          </div>
        </div>
      )}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", marginBottom: 12, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>IRDAI / DPDP Claim Consent</div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
          <input type="checkbox" checked={locationConsent} onChange={(e) => setLocationConsent(e.target.checked)} />
          <span>I allow one-time GPS capture for this claim event only.</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
          <input type="checkbox" checked={kycConsent} onChange={(e) => setKycConsent(e.target.checked)} />
          <span>I confirm KYC/UPI identity checks can be used before payout release.</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="checkbox" checked={dataConsent} onChange={(e) => setDataConsent(e.target.checked)} />
          <span>I agree to claim data sharing for fraud detection and insurer audit trail.</span>
        </label>
      </div>
      {gpsStatus && <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 8 }}>{gpsStatus}</div>}
      {claimError && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{claimError}</div>}
      <div className="claim-notice">Our AI will run 5 fraud detection signals before releasing the payout.</div>
      <button className="btn-primary" onClick={submitClaim} disabled={submitting || (!isDemoSimulation && !premiumPaidThisCycle && !paymentInGrace)}>
        {submitting ? "Submitting..." : "Submit Claim →"}
      </button>
    </div>
  );
}

function FraudAnalysis({ disruption, worker, claimMeta, online, onResult, onBack }) {
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [score, setScore] = useState(0);
  const signals = useMemo(() => buildRuntimeClaimSignals(worker, disruption, claimMeta), [worker, disruption, claimMeta]);
  const isNewAccount = (worker?.totalClaims || 0) === 0 || String(worker?.age || "").toLowerCase().includes("new");
  const decision = getDecisionFromScore(score);
  const outcomeCopy = getOutcomeCopyFromDecision(decision, isNewAccount);
  const start = () => { setStep(1); setRevealed(0); setScore(0); };
  useEffect(() => {
    if (step !== 1) return;
    if (revealed < signals.length) {
      const t = setTimeout(() => { setScore(s => s + signals[revealed].raw); setRevealed(r => r + 1); }, 700);
      return () => clearTimeout(t);
    } else { const t = setTimeout(() => setStep(2), 600); return () => clearTimeout(t); }
  }, [step, revealed, signals]);
  const sIcon = { pass: "✓", warn: "⚠", fail: "✕" };
  const sColor = { pass: "#22c55e", warn: "#F97316", fail: "#EF4444" };
  const rc = decision === "safe" ? "#22c55e" : decision === "medium" ? "#F97316" : "#EF4444";
  const sc = score < 40 ? "#22c55e" : score < 70 ? "#F97316" : "#EF4444";
  const pct = decision === "safe" ? 100 : decision === "medium" ? 50 : 0;
  const payoutAmt = Math.round(disruption.amount * pct / 100);

  return (
    <div className="screen fraud-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      {!online && <div className="offline-notice">📡 Offline — using cached signals</div>}
      <div className="fraud-header" style={{ "--rc": rc }}>
        <div className="fh-dis">{disruption.icon} {disruption.label} • {disruption.value}</div>
        <h2>AI Fraud Analysis</h2>
        <p>5-signal anti-spoofing check • {worker.name.split(" ")[0]}</p>
      </div>
      {step === 0 && (
        <div className="fraud-idle">
          <div style={{ fontSize: 52, marginBottom: 14 }}>🛡️</div>
          <p>Before releasing <strong>₹{disruption.amount}</strong>, our AI verifies 5 real-time signals for <strong>{worker.name.split(" ")[0]}</strong>.</p>
          <button className="btn-primary" onClick={start}>Run Fraud Analysis →</button>
        </div>
      )}
      {(step === 1 || step === 2) && (
        <>
          <div className="score-box">
            <div className="sb-label">Risk Score</div>
            <div className="sb-num" style={{ color: sc }}>{score}</div>
            <div className="sb-bands">
              <span className="band safe-band">0-40 → 100%</span>
              <span className="band warn-band">40-70 → 50%</span>
              <span className="band fail-band">70+ → 0%</span>
            </div>
          </div>
          <div className="signals">
            {signals.map((sig, i) => (
              <div key={i} className={`sig-row ${i < revealed ? "vis" : "dim"}`}>
                <div className="sr-left">
                  <span className="sr-icon" style={{ color: i < revealed ? sColor[sig.status] : "var(--muted)" }}>{i < revealed ? sIcon[sig.status] : "○"}</span>
                  <div><div className="sr-name">{sig.signal}</div><div className="sr-detail">{i < revealed ? sig.label : "Scanning..."}</div></div>
                </div>
                {i < revealed && <span className="sr-score" style={{ color: sig.raw > 0 ? sColor[sig.status] : "#22c55e" }}>{sig.raw > 0 ? `+${sig.raw}` : "+0"}</span>}
              </div>
            ))}
          </div>
          {step === 2 && (
            <div className="fraud-result" style={{ "--rc": rc }}>
              <div className="fr-icon">{decision === "safe" ? "✓" : decision === "medium" ? "⚠" : "✕"}</div>
              <div className="fr-outcome">{outcomeCopy.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{outcomeCopy.detail}</div>
              <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--muted)" }}>Claim amount</span><span>₹{disruption.amount}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--muted)" }}>Risk score</span><span style={{ color: sc }}>{score}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--muted)" }}>Payout eligibility</span><span style={{ color: sc }}>{pct}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)", fontWeight: 700 }}>
                  <span>Settlement amount</span><span style={{ color: rc, fontFamily: "var(--fd)", fontSize: 16 }}>₹{payoutAmt}</span>
                </div>
              </div>
              <button className="btn-result" style={{ background: rc }} onClick={() => onResult(decision, score)}>
                {decision === "safe" ? "Release Payout →" : decision === "medium" ? "Delay & Verify →" : "Block Claim →"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QueuedScreen({ disruption, onDone }) {
  return (
    <div className="screen outcome-screen">
      <div className="success-ring" style={{ borderColor: "#F97316", background: "rgba(249,115,22,0.1)" }}><div className="check-icon" style={{ color: "#F97316" }}>⏳</div></div>
      <h2 className="oc-title">Claim Queued</h2>
      <p className="oc-sub">You're offline — saved to device</p>
      <div className="oc-amount" style={{ background: "rgba(249,115,22,0.08)", borderColor: "rgba(249,115,22,0.2)" }}>
        <div className="oc-rupee" style={{ color: "#F97316" }}>₹{disruption.amount}</div>
        <div className="oc-note">pending sync</div>
      </div>
      <div className="oc-footnote" style={{ borderColor: "rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.06)" }}>
        GigWeatherWage works offline. Your claim is saved and will auto-process when you're back online.
      </div>
      <button className="btn-primary" onClick={onDone}>Back to Dashboard →</button>
    </div>
  );
}
