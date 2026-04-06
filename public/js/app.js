/* app.js – Main application router & orchestrator */

// ── GLOBAL STATE ───────────────────────────────────────────────
const AppState = { currentPage: 'dashboard', user: null, waterCount: 0 };

function isOnboardingComplete(user) {
  if (!user) return false;

  // Trust the explicit flag set by the new login.html onboarding flow
  if (user.onboardingComplete === true) return true;

  // Legacy fallback: check required fields for old accounts
  const height = Number(user.height);
  const weight = Number(user.weight);
  const goal   = user.goal || '';
  const lifestyle = user.lifestyle || user.livingType || '';

  if (isNaN(height) || height < 100 || height > 250) return false;
  if (isNaN(weight) || weight < 30  || weight > 250) return false;
  if (!goal.trim())      return false;
  if (!lifestyle.trim()) return false;

  return true;
}

function isTodayCheckInComplete(user) {
  if (!user || !user.email) return false;
  const checkinKey = `nm_daily_checkin_${user.email}`;
  const raw = localStorage.getItem(checkinKey) || '[]';

  let checkins;
  try {
    checkins = JSON.parse(raw);
  } catch (e) {
    checkins = [];
  }

  const today = new Date().toDateString();
  const todayEntry = Array.isArray(checkins) ? checkins.find(c => c.date === today) : null;
  if (!todayEntry) return false;

  if (!todayEntry.breakfast || !todayEntry.lunch || !todayEntry.dinner) return false;
  if (todayEntry.sleep === undefined || todayEntry.sleep === null || todayEntry.sleep === '') return false;

  return true;
}

function checkIfDailyCheckInNeeded() {
  const user = Store.getUser();
  if (!user) return false;
  return !isTodayCheckInComplete(user);
}

// ── REACTIVE UI (SPLIT STORY TINT) ─────────────────────────────
window.triggerReactiveUI = function(type) {
  const root = document.documentElement;
  if (type === 'junk') {
    root.style.setProperty('--ui-tint-color', '#ef4444');
    root.style.setProperty('--ui-tint-opacity', '0.15');
  } else if (type === 'healthy') {
    root.style.setProperty('--ui-tint-color', '#10b981');
    root.style.setProperty('--ui-tint-opacity', '0.15');
  } else {
    root.style.setProperty('--ui-tint-opacity', '0');
  }
  
  // Fade back to normal after 5 seconds
  setTimeout(() => {
    root.style.setProperty('--ui-tint-opacity', '0');
  }, 5000);
}

// ── AUTH ───────────────────────────────────────────────────────
function logoutUser() {
  localStorage.removeItem('nm_auth');
  localStorage.removeItem('nm_user');
  localStorage.removeItem('nm_meals');
  window.location.href = '/login.html';
}

// ── DAILY CHECK-IN SYSTEM ───────────────────────────────────────
function initDailyCheckIn() {
  const checkinModal = document.getElementById('daily-checkin-modal');
  const checkinForm = document.getElementById('daily-checkin-form');
  const checkinDate = document.getElementById('checkin-date');
  const checkinError = document.getElementById('checkin-error');
  const sleepSlider = document.getElementById('daily-sleep-slider');
  const sleepDisplay = document.getElementById('daily-sleep-display');
  
  if (!checkinModal) return;
  
  // Set today's date
  const today = new Date();
  checkinDate.textContent = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Sleep slider functionality
  if (sleepSlider && sleepDisplay) {
    sleepSlider.addEventListener('input', function() {
      sleepDisplay.textContent = this.value + ' hours';
    });
  }
  
  // Mood selection
  document.querySelectorAll('.mood-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.mood-option').forEach(opt => opt.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
  
  // Activity selection
  document.querySelectorAll('.activity-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.activity-option').forEach(opt => opt.classList.remove('selected'));
      this.classList.add('selected');
    });
  });

  
  // Form submission
  if (checkinForm) {
    checkinForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (!validateDailyCheckIn()) return;
      
      // Collect form data
      const checkinData = {
        userId: Store.getUser()?.email || null,
        date: today.toDateString(),
        breakfast: document.getElementById('daily-breakfast')?.value.trim() || null,
        lunch: document.getElementById('daily-lunch')?.value.trim() || null,
        dinner: document.getElementById('daily-dinner')?.value.trim() || null,
        snacks: document.getElementById('daily-snacks')?.value.trim() || null,
        sleep: parseInt(sleepSlider?.value || 7),
        mood: document.querySelector('.mood-option.selected')?.dataset?.mood || 'normal',
        activity: document.querySelector('.activity-option.selected')?.dataset?.activity || 'no',
        timestamp: new Date().toISOString()
      };
      
      // Save daily check-in data
      saveDailyCheckIn(checkinData);
      
      // Convert check-in to meals for streak system
      convertCheckInToMeals(checkinData);
      
      // Close modal
      closeDailyCheckIn();
      
      // Show success notification
      Notifications.show('Daily Check-In Complete! 🎉', 'Your health data has been saved successfully.', 'success');
      
      // Refresh dashboard
      renderMealList();
      renderHabits();
      renderStreaks();
    });
  }
}

function validateDailyCheckIn() {
  const checkinError = document.getElementById('checkin-error');
  const breakfast = document.getElementById('daily-breakfast')?.value.trim();
  const lunch = document.getElementById('daily-lunch')?.value.trim();
  const dinner = document.getElementById('daily-dinner')?.value.trim();
  const sleep = parseFloat(document.getElementById('daily-sleep-slider')?.value || '0');

  if (!breakfast || !lunch || !dinner) {
    checkinError.textContent = 'Please fill breakfast, lunch, and dinner (required).';
    checkinError.style.display = 'block';
    return false;
  }

  if (isNaN(sleep) || sleep <= 0 || sleep > 24) {
    checkinError.textContent = 'Please provide a valid sleep duration (1-24 hours).';
    checkinError.style.display = 'block';
    return false;
  }

  checkinError.style.display = 'none';
  return true;
}

