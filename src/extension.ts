// src/extension.ts
import * as vscode from 'vscode';
import { exec } from 'child_process'; // Node.js の child_process モジュールをインポート

// ★★★ ステップ2で記録した英数入力ソースIDに書き換えてください！ ★★★
const ENGLISH_INPUT_SOURCE_ID = "com.apple.keylayout.ABC";
// 例: const ENGLISH_INPUT_SOURCE_ID = "com.apple.inputmethod.Kotoeri.Romaji";

export function activate(context: vscode.ExtensionContext) {

    console.log('Extension "auto-eng-terminal" is activating!');

    // im-select コマンドが存在するか簡単なチェック
    exec('which im-select', (error, stdout, stderr) => {
        if (error || stderr || !stdout) {
            vscode.window.showWarningMessage('IME auto switch requires "im-select". Please install it (e.g., `brew install im-select`).');
            console.error('im-select command not found.');
        } else {
            const imSelectPath = stdout.trim();
            console.log(`im-select found at: ${imSelectPath}`);

            // im-select が見つかった場合のみリスナーを登録
            context.subscriptions.push(
                vscode.window.onDidChangeActiveTerminal(terminal => {
                    // アクティブな要素がターミナルかどうかをチェック
                    // (terminal が undefined でない、かつ visible であることを確認するとより確実)
                    // VSCodeウィンドウ自体がフォーカスされているかも確認
                    if (terminal && vscode.window.state.focused) {
                        console.log('Terminal focused or became active. Switching to English input mode.');
                        switchToEnglish(imSelectPath);
                    } else {
                        console.log('Terminal lost focus or closed, or VSCode window lost focus.');
                        // フォーカスが外れた時の処理はここに追加可能
                    }
                })
            );

            // VSCodeウィンドウのフォーカス変更も監視する (ウィンドウフォーカス喪失→ターミナルフォーカス、の順だと上記だけでは検知できない場合があるため)
             context.subscriptions.push(
                vscode.window.onDidChangeWindowState(windowState => {
                    if (windowState.focused && vscode.window.activeTerminal) {
                         console.log('VSCode window gained focus and a terminal is active. Switching to English input mode.');
                         switchToEnglish(imSelectPath);
                    }
                })
             );


            // VSCode起動時にすでにターミナルにフォーカスが当たっている場合にも対応
            // 少し遅延させて実行しないと、ウィンドウフォーカスより先に判定してしまうことがある
            setTimeout(() => {
                if (vscode.window.activeTerminal && vscode.window.state.focused) {
                    console.log('Initial active terminal found. Switching to English input mode.');
                    switchToEnglish(imSelectPath);
                }
            }, 500); // 500ミリ秒待つ (調整可能)
        }
    });

     console.log('Extension "auto-eng-terminal" activation finished.');
}

function switchToEnglish(imSelectPath: string) {
    // im-select コマンドを実行して英数モードに切り替える
    // フルパスを指定して実行する方が環境変数問題を防ぎやすい
    exec(`${imSelectPath} ${ENGLISH_INPUT_SOURCE_ID}`, (execError, execStdout, execStderr) => {
        if (execError) {
            console.error(`Failed to switch input source: ${execError.message}`);
            // 頻繁にエラーが出る場合はうるさいのでコメントアウトしても良い
            // vscode.window.showErrorMessage(`Failed to switch IME: ${execError.message}`);
            return;
        }
        if (execStderr) {
            // stderrに何か出力されても成功している場合がある
            console.warn(`Stderr during input source switch: ${execStderr}`);
        }
        console.log(`Switched input source to: ${ENGLISH_INPUT_SOURCE_ID}`);
    });
}

// This method is called when your extension is deactivated
export function deactivate() {
     console.log('Extension "auto-eng-terminal" is deactivated.');
}
