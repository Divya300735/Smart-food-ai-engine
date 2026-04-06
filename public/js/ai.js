/* ai.js – Behavioral AI Engine */
const AI = (() => {
  const FOODS = [
    { name:'Oatmeal', calories:150, protein:6, carbs:27, fat:3, category:'breakfast', healthScore:90, emoji:'🥣' },
    { name:'Greek Yogurt', calories:100, protein:17, carbs:6, fat:0.7, category:'snack', healthScore:88, emoji:'🥛' },
    { name:'Banana', calories:89, protein:1.1, carbs:23, fat:0.3, category:'snack', healthScore:85, emoji:'🍌' },
    { name:'Grilled Chicken Salad', calories:320, protein:35, carbs:12, fat:14, category:'lunch', healthScore:92, emoji:'🥗' },
    { name:'Lentil Soup', calories:230, protein:18, carbs:30, fat:3, category:'dinner', healthScore:91, emoji:'🍲' },
    { name:'Mixed Nuts', calories:170, protein:5, carbs:6, fat:15, category:'snack', healthScore:82, emoji:'🥜' },
    { name:'Smoothie Bowl', calories:280, protein:8, carbs:52, fat:5, category:'breakfast', healthScore:87, emoji:'🍓' },
    { name:'Avocado Toast', calories:310, protein:10, carbs:35, fat:16, category:'breakfast', healthScore:85, emoji:'🥑' },
    { name:'Quinoa Bowl', calories:350, protein:14, carbs:48, fat:10, category:'lunch', healthScore:93, emoji:'🫙' },
    { name:'Dark Chocolate', calories:170, protein:2, carbs:21, fat:9, category:'snack', healthScore:65, emoji:'🍫' },
    { name:'Salmon Rice', calories:420, protein:32, carbs:40, fat:12, category:'dinner', healthScore:90, emoji:'🐟' },
    { name:'Fruit Salad', calories:120, protein:2, carbs:28, fat:0.5, category:'snack', healthScore:88, emoji:'🍑' },
    { name:'Tomato Soup', calories:180, protein:5, carbs:25, fat:6, category:'lunch', healthScore:80, emoji:'🍅' },
    { name:'Egg White Omelette', calories:140, protein:22, carbs:3, fat:4, category:'breakfast', healthScore:89, emoji:'🍳' },
    { name:'Hummus & Veggies', calories:200, protein:8, carbs:22, fat:9, category:'snack', healthScore:86, emoji:'🥕' },
    { name:'Pizza Slice', calories:285, protein:12, carbs:36, fat:10, category:'junk', healthScore:40, emoji:'🍕' },
    { name:'Burger', calories:540, protein:25, carbs:45, fat:28, category:'junk', healthScore:30, emoji:'🍔' },
    { name:'French Fries', calories:365, protein:4, carbs:48, fat:17, category:'junk', healthScore:25, emoji:'🍟' },
    { name:'Ice Cream', calories:270, protein:5, carbs:33, fat:14, category:'junk', healthScore:35, emoji:'🍦' },
    { name:'Watermelon', calories:85, protein:1.7, carbs:21, fat:0.4, category:'fruit', healthScore:90, emoji:'🍉' }
  ];

  const MOOD_FOODS = {
    happy: ['Smoothie Bowl','Fruit Salad','Avocado Toast','Grilled Chicken Salad'],
    sad: ['Dark Chocolate','Lentil Soup','Tomato Soup','Banana'],
    stressed: ['Mixed Nuts','Greek Yogurt','Dark Chocolate','Banana'],
    tired: ['Oatmeal','Egg White Omelette','Smoothie Bowl','Fruit Salad'],
    anxious: ['Oatmeal','Greek Yogurt','Mixed Nuts','Banana'],
    excited: ['Smoothie Bowl','Quinoa Bowl','Fruit Salad','Avocado Toast']
  };

  const SWAPS = {
    'Pizza Slice': { name:'Cauliflower Pizza', calories:150, reason:'Same satisfaction, 47% fewer calories' },
    'Burger': { name:'Turkey Lettuce Wrap', calories:280, reason:'High protein, low carb & fully satisfying' },
    'French Fries': { name:'Baked Sweet Potato Fries', calories:130, reason:'Rich in Vitamin A, 64% fewer calories' },
    'Ice Cream': { name:'Frozen Banana Nice Cream', calories:105, reason:'Natural sugars with a potassium boost' }
  };

  const WEATHER_FOODS = {
    rainy:['Lentil Soup','Tomato Soup','Oatmeal','Mixed Nuts'],
    sunny:['Fruit Salad','Smoothie Bowl','Grilled Chicken Salad','Watermelon'],
    cold:['Lentil Soup','Oatmeal','Tomato Soup','Quinoa Bowl'],
    hot:['Watermelon','Smoothie Bowl','Fruit Salad','Greek Yogurt']
  };

  const GROCERY = {
    protein:['🍗 Chicken Breast','🥚 Eggs','🥛 Greek Yogurt','🌱 Lentils','🐟 Salmon','🫘 Tofu'],
    carbs:['🥣 Oats','🍚 Brown Rice','🌾 Quinoa','🍠 Sweet Potato','🍞 Whole Grain Bread'],
    fats:['🥑 Avocado','🥜 Mixed Nuts','🫒 Olive Oil','🍫 Dark Chocolate 70%+','🌱 Chia Seeds'],
    vitamins:['🥬 Spinach','🥦 Broccoli','🫐 Berries','🍊 Citrus Fruits','🍅 Tomatoes']
  };

  function getFoods() { return FOODS; }
  function searchFoods(q) {
    return FOODS.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  }
  function getFoodByName(name) {
    return FOODS.find(f => f.name.toLowerCase() === name.toLowerCase());
  }

  function getContextSuggestions() {
    const hr = new Date().getHours();
    const weathers = ['sunny','rainy','cold','hot'];
    const weather = weathers[Math.floor(Date.now() / (1000*60*60*6)) % 4];
    
    let category;
    if (hr >= 6 && hr < 10) category = 'breakfast';
    else if (hr >= 12 && hr < 15) category = 'lunch';
    else if (hr >= 18 && hr < 21) category = 'dinner';
    else category = 'snack';

    let foods = FOODS.filter(f => f.category === category && f.healthScore >= 80).slice(0, 3);
    
    if (WEATHER_FOODS[weather]) {
      const wNames = WEATHER_FOODS[weather];
      const wFoods = FOODS.filter(f => wNames.includes(f.name));
      foods = [...wFoods, ...foods].slice(0, 4);
    }
    
    // Deduplicate
    const seen = new Set();
    return foods.filter(f => { if (seen.has(f.name)) return false; seen.add(f.name); return true; }).slice(0,4);
  }

  function getMoodFoods(mood) {
    const names = MOOD_FOODS[mood] || MOOD_FOODS.happy;
    const foods = names.map(n => FOODS.find(f => f.name === n)).filter(Boolean);
    const why = {
      happy:'Celebrate with colorful, energizing foods!',
      sad:'Comfort foods rich in mood-boosting nutrients.',
      stressed:'Magnesium & L-theanine to calm the nervous system.',
      tired:'Quick energy with complex carbs & protein.',
      anxious:'Calming foods that reduce cortisol levels.',
      excited:'Power snacks to channel that energy!'
    };
    return { foods, why: why[mood] || 'Personalized for your mood.' };
  }

  function getSmartSwap(foodName) {
    return SWAPS[foodName] || null;
  }

  function getGrocery() { return GROCERY; }

  function predictCravings() {
    const meals = Store.getMeals();
    const hr = new Date().getHours();
    const predictions = [];

    const lateJunk = meals.filter(m => {
      const h = new Date(m.time).getHours();
      return (h >= 22 || h <= 3) && m.category === 'junk';
    });
    if (lateJunk.length >= 1 || hr >= 20) {
      predictions.push({
        icon:'🌙', time:'10:00 PM', craving:'Junk Food / Sweets',
        probability: Math.min(95, 55 + lateJunk.length * 12),
        prevention:'Prep Greek Yogurt or Mixed Nuts before 9 PM!'
      });
    }

    const stressMeals = meals.filter(m => m.mood === 'stressed');
    if (stressMeals.length >= 1) {
      predictions.push({
        icon:'😤', time:'Afternoon (3–4 PM)', craving:'Sugary snacks',
        probability:72,
        prevention:'Drink water + eat protein at 2 PM to prevent it.'
      });
    }

    if (predictions.length === 0) {
      predictions.push({
        icon:'🎯', time:'Tonight', craving:'Sweet / Salty snacks',
        probability:40,
        prevention:'Log more meals to get precise craving predictions!'
      });
    }
    return predictions;
  }

  function getDigitalTwin() {
    const meals = Store.getMeals();
    const score = Store.getHealthScore();
    const patterns = Store.getPatterns();
    const junkCount = meals.filter(m => m.category === 'junk').length;
    const lateNight = meals.filter(m => { const h = new Date(m.time).getHours(); return h >= 22 || h <= 4; }).length;
    const user = Store.getUser();

    return {
      currentScore: score,
      predictedScore30: Math.min(100, score + (junkCount > 3 ? -5 : 8)),
      predictedScore90: Math.min(100, score + (junkCount > 5 ? -10 : 18)),
      risks: patterns.map(p => p.message).concat(
        lateNight >= 2 ? ['Late-night eating disrupts metabolism'] : [],
        junkCount >= 3 ? ['High junk food intake raising inflammation risk'] : []
      ),
      gains: [
        'Adding morning protein → +12 score points',
        'Reducing junk food by 50% → +15 score points',
        '7-9 hrs sleep consistently → +10 score points',
        'Drinking 8 glasses water daily → +5 score points'
      ],
      behaviors: {
        'Meal Consistency': Math.min(100, 40 + meals.length * 8),
        'Junk Resistance': Math.max(0, 100 - junkCount * 14),
        'Hydration Habit': Math.min(100, Store.getWater() * 12),
        'Sleep Quality': user?.sleepHours >= 7 ? 85 : 50
      },
      traits: (() => {
        const t = [];
        if (junkCount < 2) t.push('Clean Eater');
        if (meals.length >= 5) t.push('Consistent Logger');
        if (lateNight === 0) t.push('Good Timing');
        if (Store.getWater() >= 6) t.push('Well Hydrated');
        if (t.length === 0) t.push('Just Started');
        return t;
      })()
    };
  }

  function getWeatherContext() {
    const weathers = [
      { label:'sunny', icon:'☀️', temp:33 },
      { label:'rainy', icon:'🌧️', temp:19 },
      { label:'cold', icon:'❄️', temp:12 },
      { label:'hot', icon:'🌡️', temp:38 }
    ];
    return weathers[Math.floor(Date.now() / (1000*60*60*6)) % 4];
  }

  return { getFoods, searchFoods, getFoodByName, getContextSuggestions, getMoodFoods, getSmartSwap, getGrocery, predictCravings, getDigitalTwin, getWeatherContext };
})();