function saveDailyCheckIn(data) {
  const user = Store.getUser();
  if (!user) return;
  
  const checkinKey = `nm_daily_checkin_${user.email}`;
  const existingCheckins = JSON.parse(localStorage.getItem(checkinKey) || '[]');
  
  const dataWithUser = { ...data, userId: user.email };

  // Remove any existing check-in for today
  const todayIndex = existingCheckins.findIndex(c => c.date === dataWithUser.date);
  if (todayIndex !== -1) {
    existingCheckins[todayIndex] = dataWithUser;
  } else {
    existingCheckins.push(dataWithUser);
  }
  
  localStorage.setItem(checkinKey, JSON.stringify(existingCheckins));
}

function convertCheckInToMeals(checkinData) {
  const user = Store.getUser();
  if (!user) return;
  
  // Convert meals to Store format for streak tracking
  const meals = [
    { food: checkinData.breakfast, calories: estimateCalories(checkinData.breakfast, 'breakfast'), category: 'breakfast', mood: checkinData.mood, notes: 'Daily check-in' },
    { food: checkinData.lunch, calories: estimateCalories(checkinData.lunch, 'lunch'), category: 'lunch', mood: checkinData.mood, notes: 'Daily check-in' },
    { food: checkinData.dinner, calories: estimateCalories(checkinData.dinner, 'dinner'), category: 'dinner', mood: checkinData.mood, notes: 'Daily check-in' }
  ];
  
  // Add snacks if selected
  if (checkinData.snacks && checkinData.snacks !== 'none') {
    meals.push({ 
      food: checkinData.snacks, 
      calories: estimateCalories(checkinData.snacks, 'snack'), 
      category: 'snack', 
      mood: checkinData.mood, 
      notes: 'Daily check-in' 
    });
  }
  
  // Save meals to Store (this will update streak)
  meals.forEach(meal => {
    Store.saveMeal(meal);
  });
  
  // Update user's sleep data
  if (user.sleep !== checkinData.sleep) {
    user.sleep = checkinData.sleep;
    Store.saveUser(user);
  }
}

function estimateCalories(food, mealType) {
  const calorieMap = {
    oatmeal: 150, eggs: 200, toast: 120, smoothie: 180,
    salad: 250, sandwich: 350, rice: 300, pasta: 400,
    chicken: 350, vegetables: 150, fish: 300, soup: 200,
    fruits: 80, nuts: 170, chips: 150, none: 0
  };
  
  return calorieMap[food] || 200;
}

