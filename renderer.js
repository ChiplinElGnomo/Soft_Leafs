document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. SELECTORES Y VARIABLES GLOBALES
  // ==========================================
  const VOLUMEN_KEY = 'user-volume';
  const VOLUMEN_EFFECTS = 'volumen_efectos'
  const reproductor = document.getElementById('musica_fondo');
  const sliderVolumen = document.getElementById('volumen_musica');
  const sliderEfectos = document.getElementById('volumen_efectos')
  const etiquetaMusica = document.querySelector('.eti-musica');
  const overlay = document.getElementById('overlay');

  
  const ventana_Opciones = document.getElementById('ventanaOpciones');
  const ventanaBiblio = document.getElementById('ventanaBiblio');
  const ventanaAñadirLibro = document.getElementById('ventana_añadir_libro');
  const modalLectorReal = document.getElementById("libro_abierto");
  const visor = document.getElementById("visorEPUB");
  
 
  const modalTransicion = document.getElementById('modal-transicion');
  const libroAnimado = document.getElementById('libro-animado');
  const portadaDinamica = document.getElementById('portada-dinamica');

  
  let libroActual = null;
  let libro_seleccionado = null;
  let rendition = null;
  let cancionesPlaylist = [];
  let indiceActual = 0;
  let volumen_efectos = 0.2;

  // ==========================================
  // 2.       SISTEMA DE ETIQUETAS 
  // ==========================================
  const contenedorEtiquetas = document.getElementById('contenedorEtiquetas');
let etiquetasSeleccionadas = [];

const etiquetasDisponibles = [
  'Anime', 'Fantasía', 'Dark Romance', 'Terror',
  'Ciencia Ficción', 'Misterio', 'Aventura',
  'Histórico', 'Romance', 'Thriller', 'Magia',
  'Sobrenatural', 'Vampiros', 'Enemies to lovers', 
  'Acción', 'Clásico'
];

// Render inicial: todas en el mismo sitio
etiquetasDisponibles.forEach(etiqueta => {
  const span = document.createElement('span');
  span.textContent = etiqueta;
  span.classList.add('etiqueta');
  contenedorEtiquetas.appendChild(span);
});

// Evento: Toggle (Activar/Desactivar)
contenedorEtiquetas.addEventListener('click', e => {
  if (e.target.classList.contains('etiqueta')) {
    const nombreEtiqueta = e.target.textContent;

    if (!etiquetasSeleccionadas.includes(nombreEtiqueta)) {
      // 1. SELECCIONAR: No estaba, así que la añadimos
      etiquetasSeleccionadas.push(nombreEtiqueta);
      e.target.classList.add('seleccionada');
    } else {
      // 2. DESELECCIONAR: Ya estaba, así que la quitamos
      etiquetasSeleccionadas = etiquetasSeleccionadas.filter(et => et !== nombreEtiqueta);
      e.target.classList.remove('seleccionada');
    }
    
    // Opcional: Sonido al seleccionar/deseleccionar
    sonido_efecto('efecto_sobre_boton'); 
  }
});

  

  // ==========================================
  // 3. AÑADIR LIBRO Y GUARDADO
  // ==========================================
  const nombreInput = document.getElementById('nombre_libro');
  const btnArchivoLibro = document.getElementById('archivo_libro');
  const spanNombreArchivo = document.getElementById("archivo_nombre");
  let archivoSeleccionadoPath = null;

  document.getElementById('btn_añadir_libro').addEventListener('click', () => {
    mostrarOverlay(); 
    ventanaAñadirLibro.classList.add('mostrar'); 
});

  btnArchivoLibro.addEventListener('click', async () => {
    const ruta = await window.electronAPI.abrirDialogoArchivo();
    if (ruta) {
      archivoSeleccionadoPath = ruta;
      spanNombreArchivo.textContent = ruta.split(/[\\/]/).pop();
    }
  });

  document.getElementById('btn_add_book').addEventListener('click', async (e) => {
    const nombre = nombreInput.value.trim();
    e.stopPropagation();
    if (!nombre || !archivoSeleccionadoPath) {
      sonido_efecto('efecto_error');
      abrirAlerta('Por favor, completa todos los campos antes de añadir el libro.');
      return;
    }

    const resultado = await window.electronAPI.guardarLibro({ 
      nombre, 
      ruta: archivoSeleccionadoPath, 
      etiquetas: etiquetasSeleccionadas
       
    });

    if (resultado.error) {
      abrirAlerta(`Error: ${resultado.error}`);
    } else {
      resetearFormularioAñadir();
      actualizarBiblioteca();
      ocultarOverlay(); 
      abrirAlerta('Libro añadido correctamente.');
    }
  });

  function resetearFormularioAñadir() {
    ventanaAñadirLibro.classList.remove('mostrar');
    ocultarOverlay();
    nombreInput.value = '';
    archivoSeleccionadoPath = null;
    spanNombreArchivo.textContent = '';
    etiquetasSeleccionadas = [];
    document.querySelectorAll('.etiqueta').forEach(el => {
        el.classList.remove('seleccionada');
    });
    document.activeElement.blur();
  }

  // ==========================================
  // 4. BIBLIOTECA Y ANIMACIÓN 3D
  // ==========================================
  async function actualizarBiblioteca() {
    const grid = document.getElementById('grid_der_biblio');
    if (!grid) return;
    grid.innerHTML = '';
    const libros = await window.electronAPI.obtenerLibros();
    libros.forEach(libro => {
      const tarjeta = document.createElement('div');
      tarjeta.classList.add('tarjeta-libro');
      tarjeta.dataset.archivo = libro.archivo;
      tarjeta.innerHTML = `<div class="portada"></div><div class="nombre-libro">${libro.nombre}</div>`;
      tarjeta.addEventListener('mouseenter', () => {
      
      });
      grid.appendChild(tarjeta);
    });
  }
  actualizarBiblioteca();

  

  function cerrarModalTransicion() {
  modalTransicion.style.display = 'none';
  modalTransicion.classList.remove('activo');
  libroAnimado.classList.remove('abierto');
}



