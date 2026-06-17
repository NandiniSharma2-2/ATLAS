import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { 
  createDecisionSession, 
  getUserDecisionSessions, 
  analyzeDecision,
  addDecisionOption,
  addDecisionCriteria,
  getSuggestedCriteria
} from "@/lib/atlas.functions";
import { Panel, PanelHeader } from "@/components/atlas/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Brain, 
  Plus, 
  Target, 
  Scale, 
  TrendingUp,
  Clock,
  DollarSign,
  Zap,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings
} from "lucide-react";

const decisionsQuery = queryOptions({
  queryKey: ["atlas", "decisions"],
  queryFn: () => getUserDecisionSessions({ limit: 10 }),
});

export const Route = createFileRoute("/_authenticated/decision-hub")({
  head: () => ({
    meta: [{ title: "Decision Hub · ATLAS AI" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(decisionsQuery),
  component: DecisionHubPage,
});

function DecisionHubPage() {
  const { data: decisions } = useSuspenseQuery(decisionsQuery);
  const [newDecisionOpen, setNewDecisionOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  
  const qc = useQueryClient();
  
  const createSessionMutation = useMutation({
    mutationFn: createDecisionSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atlas", "decisions"] });
      setNewDecisionOpen(false);
    }
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-1">
            Decision Intelligence Hub
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Smart</span> Decision Making
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Structured analysis and AI-powered recommendations for better choices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={newDecisionOpen} onOpenChange={setNewDecisionOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/80">
                <Plus className="h-4 w-4 mr-2" />
                New Decision
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Create New Decision</DialogTitle>
              </DialogHeader>
              <NewDecisionForm 
                onSubmit={(data) => createSessionMutation.mutate(data)}
                isLoading={createSessionMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-background/50 border border-border">
          <TabsTrigger value="active" className="text-xs font-mono uppercase tracking-wider">
            Active Decisions
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-mono uppercase tracking-wider">
            Completed
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs font-mono uppercase tracking-wider">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {decisions.sessions && decisions.sessions.length > 0 ? (
            <div className="grid gap-4">
              {decisions.sessions
                .filter(session => session.status === 'active')
                .map((session) => (
                  <DecisionSessionCard 
                    key={session.id} 
                    session={session}
                    onSelect={setSelectedDecision}
                  />
                ))}
            </div>
          ) : (
            <Panel>
              <div className="text-center py-12 space-y-4">
                <Scale className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div className="space-y-2">
                  <div className="font-display text-lg text-muted-foreground">
                    No active decisions
                  </div>
                  <div className="text-sm text-muted-foreground max-w-md mx-auto">
                    Create your first decision to get AI-powered analysis and recommendations.
                  </div>
                </div>
                <Button 
                  onClick={() => setNewDecisionOpen(true)}
                  className="bg-accent hover:bg-accent/80"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Decision
                </Button>
              </div>
            </Panel>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <div className="grid gap-4">
            {decisions.sessions
              .filter(session => session.status === 'completed')
              .map((session) => (
                <DecisionSessionCard 
                  key={session.id} 
                  session={session}
                  onSelect={setSelectedDecision}
                  showOutcome
                />
              ))}
          </div>
          {decisions.sessions.filter(s => s.status === 'completed').length === 0 && (
            <Panel>
              <div className="text-center py-8 text-muted-foreground">
                No completed decisions yet.
              </div>
            </Panel>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Panel>
              <PanelHeader
                label="Decision Quality"
                title="Avg Confidence"
                right={<BarChart3 className="h-4 w-4 text-primary" />}
              />
              <div className="text-center py-4">
                <div className="font-display text-3xl font-bold text-accent">
                  {calculateAvgConfidence(decisions.sessions)}%
                </div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">
                  Analysis confidence
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                label="Decision Speed"
                title="Avg Time"
                right={<Clock className="h-4 w-4 text-[var(--color-success)]" />}
              />
              <div className="text-center py-4">
                <div className="font-display text-3xl font-bold text-[var(--color-success)]">
                  {calculateAvgDecisionTime(decisions.sessions)}
                </div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">
                  Days to decide
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                label="Success Rate"
                title="Completion"
                right={<CheckCircle className="h-4 w-4 text-accent" />}
              />
              <div className="text-center py-4">
                <div className="font-display text-3xl font-bold text-accent">
                  {calculateCompletionRate(decisions.sessions)}%
                </div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">
                  Completed decisions
                </div>
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelHeader
              label="Decision Patterns"
              title="Analysis trends"
              right={<Brain className="h-4 w-4 text-primary" />}
            />
            <div className="text-center py-8 text-muted-foreground">
              Decision pattern analysis coming soon...
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface DecisionSessionCardProps {
  session: any;
  onSelect: (id: string) => void;
  showOutcome?: boolean;
}

function DecisionSessionCard({ session, onSelect, showOutcome }: DecisionSessionCardProps) {
  const statusColors = {
    active: 'text-accent',
    completed: 'text-[var(--color-success)]',
    cancelled: 'text-muted-foreground'
  };

  const importanceColors = {
    1: 'text-muted-foreground',
    2: 'text-muted-foreground', 
    3: 'text-[var(--color-warning)]',
    4: 'text-destructive',
    5: 'text-destructive'
  };

  return (
    <Panel 
      className="cursor-pointer hover:border-accent/50 transition-colors"
      onClick={() => onSelect(session.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge 
              variant="outline" 
              className={`text-[10px] font-mono uppercase ${statusColors[session.status as keyof typeof statusColors]}`}
            >
              {session.status}
            </Badge>
            <div className="flex items-center gap-1">
              {[...Array(session.importance_level)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 w-2 rounded-full ${
                    importanceColors[session.importance_level as keyof typeof importanceColors]
                  } ${i < session.importance_level ? 'bg-current' : 'bg-current/20'}`} 
                />
              ))}
            </div>
          </div>
          
          <h3 className="font-display font-semibold mb-1">{session.title}</h3>
          
          {session.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {session.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>{session.summary?.options_count || 0} options</span>
            </div>
            <div className="flex items-center gap-1">
              <Scale className="h-3 w-3" />
              <span>{session.summary?.criteria_count || 0} criteria</span>
            </div>
            {session.deadline && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Due {new Date(session.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          {session.summary?.has_analysis && (
            <div className="mb-2">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {Math.round((session.summary.confidence_score || 0) * 100)}% confidence
              </Badge>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            {new Date(session.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Panel>
  );
}

interface NewDecisionFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function NewDecisionForm({ onSubmit, isLoading }: NewDecisionFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState('3');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      importance_level: parseInt(importance),
      deadline: deadline || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          Decision Title *
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What decision are you making?"
          required
        />
      </div>

      <div>
        <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional context about this decision..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            Importance Level
          </label>
          <Select value={importance} onValueChange={setImportance}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Low</SelectItem>
              <SelectItem value="2">2 - Minor</SelectItem>
              <SelectItem value="3">3 - Moderate</SelectItem>
              <SelectItem value="4">4 - Important</SelectItem>
              <SelectItem value="5">5 - Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            Deadline (Optional)
          </label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!title || isLoading}
          className="bg-accent hover:bg-accent/80"
        >
          {isLoading ? 'Creating...' : 'Create Decision'}
        </Button>
      </div>
    </form>
  );
}

// Helper functions
function calculateAvgConfidence(sessions: any[]): number {
  const withConfidence = sessions.filter(s => s.summary?.confidence_score);
  if (withConfidence.length === 0) return 0;
  
  const total = withConfidence.reduce((sum, s) => sum + (s.summary.confidence_score || 0), 0);
  return Math.round((total / withConfidence.length) * 100);
}

function calculateAvgDecisionTime(sessions: any[]): string {
  const completed = sessions.filter(s => s.status === 'completed' && s.completed_at);
  if (completed.length === 0) return '0';
  
  const totalDays = completed.reduce((sum, s) => {
    const created = new Date(s.created_at);
    const completed = new Date(s.completed_at);
    const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return (totalDays / completed.length).toFixed(1);
}

function calculateCompletionRate(sessions: any[]): number {
  if (sessions.length === 0) return 0;
  const completed = sessions.filter(s => s.status === 'completed').length;
  return Math.round((completed / sessions.length) * 100);
}