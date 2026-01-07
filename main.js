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
      webSecurity: false
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
        // A) Procesar el LIBRO (EPUB)
        const nombreArchivoLibro = path.basename(paqueteLibro.ruta);
        const rutaDestinoLibro = path.join(filesPath, nombreArchivoLibro);
        fs.copyFileSync(paqueteLibro.ruta, rutaDestinoLibro);

        // B) Procesar la PORTADA (NUEVO)
        let nombreArchivoPortada = null;
        
        if (paqueteLibro.portadaRuta) {
            // Generamos nombre único: "HarryPotter_cover.jpg"
            const ext = path.extname(paqueteLibro.portadaRuta);
            const nombreBase = path.basename(nombreArchivoLibro, path.extname(nombreArchivoLibro));
            nombreArchivoPortada = `${nombreBase}_cover${ext}`;

            const rutaDestinoPortada = path.join(coversPath, nombreArchivoPortada);
            fs.copyFileSync(paqueteLibro.portadaRuta, rutaDestinoPortada);
        }

        // C) Guardar en Base de Datos (4 CAMPOS)
        const stmt = db.prepare(`
            INSERT INTO libros (nombre, ruta, archivo, portada) 
            VALUES (?, ?, ?, ?)
        `);

        const info = stmt.run(
            paqueteLibro.nombre,
            paqueteLibro.ruta,      // Ruta original
            nombreArchivoLibro,     // Archivo interno
            nombreArchivoPortada    // Nombre de la portada o null
        );

        // D) Guardar Etiquetas (Sin cambios)
        if (paqueteLibro.etiquetas && paqueteLibro.etiquetas.length > 0) {
            const stmtEtiqueta = db.prepare('INSERT OR IGNORE INTO etiquetas (nombre) VALUES (?)');
            const stmtRelacion = db.prepare('INSERT INTO libro_etiquetas (libro_id, etiqueta_id) VALUES (?, (SELECT id FROM etiquetas WHERE nombre = ?))');
            
            const transaction = db.transaction((etiquetas) => {
                for (const tag of etiquetas) {
                    stmtEtiqueta.run(tag);
                    stmtRelacion.run(info.lastInsertRowid, tag);
                }
            });
            transaction(paqueteLibro.etiquetas);
        }

        return { success: true, id: info.lastInsertRowid };

    } catch (error) {
        console.error("Error en guardar:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('libros:obtener', () => {
    try {
        // Seleccionamos todo del libro y concatenamos sus etiquetas en un string separado por comas
        const stmt = db.prepare(`
            SELECT 
                l.*, 
                GROUP_CONCAT(e.nombre, ',') as etiquetas_str
            FROM libros l
            LEFT JOIN libro_etiquetas le ON l.id = le.libro_id
            LEFT JOIN etiquetas e ON le.etiqueta_id = e.id
            GROUP BY l.id
            ORDER BY l.fecha_añadido DESC
        `);
        
        const libros = stmt.all();

        // Convertimos el string de etiquetas "Fantasía,Magia" a un array ["Fantasía", "Magia"]
        // para que sea fácil de usar en el frontend
        return libros.map(libro => ({
            ...libro,
            etiquetas: libro.etiquetas_str ? libro.etiquetas_str.split(',') : []
        }));

    } catch (error) {
        console.error("Error al obtener libros:", error);
        return [];
    }
});

ipcMain.handle('libro:eliminar', (event, id) => {
    try {
        // 1. Obtener la info del libro antes de borrarlo para saber qué archivos eliminar
        const libro = db.prepare('SELECT archivo, portada FROM libros WHERE id = ?').get(id);

        if (!libro) return { success: false, error: "Libro no encontrado" };

        // 2. Borrar el archivo EPUB
        const rutaArchivo = path.join(filesPath, libro.archivo);
        if (fs.existsSync(rutaArchivo)) {
            fs.unlinkSync(rutaArchivo);
        }

        // 3. Borrar la PORTADA (Si existe) <-- IMPORTANTE
        if (libro.portada) {
            const rutaPortada = path.join(coversPath, libro.portada);
            if (fs.existsSync(rutaPortada)) {
                fs.unlinkSync(rutaPortada);
            }
        }

        // 4. Borrar de la base de datos
        // (Las etiquetas se borran solas gracias al ON DELETE CASCADE que pusiste en database.js)
        const info = db.prepare('DELETE FROM libros WHERE id = ?').run(id);
        
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

ipcMain.handle('libro:cambiar-portada', async (event, {id, nuevaPortada}) => {
  try {
    const libroActual = db.prepare('SELECT portada FROM libros WHERE id = ?').get(id);
    if (!libroActual || !nuevaPortada) return { success: false };

    // Solo intentamos borrar si REALMENTE hay un nombre de archivo guardado
    if (libroActual.portada) {
      const antiguaPortada = path.join(coversPath, libroActual.portada);
      if(fs.existsSync(antiguaPortada)) {
        fs.unlinkSync(antiguaPortada);
      }
    }

    const extension = path.extname(nuevaPortada);
    const nombre_unico_portada = `portada_${id}_${Date.now()}${extension}`;
    const rutaDestinoNuevaPortada = path.join(coversPath, nombre_unico_portada);
    
    fs.copyFileSync(nuevaPortada, rutaDestinoNuevaPortada);
    
    db.prepare('UPDATE libros SET portada = ? WHERE id = ?').run(nombre_unico_portada, id);
    
    return { success: true, nuevaPortada: nombre_unico_portada };
  } catch (error) {
    console.error("Error cambiando portada:", error);
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

  ipcMain.handle('dialog:seleccionar-portada', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Imágenes', extensions: ['jpg', 'png', 'jpeg', 'webp'] }
    ]
  });
  if (canceled) return null;
  return filePaths[0];
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



