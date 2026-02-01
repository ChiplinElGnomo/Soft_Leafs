const fs = require('fs');
const path = require('path');

// Configuracion de rutas
// __dirname es la carpeta 'tools', subimos un nivel con '..' para llegar a la raiz
const RUTA_SONGS = path.join(__dirname, '../assets/music/songs');
const CARPETA_CONFIG = path.join(__dirname, '../config');
const ARCHIVO_SALIDA = path.join(CARPETA_CONFIG, 'playlists-db.json');

// Lista de playlists permitidas
const PLAYLISTS_PERMITIDAS = ['lofi', 'fantasia', 'relax', 'aventura', 'terror'];

function generarJSON() {
    console.log('Iniciando escaneo de directorios...');

    // Crear carpeta config si no existe
    if (!fs.existsSync(CARPETA_CONFIG)) {
        fs.mkdirSync(CARPETA_CONFIG);
        console.log('Carpeta config creada.');
    }

    const data = {
        playlists: PLAYLISTS_PERMITIDAS.map(nombre => {
            const carpetaCanciones = path.join(RUTA_SONGS, nombre);

            // Validacion de existencia de la carpeta de canciones
            if (!fs.existsSync(carpetaCanciones)) {
                console.warn('Advertencia: No se encontro la carpeta de canciones para: ' + nombre);
                return null;
            }

            // Lectura de archivos .opus
            const archivos = fs.readdirSync(carpetaCanciones)
                .filter(file => file.endsWith('.opus'))
                .sort();

            console.log('Playlist ' + nombre.toUpperCase() + ': ' + archivos.length + ' canciones encontradas.');

            return {
                id: nombre,
                titulo: nombre.charAt(0).toUpperCase() + nombre.slice(1),
                // Ruta relativa desde la raiz del proyecto para carga en Electron
                folderPath: 'assets/music/songs/' + nombre,
                canciones: archivos.map(archivo => ({
                    titulo: archivo.replace('.opus', '').replace(/_/g, ' '),
                    archivo: archivo,
                    rutaFull: 'assets/music/songs/' + nombre + '/' + archivo
                }))
            };
        }).filter(Boolean)
    };

    // Escritura del archivo JSON final
    try {
        fs.writeFileSync(ARCHIVO_SALIDA, JSON.stringify(data, null, 2));
        console.log('Proceso finalizado. Archivo generado en: ' + ARCHIVO_SALIDA);
    } catch (error) {
        console.error('Error al escribir el archivo JSON:', error);
    }
}

generarJSON();