const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const dataFolderPath = path.join(app.getPath('userData'), 'data');

if (!fs.existsSync(dataFolderPath)) {
    fs.mkdirSync(dataFolderPath, { recursive: true });
}

const dbPath = path.join(dataFolderPath, 'softleafs_data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
// Activamos el soporte para llaves foráneas (importante para que el borrado en cascada funcione)
db.pragma('foreign_keys = ON');

const createTables = () => {
    // 1. Tabla de libros (sin la columna etiquetas)
    const tableLibros = `
        CREATE TABLE IF NOT EXISTS libros (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nombre TEXT NOT NULL,                  
            ruta TEXT NOT NULL,                    
            archivo TEXT NOT NULL,
            portada TEXT,                 
            fecha_añadido DATETIME DEFAULT CURRENT_TIMESTAMP, 
            ultima_lectura DATETIME DEFAULT NULL 
        );
    `;

    // 2. Tabla maestra de etiquetas (nombres únicos)
    const tableEtiquetas = `
        CREATE TABLE IF NOT EXISTS etiquetas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        );
    `;

    // 3. Tabla puente (conecta libros con etiquetas)
    // ON DELETE CASCADE significa que si borras un libro, 
    // automáticamente se borran sus conexiones en esta tabla.
    const tableLibroEtiquetas = `
        CREATE TABLE IF NOT EXISTS libro_etiquetas (
            libro_id INTEGER,
            etiqueta_id INTEGER,
            PRIMARY KEY (libro_id, etiqueta_id),
            FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE,
            FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
        );
    `;

    db.exec(tableLibros);
    db.exec(tableEtiquetas);
    db.exec(tableLibroEtiquetas);
    
    console.log("Base de datos lista: Tablas vinculadas correctamente.");
};

createTables();

module.exports = db;