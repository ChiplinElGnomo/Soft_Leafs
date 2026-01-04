const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Función para obtener rutas de carpetas internas
async function getFolders() {
  return await ipcRenderer.invoke('paths:getBooksFolders');
}





contextBridge.exposeInMainWorld('electronAPI', {

  // Cerrar la app
  cerrarApp: () => ipcRenderer.invoke('app:close'),

  showContextMenu: () => ipcRenderer.send('show-context-menu'),

  // Generar ID
  generarId: () => uuidv4(),

  // Abrir diálogo nativo para seleccionar archivo
  abrirDialogoArchivo: async () => {
    const resultado = await ipcRenderer.invoke('dialog:abrir-archivo');
    if (resultado.canceled || !resultado.filePaths.length) return null;
    return resultado.filePaths[0]; // ruta absoluta del archivo seleccionado
  },

  // Leer archivo como ArrayBuffer (para EPUB.js)
  leerArchivoEPUB: async (ruta) => {
    const buffer = await fs.promises.readFile(ruta);
    return buffer.buffer; // devolver ArrayBuffer compatible con EPUB.js
  },

  // Guardar libro y generar metadatos
  guardarLibro: async ({ nombre, ruta, etiquetas }) => {
    try {
      if (!ruta || typeof ruta !== 'string') {
        throw new Error("Ruta de archivo inválida");
      }

      const { filesPath, metaPath } = await getFolders();

      // Validar extensión
      const ext = path.extname(ruta).toLowerCase();
      if (!['.epub'].includes(ext)) throw new Error('Formato no compatible');

      // Comprobar duplicado por nombre
      const existing = fs.readdirSync(metaPath);
      for (const file of existing) {
        const meta = JSON.parse(fs.readFileSync(path.join(metaPath, file), 'utf8'));
        if (meta.nombre === nombre) throw new Error('Ya existe un libro con este nombre');
      }

      const id = uuidv4();
      const nuevoNombreArchivo = `${id}${ext}`;
      const destinoArchivo = path.join(filesPath, nuevoNombreArchivo);
      const destinoMeta = path.join(metaPath, `${id}.json`);

      // Copiar el archivo original
      fs.copyFileSync(ruta, destinoArchivo);

      // Crear metadata
      const metadata = {
        id,
        nombre,
        archivo: nuevoNombreArchivo,
        etiquetas
      };

      fs.writeFileSync(destinoMeta, JSON.stringify(metadata, null, 2));

      return { metadata, mensaje: 'Libro guardado correctamente' };

    } catch (error) {
      return { error: error.message };
    }
  },

  // Obtener lista de libros
  obtenerLibros: async () => {
    try {
      const { metaPath } = await getFolders();

      return fs.readdirSync(metaPath)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(fs.readFileSync(path.join(metaPath, f), 'utf8')));

    } catch (error) {
      console.error(error);
      return [];
    }
  },

  obtenerPlaylist: (nombre_playlist) => ipcRenderer.invoke('musica:leer-playlist', nombre_playlist),
  obtenerRutaAudio: (archivo_cancion) => ipcRenderer.invoke('musica:obtener-ruta-audio', archivo_cancion),   
  obtenerRutaEfectos: (nombre) => ipcRenderer.invoke('efectos:obtener-ruta', nombre),

  
  
  // Obtener ruta completa de un libro
  obtenerRutaLibro: async (archivo) =>
    await ipcRenderer.invoke("libro:obtenerRuta", archivo),

  eliminarLibro: async (nombreArchivo) => {
    try {
      const { filesPath, metaPath } = await getFolders();
      const rutaLibro = path.join(filesPath, nombreArchivo);
      const idLibro = path.parse(nombreArchivo).name; 
      const rutaMeta = path.join(metaPath, `${idLibro}.json`);
      if (fs.existsSync(rutaLibro)) fs.unlinkSync(rutaLibro);
      if (fs.existsSync(rutaMeta)) fs.unlinkSync(rutaMeta);
      return { mensaje: 'Libro eliminado correctamente' };
    }catch (error) {
      return { error: error.message };
    }

    
  },

  cambiar_nombre_libro: async (nombreArchivo, nuevoNombre) => {
    try {
      const { metaPath } = await getFolders();
      const idLibro = path.parse(nombreArchivo).name;
      const rutaMeta = path.join(metaPath, `${idLibro}.json`);
      if (fs.existsSync(rutaMeta)) {
        const data = JSON.parse(fs.readFileSync(rutaMeta, 'utf8'));
        data.nombre = nuevoNombre;
        fs.writeFileSync(rutaMeta, JSON.stringify(data, null, 2));
        return { mensaje: 'Nombre actualizado correctamente' };
      }
      throw new Error("El archivo de metadatos no existe");
    } catch (error) {
      return { error: error.message };
    }
  }
});












