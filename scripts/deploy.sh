#!/usr/bin/env bash
set -euo pipefail

PROJECT_DESCRIPTION="a browser app that drives a VigoTec VG-X4 pen plotter over Web Serial to write text, plot images, handwriting and AI drawings"
CREATE_GITHUB_RELEASE=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
deploy.sh - Automated release pipeline

Usage:
  ./scripts/deploy.sh                 auto-increment patch (0.6.5 -> 0.6.6)
  ./scripts/deploy.sh patch           auto-increment patch (0.6.5 -> 0.6.6)
  ./scripts/deploy.sh minor           auto-increment minor (0.6.5 -> 0.7.0)
  ./scripts/deploy.sh major           auto-increment major (0.6.5 -> 1.0.0)
  ./scripts/deploy.sh v0.2.0          explicit version

Flags:
  -q, --quiet       Do not stream the CI run output. Block until the run
                    finishes; on failure write the failed-step log to a file
                    and print only its path. Saves tokens when Claude runs
                    this script.
      --no-changelog  Skip changelog generation and only bump the version.
  -h, --help        Show this help.

Environment:
  WATCH_CI=0        Skip watching the CI run triggered by the push.

Pipeline:
  validate version -> clean tree -> secret scan -> typecheck -> tests -> db smoke ->
  version bump -> changelog -> commit -> tag -> push -> GitHub Release ->
  watch CI
EOF
}

has_script() {
  node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)" 2>/dev/null
}

QUIET=0
NO_CHANGELOG=0
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    -q|--quiet) QUIET=1 ;;
    --no-changelog) NO_CHANGELOG=1 ;;
    -h|--help) usage; exit 0 ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done
set -- "${POSITIONAL[@]+"${POSITIONAL[@]}"}"

VERSION="${1:-}"
CURRENT_VERSION=$(node -p "require('./package.json').version")

