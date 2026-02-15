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

window.addEventListener("actualizarBarra", (e) => {
    const barra = document.getElementById('barra_experiencia');
    const textoXP = document.getElementById('experiencia_texto'); // El elemento para los números
    
    // 1. Movimiento visual de la barra (Máximo 84% de ancho CSS)
    if (barra) {
        const anchoReal = e.detail.porcentaje * 0.84;
        barra.style.width = `${anchoReal}%`;
    }

    // 2. Mostrar XP actual y máxima (Formato: 40 / 1000)
    if (textoXP) {
        textoXP.textContent = `${e.detail.xp_actual} / ${e.detail.xp_max}`;
    }
    
    // Opcional: Actualizar el nivel si tienes un elemento para ello
    const nivelTexto = document.getElementById('contador_experiencia');
    if (nivelTexto) {
        nivelTexto.textContent = `Nivel ${e.detail.nivel}`;
    }
});

export async function actualizar_ultimo_libro() {
    // 1. SELECTORES
    const agrupador = document.getElementById('agrupador_seguir_leyendo');
    const btnLibro = document.getElementById('contenedor_marco_seguir_leyendo');
    const marcoFondo = document.getElementById('marco_seguir_leyendo');

    // 2. PETICIÓN DE DATOS
    const [ultimoLibro, rutas] = await Promise.all([
        window.electronAPI.obtenerUltimoLibro(),
        window.electronAPI.getBooksFolders()
    ]);

    // 3. LÓGICA DE VISIBILIDAD Y RENDERIZADO
    if (ultimoLibro) {
        agrupador.classList.remove('oculto');

        btnLibro.dataset.id = ultimoLibro.id;
        btnLibro.dataset.archivo = ultimoLibro.archivo;
        
        let rutaFinal; // Declaramos la variable aquí para usarla en ambos casos

        // C. Construimos y pintamos la portada
        if (ultimoLibro.portada) {
            // Si hay portada personalizada
            rutaFinal = `file:///${rutas.coversPath}/${ultimoLibro.portada}`.replace(/\\/g, '/');
        } else {
            // Si NO hay portada, usamos la de por defecto
            rutaFinal = 'assets/images/tarjeta_default.png';
        }

        // Aplicamos la imagen (ya sea la personalizada o la default)
        marcoFondo.style.backgroundImage = `url('${rutaFinal}')`;

    } else {
        agrupador.classList.add('oculto');
    }
}