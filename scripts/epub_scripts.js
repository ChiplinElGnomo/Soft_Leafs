export async function abrirLector(rutaCompleta, modalLectorReal, visor, Sound) {
    modalLectorReal.style.display = "flex";
    visor.innerHTML = "";
    
    // Cargamos el libro desde la ruta que nos da el Main
    const libroActual = ePub(rutaCompleta);
    
    // RESTAURADO: He vuelto a poner los parámetros exactos de tu código original
    // para que el motor de ePub.js no intente adivinar el tamaño.
    const rendition = libroActual.renderTo("visorEPUB", {
        width: "100%", 
        height: "100%", 
        spread: "always", 
        flow: "paginated"
    });

    try {
        await rendition.display();
    } catch (error) {
        console.error("Error al mostrar el libro:", error);
    }

    return { rendition, libroActual };
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