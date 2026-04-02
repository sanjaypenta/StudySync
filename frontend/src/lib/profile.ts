export type BurnoutLevel = "low" | "medium" | "high";
export type StudyStyle = "light" | "intense";

export interface UserProfile {
  dailyStudyHoursLimit: number;
  burnoutLevel: BurnoutLevel;
  preferredStudyStyle: StudyStyle;
}

const KEY = "studysync_profile";

const defaultProfile: UserProfile = {
  dailyStudyHoursLimit: 4,
  burnoutLevel: "medium",
  preferredStudyStyle: "light",
};

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultProfile };
    const p = JSON.parse(raw) as Partial<UserProfile>;
    return {
      dailyStudyHoursLimit:
        typeof p.dailyStudyHoursLimit === "number"
          ? p.dailyStudyHoursLimit
          : defaultProfile.dailyStudyHoursLimit,
      burnoutLevel:
        p.burnoutLevel === "low" ||
        p.burnoutLevel === "medium" ||
        p.burnoutLevel === "high"
          ? p.burnoutLevel
          : defaultProfile.burnoutLevel,
      preferredStudyStyle:
        p.preferredStudyStyle === "intense" ? "intense" : "light",
    };
  } catch {
    return { ...defaultProfile };
  }
}

export function saveProfile(p: UserProfile): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}