function showDailyCheckIn() {
  const checkinModal = document.getElementById('daily-checkin-modal');
  const onboardingOverlay = document.getElementById('onboarding-overlay');
  const app = document.getElementById('app');
  
  if (onboardingOverlay) onboardingOverlay.style.display = 'none';
  if (app) app.style.display = 'none';
  if (checkinModal) {
    checkinModal.style.display = 'flex';
    checkinModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeDailyCheckIn() {
  const checkinModal = document.getElementById('daily-checkin-modal');
  const app = document.getElementById('app');
  
  if (checkinModal) {
    checkinModal.style.display = 'none';
    checkinModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  const user = Store.getUser();
  if (user && isOnboardingComplete(user) && isTodayCheckInComplete(user)) {
    if (app) app.style.display = 'flex';
    setTimeout(() => {
      renderDashboard();
      renderStreaks();
      renderDemoUsers();
    }, 100);
  }
}

function checkIfDailyCheckInNeeded() {
  const user = Store.getUser();
  if (!user) return false;
  
  const checkinKey = `nm_daily_checkin_${user.email}`;
  const existingCheckins = JSON.parse(localStorage.getItem(checkinKey) || '[]');
  const today = new Date().toDateString();
  
  // Check if already completed today
  const todayCheckin = existingCheckins.find(c => c.date === today);
  return !todayCheckin;
}

// ── NAVIGATION ─────────────────────────────────────────────────
function navigate(page) {
  const user = Store.getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  if (!isOnboardingComplete(user)) {
    document.getElementById('app').style.display = 'none';
    document.getElementById('onboarding-overlay').style.display = 'flex';
    initOnboarding();
    return;
  }

  if (checkIfDailyCheckInNeeded()) {
    document.getElementById('app').style.display = 'none';
    document.getElementById('daily-checkin-modal').style.display = 'flex';
    return;
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const target = document.getElementById(`page-${page}`);
  const nav = document.getElementById(`nav-${page}`);
  if (target) target.classList.add('active');
  if (nav) nav.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', habits: 'Habit Tracker', report: 'Daily Report',
    logger: 'Meal Logger', mood: 'Mood Eating', scanner: 'Food Scanner',
    grocery: 'Grocery List', cravings: 'Craving Predictor', twin: 'Digital Twin',
    achievements: 'Achievements', gallery: 'Food Gallery'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[page] || page;

  AppState.currentPage = page;

  // On-demand page renders
  switch (page) {
    case 'dashboard':    renderDashboard(); break;
    case 'habits':       renderHabits(); break;
    case 'report':       renderReport(); break;
    case 'logger':       renderLogger(); break;
    case 'mood':         break;
    case 'scanner':      Scanner.init(); break;
    case 'grocery':      renderGrocery(); break;
    case 'cravings':     renderCravings(); break;
    case 'twin':         renderTwin(); break;
    case 'achievements': renderAchievements(); break;
    case 'gallery':      Gallery.render(); break;
  }

  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('open');
}

// ── DASHBOARD ──────────────────────────────────────────────────
function renderDashboard() {
  const user = Store.getUser();
  const todayMeals = Store.getTodayMeals();
  const score = Store.getHealthScore();
  const water = Store.getWater();
  const patterns = Store.getPatterns();

  // Greeting
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
  const nameEl = document.getElementById('dash-name');
  if (nameEl) nameEl.textContent = user?.name?.split(' ')[0] || 'Friend';
  const pageH = document.querySelector('#page-dashboard .page-header h1');
  if (pageH) pageH.innerHTML = `${greet}, <span class="gradient-text" id="dash-name">${user?.name?.split(' ')[0] || 'Friend'}</span> 👋`;

  // Health score ring
  Analytics.animateScore('dash-score', score, 'score-ring-prog');
  const lbl = document.getElementById('score-label-bottom');
  if (lbl) {
    lbl.textContent = score >= 75 ? '🟢 Excellent' : score >= 50 ? '🟡 Good' : '🔴 Needs Work';
    lbl.style.color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  }

  // Calories
  const totalCal = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const calEl = document.getElementById('dash-calories');
  if (calEl) calEl.textContent = totalCal;
  const calBar = document.getElementById('cal-progress');
  if (calBar) calBar.style.width = Math.min(100, (totalCal / 1800) * 100) + '%';

  // Meals
  const mealEl = document.getElementById('dash-meals');
  if (mealEl) mealEl.textContent = todayMeals.length;
  renderMealDots(todayMeals);

  // Water
  AppState.waterCount = water;
  const waterEl = document.getElementById('dash-water');
  if (waterEl) waterEl.textContent = water;
  renderWaterDots(water);

  // Apply auth banner
  const auth = JSON.parse(localStorage.getItem('nm_auth') || 'null');
  const authNameEl = document.getElementById('auth-name');
  if (authNameEl && auth) authNameEl.textContent = auth.name;

  // Call streak render
  renderStreaks();
  renderDemoUsers();
  const sBar = document.getElementById('sidebar-score-bar');
  const sVal = document.getElementById('sidebar-score-val');
  if (sBar) sBar.style.width = score + '%';
  if (sVal) sVal.textContent = score;

  // AI Patterns
  const patternList = document.getElementById('patterns-list');
  const patternCount = document.getElementById('pattern-count');
  if (patternList) {
    if (patterns.length === 0) {
      patternList.innerHTML = `<div class="alert-item info"><span class="alert-icon">✅</span><div><div class="alert-msg">No issues detected — great eating habits!</div><div class="alert-tip">Keep logging meals to get deeper insights.</div></div></div>`;
    } else {
      patternList.innerHTML = patterns.map(p => `
        <div class="alert-item ${p.severity}">
          <span class="alert-icon">${p.icon}</span>
          <div>
            <div class="alert-msg">${p.message}</div>
            <div class="alert-tip">💡 ${p.suggestion}</div>
          </div>
        </div>`).join('');
    }
    if (patternCount) patternCount.textContent = `${patterns.length} pattern${patterns.length !== 1 ? 's' : ''}`;
  }

  // Context suggestions
  const ctx = AI.getWeatherContext();
  const ctxWidget = document.getElementById('context-widget');
  if (ctxWidget) {
    document.getElementById('context-weather').textContent = `${ctx.icon} ${ctx.label} · ${ctx.temp}°C`;
    document.getElementById('context-time').textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }

  const suggestions = AI.getContextSuggestions();
  renderFoodCards('context-suggestions', suggestions);
  const ctxBadge = document.getElementById('context-badge');
  if (ctxBadge) ctxBadge.textContent = `${ctx.icon} ${ctx.label} weather · ${getTimeOfDay()}`;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
}

function renderMealDots(meals) {
  const container = document.getElementById('meal-dots');
  if (!container) return;
  const cats = meals.map(m => m.category);
  const slots = [
    { cat: 'breakfast', emoji: '🌅' },
    { cat: 'lunch', emoji: '☀️' },
    { cat: 'snack', emoji: '🍎' },
    { cat: 'dinner', emoji: '🌙' }
  ];
  container.innerHTML = slots.map(s => `
    <div class="mdot ${cats.includes(s.cat) ? 'filled' : 'empty'}" title="${s.cat}">
      ${cats.includes(s.cat) ? s.emoji : ''}
    </div>`).join('');
}

function renderWaterDots(count) {
  const container = document.getElementById('water-dots');
  if (!container) return;
  container.innerHTML = Array(8).fill(0).map((_, i) =>
    `<div class="water-dot ${i < count ? 'filled' : ''}"></div>`
  ).join('');
}

function renderFoodCards(containerId, foods) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!foods || foods.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">No suggestions available right now.</p>';
    return;
  }
  el.innerHTML = foods.map(f => `
    <div class="food-card" onclick="quickLogFood('${f.name}', ${f.calories})">
      <div class="food-emoji">${f.emoji || '🍽️'}</div>
      <div class="food-name">${f.name}</div>
      <div class="food-cal"><strong>${f.calories}</strong> kcal · ${f.protein || 0}g protein</div>
      <span class="food-hs ${f.healthScore >= 80 ? 'high' : f.healthScore >= 60 ? 'med' : 'low'}">
        HS: ${f.healthScore}/100
      </span>
    </div>`).join('');
}

function quickLogFood(name, calories, cat) {
  const isJunk = cat === 'junk';
  Store.saveMeal({ food: name, calories, category: isJunk ? 'junk' : 'snack', mood: 'neutral' });
  Notifications.show('Meal Logged! ✅', `${name} (${calories} kcal) added.`, 'success');
  window.triggerReactiveUI(isJunk ? 'junk' : 'healthy');
  if (AppState.currentPage === 'dashboard') renderDashboard();
}

// ── HABIT TRACKER ──────────────────────────────────────────────
function renderHabits() {
  const meals = Store.getMeals();
  const junk = meals.filter(m => m.category === 'junk').length;
  const lateNight = meals.filter(m => { const h = new Date(m.time).getHours(); return h >= 22 || h <= 4; }).length;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('hs-junk', junk);
  el('hs-skip', Math.max(0, 3 - Store.getTodayMeals().length));
  el('hs-late', lateNight);
  
  // Streak calc - now uses Store's persistent system
  const streak = Store.getCurrentStreak();
  el('hs-streak', streak);

  setTimeout(() => {
    Analytics.initAllCharts();
  }, 100);
}

// ── DAILY REPORT ───────────────────────────────────────────────
function renderReport() {
  const todayMeals = Store.getTodayMeals();
  const score = Store.getHealthScore();
  const patterns = Store.getPatterns();
  const totalCal = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);

  document.getElementById('report-date').textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById('report-score').textContent = score;
  document.getElementById('rep-cal').textContent = totalCal;
  document.getElementById('rep-protein').textContent = Math.round(todayMeals.reduce((s,m) => s + ((m.protein)||0), 0)) + 'g';
  document.getElementById('rep-meals').textContent = todayMeals.length;

  const scoreMsg = document.getElementById('report-score-msg');
  if (scoreMsg) scoreMsg.textContent = score >= 75 ? '🟢 Excellent day!' : score >= 50 ? '🟡 Good effort today.' : '🔴 Room for improvement.';

  // Animate report ring
  const ring = document.getElementById('report-ring');
  if (ring) {
    const offset = 264 - (264 * score / 100);
    setTimeout(() => ring.style.strokeDashoffset = offset, 300);
  }

  // Mistakes
  const mistakesEl = document.getElementById('report-mistakes');
  const mistakes = patterns.map(p => p.message);
  if (totalCal > 2500) mistakes.push('Calorie intake is high today.');
  if (totalCal < 1200 && new Date().getHours() >= 16) mistakes.push('Under your daily calorie goal.');
  if (mistakesEl) {
    mistakesEl.innerHTML = mistakes.length ? mistakes.map(m => `<li>${m}</li>`).join('') : '<li class="no-item">No mistakes today! 🎉</li>';
  }

  // Suggestions
  const suggestionsEl = document.getElementById('report-suggestions');
  const sugs = [
    'Stay hydrated — aim for 8 glasses of water.',
    'Add more colourful vegetables to your next meal.',
    totalCal < 1200 ? 'Eat a protein-rich snack to meet your goal.' : null,
    totalCal > 2000 ? 'Keep dinner light tonight.' : null,
    patterns.length === 0 ? 'You\'re doing great — keep the streak going! 🔥' : null
  ].filter(Boolean);
  if (suggestionsEl) suggestionsEl.innerHTML = sugs.map(s => `<li>${s}</li>`).join('');

  // Timeline
  const tlEl = document.getElementById('report-timeline');
  if (tlEl) {
    if (!todayMeals.length) {
      tlEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-utensils"></i><p>No meals logged yet today.</p></div>';
    } else {
      const sorted = [...todayMeals].sort((a, b) => new Date(a.time) - new Date(b.time));
      tlEl.innerHTML = sorted.map(m => `
        <div class="tl-item">
          <span class="tl-time">${new Date(m.time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
          <div>
            <div class="tl-food">${m.food}</div>
            <div class="tl-cal">${m.calories} kcal · ${m.mood || 'neutral'}</div>
          </div>
        </div>`).join('');
    }
  }
}

// ── MEAL LOGGER ────────────────────────────────────────────────
function renderLogger() {
  renderMealList();
  renderLoggerSuggestions();
  initFoodAutocomplete();
}

function renderMealList() {
  const listEl = document.getElementById('meals-list');
  const countEl = document.getElementById('today-meal-count');
  const meals = Store.getTodayMeals();
  if (countEl) countEl.textContent = `${meals.length} meal${meals.length !== 1 ? 's' : ''}`;
  if (!listEl) return;
  if (!meals.length) {
    listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-utensils"></i><p>No meals logged today.<br>Start tracking!</p></div>';
    return;
  }
  const sorted = [...meals].sort((a, b) => new Date(b.time) - new Date(a.time));
  const catColors = { breakfast:'#f59e0b', lunch:'#10b981', dinner:'#6366f1', snack:'#06b6d4', junk:'#ef4444', other:'#94a3b8' };
  listEl.innerHTML = sorted.map(m => `
    <div class="meal-item">
      <div class="meal-cat-dot" style="background:${catColors[m.category]||'#94a3b8'}"></div>
      <div class="meal-info">
        <div class="meal-name">${m.food}</div>
        <div class="meal-meta">${new Date(m.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${m.category} · ${m.mood||'neutral'}</div>
      </div>
      <span class="meal-cal">${m.calories} kcal</span>
      <button class="meal-del" onclick="deleteMeal(${m.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
    </div>`).join('');
}

function deleteMeal(id) {
  Store.deleteMeal(id);
  renderMealList();
  Notifications.show('Meal removed', null, 'info', 2000);
  if (AppState.currentPage === 'dashboard') renderDashboard();
}

function renderLoggerSuggestions() {
  const el = document.getElementById('logger-suggestions');
  if (!el) return;
  const foods = AI.getContextSuggestions().slice(0, 4);
  el.innerHTML = foods.map(f => `
    <div class="suggest-item" onclick="fillLogForm('${f.name}', ${f.calories}, '${f.category}')">
      <span>${f.emoji || '🍽️'} ${f.name}</span>
      <span class="suggest-cal">${f.calories} kcal</span>
    </div>`).join('');
}

function fillLogForm(name, cal, cat) {
  const food = document.getElementById('log-food');
  const calEl = document.getElementById('log-cal');
  const catEl = document.getElementById('log-cat');
  if (food) food.value = name;
  if (calEl) calEl.value = cal;
  if (catEl && cat) catEl.value = cat;
  food?.focus();
}

function initFoodAutocomplete() {
  const input = document.getElementById('log-food');
  const dropdown = document.getElementById('food-dropdown');
  if (!input || !dropdown) return;
  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 2) { dropdown.style.display = 'none'; return; }
    const results = AI.searchFoods(q);
    if (!results.length) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = results.map(f =>
      `<div class="ac-item" onclick="fillLogForm('${f.name}',${f.calories},'${f.category}')">
        <span>${f.emoji || ''} ${f.name}</span>
        <span class="ac-cal">${f.calories} kcal</span>
      </div>`).join('');
    dropdown.style.display = 'block';
  });
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target)) dropdown.style.display = 'none';
  });
}

