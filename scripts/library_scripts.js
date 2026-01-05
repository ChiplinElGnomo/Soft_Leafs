// scripts/library_scripts.js

export async function actualizarBiblioteca() {
    const grid = document.getElementById('grid_der_biblio');
    if (!grid) return;
    grid.innerHTML = '';
    
    const libros = await window.electronAPI.obtenerLibros(); //
    libros.forEach(libro => {
        const tarjeta = document.createElement('div');
        tarjeta.classList.add('tarjeta-libro');
        
        // --- CAMBIO CLAVE: Guardamos el ID de la base de datos ---
        tarjeta.dataset.id = libro.id; 
        tarjeta.dataset.archivo = libro.archivo;
        
        // Opcional: Mostrar etiquetas en la tarjeta
        const etiquetasHTML = libro.etiquetas.length > 0 
            ? `<div class="etiquetas-mini">${libro.etiquetas.join(', ')}</div>` 
            : '';

        tarjeta.innerHTML = `
            <div class="portada"></div>
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

export async function confirmarCambioNombre(libro_id, nuevoNombre, modal, input) {
    if (libro_id && nuevoNombre) {
        if (nuevoNombre.length > 40) { 
            alert('El nombre es demasiado largo.');
            return false;
        }
        
        const resultado = await window.electronAPI.cambiarNombreLibro(libro_id, nuevoNombre);
        if (resultado.success) {
            modal.classList.remove('mostrar');
            input.value = '';
            return true;
        }
    }
    return false;
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