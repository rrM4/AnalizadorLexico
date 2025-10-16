// DEFINICIÓN DE TOKENS - PATRONES LÉXICOS PARA JAVA
const tokensDefinidos = [
    // Comentarios (deben ir PRIMERO para que no interfieran)
    { type: 'COMENTARIO_LINEA', pattern: /^\/\/[^\n]*/ },
    { type: 'COMENTARIO_BLOQUE', pattern: /^\/\*[\s\S]*?\*\// },
    
    // Palabras reservadas de Java (con word boundaries)
    { type: 'PR', pattern: /^(public|private|protected|class|static|void|int|String|float|double|boolean|char|if|else|while|for|return|new|this|override)\b/ },
    { type: 'ANOTACION', pattern: /^@Override\b/ },
    
    // Tipos de datos y modificadores (con word boundaries)
    { type: 'TIPO', pattern: /^(String|int|float|double|boolean|char)\b/ },
    { type: 'MOD_ACCESO', pattern: /^(public|private|protected)\b/ },
    
    // Literales (deben ir antes de operadores)
    { type: 'CADENA', pattern: /^"([^"\\]|\\.)*"/ },
    { type: 'CARACTER', pattern: /^'([^'\\]|\\.)*'/ },
    { type: 'REAL', pattern: /^\d+\.\d+/ },
    { type: 'ENTERO', pattern: /^\d+/ },
    
    // Operadores relacionales (compuestos primero)
    { type: 'OP_REL', pattern: /^(>=|<=|==|!=)/ },
    { type: 'OP_REL', pattern: /^(>|<)/ },
    
    // Operadores aritméticos
    { type: 'OP_ARIT', pattern: /^(\+|-|\*|\/|%)/ },
    
    // Operadores de asignación
    { type: 'OP_ASIGN', pattern: /^(=|\+=|-=|\*=|\/=|%=)/ },
    
    // Operadores lógicos
    { type: 'OP_LOG', pattern: /^(&&|\|\||!)/ },
    
    // Operadores de incremento/decremento
    { type: 'OP_INC_DEC', pattern: /^(\+\+|--)/ },
    
    // Delimitadores
    { type: 'DELIM', pattern: /^(\(|\)|{|}|\[|\]|;|,|\.)/ },
    
    // Identificadores (debe ir ÚLTIMO)
    { type: 'ID', pattern: /^[a-zA-Z_][a-zA-Z0-9_]*/ }
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

// FUNCIÓN PARA SALTAR COMENTARIOS (maneja correctamente los comentarios)
function manejarComentarios(codigo, posicion, linea, columna) {
    // Comentario de línea
    if (codigo.slice(posicion).startsWith('//')) {
        const finLinea = codigo.indexOf('\n', posicion);
        if (finLinea === -1) {
            return { nuevaPosicion: codigo.length, nuevaLinea: linea, nuevaColumna: columna };
        }
        return { 
            nuevaPosicion: finLinea + 1, 
            nuevaLinea: linea + 1, 
            nuevaColumna: 1 
        };
    }
    
    // Comentario de bloque
    if (codigo.slice(posicion).startsWith('/*')) {
        const finComentario = codigo.indexOf('*/', posicion);
        if (finComentario === -1) {
            return { nuevaPosicion: codigo.length, nuevaLinea: linea, nuevaColumna: columna };
        }
        
        // Contar líneas en el comentario
        const contenidoComentario = codigo.slice(posicion, finComentario + 2);
        const lineasEnComentario = (contenidoComentario.match(/\n/g) || []).length;
        const ultimaLinea = contenidoComentario.slice(contenidoComentario.lastIndexOf('\n') + 1);
        
        return { 
            nuevaPosicion: finComentario + 2, 
            nuevaLinea: linea + lineasEnComentario,
            nuevaColumna: lineasEnComentario > 0 ? ultimaLinea.length : columna + contenidoComentario.length
        };
    }
    
    return null;
}

