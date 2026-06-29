import React, { useState } from 'react';
import { Download, User, Palette, LogOut, Clock } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/GlassPanel';
import { useAuth } from '@/services/auth/AuthProvider';


export const Settings: React.FC = () => {
  const { state, updateSettings, setView } = useApp();
  const { user, signOut } = useAuth();
  const { settings } = state;
  const [nameDraft, setNameDraft] = useState(settings.name);
  const [dailyGoalDraft, setDailyGoalDraft] = useState(String(settings.dailyFocusGoalMinutes));

  React.useEffect(() => {
    setNameDraft(settings.name);
    setDailyGoalDraft(String(settings.dailyFocusGoalMinutes));
  }, [settings.name, settings.dailyFocusGoalMinutes]);

  const commitName = () => {
    const name = nameDraft.trim();
    if (name && name !== settings.name) void updateSettings({ name });
    if (!name) setNameDraft(settings.name);
  };

  const commitDailyGoal = () => {
    const parsed = Number(dailyGoalDraft);
    const value = Math.min(1440, Math.max(1, Number.isFinite(parsed) ? parsed : settings.dailyFocusGoalMinutes));
    setDailyGoalDraft(String(value));
    if (value !== settings.dailyFocusGoalMinutes) void updateSettings({ dailyFocusGoalMinutes: value });
  };


  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-8 max-w-2xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
          <p className="text-muted-foreground text-sm">Customize your LockIn experience</p>
        </header>

        <div className="space-y-6 pb-8">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Account</h3>
                </div>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Profile</h3>
            </div>
            <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
            <Input
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => e.key === 'Enter' && commitName()}
            />
          </Card>


          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Daily Goal</h3>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Daily Focus Goal (minutes)</label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={dailyGoalDraft}
                onChange={e => setDailyGoalDraft(e.target.value)}
                onBlur={commitDailyGoal}
                onKeyDown={e => e.key === 'Enter' && commitDailyGoal()}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Appearance</h3>
            </div>
            <p className="text-xs text-muted-foreground">Dark mode is enabled by default for deep work.</p>
          </Card>

          <Card className="p-5 border-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${settings.cloudAiEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                </div>
                <h3 className="text-sm font-medium">AI Provider</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{settings.cloudAiEnabled ? 'Cloud Enabled' : 'Offline Mode'}</span>
                <button
                  type="button"
                  onClick={() => updateSettings({ cloudAiEnabled: !settings.cloudAiEnabled })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background ${settings.cloudAiEnabled ? 'bg-emerald-500' : 'bg-muted'}`}
                >
                  <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.cloudAiEnabled ? 'translate-x-2' : '-translate-x-2'}`} />
                </button>
              </div>
            </div>
            
            <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Provider</span>
                <span className="font-medium text-foreground">{settings.cloudAiEnabled ? 'Sarvam AI (Cloud proxy)' : 'Local Intelligence (Offline)'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connection Status</span>
                {settings.cloudAiEnabled ? (
                  <span className="text-emerald-500 font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Edge Function Ready
                  </span>
                ) : (
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Disconnected
                  </span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Cloud AI uses the Sarvam AI model powered by Supabase Edge Functions. If disabled or unreachable, the system automatically falls back to the deterministic local intelligence engine.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Import</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Import your workspace from Notion</p>
            <Button variant="outline" onClick={() => setView('notion-import')}>Open Notion Import</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
