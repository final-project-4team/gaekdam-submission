#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/download_github_artifacts.sh [workflow] [artifact_name] [branch] [index]
# Defaults:
#   workflow: ci.yml
#   artifact_name: test-reports
#   branch: main
#   index: 0  (most recent run)
# Requires: GitHub CLI (gh) authenticated (gh auth login)

WORKFLOW=${1:-ci.yml}
ARTIFACT=${2:-test-reports}
BRANCH=${3:-main}
INDEX=${4:-0}
OUTDIR=${5:-downloaded_artifacts}

echo "Looking for latest run for workflow='$WORKFLOW' branch='$BRANCH' (index=$INDEX) ..."

RUN_ID=$(gh run list --workflow "$WORKFLOW" --branch "$BRANCH" --limit 10 --json id --jq ".[$INDEX].id")

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "No workflow run found for workflow='$WORKFLOW' on branch='$BRANCH'"
  exit 1
fi

DEST="$OUTDIR/$RUN_ID"
mkdir -p "$DEST"

echo "Downloading artifact '$ARTIFACT' from run id=$RUN_ID into $DEST ..."
# try to download by name first
if gh run download "$RUN_ID" --name "$ARTIFACT" --dir "$DEST"; then
  echo "Downloaded artifact '$ARTIFACT' to $DEST"
  exit 0
else
  echo "Failed to download artifact by name '$ARTIFACT' — attempting to download all artifacts for the run"
  gh run download "$RUN_ID" --dir "$DEST"
  echo "Downloaded all artifacts to $DEST"
fi
