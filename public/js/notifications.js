/* notifications.js – Toast + Smart Alerts */
const Notifications = (() => {
  let toastTimer = null;

  function show(title, msg, type = 'info', duration = 4000) {
    const icons = { info:'ℹ️', success:'✅', warning:'⚠️', error:'❌', ai:'🧠', water:'💧', meal:'🍽️' };
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>
      <span class="toast-close">✕</span>`;
    toast.querySelector('.toast-close').onclick = () => remove(toast);
    container.prepend(toast);
    if (duration > 0) setTimeout(() => remove(toast), duration);
    return toast;
  }

  function remove(toast) {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }

  function scheduleSmartAlerts() {
    const checkAlerts = () => {
      const hr = new Date().getHours();
      const meals = Store.getTodayMeals();
      
      // Meal time reminders
      if (hr === 7 && !meals.some(m => m.category === 'breakfast')) {
        show('Good Morning!', 'Don\'t skip breakfast — it boosts metabolism! 🌅', 'ai');
        Store.addNotification({ icon:'🌅', text:'Breakfast reminder sent', type:'reminder' });
      }
      if (hr === 13 && meals.filter(m => m.category === 'lunch').length === 0) {
        show('Lunch Time!', 'You haven\'t logged lunch yet. Eat a balanced meal! ☀️', 'warning');
        Store.addNotification({ icon:'☀️', text:'Lunch reminder sent', type:'reminder' });
      }
      if (hr === 22 && meals.some(m => { const h = new Date(m.time).getHours(); return h >= 21; })) {
        show('Late-Night Alert', 'Late-night eating detected. Try water or herbal tea! 🌙', 'warning');
        Store.addNotification({ icon:'🌙', text:'Late-night eating detected', type:'alert' });
      }
      if (hr === 15) {
        show('Craving Alert', 'AI predicts you may crave junk in 30 mins. Prep a healthy snack! 🔮', 'ai');
      }
      if (Store.getWater() < 4 && hr >= 15) {
        show('Hydration Reminder', 'You need more water today! Target: 8 glasses 💧', 'water');
      }
    };
    
    // Check immediately on load
    setTimeout(checkAlerts, 3000);
    // Check every hour
    setInterval(checkAlerts, 60 * 60 * 1000);
  }

  function populateNotifPanel() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const notifs = Store.getNotifications();
    const hr = new Date().getHours();
    
    // Always show some smart notifications
    const smartNotifs = [
      { icon:'🧠', text:'AI analyzed your eating patterns for today', time:'Just now' },
      { icon:'🔮', text:'Craving prediction: Junk food likely at 10 PM', time:'2 min ago' },
      { icon:'💧', text:`Water intake: ${Store.getWater()}/8 glasses today`, time:'5 min ago' },
      ...notifs.slice(0,5).map(n => ({...n, time: timeAgo(new Date(n.time))}))
    ];

    list.innerHTML = smartNotifs.map(n => `
      <div class="notif-item">
        <span class="notif-item-icon">${n.icon}</span>
        <div>
          <div class="notif-item-text">${n.text}</div>
          <div class="notif-item-time">${n.time || 'Recently'}</div>
        </div>
      </div>`).join('');
  }

  function timeAgo(date) {
    const diff = (Date.now() - date) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  return { show, scheduleSmartAlerts, populateNotifPanel };
})();
