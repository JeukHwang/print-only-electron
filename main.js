// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { print: printWin } = require('pdf-to-printer');
const { print: printUnix } = require("unix-print");
const https = require('https');
const fs = require('fs');

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
    });

    setInterval(() => {
        mainWindow.webContents.getPrintersAsync().then((printers) => {
            console.log("Printers", printers.map(({ name }) => name));
            mainWindow.webContents.send('main-to-renderer', { type: "printers", data: printers.map(({ name }) => name) });
        });
    }, 10000);

    ipcMain.on('renderer-to-main', async (event, message) => {
        console.log(`Received message from renderer: ${JSON.stringify(message)}`);
        if (message.type === "print") {
            const filePath = `${Date.now()}.pdf`;
            const file = fs.createWriteStream(filePath);
            const { success, error } = await new Promise((resolve) => {
                https.get(message.data.url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close((error) => {
                            console.assert(error === undefined, error);
                            resolve({ success: true });
                        });
                    });
                }).on('error', (error) => {
                    fs.unlink(filePath, () => {
                        resolve({ success: false, error });
                    });
                });
            });
            if (success) {
                try {
                    if (process.platform === "win32") {
                        await printWin(fileName, { silent: !message.data.showPrintDialog, deviceName: message.data.printer, pageSize: 'A4' });
                    } else {
                        await printUnix(fileName, message.data.printer, ["-o media=A4"]);
                    }
                    event.sender.send('main-to-renderer', {
                        type: "log",
                        data: ['Print Success', `Query: ${JSON.stringify(message.data)}`,].join("\n")
                    });
                }
                catch (err) {
                    event.sender.send('main-to-renderer', {
                        type: "log",
                        data: ['Print Failure', `Query: ${JSON.stringify(message.data)}`, `Failure Reason: ${JSON.stringify(err)}`].join("\n")
                    });
                }
            } else {
                event.sender.send('main-to-renderer', {
                    type: "log",
                    data: ['Print Failure', `Query: ${JSON.stringify(message.data)}`, `Failure Reason: ${JSON.stringify(error)}`].join("\n")
                });
            }

            /** @todo The following code is desired at first, but it doesn't work because of this issue: https://github.com/electron/electron/issues/30947 */
            // const printWindow = new BrowserWindow({ show: false });
            // printWindow.loadURL(message.data.url);
            // printWindow.webContents.on('did-finish-load', async () => {
            //     printWindow.webContents.print({ silent: !message.data.showPrintDialog, pageSize: 'A4', deviceName: message.data.printer }, (success, failureReason) => {
            //         event.sender.send('main-to-renderer', {
            //             type: "log",
            //             data: [
            //                 success ? 'Print Success' : 'Print Failure',
            //                 `Query: ${JSON.stringify(message.data)}`,
            //                 success ? undefined : `Failure Reason: ${JSON.stringify(failureReason)}`
            //             ].filter(Boolean).join("\n")
            //         });
            //     });
            // });
        } else {
            event.sender.send('main-to-renderer', { type: "log", data: `Unhandled message: ${JSON.stringify(message)}` });
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
