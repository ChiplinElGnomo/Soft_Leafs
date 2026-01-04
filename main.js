const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');


function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    icon: path.join(__dirname, 'assets/images/logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  win.loadFile('index.html');
  //win.webContents.openDevTools();

  //! Creación de carpetas necesarias
  const baseBooksPath = path.join(app.getPath('userData'), 'books');
  const filesPath = path.join(baseBooksPath, 'book-file');
  const metaPath = path.join(baseBooksPath, 'meta-info');
  const coversPath = path.join(baseBooksPath, 'covers');
  fs.mkdirSync(filesPath, { recursive: true });
  fs.mkdirSync(metaPath, { recursive: true });
  fs.mkdirSync(coversPath, { recursive: true });

  // Exponer rutas al preload
  ipcMain.handle('paths:getBooksFolders', () => {
    return { filesPath, metaPath };
  });

  // Cerrar app
  ipcMain.handle('app:close', () => {
    app.quit();
  });
  
  

//! ---------------------------------------------------------------------

  //! Abrir diálogo de selección de archivo
  ipcMain.handle('dialog:abrir-archivo', async () => {
    const resultado = await dialog.showOpenDialog(win, {
      title: 'Selecciona un archivo EPUB',
      filters: [
        { name: 'Libros', extensions: ['epub'] }
      ],
      properties: ['openFile']
    });
    return resultado;
  });
//! ---------------------------------------------------------------------
  
  //! Obtener ruta completa de libro
  ipcMain.handle("libro:obtenerRuta", async (event, archivo) => {
  const baseBooksPath = path.join(app.getPath('userData'), 'books');
  const filesPath = path.join(baseBooksPath, 'book-file');

  const rutaCompleta = path.join(filesPath, archivo);

  if (!fs.existsSync(rutaCompleta)) {
    throw new Error("El archivo del libro no existe");
  }

  return rutaCompleta;
});
//! ---------------------------------------------------------------------

//! Funciones para el audio

// Codigo para leer la playlist desde assets

ipcMain.handle('musica:leer-playlist', async (event, nombre_playlist) => {
  const rutaJSON = path.join(__dirname, 'assets', 'music', 'playlists', `${nombre_playlist}.json`);
  const data = fs.readFileSync(rutaJSON, 'utf8');
  return JSON.parse(data);
});

// 2. Busca el archivo de sonido en la carpeta de música (un nivel arriba de playlists)
ipcMain.handle('musica:obtener-ruta-audio', async (event, archivo_cancion) => {
  // Aquí apuntamos a assets/music/ directamente
  return path.join(__dirname, 'assets', 'music', 'songs', archivo_cancion);
});

ipcMain.handle('efectos:obtener-ruta', async (e, efecto_selec) => {
  const rutaEfectos = path.join(__dirname, 'assets', 'music', 'effects'); //! TERMINA LOS EFECTOS HUEVON
  const pathEfecto = path.join(rutaEfectos, efecto_selec + '.wav');
  return pathEfecto;
  
  
});
//! ---------------------------------------------------------------------

}
//! FUNCIONES AUXILIARES


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();



});



