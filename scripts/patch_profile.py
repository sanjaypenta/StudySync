import pathlib
pr = pathlib.Path(r"e:/StudySync/backend/src/routes/profileRoutes.ts")
t = pr.read_text(encoding="utf-8")
if "sleepQuality" not in t:
    t = t.replace(
        "  lastBurnoutTip: string;\n}) {",
        "  lastBurnoutTip: string;\n  sleepQuality: \"poor\" | \"ok\" | \"good\";\n  stressFactors: string[];\n  weeklyStudyHoursTarget: number;\n}) {",
    )
    t = t.replace(
        "    lastBurnoutTip: p.lastBurnoutTip ?? \"\",\n  };",
        """    lastBurnoutTip: p.lastBurnoutTip ?? "",
    sleepQuality: p.sleepQuality ?? "ok",
    stressFactors: p.stressFactors ?? [],
    weeklyStudyHoursTarget: p.weeklyStudyHoursTarget ?? 10,
  };""",
    )
    t = t.replace(
        "    if (typeof body.learnerSummary === \"string\") {\n      updates.learnerSummary = body.learnerSummary;\n    }",
        """    if (typeof body.learnerSummary === "string") {
      updates.learnerSummary = body.learnerSummary;
    }
    if (body.sleepQuality === "poor" || body.sleepQuality === "ok" || body.sleepQuality === "good") {
      updates.sleepQuality = body.sleepQuality;
    }
    if (Array.isArray(body.stressFactors)) {
      updates.stressFactors = (body.stressFactors as unknown[]).map((x) => String(x));
    }
    if (typeof body.weeklyStudyHoursTarget === "number") {
      updates.weeklyStudyHoursTarget = body.weeklyStudyHoursTarget;
    }""",
    )
    pr.write_text(t, encoding="utf-8")
print("profile routes ok")
