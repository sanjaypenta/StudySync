import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/lib/api.ts")
t = p.read_text(encoding="utf-8")
if "sleepQuality" not in t[:2000]:
    t = t.replace(
        "  preferredStudyStyle: StudyStyle;\n};",
        '  preferredStudyStyle: StudyStyle;\n  sleepQuality?: "poor" | "ok" | "good";\n  stressFactors?: string[];\n  weeklyStudyHoursTarget?: number;\n};',
    )
    t = t.replace(
        "    preferredStudyStyle: StudyStyle;\n  }>",
        """    preferredStudyStyle: StudyStyle;
    sleepQuality?: "poor" | "ok" | "good";
    stressFactors?: string[];
    weeklyStudyHoursTarget?: number;
  }>""",
    )
    p.write_text(t, encoding="utf-8")
print("api patch ok")
