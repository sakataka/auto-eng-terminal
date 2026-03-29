import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension integration', () => {
    test('registers the public commands', async () => {
        const extension = vscode.extensions.getExtension(
            'Takashivscode.auto-eng-terminal',
        );

        assert.ok(extension, 'extension should be available in the test host');

        await extension.activate();

        const commands = await vscode.commands.getCommands(true);

        assert.ok(commands.includes('auto-eng-terminal.switchInputSource'));
        assert.ok(commands.includes('auto-eng-terminal.focusTerminal'));
        assert.ok(commands.includes('auto-eng-terminal.newTerminal'));
    });
});
