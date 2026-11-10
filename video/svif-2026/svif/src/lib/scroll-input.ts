/** Bound queued wheel travel, not each event: repeated input cannot build a fast-forward backlog. */
export function pacedWheelDelta(delta: number, pending: number, viewportHeight: number, pace = 1) {
  if (!Number.isFinite(delta) || !Number.isFinite(pending)) return 0;
  const lead = Math.min(260, Math.max(150, viewportHeight * 0.25)) * pace;
  // Reversing direction cancels the old momentum before moving the other way.
  const base = delta * pending < 0 ? 0 : pending;
  const target = Math.min(lead, Math.max(-lead, base + delta * 0.75 * pace));
  return target - pending;
}

/** Extra resistance in the six-step home story, easing down to 20% at step boundaries. */
export function homeStoryPace(progressInSteps: number) {
  const distance = Math.abs(progressInSteps - Math.round(progressInSteps));
  const blend = Math.min(1, distance / 0.3);
  return 0.2 + 0.2 * blend * blend * (3 - 2 * blend);
}