// Click en libro (Inicia transición)
document.getElementById('grid_der_biblio').addEventListener('click', (e) => {
  const tarjeta = e.target.closest(".tarjeta-libro");
  if (!tarjeta) return;

  const archivo = tarjeta.dataset.archivo;
  const bgImage = window.getComputedStyle(tarjeta.querySelector('.portada')).backgroundImage;
  portadaDinamica.style.backgroundImage = bgImage;
  portadaDinamica.style.backgroundSize = "100% 100%"; 
  modalTransicion.style.display = 'flex';
  modalTransicion.classList.add('activo');
  libroAnimado.dataset.archivoPendiente = archivo;
});


modalTransicion.addEventListener('click', (e) => {
  
  if (e.target === modalTransicion) {
    cerrarModalTransicion();
  }
});


libroAnimado.addEventListener('click', (e) => {
  e.stopPropagation(); 
  libroAnimado.classList.add('abierto');

  setTimeout(async () => {
    const archivo = libroAnimado.dataset.archivoPendiente;
    const rutaCompleta = await window.electronAPI.obtenerRutaLibro(archivo);
    
    
    cerrarModalTransicion();
    abrirLector(rutaCompleta);
  }, 850);
});

  // ==========================================
  // 5. LECTOR EPUB Y TECLADO
  // ==========================================
  let lectorActivo = false;

async function abrirLector(ruta) {
  modalLectorReal.style.display = "flex";
  visor.innerHTML = "";
  lectorActivo = true; 

  const arrayBuffer = await window.electronAPI.leerArchivoEPUB(ruta);
  libroActual = ePub(arrayBuffer);
  
  rendition = libroActual.renderTo("visorEPUB", {
    width: "100%", height: "100%", spread: "always", flow: "paginated"
  });

  await rendition.display();

 
  rendition.on("keydown", manejarTeclado);
  
 
  window.addEventListener('keydown', manejarTeclado);
}


