// DEFINICIÓN DE TOKENS - PATRONES LÉXICOS
const tokensDefinidos = [
    // Palabras reservadas (deben ir primero)
    { type: 'PR', pattern: /^(int|float|if|else|while|for|return|void|printf)/ },
    // Números (reales antes que enteros)
    { type: 'REAL', pattern: /^\d+\.\d+/ },
    { type: 'ENTERO', pattern: /^\d+/ },
    // Identificadores
    { type: 'ID', pattern: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
    // Operadores relacionales (compuestos primero)
    { type: 'REL', pattern: /^(>=|<=|==|!=)/ },
    { type: 'REL', pattern: /^(>|<)/ },
    // Operadores aritméticos
    { type: 'OP_ARIT', pattern: /^(\+|-|\*|\/)/ },
    // Asignación
    { type: 'ASIGN', pattern: /^=/ },
    // Delimitadores
    { type: 'DELIM', pattern: /^(\(|\)|{|}|\[|\]|;|,)/ },
    // Cadenas
    { type: 'CADENA', pattern: /^"([^"\\]|\\.)*"/ },
    // Comentarios (opcional por ahora)
    { type: 'COMENTARIO', pattern: /^\/\/.*/ }
];

// Función para escapar HTML (seguridad)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Función para limpiar las tablas
function limpiarTablas() {
    document.querySelector('#tabla-lexemas tbody').innerHTML = '';
    document.querySelector('#tabla-errores tbody').innerHTML = '';
    document.querySelector('#tabla-simbolos tbody').innerHTML = '';
    document.getElementById('resultado-analisis').innerHTML = '';
}

// Función para mostrar mensaje de análisis
function mostrarResultadoAnalisis(tokens, errores) {
    const resultadoDiv = document.getElementById('resultado-analisis');
    
    if (errores.length > 0) {
        resultadoDiv.innerHTML = `<div class="error">Se encontraron ${errores.length} error(es) léxico(s)</div>`;
    } else {
        resultadoDiv.innerHTML = `<div class="success">Análisis completado. ${tokens.length} tokens encontrados.</div>`;
    }
}

// FUNCIÓN PRINCIPAL DEL ANALIZADOR LÉXICO
function analizadorLexico(codigo) {
    let tokens = [];
    let errores = [];
    let simbolos = new Map(); // Para tabla de símbolos
    let posicion = 0;
    let linea = 1;
    let columna = 1;

    while (posicion < codigo.length) {
        // Saltar espacios en blanco
        if (/\s/.test(codigo[posicion])) {
            if (codigo[posicion] === '\n') {
                linea++;
                columna = 1;
            } else {
                columna++;
            }
            posicion++;
            continue;
        }

        let tokenEncontrado = false;
        
        // Intentar hacer match con cada patrón
        for (let tokenDef of tokensDefinidos) {
            const match = codigo.slice(posicion).match(tokenDef.pattern);
            
            if (match && match.index === 0) {
                const lexema = match[0];
                
                // Procesar token válido (excepto comentarios)
                if (tokenDef.type !== 'COMENTARIO') {
                    tokens.push({
                        lexema: lexema,
                        tipo: tokenDef.type,
                        linea: linea,
                        columna: columna
                    });

                    // Actualizar tabla de símbolos para identificadores
                    if (tokenDef.type === 'ID') {
                        if (!simbolos.has(lexema)) {
                            simbolos.set(lexema, {
                                tipo: 'desconocido',
                                valor: null,
                                linea: linea,
                                columna: columna
                            });
                        }
                    }
                }

                // Actualizar posición
                const lineasEnLexema = lexema.split('\n').length - 1;
                if (lineasEnLexema > 0) {
                    linea += lineasEnLexema;
                    columna = lexema.length - lexema.lastIndexOf('\n');
                } else {
                    columna += lexema.length;
                }
                
                posicion += lexema.length;
                tokenEncontrado = true;
                break;
            }
        }

        // Si no se encontró ningún token válido -> ERROR
        if (!tokenEncontrado) {
            const caracterNoReconocido = codigo[posicion];
            errores.push({
                caracter: caracterNoReconocido,
                linea: linea,
                columna: columna,
                descripcion: `Carácter no reconocido: '${caracterNoReconocido}'`
            });
            posicion++;
            columna++;
        }
    }
    
    return { tokens, errores, simbolos };
}

