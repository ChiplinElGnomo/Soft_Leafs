export function mostrarOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('mostrar');
}

export function ocultarOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('mostrar');
}

export function abrirAlerta(mensaje) {
    const modalAlerta = document.getElementById('modal_alerta');
    const textoAlerta = document.getElementById('texto_alerta');

    if (modalAlerta && textoAlerta) {
        textoAlerta.textContent = mensaje;
        mostrarOverlay();
        modalAlerta.classList.add('mostrar');
        const btnCerrar = document.getElementById('btn_cerrar_alerta');
        if (btnCerrar) btnCerrar.focus();
    }
}

export function resetearFormularioAñadir(ventanaAñadirLibro, nombreInput, spanNombreArchivo) {
    if (ventanaAñadirLibro) ventanaAñadirLibro.classList.remove('mostrar');
    ocultarOverlay();
    if (nombreInput) nombreInput.value = '';
    if (spanNombreArchivo) spanNombreArchivo.textContent = '';
    
    document.querySelectorAll('.etiqueta').forEach(el => {
        el.classList.remove('seleccionada');
    });
    
    document.activeElement.blur();
}