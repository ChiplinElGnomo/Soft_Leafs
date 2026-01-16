export async function abrirLector(rutaCompleta, modalLectorReal, visor) {
    modalLectorReal.style.display = "flex";
    visor.innerHTML = "";
    
    const libroActual = ePub(rutaCompleta);
    
    const rendition = libroActual.renderTo("visorEPUB", {
        width: "100%", 
        height: "100%", 
        spread: "always", 
        flow: "paginated"
    });

    rendition.hooks.content.register((contents) => {
        contents.addStylesheetRules({
            'h1, h2': { 
                'break-before': 'page !important', 
                'page-break-before': 'always !important',
                'margin-top': '0 !important',
                'padding-top': '10px !important'
            }
        });
    });

    rendition.on('keydown', (e) => {
        const evento = new KeyboardEvent('keydown', {
            key: e.key, code: e.code, keyCode: e.keyCode, bubbles: true, cancelable: true
        });
        document.dispatchEvent(evento);
    });

    try {
        // 1. Primero mostramos el libro
        await rendition.display();

        // 2. Configuramos el evento de reubicación para que actualice los números siempre
        rendition.on('relocated', () => {
            actualizarNumerosSeparados(libroActual, rendition);
        });

        // 3. Generamos las ubicaciones. 
        // Usamos 512 caracteres: es el equilibrio perfecto para detectar saltos de capítulo
        libroActual.ready.then(() => {
            return libroActual.locations.generate(512); 
        }).then(() => {
            // Damos un pequeño margen para que el motor asiente el CSS de los H1
            setTimeout(() => {
                actualizarNumerosSeparados(libroActual, rendition);
            }, 200);
        });

    } catch (error) {
        console.error("Error al mostrar el libro:", error);
    }

    return { rendition, libroActual };
}

function actualizarNumerosSeparados(book, rendition) {
    const lblIzq = document.getElementById('pag-izq');
    const lblDer = document.getElementById('pag-der');
    if (!lblIzq || !lblDer) return;

    const location = rendition.currentLocation();
    
    // Si las ubicaciones no están listas, no intentamos calcular
    if (!location || !location.start || book.locations.length() <= 0) {
        lblIzq.innerText = "...";
        lblDer.innerText = "...";
        return;
    }

    // Obtenemos el número de página basado en el índice de locations
    const indicePagina = book.locations.locationFromCfi(location.start.cfi);
    const total = book.locations.total();

    let numIzq = indicePagina + 1;
    let numDer = numIzq + 1;

    // Actualizar página izquierda
    lblIzq.innerText = numIzq;

    // Lógica para la página derecha
    if (numDer > total || numIzq >= total) {
        // Si es la última página, ocultamos la burbuja derecha
        lblDer.parentElement.style.opacity = "0";
    } else {
        lblDer.parentElement.style.opacity = "1";
        lblDer.parentElement.style.display = "flex";
        lblDer.innerText = numDer;
    }
}

export function manejarTeclado(event, lectorActivo, rendition, Sound) {
    if (!lectorActivo || !rendition) return;
    
    if (event.code === "ArrowRight" || event.key === "ArrowRight") {
        rendition.next();
        if (Sound) Sound.sonido_efecto('efecto_pagina');
        event.preventDefault(); 
    }
    if (event.code === "ArrowLeft" || event.key === "ArrowLeft") {
        rendition.prev();
        if (Sound) Sound.sonido_efecto('efecto_pagina');
        event.preventDefault();
    }
}