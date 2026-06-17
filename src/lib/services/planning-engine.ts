// Life-Aware Planning Engine
import type { DailyLog } from "../atlas-scoring";
import type { UserSchedule, GeneratedPlan, UserGoal } from "@/integrations/supabase/extended-types";

export interface PlanningContext {
  energy_patterns: Record<string, number>; // hour -> energy level
  productivity_patterns: Record<string, number>; // day_of_week -> productivity
  health_metrics: {
    recent_sleep: number;
    recent_stress: number;
    recent_energy: number;
  };
  existing_commitments: UserSchedule[];
  goals: UserGoal[];
  preferences: {
    work_hours_start: string;
    work_hours_end: string;
    break_duration: number;
    max_focus_duration: number;
  };
}

export interface PlanTask {
  title: string;
  description?: string;
  category: string;
  estimated_duration_minutes: number;
  energy_requirement: number; // 1-10
  focus_requirement: number; // 1-10
  priority_level: number; // 1-5
  deadline?: string;
  is_splittable: boolean;
  related_goal_id?: string;
}

export class PlanningEngine {
  /**
   * Generate adaptive daily plan based on user patterns and current state
   */
  static generateDailyPlan(
    targetDate: string,
    context: PlanningContext,
    tasks: PlanTask[]
  ): {
    plan: GeneratedPlan;
    scheduled_tasks: Array<{
      task: PlanTask;
      scheduled_start: string;
      scheduled_end: string;
      reasoning: string;
    }>;
    adaptations_made: string[];
    risk_assessment: {
      overload_risk: number;
      energy_mismatch_risk: number;
      schedule_conflict_risk: number;
    };
  } {
    const date = new Date(targetDate);
    const dayOfWeek = date.getDay();
    
    // Analyze available time slots
    const availableSlots = this.calculateAvailableTimeSlots(date, context.existing_commitments);
    
    // Get user's energy pattern for this day
    const energyPattern = this.getEnergyPatternForDay(dayOfWeek, context);
    
    // Sort tasks by priority and energy requirements
    const sortedTasks = this.prioritizeTasks(tasks, context, energyPattern);
    
    // Schedule tasks optimally
    const schedulingResult = this.scheduleTasks(sortedTasks, availableSlots, energyPattern, context);
    
    // Generate adaptations and risk assessment
    const adaptations = this.identifyAdaptations(schedulingResult, context);
    const riskAssessment = this.assessPlanRisks(schedulingResult, context);
    
    const plan: GeneratedPlan = {
      id: '',
      user_id: '',
      plan_type: 'daily',
      target_date: targetDate,
      generated_at: new Date().toISOString(),
      based_on_data_until: this.getLatestDataDate(context),
      user_energy_pattern: energyPattern,
      health_metrics: context.health_metrics,
      existing_commitments: context.existing_commitments,
      goals_considered: context.goals,
      plan_structure: {
        tasks: schedulingResult.scheduled_tasks,
        breaks: schedulingResult.breaks,
        buffer_time: schedulingResult.buffer_time
      },
      adaptations_made: adaptations,
      risk_factors: this.identifyRiskFactors(riskAssessment),
      backup_options: this.generateBackupOptions(schedulingResult, availableSlots),
      estimated_success_probability: this.calculateSuccessProbability(schedulingResult, riskAssessment),
      workload_balance_score: this.calculateWorkloadBalance(schedulingResult),
      alignment_score: this.calculateAlignmentScore(schedulingResult, context),
      status: 'active',
      created_at: new Date().toISOString()
    };

    return {
      plan,
      scheduled_tasks: schedulingResult.scheduled_tasks,
      adaptations_made: adaptations,
      risk_assessment: riskAssessment
    };
  }

