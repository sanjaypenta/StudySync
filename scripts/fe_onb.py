import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/pages/onboarding/OnboardingPage.tsx")
s = p.read_text(encoding="utf-8")
s = s.replace(
"import { fetchServerProfile, patchServerProfile, type DayBlockDto } from \"@/lib/api\";",
"import {\n  fetchServerProfile,\n  patchServerProfile,\n  postLearnerSummary,\n  type DayBlockDto,\n} from \"@/lib/api\";",
)
old = """      setOnboardingCompleteLocal(true);
      navigate(\"/\", { replace: true });"""
new = """      setOnboardingCompleteLocal(true);
      try {
        await postLearnerSummary();
      } catch {
        /* optional AI */
      }
      navigate(\"/\", { replace: true });"""
if old not in s:
    raise SystemExit("block not found")
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("onboarding ok")
