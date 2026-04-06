/* streaks.js – Streak System, Achievements, Demo Users */
const Streaks = (() => {

  // ── STREAK CALCULATION ───────────────────────────────────────
  function getStreak() {
    // Use Store's persistent streak system instead of calculation
    return Store.getCurrentStreak();
  }

  function getBestStreak() {
    // Use Store's persistent best streak
    return Store.getBestStreak();
  }

  // ── ACHIEVEMENTS ─────────────────────────────────────────────
  const ACHIEVEMENTS = [
    { id:'first_log',   icon:'🌟', title:'First Step',        desc:'Log your very first meal',              color:'#f59e0b', check: (meals,streak) => meals.length >= 1 },
    { id:'streak_3',    icon:'🥇', title:'3-Day Consistency', desc:'Log meals for 3 consecutive days',       color:'#6366f1', check: (meals,streak) => streak >= 3 },
    { id:'streak_7',    icon:'🥈', title:'7-Day Healthy Streak', desc:'7 days of consistent meal logging',   color:'#8b5cf6', check: (meals,streak) => streak >= 7 },
    { id:'no_junk',     icon:'🥉', title:'No Junk Champion',  desc:'Log a full day with zero junk food',    color:'#10b981', check: (meals) => {
      const today = new Date().toDateString();
      const todayMeals = meals.filter(m => new Date(m.time).toDateString() === today);
      return todayMeals.length >= 2 && !todayMeals.some(m => m.category === 'junk');
    }},
    { id:'balanced',    icon:'💪', title:'Balanced Diet Master', desc:'Log breakfast, lunch & dinner in one day', color:'#06b6d4', check: (meals) => {
      const today = new Date().toDateString();
      const cats = meals.filter(m => new Date(m.time).toDateString() === today).map(m => m.category);
      return cats.includes('breakfast') && cats.includes('lunch') && cats.includes('dinner');
    }},
    { id:'hydration',   icon:'💧', title:'Hydration Hero',    desc:'Drink 6+ glasses of water in a day',     color:'#0ea5e9', check: () => Store.getWater() >= 6 },
    { id:'healthy_10',  icon:'🏆', title:'Health Champion',   desc:'Log 10+ meals total',                    color:'#f59e0b', check: (meals) => meals.length >= 10 },
    { id:'score_80',    icon:'⭐', title:'High Achiever',     desc:'Reach a health score of 80+',            color:'#ec4899', check: () => Store.getHealthScore() >= 80 },
  ];

  function getAchievements() {
    const meals = Store.getMeals();
    const streak = getStreak();
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: a.check(meals, streak)
    }));
  }

  // ── DEMO USERS ───────────────────────────────────────────────
  const DEMO_USERS = [
    { name:'Divya',  avatar:'D', color:'linear-gradient(135deg,#ec4899,#f59e0b)', score:72, streak:2, goal:'Weight Loss', age:24, weight:68, height:162, sleepTime:'23:30', wakeTime:'07:30', sleepHours:8, diet:'Veg' },
    { name:'Rahul',  avatar:'R', color:'linear-gradient(135deg,#6366f1,#8b5cf6)', score:84, streak:3, goal:'Muscle Gain', age:28, weight:80, height:180, sleepTime:'22:00', wakeTime:'06:00', sleepHours:8, diet:'NonVeg' },
    { name:'Priya',  avatar:'P', color:'linear-gradient(135deg,#10b981,#06b6d4)', score:61, streak:2, goal:'Healthy Eating', age:30, weight:65, height:158, sleepTime:'01:00', wakeTime:'07:00', sleepHours:6, diet:'Vegan' },
    { name:'Aman',   avatar:'A', color:'linear-gradient(135deg,#f59e0b,#ef4444)', score:48, streak:1, goal:'Energy Boost', age:22, weight:75, height:175, sleepTime:'02:00', wakeTime:'07:00', sleepHours:5, diet:'Mixed' },
    { name:'Sneha',  avatar:'S', color:'linear-gradient(135deg,#8b5cf6,#ec4899)', score:88, streak:3, goal:'Weight Loss', age:26, weight:62, height:165, sleepTime:'22:30', wakeTime:'06:30', sleepHours:8, diet:'Veg' },
  ];

  function getDemoUsers() { return DEMO_USERS; }

  function switchDemoUser(name) {
    const email = `${name.toLowerCase()}@demo.com`;
    const mealsKey = `nm_meals_${name.toLowerCase()}`;
    const userMeals = JSON.parse(localStorage.getItem(mealsKey) || '[]');
    localStorage.setItem('nm_meals', JSON.stringify(userMeals));

    const accounts = JSON.parse(localStorage.getItem('nm_accounts') || '{}');
    if (accounts[email]) {
      localStorage.setItem('nm_user', JSON.stringify(accounts[email]));
      localStorage.setItem('nm_auth', JSON.stringify({ email, name }));
    }
    // Reload page to refresh all state
    window.location.reload();
  }

  return { getStreak, getBestStreak, getAchievements, getDemoUsers, switchDemoUser, ACHIEVEMENTS };
})();
