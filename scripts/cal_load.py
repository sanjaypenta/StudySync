import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/routes/calendar/CalendarPage.tsx")
t = p.read_text(encoding="utf-8")
a = """        {loadingTodos && (
          <p className=\"text-sm text-zinc-500 mb-4\">Loading tasks…</p>
        )}"""
b = """        {loadingTodos && (
          <div className=\"mb-6 space-y-2\">
            <div className=\"h-4 w-36 animate-pulse rounded bg-violet-900/40\" />
            <div className=\"grid grid-cols-7 gap-1\">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className=\"h-24 animate-pulse rounded-lg bg-violet-950/30\" />
              ))}
            </div>
          </div>
        )}"""
if a in t:
    p.write_text(t.replace(a, b), encoding="utf-8")
    print("skeleton ok")
else:
    print("not found")