function submitMeal() {
  const food = document.getElementById('log-food')?.value?.trim();
  const cal = parseInt(document.getElementById('log-cal')?.value) || 0;
  const cat = document.getElementById('log-cat')?.value || 'other';
  const notes = document.getElementById('log-notes')?.value || '';
  const activeMood = document.querySelector('.mood-pill.active')?.dataset?.mood || 'neutral';

  if (!food) { Notifications.show('Missing info', 'Please enter a food name.', 'warning'); return; }

  Store.saveMeal({ food, calories: cal, category: cat, mood: activeMood, notes });

  // Trigger global reactive UI depending on category
  window.triggerReactiveUI(cat === 'junk' ? 'junk' : 'healthy');

  // Clear form
  ['log-food','log-cal','log-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('food-dropdown').style.display = 'none';

  Notifications.show('Meal Logged! 🍽️', `${food} (${cal} kcal) added successfully.`, 'success');
  renderMealList();
  
  // Update streak display after meal logging
  renderStreaks();

  // Smart swap alert for junk
  const swap = AI.getSmartSwap(food);
  if (swap) {
    setTimeout(() => Notifications.show('💡 Smart Swap Available!', `Try "${swap.name}" instead — saves ${cal - swap.calories} calories!`, 'ai', 6000), 1000);
  }
}

// ── GROCERY PAGE ───────────────────────────────────────────────
function renderGrocery() {
  const grocery = AI.getGrocery();
  const renderList = (id, items) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = items.map(i => `<li onclick="this.classList.toggle('checked')">${i}</li>`).join('');
  };
  renderList('glist-protein', grocery.protein);
  renderList('glist-carbs', grocery.carbs);
  renderList('glist-fats', grocery.fats);
  renderList('glist-vitamins', grocery.vitamins);
}

