import * as Sound from './scripts/sound_scripts.js';
import * as UI from './scripts/ui_scripts.js';
import * as LIB from './scripts/library_scripts.js';
import * as EPUB from './scripts/epub_scripts.js';

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. SELECTORES Y VARIABLES GLOBALES
  // ==========================================
  
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
  let lectorActivo = false;
  
  let etiquetasSeleccionadas = [];

  // ==========================================
  // 2. INICIALIZACIÓN
  // ==========================================
  
  LIB.actualizarBiblioteca();

  // ==========================================
  // 3. GESTIÓN DE MÚSICA
  // ==========================================
  
  async function cargarCancion(index, playlistActual) {
    const cancion = playlistActual[index];
    const ruta = await window.electronAPI.obtenerRutaAudio(cancion.archivo);
    reproductor.src = ruta;
    document.getElementById('nombre-cancion').textContent = `Canción actual: ${cancion.titulo}`;
    reproductor.play();
  }

  // (El resto de la lógica de música se mantiene igual...)

  // ==========================================
  // 4. BIBLIOTECA Y LECTOR
  // ==========================================
  
  const gridBiblio = document.getElementById('grid_der_biblio');
  
  gridBiblio.addEventListener('click', (e) => {
    const tarjeta = e.target.closest('.tarjeta-libro');
    if (!tarjeta) return;

    // 1. Extraer datos del libro desde los data-attributes
    const id = tarjeta.dataset.id;
    const archivo = tarjeta.dataset.archivo;
    libro_seleccionado = { id, archivo };

    // 2. Copiar la portada de la tarjeta al libro animado
    const divPortadaOriginal = tarjeta.querySelector('.portada');
    if (divPortadaOriginal) {
      const estilo = window.getComputedStyle(divPortadaOriginal);
      portadaDinamica.style.backgroundImage = estilo.backgroundImage;
      portadaDinamica.style.backgroundSize = "cover";
    }

    // 3. Mostrar la animación
    UI.mostrarOverlay();
    modalTransicion.classList.add('mostrar'); // Esto lo lleva al centro (escala 1)

    if (Sound) Sound.sonido_efecto('efecto_sobre_boton');
  });

