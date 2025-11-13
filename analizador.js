// DEFINICIÓN DE TOKENS - PATRONES LÉXICOS PARA JAVA
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

// ========== ANALIZADOR LÉXICO ==========
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
    let simbolos = new Map();
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
            
            if (!tokenDef.type.startsWith('COMENTARIO')) {
                tokens.push({
                    lexema: lexema,
                    tipo: tokenDef.type,
                    linea: linea,
                    columna: columna
                });

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
    
    return { tokens, errores, simbolos };
}

function inferirTipos(tokens, tablaSimbolos) {
    for (let i = 0; i < tokens.length - 1; i++) {
        if (tokens[i].tipo === 'TIPO' && tokens[i + 1].tipo === 'ID') {
            const tipo = tokens[i].lexema;
            const identificador = tokens[i + 1].lexema;
            if (tablaSimbolos.has(identificador)) {
                tablaSimbolos.get(identificador).tipo = tipo;
            }
        }
    }
    
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

// ========== ANALIZADOR SINTÁCTICO ==========
class AnalizadorSintactico {
    constructor(tokens) {
        this.tokens = tokens;
        this.posicion = 0;
        this.errores = [];
    }

    get tokenActual() {
        return this.posicion < this.tokens.length ? this.tokens[this.posicion] : null;
    }

    get tipoActual() {
        return this.tokenActual ? this.tokenActual.tipo : 'EOF';
    }

    get lexemaActual() {
        return this.tokenActual ? this.tokenActual.lexema : 'EOF';
    }

    avanzar() {
        this.posicion++;
    }

    coincidir(tipoEsperado, lexemaEsperado = null) {
        if (this.tokenActual && 
            this.tipoActual === tipoEsperado && 
            (!lexemaEsperado || this.lexemaActual === lexemaEsperado)) {
            this.avanzar();
            return true;
        }
        return false;
    }

    error(mensaje) {
        const token = this.tokenActual || { linea: 1, columna: 1, tipo: 'EOF', lexema: 'EOF' };
        this.errores.push({
            linea: token.linea,
            columna: token.columna,
            mensaje: mensaje,
            tokenEncontrado: `${token.tipo} ('${token.lexema}')`
        });
        throw new Error('Error sintáctico');
    }

    esperar(tipoEsperado, lexemaEsperado = null) {
        if (!this.coincidir(tipoEsperado, lexemaEsperado)) {
            const token = this.tokenActual || { tipo: 'EOF', lexema: 'EOF' };
            const esperado = lexemaEsperado ? `'${lexemaEsperado}'` : tipoEsperado;
            this.error(`Se esperaba ${esperado} pero se encontró ${token.tipo} ('${token.lexema}')`);
        }
    }

    mirarSiguiente(cantidad = 1) {
        const index = this.posicion + cantidad;
        return index < this.tokens.length ? this.tokens[index] : null;
    }

    esMetodoGetSet(nombre) {
        return nombre.startsWith('get') || nombre.startsWith('set');
    }

    analizarPrograma() {
        try {
            this.analizarClase();
            if (this.tokenActual) {
                this.error("Código adicional después del cierre de la clase");
            }
        } catch (e) {

        }
        return this.errores;
    }

    analizarClase() {
        if (this.tipoActual === 'MOD_ACCESO') {
            this.avanzar();
        }
        
        this.esperar('PR', 'class');
        
        this.esperar('ID');
        
        this.esperar('DELIM', '{');
        
        while (this.tokenActual && this.lexemaActual !== '}') {
            this.analizarMiembro();
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
        else if (this.lexemaActual === '@Override') {
            this.analizarMetodo();
        }
        else if (this.tipoActual === 'MOD_ACCESO' && 
                (this.mirarSiguiente(1)?.tipo === 'TIPO' || this.mirarSiguiente(1)?.lexema === 'void') &&
                this.mirarSiguiente(2)?.tipo === 'ID' &&
                this.mirarSiguiente(3)?.lexema === '(') {
            this.analizarMetodo();
        }
        else if (this.tipoActual === 'MOD_ACCESO' && 
                this.mirarSiguiente(1)?.lexema === 'static' &&
                this.mirarSiguiente(2)?.lexema === 'void' &&
                this.mirarSiguiente(3)?.lexema === 'main' &&
                this.mirarSiguiente(4)?.lexema === '(') {
            this.analizarMetodo();
        }
        else {
            this.error("Se esperaba declaración de atributo, constructor o método");
        }
    }

    analizarAtributo() {
        this.esperar('MOD_ACCESO');
        this.esperar('TIPO');
        this.esperar('ID');
        this.esperar('DELIM', ';');
    }

    analizarConstructor() {
        const tieneParametros = this.detectarParametrosConstructor();
        
        if (!tieneParametros) {
            this.analizarConstructorDefecto();
        } else {
            this.analizarConstructorParametros();
        }
    }

    detectarParametrosConstructor() {
        let tempPos = this.posicion;
        if (this.tokens[tempPos]?.tipo === 'MOD_ACCESO') tempPos++;
        if (this.tokens[tempPos]?.tipo === 'ID') tempPos++;
        if (this.tokens[tempPos]?.lexema === '(') tempPos++;
        
        return this.tokens[tempPos]?.tipo === 'TIPO';
    }

    analizarConstructorDefecto() {
        if (this.tipoActual === 'MOD_ACCESO') {
            this.avanzar();
        }
        
        this.esperar('ID');
        this.esperar('DELIM', '(');
        this.esperar('DELIM', ')');
        this.esperar('DELIM', '{');
        this.esperar('DELIM', '}');
    }

    analizarConstructorParametros() {
        if (this.tipoActual === 'MOD_ACCESO') {
            this.avanzar();
        }
        
        this.esperar('ID');
        this.esperar('DELIM', '(');
        this.analizarParametros();
        this.esperar('DELIM', ')');
        this.esperar('DELIM', '{');
        
        while (this.tokenActual && this.lexemaActual !== '}') {
            this.analizarSentenciaAsignacionThis();
        }
        
        this.esperar('DELIM', '}');
    }

    analizarMetodo() {
        if (this.coincidir('ANOTACION')) {
        }
        
        this.esperar('MOD_ACCESO');
        
        if (this.esMetodoMain()) {
            this.analizarMetodoMain();
        } else if (this.esMetodoToString()) {
            this.analizarMetodoToString();
        } else if (this.esMetodoGetSet()) {
            this.analizarMetodoGetSet();
        } else {
            this.analizarMetodoNormal();
        }
    }

    esMetodoMain() {
        return this.lexemaActual === 'static' &&
               this.mirarSiguiente(1)?.lexema === 'void' &&
               this.mirarSiguiente(2)?.lexema === 'main';
    }

    esMetodoToString() {
        return this.lexemaActual === 'String' &&
               this.mirarSiguiente(1)?.lexema === 'toString';
    }

    esMetodoGetSet() {
        const nombreMetodo = this.mirarSiguiente(1)?.lexema;
        return nombreMetodo && this.esMetodoGetSet(nombreMetodo);
    }

    analizarMetodoGetSet() {
        const tipoRetorno = this.lexemaActual;
        this.esperar('TIPO');
        
        const nombreMetodo = this.lexemaActual;
        if (!this.esMetodoGetSet(nombreMetodo)) {
            this.error(`Los métodos getter/setter deben comenzar con 'get' o 'set'. Encontrado: ${nombreMetodo}`);
        }
        this.esperar('ID');
        
        this.esperar('DELIM', '(');
        
        if (nombreMetodo.startsWith('set')) {
            if (this.tipoActual !== 'TIPO') {
                this.error("Los métodos setter deben tener un parámetro");
            }
            this.analizarParametros();
        } else if (nombreMetodo.startsWith('get') && this.tipoActual === 'TIPO') {
            this.analizarParametros();
        }
        
        this.esperar('DELIM', ')');
        this.esperar('DELIM', '{');
        
        if (this.lexemaActual === 'return') {
            this.analizarReturn();
        } else if (nombreMetodo.startsWith('get')) {
            this.error("Los métodos getter deben tener sentencia return");
        }
        
        this.esperar('DELIM', '}');
    }

    analizarMetodoNormal() {
        if (this.lexemaActual === 'void') {
            this.esperar('PR', 'void');
        } else {
            this.esperar('TIPO');
        }
        
        this.esperar('ID');
        this.esperar('DELIM', '(');
        
        if (this.tipoActual === 'TIPO') {
            this.analizarParametros();
        }
        
        this.esperar('DELIM', ')');
        this.esperar('DELIM', '{');
        
        while (this.tokenActual && this.lexemaActual !== '}') {
            this.analizarSentencia();
        }
        
        this.esperar('DELIM', '}');
    }

    analizarMetodoToString() {
        this.esperar('TIPO', 'String');
        this.esperar('ID', 'toString');
        this.esperar('DELIM', '(');
        this.esperar('DELIM', ')');
        this.esperar('DELIM', '{');
        this.esperar('PR', 'return');
        this.analizarExpresion();
        this.esperar('DELIM', ';');
        this.esperar('DELIM', '}');
    }

    analizarMetodoMain() {
        this.esperar('PR', 'static');
        this.esperar('PR', 'void');
        this.esperar('ID', 'main');
        this.esperar('DELIM', '(');
        this.esperar('TIPO', 'String');
        this.esperar('DELIM', '[');
        this.esperar('DELIM', ']');
        this.esperar('ID');
        this.esperar('DELIM', ')');
        this.esperar('DELIM', '{');
        
        while (this.tokenActual && this.lexemaActual !== '}') {
            this.analizarSentencia();
        }
        
        this.esperar('DELIM', '}');
    }

    analizarParametros() {
        this.esperar('TIPO');
        this.esperar('ID');
        
        while (this.coincidir('DELIM', ',')) {
            this.esperar('TIPO');
            this.esperar('ID');
        }
    }

    analizarSentencia() {
        if (this.tipoActual === 'TIPO' && this.mirarSiguiente(1)?.tipo === 'ID') {
            this.analizarDeclaracion();
        }
        else if (this.tipoActual === 'ID' && this.mirarSiguiente(1)?.tipo === 'ID' && 
                this.mirarSiguiente(2)?.lexema !== '(') {
            this.analizarDeclaracionObjeto();
        }
        else if (this.lexemaActual === 'System.out.println') {
            this.analizarPrint();
        }
        else if (this.lexemaActual === 'return') {
            this.analizarReturn();
        }
        else if (this.tipoActual === 'ID') {
            this.analizarSentenciaID();
        }
        else if (this.lexemaActual === 'this') {
            this.analizarSentenciaAsignacionThis();
        }
        else {
            this.error("Sentencia no reconocida");
        }
    }

    analizarDeclaracion() {
        this.esperar('TIPO');
        this.esperar('ID');
        
        if (this.coincidir('OP_ASIGN', '=')) {
            this.analizarExpresion();
        }
        
        this.esperar('DELIM', ';');
    }

    analizarDeclaracionObjeto() {
        this.esperar('ID');
        this.esperar('ID');
        
        if (this.coincidir('OP_ASIGN', '=')) {
            this.esperar('PR', 'new');
            this.esperar('ID');
            this.esperar('DELIM', '(');
            
            if (this.tipoActual !== 'DELIM' || this.lexemaActual !== ')') {
                this.analizarArgumentos();
            }
            
            this.esperar('DELIM', ')');
        }
        
        this.esperar('DELIM', ';');
    }

    analizarSentenciaID() {
        this.esperar('ID');
        
        const siguiente = this.tokenActual;
        
        if (siguiente?.lexema === '=') {
            this.avanzar();
            this.analizarExpresion();
            this.esperar('DELIM', ';');
        }
        else if (siguiente?.lexema === '.') {
            this.avanzar();
            this.esperar('ID');
            this.esperar('DELIM', '(');
            
            if (this.tipoActual !== 'DELIM' || this.lexemaActual !== ')') {
                this.analizarArgumentos();
            }
            
            this.esperar('DELIM', ')');
            this.esperar('DELIM', ';');
        }
        else if (siguiente?.lexema === '(') {
            this.avanzar();
            
            if (this.tipoActual !== 'DELIM' || this.lexemaActual !== ')') {
                this.analizarArgumentos();
            }
            
            this.esperar('DELIM', ')');
            this.esperar('DELIM', ';');
        }
        else {
            this.error("Sentencia inválida que comienza con ID");
        }
    }

    analizarReturn() {
        this.esperar('PR', 'return');
        this.analizarExpresion();
        this.esperar('DELIM', ';');
    }

    analizarPrint() {
        this.esperar('PRINT');
        this.esperar('DELIM', '(');
        this.analizarExpresion();
        this.esperar('DELIM', ')');
        this.esperar('DELIM', ';');
    }

    analizarArgumentos() {
        this.analizarExpresion();
        
        while (this.coincidir('DELIM', ',')) {
            this.analizarExpresion();
        }
    }

    analizarExpresion() {
        this.analizarExpresionSimple();
        
        if (this.tipoActual === 'OP_ARIT' && this.lexemaActual === '+') {
            this.analizarExpresionConcatenacion();
        }
    }

    analizarExpresionSimple() {
        if (this.tipoActual === 'ID' || this.tipoActual === 'ENTERO' || 
            this.tipoActual === 'REAL' || this.tipoActual === 'CADENA' || 
            this.tipoActual === 'CARACTER') {
            
            if (this.tipoActual === 'ID' && this.mirarSiguiente()?.lexema === '.') {
                this.analizarLlamadaMetodoExpresion();
            } else {
                this.avanzar();
            }
        } else {
            this.error("Se esperaba una expresión simple (ID, número, cadena o carácter)");
        }
    }

    analizarExpresionConcatenacion() {
        while (this.coincidir('OP_ARIT', '+')) {
            this.analizarExpresionSimple();
        }
    }

    analizarLlamadaMetodoExpresion() {
        this.esperar('ID');
        
        while (this.coincidir('DELIM', '.')) {
            this.esperar('ID');
        }
        
        this.esperar('DELIM', '(');
        
        if (this.tipoActual !== 'DELIM' || this.lexemaActual !== ')') {
            this.analizarArgumentos();
        }
        
        this.esperar('DELIM', ')');
    }

    analizarSentenciaAsignacionThis() {
        this.esperar('PR', 'this');
        this.esperar('DELIM', '.');
        this.esperar('ID');
        this.esperar('OP_ASIGN', '=');
        this.esperar('ID');
        this.esperar('DELIM', ';');
    }
}

// ========== FUNCIONES DE INTERFAZ ==========
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

function mostrarResultadoSintactico(erroresSintacticos) {
    const resultadoDiv = document.getElementById('resultado-sintactico');
    resultadoDiv.innerHTML = '';
    
    if (erroresSintacticos.length === 0) {
        resultadoDiv.innerHTML = `<div class="success">Análisis sintáctico completado sin errores</div>`;
    } else {
        let html = `<div class="error">Se encontraron ${erroresSintacticos.length} error(es) sintáctico(s):</div><ul>`;
        erroresSintacticos.forEach(error => {
            html += `<li class="error">Línea ${error.linea}, Columna ${error.columna}: ${error.mensaje}<br>
                    <small>Token encontrado: ${error.tokenEncontrado}</small></li>`;
        });
        html += '</ul>';
        resultadoDiv.innerHTML = html;
    }
}

// ========== FUNCIÓN PRINCIPAL ==========
function ejecutarAnalisis() {
    const codigo = document.getElementById('editor-codigo').value;
    
    limpiarTablas();
    
    if (!codigo.trim()) {
        document.getElementById('resultado-analisis').innerHTML = 
            '<div class="error">Por favor, ingresa código para analizar</div>';
        return;
    }
    
    document.getElementById('resultado-analisis').innerHTML = '<div>Analizando código...</div>';
    
    setTimeout(() => {
        const resultadoLexico = analizadorLexico(codigo);
        inferirTipos(resultadoLexico.tokens, resultadoLexico.simbolos);
        
        llenarTablaLexemas(resultadoLexico.tokens);
        llenarTablaErrores(resultadoLexico.errores);
        llenarTablaSimbolos(resultadoLexico.simbolos);
        
        if (resultadoLexico.errores.length > 0) {
            document.getElementById('resultado-analisis').innerHTML = 
                `<div class="error">Análisis léxico completado con ${resultadoLexico.errores.length} error(es)</div>`;
        } else {
            document.getElementById('resultado-analisis').innerHTML = 
                `<div class="success">Análisis léxico completado. ${resultadoLexico.tokens.length} tokens encontrados.</div>`;
        }
        
        if (resultadoLexico.errores.length === 0) {
            const parser = new AnalizadorSintactico(resultadoLexico.tokens);
            const erroresSintacticos = parser.analizarPrograma();
            mostrarResultadoSintactico(erroresSintacticos);
        }
    }, 100);
}

document.getElementById('btn-analizar').addEventListener('click', ejecutarAnalisis);