if [[ -z "$VERSION" || "$VERSION" == "patch" || "$VERSION" == "minor" || "$VERSION" == "major" ]]; then
  BUMP="${VERSION:-patch}"
  [[ "$CURRENT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
    || error "package.json version '${CURRENT_VERSION}' is not a plain X.Y.Z - pass the target version explicitly"
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
  case "$BUMP" in
    patch) PATCH=$((PATCH + 1)) ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  esac
  SEMVER="${MAJOR}.${MINOR}.${PATCH}"
  TAG="v${SEMVER}"
  info "Auto-incrementing ${BUMP} version"
elif [[ "$VERSION" =~ ^v?([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  SEMVER="${BASH_REMATCH[1]}"
  TAG="v${SEMVER}"
else
  error "Invalid version format: $VERSION (expected vX.Y.Z, patch, minor, or major)"
fi

if git rev-parse -q --verify "refs/tags/${TAG}" > /dev/null; then
  error "Tag ${TAG} already exists. Pick a different version."
fi

info "Current version: ${CURRENT_VERSION}"
info "New version:     ${SEMVER} (tag: ${TAG})"
echo ""

if [[ -n "$(git status --porcelain)" ]]; then
  error "Working tree is not clean. Commit or stash your changes first."
fi

BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  warn "You are on branch '${BRANCH}', not 'main'. Continue? (y/N)"
  read -r CONFIRM
  [[ "$CONFIRM" =~ ^[yY]$ ]] || exit 0
fi

ok "Working tree is clean (branch: ${BRANCH})"

if command -v gitleaks > /dev/null; then
  info "Scanning git history for secrets..."
  gitleaks git --redact --no-banner --verbose .
  ok "No secrets found"
else
  warn "gitleaks not installed (brew install gitleaks) - skipping secret scan"
fi

if has_script typecheck; then
  info "Running typecheck..."
  npm run typecheck
  ok "Typecheck passed"
elif has_script check; then
  info "Running svelte-check..."
  npm run check
  ok "Typecheck passed"
else
  warn "No typecheck/check script in package.json - skipping"
fi

info "Running tests..."
npm test
ok "All tests passed"

if has_script smoke:db; then
  info "Running database smoke tests..."
  npm run smoke:db
  ok "Database smoke tests passed"
fi

info "Updating package.json version to ${SEMVER}..."
npm version "$SEMVER" --no-git-tag-version --allow-same-version > /dev/null
ok "package.json updated"

TODAY=$(date +%Y-%m-%d)

if [[ "$NO_CHANGELOG" == "1" ]]; then
  info "Skipping changelog generation (--no-changelog)"
  SLOGAN="version bump"
else
  info "Generating changelog entry..."

  PREV_TAG=""
  while IFS='|' read -r tag tagdate; do
    [[ -z "$tag" || "$tagdate" == "$TODAY" ]] && continue
    PREV_TAG="$tag"
    break
  done < <(git tag --merged HEAD --sort=-creatordate --format='%(refname:short)|%(creatordate:short)' 2>/dev/null || true)

  if [[ -n "$PREV_TAG" ]]; then
    COMMIT_RANGE="${PREV_TAG}..HEAD"
    info "Commits since ${PREV_TAG}:"
  else
    COMMIT_RANGE="HEAD"
    info "All commits (no previous tag found):"
  fi

  COMMITS=""
  while IFS= read -r line; do
    msg="${line#* }"
    case "$msg" in
      Release\ v*|Merge\ *) continue ;;
    esac
    COMMITS+="${msg}"$'\n'
  done < <(git log "$COMMIT_RANGE" --oneline --no-merges 2>/dev/null || git log --oneline --no-merges)

  if command -v claude &> /dev/null && [[ -n "$COMMITS" ]]; then
    info "Generating user-friendly changelog with Claude..."

    PROMPT="You are writing the changelog for ${PROJECT_DESCRIPTION}.

Based on these git commits, write a short, user-facing changelog section in English.

Commits:
${COMMITS}

Rules:
- Write from the user's perspective, NOT technically (no code, frameworks, tests, databases)
- Use these categories (only when applicable, omit empty ones): ### Added, ### Changed, ### Fixed
- Each entry starts with '- ' and describes what changes for the user
- Maximum 5-8 entries total, summarize when needed
- No duplicates, no trivial changes (e.g. .gitignore, README)
- No introductory text, only the ### categories with entries
- Good example: '- Vacation entries can now be edited directly from the employee dialog'
- Bad example: '- Fix TypeScript types in allocation reducer'
- Never include personal data: no phone numbers, email addresses or names of real people, not even as examples (write 'Swiss mobile numbers' instead of quoting one)"

    CHANGELOG_BODY=$(echo "$PROMPT" | claude --print 2>/dev/null || echo "")

    if [[ -n "$CHANGELOG_BODY" ]]; then
      ok "Changelog generated by Claude"
    else
      warn "Claude generation failed, falling back to commit-based changelog"
    fi
  fi

  if [[ -z "${CHANGELOG_BODY:-}" ]]; then
    CHANGELOG_BODY="### Changed"
    while IFS= read -r line; do
      [[ -n "$line" ]] && CHANGELOG_BODY+=$'\n'"- ${line}"
    done <<< "$COMMITS"
  fi

  if [[ -f CHANGELOG.md ]]; then
    CARRY_OVER=$(awk '
      /^## \[Unreleased\]/ { grab = 1; next }
      /^## \[/ { grab = 0; next }
      grab && NF { print }
    ' CHANGELOG.md)
    if [[ -n "$CARRY_OVER" ]]; then
      CHANGELOG_BODY=$(printf '%s\n%s\n' "$CARRY_OVER" "$CHANGELOG_BODY" | awk '
        function emit(i,   body) {
          body = items[i]
          gsub(/\n\n+/, "\n\n", body)
          sub(/^\n+/, "", body)
          sub(/\n+$/, "", body)
          if (body == "") return
          printf "%s%s\n\n%s\n", (first ? "" : "\n"), name[i], body
          first = 0
        }
        BEGIN { rank["### added"] = 1; rank["### changed"] = 2; rank["### fixed"] = 3; first = 1 }
        /^###[^#]/ {
          key = $0
          sub(/\r$/, "", key)
          sub(/[[:space:]]+$/, "", key)
          sub(/^###[[:space:]]*/, "### ", key)
          k = tolower(key)
          if (!(k in idx)) { idx[k] = ++n; name[n] = key; lower[n] = k }
          cur = idx[k]
          next
        }
        {
          if (!cur) { if (NF) lead = lead $0 "\n"; next }
          if (NF == 0) next
          isList = ($0 ~ /^[[:space:]]*[-*+] |^[[:space:]]*[0-9]+[.)] /)
          if (items[cur] != "" && isList != wasList[cur]) items[cur] = items[cur] "\n"
          items[cur] = items[cur] $0 "\n"
          wasList[cur] = isList
        }
        END {
          if (lead != "") { sub(/\n+$/, "", lead); printf "%s\n", lead; first = 0 }
          for (r = 1; r <= 3; r++) for (i = 1; i <= n; i++) if ((lower[i] in rank) && rank[lower[i]] == r) emit(i)
          for (i = 1; i <= n; i++) if (!(lower[i] in rank)) emit(i)
        }
      ')
      ok "Carried the Unreleased block into ${SEMVER}"
    fi
  fi

  export PII_PATTERN='(\+|\b00)[1-9][0-9]([ ./-]?[0-9]){7,12}\b|\b0[1-9][0-9]([ ./-]?[0-9]){7}\b|[A-Za-z0-9._%+-]+@(?!example\.(com|org|net)\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  PII_HITS=$(printf '%s\n' "$CHANGELOG_BODY" | perl -nle 'print $& while /$ENV{PII_PATTERN}/g' | sort -u)
  if [[ -n "$PII_HITS" ]]; then
    CHANGELOG_BODY=$(printf '%s\n' "$CHANGELOG_BODY" | perl -pe 's/$ENV{PII_PATTERN}/[removed]/g')
    warn "Removed possible personal data from the changelog (phone numbers / email addresses):"
    while IFS= read -r hit; do warn "  ${hit}"; done <<< "$PII_HITS"
    warn "Check the entry below before it goes out."
  fi

  CHANGELOG_ENTRY="## [${SEMVER}] - ${TODAY}"$'\n\n'"${CHANGELOG_BODY}"

  SLOGAN=""
  if command -v claude &> /dev/null; then
    SLOGAN_PROMPT="Summarize this changelog as a single short slogan (max 60 chars, no trailing period, no quotes, no markdown). Just the summary line, nothing else.

${CHANGELOG_BODY}"
    SLOGAN=$(echo "$SLOGAN_PROMPT" | claude --print 2>/dev/null | head -1 | tr -d '"' | sed 's/[[:space:]]*$//' || echo "")
  fi
  if [[ -z "$SLOGAN" ]]; then
    SLOGAN=$(echo "$CHANGELOG_BODY" | grep -m1 '^- ' | sed 's/^- //' | cut -c1-60)
  fi
  [[ -z "$SLOGAN" ]] && SLOGAN="maintenance release"

  if [[ -f CHANGELOG.md ]]; then
    TEMP_FILE=$(mktemp)
    ENTRY_FILE=$(mktemp)
    echo "$CHANGELOG_ENTRY" > "$ENTRY_FILE"

    awk -v entryfile="$ENTRY_FILE" -v today="$TODAY" '
      /^## \[Unreleased\]/ {
        print $0
        print ""
        while ((getline line < entryfile) > 0) print line
        print ""
        skip = 1
        next
      }
      /^## \[/ {
        if ($0 ~ ("- " today "[[:space:]]*$")) { skip = 1; next }
        skip = 0
      }
      !skip { print }
    ' CHANGELOG.md > "$TEMP_FILE"

    mv "$TEMP_FILE" CHANGELOG.md
    rm -f "$ENTRY_FILE"
    ok "CHANGELOG.md updated (earlier ${TODAY} entries consolidated)"
  else
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

${CHANGELOG_ENTRY}
EOF
    ok "CHANGELOG.md created"
  fi

  echo ""
  echo -e "${CYAN}── Changelog Entry ──────────────────────${NC}"
  echo "$CHANGELOG_ENTRY"
  echo -e "${CYAN}─────────────────────────────────────────${NC}"
  echo ""
fi

info "Committing version bump..."
git add package.json
git add package-lock.json 2>/dev/null || true
if [[ "$NO_CHANGELOG" != "1" ]]; then
  git add CHANGELOG.md
  COMMIT_BODY="- Bump version to ${SEMVER}
- Update CHANGELOG with release notes"
else
  COMMIT_BODY="- Bump version to ${SEMVER}"
fi
git commit -m "$(printf 'Release %s: %s\n\n%s\n' "$TAG" "$SLOGAN" "$COMMIT_BODY")"
ok "Committed"

info "Creating tag ${TAG}..."
git tag -a "$TAG" -m "Release ${TAG}"
ok "Tag ${TAG} created"

info "Pushing to origin..."
git push origin "$BRANCH"
git push origin "$TAG"
ok "Pushed commit and tag"

if [[ "${CREATE_GITHUB_RELEASE}" == "true" ]]; then
  RELEASE_URL="https://github.com/$(git remote get-url origin | sed -E 's#.*github\.com[:/]##; s#\.git$##')/releases/new?tag=${TAG}"

  if ! command -v gh &> /dev/null; then
    warn "gh CLI not installed - create the release manually on GitHub"
    warn "Go to: ${RELEASE_URL}"
  elif ! gh auth status &> /dev/null; then
    warn "gh CLI not authenticated (run: gh auth login) - create the release manually on GitHub"
    warn "Go to: ${RELEASE_URL}"
  else
    info "Creating GitHub Release..."

    if gh release create "$TAG" \
      --title "Release ${TAG}: ${SLOGAN}" \
      --notes "${CHANGELOG_ENTRY:-Release ${TAG}}" \
      --latest; then
      ok "GitHub Release created"
    else
      warn "gh release create failed - the tag is pushed, create the release manually"
      warn "Go to: ${RELEASE_URL}"
    fi
  fi
else
  info "GitHub Release skipped (CREATE_GITHUB_RELEASE=false)"
fi

CI_CONFIRMED=1

if command -v gh &> /dev/null && [[ "${WATCH_CI:-1}" != "0" ]]; then
  RELEASE_SHA=$(git rev-parse HEAD)

  # Match the run by commit, never by branch: a tag push produces a run whose
  # headBranch is the TAG, so --branch "$BRANCH" silently picks an older run on
  # the branch and reports its result as if it belonged to this release.
  # Runs take a few seconds to register, so retry before giving up.
  info "Looking for the CI run of ${RELEASE_SHA:0:7}..."
  RUN_IDS=""
  for _ in 1 2 3 4 5 6 7 8; do
    RUN_IDS=$(gh run list --limit 30 --json databaseId,headSha \
                --jq '.[] | select(.headSha=="'"$RELEASE_SHA"'") | .databaseId' 2>/dev/null || echo "")
    [[ -n "$RUN_IDS" ]] && break
    sleep 5
  done

  if [[ -z "$RUN_IDS" ]]; then
    CI_CONFIRMED=0
    warn "No CI run found for ${RELEASE_SHA:0:7} after 40s - the build is NOT confirmed"
    warn "Check manually: gh run list --limit 5"
  else
    for RUN_ID in $RUN_IDS; do
      if [[ "$QUIET" == "1" ]]; then
        LOG_FILE=".deploy-ci-${RUN_ID}.log"
        info "Watching CI run #${RUN_ID} (quiet, log on failure: ${LOG_FILE})..."
        while true; do
          STATE=$(gh run view "$RUN_ID" --json status,conclusion --jq '.status + "|" + (.conclusion // "")' 2>/dev/null || echo "|")
          RUN_STATUS="${STATE%|*}"
          RUN_CONCLUSION="${STATE#*|}"
          if [[ "$RUN_STATUS" == "completed" ]]; then
            if [[ "$RUN_CONCLUSION" == "success" ]]; then
              ok "CI run ${RUN_ID} passed"
            else
              gh run view "$RUN_ID" --log-failed > "$LOG_FILE" 2>&1 || true
              echo ""
              warn "CI FAILED (conclusion: ${RUN_CONCLUSION:-unknown})"
              warn "Log: ${LOG_FILE}  (or live: gh run view ${RUN_ID} --log-failed)"
              echo ""
              echo "  The tag and release exist on GitHub, but the build pipeline did not"
              echo "  succeed. Fix the issue and push a patch release."
              exit 1
            fi
            break
          fi
          sleep 15
        done
      else
        info "Watching CI run #${RUN_ID}..."
        if gh run watch "$RUN_ID" --exit-status --interval 10; then
          ok "CI run ${RUN_ID} passed"
        else
          echo ""
          warn "CI FAILED - inspect with: gh run view ${RUN_ID} --log-failed"
          echo ""
          echo "  The tag and release exist on GitHub, but the build pipeline did not"
          echo "  succeed. Fix the issue and push a patch release."
          exit 1
        fi
      fi
    done
  fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Release ${TAG} complete!${NC}"
echo -e "${GREEN}  ${SLOGAN}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [[ "$CI_CONFIRMED" != "1" ]]; then
  warn "The build was not confirmed - verify it before relying on the image"
fi
echo ""
