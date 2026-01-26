const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database.js');
const Store = require('electron-store');
const store = new Store(); 


function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    icon: path.join(__dirname, 'assets/images/Ares_logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  });

  //Desactivamos el zoom y los atajos de teclado
  win.webContents.on('did-finish-load', () => {
    const hasSeenWelcome = store.get('marcar-bienvenida');
    if (!hasSeenWelcome) {
        // Damos 500ms para que el renderer.js se cargue completamente
        setTimeout(() => {
            win.webContents.send('orden-mostrar-bienvenida');
        }, 500);
    }
    win.webContents.setZoomFactor(1.0);
    win.webContents.setVisualZoomLevelLimits(1, 1);
});

  
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && (input.key === '+' || input.key === '-' || input.key === '0')) {
      event.preventDefault();
    }
  });

  win.loadFile('index.html');
  win.webContents.openDevTools();

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

  ipcMain.handle('libros:guardar', async (event, paqueteLibro) => {
    try {
        
        let nombreArchivoLibro = path.basename(paqueteLibro.ruta);
        let rutaDestinoLibro = path.join(filesPath, nombreArchivoLibro);

        
        if (fs.existsSync(rutaDestinoLibro)) {           // Si el nombre del archivo ya existe en la carpeta de la app le busca un nombre unico usando (1), (2), etc.
            const ext = path.extname(nombreArchivoLibro); // .epub
            const nombreBase = path.basename(nombreArchivoLibro, ext); // nombre sin extension
            let contador = 1;

            while (fs.existsSync(rutaDestinoLibro)) {       //Aqui recorre el nombre buscando cuantas copias iguales tiene el libro para asignarle su numero.
                nombreArchivoLibro = `${nombreBase}_(${contador})${ext}`;
                rutaDestinoLibro = path.join(filesPath, nombreArchivoLibro);
                contador++;
            }
        }
        
        // Copiamos el archivo con el nombre definitivo y ÚNICO
        fs.copyFileSync(paqueteLibro.ruta, rutaDestinoLibro);


        //  B) Procesar la portada usando el sistema de renombrado del libro, si el libro es librorojo(1).epub esta sera librorojo(1).png (como esta en otra carpeta no hay mucho error posible) 
        let nombreArchivoPortada = null;
        
        if (paqueteLibro.portadaRuta) {
            const extP = path.extname(paqueteLibro.portadaRuta);
            const nombreBaseLibro = path.basename(nombreArchivoLibro, path.extname(nombreArchivoLibro));
            nombreArchivoPortada = `${nombreBaseLibro}_cover${extP}`;
            let rutaDestinoPortada = path.join(coversPath, nombreArchivoPortada);

            // Verificamos colisión también para la portada
            if (fs.existsSync(rutaDestinoPortada)) {
                let contadorP = 1;
                const nombreBaseP = path.basename(nombreArchivoPortada, extP);
                while (fs.existsSync(rutaDestinoPortada)) {
                    nombreArchivoPortada = `${nombreBaseP}_(${contadorP})${extP}`;
                    rutaDestinoPortada = path.join(coversPath, nombreArchivoPortada);
                    contadorP++;
                }
            }

            fs.copyFileSync(paqueteLibro.portadaRuta, rutaDestinoPortada);
        }

        //Aqui se guardan los datos de los libros en la DB despues de haberse creado
        const stmt = db.prepare(`
            INSERT INTO libros (nombre, ruta, archivo, portada, ultima_pag) 
            VALUES (?, ?, ?, ?, ?)
        `); 

        const info = stmt.run(
            paqueteLibro.nombre,
            paqueteLibro.ruta,      // Ruta original (para referencia)
            nombreArchivoLibro,     // Archivo físico REAL y ÚNICO
            nombreArchivoPortada,
            ""
            

        );

        // Aqui se guardan las etiquetas seleccionadas
        if (paqueteLibro.etiquetas && paqueteLibro.etiquetas.length > 0) {
            const stmtEtiqueta = db.prepare('INSERT OR IGNORE INTO etiquetas (nombre) VALUES (?)');
            const stmtRelacion = db.prepare('INSERT INTO libro_etiquetas (libro_id, etiqueta_id) VALUES (?, (SELECT id FROM etiquetas WHERE nombre = ?))');
            
            const transaction = db.transaction((etiquetas) => {
                for (const tag of etiquetas) {
                  const tagLimpia = tag.trim(); // Limpiamos aquí
                  stmtEtiqueta.run(tagLimpia);   // <--- ANTES USABAS 'tag' (MAL)
                  stmtRelacion.run(info.lastInsertRowid, tagLimpia); // <--- AHORA COINCIDEN
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
                GROUP_CONCAT(e.nombre, '|') as etiquetas_str
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
            etiquetas: libro.etiquetas_str ? libro.etiquetas_str.split('|') : []
        }));

    } catch (error) {
        console.error("Error al obtener libros:", error);
        return [];
    }
});

ipcMain.handle('libros:borrar', (event, id) => {
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

  ipcMain.handle('libros:editar-nombre', async (event, { id, nuevoNombre }) => {
     try {
          db.prepare('UPDATE libros SET nombre = ? WHERE id = ?').run(nuevoNombre, id);
         return { success: true };
      } catch (error) {
         console.error("Error al renombrar:", error);
          return { success: false, error: error.message };
     }
  });

  ipcMain.handle('libros:cambiar-portada', async (event, {id, nuevaPortada}) => {
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
  ipcMain.handle("libros:obtenerRuta", async (event, archivo) => {
  
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
 // Cerrar app
  ipcMain.handle('app:close', () => {
    app.quit();
  });

  ipcMain.handle('libros:guardar-pagina', async (e, id, marcador, numPag) => {
    try {
        // Tenemos 3 huecos: ?, ? y ?
        const query = db.prepare("UPDATE libros SET ultima_pag = ?, numero_pagina = ? WHERE id = ?");
        
        // Pasamos 3 valores exactos. Si numPag es undefined, SQLite podría dar error, 
        // así que nos aseguramos de que siempre vaya un número.
        query.run(marcador || "", numPag || 1, id); 
        
        return { success: true };
    } catch (error) {
        console.error("Error al guardar página:", error);
        return { success: false };
    }
  });

  ipcMain.handle('libros:obtener-pagina', async (e, id) => {
    try {
        const query = db.prepare('SELECT ultima_pag, numero_pagina FROM libros WHERE id = ?');
        const resultado = query.get(id);
        // Devolvemos el objeto completo para que el lector tenga toda la info
        return resultado; 
    } catch (error) {
        return null;
    }
  });

  ipcMain.on('marcar-bienvenida', () => {
      store.set('marcar-bienvenida', true);
      
  });





}
//! FUNCIONES AUXILIARES


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();



});



