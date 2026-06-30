# GitHub Push Instructions

The prototype and project notes have been committed locally in:

```text
C:\Users\syo03\Documents\Codex\2026-06-30\new-chat\work\push-repo
```

Target repository:

```text
https://github.com/ymsh003/Drill-3D-Model.git
```

Current local commit:

```text
8ca93b0 Add handoff notes
```

From a terminal with GitHub network access and credentials, run:

```powershell
cd C:\Users\syo03\Documents\Codex\2026-06-30\new-chat\work\push-repo
git push -u origin HEAD:main
```

If the remote already has commits and Git rejects the push, first inspect the remote history:

```powershell
git fetch origin
git log --oneline --decorate --all
```

Then merge or rebase as appropriate before pushing.

## Included Files

```text
outputs/bowling-drill-3d-prototype.html
outputs/PROJECT_NOTES.md
```

## Notes

`outputs/PROJECT_NOTES.md` contains the current modeling assumptions, UI state, pitch rules, drill trajectory model, and next-step ideas so the work can continue from another machine.
