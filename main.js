const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database.js');


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
  const coversPath = path.join(baseBooksPath, 'covers');
  fs.mkdirSync(filesPath, { recursive: true });
  fs.mkdirSync(coversPath, { recursive: true }); //Recursive hace que si la carpeta anterior, en este caso books, no existe, se crea tambien, por eso no hace falta añadir su mkdir

  // Exponer rutas al preload
  ipcMain.handle('paths:getBooksFolders', () => {
    return { filesPath, coversPath};
  });

  ipcMain.handle('libro:guardar', async (event, paqueteLibro) => {
    try {
      const nombreArchivo = path.basename(paqueteLibro.ruta);
      const rutaDestino = path.join(filesPath, nombreArchivo)
      fs.copyFileSync(paqueteLibro.ruta, rutaDestino)

      let nombre_archivo_portada = null;
      if (paqueteLibro.portadaRuta) {

        nombre_archivo_portada = `portada_${Date.now()}_${path.basename(paqueteLibro.portadaRuta)}`;
        const destinoPortada = path.join(coversPath, nombre_archivo_portada);
        fs.copyFileSync(paqueteLibro.portadaRuta, destinoPortada);
      }

      // 1. VARIABLES PARA INSERTAR LIBRO
        const stmtLibro = db.prepare(`INSERT INTO libros (nombre, ruta, archivo, portada) VALUES (?, ?, ?, ?)`);      //Aqui prepara las columnas de la tabla con valores "?", que son valores de seguridad en vez de null.
        const infoLibro = stmtLibro.run(paqueteLibro.nombre, paqueteLibro.ruta, nombreArchivo, nombre_archivo_portada);
        const libroId = infoLibro.lastInsertRowid; // <--- AQUÍ TIENES EL ID DEL LIBRO

        // 2. VARIABLES PARA PROCESAR CADA ETIQUETA
        const stmtEtiqueta = db.prepare(`INSERT OR IGNORE INTO etiquetas (nombre) VALUES (?)`); //!RECORDAR QUE ESTO SON VARIABLES QUE SE EJECUTAN EN EL FOR
        const stmtGetEtiquetaId = db.prepare(`SELECT id FROM etiquetas WHERE nombre = ?`);
        const stmtPuente = db.prepare(`INSERT INTO libro_etiquetas (libro_id, etiqueta_id) VALUES (?, ?)`); //Aqui se preparan las columnas de las tablas de etiquetas y puente para rellenar los valores con ? tambien.
        
        for (const nombreEtiqueta of paqueteLibro.etiquetas) { //En este for se recorren todas las etiquetas, se les asigna un id automaticamente y despues se obtiene como valor.
            // Guardar etiqueta si no existe                   
            stmtEtiqueta.run(nombreEtiqueta);
            
            // Obtener su ID
            const etiqueta = stmtGetEtiquetaId.get(nombreEtiqueta);
            const etiquetaId = etiqueta.id;

            // Unir libro con etiqueta
            stmtPuente.run(libroId, etiquetaId); //Despues se enlazan, juntando cada ID de libro con los ID de sus etiquetas
        }

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('libros:obtener', async () => {
    try {
        const query = `
            SELECT l.*, GROUP_CONCAT(e.nombre, ', ') AS etiquetas
            FROM libros l
            LEFT JOIN libro_etiquetas le ON l.id = le.libro_id
            LEFT JOIN etiquetas e ON le.etiqueta_id = e.id
            GROUP BY l.id
            ORDER BY l.id DESC
        `;
        const libros = db.prepare(query).all();
        
        // Convertimos el string de etiquetas en un array real
        return libros.map(libro => ({
            ...libro,
            etiquetas: libro.etiquetas ? libro.etiquetas.split(', ') : []
        }));
    } catch (error) {
        console.error("Error al obtener libros:", error);
        return [];
    }
});

ipcMain.handle('libro:eliminar', async (event, libroId) => {
    try {
        // 1. Obtener nombres de archivos antes de borrar de la DB
        const libro = db.prepare('SELECT archivo, portada FROM libros WHERE id = ?').get(libroId);
        
        if (libro) {
            // Borrar archivo EPUB
            const rutaEpub = path.join(filesPath, libro.archivo);
            if (fs.existsSync(rutaEpub)) fs.unlinkSync(rutaEpub);

            // Borrar portada si existe
            if (libro.portada) {
                const rutaPortada = path.join(coversPath, libro.portada);
                if (fs.existsSync(rutaPortada)) fs.unlinkSync(rutaPortada);
            }
        }

        // 2. Borrar de la base de datos (El CASCADE se encarga de la tabla puente)
        db.prepare('DELETE FROM libros WHERE id = ?').run(libroId);

        return { success: true };
    } catch (error) {
        console.error("Error al eliminar:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('libro:editar-nombre', async (event, { id, nuevoNombre }) => {
    try {
        db.prepare('UPDATE libros SET nombre = ? WHERE id = ?').run(nuevoNombre, id);
        return { success: true };
    } catch (error) {
        console.error("Error al renombrar:", error);
        return { success: false, error: error.message };
    }
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



