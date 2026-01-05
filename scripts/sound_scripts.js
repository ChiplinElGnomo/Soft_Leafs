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
    const ruta = await window.electronAPI.obtenerRutaAudio(cancion.archivo_cancion);
    
    reproductor.src = new URL(`file://${ruta}`).href;
    
    const sliderVolumen = document.getElementById('volumen_musica');
    if (sliderVolumen) reproductor.volume = sliderVolumen.value;

    const etiquetaMusica = document.querySelector('.eti-musica');
    if (etiquetaMusica) etiquetaMusica.textContent = `Canción actual: ${cancion.titulo}`;
    
    reproductor.play().catch(() => {
        document.addEventListener('click', () => reproductor.play(), { once: true });
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

