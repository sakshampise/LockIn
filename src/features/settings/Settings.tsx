import React, { useState } from 'react';
import { Download, User, Clock, Palette, LogOut } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/GlassPanel';
import { useAuth } from '@/services/auth/AuthProvider';

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const Settings: React.FC = () => {
  const { state, updateSettings, setView } = useApp();
  const { user, signOut } = useAuth();
  const { settings } = state;
  const [nameDraft, setNameDraft] = useState(settings.name);
  const [dailyGoalDraft, setDailyGoalDraft] = useState(String(settings.dailyFocusGoalMinutes));
  const [defaultSessionDraft, setDefaultSessionDraft] = useState(String(settings.defaultSessionMinutes));

  React.useEffect(() => {
    setNameDraft(settings.name);
    setDailyGoalDraft(String(settings.dailyFocusGoalMinutes));
    setDefaultSessionDraft(String(settings.defaultSessionMinutes));
  }, [settings.dailyFocusGoalMinutes, settings.defaultSessionMinutes, settings.name]);

  const commitName = () => {
    const name = nameDraft.trim();
    if (name && name !== settings.name) void updateSettings({ name });
    if (!name) setNameDraft(settings.name);
  };

  const commitDailyGoal = () => {
    const value = Math.min(1440, Math.max(1, numberValue(dailyGoalDraft, settings.dailyFocusGoalMinutes)));
    setDailyGoalDraft(String(value));
    if (value !== settings.dailyFocusGoalMinutes) void updateSettings({ dailyFocusGoalMinutes: value });
  };

  const commitDefaultSession = () => {
    const value = Math.min(240, Math.max(1, numberValue(defaultSessionDraft, settings.defaultSessionMinutes)));
    setDefaultSessionDraft(String(value));
    if (value !== settings.defaultSessionMinutes) void updateSettings({ defaultSessionMinutes: value });
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
              <h3 className="text-sm font-medium">Focus Defaults</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Daily Goal (minutes)</label>
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
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Default Session (minutes)</label>
                <Input
                  type="number"
                  min={1}
                  max={240}
                  value={defaultSessionDraft}
                  onChange={e => setDefaultSessionDraft(e.target.value)}
                  onBlur={commitDefaultSession}
                  onKeyDown={e => e.key === 'Enter' && commitDefaultSession()}
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Appearance</h3>
            </div>
            <p className="text-xs text-muted-foreground">Dark mode is enabled by default for deep work.</p>
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