// ── CRAVING PREDICTOR ──────────────────────────────────────────
function renderCravings() {
  const predictions = AI.predictCravings();
  const el = document.getElementById('cravings-list');
  if (!el) return;
  el.innerHTML = predictions.map(p => `
    <div class="craving-item">
      <div class="craving-icon">${p.icon}</div>
      <div class="craving-info">
        <div class="craving-label">Predicted window</div>
        <div class="craving-food">${p.craving} — <em>${p.time}</em></div>
        <div class="craving-prevention">🛡️ ${p.prevention}</div>
      </div>
      <div class="craving-prob">
        <div class="prob-num">${p.probability}%</div>
        <div class="prob-pct">probability</div>
      </div>
    </div>`).join('');
}

// ── DIGITAL TWIN ───────────────────────────────────────────────
function renderTwin() {
  const twin = AI.getDigitalTwin();
  const user = Store.getUser();
  const meals = Store.getMeals();

  document.getElementById('twin-score-badge').textContent = twin.currentScore;
  document.getElementById('twin-meal-count').textContent = meals.length;

  // Traits
  const traitsEl = document.getElementById('twin-traits');
  if (traitsEl) traitsEl.innerHTML = twin.traits.map(t => `<span class="twin-trait">${t}</span>`).join('');

  // Risks & Gains
  const risksEl = document.getElementById('twin-risks-list');
  if (risksEl) risksEl.innerHTML = twin.risks.length ? twin.risks.map(r => `<li>${r}</li>`).join('') : '<li>No major risks detected — great habits!</li>';
  const gainsEl = document.getElementById('twin-gains-list');
  if (gainsEl) gainsEl.innerHTML = twin.gains.map(g => `<li>${g}</li>`).join('');

  // Behavior bars
  const behaviorGrid = document.getElementById('behavior-grid');
  if (behaviorGrid) {
    const colors = { 'Meal Consistency':'#6366f1', 'Junk Resistance':'#10b981', 'Hydration Habit':'#06b6d4', 'Sleep Quality':'#8b5cf6' };
    behaviorGrid.innerHTML = Object.entries(twin.behaviors).map(([k, v]) => `
      <div class="behavior-item">
        <div class="beh-name">${k}</div>
        <div class="beh-bar-wrap"><div class="beh-bar" style="width:0%;background:${colors[k]||'#6366f1'}" data-val="${v}"></div></div>
        <div class="beh-val" style="color:${colors[k]||'#6366f1'}">${v}%</div>
      </div>`).join('');
    // Animate bars
    setTimeout(() => {
      document.querySelectorAll('.beh-bar').forEach(b => b.style.width = b.dataset.val + '%');
    }, 100);
  }

  setTimeout(() => Analytics.initPredictionChart(), 100);
}

// ── MOOD PAGE ──────────────────────────────────────────────────
function initMoodPage() {
  document.querySelectorAll('.mood-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.mood-option').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      const mood = el.dataset.mood;
      const { foods, why } = AI.getMoodFoods(mood);

      document.getElementById('mood-result').style.display = 'block';
      document.getElementById('mood-insight').style.display = 'none';
      document.getElementById('mood-result-title').textContent = `Best foods when you're ${mood}`;
      document.getElementById('mood-result-why').textContent = why;

      renderFoodCards('mood-foods', foods);
    });
  });
}

