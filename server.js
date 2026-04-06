const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// File upload setup (Vercel requires writing to /tmp)
const tmpUploadsDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path.join(__dirname, 'uploads');
const upload = multer({ dest: tmpUploadsDir, limits: { fileSize: 10 * 1024 * 1024 } });
if (!fs.existsSync(tmpUploadsDir)) fs.mkdirSync(tmpUploadsDir, { recursive: true });

// Load food database
const foodDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'foods.json'), 'utf8'));

// In-memory user store (in production, use MongoDB)
let users = {};
let meals = {};
let habits = {};

// ─── AI ENGINE ────────────────────────────────────────────────────────────────
function getHealthScore(userId) {
  const userMeals = meals[userId] || [];
  const userHabits = habits[userId] || {};
  
  let score = 70;
  
  // Meal diversity bonus
  const categories = new Set(userMeals.slice(-14).map(m => m.category));
  score += Math.min(categories.size * 3, 15);
  
  // Junk food penalty
  const junkCount = userMeals.slice(-7).filter(m => m.category === 'junk').length;
  score -= junkCount * 5;
  
  // Skipped meals penalty
  const skippedToday = userHabits.skippedMeals || 0;
  score -= skippedToday * 3;
  
  // Sleep bonus
  const sleepHours = userHabits.sleepHours || 7;
  if (sleepHours >= 7 && sleepHours <= 9) score += 10;
  else if (sleepHours < 6) score -= 10;
  
  // Late-night eating penalty
  const lateNightMeals = userMeals.filter(m => {
    const hour = new Date(m.time).getHours();
    return hour >= 22 || hour <= 4;
  }).length;
  score -= lateNightMeals * 4;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function detectPatterns(userId) {
  const userMeals = meals[userId] || [];
  const patterns = [];
  
  // Late-night eating
  const lateNight = userMeals.filter(m => {
    const h = new Date(m.time).getHours();
    return h >= 22 || h <= 3;
  });
  if (lateNight.length >= 2) {
    patterns.push({
      type: 'late_night',
      severity: 'warning',
      message: `You've eaten late at night ${lateNight.length} times recently.`,
      suggestion: 'Try herbal tea or a small fruit instead after 10 PM.',
      icon: '🌙'
    });
  }
  
  // Junk food pattern
  const junk = userMeals.filter(m => m.category === 'junk');
  if (junk.length >= 3) {
    patterns.push({
      type: 'junk_food',
      severity: 'danger',
      message: `High junk food frequency detected (${junk.length} times).`,
      suggestion: 'Prepare healthy snacks in advance to reduce cravings.',
      icon: '🍔'
    });
  }
  
  // Meal skipping
  const today = new Date().toDateString();
  const todayMeals = userMeals.filter(m => new Date(m.time).toDateString() === today);
  const hour = new Date().getHours();
  if (hour >= 14 && todayMeals.length < 2) {
    patterns.push({
      type: 'skipping_meals',
      severity: 'warning',
      message: "You've skipped meals today.",
      suggestion: 'Skipping meals slows metabolism. Eat small, frequent meals.',
      icon: '⏰'
    });
  }
  
  return patterns;
}

function predictCravings(userId) {
  const userMeals = meals[userId] || [];
  const hour = new Date().getHours();
  
  const predictions = [];
  
  // Late-night craving prediction
  if (hour >= 20 && hour < 22) {
    const lateNightJunk = userMeals.filter(m => {
      const h = new Date(m.time).getHours();
      return (h >= 22 || h <= 3) && m.category === 'junk';
    });
    if (lateNightJunk.length >= 1) {
      predictions.push({
        time: '10:00 PM',
        craving: 'Junk Food',
        probability: Math.min(95, 60 + lateNightJunk.length * 10),
        prevention: 'Prepare mixed nuts or Greek yogurt now!',
        icon: '🔮'
      });
    }
  }
  
  // Stress eating prediction
  const stressMeals = userMeals.filter(m => m.mood === 'stressed');
  if (stressMeals.length >= 2) {
    predictions.push({
      time: 'Afternoon slump (3-4 PM)',
      craving: 'Sugary snacks',
      probability: 72,
      prevention: 'Drink water + eat protein-rich snack at 2 PM.',
      icon: '😤'
    });
  }
  
  // Default prediction if no history
  if (predictions.length === 0) {
    predictions.push({
      time: 'Tonight at 10 PM',
      craving: 'Sweet/Salty snacks',
      probability: 45,
      prevention: 'Log your meals to get personalized predictions!',
      icon: '🎯'
    });
  }
  
  return predictions;
}

function getContextualSuggestion(weather, timeOfDay) {
  let suggestions = [];
  const hour = parseInt(timeOfDay) || new Date().getHours();
  
  // Time-based
  if (hour >= 6 && hour < 10) {
    suggestions.push(...foodDB.foods.filter(f => f.category === 'breakfast').slice(0, 3));
  } else if (hour >= 12 && hour < 15) {
    suggestions.push(...foodDB.foods.filter(f => f.category === 'lunch').slice(0, 3));
  } else if (hour >= 18 && hour < 21) {
    suggestions.push(...foodDB.foods.filter(f => f.category === 'dinner').slice(0, 3));
  } else {
    suggestions.push(...foodDB.foods.filter(f => f.category === 'snack').slice(0, 3));
  }
  
  // Weather-based override
  if (weather && foodDB.weatherFoods[weather]) {
    const weatherFoodNames = foodDB.weatherFoods[weather];
    const weatherFoods = foodDB.foods.filter(f => weatherFoodNames.includes(f.name));
    if (weatherFoods.length > 0) {
      suggestions = [...weatherFoods, ...suggestions].slice(0, 4);
    }
  }
  
  return [...new Map(suggestions.map(s => [s.name, s])).values()].slice(0, 4);
}

function generateDailyReport(userId) {
  const userMeals = meals[userId] || [];
  const today = new Date().toDateString();
  const todayMeals = userMeals.filter(m => new Date(m.time).toDateString() === today);
  
  const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const healthScore = getHealthScore(userId);
  const patterns = detectPatterns(userId);
  
  const mistakes = patterns.map(p => p.message);
  const suggestions = [
    totalCalories < 1200 ? 'You\'re under your calorie goal — eat a balanced snack.' : null,
    totalCalories > 2500 ? 'Calorie intake is high today — balance with light dinner.' : null,
    todayMeals.filter(m => m.category === 'junk').length > 1 ? 'Too many junk meals today — reset tomorrow!' : null,
    'Stay hydrated — aim for 8 glasses of water.',
    'Add more vegetables to your next meal.'
  ].filter(Boolean);
  
  return {
    date: new Date().toLocaleDateString(),
    totalCalories,
    mealsLogged: todayMeals.length,
    healthScore,
    mistakes,
    suggestions,
    moodTrend: todayMeals.map(m => m.mood).filter(Boolean),
    topFood: todayMeals[0]?.food || 'No meals logged yet'
  };
}

// Chat AI Engine
function processChat(message, userId, userData) {
  const msg = message.toLowerCase();
  const userMeals = meals[userId] || [];
  const score = getHealthScore(userId);
  
  // Pattern matching responses
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hello! 👋 I'm NutriMind AI, your personal nutrition assistant. Your current health score is **${score}/100**. How can I help you eat better today?`;
  }
  
  if (msg.includes('health score') || msg.includes('score')) {
    return `Your current health score is **${score}/100** 🏆\n\n${
      score >= 80 ? '🟢 Excellent! Keep up the great work!' :
      score >= 60 ? '🟡 Good progress, but room for improvement.' :
      '🔴 Let\'s work on improving your habits!'
    }\n\nKey factors affecting your score:\n• Meal diversity\n• Junk food frequency\n• Sleep patterns\n• Meal timing consistency`;
  }
  
  if (msg.includes('breakfast') || msg.includes('morning')) {
    return `🌅 **Great breakfast options for you:**\n\n1. **Oatmeal with Berries** (150 cal) — High fiber, keeps you full\n2. **Egg White Omelette** (140 cal) — Protein powerhouse\n3. **Smoothie Bowl** (280 cal) — Nutrient-dense & energizing\n4. **Avocado Toast** (310 cal) — Healthy fats for sustained energy\n\nTip: Eat breakfast within 1 hour of waking up for best metabolism boost! ⚡`;
  }
  
  if (msg.includes('lunch') || msg.includes('afternoon')) {
    return `☀️ **Smart lunch ideas:**\n\n1. **Grilled Chicken Salad** (320 cal) — High protein, low carb\n2. **Quinoa Bowl** (350 cal) — Complete protein + fiber\n3. **Lentil Soup** (230 cal) — Heart-healthy & filling\n\nRule: Make your lunch plate 50% veggies, 25% protein, 25% complex carbs! 🥗`;
  }
  
  if (msg.includes('dinner') || msg.includes('evening') || msg.includes('night')) {
    return `🌙 **Light dinner recommendations:**\n\n1. **Salmon with Brown Rice** (420 cal) — Omega-3 rich\n2. **Lentil Soup** (230 cal) — Easy digestion\n3. **Grilled Veggies + Tofu** (250 cal) — Plant-based power\n\n⚠️ Try to finish dinner by 8 PM for better sleep quality and metabolism!`;
  }
  
  if (msg.includes('stress') || msg.includes('anxious') || msg.includes('anxiety')) {
    return `😌 **Stress-busting foods:**\n\n1. **Dark Chocolate** — Reduces cortisol hormone\n2. **Mixed Nuts** — Magnesium calms the nervous system\n3. **Green Tea** — L-theanine promotes relaxation\n4. **Blueberries** — Antioxidants fight stress damage\n5. **Oatmeal** — Boosts serotonin naturally\n\nDeep breathing tip: Breathe in for 4 counts, hold for 4, out for 4. 🧘`;
  }
  
  if (msg.includes('weight loss') || msg.includes('lose weight') || msg.includes('diet')) {
    return `⚖️ **Smart weight loss strategy:**\n\n• **Calorie deficit**: Eat 300-500 cal less than you burn\n• **Protein priority**: 1.6g per kg bodyweight\n• **Timing**: Don't eat past 8 PM\n• **Hydration**: Drink water before each meal\n\n**Your personalized targets:**\n• Breakfast: 300-400 cal\n• Lunch: 400-500 cal\n• Dinner: 300-400 cal\n• Snacks: 100-150 cal\n\nRemember: Sustainable loss = 0.5-1 kg per week 🎯`;
  }
  
  if (msg.includes('junk') || msg.includes('craving') || msg.includes('chips') || msg.includes('pizza')) {
    return `🍕 **Beat junk food cravings:**\n\n**Smart swaps:**\n• Pizza → Cauliflower pizza (saves 135 cal)\n• Chips → Roasted chickpeas (same crunch!)\n• Ice cream → Frozen banana nice cream\n• Soda → Sparkling water with lemon\n\n**Why you crave junk:**\n• Low blood sugar → eat protein snacks\n• Stress → try exercise or meditation\n• Boredom → prep healthy snacks in advance\n\nYou've got this! 💪`;
  }
  
  if (msg.includes('water') || msg.includes('hydrat')) {
    return `💧 **Hydration guide:**\n\n• **Daily target**: 2.5-3 liters (8-10 glasses)\n• **Morning**: 2 glasses on empty stomach\n• **Before meals**: 1 glass (reduces overeating)\n• **During workout**: 500ml per hour\n\n**Hydrating foods:**\n• Watermelon (92% water)\n• Cucumber (96% water)\n• Strawberries (91% water)\n\nPro tip: If your urine is pale yellow, you're well hydrated! 🟡`;
  }
  
  if (msg.includes('sleep') || msg.includes('tired') || msg.includes('fatigue')) {
    return `😴 **Sleep & nutrition connection:**\n\n**Sleep-promoting foods (eat 2hr before bed):**\n• Cherries — natural melatonin\n• Almonds — magnesium for relaxation\n• Chamomile tea — reduces anxiety\n• Oatmeal — serotonin precursor\n\n**Avoid before sleep:**\n• ☕ Caffeine (after 3 PM)\n• 🍟 Heavy, fatty meals\n• 🍬 Sugary foods\n\nTarget: 7-9 hours of quality sleep = better food choices next day! 🌙`;
  }
  
  if (msg.includes('meal plan') || msg.includes('plan')) {
    return `📅 **Your personalized meal plan:**\n\n**Monday–Friday:**\n• 🌅 Breakfast (7-8 AM): Oatmeal + Greek Yogurt\n• 🍎 Snack (10 AM): Mixed Nuts\n• ☀️ Lunch (1 PM): Quinoa Bowl\n• 🍌 Snack (4 PM): Banana + Peanut Butter\n• 🌙 Dinner (7 PM): Salmon + Veggies\n\n**Weekend:**\n• More flexibility allowed\n• Meal prep Sunday for the week\n\nTotal: ~1800 cal/day | 140g protein | 200g carbs | 60g fat`;
  }
  
  if (msg.includes('calor')) {
    const todayMeals = userMeals.filter(m => new Date(m.time).toDateString() === new Date().toDateString());
    const cal = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
    return `🔥 **Today's calorie summary:**\n\n• **Consumed**: ${cal} calories\n• **Target**: 1800 calories\n• **Remaining**: ${Math.max(0, 1800 - cal)} calories\n\n${
      cal < 1200 ? '⚠️ You\'re eating too little! Add a protein-rich meal.' :
      cal > 2200 ? '⚠️ Slightly over target. Keep dinner light.' :
      '✅ You\'re on track! Great discipline.'
    }`;
  }
  
  if (msg.includes('vitamin') || msg.includes('nutrient') || msg.includes('mineral')) {
    return `💊 **Essential nutrients to focus on:**\n\n• **Vitamin D**: Sunlight + Salmon + Eggs\n• **Vitamin C**: Citrus fruits + Bell peppers\n• **Iron**: Spinach + Lentils + Beef\n• **Calcium**: Dairy + Leafy greens + Tofu\n• **Omega-3**: Salmon + Walnuts + Chia seeds\n• **B12**: Eggs + Dairy + Fortified cereals\n\nBased on your meals, you may be low on **Vitamin D** and **Omega-3**. Consider adding salmon twice a week! 🐟`;
  }
  
  // Default response
  const responses = [
    `Great question! Based on your eating patterns, I recommend focusing on protein-rich meals and staying hydrated. Your health score is **${score}/100**. Want me to create a personalized meal plan? 🥗`,
    `I analyze your nutrition data to provide smart insights. Currently, your biggest opportunity is reducing junk food and adding more vegetables. Try the Quinoa Bowl — it's a nutritional powerhouse! 💪`,
    `As your AI nutrition coach, I notice you could benefit from more consistent meal timing. Try to eat every 3-4 hours to maintain energy and prevent cravings. Need specific food suggestions? 🎯`,
    `Nutrition is highly personal! Tell me more about your goals — weight loss, muscle gain, energy boost, or just healthier habits? I'll create a customized strategy just for you! ✨`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// ─── API ROUTES ───────────────────────────────────────────────────────────────

// User profile
app.get('/api/user/:id', (req, res) => {
  const user = users[req.params.id];
  if (!user) return res.json({ user: null });
  res.json({ user, healthScore: getHealthScore(req.params.id) });
});

app.post('/api/user', (req, res) => {
  const { id, name, age, weight, height, goal, sleepHours, wakeTime, sleepTime, livingType } = req.body;
  const userId = id || 'user_' + Date.now();
  users[userId] = { id: userId, name, age, weight, height, goal, sleepHours, wakeTime, sleepTime, livingType, createdAt: new Date() };
  habits[userId] = { sleepHours: sleepHours || 7, skippedMeals: 0, junkCount: 0 };
  res.json({ success: true, userId, user: users[userId] });
});

// Meals
app.get('/api/meals/:userId', (req, res) => {
  res.json({ meals: meals[req.params.userId] || [] });
});

app.post('/api/meals', (req, res) => {
  const { userId, food, calories, category, mood, notes } = req.body;
  if (!meals[userId]) meals[userId] = [];
  
  const meal = {
    id: Date.now(),
    userId, food, calories: parseInt(calories) || 0,
    category: category || 'other',
    mood: mood || 'neutral',
    notes: notes || '',
    time: new Date().toISOString()
  };
  
  meals[userId].push(meal);
  
  // Update habits
  if (!habits[userId]) habits[userId] = {};
  if (category === 'junk') habits[userId].junkCount = (habits[userId].junkCount || 0) + 1;
  
  res.json({ success: true, meal, healthScore: getHealthScore(userId) });
});

app.delete('/api/meals/:userId/:mealId', (req, res) => {
  if (meals[req.params.userId]) {
    meals[req.params.userId] = meals[req.params.userId].filter(m => m.id != req.params.mealId);
  }
  res.json({ success: true });
});

// AI endpoints
app.get('/api/ai/patterns/:userId', (req, res) => {
  res.json({ patterns: detectPatterns(req.params.userId) });
});

app.get('/api/ai/cravings/:userId', (req, res) => {
  res.json({ predictions: predictCravings(req.params.userId) });
});

app.get('/api/ai/report/:userId', (req, res) => {
  res.json({ report: generateDailyReport(req.params.userId) });
});

app.get('/api/ai/suggest', (req, res) => {
  const { weather, time } = req.query;
  const suggestions = getContextualSuggestion(weather, time);
  res.json({ suggestions });
});

app.post('/api/ai/chat', (req, res) => {
  const { message, userId, userData } = req.body;
  
  // Simulate typing delay
  setTimeout(() => {
    const response = processChat(message, userId || 'guest', userData);
    res.json({ response, timestamp: new Date().toISOString() });
  }, 500 + Math.random() * 1000);
});

app.get('/api/ai/mood/:mood', (req, res) => {
  const moodFoods = foodDB.moodFoods[req.params.mood] || foodDB.moodFoods['happy'];
  const foods = moodFoods.map(name => foodDB.foods.find(f => f.name === name)).filter(Boolean);
  res.json({ foods, mood: req.params.mood });
});

// Food scanner (simulated)
app.post('/api/scan', upload.single('image'), (req, res) => {
  // Simulate food detection with random food from DB
  const detectedFoods = [
    { name: 'Rice Bowl', confidence: 94, calories: 340, protein: 8, carbs: 72, fat: 2 },
    { name: 'Salad', confidence: 89, calories: 120, protein: 4, carbs: 15, fat: 5 },
    { name: 'Sandwich', confidence: 91, calories: 380, protein: 18, carbs: 45, fat: 14 },
    { name: 'Pasta', confidence: 87, calories: 420, protein: 14, carbs: 68, fat: 12 },
    { name: 'Stir Fry', confidence: 82, calories: 290, protein: 22, carbs: 28, fat: 9 }
  ];
  
  const detected = detectedFoods[Math.floor(Math.random() * detectedFoods.length)];
  const swap = foodDB.swaps[detected.name] || {
    alternative: 'Mixed Salad with Protein',
    calories: Math.round(detected.calories * 0.65),
    reason: 'Lower calories with same satisfaction'
  };
  
  // Clean up uploaded file
  if (req.file) {
    fs.unlink(req.file.path, () => {});
  }
  
  setTimeout(() => {
    res.json({ success: true, detected, swap, healthScore: detected.calories < 300 ? 'excellent' : detected.calories < 500 ? 'good' : 'moderate' });
  }, 1500);
});

// Context data (mock weather)
app.get('/api/context', (req, res) => {
  const weathers = ['sunny', 'rainy', 'cold', 'hot'];
  const weather = weathers[Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % weathers.length];
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  
  res.json({
    weather,
    temperature: weather === 'hot' ? 35 : weather === 'cold' ? 12 : 24,
    timeOfDay,
    hour,
    location: 'Your Location',
    recommendations: foodDB.weatherFoods[weather] || []
  });
});

// Health score
app.get('/api/health-score/:userId', (req, res) => {
  res.json({ score: getHealthScore(req.params.userId) });
});

// Grocery suggestions
app.get('/api/grocery/:userId', (req, res) => {
  const userMeals = meals[req.params.userId] || [];
  const recentFoods = userMeals.slice(-14).map(m => m.category);
  
  const proteinCount = recentFoods.filter(c => c === 'protein').length;
  const carbCount = recentFoods.filter(c => c === 'breakfast' || c === 'lunch').length;
  
  const suggestions = {
    essentials: foodDB.groceryItems.protein.slice(0, 3).concat(foodDB.groceryItems.carbs.slice(0, 3)),
    deficiencies: proteinCount < 5 ? ['High protein foods needed!', ...foodDB.groceryItems.protein] : [],
    weekly: Object.values(foodDB.groceryItems).flat().slice(0, 15),
    budget: '₹1200–₹1800 estimated weekly'
  };
  
  res.json({ suggestions });
});

// Digital twin
app.get('/api/twin/:userId', (req, res) => {
  const userId = req.params.userId;
  const userMeals = meals[userId] || [];
  const score = getHealthScore(userId);
  const patterns = detectPatterns(userId);
  
  const twin = {
    currentScore: score,
    predictedScore30Days: Math.min(100, score + (patterns.length === 0 ? 8 : -3)),
    predictedScore90Days: Math.min(100, score + (patterns.length === 0 ? 20 : -8)),
    topRisks: patterns.map(p => p.message),
    topGains: [
      'Adding morning protein could increase score by +12',
      'Reducing junk food by 50% → +15 score',
      'Consistent sleep schedule → +10 score'
    ],
    behaviorModel: {
      mealConsistency: Math.min(100, 50 + userMeals.length * 5),
      junkResistance: Math.max(0, 100 - (habits[userId]?.junkCount || 0) * 15),
      hydrationHabit: 65,
      sleepQuality: habits[userId]?.sleepHours >= 7 ? 85 : 50
    }
  };
  
  res.json({ twin });
});

// Foods list
app.get('/api/foods', (req, res) => {
  res.json({ foods: foodDB.foods });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🧠 NutriMind AI Server running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard ready — Open in your browser!\n`);
  });
}

module.exports = app;
