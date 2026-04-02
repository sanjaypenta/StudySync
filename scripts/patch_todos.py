import pathlib
p = pathlib.Path(r"e:/StudySync/backend/src/routes/todosRoutes.ts")
s = p.read_text(encoding="utf-8")
a = """    if (!doc) {
      res.status(404).json({ error: \"Not found\" });
      return;
    }

    res.json({
      todo: serializeTodos([doc])[0],
    });"""
b = """    if (!doc) {
      res.status(404).json({ error: \"Not found\" });
      return;
    }

    let reward = undefined;
    if (
      prev &&
      prev.status !== \"completed\" &&
      doc.status === \"completed\"
    ) {
      reward = await recordMeaningfulActivity(userId, 5);
    }

    res.json({
      todo: serializeTodos([doc])[0],
      reward,
    });"""
if a not in s:
    raise SystemExit("pattern not found")
p.write_text(s.replace(a, b), encoding="utf-8")
print("ok")
