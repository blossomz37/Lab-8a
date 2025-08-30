#!/usr/bin/env bash
set -euo pipefail

# Create and use a project-local virtual environment, install runtime and test deps, and run pytest.
# Usage:
#   ./scripts/run_tests.sh        # create .venv if missing, install requirements, run pytest -q
#   ./scripts/run_tests.sh --recreate  # recreate the .venv
#   ./scripts/run_tests.sh -- pytest -k something  # pass args to pytest after --

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PATH="$ROOT_DIR/.venv"

RECREATE=0
PYTEST_ARGS=( )

while (( "$#" )); do
  case "$1" in
    --recreate)
      RECREATE=1; shift ;;
    --)
      shift; PYTEST_ARGS=("$@"); break ;;
    *)
      PYTEST_ARGS+=("$1"); shift ;;
  esac
done

if [ "$RECREATE" -eq 1 ] && [ -d "$VENV_PATH" ]; then
  echo "Recreating virtualenv at $VENV_PATH"
  rm -rf "$VENV_PATH"
fi

if [ ! -d "$VENV_PATH" ]; then
  echo "Creating virtualenv at $VENV_PATH"
  python -m venv "$VENV_PATH"
fi

# shellcheck disable=SC1090
source "$VENV_PATH/bin/activate"

echo "Upgrading pip, setuptools, wheel..."
python -m pip install --upgrade pip setuptools wheel >/dev/null

if [ -f "$ROOT_DIR/requirements.txt" ]; then
  echo "Installing runtime requirements from requirements.txt"
  python -m pip install -r "$ROOT_DIR/requirements.txt"
fi

echo "Installing test tools (pytest, pytest-cov)"
python -m pip install pytest pytest-cov >/dev/null

if [ ${#PYTEST_ARGS[@]} -eq 0 ]; then
  PYTEST_ARGS=( -q )
fi

echo "Running pytest ${PYTEST_ARGS[*]}"
python -m pytest "${PYTEST_ARGS[@]}"
