# Auto ENG Terminal

`auto-eng-terminal` is a small VS Code extension for macOS that switches the input source to English when you move into the integrated terminal.

This repository is intentionally focused on one job:

- You usually type shell commands in the VS Code terminal.
- Your IME is sometimes left in Japanese input mode.
- You want the terminal path to bias toward English input so commands do not get mangled by kana conversion.

## What It Does

The extension uses [`im-select`](https://github.com/daipeihust/im-select) and reacts to terminal-oriented actions such as:

- VS Code startup when a terminal is already active
- Creating a new terminal
- Switching the active terminal
- Running the extension's own "focus/new terminal" commands

It also exposes explicit commands so you can bind your normal terminal shortcuts to a version that switches the IME more reliably.

## Requirements

- macOS
- VS Code `1.99.0` or newer
- `im-select`

Install `im-select` with Homebrew:

```sh
brew tap daipeihust/tap
brew install im-select
```

If `im-select` is not on the default VS Code PATH, set `autoEngTerminal.imSelectPath` to an absolute path such as `/opt/homebrew/bin/im-select`.

## Settings

This extension contributes the following settings:

- `autoEngTerminal.enabled`: Enable or disable the extension.
- `autoEngTerminal.inputSourceId`: The input source ID to switch to. Default is `com.apple.keylayout.ABC`.
- `autoEngTerminal.imSelectPath`: Optional explicit path to `im-select`.
- `autoEngTerminal.switchOnStartup`: Switch when VS Code starts and a terminal is already active.
- `autoEngTerminal.switchOnOpenTerminal`: Switch when a terminal is created.
- `autoEngTerminal.switchOnActiveTerminalChange`: Switch when the active terminal changes.
- `autoEngTerminal.switchDebounceMs`: Debounce window used to suppress duplicate switch attempts.
- `autoEngTerminal.startupDelayMs`: Delay before the startup switch.
- `autoEngTerminal.terminalOpenDelayMs`: Delay before the "terminal opened" switch.
- `autoEngTerminal.terminalCommandDelayMs`: Delay after the extension's terminal commands run.
- `autoEngTerminal.showMissingDependencyWarning`: Show a warning if `im-select` cannot be found.
- `autoEngTerminal.enableDebugLogs`: Emit debug logs to the `Auto ENG Terminal` output channel.

## Commands

- `Auto ENG Terminal: Switch Input Source Now`
- `Auto ENG Terminal: Focus Terminal and Switch Input Source`
- `Auto ENG Terminal: Create New Terminal and Switch Input Source`

## Recommended Keybindings

If you want the behavior to be more explicit and predictable, remap your terminal-entry shortcuts to the extension commands instead of the stock VS Code commands.

Example:

```json
[
  {
    "key": "cmd+`",
    "command": "auto-eng-terminal.focusTerminal"
  },
  {
    "key": "cmd+shift+`",
    "command": "auto-eng-terminal.newTerminal"
  }
]
```

Use whatever shortcuts already fit your setup. The point is to let the extension run on the exact terminal entry path you care about.

## Development

```sh
npm install
npm run compile
npm run lint
npm test
```

## Build And Install Locally

Generate a VSIX file:

```sh
npm install
npm run package:vsix
```

This creates a file like `auto-eng-terminal-0.1.0.vsix` in the repository root.

Install it into VS Code in either of these ways:

```sh
code --install-extension auto-eng-terminal-0.1.0.vsix
```

Or in VS Code:

1. Open the Command Palette.
2. Run `Extensions: Install from VSIX...`.
3. Pick the generated `.vsix` file.

After installation, reload VS Code and confirm `im-select` is available from the environment VS Code uses. If needed, set `autoEngTerminal.imSelectPath` explicitly.

## Known Limitations

- This is a macOS-only extension.
- VS Code does not expose a perfect "terminal just gained keyboard focus" event, so the extension uses a practical approximation.
- If you need stronger guarantees, bind your terminal-entry shortcut to `auto-eng-terminal.focusTerminal`.
