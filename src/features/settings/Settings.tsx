import React, { useState } from 'react';
import { Download, User, Clock, Palette, LogOut, Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/GlassPanel';
import { useAuth } from '@/services/auth/AuthProvider';
import type { FocusPreset } from '@/types';

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const Settings: React.FC = () => {
  const {
    state,
    updateSettings,
    setView,
    createFocusPreset,
    updateFocusPreset,
    deleteFocusPreset,
    selectFocusPreset,
  } = useApp();
  const { user, signOut } = useAuth();
  const { settings } = state;
  const [newPresetName, setNewPresetName] = useState('');

  const handlePresetUpdate = (preset: FocusPreset, changes: Partial<FocusPreset>) => {
    void updateFocusPreset({ ...preset, ...changes });
  };

  const handleCreatePreset = () => {
    const name = newPresetName.trim();
    if (!name) return;

    void createFocusPreset({
      name,
      focusDurationMinutes: settings.defaultSessionMinutes,
      breakCount: 3,
      breakDurationMinutes: 5,
      longBreakDurationMinutes: 15,
      sessionsBeforeLongBreak: 4,
      sortOrder: state.focusPresets.length,
      isDefault: state.focusPresets.length === 0,
    });
    setNewPresetName('');
  };

  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm">Customize your LockIn experience</p>
      </header>

      <div className="space-y-6">
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
          <Input value={settings.name} onChange={e => updateSettings({ name: e.target.value })} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Focus</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Daily Goal (minutes)</label>
              <Input type="number" value={settings.dailyFocusGoalMinutes} onChange={e => updateSettings({ dailyFocusGoalMinutes: +e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Default Session (minutes)</label>
              <Input type="number" value={settings.defaultSessionMinutes} onChange={e => updateSettings({ defaultSessionMinutes: +e.target.value })} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Focus Presets</h3>
          </div>
          <div className="flex gap-2 mb-4">
            <Input
              value={newPresetName}
              onChange={e => setNewPresetName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreatePreset()}
              placeholder="New preset name"
            />
            <Button size="sm" onClick={handleCreatePreset}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-3">
            {state.focusPresets.map(preset => (
              <div key={preset.id} className="rounded-xl border border-border bg-card/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Input
                    value={preset.name}
                    onChange={e => handlePresetUpdate(preset, { name: e.target.value })}
                    className="h-8"
                  />
                  <Button
                    variant={state.activeFocusPresetId === preset.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectFocusPreset(preset.id)}
                  >
                    Use
                  </Button>
                  <button
                    onClick={() => void deleteFocusPreset(preset.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Focus minutes</label>
                    <Input type="number" value={preset.focusDurationMinutes} onChange={e => handlePresetUpdate(preset, { focusDurationMinutes: numberValue(e.target.value, preset.focusDurationMinutes) })} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Breaks</label>
                    <Input type="number" value={preset.breakCount} onChange={e => handlePresetUpdate(preset, { breakCount: numberValue(e.target.value, preset.breakCount) })} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Break minutes</label>
                    <Input type="number" value={preset.breakDurationMinutes} onChange={e => handlePresetUpdate(preset, { breakDurationMinutes: numberValue(e.target.value, preset.breakDurationMinutes) })} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Long break</label>
                    <Input type="number" value={preset.longBreakDurationMinutes} onChange={e => handlePresetUpdate(preset, { longBreakDurationMinutes: numberValue(e.target.value, preset.longBreakDurationMinutes) })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground mb-1 block">Sessions before long break</label>
                    <Input type="number" value={preset.sessionsBeforeLongBreak} onChange={e => handlePresetUpdate(preset, { sessionsBeforeLongBreak: numberValue(e.target.value, preset.sessionsBeforeLongBreak) })} />
                  </div>
                </div>
              </div>
            ))}
            {state.focusPresets.length === 0 && (
              <p className="text-sm text-muted-foreground">Create a preset to start focus sessions.</p>
            )}
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
  );
};
