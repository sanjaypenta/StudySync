import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/pages/SelfStudyPage.tsx")
s = p.read_text(encoding="utf-8")
old = """  async function confirmSwitchOk() {
    const next = confirmSwitch;
    setConfirmSwitch(null);
    if (!next || !sessionId) return;
    try {
      const { reward } = await endStudySession(sessionId, "abandoned");
      pushRewardFromApi(push, reward);
    } catch {
      /* ignore */
    }
    setSessionId(null);
    setStartedAtMs(null);
    setActiveTodoId(null);
    await beginFocus(next);
  }"""
new = """  async function confirmSwitchOk() {
    const next = confirmSwitch;
    const sid = sessionId;
    setConfirmSwitch(null);
    if (!next || !sid) return;
    try {
      const { reward } = await endStudySession(sid, "abandoned");
      pushRewardFromApi(push, reward);
    } catch {
      /* ignore */
    }
    try {
      const s = await startStudySession([next]);
      setSessionId(s.id);
      setStartedAtMs(Date.now());
      setActiveTodoId(next);
    } catch {
      setErr("Could not start focus session.");
      setSessionId(null);
      setStartedAtMs(null);
      setActiveTodoId(null);
    }
  }"""
if old not in s:
    raise SystemExit("not found")
p.write_text(s.replace(old, new), encoding="utf-8")
print("selfstudy fix ok")
