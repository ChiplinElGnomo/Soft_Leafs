let contador_izq = 1;
let contador_der = 2;
let idLibroActual = null;
let renditionActual = null;
let subrayadoActivo = false;
let modoBorradoActivo = false;
let procesandoSeleccion = false;




export async function abrirLector(id, rutaCompleta, modalLectorReal, visor) {
    modalLectorReal.style.display = "flex";
    visor.innerHTML = "";
    const libroActual = ePub(rutaCompleta);
    idLibroActual = id;
    
    // Usamos siempre renditionActual (variable global)
    renditionActual = libroActual.renderTo("visorEPUB", {
        width: "100%", 
        height: "100%", 
        spread: "always", 
        flow: "paginated",
        allowScriptedContent: true
    });
    
    

    renditionActual.on('rendered', (section, contents) => {
    const doc = contents.document;
    

    // Escuchamos el momento en que el usuario SUELTA el ratón
    doc.addEventListener('mouseup', async () => {
    // Si no está activo el modo subrayado o ya hay un proceso en marcha, salimos
    // Nota: El modo borrado no usa mouseup, usa el click en la anotación (definido abajo)
    if (!subrayadoActivo || procesandoSeleccion) return;

    const seleccion = contents.window.getSelection();
    const textoSeleccionado = seleccion.toString().trim();

    if (textoSeleccionado.length > 2) {
        procesandoSeleccion = true; // Bloqueamos

        try {
            const range = seleccion.getRangeAt(0);
            const cfiRange = section.cfiFromRange(range);

            const subrayadosExistentes = await window.electronAPI.obtenerSubrayados(idLibroActual);
            
            // Comprobación de duplicados
            const yaExiste = subrayadosExistentes.some(s => 
                s.cfi === cfiRange || (s.texto === textoSeleccionado && textoSeleccionado.length > 5)
            );

            if (yaExiste) {
                console.log("Texto ya subrayado.");
                seleccion.removeAllRanges();
                return; 
            }

            // --- PINTAR Y GUARDAR ---
            // El cuarto parámetro de annotations.add es la función que se ejecuta al hacer CLIC
            renditionActual.annotations.add('highlight', cfiRange, {}, (e) => {
                // LÓGICA DE BORRADO
                if (modoBorradoActivo) {
                    // 1. Lo quitamos visualmente del libro
                    renditionActual.annotations.remove(cfiRange, 'highlight');
                    // 2. Lo borramos de la base de datos
                    window.electronAPI.borrarSubrayado(idLibroActual, cfiRange);
                    console.log("Subrayado eliminado:", cfiRange);
                }
            }, "hl", { fill: "#73e3c5", "fill-opacity": "0.5" });

            await window.electronAPI.guardarSubrayado({
                idLibroActual: idLibroActual,
                cfi: cfiRange,
                texto: textoSeleccionado,
                color: '#73e3c5'
            });

            seleccion.removeAllRanges();

        } catch (err) {
            console.error("Error en el proceso:", err);
        } finally {
            procesandoSeleccion = false; 
        }
        }
        });
    });


    renditionActual.themes.default({
        "p": {
            "font-size": "18px !important",
            "line-height": "1.5 !important",
            "font-family": "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important"
        }
    });
    

    renditionActual.on('keydown', (e) => {
        const evento = new KeyboardEvent('keydown', {
            key: e.key, code: e.code, keyCode: e.keyCode, bubbles: true, cancelable: true
        });
        document.dispatchEvent(evento);
    });

    try {
        // 1. Obtenemos el objeto completo de la DB
        const datos = await window.electronAPI.obtenerMarcadorPagina(id);
        
        // 2. Verificamos si hay datos guardados
        if (datos && datos.ultima_pag) {
            try {
                // Saltamos a la posición GPS (CFI)
                // Pasamos datos.ultima_pag que es el String del marcador
                await renditionActual.display(datos.ultima_pag);
                
                // Sincronizamos los contadores con el valor de la DB
                contador_izq = datos.numero_pagina || 1;
                contador_der = contador_izq + 1;
                
                console.log(`Recuperado: CFI ${datos.ultima_pag} y Página ${contador_izq}`);
            } catch (err) {
                console.warn("Marcador inválido, abriendo al inicio:", err);
                await renditionActual.display(); // Fallback: abrir al inicio
                contador_izq = 1;
                contador_der = 2;
            }
        } else {
            // Libro nuevo o sin progreso guardado
            await renditionActual.display();
            contador_izq = 1;
            contador_der = 2;
        }

        // 3. Pintamos los números en el visor
        actualizarPaginas();
        console.log("Solicitando subrayados a la DB para el libro:", id);
        const subrayadosGuardados = await window.electronAPI.obtenerSubrayados(id);
        
        if (subrayadosGuardados && subrayadosGuardados.length > 0) {
            subrayadosGuardados.forEach(s => {
            renditionActual.annotations.add('highlight', s.cfi, {}, (e) => {
            if (modoBorradoActivo) {
                renditionActual.annotations.remove(s.cfi, 'highlight');
                window.electronAPI.borrarSubrayado(idLibroActual, s.cfi);
            }
        }, "hl", { fill: s.color, "fill-opacity": "0.5" });
    });
            console.log(`${subrayadosGuardados.length} subrayados re-aplicados.`);
        }

    } catch (error) {
        console.error("Error crítico al cargar el libro:", error);
        if (renditionActual) await renditionActual.display();
    }

    return { renditionActual, libroActual };
}



