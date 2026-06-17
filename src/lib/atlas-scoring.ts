// Pure scoring helpers — safe to import from server and client.
export type DailyLog = {
  log_date: string;
  sleep_hours: number | null;
  hydration_ml: number | null;
  steps: number | null;
  mood: number | null;
  weight_kg: number | null;
  nutrition_score: number | null;
  recovery_score: number | null;
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function scoreSleep(h: number | null) {
  if (h == null) return 0;
  // 8h = 100, 4h = 50, 0h = 0
  return clamp(Math.round((h / 8) * 100));
}
export function scoreHydration(ml: number | null) {
  if (ml == null) return 0;
  return clamp(Math.round((ml / 2800) * 100));
}
export function scoreActivity(steps: number | null) {
  if (steps == null) return 0;
  return clamp(Math.round((steps / 10000) * 100));
}
export function scoreRecovery(r: number | null) {
  return clamp(r ?? 0);
}
export function scoreNutrition(n: number | null) {
  return clamp(n ?? 0);
}

export function unifiedHealthScore(log: DailyLog) {
  const s = scoreSleep(log.sleep_hours);
  const h = scoreHydration(log.hydration_ml);
  const a = scoreActivity(log.steps);
  const r = scoreRecovery(log.recovery_score);
  const n = scoreNutrition(log.nutrition_score);
  // weighted: sleep & recovery dominate
  return Math.round(s * 0.28 + r * 0.24 + a * 0.18 + n * 0.18 + h * 0.12);
}

export function burnoutRisk(logs: DailyLog[]) {
  if (logs.length === 0) return 0;
  const recent = logs.slice(0, 7);
  const avgSleep = recent.reduce((sum, l) => sum + (l.sleep_hours ?? 0), 0) / recent.length;
  const avgRecovery = recent.reduce((sum, l) => sum + (l.recovery_score ?? 0), 0) / recent.length;
  const avgMood = recent.reduce((sum, l) => sum + (l.mood ?? 0), 0) / recent.length;
  // 0 = low risk, 100 = high
  const sleepRisk = clamp((7 - avgSleep) * 18);
  const recoveryRisk = clamp(100 - avgRecovery);
  const moodRisk = clamp((6 - avgMood) * 20);
  return Math.round(sleepRisk * 0.4 + recoveryRisk * 0.4 + moodRisk * 0.2);
}

export function trajectory(logs: DailyLog[]): "improving" | "declining" | "stable" {
  if (logs.length < 4) return "stable";
  const recent = logs.slice(0, 7).map(unifiedHealthScore);
  const prior = logs.slice(7, 14).map(unifiedHealthScore);
  if (prior.length === 0) return "stable";
  const avgR = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgP = prior.reduce((a, b) => a + b, 0) / prior.length;
  const diff = avgR - avgP;
  if (diff > 3) return "improving";
  if (diff < -3) return "declining";
  return "stable";
}

export type DecisionAction = {
  action: string;
  impact: number;
  reasoning: string;
  confidence: "high" | "medium" | "low";
};

export function topDecisionActions(logs: DailyLog[]): DecisionAction[] {
  if (logs.length === 0) return [];
  const recent = logs.slice(0, 7);
  const avgSleep = recent.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / recent.length;
  const avgWater = recent.reduce((s, l) => s + (l.hydration_ml ?? 0), 0) / recent.length;
  const avgSteps = recent.reduce((s, l) => s + (l.steps ?? 0), 0) / recent.length;

  const actions: DecisionAction[] = (
    [
      {
        action: `Add +${(8 - avgSleep).toFixed(1)}h sleep to reach 8h`,
        impact: Math.round((8 - avgSleep) * 6),
        reasoning: `7-day avg sleep is ${avgSleep.toFixed(1)}h — under target`,
        confidence: "high" as const,
      },
      {
        action: `Walk +${Math.max(0, Math.round((10000 - avgSteps) / 1000))}k more steps`,
        impact: Math.round(((10000 - avgSteps) / 10000) * 12),
        reasoning: `Current activity score lags. 7-day avg: ${Math.round(avgSteps)} steps`,
        confidence: "high" as const,
      },
      {
        action: `Drink +${Math.max(0, Math.round((2800 - avgWater) / 100) / 10)}L water daily`,
        impact: Math.round(((2800 - avgWater) / 2800) * 8),
        reasoning: `Hydration trending low at ${Math.round(avgWater)} ml/day`,
        confidence: "medium" as const,
      },
    ] satisfies DecisionAction[]
  )
    .filter((a) => a.impact > 0)
    .sort((a, b) => b.impact - a.impact);


  return actions.slice(0, 3);
}
