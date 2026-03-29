import { execFile } from 'child_process';

export const DEFAULT_INPUT_SOURCE_ID = 'com.apple.keylayout.ABC';
export const DEFAULT_IM_SELECT_CANDIDATES = [
    'im-select',
    '/opt/homebrew/bin/im-select',
    '/usr/local/bin/im-select',
] as const;

export interface AutoEngTerminalConfig {
    enabled: boolean;
    inputSourceId: string;
    imSelectPath: string;
    switchOnStartup: boolean;
    switchOnOpenTerminal: boolean;
    switchOnActiveTerminalChange: boolean;
    switchDebounceMs: number;
    startupDelayMs: number;
    terminalOpenDelayMs: number;
    terminalCommandDelayMs: number;
    showMissingDependencyWarning: boolean;
    enableDebugLogs: boolean;
}

export interface Logger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export interface CommandResult {
    stdout: string;
    stderr: string;
}

export type CommandRunner = (
    command: string,
    args?: readonly string[],
) => Promise<CommandResult>;

export function execFileRunner(
    command: string,
    args: readonly string[] = [],
): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        execFile(command, [...args], (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            resolve({
                stdout: stdout ?? '',
                stderr: stderr ?? '',
            });
        });
    });
}

export function buildImSelectCandidates(configuredPath: string): string[] {
    const candidates = [
        configuredPath.trim(),
        ...DEFAULT_IM_SELECT_CANDIDATES,
    ].filter((candidate) => candidate.length > 0);

    return [...new Set(candidates)];
}

export function isMacOs(platform: string = process.platform): boolean {
    return platform === 'darwin';
}

export function describeError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export class InputSourceSwitcher {
    private inFlightSwitch?: Promise<boolean>;
    private lastSwitchAt = 0;

    constructor(
        private readonly runner: CommandRunner,
        private readonly logger: Logger,
        private readonly now: () => number = Date.now,
    ) {}

    async probeBinary(command: string): Promise<boolean> {
        try {
            await this.runner(command);
            return true;
        } catch (error) {
            this.logger.debug(
                `Unable to use im-select candidate "${command}": ${describeError(error)}`,
            );
            return false;
        }
    }

    async switchInputSource(
        command: string,
        inputSourceId: string,
        reason: string,
        debounceMs: number,
    ): Promise<boolean> {
        if (this.inFlightSwitch) {
            this.logger.debug(
                `Skipped IME switch for "${reason}" because another switch is still running.`,
            );
            return false;
        }

        const now = this.now();
        if (debounceMs > 0 && now - this.lastSwitchAt < debounceMs) {
            this.logger.debug(
                `Skipped IME switch for "${reason}" because it fired within ${debounceMs}ms.`,
            );
            return false;
        }

        const run = this.runner(command, [inputSourceId])
            .then(({ stderr }) => {
                this.lastSwitchAt = this.now();

                if (stderr.trim().length > 0) {
                    this.logger.debug(
                        `im-select wrote to stderr while handling "${reason}": ${stderr.trim()}`,
                    );
                }

                this.logger.info(
                    `Switched input source to "${inputSourceId}" (${reason}).`,
                );
                return true;
            })
            .catch((error: unknown) => {
                this.logger.error(
                    `Failed to switch input source for "${reason}": ${describeError(error)}`,
                );
                return false;
            })
            .finally(() => {
                this.inFlightSwitch = undefined;
            });

        this.inFlightSwitch = run;
        return run;
    }
}