// ── ONBOARDING ─────────────────────────────────────────────────
function initOnboarding() {
  let step = 1;
  const totalSteps = 3;

  const showStep = (s) => {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.dot').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${s}`)?.classList.add('active');
    document.getElementById(`dot-${s}`)?.classList.add('active');
    document.getElementById('ob-back').style.display = s > 1 ? 'block' : 'none';
    document.getElementById('ob-next').innerHTML = s < totalSteps 
      ? 'Next <i class="fa-solid fa-arrow-right"></i>' 
      : '<i class="fa-solid fa-rocket"></i> Complete Onboarding';
  };

  // Sleep slider linkage
  const sleepSlider = document.getElementById('ob-sleep-slider');
  const sleepDisplay = document.getElementById('ob-sleep-display');
  if (sleepSlider && sleepDisplay) {
    sleepSlider.addEventListener('input', (e) => {
      sleepDisplay.textContent = `${e.target.value} Hours`;
    });
  }

  // Pill selection
  document.querySelectorAll('.option-pills').forEach(container => {
    container.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
         container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
         pill.classList.add('active');
      });
    });
  });

  // Food card selection
  document.querySelectorAll('.food-selection-grid').forEach(grid => {
    grid.querySelectorAll('.fs-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.fs-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
  });

  function validateOnboardingStep(stepNumber) {
    const error = document.getElementById('ob-error');
    if (error) error.style.display = 'none';

    if (stepNumber === 1) {
      const name = document.getElementById('ob-name')?.value.trim();
      const email = document.getElementById('ob-email')?.value.trim();
      const height = parseInt(document.getElementById('ob-height')?.value, 10);
      const weight = parseInt(document.getElementById('ob-weight')?.value, 10);

      if (!name || name.length < 2) { error.textContent = 'Please enter a valid Full Name.'; error.style.display = 'block'; return false; }
      if (!email || !email.includes('@')) { error.textContent = 'Please enter a valid Email.'; error.style.display = 'block'; return false; }
      if (!height || height < 100 || height > 250) { error.textContent = 'Enter a valid height between 100cm and 250cm.'; error.style.display = 'block'; return false; }
      if (!weight || weight < 30 || weight > 250) { error.textContent = 'Enter a valid weight between 30kg and 250kg.'; error.style.display = 'block'; return false; }
    }

    if (stepNumber === 2) {
       return true;
    }

    if (stepNumber === 3) {
      const breakfast = document.querySelector('#ob-breakfast-options .fs-card.active');
      const lunch = document.querySelector('#ob-lunch-options .fs-card.active');
      const dinner = document.querySelector('#ob-dinner-options .fs-card.active');

      if (!breakfast || !lunch || !dinner) {
         error.textContent = 'Please select a habit for each meal time.'; error.style.display = 'block'; return false;
      }
    }

    return true;
  }

  document.getElementById('ob-next')?.addEventListener('click', () => {
    if (step < totalSteps) {
      if (!validateOnboardingStep(step)) return;
      step++;
      showStep(step);
    } else {
      if (!validateOnboardingStep(step)) return;

      const name = document.getElementById('ob-name')?.value.trim() || 'User';
      const email = document.getElementById('ob-email')?.value.trim();
      const weight = parseInt(document.getElementById('ob-weight')?.value, 10);
      const height = parseInt(document.getElementById('ob-height')?.value, 10);
      
      const sleepHours = parseFloat(document.getElementById('ob-sleep-slider')?.value || 7);
      
      const livingType = document.querySelector('#living-options .pill.active')?.dataset?.value || 'Home';
      const goal = document.querySelector('#goal-options .pill.active')?.dataset?.value || 'Maintain';

      const breakfast = document.querySelector('#ob-breakfast-options .fs-card.active')?.dataset?.value || 'Skipped';
      const lunch = document.querySelector('#ob-lunch-options .fs-card.active')?.dataset?.value || 'Skipped';
      const dinner = document.querySelector('#ob-dinner-options .fs-card.active')?.dataset?.value || 'Skipped';

      const bmi = height ? +(weight / ((height / 100) * (height / 100))).toFixed(1) : 0;

      const usersCurrent = Store.getUser() || {};
      const userPayload = {
        ...usersCurrent,
        name,
        email,
        weight,
        height,
        bmi,
        goal,
        lifestyle: livingType,
        livingType,
        sleepHours,
        breakfastHabit: breakfast,
        lunchHabit: lunch,
        dinnerHabit: dinner,
        onboardingComplete: true
      };

      Store.saveUser(userPayload);

      document.getElementById('onboarding-overlay').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      initApp();
      Notifications.show(`Welcome, ${name}! 🎉`, 'NutriMind System Synchronized.', 'success', 5000);
    }
  });

  document.getElementById('ob-back')?.addEventListener('click', () => {
    if (step > 1) { step--; showStep(step); }
  });
}

// ── DAILY CHECK-IN ─────────────────────────────────────────────
function initDailyCheckin() {
  const today = new Date().toDateString();
  const lastCheckin = localStorage.getItem('nm_checkin_date');
  
  if (lastCheckin === today) return; // Already checked in today

  const overlay = document.getElementById('checkin-overlay');
  if (!overlay) return;
  
  overlay.style.display = 'flex';

  // Toggle pills for Mood and Lifestyle
  document.querySelectorAll('.option-pills').forEach(group => {
    group.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
  });

  document.getElementById('ci-submit').addEventListener('click', () => {
    // Collect mandatory meals
    const breakfast = document.getElementById('ci-breakfast')?.value;
    const lunch = document.getElementById('ci-lunch')?.value;
    const dinner = document.getElementById('ci-dinner')?.value;
    
    if (!breakfast || !lunch || !dinner) {
      document.getElementById('ci-error').style.display = 'block';
      return; // Block submission
    }
    
    document.getElementById('ci-error').style.display = 'none';

    const mood = document.querySelector('#ci-mood-options .pill.active')?.dataset?.value || 'Normal';
    const lifestyle = document.querySelector('#ci-lifestyle-options .pill.active')?.dataset?.value || 'Home';
    const sleep = document.getElementById('ci-sleep')?.value || 7;
    const exercise = document.getElementById('ci-exercise')?.value || 'No';

    // Store the daily intelligence data
    const dailyData = JSON.parse(localStorage.getItem('nm_daily_intelligence') || '{}');
    dailyData[today] = { mood, lifestyle, sleep: +sleep, exercise, meals: { breakfast, lunch, dinner } };
    localStorage.setItem('nm_daily_intelligence', JSON.stringify(dailyData));
    
    // Update user's rolling sleep average and lifestyle in their profile
    const user = Store.getUser();
    if (user) {
      user.sleepHours = +sleep; // Just override with last night's real data for AI analysis
      user.livingType = lifestyle;
      Store.saveUser(user);
    }

    localStorage.setItem('nm_checkin_date', today);
    overlay.style.display = 'none';
    Notifications.show('Daily Sync Complete ✨', `Your intelligence engine is calibrated for today.`, 'ai', 4000);
    
    // Re-render dashboard with new stats
    if (AppState.currentPage === 'dashboard') renderDashboard();
  });
}