  /**
   * Generate weekly plan with milestone tracking
   */
  static generateWeeklyPlan(
    startDate: string,
    context: PlanningContext,
    weeklyGoals: Array<{ goal: UserGoal; tasks: PlanTask[] }>
  ): {
    plan: GeneratedPlan;
    daily_breakdowns: Record<string, any>;
    milestone_schedule: Array<{
      date: string;
      milestone: string;
      progress_target: number;
    }>;
    weekly_themes: Array<{
      day: string;
      theme: string;
      focus_areas: string[];
    }>;
  } {
    const weekDays = this.generateWeekDates(startDate);
    const dailyBreakdowns: Record<string, any> = {};
    
    // Distribute weekly goals across days
    const dailyGoalDistribution = this.distributeGoalsAcrossWeek(weeklyGoals, context);
    
    // Generate daily plans for each day
    weekDays.forEach(date => {
      const dayTasks = dailyGoalDistribution[date] || [];
      const dailyContext = this.adjustContextForDay(context, date);
      const dailyPlan = this.generateDailyPlan(date, dailyContext, dayTasks);
      dailyBreakdowns[date] = dailyPlan;
    });

    // Create milestone schedule
    const milestones = this.createMilestoneSchedule(weeklyGoals, weekDays);
    
    // Define weekly themes
    const weeklyThemes = this.defineWeeklyThemes(dailyBreakdowns, context);
    
    const plan: GeneratedPlan = {
      id: '',
      user_id: '',
      plan_type: 'weekly',
      target_date: startDate,
      generated_at: new Date().toISOString(),
      based_on_data_until: this.getLatestDataDate(context),
      user_energy_pattern: context.energy_patterns,
      health_metrics: context.health_metrics,
      existing_commitments: context.existing_commitments,
      goals_considered: context.goals,
      plan_structure: {
        daily_plans: dailyBreakdowns,
        milestones: milestones,
        themes: weeklyThemes
      },
      adaptations_made: this.identifyWeeklyAdaptations(dailyBreakdowns),
      risk_factors: this.identifyWeeklyRisks(dailyBreakdowns),
      backup_options: this.generateWeeklyBackups(dailyBreakdowns),
      estimated_success_probability: this.calculateWeeklySuccessProbability(dailyBreakdowns),
      workload_balance_score: this.calculateWeeklyBalance(dailyBreakdowns),
      alignment_score: this.calculateWeeklyAlignment(dailyBreakdowns, context),
      status: 'active',
      created_at: new Date().toISOString()
    };

    return {
      plan,
      daily_breakdowns: dailyBreakdowns,
      milestone_schedule: milestones,
      weekly_themes: weeklyThemes
    };
  }

  /**
   * Replan when tasks are missed or circumstances change
   */
  static adaptivePlan(
    originalPlan: GeneratedPlan,
    missedTasks: string[],
    newConstraints: Partial<PlanningContext>,
    currentContext: PlanningContext
  ): {
    updated_plan: GeneratedPlan;
    changes_made: Array<{
      type: 'moved' | 'removed' | 'added' | 'modified';
      task_id: string;
      old_schedule?: string;
      new_schedule?: string;
      reason: string;
    }>;
    impact_assessment: {
      goals_affected: string[];
      timeline_changes: Record<string, number>; // goal_id -> days_delayed
      stress_impact: number;
    };
  } {
    const mergedContext = { ...currentContext, ...newConstraints };
    const changeLog: Array<any> = [];
    
    // Identify tasks that need rescheduling
    const tasksToReschedule = this.identifyTasksToReschedule(originalPlan, missedTasks);
    
    // Calculate new available time slots
    const availableSlots = this.calculateRemainingTimeSlots(originalPlan, mergedContext);
    
    // Reschedule missed and affected tasks
    const reschedulingResult = this.rescheduleTasksAdaptively(
      tasksToReschedule, 
      availableSlots, 
      mergedContext
    );

    // Update the plan structure
    const updatedPlanStructure = this.updatePlanStructure(
      originalPlan,
      reschedulingResult,
      changeLog
    );

    // Assess impact on goals and timelines
    const impactAssessment = this.assessReschedulingImpact(
      originalPlan,
      updatedPlanStructure,
      mergedContext.goals
    );

    const updatedPlan: GeneratedPlan = {
      ...originalPlan,
      plan_structure: updatedPlanStructure,
      adaptations_made: [
        ...(originalPlan.adaptations_made || []),
        `Adaptive replanning on ${new Date().toISOString()}: ${changeLog.length} changes made`
      ],
      estimated_success_probability: this.recalculateSuccessProbability(
        updatedPlanStructure,
        mergedContext
      ),
      status: 'active'
    };

    return {
      updated_plan: updatedPlan,
      changes_made: changeLog,
      impact_assessment: impactAssessment
    };
  }

