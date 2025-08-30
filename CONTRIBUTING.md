# Contributing / Student instructions

Thank you for using this project in your course. The instructions below will get you up and running in a reproducible development environment.

Quick start (recommended - VS Code Dev Container)

1. Install VS Code and the "Dev Containers" extension.
2. Open this repository in VS Code.
3. Command Palette → "Dev Containers: Reopen in Container".
4. Wait for the container build to finish. The devcontainer creates a `.venv` and installs dependencies and test tools.
5. Open a terminal in VS Code (it will be inside the container). Run:

```bash
. .venv/bin/activate
python -m pytest -q
```

Local setup without the Dev Container

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
python -m pip install pytest pytest-cov
```

2. Run tests:

```bash
python -m pytest -q
```

Submitting changes

- Fork the repository, create a branch, make changes, and open a pull request against `main`.
- CI will run tests automatically via GitHub Actions.

Grading notes (for instructors)

- The repository contains a Makefile with `make setup` and `make test`.
- Tests are under `tests/` and are run with `pytest`.
