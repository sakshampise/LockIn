/**
 * Break Planner — Single source of truth for LockIn focus session scheduling.
 *
 * Implements evidence-based break scheduling:
 *  - Sessions ≤ 20 min: no breaks
 *  - Sessions 21–45 min: 1 short break at midpoint
 *  - Sessions 46–90 min: 1 break at the ~55–60 min mark
 *  - Sessions 91–150 min: 2 breaks, evenly distributed
 *  - Sessions > 150 min: 3 breaks, one of which is a long break
 *
 * Users may skip breaks but cannot add breaks beyond the automatic recommendation.
 * The planner is deterministic: given the same inputs it always produces the same plan.
 */

export type BreakMode = 'auto' | 'off';

export interface BreakSlot {
  /** Minute offset from session start at which the break begins */
  atMinute: number;
  /** Duration of this break in minutes */
  durationMinutes: number;
  /** Whether this is a long recovery break */
  isLong: boolean;
  /** Human-readable label */
  label: string;
}

export interface FocusBlock {
  /** Label shown to the user */
  label: string;
  /** Duration of this focus block in minutes */
  durationMinutes: number;
  /** Minute offset from session start */
  startsAtMinute: number;
}

export interface SessionPlan {
  /** Total focus duration requested by user (excludes break time) */
  focusDurationMinutes: number;
  /** Whether breaks are active */
  breaksEnabled: boolean;
  /** Ordered sequence of focus blocks */
  focusBlocks: FocusBlock[];
  /** Ordered sequence of breaks (empty when breaksEnabled is false) */
  breaks: BreakSlot[];
  /** Total wall-clock duration including breaks */
  totalMinutes: number;
  /** Human-readable recommendation shown in the sidebar */
  recommendationText: string;
  /** Estimated finish time as a formatted string, given a start time */
  estimatedFinish: (startTime?: Date) => string;
}

// Evidence-based break count thresholds
const NO_BREAK_THRESHOLD = 20;       // ≤20 min: no breaks needed
const ONE_BREAK_THRESHOLD = 90;      // ≤90 min: 1 break
const TWO_BREAK_THRESHOLD = 150;     // ≤150 min: 2 breaks

const SHORT_BREAK_MIN = 5;
const MEDIUM_BREAK_MIN = 10;
const LONG_BREAK_MIN = 15;