export function manejarTeclado(event, lectorActivo, rendition, Sound) {
    if (!lectorActivo || !rendition) return;
    
    if (event.code === "ArrowRight" || event.key === "ArrowRight") {
        rendition.next();
        contador_izq += 2;
        contador_der += 2;
        actualizarPaginas();
        if (Sound) Sound.sonido_efecto('efecto_pagina');
        window.dispatchEvent(new CustomEvent("paginaCambiada", {
            detail: { timestamp: Date.now() / 1000 }
            
        }));
        event.preventDefault(); 
    }
    if (event.code === "ArrowLeft" || event.key === "ArrowLeft") {
        
        if (contador_izq > 1){
        rendition.prev();
        contador_izq -= 2;
        contador_der -= 2;
        actualizarPaginas();
        }
        if (Sound) Sound.sonido_efecto('efecto_pagina');
        event.preventDefault();
    }
}

export function actualizarPaginas() {

    const pag_izq = document.getElementById('pag-izq');
    const pag_der = document.getElementById('pag-der');

    if (pag_izq && pag_der) {
        pag_izq.innerText = contador_izq;
        pag_der.innerText = contador_der;

    }


}

export async function cerrarLector(modalLectorReal, visor, UI, ventanaBiblio, modalTransicion) {
    try {
        // Intentamos guardar SOLO si el objeto existe y está listo
        if (renditionActual && renditionActual.manager && idLibroActual) {
            const ubicacion = renditionActual.currentLocation();
            
            if (ubicacion && ubicacion.start) {
                const marcador = ubicacion.start.cfi;
                await window.electronAPI.guardarMarcadorPagina(idLibroActual, marcador, contador_izq);
                console.log("Progreso guardado antes de cerrar.");
            }
            
            renditionActual.destroy();
        }
    } catch (error) {
        console.warn("No se pudo guardar el progreso, cerrando igualmente:", error);
    } finally {
        // ESTO SE EJECUTA SIEMPRE: Limpieza visual obligatoria
        desactivarHerramientas();
        renditionActual = null;
        modalLectorReal.style.display = "none";
        visor.innerHTML = "";
        
        UI.ocultarOverlay();
        ventanaBiblio.classList.add('mostrar');
        modalTransicion.classList.remove('mostrar', 'abierto');
    }
    
    return false;
}

export function subrayadoOnOff() { //Esta funcion solamente es el interruptor del boton de subrallado.
    subrayadoActivo = !subrayadoActivo;
    return subrayadoActivo; 
}

export function borrarSubrayadoOnOff() {
    modoBorradoActivo = !modoBorradoActivo;
    return modoBorradoActivo;
}

export function getSubrayadoActivo() {
    return subrayadoActivo;
}

export function getModoBorrado() {
    return modoBorradoActivo;
}
export function desactivarHerramientas() {
    subrayadoActivo = false;
    modoBorradoActivo = false;
}



