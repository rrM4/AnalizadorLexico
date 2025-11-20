// ==========================================
// 1. DEFINICIÓN DE TOKENS Y LEXER
// ==========================================
const tokensDefinidos = [
    { type: 'COMENTARIO_LINEA', pattern: /^\/\/[^\n]*/ },
    { type: 'COMENTARIO_BLOQUE', pattern: /^\/\*[\s\S]*?\*\// },
    { type: 'ANOTACION', pattern: /^@Override\b/ },
    { type: 'MOD_ACCESO', pattern: /^(public|private|protected)\b/ },
    { type: 'TIPO', pattern: /^(String|int|float|double|boolean|char)\b/ },
    { type: 'PR', pattern: /^(class|static|if|else|while|for|return|new|this|void)\b/ },
    { type: 'PRINT', pattern: /^System\.out\.println\b/ },
    { type: 'CADENA', pattern: /^"([^"\\]|\\.)*"/ },
    { type: 'CARACTER', pattern: /^'([^'\\]|\\.)*'/ },
    { type: 'ERROR_ID_INICIO_NUM', pattern: /^\d+[a-zA-Z_][a-zA-Z0-9_]*/ },
    { type: 'REAL', pattern: /^\d+\.\d+/ },
    { type: 'ENTERO', pattern: /^\d+/ },
    { type: 'OP_REL', pattern: /^(>=|<=|==|!=)/ },
    { type: 'OP_REL', pattern: /^(>|<)/ },
    { type: 'OP_ARIT', pattern: /^(\+|-|\*|\/|%)/ },
    { type: 'OP_ASIGN', pattern: /^(=|\+=|-=|\*=|\/=|%=)/ },
    { type: 'OP_LOG', pattern: /^(&&|\|\||!)/ },
    { type: 'OP_INC_DEC', pattern: /^(\+\+|--)/ },
    { type: 'DELIM', pattern: /^(\(|\)|{|}|\[|\]|;|,|\.)/ },
    { type: 'ID', pattern: /^[a-zA-Z_][a-zA-Z0-9_]*/ }
];

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function limpiarTablas() {
    document.querySelector('#tabla-lexemas tbody').innerHTML = '';
    document.querySelector('#tabla-errores tbody').innerHTML = '';
    document.querySelector('#tabla-simbolos tbody').innerHTML = '';
    document.getElementById('resultado-analisis').innerHTML = '';
    document.getElementById('resultado-sintactico').innerHTML = '';
}