// Función para inferir tipos en la tabla de símbolos
function inferirTipos(tokens, tablaSimbolos) {
    // Buscar declaraciones: "int x", "float y"
    for (let i = 0; i < tokens.length - 1; i++) {
        if (tokens[i].tipo === 'PR' && 
            (tokens[i].lexema === 'int' || tokens[i].lexema === 'float') &&
            tokens[i + 1].tipo === 'ID') {
            
            const identificador = tokens[i + 1].lexema;
            if (tablaSimbolos.has(identificador)) {
                tablaSimbolos.get(identificador).tipo = tokens[i].lexema;
            }
        }
    }
    
    // Buscar asignaciones para inferir valores
    for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].tipo === 'ID' && 
            tokens[i + 1].tipo === 'ASIGN' &&
            (tokens[i + 2].tipo === 'ENTERO' || tokens[i + 2].tipo === 'REAL')) {
            
            const identificador = tokens[i].lexema;
            if (tablaSimbolos.has(identificador)) {
                tablaSimbolos.get(identificador).valor = tokens[i + 2].lexema;
            }
        }
    }
}

// FUNCIONES PARA LLENAR LAS TABLAS EN LA INTERFAZ
function llenarTablaLexemas(tokens) {
    const tbody = document.querySelector('#tabla-lexemas tbody');
    tbody.innerHTML = '';
    
    tokens.forEach(token => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${escapeHtml(token.lexema)}</td>
            <td>${token.tipo}</td>
        `;
        tbody.appendChild(fila);
    });
}

function llenarTablaErrores(errores) {
    const tbody = document.querySelector('#tabla-errores tbody');
    tbody.innerHTML = '';
    
    errores.forEach(error => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>Línea ${error.linea}, Columna ${error.columna}: ${error.descripcion}</td>
        `;
        tbody.appendChild(fila);
    });
}

function llenarTablaSimbolos(simbolos) {
    const tbody = document.querySelector('#tabla-simbolos tbody');
    tbody.innerHTML = '';
    
    simbolos.forEach((info, identificador) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${identificador}</td>
            <td>${info.tipo}</td>
            <td>${info.valor || ''}</td>
            <td>L${info.linea}C${info.columna}</td>
        `;
        tbody.appendChild(fila);
    });
}

// FUNCIÓN PRINCIPAL QUE SE EJECUTA AL PRESIONAR EL BOTÓN
function ejecutarAnalisis() {
    const codigo = document.getElementById('editor-codigo').value;
    
    // Limpiar tablas anteriores
    limpiarTablas();
    
    if (!codigo.trim()) {
        document.getElementById('resultado-analisis').innerHTML = 
            '<div class="error">Por favor, ingresa código para analizar</div>';
        return;
    }
    
    // Mostrar mensaje de "analizando..."
    document.getElementById('resultado-analisis').innerHTML = 
        '<div>Analizando código...</div>';
    
    // Ejecutar análisis léxico
    const resultado = analizadorLexico(codigo);
    
    // Inferir tipos para la tabla de símbolos
    inferirTipos(resultado.tokens, resultado.simbolos);
    
    // Llenar las tablas con los resultados
    llenarTablaLexemas(resultado.tokens);
    llenarTablaErrores(resultado.errores);
    llenarTablaSimbolos(resultado.simbolos);
    
    // Mostrar resultado final
    mostrarResultadoAnalisis(resultado.tokens, resultado.errores);
}

// EVENT LISTENER PARA EL BOTÓN
document.getElementById('btn-analizar').addEventListener('click', ejecutarAnalisis);

console.log('Analizador léxico cargado. Presiona el botón "Ejecutar Análisis Léxico" para comenzar.');