// 2. Clic en el libro ya agrandado para ABRIRLO
libroAnimado.addEventListener('click', async () => {
    if (!libro_seleccionado) return;

    modalTransicion.classList.add('abierto');
    if (Sound) Sound.sonido_efecto('efecto_pagina');

    setTimeout(async () => {
        try {
            // --- CAMBIO CLAVE AQUÍ ---
            // Pedimos al Main la ruta completa usando el nombre del archivo guardado
            const rutaCompleta = await window.electronAPI.obtenerRutaLibro(libro_seleccionado.archivo);

            const resultado = await EPUB.abrirLector(
                rutaCompleta, // Ahora enviamos la ruta real (C:\Users\...)
                modalLectorReal, 
                visor, 
                Sound
            );
            
            rendition = resultado.rendition;
            libroActual = resultado.libroActual;
            lectorActivo = true;

            modalTransicion.classList.remove('mostrar', 'abierto');
        } catch (error) {
            console.error("Error al obtener ruta o abrir EPUB:", error);
        }
    }, 1000); 
});

  document.addEventListener('keydown', (e) => {
    if (lectorActivo && rendition) {
      EPUB.manejarTeclado(e, lectorActivo, rendition, Sound);
    }
  });

  // ==========================================
  // 5. AÑADIR LIBRO (ACTUALIZADO)
  // ==========================================
  
  const inputOculto = document.getElementById('input_archivo_oculto');
  const btnSeleccionar = document.getElementById('sel_archivo_libro');
  const inputNombre = document.getElementById('nombre_libro_input');

  // Trigger del input oculto
  btnSeleccionar.addEventListener('click', () => {
    inputOculto.click();
  });

  // Evento al seleccionar archivo (Minimalista, sin texto extra)
  inputOculto.addEventListener('change', () => {
    if (inputOculto.files.length > 0) {
      // Feedback visual en el botón
      btnSeleccionar.textContent = "¡EPUB Cargado!";
      btnSeleccionar.style.backgroundColor = "#2ecc71"; 
      btnSeleccionar.style.borderColor = "#27ae60";
      
      // Auto-rellenar nombre si está vacío
      if (inputNombre && inputNombre.value.trim() === "") {
        const nombreSinExt = inputOculto.files[0].name.replace(/\.[^/.]+$/, "");
        inputNombre.value = nombreSinExt;
      }
    }
  });

  // Manejo de etiquetas en el modal
  document.getElementById('grid_etiquetas').addEventListener('click', (e) => {
    etiquetasSeleccionadas = LIB.manejarSeleccionEtiqueta(e, etiquetasSeleccionadas, Sound);
  });

  // Botón final para guardar en SQLite
  document.getElementById('btn_add_book').addEventListener('click', async () => {
    const nombre = inputNombre.value.trim();
    const archivoFile = inputOculto.files[0];

    if (!nombre || !archivoFile) {
      UI.abrirAlerta("Falta el nombre o el archivo del libro.");
      return;
    }

    const paqueteLibro = {
      nombre: nombre,
      rutaSubida: archivoFile.path,
      etiquetas: etiquetasSeleccionadas
    };

    const resultado = await window.electronAPI.guardarLibro(paqueteLibro);

    if (resultado.success) {
      // Limpieza y reset
      UI.resetearFormularioAñadir(ventanaAñadirLibro, inputNombre);
      btnSeleccionar.textContent = "Seleccionar EPUB";
      btnSeleccionar.style.backgroundColor = "";
      btnSeleccionar.style.borderColor = "";
      etiquetasSeleccionadas = [];
      
      await LIB.actualizarBiblioteca();
    } else {
      UI.abrirAlerta("Error al guardar: " + resultado.error);
    }
  });

  // ==========================================
  // 6. MODALES Y NAVEGACIÓN
  // ==========================================
  
  document.getElementById('btn_añadir_libro').addEventListener('click', () => {
    UI.mostrarOverlay();
    ventanaAñadirLibro.classList.add('mostrar');
    // CARGAR LAS ETIQUETAS AQUÍ
    LIB.cargarEtiquetasDisponibles('#grid_etiquetas'); 
  });

  document.getElementById('btn_cerrar_añadir').addEventListener('click', () => {
    UI.resetearFormularioAñadir(ventanaAñadirLibro, inputNombre);
    btnSeleccionar.textContent = "Seleccionar EPUB";
    btnSeleccionar.style.backgroundColor = "";
    btnSeleccionar.style.borderColor = "";
  });

  // ==========================================
  // 7. MENÚ CONTEXTUAL (SQLite)
  // ==========================================
  
  const menuContextual = document.getElementById('menu-contextual');
  const btnEliminar = document.getElementById('opcion_eliminar');
  const btnCambiarNombre = document.getElementById('opcion_nombre');
  
  const modalConfirmacion = document.getElementById('modal_confirmacion');
  const btnConfirmarEliminacion = document.getElementById('btn_confirmar_eliminacion');
  
  const modalCambiarNombre = document.getElementById('modal_cambiar_nombre');
  const input_nuevo_nombre = document.getElementById('nuevo_nombre_libro');
  const btn_confirmar_newname = document.getElementById('confirmar_nuevo_nombre');

  document.getElementById('grid_der_biblio').addEventListener('contextmenu', (e) => {
    const tarjeta = e.target.closest('.tarjeta-libro');
    if (tarjeta) {
      e.preventDefault();
      libro_seleccionado = LIB.mostrarMenuContextual(e, menuContextual, tarjeta);
    }
  });

  document.addEventListener('click', () => menuContextual.classList.remove('visible'));

  btnEliminar.addEventListener('click', () => {
    if (libro_seleccionado) {
      UI.mostrarOverlay();
      modalConfirmacion.classList.add('mostrar');
    }
  });

  btnConfirmarEliminacion.addEventListener('click', async () => {
    if (libro_seleccionado) {
      const resultado = await window.electronAPI.eliminarLibro(libro_seleccionado);
      if (resultado.success) {
        await LIB.actualizarBiblioteca();
        modalConfirmacion.classList.remove('mostrar');
        UI.ocultarOverlay();
      }
    }
  });

  btnCambiarNombre.addEventListener('click', () => {
    if (libro_seleccionado) {
      UI.mostrarOverlay();
      modalCambiarNombre.classList.add('mostrar');
      input_nuevo_nombre.focus();
    }
  });

  btn_confirmar_newname.addEventListener('click', async () => {
    const nuevoNombre = input_nuevo_nombre.value.trim();
    const exito = await LIB.confirmarCambioNombre(libro_seleccionado, nuevoNombre, modalCambiarNombre, input_nuevo_nombre);
    if (exito) {
      await LIB.actualizarBiblioteca();
      UI.ocultarOverlay();
    }
  });

  // ==========================================
  // 8. ELEMENTOS GENERALES
  // ==========================================
  
  document.getElementById('btn_cerrar_alerta').addEventListener('click', () => {
    document.getElementById('modal_alerta').classList.remove('mostrar');
    UI.ocultarOverlay();
  });

  document.querySelectorAll('.btn_efecto').forEach(boton => {
      boton.addEventListener('mouseenter', () => {
          Sound.sonido_efecto('efecto_sobre_boton');
      });
  });

  document.getElementById('btnCerrar').addEventListener('click', () => window.electronAPI.cerrarApp());
  document.getElementById('btnOpciones').addEventListener('click', () => ventana_Opciones.classList.add('mostrar'));
  document.getElementById('btnVolver').addEventListener('click', () => ventana_Opciones.classList.remove('mostrar'));
  document.getElementById('btnBiblio').addEventListener('click', () => ventanaBiblio.classList.add('mostrar'));
  document.getElementById('btnVolverBiblio').addEventListener('click', () => ventanaBiblio.classList.remove('mostrar'));
  
  document.getElementById('cerrarLector').addEventListener('click', () => {
    // 1. Ocultamos el lector real
    modalLectorReal.style.display = "none";
    
    // 2. Limpiamos el contenido del visor para que no consuma memoria
    visor.innerHTML = "";
    lectorActivo = false;

    // 3. Aseguramos que el overlay y la biblioteca se vean
    UI.ocultarOverlay();
    ventanaBiblio.classList.add('mostrar');

    // 4. Limpiamos cualquier rastro del libro animado anterior
    modalTransicion.classList.remove('mostrar', 'abierto');
});
});









  




