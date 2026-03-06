const fs = require('fs');
const path = require('path');

// Configuración de rutas
const RUTA_SONGS = path.join(__dirname, '../assets/music/songs');
const RUTA_CUSTOM = path.join(RUTA_SONGS, 'custom');
const ARCHIVO_DB = path.join(__dirname, '../config/playlists-db.json');

/**
 * 1. Limpieza física: Renombra archivos con espacios a guiones.
 * Ahora acepta tanto .opus como .mp3
 */
function normalizarArchivosEnDisco(directorio) {
    if (!fs.existsSync(directorio)) return [];

    const archivos = fs.readdirSync(directorio);
    
    archivos.forEach(nombreOriginal => {
        // Solo procesamos archivos de audio permitidos
        if (nombreOriginal.endsWith('.opus') || nombreOriginal.endsWith('.mp3')) {
            if (/\s/g.test(nombreOriginal)) {
                const nuevoNombre = nombreOriginal.replace(/\s+/g, '-');
                const rutaVieja = path.join(directorio, nombreOriginal);
                const rutaNueva = path.join(directorio, nuevoNombre);
                
                try {
                    if (!fs.existsSync(rutaNueva)) {
                        fs.renameSync(rutaVieja, rutaNueva);
                    }
                } catch (err) {
                    console.error(`Error al renombrar: ${nombreOriginal}`, err);
                }
            }
        }
    });

    // Devolvemos la lista filtrada por ambas extensiones
    return fs.readdirSync(directorio)
        .filter(f => f.endsWith('.opus') || f.endsWith('.mp3'))
        .sort();
}

function actualizarSoloCustom() {
    console.log('--- Actualizando Playlist Custom (MP3/OPUS) ---');

    if (!fs.existsSync(RUTA_CUSTOM)) {
        fs.mkdirSync(RUTA_CUSTOM, { recursive: true });
    }

    const archivosLimpios = normalizarArchivosEnDisco(RUTA_CUSTOM);

    let db = { playlists: [] };
    if (fs.existsSync(ARCHIVO_DB)) {
        try {
            db = JSON.parse(fs.readFileSync(ARCHIVO_DB, 'utf-8'));
        } catch (e) {
            console.error("Error leyendo la DB.");
        }
    }

    const nuevaPlaylistCustom = {
        id: 'custom',
        titulo: 'Mi Música Custom',
        folderPath: 'assets/music/songs/custom',
        canciones: archivosLimpios.map(archivo => {
            // Eliminamos la extensión dinámicamente (.mp3 o .opus)
            const nombreSinExtension = archivo.replace(/\.(mp3|opus)$/i, '');
            
            return {
                titulo: nombreSinExtension.replace(/[_-]/g, ' '),
                archivo: archivo,
                rutaFull: 'assets/music/songs/custom/' + archivo
            };
        })
    };

    const index = db.playlists.findIndex(p => p.id === 'custom');
    if (index !== -1) {
        db.playlists[index] = nuevaPlaylistCustom;
    } else {
        db.playlists.push(nuevaPlaylistCustom);
    }

    try {
        fs.writeFileSync(ARCHIVO_DB, JSON.stringify(db, null, 2));
        console.log(`¡Éxito! Indexadas ${archivosLimpios.length} canciones.`);
    } catch (error) {
        console.error('Error al guardar la DB:', error);
    }
}

actualizarSoloCustom();