function manejarComentarios(codigo, posicion, linea, columna) {
    if (codigo.slice(posicion).startsWith('//')) {
        const finLinea = codigo.indexOf('\n', posicion);
        if (finLinea === -1) return { nuevaPosicion: codigo.length, nuevaLinea: linea, nuevaColumna: columna };
        return { nuevaPosicion: finLinea + 1, nuevaLinea: linea + 1, nuevaColumna: 1 };
    }
    if (codigo.slice(posicion).startsWith('/*')) {
        const finComentario = codigo.indexOf('*/', posicion);
        if (finComentario === -1) return { nuevaPosicion: codigo.length, nuevaLinea: linea, nuevaColumna: columna };
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

function analizadorLexico(codigo) {
    let tokens = [];
    let errores = [];
    let posicion = 0;
    let linea = 1;
    let columna = 1;

    while (posicion < codigo.length) {
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

        for (let tokenDef of tokensDefinidos) {
            const match = codigo.slice(posicion).match(tokenDef.pattern);
            if (match && match.index === 0) {
                const lexema = match[0];
                if (lexema.length > mejorLongitud) {
                    mejorLongitud = lexema.length;
                    mejorMatch = { tokenDef, lexema };
                }
            }
        }

        if (mejorMatch) {
            const { tokenDef, lexema } = mejorMatch;

            if (tokenDef.type === 'ERROR_ID_INICIO_NUM') {
                errores.push({
                    caracter: lexema,
                    linea: linea,
                    columna: columna,
                    descripcion: `Identificador inválido: '${lexema}' no puede iniciar con un número`
                });
            }
            else if (!tokenDef.type.startsWith('COMENTARIO')) {
                tokens.push({
                    lexema: lexema,
                    tipo: tokenDef.type,
                    linea: linea,
                    columna: columna
                });
            }

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
    return { tokens, errores };
}

// ==========================================
// 2. ANALIZADOR SINTÁCTICO (PARSER)
// ==========================================
class AnalizadorSintactico {
    constructor(tokens) {
        this.tokens = tokens;
        this.posicion = 0;
        this.errores = [];
        this.tablaSimbolos = [];
        this.MAX_ERRORES = 2; // Límite de errores a mostrar
        this.contexto = {
            claseActual: null,
            metodoActual: null
        };
    }

    // --- Control de Tokens ---
    get tokenActual() { return this.posicion < this.tokens.length ? this.tokens[this.posicion] : null; }
    get tipoActual() { return this.tokenActual ? this.tokenActual.tipo : 'EOF'; }
    get lexemaActual() { return this.tokenActual ? this.tokenActual.lexema : 'EOF'; }

    avanzar() {
        if (this.posicion < this.tokens.length) {
            this.posicion++;
        }
    }

    mirarSiguiente(cantidad = 1) {
        const index = this.posicion + cantidad;
        return index < this.tokens.length ? this.tokens[index] : null;
    }

    // --- Manejo de Errores ---
    error(mensaje) {
        const token = this.tokenActual || { linea: '?', columna: '?', tipo: 'EOF', lexema: 'EOF' };

        // Evitar duplicar el mismo error en la misma posición
        const ultimoError = this.errores[this.errores.length - 1];
        if (ultimoError && ultimoError.linea === token.linea && ultimoError.columna === token.columna) {
            return;
        }

        this.errores.push({
            linea: token.linea,
            columna: token.columna,
            mensaje: mensaje,
            tokenEncontrado: `${token.tipo} ('${token.lexema}')`
        });

        if (this.errores.length >= this.MAX_ERRORES) {
            throw new Error("LIMITE_ERRORES_ALCANZADO");
        } else {
            this.recuperar();
        }
    }

    recuperar() {
        // Palabras que indican el inicio de una nueva sentencia segura
        const tokensSincronizacion = [
            'class', 'public', 'private', 'protected',
            'void', 'static', 'int', 'String', 'boolean',
            'return', 'if', 'else', 'while', 'for', '@Override'
        ];

        while (this.tokenActual) {
            const lexema = this.lexemaActual;

            // 1. Si hallamos punto y coma, consumimos y estamos listos
            if (lexema === ';') {
                this.avanzar();
                return;
            }
            // 2. Si hallamos llaves, NO consumimos, paramos para que el bloque se maneje solo
            if (lexema === '{' || lexema === '}') {
                return;
            }
            // 3. Si hallamos inicio de otra sentencia, paramos
            if (tokensSincronizacion.includes(lexema)) {
                return;
            }

            // Si es basura, la saltamos
            this.avanzar();
        }
    }

    coincidir(tipoEsperado, lexemaEsperado = null) {
        if (this.tokenActual && this.tipoActual === tipoEsperado && (!lexemaEsperado || this.lexemaActual === lexemaEsperado)) {
            this.avanzar();
            return true;
        }
        return false;
    }

    esperar(tipoEsperado, lexemaEsperado = null) {
        if (!this.coincidir(tipoEsperado, lexemaEsperado)) {
            const token = this.tokenActual || { tipo: 'EOF', lexema: 'EOF' };
            const esperado = lexemaEsperado ? `'${lexemaEsperado}'` : tipoEsperado;
            this.error(`Se esperaba ${esperado}`);
        }
    }

    registrarSimbolo(lexema, tipoDato, categoria, tokenRef) {
        let contextoDesc = "";
        if (categoria === 'Clase') contextoDesc = "Definición de Clase";
        else if (categoria === 'Atributo') contextoDesc = `Atributo de clase '${this.contexto.claseActual}'`;
        else if (categoria === 'Método') contextoDesc = `Método de la clase '${this.contexto.claseActual}'`;
        else if (categoria === 'Parámetro') contextoDesc = `Parámetro del método '${this.contexto.metodoActual}'`;
        else if (categoria.includes('Variable')) contextoDesc = `Variable local en método '${this.contexto.metodoActual}'`;

        this.tablaSimbolos.push({
            identificador: lexema,
            tipo: tipoDato,
            contexto: contextoDesc,
            linea: tokenRef.linea,
            columna: tokenRef.columna
        });
    }

    analizarPrograma() {
        try {
            while (this.tokenActual) {
                if (this.lexemaActual === 'class' || this.tipoActual === 'MOD_ACCESO') {
                    this.analizarClase();
                } else {
                    if(this.tokenActual) {
                        this.error("Código fuera de la estructura de clase");
                        // Forzar avance si recuperar no avanzó para evitar bucle infinito
                        if (this.tokenActual && !['class', 'public', 'private'].includes(this.lexemaActual)) {
                            this.avanzar();
                        }
                    }
                }
            }
        } catch (e) {
            if (e.message !== "LIMITE_ERRORES_ALCANZADO") console.error(e);
        }
        return { errores: this.errores, simbolos: this.tablaSimbolos };
    }

    analizarClase() {
        if (this.tipoActual === 'MOD_ACCESO') this.avanzar();

        if (this.lexemaActual !== 'class') {
            this.error("Se esperaba la palabra reservada 'class'");
            this.contexto.claseActual = "Clase_Sin_Definicion";
            // Recuperación agresiva: buscar la apertura de la clase
            while (this.tokenActual && this.lexemaActual !== '{') this.avanzar();
        } else {
            this.avanzar(); // Consumir 'class'
            const tokenClase = this.tokenActual;
            this.esperar('ID');

            if(tokenClase && tokenClase.tipo === 'ID') {
                this.contexto.claseActual = tokenClase.lexema;
                this.registrarSimbolo(tokenClase.lexema, 'class', 'Clase', tokenClase);
            } else {
                this.contexto.claseActual = "Clase_Sin_Nombre";
            }
        }

        this.esperar('DELIM', '{');

        while (this.tokenActual && this.lexemaActual !== '}') {
            try {
                this.analizarMiembro();
            } catch (e) {
                if (e.message === "LIMITE_ERRORES_ALCANZADO") throw e;
                // Si hubo error en un miembro, recuperar() ya nos dejó listos para el siguiente
            }
        }
        this.esperar('DELIM', '}');
    }

    analizarMiembro() {
        if (this.tipoActual === 'MOD_ACCESO' &&
            this.mirarSiguiente(1)?.tipo === 'TIPO' &&
            this.mirarSiguiente(2)?.tipo === 'ID' &&
            this.mirarSiguiente(3)?.lexema === ';') {
            this.analizarAtributo();
        }
        else if ((this.tipoActual === 'MOD_ACCESO' || this.tipoActual === 'ID') &&
            this.mirarSiguiente(this.tipoActual === 'MOD_ACCESO' ? 1 : 0)?.tipo === 'ID' &&
            this.mirarSiguiente(this.tipoActual === 'MOD_ACCESO' ? 2 : 1)?.lexema === '(') {
            this.analizarConstructor();
        }
        else if (this.lexemaActual === '@Override' ||
            (this.tipoActual === 'MOD_ACCESO' &&
                (this.mirarSiguiente(1)?.tipo === 'TIPO' || this.mirarSiguiente(1)?.lexema === 'void' || this.mirarSiguiente(1)?.lexema === 'static'))) {
            this.analizarMetodo();
        }
        else {
            this.error("Declaración no reconocida dentro de la clase");
        }
    }

    analizarAtributo() {
        this.esperar('MOD_ACCESO');
        const tTipo = this.tokenActual;
        this.esperar('TIPO');
        const tId = this.tokenActual;
        this.esperar('ID');
        if(tId && tTipo) this.registrarSimbolo(tId.lexema, tTipo.lexema, 'Atributo', tId);
        this.esperar('DELIM', ';');
    }

    analizarConstructor() {
        this.contexto.metodoActual = "Constructor";
        if (this.tipoActual === 'MOD_ACCESO') this.avanzar();
        this.esperar('ID');
        this.esperar('DELIM', '(');
        if (this.tipoActual === 'TIPO') this.analizarParametros();
        this.esperar('DELIM', ')');
        this.esperar('DELIM', '{');
        this.analizarCuerpoMetodo();
        this.esperar('DELIM', '}');
        this.contexto.metodoActual = null;
    }

    analizarMetodo() {
        if (this.coincidir('ANOTACION')) {}
        this.esperar('MOD_ACCESO');

        let tipoRetorno = "";

        if (this.lexemaActual === 'static') {
            this.avanzar();
            this.esperar('PR', 'void');
            tipoRetorno = 'void';
            this.esperar('ID', 'main');
            this.contexto.metodoActual = 'main';
            this.registrarSimbolo('main', 'void', 'Método', {linea:0, columna:0, lexema:'main'});
        } else {
            if (this.lexemaActual === 'void') {
                tipoRetorno = 'void';
                this.avanzar();
            } else {
                tipoRetorno = this.tokenActual ? this.tokenActual.lexema : 'unknown';
                this.esperar('TIPO');
            }

            const tokenMetodo = this.tokenActual;
            this.esperar('ID');
            this.contexto.metodoActual = tokenMetodo ? tokenMetodo.lexema : 'anonimo';
            if(tokenMetodo && tokenMetodo.tipo === 'ID') {
                this.registrarSimbolo(tokenMetodo.lexema, tipoRetorno, 'Método', tokenMetodo);
            }
        }

        this.esperar('DELIM', '(');

        if (this.contexto.metodoActual === 'main') {
            if (this.lexemaActual === 'String') {
                this.esperar('TIPO', 'String');
                this.esperar('DELIM', '['); this.esperar('DELIM', ']');
                const arg = this.tokenActual;
                this.esperar('ID');
                if(arg) this.registrarSimbolo(arg.lexema, 'String[]', 'Parámetro', arg);
            }
        } else {
            if (this.tipoActual === 'TIPO') this.analizarParametros();
        }

        this.esperar('DELIM', ')');
        this.esperar('DELIM', '{');
        this.analizarCuerpoMetodo();
        this.esperar('DELIM', '}');
        this.contexto.metodoActual = null;
    }

    analizarParametros() {
        const tTipo = this.tokenActual;
        this.esperar('TIPO');
        const tId = this.tokenActual;
        this.esperar('ID');
        if(tId) this.registrarSimbolo(tId.lexema, tTipo.lexema, 'Parámetro', tId);

        while (this.coincidir('DELIM', ',')) {
            const tTipo2 = this.tokenActual;
            this.esperar('TIPO');
            const tId2 = this.tokenActual;
            this.esperar('ID');
            if(tId2) this.registrarSimbolo(tId2.lexema, tTipo2.lexema, 'Parámetro', tId2);
        }
    }

    analizarCuerpoMetodo() {
        while (this.tokenActual && this.lexemaActual !== '}') {
            try {
                this.analizarSentencia();
            } catch (e) {
                if (e.message === "LIMITE_ERRORES_ALCANZADO") throw e;
                this.recuperar();
            }
        }
    }

    analizarSentencia() {
        if (this.tipoActual === 'TIPO' && this.mirarSiguiente(1)?.tipo === 'ID') {
            this.analizarDeclaracion();
        } else if (this.tipoActual === 'ID' && this.mirarSiguiente(1)?.tipo === 'ID') {
            this.analizarDeclaracionObjeto();
        } else if (this.lexemaActual === 'System.out.println') {
            this.esperar('PRINT'); this.esperar('DELIM', '('); this.analizarExpresion(); this.esperar('DELIM', ')'); this.esperar('DELIM', ';');
        } else if (this.lexemaActual === 'return') {
            this.esperar('PR', 'return'); this.analizarExpresion(); this.esperar('DELIM', ';');
        } else if (this.tipoActual === 'ID') {
            this.analizarSentenciaID();
        } else if (this.lexemaActual === 'this') {
            this.esperar('PR', 'this'); this.esperar('DELIM', '.'); this.esperar('ID'); this.esperar('OP_ASIGN', '='); this.esperar('ID'); this.esperar('DELIM', ';');
        } else {
            this.error("Sentencia no reconocida");
        }
    }

    analizarDeclaracion() {
        const tTipo = this.tokenActual;
        this.esperar('TIPO');
        const tId = this.tokenActual;
        this.esperar('ID');
        if(tId) this.registrarSimbolo(tId.lexema, tTipo.lexema, 'Variable Local', tId);
        if (this.coincidir('OP_ASIGN', '=')) {
            this.analizarExpresion();
        }
        this.esperar('DELIM', ';');
    }

    analizarDeclaracionObjeto() {
        const tTipo = this.tokenActual;
        this.esperar('ID');
        const tId = this.tokenActual;
        this.esperar('ID');
        if(tId) this.registrarSimbolo(tId.lexema, tTipo.lexema, 'Variable Local (Objeto)', tId);
        if (this.coincidir('OP_ASIGN', '=')) {
            while(this.tokenActual && this.lexemaActual !== ';') this.avanzar();
        }
        this.esperar('DELIM', ';');
    }

    analizarSentenciaID() {
        this.esperar('ID');
        const sig = this.tokenActual;
        if (sig?.lexema === '=') {
            this.avanzar();
            this.analizarExpresion();
            this.esperar('DELIM', ';');
        }
        else if (sig?.lexema === '.' || sig?.lexema === '(') {
            while(this.tokenActual && this.lexemaActual !== ';') this.avanzar();
            this.esperar('DELIM', ';');
        }
        else {
            this.error("Uso de identificador no válido como sentencia");
        }
    }

    // === AQUÍ ESTÁ EL CAMBIO IMPORTANTE ===
    analizarExpresion() {
        let parentesisAbiertos = 0;

        // Tokens que indican que la expresión DEBE terminar forzosamente (aunque no haya ;)
        const tokensDeParada = ['}', ';', 'public', 'private', 'protected', 'return', 'if', 'while', 'for'];

        while (this.tokenActual) {
            // Si encontramos una señal de parada y no hay paréntesis abiertos, abortamos la expresión
            if (parentesisAbiertos === 0 && tokensDeParada.includes(this.lexemaActual)) {
                break;
            }

            if (this.lexemaActual === '(') parentesisAbiertos++;
            else if (this.lexemaActual === ')') {
                if (parentesisAbiertos > 0) parentesisAbiertos--;
                else break; // Paréntesis de cierre extra (ej: fin del println)
            }

            this.avanzar();
        }
    }
}

// ==========================================
// 3. INTERFAZ DE USUARIO
// ==========================================

function llenarTablaLexemas(tokens) {
    const tbody = document.querySelector('#tabla-lexemas tbody');
    tbody.innerHTML = '';
    tokens.forEach(token => {
        const fila = document.createElement('tr');
        fila.innerHTML = `<td>${escapeHtml(token.lexema)}</td><td>${token.tipo}</td>`;
        tbody.appendChild(fila);
    });
}

function llenarTablaErrores(errores) {
    const tbody = document.querySelector('#tabla-errores tbody');
    tbody.innerHTML = '';
    if (errores.length === 0) {
        tbody.innerHTML = `<tr><td>No se encontraron errores</td></tr>`;
    } else {
        errores.forEach(error => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td class="error">L${error.linea}, C${error.columna}: ${error.mensaje || error.descripcion}</td>`;
            tbody.appendChild(fila);
        });
    }
}

function llenarTablaSimbolos(listaSimbolos) {
    const tbody = document.querySelector('#tabla-simbolos tbody');
    tbody.innerHTML = '';

    if (!listaSimbolos || listaSimbolos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">No se encontraron declaraciones de símbolos</td></tr>`;
    } else {
        listaSimbolos.forEach(info => {
            const fila = document.createElement('tr');
            // Aquí mostramos Identificador | Tipo de Dato (o Retorno) | Contexto | Posición
            fila.innerHTML = `
                <td><b>${info.identificador}</b></td>
                <td><span class="badge-tipo">${info.tipo}</span></td>
                <td>${info.contexto}</td>
                <td>L${info.linea}C${info.columna}</td>
            `;
            tbody.appendChild(fila);
        });
    }
}

function mostrarResultadoSintactico(erroresSintacticos) {
    const resultadoDiv = document.getElementById('resultado-sintactico');
    resultadoDiv.innerHTML = '';

    if (erroresSintacticos.length === 0) {
        resultadoDiv.innerHTML = `<div class="success">Análisis sintáctico completado sin errores.</div>`;
    } else {
        let mensajeExtra = "";
        if (erroresSintacticos.length >= 2) {
            mensajeExtra = "<br><strong>(Se detuvo el análisis tras alcanzar 2 errores)</strong>";
        }

        let html = `<div class="error">Errores Sintácticos Encontrados:${mensajeExtra}</div><ul>`;
        erroresSintacticos.forEach(error => {
            html += `<li class="error">Línea ${error.linea}, Columna ${error.columna}: ${error.mensaje}<br><small>Token encontrado: ${error.tokenEncontrado}</small></li>`;
        });
        html += '</ul>';
        resultadoDiv.innerHTML = html;
    }
}

function ejecutarAnalisis() {
    const codigo = document.getElementById('editor-codigo').value;
    limpiarTablas();

    if (!codigo.trim()) return;

    document.getElementById('resultado-analisis').innerHTML = '<div>Analizando...</div>';

    setTimeout(() => {
        // 1. Léxico
        const resultadoLexico = analizadorLexico(codigo);
        llenarTablaLexemas(resultadoLexico.tokens);

        if (resultadoLexico.errores.length > 0) {
            llenarTablaErrores(resultadoLexico.errores);
            document.getElementById('resultado-analisis').innerHTML = `<div class="error">Errores Léxicos encontrados (Corrija antes de pasar al sintáctico)</div>`;
            return;
        }

        // 2. Sintáctico (Ahora con recuperación de errores)
        const parser = new AnalizadorSintactico(resultadoLexico.tokens);
        const resultadoSintactico = parser.analizarPrograma();

        // 3. Resultados
        llenarTablaSimbolos(resultadoSintactico.simbolos);
        llenarTablaErrores(resultadoSintactico.errores); // Tabla general de errores
        mostrarResultadoSintactico(resultadoSintactico.errores); // Resumen arriba

        if (resultadoSintactico.errores.length === 0) {
            document.getElementById('resultado-analisis').innerHTML = `<div class="success">Análisis Finalizado Correctamente.</div>`;
        } else {
            document.getElementById('resultado-analisis').innerHTML = `<div class="error">Análisis finalizado con errores.</div>`;
        }

    }, 100);
}

document.getElementById('btn-analizar').addEventListener('click', ejecutarAnalisis);