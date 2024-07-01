/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

document.getElementById('print-button').addEventListener('click', () => {
    const data = {
        url: document.getElementById('target-url').value,
        printer: document.getElementById('target-printer').value,
        showPrintDialog: document.getElementById('show-print-dialog').checked
    };
    console.log("Data", data);
    if (!data.url) {
        document.getElementById('log').innerText += "[ERROR] No URL Specified\n";
        return;
    }
    if (!data.printer) {
        document.getElementById('log').innerText += "[ERROR] No Printer Specified\n";
        return;
    }
    window.electron.sendMessage('renderer-to-main', { type: "print", data });
});

window.electron.receiveMessage('main-to-renderer', (message) => {
    console.log(`Received message from main: ${JSON.stringify(message)}`);
    switch (message.type) {
        case "printers":
            document.getElementById('target-printer').innerHTML = message.data.map((printer) => `<option value="${printer}">${printer}</option>`).join("");
            document.getElementById('log').innerText += "[INFO] Printer Updated\n";
            break;
        case "log":
            document.getElementById('log').innerText += `[INFO] ${message.data}\n`;
        default:
            break;
    }
});