// ── SIDEBAR INTERACTIONS ───────────────────────────────────────
function initSidebar() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
  });

  document.getElementById('water-btn')?.addEventListener('click', () => {
    const count = Store.addWater();
    AppState.waterCount = count;
    document.getElementById('dash-water').textContent = count;
    renderWaterDots(count);
    Notifications.show('Hydration logged! 💧', `${count}/8 glasses today. Keep it up!`, 'water', 2500);
  });

  // Notification panel
  const notifBtn = document.getElementById('notif-btn');
  const notifPanel = document.getElementById('notif-panel');
  const notifClose = document.getElementById('notif-close');
  
  notifBtn?.addEventListener('click', () => {
    const isVisible = notifPanel.style.display === 'block';
    notifPanel.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) Notifications.populateNotifPanel();
  });
  
  notifClose?.addEventListener('click', () => { notifPanel.style.display = 'none'; });

  document.getElementById('log-submit')?.addEventListener('click', submitMeal);
  document.querySelectorAll('.mood-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.mood-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

// ── CLOCK ──────────────────────────────────────────────────────
function startClock() {
  const update = () => {
    const el = document.getElementById('context-time');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  };
  update();
  setInterval(update, 30000);
}

// ── SIDEBAR USER INFO ──────────────────────────────────────────
function updateSidebarUser() {
  const user = Store.getUser();
  if (!user) return;
  const nameEl = document.getElementById('sidebar-name');
  const goalEl = document.getElementById('sidebar-goal');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl) nameEl.textContent = user.name;
  if (goalEl) goalEl.textContent = user.goal || 'Healthy Eating';
  if (avatarEl) avatarEl.textContent = (user.name || 'U')[0].toUpperCase();
}

// ── SEED SAMPLE DATA ───────────────────────────────────────────
function seedSampleData() {
  const user = Store.getUser();
  if (!user) return;
  
  // SECURE NEW USER INITIALIZATION
  // Do NOT seed data for real users or new auth logins. They must start with Streak = 0.
  // We only seed demo profiles ending in '@demo.com'
  const isDemo = user.email && user.email.includes('@demo.com');
  if (!user.isDemo && !isDemo) {
    console.log(`New user detected (${user.name}). Skipping seed to preserve 0 streak.`);
    return;
  }

  const meals = Store.getMeals();
  if (meals.length > 5) return; // Already seeded

  console.log(`Seeding dynamic data for user: ${user.name} (${user.diet})`);
  
  const baseMeals = {
    Veg: [
      { food:'Oatmeal', cal:150, cat:'breakfast', hs: 90 }, { food:'Fruit Bowl', cal:120, cat:'snack', hs: 95 },
      { food:'Paneer', cal:250, cat:'lunch', hs: 85 }, { food:'Mixed Nuts', cal:170, cat:'snack', hs: 88 },
      { food:'Salad', cal:150, cat:'dinner', hs: 95 }, { food:'Pizza', cal:300, cat:'junk', hs: 20 }
    ],
    Vegan: [
      { food:'Smoothie', cal:180, cat:'breakfast', hs: 92 }, { food:'Banana', cal:89, cat:'snack', hs: 95 },
      { food:'Quinoa Bowl', cal:350, cat:'lunch', hs: 90 }, { food:'Avocado Toast', cal:310, cat:'snack', hs: 88 },
      { food:'Lentil Soup', cal:230, cat:'dinner', hs: 95 }, { food:'French Fries', cal:365, cat:'junk', hs: 25 }
    ],
    NonVeg: [
      { food:'Eggs', cal:155, cat:'breakfast', hs: 88 }, { food:'Greek Yogurt', cal:100, cat:'snack', hs: 90 },
      { food:'Chicken', cal:280, cat:'lunch', hs: 85 }, { food:'Banana', cal:89, cat:'snack', hs: 95 },
      { food:'Salmon Rice', cal:420, cat:'dinner', hs: 85 }, { food:'Burger', cal:350, cat:'junk', hs: 20 }
    ],
    Mixed: [
      { food:'Oatmeal', cal:150, cat:'breakfast', hs: 90 }, { food:'Coffee', cal:10, cat:'snack', hs: 70 },
      { food:'Chicken', cal:280, cat:'lunch', hs: 85 }, { food:'Dark Chocolate', cal:200, cat:'snack', hs: 60 },
      { food:'Roti', cal:100, cat:'dinner', hs: 80 }, { food:'Ice Cream', cal:270, cat:'junk', hs: 15 }
    ]
  };

  const palette = baseMeals[user.diet] || baseMeals['Mixed'];
  const newMeals = [];
  
  // Seed past 3 days and today
  for (let i = 3; i >= 0; i--) {
    const t = new Date();
    t.setDate(t.getDate() - i);
    
    // Day variance
    const dayJunkChance = (user.goal === 'Weight Loss' ? 0.2 : (user.goal === 'Healthy Eating' ? 0.1 : 0.4));
    
    // Pick 3-5 meals a day
    const mealCount = Math.floor(Math.random() * 3) + 3;
    const dayPalette = [...palette];
    
    for (let j = 0; j < mealCount; j++) {
      const isJunk = Math.random() < dayJunkChance;
      const filtered = dayPalette.filter(m => isJunk ? m.cat === 'junk' : m.cat !== 'junk');
      const item = filtered[Math.floor(Math.random() * filtered.length)] || dayPalette[0];
      
      const hour = [8, 11, 14, 18, 21][Math.min(j, 4)];
      t.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      
      newMeals.push({
        id: Date.now() + Math.random(),
        food: item.food,
        calories: item.cal,
        category: item.cat,
        mood: ['happy', 'normal', 'stressed', 'tired'][Math.floor(Math.random()*4)],
        time: t.toISOString()
      });
    }
  }

  // Overwrite existing user's meals with custom batch
  localStorage.setItem('nm_meals', JSON.stringify(newMeals));
}

