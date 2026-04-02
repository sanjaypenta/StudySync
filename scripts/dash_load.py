import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/pages/Dashboard.tsx")
t = p.read_text(encoding="utf-8")
a = """      {loading && (
        <p className=\"mt-10 text-center text-sm text-violet-400/80\">
          Loading quests…
        </p>
      )}"""
b = """      {loading && (
        <div className=\"mt-10 space-y-4\">
          <div className=\"h-8 w-56 animate-pulse rounded-xl bg-violet-900/40\" />
          <div className=\"h-32 animate-pulse rounded-2xl bg-violet-950/30\" />
          <div className=\"h-32 animate-pulse rounded-2xl bg-violet-950/30\" />
        </div>
      )}"""
if a in t:
    p.write_text(t.replace(a, b), encoding="utf-8")
    print("dash ok")
else:
    print("skip")