function manejarTeclado(event) {
  if (!lectorActivo || !rendition) return;

  
  if (event.code === "ArrowRight" || event.key === "ArrowRight") {
    rendition.next();
    sonido_efecto('efecto_pagina')
    event.preventDefault(); 
  }
  if (event.code === "ArrowLeft" || event.key === "ArrowLeft") {
    rendition.prev();
    sonido_efecto('efecto_pagina')
    event.preventDefault();
  }
}

  document.getElementById("cerrarLector").addEventListener("click", () => {
  modalLectorReal.style.display = "none";
  visor.innerHTML = "";
  lectorActivo = false; 
  
  
  window.removeEventListener('keydown', manejarTeclado);

  if (rendition) rendition.destroy();
  libroActual = null;
  rendition = null;
});

  // ==========================================
  // 6. MÚSICA Y OPCIONES
  // ==========================================
  if (sliderVolumen) {
  const volumenInicial = localStorage.getItem(VOLUMEN_KEY) || 0.5;
  sliderVolumen.value = volumenInicial;
  reproductor.volume = volumenInicial;

  sliderVolumen.addEventListener('input', (e) => {
    reproductor.volume = e.target.value;
    localStorage.setItem(VOLUMEN_KEY, e.target.value);
  });
}

if (sliderEfectos) {
  const volumen_efectos_inicial = localStorage.getItem(VOLUMEN_EFFECTS) || 0.5;
  sliderEfectos.value = volumen_efectos_inicial;
  volumen_efectos = volumen_efectos_inicial;

  sliderEfectos.addEventListener('input', (e) => {
    volumen_efectos = e.target.value;
    localStorage.setItem(VOLUMEN_EFFECTS, e.target.value);
  });
  
}

document.querySelectorAll('.btn_seccion').forEach(boton_seccion => {
  boton_seccion.addEventListener('click', () =>  {
    const seccion_boton = boton_seccion.dataset.seccion_opciones;
    document.querySelectorAll('.seccion_opciones').forEach(seccion =>{
      seccion.classList.remove('mostrar')
      
    });
    const seccion_selec = document.getElementById(seccion_boton);
    seccion_selec.classList.add('mostrar')
  

  
  });
});

  async function reproducirPlaylist(nombre_playlist) {
    try {
      const playlist = await window.electronAPI.obtenerPlaylist(nombre_playlist);
      cancionesPlaylist = playlist.canciones;
      if (cancionesPlaylist.length > 0) cargarYCancion(0);
    } catch (e) { console.error(e); }
  }

  async function cargarYCancion(indice) {
    const cancion = cancionesPlaylist[indice];
    const ruta = await window.electronAPI.obtenerRutaAudio(cancion.archivo_cancion);
    reproductor.src = new URL(`file://${ruta}`).href;
    reproductor.volume = sliderVolumen.value;
    etiquetaMusica.textContent = `Canción actual: ${cancion.titulo}`;
    reproductor.play().catch(() => {
      document.addEventListener('click', () => reproductor.play(), { once: true });
    });
  }

  reproductor.addEventListener('ended', () => {
    indiceActual = (indiceActual + 1) % cancionesPlaylist.length;
    cargarYCancion(indiceActual);
  });


  
  async function sonido_efecto(nombre_efecto) {
    const ruta_final_efectos = await window.electronAPI.obtenerRutaEfectos(nombre_efecto);
    const efecto = new Audio(ruta_final_efectos)
    efecto.volume = volumen_efectos;
    efecto.play();
  }

  reproducirPlaylist('cozy');

  // ==========================================  
  // 7. MENU CONTEXTUAL Y BORRADO
  // ==========================================  

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const menu = document.getElementById('menu-contextual');
    const tarjeta = e.target.closest(".tarjeta-libro");
    
    if (tarjeta) {
      libro_seleccionado = tarjeta.dataset.archivo;
      menu.style.top = `${e.pageY}px`;
      menu.style.left = `${e.pageX}px`;
      menu.classList.add('visible');
    } else {
      menu.classList.remove('visible');
      libro_seleccionado = null;
    }
  });

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('menu-contextual');
    if (menu && !menu.contains(e.target)) {
      menu.classList.remove('visible');
    }
  });

  const boton_borrar = document.getElementById('opcion_eliminar');
  const modalConfirmacion = document.getElementById('modal_confirmacion');
  const btnConfirmarEliminacion = document.getElementById('btn_confirmar_eliminacion');
  const btnCancelarEliminacion = document.getElementById('btn_cancelar_eliminacion');
  if (boton_borrar) {
    boton_borrar.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (libro_seleccionado) {
        mostrarOverlay();
        modalConfirmacion.classList.add('mostrar');
        document.getElementById('menu-contextual').classList.remove('visible');
        btnConfirmarEliminacion.addEventListener('click', async () => {
          await window.electronAPI.eliminarLibro(libro_seleccionado);
          actualizarBiblioteca();
          modalConfirmacion.classList.remove('mostrar');
          ocultarOverlay();
        });
        btnCancelarEliminacion.addEventListener('click', () => {
          modalConfirmacion.classList.remove('mostrar');
          ocultarOverlay();
        });
      }
        
      
  });
  }
  
  const modalCambiarNombre = document.getElementById('modal_cambiar_nombre');
  const btn_confirmar_newname = document.getElementById('confirmar_nuevo_nombre')
  const btn_cancelar_newname = document.getElementById('cancelar_nuevo_nombre');
  const input_nuevo_nombre = document.getElementById('nuevo_nombre_libro');
  const boton_nombre = document.getElementById('opcion_nombre');
 
  
