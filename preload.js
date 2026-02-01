const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- APLICACIÓN ---
  cerrarApp: () => ipcRenderer.invoke('app:close'),
  

  // --- DIÁLOGOS ---
  // Abre el diálogo nativo y devuelve la ruta del archivo seleccionado
  abrirDialogoArchivo: async () => {
    const resultado = await ipcRenderer.invoke('dialog:abrir-archivo');
    if (resultado.canceled || !resultado.filePaths.length) return null;
    return resultado.filePaths[0]; 
  },

  // --- BIBLIOTECA (SQLite) ---
  
  guardarLibro: (paqueteLibro) => ipcRenderer.invoke('libros:guardar', paqueteLibro),
  obtenerLibros: () => ipcRenderer.invoke('libros:obtener'),
  obtenerRutaLibro: (archivo) => ipcRenderer.invoke("libros:obtenerRuta", archivo),
  eliminarLibro: (id) => ipcRenderer.invoke('libros:borrar', id),
  cambiarNombreLibro: (id, nuevoNombre) => ipcRenderer.invoke('libros:editar-nombre', { id, nuevoNombre }),
  guardarMarcadorPagina: (id, marcador, numPag) => ipcRenderer.invoke('libros:guardar-pagina', id, marcador, numPag),
  obtenerMarcadorPagina: (id) => ipcRenderer.invoke('libros:obtener-pagina', id),

  // --- MÚSICA Y EFECTOS ---
  obtenerPlaylist: (nombre_playlist) => ipcRenderer.invoke('musica:leer-playlist', nombre_playlist),
  obtenerRutaAudio: (folderPath, archivo_cancion) => ipcRenderer.invoke('musica:obtener-ruta-audio', folderPath, archivo_cancion),   
  obtenerRutaEfectos: (nombre) => ipcRenderer.invoke('efectos:obtener-ruta', nombre),

  // --- UTILIDADES ---
  // Expone las rutas de las carpetas internas si el frontend las necesita
  getBooksFolders: () => ipcRenderer.invoke('paths:getBooksFolders'),
  seleccionarPortada: () => ipcRenderer.invoke('dialog:seleccionar-portada'),
  cambiarPortada: (portadamasid) => ipcRenderer.invoke('libros:cambiar-portada', portadamasid),
  mostrarBienvenida: (callback) => ipcRenderer.on('orden-mostrar-bienvenida', (_event) => callback()),
  marcarBienvenida: () => ipcRenderer.send('marcar-bienvenida')
});












