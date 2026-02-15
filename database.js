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
            ultima_lectura DATETIME DEFAULT NULL ,
            numero_pagina INTEGER DEFAULT 1,
            ultima_pag TEXT
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
    const textoSubrayado = `
        CREATE TABLE IF NOT EXISTS texto_subrayado (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            libro_id INTEGER NOT NULL,
            cfi_range TEXT NOT NULL,
            texto TEXT,
            color TEXT DEFAULT 'red',
            UNIQUE(libro_id, cfi_range) ON CONFLICT IGNORE,
            FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE
        );



    `;
    const tableUser = `
    CREATE TABLE IF NOT EXISTS USER (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        nivel_actual INTEGER DEFAULT 1,
        xp_actual INTEGER DEFAULT 0,
        xp_max_nivel INTEGER DEFAULT 1000,
        xp_ganada_hoy INTEGER DEFAULT 0,
        ultima_actualizacion TEXT
    );
`;

    db.exec(tableLibros);
    db.exec(tableEtiquetas);
    db.exec(tableLibroEtiquetas);
    db.exec(textoSubrayado);
    db.exec(tableUser);
    console.log("Base de datos lista.");

    const userExists = db.prepare("SELECT id FROM USER WHERE id = 1").get();
if (!userExists) {
    db.prepare("INSERT INTO USER (id, nivel_actual, xp_actual, xp_max_nivel, xp_ganada_hoy) VALUES (1, 1, 0, 1000, 0)").run();
}
};



createTables();

module.exports = db;