// scripts/library_scripts.js

export async function actualizarBiblioteca() {
    const grid = document.getElementById('grid_der_biblio');
    if (!grid) return;
    grid.innerHTML = '';
    
    // 1. Pedimos las carpetas y los libros
    // IMPORTANTE: Aquí usamos 'getBooksFolders' que es como lo tienes en preload.js
    const [rutas, libros] = await Promise.all([
        window.electronAPI.getBooksFolders(), 
        window.electronAPI.obtenerLibros()
    ]);
    
    const carpetaCovers = rutas.coversPath;

    libros.forEach(libro => {
    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-libro');
    
    tarjeta.dataset.id = libro.id; 
    tarjeta.dataset.archivo = libro.archivo;
    
    // 2. LÓGICA DE LA PORTADA (MEJORADA)
    let estiloPortada = ''; 
    let claseExtra = 'portada-default'; // Asumimos por defecto que NO hay foto
    
    if (libro.portada) {
        // Si hay foto: Construimos ruta, ponemos estilo y QUITAMOS la clase default
        const rutaImagen = `file://${carpetaCovers}/${libro.portada}`.replace(/\\/g, '/');
        estiloPortada = `style="background-image: url('${rutaImagen}');"`;
        claseExtra = ''; // Al quitar esta clase, ya no saldrá la imagen de Harry Potter
    }

    // 3. Renderizamos
    const etiquetasHTML = libro.etiquetas && libro.etiquetas.length > 0 
        ? `<div class="etiquetas-mini">${libro.etiquetas.join(', ')}</div>` 
        : '';

    tarjeta.innerHTML = `
        <div class="portada ${claseExtra}" ${estiloPortada}></div>
        <div class="nombre-libro">${libro.nombre}</div>
        ${etiquetasHTML}
    `;
    
    grid.appendChild(tarjeta);
});
}

export function manejarSeleccionEtiqueta(e, etiquetasSeleccionadas, Sound) {
    if (e.target.classList.contains('etiqueta')) {
        const nombreEtiqueta = e.target.textContent;
        let nuevasEtiquetas = [...etiquetasSeleccionadas];

        if (!nuevasEtiquetas.includes(nombreEtiqueta)) {
            nuevasEtiquetas.push(nombreEtiqueta);
            e.target.classList.add('seleccionada');
        } else {
            nuevasEtiquetas = nuevasEtiquetas.filter(et => et !== nombreEtiqueta);
            e.target.classList.remove('seleccionada');
        }
        
        if (Sound) Sound.sonido_efecto('efecto_sobre_boton');
        return nuevasEtiquetas;
    }
    return etiquetasSeleccionadas;
}

export function mostrarMenuContextual(e, menu, tarjeta) {
    if (tarjeta) {
        menu.style.top = `${e.pageY}px`;
        menu.style.left = `${e.pageX}px`;
        menu.classList.add('visible');
        return tarjeta.dataset.id; 
    } else {
        menu.classList.remove('visible');
        return null;
    }
}



export function cargarEtiquetasDisponibles(contenedorId) {
    const contenedor = document.querySelector(contenedorId);
    if (!contenedor) return;
    
    // Lista de tus etiquetas
    const misEtiquetas = ["Fantasía", "Ciencia Ficción", "Terror", "Aventura", "Romance", "Magia", "Dark Romance", "Misterio", 
                            "Medieval", "Drama", "Didáctico", "Historia", "Novela"];
    
    contenedor.innerHTML = ''; // Limpiar antes de cargar
    misEtiquetas.forEach(nombre => {
        const span = document.createElement('span');
        span.classList.add('etiqueta');
        span.textContent = nombre;
        contenedor.appendChild(span);
    });
}