if (boton_nombre) {
  boton_nombre.addEventListener('click', (e) => {
    e.stopPropagation();
    modalCambiarNombre.classList.add('mostrar');
    document.getElementById('menu-contextual').classList.remove('visible');
    input_nuevo_nombre.focus();
  });
}


if (btn_cancelar_newname) {
  btn_cancelar_newname.addEventListener('click', () => {
    modalCambiarNombre.classList.remove('mostrar');
    input_nuevo_nombre.value = '';
  });
}



  

if (btn_confirmar_newname) {
  btn_confirmar_newname.addEventListener('click', async () => {
    const nuevoNombre = input_nuevo_nombre.value.trim();
    if (libro_seleccionado && nuevoNombre) {
      if (nuevoNombre.length > 20) {
        alert('El nombre no puede exceder los 20 caracteres.');
        return;
      }
      else{
      await window.electronAPI.cambiar_nombre_libro(libro_seleccionado, nuevoNombre);
      actualizarBiblioteca();
      modalCambiarNombre.classList.remove('mostrar');
      input_nuevo_nombre.value = '';


      }
      
    }
  });
  
}

if (input_nuevo_nombre) {
  input_nuevo_nombre.addEventListener ('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btn_confirmar_newname.click();
  }
  });
}
  


    
  

  // ==========================================  
  // 8. NAVEGACIÓN Y ELEMENTOS GENERALES
  // ==========================================

  function abrirAlerta(mensaje_alerta) {

    const modalAlerta = document.getElementById('modal_alerta');
    const textoAlerta = document.getElementById('texto_alerta');
    const btnCerrarAlerta = document.getElementById('btn_cerrar_alerta');

    if (modalAlerta && textoAlerta) {
      textoAlerta.textContent = mensaje_alerta;
      mostrarOverlay()
      modalAlerta.classList.add('mostrar');
      document.getElementById('btn_cerrar_alerta').focus();

    }


  }
  document.getElementById('btn_cerrar_alerta').addEventListener('click', () => {
  document.getElementById('modal_alerta').classList.remove('mostrar');
  ocultarOverlay(); // <--- Desbloqueamos el fondo
});

document.querySelectorAll('.btn_efecto').forEach(boton => {
    boton.addEventListener('mouseenter', () => {
        sonido_efecto('efecto_sobre_boton');
    });
});

function mostrarOverlay() {
  overlay.classList.add('mostrar');
}

function ocultarOverlay() {
  overlay.classList.remove('mostrar');
}



  document.getElementById('btnCerrar').addEventListener('click', () => window.electronAPI.cerrarApp());
  document.getElementById('btnOpciones').addEventListener('click', () => ventana_Opciones.classList.add('mostrar'));
  document.getElementById('btnVolver').addEventListener('click', () => ventana_Opciones.classList.remove('mostrar'));
  document.getElementById('btnBiblio').addEventListener('click', () => ventanaBiblio.classList.add('mostrar'));
  document.getElementById('btnVolverBiblio').addEventListener('click', () => ventanaBiblio.classList.remove('mostrar'));
  
  document.getElementById('btn_cerrar_añadir').addEventListener('click', resetearFormularioAñadir);

});









  




