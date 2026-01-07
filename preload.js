const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- APLICACIÓN ---
  cerrarApp: () => ipcRenderer.invoke('app:close'),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),

  // --- DIÁLOGOS ---
  // Abre el diálogo nativo y devuelve la ruta del archivo seleccionado
  abrirDialogoArchivo: async () => {
    const resultado = await ipcRenderer.invoke('dialog:abrir-archivo');
    if (resultado.canceled || !resultado.filePaths.length) return null;
    return resultado.filePaths[0]; 
  },

  // --- BIBLIOTECA (SQLite) ---
  
  guardarLibro: (paqueteLibro) => ipcRenderer.invoke('libro:guardar', paqueteLibro),
  obtenerLibros: () => ipcRenderer.invoke('libros:obtener'),
  obtenerRutaLibro: (archivo) => ipcRenderer.invoke("libro:obtenerRuta", archivo),
  eliminarLibro: (id) => ipcRenderer.invoke('libro:eliminar', id),
  cambiarNombreLibro: (id, nuevoNombre) => ipcRenderer.invoke('libro:editar-nombre', { id, nuevoNombre }),

  // --- MÚSICA Y EFECTOS ---
  obtenerPlaylist: (nombre_playlist) => ipcRenderer.invoke('musica:leer-playlist', nombre_playlist),
  obtenerRutaAudio: (archivo_cancion) => ipcRenderer.invoke('musica:obtener-ruta-audio', archivo_cancion),   
  obtenerRutaEfectos: (nombre) => ipcRenderer.invoke('efectos:obtener-ruta', nombre),

  // --- UTILIDADES ---
  // Expone las rutas de las carpetas internas si el frontend las necesita
  getBooksFolders: () => ipcRenderer.invoke('paths:getBooksFolders'),
  seleccionarPortada: () => ipcRenderer.invoke('dialog:seleccionar-portada'),
  cambiarPortada: (portadamasid) => ipcRenderer.invoke('libro:cambiar-portada', portadamasid)
});












