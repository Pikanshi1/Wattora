# 🌱 Wattora — Smart Energy Optimization

### Smarter Energy Decisions for a More Sustainable Future

Wattora is an ML-powered household energy optimization platform developed for **Environment Hacks**. It combines solar generation forecasting, household energy-demand estimation, and appliance-level analysis to help users understand their energy consumption and make more informed decisions about solar energy utilization.

By bringing solar potential, household demand, and appliance usage together, Wattora makes energy insights more accessible and encourages smarter, more sustainable electricity consumption.

---

## 🌍 The Problem

Households often lack accessible insights into their potential solar generation, electricity demand, and appliance usage. Without understanding how these factors relate, making informed energy decisions and improving energy efficiency can be challenging.

## 💡 Our Solution

Wattora brings solar generation, household demand, and appliance information together in one platform.

- ☀️ **Solar Insights:** Estimate solar generation using site capacity and a trained machine learning model.
- ⚡ **Energy Demand:** Estimate household electricity demand using configured usage and enabled appliances.
- 🧠 **Smart Optimization:** Compare estimated solar output with appliance load to explore more efficient energy-use decisions.
- 📊 **Personalized Dashboard:** View energy insights for a selected household site.
- 🏠 **Site & Device Management:** Configure household sites, appliances, and energy preferences.

## ⚙️ How It Works

1. **Configure a Site:** Users provide site details, including solar capacity and household energy settings.
2. **Add Appliances:** Users configure household devices and indicate which appliances are enabled.
3. **Generate Estimates:** Trained ML models estimate solar generation and household energy demand.
4. **Analyze Energy Usage:** Wattora compares estimated solar output with configured appliance load.
5. **Explore Optimization:** The platform presents energy insights based on site configuration and saved preferences, helping users make informed energy decisions.

## 🏗️ System Architecture

```text
                     User
                       |
                       v
          React + TypeScript + Vite
                  (Frontend)
                       |
                       v
               FastAPI REST API
                       |
             +---------+---------+
             |                   |
             v                   v
       ML Prediction         PostgreSQL
          Models              Database
             |                   |
       +-----+------+       Accounts, Profiles,
       |            |       Sites, Devices &
       v            v       Preferences
   Solar Model  Energy Model
```

The React frontend communicates with the FastAPI backend through REST APIs. The backend uses trained machine learning models to generate solar and household energy-demand estimates, while PostgreSQL stores application data.

### ☁️ Deployment Architecture

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend API | Render |
| Database | PostgreSQL (Neon or Render PostgreSQL) |

### Production Deployment

**Frontend — Vercel**

- Deploy the frontend as a Vite project.
- Build command: `npm run build`
- Output directory: `dist`
- Configure `VITE_API_BASE_URL` with the deployed Render API URL.
- The repository includes `vercel.json` for BrowserRouter route handling and direct navigation.

**Backend — Render**

- Deploy the FastAPI backend using the included `render.yaml`.
- Configure `DATABASE_URL` with the PostgreSQL connection string.
- Set `FRONTEND_ORIGINS` and `FRONTEND_URL` to the deployed Vercel origin.
- Configure SMTP environment variables for email verification and password-reset functionality.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Machine Learning | Trained Solar Generation and Energy Demand Models |
| Database | PostgreSQL, Neon |
| Cloud & Deployment | Vercel, Render |

## 🌿 Environmental Impact

Wattora aims to make household energy consumption easier to understand and encourage more efficient electricity-use decisions.

By helping users explore the relationship between estimated solar generation and household demand, the platform promotes energy awareness and supports the adoption of sustainable energy practices.

**Current Limitations:**

- Predictions do not currently incorporate live weather data.
- Real-time smart-meter and inverter monitoring is not yet implemented.
- Actual electricity savings and emissions reductions have not yet been measured.

## 🚀 Future Scope

- 🌦️ Integrate live weather forecasts for more context-aware solar generation estimates.
- ⚡ Support real-time energy monitoring through smart meters and connected devices.
- 📉 Estimate potential electricity savings and associated carbon-emission reductions.
- 🧠 Develop more personalized, data-driven energy optimization recommendations.
- ☀️ Improve solar generation predictions using additional environmental and historical data.

---


**Wattora — Making household energy insights more accessible for a sustainable future.**

## Developed with ❤️ for Environment Hacks.