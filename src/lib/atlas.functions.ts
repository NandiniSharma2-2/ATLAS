// ATLAS Demo Functions - Client-side only, no server dependencies

// Generate realistic demo health data
function generateDemoData() {
  const logs = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Create trending data that improves over time
    const trend = (29 - i) / 29; // 0 to 1
    const noise = () => (Math.random() - 0.5) * 0.5;
    
    logs.push({
      log_date: date.toISOString().split('T')[0],
      sleep_hours: Math.round((6.5 + trend * 1.5 + noise()) * 10) / 10,
      hydration_ml: Math.round(1800 + trend * 600 + noise() * 200),
      steps: Math.round(7000 + trend * 3000 + noise() * 1000),
      mood: Math.round((6 + trend * 3 + noise()) * 10) / 10,
      weight_kg: Math.round((74 - trend * 1.5 + noise() * 0.5) * 10) / 10,
      nutrition_score: Math.round(65 + trend * 25 + noise() * 10),
      recovery_score: Math.round(60 + trend * 30 + noise() * 10),
    });
  }
  
  return {
    logs,
    fullName: "ATLAS Demo User"
  };
}

// Demo data - generated once
const demoData = generateDemoData();

// Client-side functions that return demo data
export const seedDemoData = () => {
  return Promise.resolve({ seeded: true, inserted: 30 });
};

export const getHealthData = () => {
  return Promise.resolve(demoData);
};

// Placeholder functions for other ATLAS features
export const getChatMessages = () => {
  return Promise.resolve([
    {
      role: 'assistant',
      content: 'Welcome to ATLAS! I can help you understand your health patterns and make better decisions.',
      timestamp: new Date().toISOString()
    }
  ]);
};

export const sendChatMessage = (message: string) => {
  return Promise.resolve({
    role: 'assistant',
    content: `Thanks for your message: "${message}". This is a demo response from ATLAS AI.`,
    timestamp: new Date().toISOString()
  });
};

export const clearChatHistory = () => {
  return Promise.resolve({ ok: true });
};