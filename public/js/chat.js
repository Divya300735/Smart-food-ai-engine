/* chat.js – Enhanced AI Chatbot (OpenAI architecture) */
const Chat = (() => {
  let isOpen = false;

  // Static Fallback Responses (used if API fails)
  const FALLBACKS = {
    greeting: (name, score) => `Hello ${name}! 👋 I'm NutriMind AI. Your current health score is **${score}/100**. How can I help you eat better today?`,
    score: (score) => `Your health score is **${score}/100** 🏆\n\n${score>=80?'🟢 Excellent! Keep it up!':score>=60?'🟡 Good progress, room to improve.':'🔴 Let\'s work on better habits!'}\n\nFactors: meal diversity, junk food, sleep & hydration.`,
    default: `Based on your data, focus on protein-rich meals & hydration. Want a personalized meal plan? 🥗`
  };

  function getFallbackResponse(msg, user) {
    const m = msg.toLowerCase();
    const score = Store.getHealthScore();
    const name = user?.name?.split(' ')[0] || 'there';
    if (/score|rating/.test(m)) return FALLBACKS.score(score);
    if (/hi|hello|hey/.test(m)) return FALLBACKS.greeting(name, score);
    return FALLBACKS.default;
  }

  // Formatting for chat bubbles
  function formatMsg(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/^• /gm, '• ');
  }

  function addMessage(content, role, showTyping = false) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const user = Store.getUser();

    if (showTyping) {
      const typing = document.createElement('div');
      typing.className = 'chat-msg ai';
      typing.id = 'typing-indicator';
      typing.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
      container.appendChild(typing);
      container.scrollTop = container.scrollHeight;
      return;
    }

    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    const avatar = role === 'ai' ? '<i class="fa-solid fa-robot"></i>' : (user?.name?.[0] || 'U');
    el.innerHTML = `<div class="msg-avatar">${avatar}</div><div class="msg-bubble"><p>${formatMsg(content)}</p></div>`;
    
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
    
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  // Simulated OpenAI Request function
  async function fetchOpenAIResponse(msg, context) {
    /* 
      // 🔥 PRODUCTION OPENAI INTEGRATION (Requires backend endpoint to hide keys)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context: context })
      });
      const data = await response.json();
      return data.reply;
    */

    // Since we don't have the real API key in the environment, we simulate the processing time
    // and provide intelligent, dynamicly constructed responses based on context.
    return new Promise((resolve) => {
      setTimeout(() => {
        const m = msg.toLowerCase();
        let reply = "";
        
        if (m.includes('pizza') || m.includes('burger') || m.includes('craving')) {
          reply = `I see you are craving junk food. You've had ${context.calories} kcal today. Instead of a burger, what about a homemade **Turkey & Avocado Wrap**? High protein, low fat, and it fits your ${context.goal} goal! 💪`;
        } else if (m.includes('sleep') || m.includes('tired')) {
          reply = `With only ${context.sleepHours} hours of sleep, your cortisol is likely high. Eat foods rich in magnesium like **Almonds or Spinach** to help your body recover tonight. 🌙`;
        } else if (m.includes('plan') || m.includes('diet')) {
          reply = `Since you live in a ${context.livingType} and prefer a ${context.diet} diet, here is a quick plan:\n• Breakfast: Oats with nuts\n• Lunch: Quinoa & veggies\n• Dinner: Light lentil soup\nKeeps you on track for an 80+ health score! ⭐`;
        } else {
          reply = `That's interesting. With your health score currently at **${context.score}/100**, the best approach is to maintain hydration and avoid eating 2 hours before bed. Any specific food you want me to analyze? 🥗`;
        }
        
        resolve(reply);
      }, 1500); // simulate network latency
    });
  }

  async function sendMessage(msg) {
    if (!msg.trim()) return;
    const input = document.getElementById('chat-input');
    if (input) input.value = '';
    
    addMessage(msg, 'user');
    addMessage('', 'ai', true);

    const user = Store.getUser();
    const todayMeals = Store.getTodayMeals();
    const calories = todayMeals.reduce((s,m)=>s+(m.calories||0),0);

    const context = {
      score: Store.getHealthScore(),
      calories: calories,
      goal: user?.goal || 'Maintenance',
      sleepHours: user?.sleepHours || 7,
      livingType: user?.livingType || 'Home',
      diet: user?.diet || 'Mixed'
    };

    try {
      // Attempt dynamic response
      const response = await fetchOpenAIResponse(msg, context);
      addMessage(response, 'ai');
    } catch (e) {
      // Fallback
      console.warn("AI API failed, using fallback.");
      const fallback = getFallbackResponse(msg, user);
      addMessage(fallback, 'ai');
    }
  }

  function toggle() {
    const panel = document.getElementById('chat-panel');
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) {
      const input = document.getElementById('chat-input');
      if (input) setTimeout(() => input.focus(), 100);
    }
  }

  function init() {
    const fab = document.getElementById('chat-fab');
    const close = document.getElementById('chat-close');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    if (fab) fab.addEventListener('click', toggle);
    if (close) close.addEventListener('click', toggle);
    if (sendBtn) sendBtn.addEventListener('click', () => sendMessage(input?.value || ''));
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(e.target.value); });
  }

  return { init, sendMessage };
})();

function sendQuickReply(msg) {
  const panel = document.getElementById('chat-panel');
  if (!panel.classList.contains('open')) panel.classList.add('open');
  Chat.sendMessage(msg);
}
