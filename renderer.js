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
  const btn_cambiar_portada = document.getElementById("opcion_portada")
  
  const modalTransicion = document.getElementById('modal-transicion');
  const libroAnimado = document.getElementById('libro-animado');
  const portadaDinamica = document.getElementById('portada-dinamica');
  let rutaNuevoLibro = null; 
  let rutaPortadaNueva = null;

  let libroActual = null;
  let libro_seleccionado = null;
  let rendition = null;
  let lectorActivo = false;
  
  let etiquetasSeleccionadas = [];

  // ==========================================
  // 2. INICIALIZACIÓN
  // ==========================================
  
  LIB.actualizarBiblioteca();
  Sound.reproducirPlaylist('cozy');

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
      
    }

    
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
// 5. AÑADIR LIBRO 
// ==========================================

const btnSeleccionar = document.getElementById('sel_archivo_libro');
const inputNombre = document.getElementById('nombre_libro_input');
let rutaLibroSeleccionado = null; 


btnSeleccionar.addEventListener('click', async () => {
    // Llamamos a tu función del preload que abre el diálogo nativo
    const ruta = await window.electronAPI.abrirDialogoArchivo();

    if (ruta) {
        rutaLibroSeleccionado = ruta; // Guardamos la ruta válida

        // --- Feedback Visual (Tu estética) ---
        btnSeleccionar.textContent = "¡EPUB Cargado!";
        btnSeleccionar.style.backgroundColor = "#2ecc71"; 
        btnSeleccionar.style.borderColor = "#27ae60";

    }
});

// 2. MANEJO DE ETIQUETAS
document.getElementById('grid_etiquetas').addEventListener('click', (e) => {
    etiquetasSeleccionadas = LIB.manejarSeleccionEtiqueta(e, etiquetasSeleccionadas, Sound);
});

// 3. BOTÓN GUARDAR
document.getElementById('btn_add_book').addEventListener('click', async () => {
    const inputNombre = document.getElementById('nombre_libro_input');
    const nombre = inputNombre.value.trim();

    if (!nombre || !rutaLibroSeleccionado) {
        UI.abrirAlerta("Falta el nombre o el archivo del libro.");
        return;
    }

    const paqueteLibro = {
        nombre: nombre,
        ruta: rutaLibroSeleccionado,     
        portadaRuta: rutaPortadaNueva,   
        etiquetas: etiquetasSeleccionadas
    };
    console.log("Enviando libro:", paqueteLibro); 

    try {
        const resultado = await window.electronAPI.guardarLibro(paqueteLibro);

        if (resultado && resultado.success) {
            UI.abrirAlerta("Libro añadido correctamente.");
            
            // Limpieza visual
            UI.resetearFormularioAñadir(ventanaAñadirLibro, inputNombre);
            
            // Resetear variables globales
            rutaLibroSeleccionado = null;
            rutaPortadaNueva = null; 
            etiquetasSeleccionadas = [];

            // Resetear botones
            const btnLibro = document.getElementById('sel_archivo_libro');
            btnLibro.textContent = "Seleccionar EPUB";
            btnLibro.style.backgroundColor = "";
            btnLibro.style.borderColor = "";

            const btnPortada = document.getElementById('sel_portada_libro');
            btnPortada.textContent = "Seleccionar Portada (Opcional)";
            btnPortada.style.backgroundColor = "";
            btnPortada.style.borderColor = "";
            btnPortada.style.color = "";

            // Actualizar biblioteca
            await LIB.actualizarBiblioteca();
        } else {
            UI.abrirAlerta("Error al guardar: " + (resultado.error || "Desconocido"));
        }
    } catch (error) {
        console.error(error);
        UI.abrirAlerta("Error de comunicación: " + error.message);
    }
});

const btnSelPortada = document.getElementById('sel_portada_libro');

// 1. Evento Click: Abre la ventana nativa de Windows (no un input web)
btnSelPortada.addEventListener('click', async () => {
    // Llamamos a la función que creamos para filtrar solo imágenes
    const ruta = await window.electronAPI.seleccionarPortada();
    
    if (ruta) {
        rutaPortadaNueva = ruta; // Guardamos la ruta en la variable global

        // 2. Feedback Visual: Igual que el botón del EPUB
        btnSelPortada.textContent = "¡Portada Cargada!";
        btnSelPortada.style.backgroundColor = "#2ecc71"; // Verde
        btnSelPortada.style.borderColor = "#27ae60";
        btnSelPortada.style.color = "white";
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
      libro_seleccionado = {
        id: tarjeta.dataset.id, 
        archivo: tarjeta.dataset.archivo
      };
      LIB.mostrarMenuContextual(e, menuContextual, tarjeta);
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
    const exito = await window.electronAPI.cambiarNombreLibro(libro_seleccionado.id, nuevoNombre);
    if (exito.success) {
      await LIB.actualizarBiblioteca();
      UI.ocultarOverlay();
      modalCambiarNombre.classList.remove('mostrar');
    }
  });
if (btn_cambiar_portada){
  btn_cambiar_portada.addEventListener('click', async () => {
    const rutaElegida = await window.electronAPI.seleccionarPortada()
    if (rutaElegida) {
      await window.electronAPI.cambiarPortada({id: libro_seleccionado.id, nuevaPortada: rutaElegida})
      await LIB.actualizarBiblioteca()
      UI.ocultarOverlay()
    }



  });
}

  // ==========================================
  // 8. ELEMENTOS GENERALES
  // ==========================================
  
  

  

// Detectamos el click en el contenedor oscuro
modalTransicion.addEventListener('click', (e) => {
    // Si el usuario pulsa en el FONDO (modalTransicion) y NO en la portada
    if (e.target === modalTransicion) {
        
        // 1. Ocultamos la animación
        modalTransicion.classList.remove('mostrar');
        
        // 2. Quitamos el blur del fondo
        UI.ocultarOverlay();
        
        // 3. Reseteamos la selección
        libro_seleccionado = null; 
    }
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

document.addEventListener('click', (e) => {
    // 1. Detectamos si se ha pulsado UN botón de cerrar (o un icono dentro de él)
    const botonCerrar = e.target.closest('.btn-cerrar-general');

    if (botonCerrar) {
        // 2. Buscamos la modal específica que contiene a ESE botón
        const modalAbierta = botonCerrar.closest('.mostrar');
        
        if (modalAbierta) {
            // 3. BUCLE PARA VACIAR TODOS LOS INPUTS:
            // Buscamos todos los inputs SOLO dentro de esta modal
            const todosLosInputs = modalAbierta.querySelectorAll('input');
            
            // Recorremos cada uno y lo vaciamos
            todosLosInputs.forEach(input => {
                input.value = '';
            });

            // 4. Cerramos solo esta modal
            modalAbierta.classList.remove('mostrar');
            UI.ocultarOverlay();
        }
    }
});
});









  




