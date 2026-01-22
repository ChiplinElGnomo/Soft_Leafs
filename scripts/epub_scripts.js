let contador_izq = 1;
let contador_der = 2;
let idLibroActual = null;
let renditionActual = null;



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
        flow: "paginated"
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

    } catch (error) {
        console.error("Error crítico al cargar el libro:", error);
        // Último intento de emergencia para no dejar la pantalla vacía
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
        renditionActual = null;
        modalLectorReal.style.display = "none";
        visor.innerHTML = "";
        
        UI.ocultarOverlay();
        ventanaBiblio.classList.add('mostrar');
        modalTransicion.classList.remove('mostrar', 'abierto');
    }
    
    return false;
}




