// scripts/sound_scripts.js

const VOLUMEN_EFFECTS_KEY = 'volumen_efectos';
const VOLUMEN_MUSICA_KEY = 'user-volume';
const reproductor = document.getElementById('musica_fondo');
const sliderMusica = document.getElementById('slider_musica');
let datosPlaylistActiva = null;
let ultimoSonidoTime = 0;
const COOLDOWN_SONIDO = 300;

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
    if (!datosPlaylistActiva || datosPlaylistActiva.canciones.length === 0) return;
    
    indiceActual = indice;
    const cancion = datosPlaylistActiva.canciones[indice];
    
    // Pasamos la carpeta Y el archivo al Main
    const ruta = await window.electronAPI.obtenerRutaAudio(datosPlaylistActiva.folderPath, cancion.archivo);
    
    const rutaWeb = ruta.replace(/\\/g, '/');
    console.log("Ruta cargada:", rutaWeb)
    reproductor.src = `file://${rutaWeb}`;
    
    // Actualizamos el nombre en el span (eti-musica) usando el titulo limpio
    const etiquetaMusica = document.querySelector('.eti-musica');
    if (etiquetaMusica) {
        etiquetaMusica.textContent = `Canción actual: ${cancion.titulo}`;
    }
    
    reproductor.play().catch(e => console.warn("Esperando interacción..."));
}

if (reproductor) {
    reproductor.addEventListener('ended', () => {
        indiceActual = (indiceActual + 1) % cancionesPlaylist.length;
        cargarYCancion(indiceActual);
    });
}

export async function reproducirPlaylist(nombre_playlist) {
    try {
        datosPlaylistActiva = await window.electronAPI.obtenerPlaylist(nombre_playlist);
        
        if (datosPlaylistActiva && datosPlaylistActiva.canciones.length > 0) {
            // Sincronizamos cancionesPlaylist con las canciones recibidas
            cancionesPlaylist = datosPlaylistActiva.canciones; 
            cargarYCancion(0);
        }
    } catch (e) { console.error(e); }
}

export async function sonido_efecto(nombre_efecto) {
    const ahora = Date.now();

    // Si no ha pasado suficiente tiempo, ignoramos la petición
    if (ahora - ultimoSonidoTime < COOLDOWN_SONIDO) {
        return; 
    }

    // Actualizamos el tiempo del último sonido
    ultimoSonidoTime = ahora;

    try {
        const ruta_final_efectos = await window.electronAPI.obtenerRutaEfectos(nombre_efecto);
        const efecto = new Audio(ruta_final_efectos);
        efecto.volume = volumen_efectos;
        efecto.play();
    } catch (e) {
        console.error("Error al reproducir efecto:", e);
    }
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
export function btn_efecto_hover () {
    const boton_efecto = document.querySelectorAll('.btn_efecto');
    boton_efecto.forEach(boton => {
        boton.addEventListener('mouseenter', () => {
            sonido_efecto('efecto_sobre_boton');

        }); 
    
    });
}

