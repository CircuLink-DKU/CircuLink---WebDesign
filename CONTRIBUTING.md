# Contributing to CircuLink

Thank you for your interest in contributing to CircuLink! Whether you're fixing a bug, proposing a feature, or improving documentation, your help is appreciated.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

All contributors are expected to be respectful and inclusive. This project follows the DKU community standards — be kind, constructive, and collaborative.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/CircuLink---WebDesign.git
   cd CircuLink---WebDesign
   ```
3. **Add the upstream remote** so you can stay up to date:
   ```bash
   git remote add upstream https://github.com/CircuLink-DKU/CircuLink---WebDesign.git
   ```
4. **Set up the project** following the [README](README.md#getting-started)

---

## How to Contribute

### Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:
- A clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### Suggesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) and describe:
- What problem the feature solves
- How you'd like it to work
- Any alternatives you've considered

### Improving Documentation

Documentation improvements are always welcome — even small fixes like typos. Just open a PR with your changes.

---

## Development Workflow

1. **Sync your fork** before starting work:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch** (never work directly on `main`):
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/short-description
   ```

3. **Make your changes** and test them locally

4. **Commit** with a clear message (see below)

5. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** against `main` in the upstream repo

---

## Commit Message Guidelines

Use the following format:

```
type(scope): short description

Optional longer explanation if needed.
```

**Types:**

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, whitespace (no logic changes) |
| `refactor` | Code restructuring (no feature or fix) |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependency updates |

**Examples:**
```
feat(marketplace): add filter by price range
fix(auth): handle expired DKU session tokens
docs(readme): update architecture diagram
```

---

## Pull Request Process

1. Ensure your branch is up to date with `upstream/main`
2. Fill in the [PR template](.github/pull_request_template.md) completely
3. Link any relevant issues using `Closes #issue-number`
4. Wait for at least **one review** from a maintainer before merging
5. Address any requested changes

PRs that pass review and have no conflicts will be merged by a maintainer.

---

Thank you for helping make CircuLink better for the DKU community! 🎓
