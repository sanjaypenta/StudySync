const KEY = "studysync_onboarding_complete";

export function isOnboardingCompleteLocal(): boolean {
  return localStorage.getItem(KEY) === "true";
}

export function setOnboardingCompleteLocal(done: boolean): void {
  if (done) localStorage.setItem(KEY, "true");
  else localStorage.removeItem(KEY);
}
