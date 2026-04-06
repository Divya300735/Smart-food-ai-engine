/* store.js – Dynamic data layer with intelligent health scoring */
const Store = (() => {
  const KEY_USER  = 'nm_user';
  const KEY_MEALS = 'nm_meals';
  const KEY_WATER = 'nm_water';
  const KEY_NOTIFS= 'nm_notifs';
  const KEY_STREAK= 'nm_streak';

  function getUser() { try { return JSON.parse(localStorage.getItem(KEY_USER)); } catch { return null; } }
  function saveUser(u) { localStorage.setItem(KEY_USER, JSON.stringify(u)); }

  function getMeals() { try { return JSON.parse(localStorage.getItem(KEY_MEALS)) || []; } catch { return []; } }
  function saveMeal(m) {
    const meals = getMeals();
    meals.push({ ...m, id: Date.now(), time: new Date().toISOString() });
    localStorage.setItem(KEY_MEALS, JSON.stringify(meals));
    
    // Update streak after meal submission
    updateStreakAfterMeal();
    
    return meals;
  }
  
  // ── STREAK MANAGEMENT ───────────────────────────────────────
  function getStreakData() {
    try { return JSON.parse(localStorage.getItem(KEY_STREAK)) || { current: 0, best: 0, lastLoginDate: null }; } 
    catch { return { current: 0, best: 0, lastLoginDate: null }; }
  }
  
  function saveStreakData(streakData) {
    localStorage.setItem(KEY_STREAK, JSON.stringify(streakData));
  }
  
  function updateStreakAfterMeal() {
    const streakData = getStreakData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toDateString();
    
    // Check if already logged today
    if (streakData.lastLoginDate === todayStr) {
      // Already logged today, don't update streak
      return;
    }
    
    // Check if yesterday was logged (continuation)
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (streakData.lastLoginDate === yesterdayStr) {
      // Continue streak
      streakData.current += 1;
    } else {
      // Start new streak (either first time or after break)
      streakData.current = 1;
    }
    
    // Update best streak
    if (streakData.current > streakData.best) {
      streakData.best = streakData.current;
    }
    
    // Update last login date
    streakData.lastLoginDate = todayStr;
    
    // Save streak data
    saveStreakData(streakData);
  }
  
  // Calculate streak from existing meal data (for demo users and initial setup)
  function calculateStreakFromMeals() {
    const meals = getMeals();
    if (meals.length === 0) return 0;
    
    // Get unique dates from meals
    const mealDates = [...new Set(meals.map(meal => 
      new Date(meal.time).toDateString()
    ))];
    
    // Sort dates in descending order (newest to oldest)
    mealDates.sort((a, b) => new Date(b) - new Date(a));
    
    // Calculate consecutive days from today backward
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < mealDates.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      const mealDate = new Date(mealDates[i]);
      mealDate.setHours(0, 0, 0, 0);
      
      if (expectedDate.toDateString() === mealDate.toDateString()) {
        streak++;
      } else {
        break; // Break on first gap
      }
    }
    
    return streak;
  }
  
  // Initialize streak from meal data (for demo users)
  function initializeStreakFromMeals() {
    const calculatedStreak = calculateStreakFromMeals();
    const streakData = getStreakData();
    
    // Only update if calculated streak is different and valid
    if (calculatedStreak > 0 && calculatedStreak !== streakData.current) {
      streakData.current = calculatedStreak;
      if (calculatedStreak > streakData.best) {
        streakData.best = calculatedStreak;
      }
      
      // Set last login date to most recent meal date
      const meals = getMeals();
      if (meals.length > 0) {
        const latestMeal = meals.reduce((latest, meal) => 
          new Date(meal.time) > new Date(latest.time) ? meal : latest
        );
        streakData.lastLoginDate = new Date(latestMeal.time).toDateString();
      }
      
      saveStreakData(streakData);
    }
  }
  
  function getCurrentStreak() {
    const streakData = getStreakData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toDateString();
    
    // Check if streak is still valid (no missed days)
    if (streakData.lastLoginDate) {
      const lastLogin = new Date(streakData.lastLoginDate);
      const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        // Missed more than 1 day, reset streak
        streakData.current = 0;
        streakData.lastLoginDate = null;
        saveStreakData(streakData);
      }
    }
    
    return streakData.current;
  }
  
  function getBestStreak() {
    return getStreakData().best;
  }
  
  // ── BMI & HEALTH CALCULATIONS ───────────────────────────────────
  function calculateBMI(weight, height) {
    if (!weight || !height) return null;
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  }
  
  function getBMICategory(bmi) {
    if (!bmi) return null;
    if (bmi < 18.5) return { category: 'Underweight', color: '#3b82f6', risk: 'Low' };
    if (bmi < 25) return { category: 'Normal', color: '#10b981', risk: 'Normal' };
    if (bmi < 30) return { category: 'Overweight', color: '#f59e0b', risk: 'Moderate' };
    return { category: 'Obese', color: '#ef4444', risk: 'High' };
  }
  
  function calculateDailyCalories(user) {
    if (!user || !user.weight || !user.height || !user.age) return 2000;
    
    // Mifflin-St Jeor Equation
    let bmr;
    if (user.gender === 'female') {
      bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
    } else {
      bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
    }
    
    // Activity factor (assuming lightly active)
    const activityFactor = 1.375;
    const tdee = bmr * activityFactor;
    
    // Adjust based on goal
    if (user.goal === 'Weight Loss') return Math.round(tdee - 500);
    if (user.goal === 'Weight Gain') return Math.round(tdee + 500);
    return Math.round(tdee);
  }
  
  function getPersonalizedInsights(user) {
    if (!user) return [];
    const insights = [];
    const meals = getMeals();
    const todayMeals = getTodayMeals();
    
    // BMI Insight
    if (user.weight && user.height) {
      const bmi = calculateBMI(user.weight, user.height);
      const bmiInfo = getBMICategory(bmi);
      insights.push({
        type: 'bmi',
        title: `BMI: ${bmi} (${bmiInfo.category})`,
        description: `Your BMI is ${bmi}. This is considered ${bmiInfo.category.toLowerCase()} weight.`,
        color: bmiInfo.color,
        icon: 'fa-weight-scale'
      });
    }
    
    // Calorie Target Insight
    const dailyCalories = calculateDailyCalories(user);
    const todayCalories = todayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    insights.push({
      type: 'calories',
      title: `Daily Target: ${dailyCalories} kcal`,
      description: `You've consumed ${todayCalories} kcal today. ${dailyCalories - todayCalories > 0 ? dailyCalories - todayCalories + ' kcal remaining.' : 'Target reached!'}`,
      color: todayCalories > dailyCalories ? '#ef4444' : '#10b981',
      icon: 'fa-fire'
    });
    
    // Sleep Insight
    if (user.sleep) {
      insights.push({
        type: 'sleep',
        title: `Sleep Target: ${user.sleep} hours`,
        description: user.sleep >= 7 ? 'Great! You\'re getting adequate sleep.' : 'Consider getting more sleep for better health.',
        color: user.sleep >= 7 ? '#10b981' : '#f59e0b',
        icon: 'fa-moon'
      });
    }
    
    // Meal Consistency Insight
    if (todayMeals.length >= 3) {
      insights.push({
        type: 'consistency',
        title: 'Great Meal Consistency!',
        description: 'You\'ve logged all main meals today. Keep it up!',
        color: '#10b981',
        icon: 'fa-check-circle'
      });
    }
    
    return insights;
  }
  function deleteMeal(id) {
    const meals = getMeals().filter(m => m.id !== id);
    localStorage.setItem(KEY_MEALS, JSON.stringify(meals));
    return meals;
  }
  function getTodayMeals() {
    const today = new Date().toDateString();
    return getMeals().filter(m => new Date(m.time).toDateString() === today);
  }

  function getWater() {
    const today = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem(KEY_WATER) || '{}');
    return data[today] || 0;
  }
  function addWater() {
    const today = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem(KEY_WATER) || '{}');
    data[today] = Math.min((data[today] || 0) + 1, 12);
    localStorage.setItem(KEY_WATER, JSON.stringify(data));
    return data[today];
  }

  /* ── DYNAMIC HEALTH SCORE ─────────────────────────────────────
     Based on: meal diversity, junk ratio, late-night eating,
     sleep hours, water intake, calorie balance, streak
  ──────────────────────────────────────────────────────────────*/
  function getHealthScore() {
    const meals = Store.getMeals();
    const user = getUser();
    if (meals.length === 0) return 50; // No data yet

    let score = 50; // Base

    // ── Meal diversity (last 14 meals)
    const recent = meals.slice(-14);
    const uniqueCats = new Set(recent.map(m => m.category)).size;
    score += Math.min(uniqueCats * 4, 16); // max +16

    // ── Healthy vs junk ratio (last 14)
    const totalRecent = recent.length;
    const healthyCount = recent.filter(m => !['junk'].includes(m.category)).length;
    const healthyRatio = healthyCount / Math.max(totalRecent, 1);
    score += Math.round(healthyRatio * 20); // max +20

    // ── Junk food penalty (last 7 days)
    const junk7 = meals.slice(-7).filter(m => m.category === 'junk').length;
    score -= junk7 * 7; // -7 per junk meal

    // ── Late-night eating penalty
    const lateNight = meals.filter(m => {
      const h = new Date(m.time).getHours();
      return h >= 22 || h <= 4;
    }).length;
    score -= Math.min(lateNight * 3, 15); // max -15

    // ── Calorie balance bonus (today)
    const todayMeals = getTodayMeals();
    const todayCal = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
    const target = (user?.weight || 65) * 28; // rough TDEE
    if (todayCal > 0) {
      const ratio = todayCal / target;
      if (ratio >= 0.8 && ratio <= 1.2) score += 8; // on target
      else if (ratio < 0.6 || ratio > 1.5) score -= 6; // too far
    }

    // ── Water intake bonus
    const water = getWater();
    if (water >= 8) score += 8;
    else if (water >= 5) score += 4;

    // ── Sleep bonus
    const sleepHrs = user?.sleepHours || 6;
    if (sleepHrs >= 8) score += 8;
    else if (sleepHrs >= 7) score += 5;
    else if (sleepHrs < 6) score -= 5;

    // ── Meal consistency bonus (ate today)
    if (todayMeals.length >= 3) score += 6;
    else if (todayMeals.length >= 1) score += 2;

    // ── Diet type bonus
    if (user?.diet === 'Vegan') score += 4;
    else if (user?.diet === 'Veg') score += 2;

    return Math.max(5, Math.min(100, Math.round(score)));
  }

  /* ── PATTERN DETECTION ───────────────────────────────────────*/
  function getPatterns() {
    const meals = getMeals();
    const patterns = [];

    // Late-night eating
    const lateNight = meals.filter(m => {
      const h = new Date(m.time).getHours();
      return h >= 22 || h <= 4;
    });
    if (lateNight.length >= 2) {
      patterns.push({
        type: 'late_night', severity: 'warning',
        message: `Late-night eating detected (${lateNight.length} times)`,
        suggestion: 'Try herbal tea or light fruit after 10 PM.', icon: '🌙'
      });
    }

    // Junk food frequency
    const junk = meals.filter(m => m.category === 'junk');
    if (junk.length >= 2) {
      patterns.push({
        type: 'junk_food', severity: 'danger',
        message: `High junk food frequency (${junk.length} meals)`,
        suggestion: 'Prepare healthy alternatives in advance.', icon: '🍔'
      });
    }

    // Skipped meals
    const today = new Date().toDateString();
    const todayMeals = meals.filter(m => new Date(m.time).toDateString() === today);
    const hr = new Date().getHours();
    if (hr >= 14 && todayMeals.length < 2) {
      patterns.push({
        type: 'skip', severity: 'warning',
        message: "You've skipped meals today!",
        suggestion: 'Eat small frequent meals every 3–4 hours.', icon: '⏰'
      });
    }

    // Calorie surplus
    const todayCal = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
    if (todayCal > 2400) {
      patterns.push({
        type: 'overeat', severity: 'warning',
        message: `High calorie day: ${todayCal} kcal consumed`,
        suggestion: 'Keep dinner very light tonight.', icon: '⚡'
      });
    }

    return patterns;
  }

  function getNotifications() { try { return JSON.parse(localStorage.getItem(KEY_NOTIFS)) || []; } catch { return []; } }
  function addNotification(n) {
    const notifs = getNotifications();
    notifs.unshift({ ...n, id: Date.now(), time: new Date().toISOString() });
    localStorage.setItem(KEY_NOTIFS, JSON.stringify(notifs.slice(0, 20)));
  }

  return { 
    getUser, saveUser, 
    getMeals, saveMeal, deleteMeal, getTodayMeals, 
    getWater, addWater, 
    getHealthScore, getPatterns, 
    getNotifications, addNotification,
    getCurrentStreak, getBestStreak, getStreakData, saveStreakData,
    calculateStreakFromMeals, initializeStreakFromMeals,
    calculateBMI, getBMICategory, calculateDailyCalories, getPersonalizedInsights,
    // Debug function for testing
    debugStreak: () => {
      const data = getStreakData();
      console.log('Streak Debug:', {
        current: data.current,
        best: data.best,
        lastLoginDate: data.lastLoginDate,
        today: new Date().toDateString(),
        yesterday: new Date(Date.now() - 86400000).toDateString(),
        calculatedStreak: calculateStreakFromMeals()
      });
      return data;
    }
  };
})();
