import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.showCalendar', async () => {
    const panel = vscode.window.createWebviewPanel(
      'calendarView',
      'File Update Calendar',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    const events = await getFileEvents(); // イベントデータを取得
    panel.webview.html = getWebviewContent(events);

    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'openFile':
            const filePath = message.filePath;
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

async function getFileEvents(): Promise<any[]> {
  const events: any[] = [];
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder.uri, '**/*'));

      for (const file of files) {
        const stat = await vscode.workspace.fs.stat(file);
        const date = new Date(stat.mtime).toISOString().split('T')[0];

        events.push({
          title: file.path.split('/').pop(),
          start: date,
          url: file.fsPath,
          extendedProps: {
            url: file.fsPath,
          }
        });
      }
    }
  }

  console.log(events); // ここでイベントの内容を確認
  return events;
}



function getWebviewContent(events: any[]) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>File Update Calendar</title>
      <link href='https://cdn.jsdelivr.net/npm/fullcalendar@5.11.0/main.min.css' rel='stylesheet' />
    </head>
    <body>
      <h1>File Update Calendar</h1>
      <div id="calendar"></div>
      <script src='https://cdn.jsdelivr.net/npm/fullcalendar@5.11.0/main.min.js'></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const vscode = acquireVsCodeApi();
          const calendarEl = document.getElementById('calendar');
          const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            events: ${JSON.stringify(events)},
            
              eventClick: function(info) {
              console.log(info); // ここを追加
              if (!info.event || !info.event.extendedProps) {
                console.error('Event or extendedProps is undefined');
                return;
              }

              const filePath = info.event.extendedProps.url; 
              vscode.postMessage({ command: 'openFile', filePath: filePath });
            }

          });
          calendar.render();
        });
      </script>
    </body>
    </html>
  `;
}

export function deactivate() {}
