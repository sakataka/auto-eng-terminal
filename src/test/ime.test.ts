import * as assert from 'assert';
import {
    InputSourceSwitcher,
    buildImSelectCandidates,
} from '../ime';

suite('IME helpers', () => {
    test('buildImSelectCandidates prefers configured path and removes duplicates', () => {
        assert.deepStrictEqual(
            buildImSelectCandidates('/opt/homebrew/bin/im-select'),
            [
                '/opt/homebrew/bin/im-select',
                'im-select',
                '/usr/local/bin/im-select',
            ],
        );
    });

    test('switchInputSource invokes im-select with the requested source id', async () => {
        const calls: Array<{ command: string; args: readonly string[] }> = [];
        const switcher = new InputSourceSwitcher(
            async (command, args = []) => {
                calls.push({ command, args });
                return { stdout: '', stderr: '' };
            },
            {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {},
            },
            () => 1_000,
        );

        const didSwitch = await switcher.switchInputSource(
            'im-select',
            'com.apple.keylayout.ABC',
            'test',
            0,
        );

        assert.strictEqual(didSwitch, true);
        assert.deepStrictEqual(calls, [
            {
                command: 'im-select',
                args: ['com.apple.keylayout.ABC'],
            },
        ]);
    });

    test('switchInputSource debounces repeated calls', async () => {
        let now = 1_000;
        let callCount = 0;
        const switcher = new InputSourceSwitcher(
            async () => {
                callCount += 1;
                return { stdout: '', stderr: '' };
            },
            {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {},
            },
            () => now,
        );

        const first = await switcher.switchInputSource(
            'im-select',
            'abc',
            'first',
            200,
        );

        now = 1_100;

        const second = await switcher.switchInputSource(
            'im-select',
            'abc',
            'second',
            200,
        );

        now = 1_250;

        const third = await switcher.switchInputSource(
            'im-select',
            'abc',
            'third',
            200,
        );

        assert.strictEqual(first, true);
        assert.strictEqual(second, false);
        assert.strictEqual(third, true);
        assert.strictEqual(callCount, 2);
    });

    test('switchInputSource skips concurrent execution', async () => {
        let resolveRunner: (() => void) | undefined;
        let callCount = 0;
        const switcher = new InputSourceSwitcher(
            async () => {
                callCount += 1;
                await new Promise<void>((resolve) => {
                    resolveRunner = resolve;
                });
                return { stdout: '', stderr: '' };
            },
            {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {},
            },
            () => 1_000,
        );

        const first = switcher.switchInputSource('im-select', 'abc', 'first', 0);
        const second = switcher.switchInputSource('im-select', 'abc', 'second', 0);

        assert.ok(resolveRunner, 'runner should be waiting before the first promise resolves');
        resolveRunner?.();

        assert.strictEqual(await first, true);
        assert.strictEqual(await second, false);
        assert.strictEqual(callCount, 1);
    });
});
