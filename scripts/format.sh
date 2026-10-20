#!/usr/bin/env bash
# Runs Prettier on the files git treats as part of the project (tracked, or new and not ignored).
# Letting git pick the files honours every ignore source (.gitignore, .git/info/exclude, global
# excludes) and works in worktrees, where .git is a file. Usage: scripts/format.sh --check|--write
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

git ls-files -z --cached --others --exclude-standard |
  xargs -0 prettier --ignore-unknown --no-error-on-unmatched-pattern "$@"
