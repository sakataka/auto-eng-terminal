# AGENTS.md

## Project Summary

This repository contains a small VS Code extension for macOS. Its job is to switch the input source to English when the user enters the integrated terminal path.

## Constraints

- Treat this as a macOS-only project.
- Keep the extension focused on terminal-related IME switching.
- Do not add personal machine paths, account names, or private environment details to committed files.
- Prefer explicit configuration over hard-coded local assumptions.

## Development Notes

- The runtime entrypoint is `src/extension.ts`.
- IME-specific logic that should stay testable lives in `src/ime.ts`.
- Use `npm run compile`, `npm run lint`, and `npm test` before finishing changes.
- Keep README and package metadata aligned with actual behavior.
