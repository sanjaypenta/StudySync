import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/pages/SelfStudyPage.tsx")
t = p.read_text(encoding="utf-8")
a = """      setSessionId(s.id);
      setStartedAtMs(Date.now());
      setActiveTodoId(next);
    } catch {
      setErr(\"Could not start focus session.\");
      setSessionId(null);
      setStartedAtMs(null);
      setActiveTodoId(null);
    }
  }"""
b = """      setSessionId(s.id);
      setStartedAtMs(Date.now());
      setActiveTodoId(next);
      void refresh();
    } catch {
      setErr(\"Could not start focus session.\");
      setSessionId(null);
      setStartedAtMs(null);
      setActiveTodoId(null);
    }
  }"""
if a in t:
    p.write_text(t.replace(a, b), encoding="utf-8")
    print("self confirm refresh")
else:
    print("not found")