function formatFinishTime(start: Date, totalMinutes: number): string {
  const finish = new Date(start.getTime() + totalMinutes * 60000);
  return finish.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function recommendationFor(focusMin: number, breakCount: number, totalMin: number): string {
  if (breakCount === 0) {
    return focusMin <= NO_BREAK_THRESHOLD
      ? 'A short sprint. Stay locked in and finish strong.'
      : 'Deep work block with no scheduled interruptions.';
  }
  if (breakCount === 1) {
    return `One break keeps your attention sharp for the full ${focusMin} minutes.`;
  }
  if (breakCount === 2) {
    return `Two breaks sustain cognitive performance across ${Math.round(totalMin / 60 * 10) / 10}h.`;
  }
  return `Extended session. ${breakCount} breaks prevent fatigue and maintain deep work quality.`;
}

/**
 * Build a session plan from focus duration and break mode.
 * This is the single source of truth — both ContextPanel and FocusMode use this.
 */
export function buildSessionPlan(
  focusDurationMinutes: number,
  mode: BreakMode,
): SessionPlan {
  const focusMin = Math.max(1, Math.round(focusDurationMinutes));
  const breaksEnabled = mode === 'auto' && focusMin > NO_BREAK_THRESHOLD;

  if (!breaksEnabled) {
    const plan: SessionPlan = {
      focusDurationMinutes: focusMin,
      breaksEnabled: false,
      focusBlocks: [{ label: 'Focus', durationMinutes: focusMin, startsAtMinute: 0 }],
      breaks: [],
      totalMinutes: focusMin,
      recommendationText: recommendationFor(focusMin, 0, focusMin),
      estimatedFinish: (start = new Date()) => formatFinishTime(start, focusMin),
    };
    return plan;
  }

  // Determine break configuration
  let breakCount: number;
  let shortBreakMin: number;
  let longBreakMin: number;

  if (focusMin <= ONE_BREAK_THRESHOLD) {
    breakCount = 1;
    shortBreakMin = focusMin <= 45 ? SHORT_BREAK_MIN : MEDIUM_BREAK_MIN;
    longBreakMin = shortBreakMin;
  } else if (focusMin <= TWO_BREAK_THRESHOLD) {
    breakCount = 2;
    shortBreakMin = MEDIUM_BREAK_MIN;
    longBreakMin = LONG_BREAK_MIN;
  } else {
    breakCount = 3;
    shortBreakMin = MEDIUM_BREAK_MIN;
    longBreakMin = LONG_BREAK_MIN;
  }

  // Distribute focus time evenly across blocks
  const focusPerBlock = Math.floor(focusMin / (breakCount + 1));
  const remainderFocus = focusMin - focusPerBlock * (breakCount + 1);

  const focusBlocks: FocusBlock[] = [];
  const breaks: BreakSlot[] = [];
  let cursor = 0;

  for (let i = 0; i <= breakCount; i++) {
    const isLast = i === breakCount;
    const blockDuration = focusPerBlock + (isLast ? remainderFocus : 0);
    focusBlocks.push({
      label: `Focus ${i + 1}`,
      durationMinutes: blockDuration,
      startsAtMinute: cursor,
    });
    cursor += blockDuration;

    if (!isLast) {
      // Long break for the last break in sessions with 3 breaks; short for others
      const isLongBreak = breakCount >= 3 && i === Math.floor(breakCount / 2);
      const breakDuration = isLongBreak ? longBreakMin : shortBreakMin;
      breaks.push({
        atMinute: cursor,
        durationMinutes: breakDuration,
        isLong: isLongBreak,
        label: isLongBreak
          ? `Long break · ${longBreakMin}m`
          : `Break · ${shortBreakMin}m`,
      });
      cursor += breakDuration;
    }
  }

  const totalMinutes = cursor;

  return {
    focusDurationMinutes: focusMin,
    breaksEnabled: true,
    focusBlocks,
    breaks,
    totalMinutes,
    recommendationText: recommendationFor(focusMin, breakCount, totalMinutes),
    estimatedFinish: (start = new Date()) => formatFinishTime(start, totalMinutes),
  };
}

/**
 * Given elapsed seconds in the session wall-clock, return the current phase.
 * Phase is either a FocusBlock or a BreakSlot.
 */
export type ActivePhase =
  | { type: 'focus'; block: FocusBlock; secondsLeft: number; nextBreak: BreakSlot | null }
  | { type: 'break'; slot: BreakSlot; secondsLeft: number; nextBlock: FocusBlock | null };

export function getActivePhase(plan: SessionPlan, elapsedSeconds: number): ActivePhase {
  const elapsedMinutes = elapsedSeconds / 60;
  const all: Array<{ kind: 'focus' | 'break'; startsAtMinute: number; durationMinutes: number; ref: FocusBlock | BreakSlot }> = [];

  for (const block of plan.focusBlocks) {
    all.push({ kind: 'focus', startsAtMinute: block.startsAtMinute, durationMinutes: block.durationMinutes, ref: block });
  }
  for (const slot of plan.breaks) {
    all.push({ kind: 'break', startsAtMinute: slot.atMinute, durationMinutes: slot.durationMinutes, ref: slot });
  }
  all.sort((a, b) => a.startsAtMinute - b.startsAtMinute);

  let current = all[all.length - 1]; // default to last phase
  for (const phase of all) {
    if (elapsedMinutes >= phase.startsAtMinute && elapsedMinutes < phase.startsAtMinute + phase.durationMinutes) {
      current = phase;
      break;
    }
    if (elapsedMinutes < phase.startsAtMinute) {
      current = phase;
      break;
    }
  }

  const currentIdx = all.indexOf(current);
  const phaseElapsed = elapsedMinutes - current.startsAtMinute;
  const secondsLeft = Math.max(0, Math.round((current.durationMinutes - phaseElapsed) * 60));

  if (current.kind === 'focus') {
    const nextBreakPhase = all.slice(currentIdx + 1).find(p => p.kind === 'break');
    return {
      type: 'focus',
      block: current.ref as FocusBlock,
      secondsLeft,
      nextBreak: nextBreakPhase ? (nextBreakPhase.ref as BreakSlot) : null,
    };
  }
  const nextFocusPhase = all.slice(currentIdx + 1).find(p => p.kind === 'focus');
  return {
    type: 'break',
    slot: current.ref as BreakSlot,
    secondsLeft,
    nextBlock: nextFocusPhase ? (nextFocusPhase.ref as FocusBlock) : null,
  };
}