// FUNCIÓN PRINCIPAL DEL ANALIZADOR LÉXICO MEJORADA
function analizadorLexico(codigo) {
    let tokens = [];
    let errores = [];
    let simbolos = new Map();
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

        // Manejar comentarios
        const resultadoComentario = manejarComentarios(codigo, posicion, linea, columna);
        if (resultadoComentario) {
            posicion = resultadoComentario.nuevaPosicion;
            linea = resultadoComentario.nuevaLinea;
            columna = resultadoComentario.nuevaColumna;
            continue;
        }

        let tokenEncontrado = false;
        let mejorMatch = null;
        let mejorLongitud = 0;
        
        // Buscar el token más largo que coincida
        for (let tokenDef of tokensDefinidos) {
            const match = codigo.slice(posicion).match(tokenDef.pattern);
            
            if (match && match.index === 0) {
                const lexema = match[0];
                // Preferir el match más largo
                if (lexema.length > mejorLongitud) {
                    mejorLongitud = lexema.length;
                    mejorMatch = { tokenDef, lexema };
                }
            }
        }
        
        if (mejorMatch) {
            const { tokenDef, lexema } = mejorMatch;
            
            // Solo procesar tokens que NO son comentarios
            if (!tokenDef.type.startsWith('COMENTARIO')) {
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

            // Actualizar posición contando correctamente las líneas
            const lineasEnLexema = (lexema.match(/\n/g) || []).length;
            if (lineasEnLexema > 0) {
                linea += lineasEnLexema;
                const ultimaLinea = lexema.slice(lexema.lastIndexOf('\n') + 1);
                columna = ultimaLinea.length + 1;
            } else {
                columna += lexema.length;
            }
            
            posicion += lexema.length;
            tokenEncontrado = true;
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

// Función para inferir tipos en la tabla de símbolos MEJORADA
function inferirTipos(tokens, tablaSimbolos) {
    // Buscar declaraciones de variables: "String nombre", "int edad", etc.
    for (let i = 0; i < tokens.length - 1; i++) {
        if ((tokens[i].tipo === 'TIPO' || tokens[i].tipo === 'PR') && 
            tokens[i + 1].tipo === 'ID') {
            
            const tipo = tokens[i].lexema;
            const identificador = tokens[i + 1].lexema;
            
            if (tablaSimbolos.has(identificador)) {
                tablaSimbolos.get(identificador).tipo = tipo;
            }
        }
    }
    
    // Buscar asignaciones para inferir valores
    for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].tipo === 'ID' && 
            tokens[i + 1].tipo === 'OP_ASIGN' &&
            (tokens[i + 2].tipo === 'ENTERO' || tokens[i + 2].tipo === 'REAL' || 
             tokens[i + 2].tipo === 'CADENA' || tokens[i + 2].tipo === 'CARACTER')) {
            
            const identificador = tokens[i].lexema;
            if (tablaSimbolos.has(identificador)) {
                tablaSimbolos.get(identificador).valor = tokens[i + 2].lexema;
            }
        }
    }
    
    // Buscar nombres de clases
    for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].tipo === 'PR' && tokens[i].lexema === 'class' &&
            tokens[i + 1].tipo === 'ID') {
            
            const nombreClase = tokens[i + 1].lexema;
            if (!tablaSimbolos.has(nombreClase)) {
                tablaSimbolos.set(nombreClase, {
                    tipo: 'class',
                    valor: null,
                    linea: tokens[i + 1].linea,
                    columna: tokens[i + 1].columna
                });
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
    
    if (errores.length === 0) {
        const fila = document.createElement('tr');
        fila.innerHTML = `<td>No se encontraron errores léxicos</td>`;
        tbody.appendChild(fila);
    } else {
        errores.forEach(error => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td class="error">Línea ${error.linea}, Columna ${error.columna}: ${error.descripcion}</td>
            `;
            tbody.appendChild(fila);
        });
    }
}

function llenarTablaSimbolos(simbolos) {
    const tbody = document.querySelector('#tabla-simbolos tbody');
    tbody.innerHTML = '';
    
    if (simbolos.size === 0) {
        const fila = document.createElement('tr');
        fila.innerHTML = `<td colspan="4">No se encontraron símbolos</td>`;
        tbody.appendChild(fila);
    } else {
        simbolos.forEach((info, identificador) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${identificador}</td>
                <td>${info.tipo || 'desconocido'}</td>
                <td>${info.valor || ''}</td>
                <td>L${info.linea}C${info.columna}</td>
            `;
            tbody.appendChild(fila);
        });
    }
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

console.log('Analizador léxico mejorado cargado. Listo para código Java.');