  /**
   * Analyze user patterns from historical data
   */
  static analyzeUserPatterns(logs: DailyLog[]): {
    energy_by_hour: Record<string, number>;
    productivity_by_day: Record<string, number>;
    optimal_work_periods: Array<{
      start_hour: number;
      end_hour: number;
      energy_level: number;
    }>;
    break_patterns: {
      preferred_break_duration: number;
      optimal_break_frequency: number;
    };
  } {
    // Analyze energy patterns (this would use actual energy_level data from logs)
    const energyByHour = this.analyzeEnergyByHour(logs);
    
    // Analyze productivity patterns by day of week
    const productivityByDay = this.analyzeProductivityByDay(logs);
    
    // Identify optimal work periods
    const optimalWorkPeriods = this.identifyOptimalWorkPeriods(energyByHour);
    
    // Analyze break patterns
    const breakPatterns = this.analyzeBreakPatterns(logs);

    return {
      energy_by_hour: energyByHour,
      productivity_by_day: productivityByDay,
      optimal_work_periods: optimalWorkPeriods,
      break_patterns: breakPatterns
    };
  }

  // Private helper methods
  private static calculateAvailableTimeSlots(
    date: Date, 
    commitments: UserSchedule[]
  ): Array<{ start: string; end: string; duration: number }> {
    const dayCommitments = commitments.filter(commitment => 
      this.isCommitmentOnDay(commitment, date)
    );

    // Start with full day (6 AM to 11 PM)
    const slots = [];
    let currentTime = new Date(date);
    currentTime.setHours(6, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 0, 0, 0);

    // Sort commitments by time
    const sortedCommitments = dayCommitments.sort((a, b) => {
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    for (const commitment of sortedCommitments) {
      const commitmentStart = this.parseTime(commitment.start_time || '09:00');
      const commitmentEnd = this.parseTime(commitment.end_time || '17:00');

      // Add slot before commitment if there's time
      if (currentTime < commitmentStart) {
        const duration = (commitmentStart.getTime() - currentTime.getTime()) / (1000 * 60);
        if (duration >= 30) { // Minimum 30-minute slots
          slots.push({
            start: this.formatTime(currentTime),
            end: this.formatTime(commitmentStart),
            duration
          });
        }
      }

      currentTime = new Date(Math.max(currentTime.getTime(), commitmentEnd.getTime()));
    }

    // Add final slot if there's time left
    if (currentTime < endOfDay) {
      const duration = (endOfDay.getTime() - currentTime.getTime()) / (1000 * 60);
      if (duration >= 30) {
        slots.push({
          start: this.formatTime(currentTime),
          end: this.formatTime(endOfDay),
          duration
        });
      }
    }

    return slots;
  }

  private static getEnergyPatternForDay(dayOfWeek: number, context: PlanningContext): Record<string, number> {
    // Apply day-of-week modifiers to base energy patterns
    const basePattern = context.energy_patterns;
    const dayModifier = this.getDayOfWeekEnergyModifier(dayOfWeek);
    
    const adjustedPattern: Record<string, number> = {};
    Object.entries(basePattern).forEach(([hour, energy]) => {
      adjustedPattern[hour] = Math.max(1, Math.min(10, energy * dayModifier));
    });

    return adjustedPattern;
  }

  private static prioritizeTasks(
    tasks: PlanTask[], 
    context: PlanningContext, 
    energyPattern: Record<string, number>
  ): PlanTask[] {
    return tasks.sort((a, b) => {
      // Priority score calculation
      const priorityA = a.priority_level * 2;
      const priorityB = b.priority_level * 2;
      
      // Deadline urgency
      const urgencyA = a.deadline ? this.calculateDeadlineUrgency(a.deadline) : 0;
      const urgencyB = b.deadline ? this.calculateDeadlineUrgency(b.deadline) : 0;
      
      // Goal alignment
      const goalA = a.related_goal_id ? 1 : 0;
      const goalB = b.related_goal_id ? 1 : 0;

      const scoreA = priorityA + urgencyA + goalA;
      const scoreB = priorityB + urgencyB + goalB;

      return scoreB - scoreA;
    });
  }

  private static scheduleTasks(
    tasks: PlanTask[],
    availableSlots: Array<{ start: string; end: string; duration: number }>,
    energyPattern: Record<string, number>,
    context: PlanningContext
  ): {
    scheduled_tasks: Array<{
      task: PlanTask;
      scheduled_start: string;
      scheduled_end: string;
      reasoning: string;
    }>;
    breaks: Array<{ start: string; end: string; type: string }>;
    buffer_time: number;
  } {
    const scheduledTasks = [];
    const breaks = [];
    let totalBufferTime = 0;
    
    const usedSlots = [...availableSlots]; // Copy to modify

    for (const task of tasks) {
      const bestSlot = this.findBestSlotForTask(task, usedSlots, energyPattern);
      
      if (bestSlot) {
        const startTime = bestSlot.start;
        const endTime = this.addMinutes(startTime, task.estimated_duration_minutes);
        
        scheduledTasks.push({
          task,
          scheduled_start: startTime,
          scheduled_end: endTime,
          reasoning: this.generateSchedulingReasoning(task, bestSlot, energyPattern)
        });

        // Update available slots
        this.updateSlotsAfterScheduling(usedSlots, startTime, endTime, task.estimated_duration_minutes);
        
        // Add buffer time
        const bufferMinutes = Math.min(15, task.estimated_duration_minutes * 0.2);
        totalBufferTime += bufferMinutes;
      }
    }

    // Schedule breaks between high-focus tasks
    const breakSchedule = this.scheduleBreaks(scheduledTasks, context.preferences);
    breaks.push(...breakSchedule);

    return {
      scheduled_tasks: scheduledTasks,
      breaks,
      buffer_time: totalBufferTime
    };
  }

  private static findBestSlotForTask(
    task: PlanTask,
    availableSlots: Array<{ start: string; end: string; duration: number }>,
    energyPattern: Record<string, number>
  ): { start: string; end: string; duration: number } | null {
    let bestSlot = null;
    let bestScore = -1;

    for (const slot of availableSlots) {
      if (slot.duration >= task.estimated_duration_minutes) {
        const slotHour = parseInt(slot.start.split(':')[0]);
        const energyAtTime = energyPattern[slotHour.toString()] || 5;
        
        // Score based on energy match and task requirements
        const energyMatch = Math.abs(energyAtTime - task.energy_requirement) <= 2 ? 1 : 0.5;
        const durationMatch = slot.duration >= task.estimated_duration_minutes * 1.5 ? 1 : 0.7;
        
        const score = energyMatch * durationMatch;
        
        if (score > bestScore) {
          bestScore = score;
          bestSlot = slot;
        }
      }
    }

    return bestSlot;
  }

  // Additional helper methods would be implemented here...
  private static isCommitmentOnDay(commitment: UserSchedule, date: Date): boolean {
    const dayOfWeek = date.getDay();
    return commitment.days_of_week?.includes(dayOfWeek) || false;
  }

  private static parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private static formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  private static getDayOfWeekEnergyModifier(dayOfWeek: number): number {
    // Monday = 1, Sunday = 0
    const modifiers = [0.8, 1.0, 1.1, 1.1, 1.0, 0.9, 0.7]; // Sun-Sat
    return modifiers[dayOfWeek] || 1.0;
  }

  private static calculateDeadlineUrgency(deadline: string): number {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= 1) return 3;
    if (daysUntil <= 3) return 2;
    if (daysUntil <= 7) return 1;
    return 0;
  }

  private static addMinutes(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    return this.formatTime(date);
  }

  private static generateSchedulingReasoning(
    task: PlanTask,
    slot: any,
    energyPattern: Record<string, number>
  ): string {
    const slotHour = parseInt(slot.start.split(':')[0]);
    const energyAtTime = energyPattern[slotHour.toString()] || 5;
    
    return `Scheduled at ${slot.start} when energy level (${energyAtTime}) matches task requirements (${task.energy_requirement})`;
  }

  private static updateSlotsAfterScheduling(
    slots: any[], 
    startTime: string, 
    endTime: string, 
    duration: number
  ): void {
    // Implementation would update the available slots after scheduling a task
  }

  private static scheduleBreaks(scheduledTasks: any[], preferences: any): any[] {
    // Implementation would add appropriate breaks between tasks
    return [];
  }

  // Placeholder implementations for remaining methods
  private static identifyAdaptations(schedulingResult: any, context: PlanningContext): string[] {
    return ['Sample adaptation'];
  }

  private static assessPlanRisks(schedulingResult: any, context: PlanningContext): any {
    return {
      overload_risk: 0.3,
      energy_mismatch_risk: 0.2,
      schedule_conflict_risk: 0.1
    };
  }

  private static getLatestDataDate(context: PlanningContext): string {
    return new Date().toISOString().split('T')[0];
  }

  private static identifyRiskFactors(riskAssessment: any): any {
    return { high_workload: true };
  }

  private static generateBackupOptions(schedulingResult: any, availableSlots: any[]): any {
    return { alternative_schedules: [] };
  }

  private static calculateSuccessProbability(schedulingResult: any, riskAssessment: any): number {
    return 0.75;
  }

  private static calculateWorkloadBalance(schedulingResult: any): number {
    return 0.8;
  }

  private static calculateAlignmentScore(schedulingResult: any, context: PlanningContext): number {
    return 0.85;
  }

  // Additional methods for weekly planning and analysis would be implemented here...
  private static generateWeekDates(startDate: string): string[] {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }

  private static distributeGoalsAcrossWeek(weeklyGoals: any[], context: PlanningContext): Record<string, PlanTask[]> {
    // Implementation would distribute goals across the week
    return {};
  }

  private static adjustContextForDay(context: PlanningContext, date: string): PlanningContext {
    // Implementation would adjust context for specific day
    return context;
  }

  // More methods would be implemented for the complete functionality...
  private static createMilestoneSchedule(weeklyGoals: any[], weekDays: string[]): any[] {
    return [];
  }

  private static defineWeeklyThemes(dailyBreakdowns: any, context: PlanningContext): any[] {
    return [];
  }

  private static identifyWeeklyAdaptations(dailyBreakdowns: any): any[] {
    return [];
  }

  private static identifyWeeklyRisks(dailyBreakdowns: any): any {
    return {};
  }

  private static generateWeeklyBackups(dailyBreakdowns: any): any {
    return {};
  }

  private static calculateWeeklySuccessProbability(dailyBreakdowns: any): number {
    return 0.75;
  }

  private static calculateWeeklyBalance(dailyBreakdowns: any): number {
    return 0.8;
  }

  private static calculateWeeklyAlignment(dailyBreakdowns: any, context: PlanningContext): number {
    return 0.85;
  }

  private static identifyTasksToReschedule(originalPlan: GeneratedPlan, missedTasks: string[]): any[] {
    return [];
  }

  private static calculateRemainingTimeSlots(originalPlan: GeneratedPlan, context: PlanningContext): any[] {
    return [];
  }

  private static rescheduleTasksAdaptively(tasks: any[], slots: any[], context: PlanningContext): any {
    return {};
  }

  private static updatePlanStructure(originalPlan: GeneratedPlan, reschedulingResult: any, changeLog: any[]): any {
    return {};
  }

  private static assessReschedulingImpact(originalPlan: GeneratedPlan, updatedStructure: any, goals: UserGoal[]): any {
    return {
      goals_affected: [],
      timeline_changes: {},
      stress_impact: 0.2
    };
  }

  private static recalculateSuccessProbability(planStructure: any, context: PlanningContext): number {
    return 0.7;
  }

  private static analyzeEnergyByHour(logs: DailyLog[]): Record<string, number> {
    // Implementation would analyze energy levels by hour from logs
    return {};
  }

  private static analyzeProductivityByDay(logs: DailyLog[]): Record<string, number> {
    // Implementation would analyze productivity by day of week
    return {};
  }

  private static identifyOptimalWorkPeriods(energyByHour: Record<string, number>): any[] {
    return [];
  }

  private static analyzeBreakPatterns(logs: DailyLog[]): any {
    return {
      preferred_break_duration: 15,
      optimal_break_frequency: 2
    };
  }
}