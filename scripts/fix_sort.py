import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/components/SortableDaySection.tsx")
s = p.read_text(encoding="utf-8")
a = "const updated = await patchTodo(id, { status: \"skipped\" });"
b = "const { todo: updated } = await patchTodo(id, { status: \"skipped\" });"
if a not in s:
    raise SystemExit("not found")
p.write_text(s.replace(a, b), encoding="utf-8")
print("ok")
