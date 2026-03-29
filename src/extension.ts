import * as vscode from 'vscode';
import {
    AutoEngTerminalConfig,
    DEFAULT_INPUT_SOURCE_ID,
    InputSourceSwitcher,
    buildImSelectCandidates,
    execFileRunner,
    isMacOs,
} from './ime';

const CONFIG_SECTION = 'autoEngTerminal';
const OUTPUT_CHANNEL_NAME = 'Auto ENG Terminal';

const COMMAND_SWITCH_NOW = 'auto-eng-terminal.switchInputSource';
const COMMAND_FOCUS_TERMINAL = 'auto-eng-terminal.focusTerminal';
const COMMAND_NEW_TERMINAL = 'auto-eng-terminal.newTerminal';

function createLogger(
    outputChannel: vscode.OutputChannel,
    isDebugEnabled: () => boolean,
) {
    const write = (
        level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
        message: string,
    ) => {
        if (level === 'DEBUG' && !isDebugEnabled()) {
            return;
        }

        outputChannel.appendLine(`[${level}] ${message}`);
    };

    return {
        debug: (message: string) => write('DEBUG', message),
        info: (message: string) => write('INFO', message),
        warn: (message: string) => write('WARN', message),
        error: (message: string) => write('ERROR', message),
    };
}

function readConfiguration(): AutoEngTerminalConfig {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

    return {
        enabled: config.get<boolean>('enabled', true),
        inputSourceId: config
            .get<string>('inputSourceId', DEFAULT_INPUT_SOURCE_ID)
            .trim() || DEFAULT_INPUT_SOURCE_ID,
        imSelectPath: config.get<string>('imSelectPath', '').trim(),
        switchOnStartup: config.get<boolean>('switchOnStartup', true),
        switchOnOpenTerminal: config.get<boolean>('switchOnOpenTerminal', true),
        switchOnActiveTerminalChange: config.get<boolean>(
            'switchOnActiveTerminalChange',
            true,
        ),
        switchDebounceMs: config.get<number>('switchDebounceMs', 150),
        startupDelayMs: config.get<number>('startupDelayMs', 300),
        terminalOpenDelayMs: config.get<number>('terminalOpenDelayMs', 120),
        terminalCommandDelayMs: config.get<number>('terminalCommandDelayMs', 120),
        showMissingDependencyWarning: config.get<boolean>(
            'showMissingDependencyWarning',
            true,
        ),
        enableDebugLogs: config.get<boolean>('enableDebugLogs', false),
    };
}

function registerTimeout(
    context: vscode.ExtensionContext,
    callback: () => void,
    delayMs: number,
) {
    const timeout = setTimeout(callback, delayMs);

    context.subscriptions.push(
        new vscode.Disposable(() => {
            clearTimeout(timeout);
        }),
    );
}

async function delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    context.subscriptions.push(outputChannel);

    let currentConfig = readConfiguration();
    const logger = createLogger(outputChannel, () => currentConfig.enableDebugLogs);
    const switcher = new InputSourceSwitcher(execFileRunner, logger);

    logger.info('Activating extension.');

    if (!isMacOs()) {
        logger.warn('auto-eng-terminal only runs on macOS. Activation skipped.');
        return;
    }

    let resolvedImSelectPath: string | undefined;
    let hasShownMissingDependencyWarning = false;

    async function resolveImSelectPath(): Promise<string | undefined> {
        const candidates = buildImSelectCandidates(currentConfig.imSelectPath);

        for (const candidate of candidates) {
            if (await switcher.probeBinary(candidate)) {
                logger.info(`Using im-select from "${candidate}".`);
                return candidate;
            }
        }

        return undefined;
    }

    async function ensureImSelectPath(): Promise<string | undefined> {
        if (resolvedImSelectPath) {
            return resolvedImSelectPath;
        }

        resolvedImSelectPath = await resolveImSelectPath();

        if (!resolvedImSelectPath && !hasShownMissingDependencyWarning) {
            logger.warn('im-select was not found. Automatic switching is disabled.');

            if (currentConfig.showMissingDependencyWarning) {
                void vscode.window.showWarningMessage(
                    'auto-eng-terminal requires "im-select". Install it with `brew tap daipeihust/tap && brew install im-select`, or set autoEngTerminal.imSelectPath.',
                );
            }

            hasShownMissingDependencyWarning = true;
        }

        return resolvedImSelectPath;
    }

    async function switchToEnglish(reason: string): Promise<void> {
        if (!currentConfig.enabled) {
            logger.debug(`Skipped IME switch for "${reason}" because the extension is disabled.`);
            return;
        }

        const imSelectPath = await ensureImSelectPath();
        if (!imSelectPath) {
            return;
        }

        await switcher.switchInputSource(
            imSelectPath,
            currentConfig.inputSourceId,
            reason,
            currentConfig.switchDebounceMs,
        );
    }

    function scheduleSwitch(reason: string, delayMs: number) {
        registerTimeout(context, () => {
            void switchToEnglish(reason);
        }, delayMs);
    }

    async function runTerminalCommand(
        commandId: string,
        reason: string,
    ): Promise<void> {
        await vscode.commands.executeCommand(commandId);
        await delay(currentConfig.terminalCommandDelayMs);
        await switchToEnglish(reason);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMAND_SWITCH_NOW, async () => {
            await switchToEnglish('manual command');
        }),
        vscode.commands.registerCommand(COMMAND_FOCUS_TERMINAL, async () => {
            await runTerminalCommand('workbench.action.terminal.focus', 'focusTerminal command');
        }),
        vscode.commands.registerCommand(COMMAND_NEW_TERMINAL, async () => {
            await runTerminalCommand(
                'workbench.action.terminal.new',
                'newTerminal command',
            );
        }),
    );

    context.subscriptions.push(
        vscode.window.onDidOpenTerminal(() => {
            if (!currentConfig.switchOnOpenTerminal || !vscode.window.state.focused) {
                return;
            }

            scheduleSwitch('terminal opened', currentConfig.terminalOpenDelayMs);
        }),
        vscode.window.onDidChangeActiveTerminal((terminal) => {
            if (
                !terminal ||
                !currentConfig.switchOnActiveTerminalChange ||
                !vscode.window.state.focused
            ) {
                return;
            }

            void switchToEnglish('active terminal changed');
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (!event.affectsConfiguration(CONFIG_SECTION)) {
                return;
            }

            const nextConfig = readConfiguration();
            const didImSelectPathChange =
                nextConfig.imSelectPath !== currentConfig.imSelectPath;

            currentConfig = nextConfig;

            if (didImSelectPathChange) {
                resolvedImSelectPath = undefined;
                hasShownMissingDependencyWarning = false;
            }

            logger.info('Configuration reloaded.');
        }),
    );

    await ensureImSelectPath();

    if (
        currentConfig.switchOnStartup &&
        vscode.window.state.focused &&
        vscode.window.activeTerminal
    ) {
        scheduleSwitch('startup with active terminal', currentConfig.startupDelayMs);
    }

    logger.info('Activation finished.');
}

export function deactivate() {
    // Nothing to dispose explicitly. VS Code disposes subscriptions for us.
}
