
# 🍏 NutriMind AI
NutriMind AI is a state-of-the-art context-aware health and nutrition tracking system. It features a revolutionary **Fresh Health** interface, blending high-end Apple-inspired aesthetics with intelligent, mood-aware recommendations and dynamic habit tracking.

![Design: Fresh Health](https://img.shields.io/badge/Design-Fresh_Health-10b981?style=flat-square)
![Architecture: Vanilla JS](https://img.shields.io/badge/Architecture-Vanilla_JS-f59e0b?style=flat-square)
![Auth: Hybrid Firebase](https://img.shields.io/badge/Auth-Hybrid_Firebase-6366f1?style=flat-square)
![Onboarding: Mandatory](https://img.shields.io/badge/Onboarding-Mandatory-ef4444?style=flat-square)
![Streak: Real-time](https://img.shields.io/badge/Streak-Real_time-22c55e?style=flat-square)

---

## 🌟 Key Features

### 🎬 **Cinematic Experience**
- **Full-Screen Food Animation**: 80vw × 80vh realistic food transformation (burger → salad)
- **6-Step Dramatic Sequence**: Scale → Zoom → Layer separation → Particles → Healthy reveal
- **Premium Visual Effects**: Blur transitions, glow effects, particle systems
- **Professional Background**: Full-screen gradient with radial glow

### 🔐 **Mandatory Onboarding Flow**
- **Complete User Profiling**: All users must complete onboarding before dashboard access
- **Comprehensive Data Collection**:
  - 👤 Basic Info: Full Name, Email
  - 📏 Body Data: Height (cm), Weight (kg)
  - 🎯 Goals: Weight Loss, Weight Gain, Maintain
  - 🍽️ Daily Eating Habits: Breakfast, Lunch, Dinner (with real food images)
  - 🏠 Lifestyle: Home, Hostel, Working, PG
  - 😴 Sleep Hours: Interactive slider (4-10 hours)
- **Smart Progress Tracking**: Real-time progress bar showing completion status
- **Data Persistence**: All user data saved to localStorage with pre-filling for returning users

### 🎯 **Real-Time Streak System**
- **Persistent Streak Tracking**: Uses `lastLoginDate` for accurate day counting
- **Smart Logic**:
  - First meal submission → streak = 1
  - Next day submission → streak + 1
  - Skip a day → reset to 1
  - Same day multiple meals → no duplicate counting
- **Real-time Updates**: Streak increases immediately after meal submission
- **Cross-Platform**: Works across manual logging, gallery, and scanner

### 🎨 **Premium UI/UX**
- **Fresh Health Design**: Glassmorphic interface with dynamic color reactions
- **Food Selection with Images**: Real food photos for meal preferences
- **Interactive Components**: Hover effects, smooth transitions, micro-interactions
- **Responsive Design**: Optimized for all screen sizes
- **Modern Authentication**: Tab switching, floating labels, smart validation

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3 (Custom Design Tokens), Vanilla JavaScript (Modular ES6)
- **State Management**: Namespaced LocalStorage (`nm_user`, `nm_meals`, `nm_auth`, `nm_streak`)
- **Backend / Delivery**: Node.js (Express)
- **Authentication**: Firebase Authentication / Fallback Mock Provider
- **Images**: Unsplash API for realistic food photography

---

## 📁 Project Structure
```text
food health/
├── public/
│   ├── css/
│   │   ├── style.css         # Core layout and Apple Health light mode variables
│   │   ├── additions.css     # Premium glassmorphism and UI reactive tints
│   ├── js/
│   │   ├── app.js            # UI Dispatcher, Daily Check-in, Real-time streak updates
│   │   ├── store.js          # Unified storage, AI scoring, Persistent streak management
│   │   ├── ai.js             # Context-aware chat and recommendation logic
│   │   ├── streaks.js        # Achievement system, Demo users, Streak display
│   │   ├── gallery.js        # Food gallery with image-based meal logging
│   │   ├── scanner.js        # AI-powered food scanner integration
│   │   ├── notifications.js  # Smart notification system
│   ├── index.html            # Main dashboard, check-in UI, dynamic widgets
│   ├── login.html            # Full-screen cinematic intro + Mandatory onboarding
├── data/
│   └── foods.json            # Categorized nutrition database
├── server.js                 # Express Backend Delivery Server
└── package.json              # Project dependencies and startup scripts
```

---

## 🚀 How to Run Locally

You only need [Node.js](https://nodejs.org/) installed to run this project. The setup is highly simplified.

### 🪟 Windows Setup
1. Open your Command Prompt (cmd) or PowerShell.
2. Navigate to the project folder:
   ```cmd
   cd path\to\food health
   ```
3. Install dependencies:
   ```cmd
   npm install
   ```
4. Start the server:
   ```cmd
   node server.js
   ```
5. Open your browser and go to: `http://localhost:3000`

### 🍎 Mac Setup
1. Open the Terminal app.
2. Navigate to the project folder:
   ```bash
   cd /path/to/food\ health
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   node server.js
   ```
5. Open your browser and go to: `http://localhost:3000`

### 🐧 Linux Setup
1. Open your standard terminal emulator.
2. Navigate to the project folder:
   ```bash
   cd /path/to/food\ health
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   node server.js
   ```
5. Open your browser and go to: `http://localhost:3000`

---

## 🎯 User Journey

### **First-Time Experience**
1. **Cinematic Intro**: Full-screen burger → salad transformation (9 seconds)
2. **Authentication**: Sign Up/Sign In with modern UI
3. **Mandatory Onboarding**: Complete profile with all health data
4. **Dashboard Access**: Personalized health tracking begins

### **Daily Usage**
1. **Meal Logging**: Manual input, Gallery selection, or AI Scanner
2. **Real-time Streak Updates**: Streak increases immediately after meal submission
3. **Health Insights**: AI-powered recommendations and pattern detection
4. **Progress Tracking**: Visual dashboards and achievement system

---

## 🔧 Key Technical Features

### **Streak System**
- **Persistent Storage**: Uses `nm_streak` localStorage key
- **Day-Based Logic**: Tracks `lastLoginDate` for accurate consecutive days
- **Real-time Updates**: Immediate UI refresh after meal logging
- **Cross-Platform Integration**: Works across all meal entry methods

### **Onboarding System**
- **Mandatory Flow**: All users must complete before dashboard access
- **Data Validation**: Smart validation with specific error messages
- **Progress Tracking**: Visual progress bar showing completion status
- **Data Persistence**: User data saved and pre-filled on return visits

### **Cinematic Animation**
- **Full-Screen Experience**: 80vw × 80vh food images
- **6-Step Sequence**: Dramatic transformation with particles and effects
- **Performance Optimized**: Lazy loading and smooth transitions
- **Professional Polish**: Blur effects, glow, and micro-interactions

- Deployement Link:https://smart-food-ai-engine-et3o.vercel.app

---
Smart Food. Smart Life.

⭐ Star this repo to support the project
