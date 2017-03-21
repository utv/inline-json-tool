import path from 'path'
import electron from 'electron'
// import crashReporter from 'crash-reporter'

import { enableLiveReload } from 'electron-compile'
enableLiveReload()

const app = electron.app
const BrowserWindow = electron.BrowserWindow

let mainWindow = null
if (process.env.NODE_ENV === 'develop') {
  // crashReporter.start()
}

app.on('window-all-closed', () => {
  app.quit()
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 580,
    height: 365
  })

  console.log(__dirname)
  const url = path.resolve(__dirname, './renderer/index.html')
  mainWindow.loadURL(`file://${url}`)
}

app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
