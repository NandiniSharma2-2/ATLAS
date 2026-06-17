import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { getHealthData, createHabit, createGoal } from "@/lib/atlas.functions";
import { useUserHabits, useUserGoals, useInvalidateAtlasData } from "@/hooks/useHealthInsights";
import { Panel, PanelHeader } from "@/components/atlas/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings, 
  Plus, 
  Target, 
  Activity,
  Calendar,
  User,
  Bell,
  Shield,
  Database,
  Zap,
  Trash2,
  Edit3
} from "lucide-react";

const healthDataQuery = queryOptions({
  queryKey: ["atlas", "health-data"],
  queryFn: () => getHealthData(),
});

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings · ATLAS AI" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(healthDataQuery),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: healthData } = useSuspenseQuery(healthDataQuery);
  const habits = useUserHabits();
  const goals = useUserGoals();
  const invalidate = useInvalidateAtlasData();
  
  const [newHabitOpen, setNewHabitOpen] = useState(false);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  
  const qc = useQueryClient();
  
  const createHabitMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atlas", "user-habits"] });
      setNewHabitOpen(false);
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atlas", "user-goals"] });
      setNewGoalOpen(false);
    }
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-1">
            System Configuration
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Settings</span> & Preferences
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Configure your ATLAS experience, manage goals, habits, and system preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Health OS Configuration
          </span>
        </div>
      </div>

      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-background/50 border border-border">
          <TabsTrigger value="goals" className="text-xs font-mono uppercase tracking-wider">
            Goals
          </TabsTrigger>
          <TabsTrigger value="habits" className="text-xs font-mono uppercase tracking-wider">
            Habits
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-xs font-mono uppercase tracking-wider">
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs font-mono uppercase tracking-wider">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs font-mono uppercase tracking-wider">
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
          <Panel>
            <PanelHeader
              label="Goal Management"
              title={`${goals.data?.goals?.length || 0} active goals`}
              right={
                <Dialog open={newGoalOpen} onOpenChange={setNewGoalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-accent hover:bg-accent/80">
                      <Plus className="h-4 w-4 mr-2" />
                      New Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background border-border">
                    <DialogHeader>
                      <DialogTitle className="font-display">Create New Goal</DialogTitle>
                    </DialogHeader>
                    <NewGoalForm 
                      onSubmit={(data) => createGoalMutation.mutate(data)}
                      isLoading={createGoalMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              }
            />
            
            {goals.data?.goals && goals.data.goals.length > 0 ? (
              <div className="space-y-3">
                {goals.data.goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <Target className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <div className="text-muted-foreground">
                  No goals set yet. Create your first health goal to get started.
                </div>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="habits" className="space-y-6">
          <Panel>
            <PanelHeader
              label="Habit Management"
              title={`${habits.data?.habits?.length || 0} active habits`}
              right={
                <Dialog open={newHabitOpen} onOpenChange={setNewHabitOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-accent hover:bg-accent/80">
                      <Plus className="h-4 w-4 mr-2" />
                      New Habit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background border-border">
                    <DialogHeader>
                      <DialogTitle className="font-display">Create New Habit</DialogTitle>
                    </DialogHeader>
                    <NewHabitForm 
                      onSubmit={(data) => createHabitMutation.mutate(data)}
                      isLoading={createHabitMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              }
            />
            
            {habits.data?.habits && habits.data.habits.length > 0 ? (
              <div className="space-y-3">
                {habits.data.habits.map((habit) => (
                  <HabitCard key={habit.id} habit={habit} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <div className="text-muted-foreground">
                  No habits tracked yet. Create your first habit to build consistency.
                </div>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Panel>
            <PanelHeader
              label="User Profile"
              title="Personal information"
              right={<User className="h-4 w-4 text-primary" />}
            />
            <div className="space-y-4">
              <div>
                <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                  Display Name
                </label>
                <Input 
                  value={healthData.fullName || ''} 
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                    Time Zone
                  </label>
                  <Select defaultValue="auto">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                    Date Format
                  </label>
                  <Select defaultValue="mdy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Update Profile
                </Button>
              </div>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Panel>
            <PanelHeader
              label="Notification Preferences"
              title="AI coaching alerts"
              right={<Bell className="h-4 w-4 text-[var(--color-warning)]" />}
            />
            <div className="space-y-4">
              <NotificationToggle 
                title="Health Insights" 
                description="Get notified when ATLAS discovers new patterns"
                defaultChecked={true}
              />
              <NotificationToggle 
                title="Recommendation Updates" 
                description="Receive personalized health recommendations"
                defaultChecked={true}
              />
              <NotificationToggle 
                title="Goal Milestones" 
                description="Celebrate when you hit goal milestones"
                defaultChecked={true}
              />
              <NotificationToggle 
                title="Habit Reminders" 
                description="Daily reminders for habit tracking"
                defaultChecked={false}
              />
              <NotificationToggle 
                title="Risk Alerts" 
                description="Early warning for health risks"
                defaultChecked={true}
              />
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Panel>
            <PanelHeader
              label="Data Management"
              title="Export & privacy controls"
              right={<Database className="h-4 w-4 text-primary" />}
            />
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-display font-semibold">Export Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Download your health data, insights, and AI analysis results.
                  </p>
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-display font-semibold">Privacy Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Control how your data is used for AI analysis and insights.
                  </p>
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Privacy Settings
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="space-y-3">
                  <h4 className="font-display font-semibold text-destructive">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data.
                  </p>
                  <Button variant="destructive" className="bg-destructive/10 text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface GoalCardProps {
  goal: any;
}

function GoalCard({ goal }: GoalCardProps) {
  const progressPercentage = goal.progress_percentage || 0;
  
  return (
    <div className="p-4 rounded-lg bg-background/40 border border-border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              {goal.category}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-[10px] font-mono ${
                goal.priority === 'high' ? 'text-destructive' :
                goal.priority === 'medium' ? 'text-[var(--color-warning)]' :
                'text-muted-foreground'
              }`}
            >
              {goal.priority}
            </Badge>
          </div>
          <h4 className="font-display font-semibold">{goal.title}</h4>
          {goal.description && (
            <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
          )}
        </div>
        <Button variant="ghost" size="sm">
          <Edit3 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono">{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-accent rounded-full h-2 transition-all"
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface HabitCardProps {
  habit: any;
}

function HabitCard({ habit }: HabitCardProps) {
  const analysis = habit.consistency_analysis;
  
  return (
    <div className="p-4 rounded-lg bg-background/40 border border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              {habit.category}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              {habit.frequency_period}
            </Badge>
          </div>
          <h4 className="font-display font-semibold mb-2">{habit.name}</h4>
          
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="text-muted-foreground">Streak</div>
              <div className="font-mono font-bold text-accent">
                {analysis?.streak_current || 0}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Rate</div>
              <div className="font-mono font-bold">
                {Math.round((analysis?.completion_rate || 0) * 100)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Best</div>
              <div className="font-mono font-bold text-[var(--color-success)]">
                {analysis?.streak_longest || 0}
              </div>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Edit3 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface NewGoalFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function NewGoalForm({ onSubmit, isLoading }: NewGoalFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      category,
      target_value: targetValue ? parseFloat(targetValue) : undefined,
      target_unit: targetUnit || undefined,
      target_date: targetDate || undefined,
      priority
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          Goal Title *
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Lose 10 pounds"
          required
        />
      </div>

      <div>
        <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          Category *
        </label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weight">Weight Loss</SelectItem>
            <SelectItem value="fitness">Fitness</SelectItem>
            <SelectItem value="sleep">Sleep</SelectItem>
            <SelectItem value="nutrition">Nutrition</SelectItem>
            <SelectItem value="wellness">Wellness</SelectItem>
            <SelectItem value="mental-health">Mental Health</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details about this goal..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            Target Value
          </label>
          <Input
            type="number"
            step="0.1"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="e.g., 150"
          />
        </div>
        <div>
          <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            Unit
          </label>
          <Input
            value={targetUnit}
            onChange={(e) => setTargetUnit(e.target.value)}
            placeholder="e.g., lbs, steps, hours"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            Target Date
          </label>
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            Priority
          </label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!title || !category || isLoading}
          className="bg-accent hover:bg-accent/80"
        >
          {isLoading ? 'Creating...' : 'Create Goal'}
        </Button>
      </div>
    </form>
  );
}

interface NewHabitFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function NewHabitForm({ onSubmit, isLoading }: NewHabitFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('1');
  const [period, setPeriod] = useState('daily');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      category,
      target_frequency: parseInt(frequency),
      frequency_period: period
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          Habit Name *
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Drink 8 glasses of water"
          required
        />
      </div>

      <div>
        <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          Category *
        </label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="health">Health</SelectItem>
            <SelectItem value="fitness">Fitness</SelectItem>
            <SelectItem value="nutrition">Nutrition</SelectItem>
            <SelectItem value="wellness">Wellness</SelectItem>
            <SelectItem value="productivity">Productivity</SelectItem>
            <SelectItem value="mindfulness">Mindfulness</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            Frequency
          </label>
          <Input
            type="number"
            min="1"
            max="10"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            Period
          </label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!name || !category || isLoading}
          className="bg-accent hover:bg-accent/80"
        >
          {isLoading ? 'Creating...' : 'Create Habit'}
        </Button>
      </div>
    </form>
  );
}

interface NotificationToggleProps {
  title: string;
  description: string;
  defaultChecked?: boolean;
}

function NotificationToggle({ title, description, defaultChecked }: NotificationToggleProps) {
  const [enabled, setEnabled] = useState(defaultChecked || false);
  
  return (
    <div className="flex items-start justify-between p-3 rounded-lg bg-background/40 border border-border">
      <div className="flex-1">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      </div>
      <Button
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={() => setEnabled(!enabled)}
        className={enabled ? "bg-accent hover:bg-accent/80" : ""}
      >
        {enabled ? 'Enabled' : 'Disabled'}
      </Button>
    </div>
  );
}