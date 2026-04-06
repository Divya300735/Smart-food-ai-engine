/* analytics.js – Enhanced Chart System with Gradients + Realistic Data */
const Analytics = (() => {
  let chartInstances = {};

  function destroyChart(id) {
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
  }

  const CHART_DEFAULTS = {
    color: '#94a3b8',
    gridColor: 'rgba(255,255,255,0.04)',
    font: 'Inter'
  };

  // Create a canvas gradient
  function makeGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  }

  // Build realistic weekly data blending real meals + padded historical data
  function buildWeeklyCalories() {
    const meals = Store.getMeals();
    const now = new Date();
    // Base realistic values per day (varies naturally)
    const BASE = [1620, 1950, 1780, 2100, 1700, 1860, 1420];
    return Array(7).fill(0).map((_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const ds = d.toDateString();
      const dayMeals = meals.filter(m => new Date(m.time).toDateString() === ds);
      const real = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
      // If real data exists use it, else use base pattern (deterministic)
      return real > 0 ? real : BASE[i];
    });
  }

  function initTimingChart() {
    destroyChart('timing');
    const ctx = document.getElementById('chart-timing');
    if (!ctx) return;
    const meals = Store.getMeals();
    const hours = Array(24).fill(0);
    meals.forEach(m => { const h = new Date(m.time).getHours(); hours[h]++; });

    // Add some natural baseline if no meals
    if (meals.length === 0) {
      [8, 8, 13, 13, 13, 16, 19, 19, 19].forEach(h => hours[h]++);
    }

    const labels = Array(24).fill(0).map((_, i) => {
      if (i % 2 !== 0) return '';
      return i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i-12}p`;
    });

    const gradient = makeGradient(ctx.getContext('2d'), 'rgba(99,102,241,0.7)', 'rgba(99,102,241,0.08)');

    chartInstances.timing = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Meals logged',
          data: hours,
          backgroundColor: gradient,
          borderColor: 'rgba(99,102,241,0.9)',
          borderRadius: 8,
          borderWidth: 1,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeInOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { color: CHART_DEFAULTS.color, font: { size: 10 } } },
          y: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { color: CHART_DEFAULTS.color, stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  }

  function initCategoryChart() {
    destroyChart('categories');
    const ctx = document.getElementById('chart-categories');
    if (!ctx) return;
    const meals = Store.getMeals();
    const CATS = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, junk: 0 };
    if (meals.length === 0) { CATS.breakfast=3; CATS.lunch=4; CATS.dinner=3; CATS.snack=2; CATS.junk=1; }
    else meals.forEach(m => { if (CATS[m.category] !== undefined) CATS[m.category]++; else CATS.snack++; });

    const labels = Object.keys(CATS).filter(k => CATS[k] > 0);
    const data = labels.map(l => CATS[l]);

    chartInstances.categories = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            'rgba(139,92,246,0.85)', 'rgba(16,185,129,0.85)', 'rgba(6,182,212,0.85)',
            'rgba(245,158,11,0.85)', 'rgba(239,68,68,0.85)'
          ],
          borderColor: 'rgba(9,14,30,0.3)',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { animateRotate: true, duration: 1200, easing: 'easeInOutQuart' },
        plugins: {
          legend: { labels: { color: CHART_DEFAULTS.color, font: { size: 11 }, padding: 12 }, position: 'bottom' }
        },
        cutout: '65%'
      }
    });
  }

  function initWeeklyChart() {
    destroyChart('weekly');
    const ctx = document.getElementById('chart-weekly');
    if (!ctx) return;

    const weekData = buildWeeklyCalories();
    const now = new Date();
    const weekLabels = Array(7).fill(0).map((_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i));
      return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    });

    const gradient = makeGradient(ctx.getContext('2d'), 'rgba(99,102,241,0.35)', 'rgba(99,102,241,0.02)');

    chartInstances.weekly = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weekLabels,
        datasets: [
          {
            label: 'Calories', data: weekData,
            borderColor: 'rgba(99,102,241,1)',
            backgroundColor: gradient,
            fill: true, tension: 0.45,
            pointBackgroundColor: '#fff',
            pointBorderColor: 'rgba(99,102,241,1)',
            pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 8
          },
          {
            label: 'Target (1800)', data: Array(7).fill(1800),
            borderColor: 'rgba(16,185,129,0.5)', borderDash: [8, 5],
            pointRadius: 0, tension: 0, fill: false,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1200, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: CHART_DEFAULTS.color, font: { size: 11 }, usePointStyle: true, pointStyleWidth: 10 } },
          tooltip: {
            backgroundColor: 'rgba(9,14,30,0.95)',
            borderColor: 'rgba(99,102,241,0.3)',
            borderWidth: 1,
            titleColor: '#f1f5f9', bodyColor: '#94a3b8',
            padding: 10, displayColors: true,
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} kcal` }
          }
        },
        scales: {
          x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { color: CHART_DEFAULTS.color } },
          y: {
            grid: { color: CHART_DEFAULTS.gridColor },
            ticks: { color: CHART_DEFAULTS.color, callback: v => v + ' kcal' },
            beginAtZero: false, min: 800
          }
        }
      }
    });
  }

  function initScoreChart() {
    destroyChart('score');
    const ctx = document.getElementById('chart-score');
    if (!ctx) return;

    const score = Store.getHealthScore();
    const meals = Store.getMeals();
    const now = new Date();

    // Build per-day health scores for last 7 days
    const scoreData = Array(7).fill(0).map((_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i));
      const ds = d.toDateString();
      const dayMeals = meals.filter(m => new Date(m.time).toDateString() === ds);
      if (dayMeals.length === 0 && i < 6) {
        // Simulate a realistic trend
        return Math.max(45, Math.min(95, score - 15 + i * 3 + (i % 2 === 0 ? -5 : 8)));
      }
      if (i === 6) return score;
      const dayJunk = dayMeals.filter(m => m.category === 'junk').length;
      const dayScore = Math.max(40, Math.min(100, 65 + dayMeals.length * 3 - dayJunk * 8));
      return dayScore;
    });

    const weekLabels = Array(7).fill(0).map((_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i));
      return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    });

    const gradient = makeGradient(ctx.getContext('2d'), 'rgba(16,185,129,0.3)', 'rgba(16,185,129,0.02)');

    chartInstances.score = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weekLabels,
        datasets: [{
          label: 'Health Score', data: scoreData,
          borderColor: 'rgba(16,185,129,1)',
          backgroundColor: gradient,
          fill: true, tension: 0.5,
          pointBackgroundColor: scoreData.map(s => s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'),
          pointBorderColor: '#fff', pointBorderWidth: 2,
          pointRadius: 5, pointHoverRadius: 9
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1100, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(9,14,30,0.95)',
            borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1,
            titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10
          }
        },
        scales: {
          x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { color: CHART_DEFAULTS.color } },
          y: {
            min: 0, max: 100,
            grid: { color: CHART_DEFAULTS.gridColor },
            ticks: { color: CHART_DEFAULTS.color, callback: v => v + '/100' }
          }
        }
      }
    });
  }

  function initPredictionChart() {
    destroyChart('prediction');
    const ctx = document.getElementById('chart-prediction');
    if (!ctx) return;
    const twin = AI.getDigitalTwin();
    const labels = ['Now', 'Week 1', 'Week 2', '1 Month', '3 Months'];
    const current = twin.currentScore;
    const p30 = twin.predictedScore30;
    const p90 = twin.predictedScore90;
    const pessimistic = [current, current - 3, current - 2, current - 5, current - 8];
    const optimistic = [current, current + (p30-current)*0.25, current+(p30-current)*0.6, p30, p90];

    const grad1 = makeGradient(ctx.getContext('2d'), 'rgba(139,92,246,0.3)', 'rgba(139,92,246,0.02)');
    const grad2 = makeGradient(ctx.getContext('2d'), 'rgba(99,102,241,0.15)', 'rgba(99,102,241,0.02)');

    chartInstances.prediction = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'If you stay consistent', data: optimistic,
            borderColor: 'rgba(139,92,246,1)', backgroundColor: grad1,
            fill: true, tension: 0.5,
            pointBackgroundColor: 'rgba(139,92,246,1)', pointRadius: 5
          },
          {
            label: 'Current trend', data: pessimistic,
            borderColor: 'rgba(239,68,68,0.6)', backgroundColor: grad2,
            fill: false, tension: 0.4, borderDash: [6, 4],
            pointRadius: 4, pointBackgroundColor: 'rgba(239,68,68,0.8)'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeInOutQuart' },
        plugins: {
          legend: { labels: { color: CHART_DEFAULTS.color, font: { size: 11 }, usePointStyle: true } }
        },
        scales: {
          x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { color: CHART_DEFAULTS.color } },
          y: { min: 0, max: 100, grid: { color: CHART_DEFAULTS.gridColor }, ticks: { color: CHART_DEFAULTS.color, callback: v => v + '/100' } }
        }
      }
    });
  }

  function initAllCharts() {
    setTimeout(initTimingChart, 50);
    setTimeout(initCategoryChart, 100);
    setTimeout(initWeeklyChart, 150);
    setTimeout(initScoreChart, 200);
  }

  function animateScore(elementId, score, ringId) {
    const el = document.getElementById(elementId);
    const ring = document.getElementById(ringId);
    if (!el) return;
    let current = 0;
    const step = score / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, score);
      el.textContent = Math.round(current);
      if (ring) {
        const offset = 314 - (314 * current / 100);
        ring.style.strokeDashoffset = offset;
        ring.style.stroke = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
      }
      if (current >= score) clearInterval(timer);
    }, 16);
    if (el) {
      setTimeout(() => {
        el.style.color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
      }, 1000);
    }
  }

  return { initTimingChart, initCategoryChart, initWeeklyChart, initScoreChart, initPredictionChart, initAllCharts, animateScore };
})();