// ── STREAK RENDERER ───────────────────────────────────────────
function renderStreaks() {
  const streak = Streaks.getStreak();
  const best = Streaks.getBestStreak();

  const curEl = document.getElementById('streak-current');
  const bestEl = document.getElementById('streak-best');
  if (!curEl) return;

  // Animate counter
  let c = 0;
  const step = Math.max(1, Math.ceil(streak / 20));
  const timer = setInterval(() => {
    c = Math.min(c + step, streak);
    curEl.textContent = c;
    if (c >= streak) clearInterval(timer);
  }, 60);

  if (bestEl) bestEl.textContent = best;

  // Mini calendar dots (last 7 days)
  const calEl = document.getElementById('streak-cal');
  if (calEl) {
    const meals = Store.getMeals();
    const dots = Array(7).fill(0).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const logged = meals.some(m => new Date(m.time).toDateString() === d.toDateString());
      return `<div class="scal-dot ${logged ? 'filled' : ''}" title="${d.toLocaleDateString('en',{weekday:'short'})}"></div>`;
    });
    calEl.innerHTML = dots.join('');
  }

  // Update habit tracker streak too
  const hsStreak = document.getElementById('hs-streak');
  if (hsStreak) hsStreak.textContent = streak;
}

// ── DEMO USERS RENDERER ───────────────────────────────────────
function renderDemoUsers() {
  const container = document.getElementById('demo-users-row');
  if (!container) return;
  const demoUsers = Streaks.getDemoUsers();
  const auth = JSON.parse(localStorage.getItem('nm_auth') || 'null');
  const currentName = auth?.name;

  container.innerHTML = demoUsers.map(u => `
    <div class="demo-user-card ${currentName === u.name ? 'current' : ''}" onclick="Streaks.switchDemoUser('${u.name}')">
      <div class="du-avatar" style="background:${u.color}">${u.avatar}</div>
      <div class="du-info">
        <div class="du-name">${u.name} ${currentName === u.name ? '✓' : ''}</div>
        <div class="du-meta">
          🔥 ${u.streak}d streak &nbsp;
          <span class="du-score">${u.score}</span>
        </div>
      </div>
    </div>`).join('');
}

// ── ACHIEVEMENTS RENDERER ─────────────────────────────────────
function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  const achievements = Streaks.getAchievements();
  const prev = JSON.parse(localStorage.getItem('nm_prev_achievements') || '[]');

  grid.innerHTML = achievements.map(a => `
    <div class="badge-card ${a.unlocked ? 'unlocked' : 'locked'}" onclick="${a.unlocked ? `showBadgeDetail('${a.id}','${a.icon}','${a.title}','${a.desc}')` : ''}"
         style="${a.unlocked ? `border-color:${a.color}33` : ''}">
      <div class="badge-glow" style="background:${a.unlocked ? a.color + '22' : 'rgba(255,255,255,0.04)'}; color:${a.color}">
        <span style="font-size:2rem">${a.icon}</span>
      </div>
      <div class="badge-title" style="color:${a.unlocked ? a.color : 'var(--text-muted)'}">${a.title}</div>
      <div class="badge-desc">${a.desc}</div>
      <span class="badge-status ${a.unlocked ? 'done' : 'pend'}">
        ${a.unlocked ? '✅ Unlocked' : '🔒 Locked'}
      </span>
    </div>`).join('');

  // Check for newly unlocked achievements
  achievements.filter(a => a.unlocked && !prev.includes(a.id)).forEach(a => {
    setTimeout(() => showUnlockPop(a), 500);
  });
  localStorage.setItem('nm_prev_achievements', JSON.stringify(achievements.filter(a => a.unlocked).map(a => a.id)));
}

function showBadgeDetail(id, icon, title, desc) {
  showUnlockPop({ icon, title, desc });
}

function showUnlockPop(achievement) {
  document.getElementById('up-icon').textContent = achievement.icon;
  document.getElementById('up-title').textContent = `🎉 ${achievement.title}`;
  document.getElementById('up-desc').textContent = achievement.desc;
  document.getElementById('unlock-pop').classList.add('show');
  document.getElementById('unlock-overlay').style.display = 'block';
}

function closeUnlockPop() {
  document.getElementById('unlock-pop')?.classList.remove('show');
  const ov = document.getElementById('unlock-overlay');
  if (ov) ov.style.display = 'none';
}
function startAppUI() {
  const onboarding = document.getElementById('onboarding-overlay');
  const checkin = document.getElementById('daily-checkin-modal');
  const app = document.getElementById('app');
  
  if (onboarding) onboarding.style.display = 'none';
  if (checkin) checkin.style.display = 'none';
  if (app) app.style.display = 'flex';
  document.body.style.overflow = '';

  updateSidebarUser();
  startClock();
  initSidebar();
  initMoodPage();
  Chat.init();
  Notifications.scheduleSmartAlerts();
  renderDashboard();
  renderStreaks();
  renderDemoUsers();

  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'flex';
}

function initApp() {
  const user = Store.getUser();

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Setup form handlers
  initDailyCheckIn();
  initOnboarding();
  initSidebar();
  
  // Reset all overlay states
  document.getElementById('onboarding-overlay').style.display = 'none';
  document.getElementById('daily-checkin-modal').style.display = 'none';
  document.getElementById('app').style.display = 'none';

  // Check flow and show appropriate screen
  if (!isOnboardingComplete(user)) {
    document.getElementById('onboarding-overlay').style.display = 'flex';
    return;
  }

  // Daily check-in popup removed — go straight to dashboard
  startAppUI();
}

// ── BOOTSTRAP ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash-cinematic');
  
  if (splash) {
     setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.style.display = 'none', 1000);
        bootstrapApp();
     }, 4000); // 4 seconds of animation
  } else {
     bootstrapApp();
  }
});

function bootstrapApp() {
  const user = Store.getUser();

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  initOnboarding(); // always set up onboarding handlers
  
  // Pre-fill onboarding fields if data exists
  if (user.name) {
    const obName = document.getElementById('ob-name');
    if (obName) obName.value = user.name;
  }
  if (user.email) {
    const obEmail = document.getElementById('ob-email');
    if (obEmail) obEmail.value = user.email;
  }

  Store.initializeStreakFromMeals();
  seedSampleData();
  initApp();
}
