# 🌱 Wattora — Smart Energy Optimization

**Smarter Energy Decisions for a More Sustainable Future**

Wattora is a smart household energy optimization platform built for **Environment Hacks**. It combines machine learning-based solar generation and household energy-demand estimates to help users understand their energy usage and explore more efficient ways to use solar power.

## 🌍 The Problem

Households often lack accessible insights into their potential solar generation, electricity demand, and appliance usage. Without understanding how these factors relate, making informed energy decisions and improving energy efficiency can be challenging.

## 💡 Our Solution

Wattora brings solar generation, household demand, and appliance information together in one platform.

- ☀️ **Solar Insights:** Estimate solar generation using site capacity and a trained ML model.
- ⚡ **Energy Demand:** Estimate household electricity demand using configured usage and enabled appliances.
- 🧠 **Smart Optimization:** Compare estimated solar output with appliance load to explore better energy-use decisions.
- 📊 **Personalized Dashboard:** View energy insights for a selected site.
- 🏠 **Site & Device Management:** Configure household sites, appliances, and energy preferences.

## ⚙️ How It Works

1. **Configure a site:** Users provide site details, including solar capacity and household energy settings.
2. **Add appliances:** Users configure household devices and indicate which devices are enabled.
3. **Generate estimates:** Trained ML models estimate solar generation and household energy demand.
4. **Analyze energy usage:** Wattora compares estimated solar output with configured appliance load.
5. **Explore optimization:** The platform presents energy insights based on site configuration and saved preferences, helping users consider more informed energy choices.

## 🏗️ Architecture

```text
              User
               |
               v
     React + TypeScript + Vite
          (Frontend)
               |
               v
       FastAPI REST Backend
          /           \
         v             v
  Trained ML Models   Data Storage
   /           \      /          \
Solar Model  Energy  Neon        SQLite
             Model   PostgreSQL  Sites & Devices
                     Accounts,
                     Profiles &
                     Preferences
```

The React frontend communicates with the FastAPI backend. The backend uses trained models to produce solar and energy-demand estimates, while application data is stored in Neon PostgreSQL and SQLite.

**Deployment:** AWS EC2 hosts the frontend and backend in the planned deployment architecture, while Neon provides PostgreSQL database hosting.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI
- **Machine Learning:** Trained solar-generation and energy-demand models
- **Database:** Neon PostgreSQL, SQLite
- **Cloud:** AWS EC2

## 🌿 Environmental Impact

Wattora aims to encourage household energy awareness, support more efficient electricity-use decisions, and help users explore the potential of solar energy.

By making estimated generation and demand easier to understand, Wattora seeks to support more conscious energy consumption and contribute to broader sustainability goals.

*Current limitation: Estimates do not use live weather data, smart-meter readings, or inverter telemetry. Actual energy savings and emissions reductions have not yet been measured.*

## 🚀 Future Scope

- Integrate live weather forecasts and solar-generation data.
- Support real-time energy monitoring through smart meters and connected devices.
- Estimate potential energy savings and associated emissions reductions.
- Develop more personalized, data-driven optimization recommendations.

---

**Built for Environment Hacks 🌎**

*Making household energy insights more accessible for a sustainable future.*