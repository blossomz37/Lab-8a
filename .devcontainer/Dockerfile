FROM mcr.microsoft.com/vscode/devcontainers/python:0-3.11

# Install common packages needed for builds/tests. Add any additional packages your project needs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git build-essential libpq-dev libffi-dev \
  && rm -rf /var/lib/apt/lists/*

# The devcontainer runtime will set the working directory to /workspace or /workspaces/<repo>
