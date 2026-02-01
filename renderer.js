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
  const modalBienvenida = document.getElementById('modal_bienvenida');
  const btnCerrarBienve = document.getElementById('btn_cerrar_bienvenida');

  const ventana_Opciones = document.getElementById('ventanaOpciones');
  const ventanaBiblio = document.getElementById('ventanaBiblio');
  const ventanaAñadirLibro = document.getElementById('ventana_añadir_libro');
  const modalLectorReal = document.getElementById("libro_abierto");
  const visor = document.getElementById("visorEPUB");
  const btn_cambiar_portada = document.getElementById("opcion_portada")
  const btnSelPortada = document.getElementById('sel_portada_libro');
  
  const modalTransicion = document.getElementById('modal-transicion');
  const libroAnimado = document.getElementById('libro-animado');
  const portadaDinamica = document.getElementById('portada-dinamica');
  const filtro_texto = document.getElementById('nombre_libro_filtro');
  let rutaNuevoLibro = null; 
  let rutaPortadaNueva = null;

  let libroActual = null;
  let libro_seleccionado = null;
  let renditionActual = null;
  let lectorActivo = false;
  
  let etiquetasSeleccionadas = [];

  // ==========================================
  // 2. INICIALIZACIÓN
  // ==========================================
  
  LIB.actualizarBiblioteca();
  LIB.cargarEtiquetasDisponibles('#panel_filtro_etiquetas');
  Sound.reproducirPlaylist('cozy');

  // ==========================================
  // 3. GESTIÓN DE MÚSICA
  // ==========================================
  
  

  sliderVolumen.value = Sound.obtenerVolumenMusicaInicial();

  sliderVolumen.addEventListener('input', (e) => {
    Sound.actualizarVolumenMusica(e.target.value);
  });

  sliderEfectos.value = Sound.obtenerVolumenEfectosInicial();

  sliderEfectos.addEventListener('input', (e) => {
    Sound.actualizarVolumenEfectos(e.target.value);
  });

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
                libro_seleccionado.id,
                rutaCompleta, // Ahora enviamos la ruta real (C:\Users\...)
                modalLectorReal, 
                visor
            );
            
            renditionActual = resultado.renditionActual;
            libroActual = resultado.libroActual;
            lectorActivo = true;

            modalTransicion.classList.remove('mostrar', 'abierto');
        } catch (error) {
            console.error("Error al obtener ruta o abrir EPUB:", error);
        }
    }, 1000); 
  });

  document.addEventListener('keydown', (e) => {
    if (lectorActivo && renditionActual) {
      EPUB.manejarTeclado(e, lectorActivo, renditionActual, Sound);
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
        btnSeleccionar.style.backgroundColor = "#73e3c5"; 
        btnSeleccionar.style.borderColor = "#27c79c";

    }
  });

  // 2. MANEJO DE ETIQUETAS
  document.getElementById('grid_etiquetas').addEventListener('click', (e) => {
    const tagElement = e.target.closest('.etiqueta');
    if (!tagElement) return;

    // USAMOS .trim() para limpiar espacios que rompen etiquetas como Novela o Misterio
    const nombre = tagElement.textContent.trim();

    // IMPORTANTE: Asegúrate de que el orden sea (evento, nombre, array)
    etiquetasSeleccionadas = LIB.manejarSeleccionEtiqueta(e, nombre, etiquetasSeleccionadas);
    
    if (Sound) Sound.sonido_efecto('efecto_sobre_boton');
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




  btnSelPortada.addEventListener('click', async () => {
    // Llamamos a la función que creamos para filtrar solo imágenes
    const ruta = await window.electronAPI.seleccionarPortada();
    
    if (ruta) {
        rutaPortadaNueva = ruta; // Guardamos la ruta en la variable global

        // 2. Feedback Visual: Igual que el botón del EPUB
        btnSelPortada.textContent = "¡Portada Cargada!";
        btnSelPortada.style.backgroundColor = "#73e3c5"; // Verde
        btnSelPortada.style.borderColor = "#27c79c";
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
    
    const idReal = libro_seleccionado.id; 
    const resultado = await window.electronAPI.eliminarLibro(idReal);
    
    if (resultado.success) {
        LIB.actualizarBiblioteca(); 
        UI.ocultarOverlay();
        modalConfirmacion.classList.remove('mostrar');
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

  const botonesOpciones = document.querySelectorAll('.btn_seccion');
  const seccionesOpciones = document.querySelectorAll('.seccion_opciones');

  botonesOpciones.forEach(boton => {
    boton.addEventListener('click', (e) => {
      // 1. Ocultamos todas las secciones primero
      seccionesOpciones.forEach(seccion => seccion.classList.remove('mostrar'));

      // 2. Leemos qué sección quiere abrir este botón
      // (Tu HTML usa: data-seccion_opciones="seccion_sonido", etc.)
      const idDestino = e.target.dataset.seccion_opciones; 
      const divDestino = document.getElementById(idDestino);

      // 3. Si existe esa sección, le añadimos la clase 'mostrar'
      if (divDestino) {
        divDestino.classList.add('mostrar');
      }
    });
  });

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
  document.getElementById('btnBiblio').addEventListener('click', () => ventanaBiblio.classList.add('mostrar'));
  Sound.btn_efecto_hover();
  
  document.getElementById('cerrarLector').addEventListener('click', async () => {
    // Llamamos a la función y ella se encarga de todo, incluso de la DB
    lectorActivo = await EPUB.cerrarLector(modalLectorReal, visor, UI, ventanaBiblio, modalTransicion);
    renditionActual = null;
  });

  document.addEventListener('click', (e) => {
    const botonCerrar = e.target.closest('.btn-cerrar-general');

    if (botonCerrar) {
        const modalAbierta = botonCerrar.closest('.mostrar');
        
        if (modalAbierta) {
            const todosLosInputs = modalAbierta.querySelectorAll('input');
            
            todosLosInputs.forEach(input => {
                // MODIFICACIÓN: Solo vaciamos si NO es un slider
                if (input.type !== 'range') {
                    input.value = '';
                }
            });

            LIB.limpiarFiltros();
            modalAbierta.classList.remove('mostrar');
            UI.ocultarOverlay();
        }
    }
  });

  filtro_texto.addEventListener('input', (e, valor_filtro_texto) => {
   valor_filtro_texto = e.target.value.toLowerCase().trim();
   LIB.filtrar_por_nombre(valor_filtro_texto)
  });

  window.electronAPI.mostrarBienvenida(() => {
    // Asegúrate de que el selector sea el correcto
    
    if (modalBienvenida) {
        modalBienvenida.classList.add('mostrar');
    }
  });
  if (btnCerrarBienve) {
    btnCerrarBienve.addEventListener('click', () => {
        
        modalBienvenida.classList.remove('mostrar');
        
        // Llamamos a la función del puente
        window.electronAPI.marcarBienvenida();
    });
  }
  setTimeout(() => {
        Sound.reproducirPlaylist('fantasia');
    }, 100);
});











  




