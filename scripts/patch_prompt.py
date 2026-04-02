import pathlib
p = pathlib.Path(r"e:/StudySync/backend/src/routes/profileRoutes.ts")
t = p.read_text(encoding="utf-8")
if "Stress factors:" in t:
    print("already ok")
else:
    t = t.replace(
        "Burnout tendency: ${doc.burnoutLevel}\nPreferred style:",
        "Burnout tendency: ${doc.burnoutLevel}\nSleep quality: ${doc.sleepQuality ?? \"ok\"}\nWeekly study target (hours): ${doc.weeklyStudyHoursTarget ?? 10}\nStress factors: ${(doc.stressFactors ?? []).join(\", \") || \"none listed\"}\nPreferred style:",
    )
    p.write_text(t, encoding="utf-8")
    print("prompt ok")
