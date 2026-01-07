// scripts/sound_scripts.js

const VOLUMEN_EFFECTS_KEY = 'volumen_efectos';
const VOLUMEN_MUSICA_KEY = 'user-volume';
const reproductor = document.getElementById('musica_fondo');
let cancionesPlaylist = [];
let indiceActual = 0;
export let volumen_efectos = 0.2;

export function obtenerVolumenMusicaInicial() {
    const guardado = localStorage.getItem(VOLUMEN_MUSICA_KEY);
    const volumen = guardado !== null ? parseFloat(guardado) : 0.5;
    if (reproductor) {
        reproductor.volume = volumen;
    }
    return volumen;
}

export function actualizarVolumenMusica(nuevoValor) {
    if (reproductor) {
        reproductor.volume = nuevoValor;
    }
    localStorage.setItem(VOLUMEN_MUSICA_KEY, nuevoValor);
}

async function cargarYCancion(indice) {
    indiceActual = indice;
    const cancion = cancionesPlaylist[indice];
    
    // 1. Obtenemos la ruta del sistema (vendrá con barras invertidas en Windows)
    const ruta = await window.electronAPI.obtenerRutaAudio(cancion.archivo_cancion);
    
    // 2. CORRECCIÓN: Reemplazamos \ por / para que el navegador lo entienda
    const rutaWeb = ruta.replace(/\\/g, '/');
    
    // 3. Asignamos el src directamente
    reproductor.src = `file://${rutaWeb}`;
    
    // Actualizar UI
    const sliderVolumen = document.getElementById('volumen_musica');
    if (sliderVolumen) reproductor.volume = sliderVolumen.value;

    const etiquetaMusica = document.querySelector('.eti-musica');
    if (etiquetaMusica) etiquetaMusica.textContent = `Canción actual: ${cancion.titulo}`;
    
    // 4. Intentar reproducir
    reproductor.play().catch((err) => {
        console.warn("Autoplay bloqueado, esperando interacción...", err);
        // Si el navegador bloquea el autoplay, esperamos al primer clic del usuario
        document.addEventListener('click', () => {
            reproductor.play().catch(e => console.error("Error al reproducir:", e));
        }, { once: true });
    });
}

if (reproductor) {
    reproductor.addEventListener('ended', () => {
        indiceActual = (indiceActual + 1) % cancionesPlaylist.length;
        cargarYCancion(indiceActual);
    });
}

export async function reproducirPlaylist(nombre_playlist) {
    try {
        const playlist = await window.electronAPI.obtenerPlaylist(nombre_playlist);
        cancionesPlaylist = playlist.canciones;
        if (cancionesPlaylist.length > 0) cargarYCancion(0);
    } catch (e) { console.error(e); }
}

export async function sonido_efecto(nombre_efecto) {
    const ruta_final_efectos = await window.electronAPI.obtenerRutaEfectos(nombre_efecto);
    const efecto = new Audio(ruta_final_efectos);
    efecto.volume = volumen_efectos;
    efecto.play();
}

export function obtenerVolumenEfectosInicial() {
    const guardado = localStorage.getItem('volumen_efectos');
    if (guardado !== null) {
        volumen_efectos = parseFloat(guardado);
    }
    return volumen_efectos;
}

export function actualizarVolumenEfectos(nuevoValor) {
    volumen_efectos = nuevoValor;
    localStorage.setItem('volumen_efectos', nuevoValor);
}

