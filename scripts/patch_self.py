import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/pages/SelfStudyPage.tsx")
t = p.read_text(encoding="utf-8")
if "useHud" not in t:
    t = t.replace(
        'import { useRewards } from "@/context/RewardContext";',
        'import { useRewards } from "@/context/RewardContext";\nimport { useHud } from "@/context/HudContext";',
    )
    t = t.replace(
        "  const { push } = useRewards();",
        "  const { push } = useRewards();\n  const { refresh } = useHud();",
    )
    t = t.replace(
        "        pushRewardFromApi(push, r2);\n      }\n    } catch {",
        "        pushRewardFromApi(push, r2);\n      }\n      void refresh();\n    } catch {",
    )
    p.write_text(t, encoding="utf-8")
print("selfstudy ok")
