let etiquetas_filtro_seleccionadas = [];
let nombre_filtro_texto = "";

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
    let librosfiltrados;
    if (etiquetas_filtro_seleccionadas.length === 0) {
        
        
        librosfiltrados = libros.filter(libro => 
        libro.nombre.toLowerCase().includes(nombre_filtro_texto)
    );

    } else {
        // Caso B: SÍ hay filtros de etiquetas.
        librosfiltrados = libros.filter(libro => {
            
            // 1. Primera "Aduana": El NOMBRE
            // Comprobamos si el buscador coincide con el título
            const coincideNombre = libro.nombre.toLowerCase().includes(nombre_filtro_texto);

            // 2. Segunda "Aduana": Las ETIQUETAS
            // Protección básica
            if (!libro.etiquetas || !Array.isArray(libro.etiquetas)) return false; 

            // Guardamos el resultado del filtro de etiquetas en una variable
            const coincideEtiquetas = libro.etiquetas.some(tagLibro => {
                const tagLimpia = tagLibro.trim().toLowerCase();

                return etiquetas_filtro_seleccionadas.some(filtro => 
                    filtro.trim().toLowerCase() === tagLimpia
                );
            });

            // 3. LA UNIÓN: Solo si cumple las DOS condiciones, el libro pasa
            return coincideNombre && coincideEtiquetas;
        });
    }

    librosfiltrados.forEach(libro => {
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
         
        `;
    
        grid.appendChild(tarjeta);
    });
}

export function manejarSeleccionEtiqueta(e, nombreEtiqueta, etiquetasSeleccionadas) {
    // Copia el array para trabajar seguros
    let nuevasEtiquetas = [...etiquetasSeleccionadas];

    // Comprueba si la etiqueta YA estaba seleccionada
    if (nuevasEtiquetas.includes(nombreEtiqueta)) {
        
        // CASO QUITAR: La borra del array y quita la clase CSS
        nuevasEtiquetas = nuevasEtiquetas.filter(et => et !== nombreEtiqueta);
        e.target.classList.remove('seleccionada');

    } else {
        
        // CASO AÑADIR: La metemos en el array y pone la clase CSS
        nuevasEtiquetas.push(nombreEtiqueta);
        e.target.classList.add('seleccionada');
    }
    
    return nuevasEtiquetas;
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
        
        // --- AQUÍ ESTÁ EL CLICK CORREGIDO ---
        span.addEventListener('click', (e) => {

            // Si es el panel de la biblioteca...
            if (contenedorId === '#panel_filtro_etiquetas') {
                // 1. Gestionamos la selección (visual y datos)
                etiquetas_filtro_seleccionadas = manejarSeleccionEtiqueta(e, nombre, etiquetas_filtro_seleccionadas);
                // 2. Recargamos la rejilla con el filtro aplicado
                actualizarBiblioteca();

            } 
        });
        
    });
}

export function limpiarFiltros() {
    // 1. Vaciar el array de memoria
    etiquetas_filtro_seleccionadas = [];

    // 2. Quitar visualmente la clase 'seleccionada' de los botones (si existen)
    const contenedor = document.querySelector('#panel_filtro_etiquetas');
    if (contenedor) {
        const etiquetas = contenedor.querySelectorAll('.etiqueta');
        etiquetas.forEach(span => span.classList.remove('seleccionada'));
    }

    // 3. Recargar la biblioteca para que muestre TODOS los libros de nuevo
    actualizarBiblioteca();
    
    console.log("Filtros reseteados correctamente.");
}

export function filtrar_por_nombre(texto_recibido) {
    // 1. Guardamos el texto que nos llega en nuestra variable global
    nombre_filtro_texto = texto_recibido;

    // 2. Ejecutamos la función que ya tienes para actualizar la pantalla
    actualizarBiblioteca();
}