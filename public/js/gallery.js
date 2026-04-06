/* gallery.js – Food Gallery with Mood Filter + Unsplash Images + Log */
const Gallery = (() => {

  const FOODS = [
    { name:'Pizza', cal:300, tag:'junk', mood:['happy'], emoji:'🍕', img:'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80', recTag:'Comfort Food' },
    { name:'Burger', cal:350, tag:'junk', mood:['happy'], emoji:'🍔', img:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', recTag:'Comfort Food' },
    { name:'Salad', cal:150, tag:'healthy', mood:['happy','active'], emoji:'🥗', img:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80', recTag:'Energy Boost' },
    { name:'Paneer', cal:250, tag:'healthy', mood:['active','happy'], emoji:'🧀', img:'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=400&q=80', recTag:'Protein Rich' },
    { name:'Roti', cal:100, tag:'healthy', mood:['active','tired'], emoji:'🫓', img:'https://images.unsplash.com/photo-1565557623262-b51f2510b641?w=400&q=80', recTag:'Energy Source' },
    { name:'Smoothie', cal:180, tag:'healthy', mood:['happy','active'], emoji:'🥤', img:'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&q=80', recTag:'Energy Boost' },
    { name:'Dark Chocolate', cal:200, tag:'moderate', mood:['stressed','sad'], emoji:'🍫', img:'https://images.unsplash.com/photo-1548812003-7cb5ab6fd996?w=400&q=80', recTag:'Stress Relief' },
    { name:'Banana', cal:89, tag:'healthy', mood:['stressed','tired'], emoji:'🍌', img:'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&q=80', recTag:'Stress Relief' },
    { name:'Oatmeal', cal:150, tag:'healthy', mood:['tired','active'], emoji:'🥣', img:'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&q=80', recTag:'Energy Boost' },
    { name:'Eggs', cal:155, tag:'healthy', mood:['active'], emoji:'🍳', img:'https://images.unsplash.com/photo-1525351484163-f52920b5a5f4?w=400&q=80', recTag:'Protein Rich' },
    { name:'Greek Yogurt', cal:100, tag:'healthy', mood:['stressed','happy'], emoji:'🥛', img:'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80', recTag:'Gut Health' },
    { name:'Mixed Nuts', cal:170, tag:'healthy', mood:['stressed'], emoji:'🥜', img:'https://images.unsplash.com/photo-1536585141940-d63c5a6baafa?w=400&q=80', recTag:'Stress Relief' },
    { name:'Avocado Toast', cal:310, tag:'healthy', mood:['happy','active'], emoji:'🥑', img:'https://images.unsplash.com/photo-1602881917445-0b1ba001addf?w=400&q=80', recTag:'Healthy Fats' },
    { name:'Quinoa Bowl', cal:350, tag:'healthy', mood:['active'], emoji:'🫙', img:'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80', recTag:'Complete Protein' },
    { name:'Coffee', cal:10, tag:'healthy', mood:['tired'], emoji:'☕', img:'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80', recTag:'Energy Boost' },
    { name:'Fresh Juice', cal:120, tag:'healthy', mood:['tired','happy'], emoji:'🧃', img:'https://images.unsplash.com/photo-1621506289937-d8e7dc08e1ec?w=400&q=80', recTag:'Vitamin Boost' },
    { name:'Chicken', cal:280, tag:'healthy', mood:['active'], emoji:'🍗', img:'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&q=80', recTag:'Protein Rich' },
    { name:'Lentil Soup', cal:230, tag:'healthy', mood:['stressed','tired'], emoji:'🍲', img:'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80', recTag:'Comfort Food' },
    { name:'Watermelon', cal:85, tag:'healthy', mood:['happy'], emoji:'🍉', img:'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&q=80', recTag:'Hydration' },
    { name:'Ice Cream', cal:270, tag:'junk', mood:['happy','stressed'], emoji:'🍦', img:'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&q=80', recTag:'Mood Lift' },
    { name:'French Fries', cal:365, tag:'junk', mood:['happy'], emoji:'🍟', img:'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&q=80', recTag:'Comfort Food' },
    { name:'Fruit Bowl', cal:120, tag:'healthy', mood:['happy','active'], emoji:'🍑', img:'https://images.unsplash.com/photo-1490474504059-1ecb8ce8abf4?w=400&q=80', recTag:'Vitamin C Boost' },
  ];

  const MOOD_META = {
    all:      { label:'All Foods', rec:'', bg:'' },
    happy:    { label:'Happy Mood Foods', rec:'🌟 You\'re feeling great! Here are energizing, celebratory foods to match your vibe.', bg:'rgba(245,158,11,0.05)', border:'rgba(245,158,11,0.2)', color:'#f59e0b' },
    stressed: { label:'Stress-Relief Foods', rec:'🧘 Feeling stressed? These foods contain natural compounds to calm your nervous system.', bg:'rgba(99,102,241,0.05)', border:'rgba(99,102,241,0.2)', color:'#6366f1' },
    tired:    { label:'Energy-Boosting Foods', rec:'⚡ Feeling low on energy? These foods will give you a quick and sustained energy boost.', bg:'rgba(6,182,212,0.05)', border:'rgba(6,182,212,0.2)', color:'#06b6d4' },
    active:   { label:'High-Performance Foods', rec:'💪 Ready to perform? These high-protein, high-energy foods fuel your body optimally.', bg:'rgba(16,185,129,0.05)', border:'rgba(16,185,129,0.2)', color:'#10b981' },
  };

  let galleryLog = [];
  let activeButtons = {};

  function getImageUrl(img) {
    return img;
  }

  function buildCard(food) {
    const imgUrl = getImageUrl(food.img);
    const tagClass = food.tag === 'healthy' ? 'healthy' : food.tag === 'junk' ? 'junk' : 'moderate';
    const tagLabel = food.tag === 'healthy' ? '✅ Healthy' : food.tag === 'junk' ? '❌ Junk' : '⚠️ Moderate';

    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.dataset.mood = food.mood.join(',');
    card.dataset.name = food.name;
    card.innerHTML = `
      <div class="gallery-img-placeholder" style="position:relative;overflow:hidden">
        <img 
          src="${imgUrl}" 
          alt="${food.name}"
          class="gallery-img"
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s ease"
          onerror="this.style.display='none'"
          onload="this.style.opacity='1'"
        >
        <span style="position:relative;z-index:1;font-size:2.5rem">${food.emoji}</span>
      </div>
      <div class="gallery-card-body">
        <div class="gallery-food-name">${food.name}</div>
        <div class="gallery-meta">
          <span class="gallery-cal">🔥 ${food.cal} kcal</span>
          <span class="gallery-tag ${tagClass}">${tagLabel}</span>
        </div>
        ${food.recTag ? `<span class="rec-tag" style="background:rgba(99,102,241,0.12);color:#818cf8;margin-bottom:8px;display:inline-block">${food.recTag}</span>` : ''}
        <button class="gallery-add-btn" id="gbtn-${food.name.replace(/\s/g,'-')}" onclick="Gallery.addToLog('${food.name}', ${food.cal}, '${food.tag}', '${food.emoji}')">
          + Add to Log
        </button>
      </div>`;
    return card;
  }

  function render() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';
    FOODS.forEach(f => grid.appendChild(buildCard(f)));
    updateLogPanel();

    // Attach 3D parallax hover effect to all newly rendered cards
    document.querySelectorAll('.gallery-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg
        const rotateY = ((x - centerX) / centerX) * 10;
        card.style.transform = `perspective(1000px) scale(1.05) translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) scale(1) translateY(0px) rotateX(0deg) rotateY(0deg)`;
      });
    });
  }

  function filter(mood, btn) {
    // Update active button styling
    document.querySelectorAll('.mood-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const cards = document.querySelectorAll('.gallery-card');
    cards.forEach(card => {
      const moods = card.dataset.mood.split(',');
      const show = mood === 'all' || moods.includes(mood);
      card.style.animation = 'none';
      card.offsetHeight; // reflow
      card.style.animation = '';
      card.style.display = show ? '' : 'none';
      if (show) card.classList.add('filtering');
      setTimeout(() => card.classList.remove('filtering'), 400);
    });

    // Show/hide recommendation banner
    const rec = document.getElementById('gallery-rec');
    const meta = MOOD_META[mood];
    if (rec && meta && meta.rec) {
      rec.style.display = 'block';
      rec.textContent = meta.rec;
      rec.style.background = meta.bg;
      rec.style.borderColor = meta.border;
      rec.style.color = meta.color;
    } else if (rec) {
      rec.style.display = 'none';
    }
  }

  function addToLog(name, cal, tag, emoji) {
    const entry = { name, cal, tag, emoji, time: new Date().toISOString() };
    galleryLog.push(entry);

    // Also save to meal store
    Store.saveMeal({
      food: name,
      calories: cal,
      category: tag === 'junk' ? 'junk' : 'snack',
      mood: 'neutral',
      notes: `Added from gallery - ${prompt || 'No prompt'}`
    });
    
    // Update streak after gallery meal logging
    if (typeof renderStreaks === 'function') {
      renderStreaks();
    }

    const btnId = `gbtn-${name.replace(/\s/g,'-')}`;
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.textContent = '✓ Added!';
      btn.classList.add('added');
      btn.disabled = true;
      setTimeout(() => {
        if (btn) { btn.textContent = '+ Add to Log'; btn.classList.remove('added'); btn.disabled = false; }
      }, 2500);
    }

    Notifications.show(`${emoji} ${name} added!`, `${cal} kcal logged to today's food log.`, 'success', 3000);
    updateLogPanel();
  }

  function updateLogPanel() {
    const container = document.getElementById('gallery-log-entries');
    const totalEl = document.getElementById('gallery-log-total');
    const totalCalEl = document.getElementById('gallery-total-cal');

    // Merge gallery log with today's store meals
    const storeMeals = Store.getTodayMeals();
    const allEntries = storeMeals.map(m => ({
      name: m.food, cal: m.calories,
      emoji: FOODS.find(f => f.name === m.food)?.emoji || '🍽️',
      time: m.time
    }));

    if (!container) return;
    if (!allEntries.length) {
      container.innerHTML = '<div class="log-empty">No foods added yet. Pick from the gallery above!</div>';
      if (totalEl) totalEl.style.display = 'none';
      return;
    }

    const sorted = [...allEntries].sort((a,b) => new Date(a.time)-new Date(b.time));
    container.innerHTML = sorted.map(e => `
      <div class="log-entry">
        <span class="log-entry-emoji">${e.emoji}</span>
        <span class="log-entry-name">${e.name}</span>
        <span class="log-entry-cal">${e.cal} kcal</span>
      </div>`).join('');

    const total = allEntries.reduce((s,e) => s + e.cal, 0);
    if (totalEl) totalEl.style.display = 'flex';
    if (totalCalEl) totalCalEl.textContent = `${total} kcal`;
  }

  return { render, filter, addToLog, updateLogPanel, FOODS };
})();

// Global hook for inline onclick
function filterGallery(mood, btn) { Gallery.filter(mood, btn); }
