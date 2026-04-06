/* scanner.js – Food Scanner module */
const Scanner = (() => {
  const MOCK_RESULTS = [
    { name:'Rice Bowl', confidence:94, calories:340, protein:8, carbs:72, fat:2 },
    { name:'Fresh Salad', confidence:91, calories:120, protein:4, carbs:15, fat:5 },
    { name:'Sandwich', confidence:89, calories:380, protein:18, carbs:45, fat:14 },
    { name:'Pasta', confidence:86, calories:420, protein:14, carbs:68, fat:12 },
    { name:'Stir Fry Veggies', confidence:88, calories:290, protein:22, carbs:28, fat:9 },
    { name:'Dal & Rice', confidence:93, calories:350, protein:15, carbs:62, fat:5 },
    { name:'Paratha', confidence:87, calories:310, protein:7, carbs:48, fat:11 },
    { name:'Idli Sambar', confidence:92, calories:240, protein:9, carbs:45, fat:4 }
  ];

  const SWAPS = {
    'Rice Bowl':{ name:'Cauliflower Rice Bowl', calories:190, save:150, reason:'Same taste, 44% fewer calories & low-carb' },
    'Sandwich':{ name:'Lettuce Wrap with Protein', calories:210, save:170, reason:'Gluten-free, less sodium, high protein' },
    'Pasta':{ name:'Zucchini Noodles (Zoodles)', calories:180, save:240, reason:'70% fewer calories, vitamin-rich' },
    'Paratha':{ name:'Multigrain Roti', calories:180, save:130, reason:'Higher fiber, slower glucose release' },
    'fresh salad': null
  };

  let currentResult = null;

  function init() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('scan-input');
    const scanBtn = document.getElementById('scan-btn');
    const logBtn = document.getElementById('log-scanned-btn');

    if (!zone) return;

    zone.addEventListener('click', () => { if (!document.getElementById('scan-preview').src.includes('blob')) input.click(); });
    
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) previewFile(file);
    });

    input.addEventListener('change', () => {
      if (input.files[0]) previewFile(input.files[0]);
    });

    scanBtn.addEventListener('click', analyze);

    if (logBtn) {
      logBtn.addEventListener('click', () => {
        if (!currentResult) return;
        Store.saveMeal({
          food: currentResult.name,
          calories: currentResult.calories,
          category: 'lunch',
          mood: 'neutral'
        });
        
        // Update streak after scanner meal logging
        if (typeof renderStreaks === 'function') {
          renderStreaks();
        }
        Notifications.show('Meal Logged!', `${currentResult.name} (${currentResult.calories} kcal) added to your log.`, 'success');
        navigate('dashboard');
      });
    }
  }

  function previewFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('scan-preview');
      const uploadIcon = document.querySelector('.upload-icon');
      preview.src = e.target.result;
      preview.style.display = 'block';
      uploadIcon.style.display = 'none';
      document.querySelector('.upload-zone h3').style.display = 'none';
      document.querySelector('.upload-zone p').style.display = 'none';
      document.getElementById('scan-btn').disabled = false;
      document.getElementById('scan-result').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function analyze() {
    const loading = document.getElementById('scan-loading');
    const result = document.getElementById('scan-result');
    const btn = document.getElementById('scan-btn');

    loading.style.display = 'flex';
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';

    setTimeout(() => {
      loading.style.display = 'none';
      const detected = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
      const swap = SWAPS[detected.name] || {
        name:'Mixed Greens Salad with Protein',
        calories: Math.round(detected.calories * 0.6),
        save: Math.round(detected.calories * 0.4),
        reason:'Nutrient-dense alternative with fewer calories'
      };

      currentResult = detected;

      document.getElementById('scan-name').textContent = detected.name;
      document.getElementById('scan-conf').textContent = detected.confidence + '%';
      document.getElementById('scan-cal').textContent = detected.calories;
      document.getElementById('scan-prot').textContent = detected.protein + 'g';
      document.getElementById('scan-carb').textContent = detected.carbs + 'g';
      document.getElementById('scan-fat').textContent = detected.fat + 'g';

      document.getElementById('swap-name').textContent = swap.name;
      document.querySelector('#swap-cal').textContent = swap.calories + ' kcal';
      document.getElementById('swap-save').textContent = swap.save || (detected.calories - swap.calories);
      document.getElementById('swap-reason').textContent = swap.reason;

      result.style.display = 'flex';
      result.style.flexDirection = 'column';
      result.style.gap = '16px';

      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Scan Another';
      btn.onclick = () => {
        document.getElementById('scan-preview').style.display = 'none';
        document.querySelector('.upload-icon').style.display = 'block';
        document.querySelector('.upload-zone h3').style.display = 'block';
        document.querySelector('.upload-zone p').style.display = 'block';
        result.style.display = 'none';
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Analyze Food';
        btn.disabled = true;
        currentResult = null;
        document.getElementById('scan-input').value = '';
        btn.onclick = analyze;
      };

      Notifications.show('Food Detected!', `${detected.name} — ${detected.calories} kcal found!`, 'ai');
    }, 2000);
  }

  return { init };
})();
