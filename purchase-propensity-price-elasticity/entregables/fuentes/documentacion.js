const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType,
  HeadingLevel, WidthType, ShadingType, BorderStyle, LevelFormat, Footer, PageNumber, TableLayoutType,
} = require('docx');

const RAIZ = 'C:/Portafolio/retail-data-science-portfolio/purchase-propensity-price-elasticity';
const SALIDA = path.join(RAIZ, 'entregables', 'documentacion.docx');
const AZUL = '2A78D6', FONDO = 'F4F3EF', LINEA = 'DCDAD4', SUAVE = '5B5A56', TINTA = '22211F';
const ANCHO = 9638; // A4 con márgenes de 2 cm, en DXA
const FUENTE = 'Calibri';

// --- Texto con **negrita** y `código` ---
function runs(texto, opts = {}) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean);
  return partes.map((p) => {
    if (p.startsWith('**')) return new TextRun({ font: FUENTE, ...opts, text: p.slice(2, -2), bold: true });
    if (p.startsWith('`')) return new TextRun({ text: p.slice(1, -1), font: 'Consolas', size: (opts.size || 20) - 2, ...opts, color: opts.color || TINTA });
    return new TextRun({ text: p, font: FUENTE, ...opts });
  });
}
const P = (t, opts = {}) => new Paragraph({ children: runs(t, opts.run || {}), spacing: { after: 100, line: 276 }, alignment: opts.align, keepNext: opts.keepNext });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t })] });
const B = (t) => new Paragraph({ numbering: { reference: 'vinetas', level: 0 }, children: runs(t), spacing: { after: 60, line: 264 } });
const PIE = (t) => new Paragraph({ children: runs(t, { size: 17, color: SUAVE, italics: true }), spacing: { after: 160 } });
const CODIGO = (lineas) => lineas.map((l, i) => new Paragraph({
  children: [new TextRun({ text: l === '' ? ' ' : l, font: 'Consolas', size: 15 })],
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: FONDO },
  spacing: { after: 0, line: 220, before: i === 0 ? 60 : 0 },
  keepLines: true, keepNext: i < lineas.length - 1,
}));

// --- Tablas ---
const borde = { style: BorderStyle.SINGLE, size: 4, color: LINEA };
const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
function tabla(filas, anchos, { derecha = [], destacar = [] } = {}) {
  const total = anchos.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: anchos, layout: TableLayoutType.FIXED,
    rows: filas.map((fila, r) => new TableRow({
      tableHeader: r === 0, cantSplit: true,
      children: fila.map((celda, c) => new TableCell({
        width: { size: anchos[c], type: WidthType.DXA },
        shading: r === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: FONDO } : undefined,
        margins: { top: 50, bottom: 50, left: 90, right: 90 },
        borders: { top: r === 0 ? borde : sinBorde, bottom: borde, left: sinBorde, right: sinBorde },
        children: [new Paragraph({
          alignment: derecha.includes(c) ? AlignmentType.RIGHT : AlignmentType.LEFT,
          spacing: { after: 0, line: 240 },
          children: runs(String(celda), { size: 17, bold: r === 0 || destacar.includes(r) }),
        })],
      })),
    })),
  });
}
const espacio = () => new Paragraph({ children: [], spacing: { after: 60 } });

function caja(titulo, vinetas) {
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: ANCHO, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: FONDO },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      borders: { left: { style: BorderStyle.SINGLE, size: 24, color: AZUL }, top: sinBorde, bottom: sinBorde, right: sinBorde },
      children: [new Paragraph({ children: runs(`**${titulo}**`), spacing: { after: 80 } }), ...vinetas.map(B)],
    })] })],
  });
}

function kpis(items) {
  const w = Math.floor(ANCHO / items.length);
  const anchos = items.map(() => w);
  return new Table({
    width: { size: w * items.length, type: WidthType.DXA }, columnWidths: anchos, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ cantSplit: true, children: items.map(([valor, texto]) => new TableCell({
      width: { size: w, type: WidthType.DXA },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      borders: { top: borde, bottom: borde, left: borde, right: borde },
      children: [
        new Paragraph({ children: [new TextRun({ text: valor, bold: true, size: 32, color: AZUL, font: FUENTE })], spacing: { after: 40 } }),
        new Paragraph({ children: runs(texto, { size: 16, color: SUAVE }), spacing: { after: 0 } }),
      ],
    })) })],
  });
}

// --- Imágenes con su proporción real ---
function diagrama(nombre, anchoCm) {
  const datos = fs.readFileSync(path.join(__dirname, nombre));
  const w = datos.readUInt32BE(16), h = datos.readUInt32BE(20);
  const anchoPx = Math.round(anchoCm / 2.54 * 96);
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 },
    children: [new ImageRun({ type: 'png', data: datos, transformation: { width: anchoPx, height: Math.round(anchoPx * h / w) },
      altText: { title: nombre, description: 'Diagrama de la solución', name: nombre } })] });
}
function imagen(nombre, anchoCm, pie) {
  const datos = fs.readFileSync(path.join(RAIZ, 'img', nombre));
  const w = datos.readUInt32BE(16), h = datos.readUInt32BE(20);
  const anchoPx = Math.round(anchoCm / 2.54 * 96);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 80, after: 40 },
      children: [new ImageRun({ type: 'png', data: datos, transformation: { width: anchoPx, height: Math.round(anchoPx * h / w) },
        altText: { title: pie, description: pie, name: nombre } })] }),
    PIE(pie),
  ];
}

const contenido = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Propensión de compra y pricing' })] }),
  new Paragraph({ children: [new TextRun({ text: 'Documentación de la solución: objetivos, arquitectura, metodología y resultados', color: SUAVE, size: 24, font: FUENTE })],
    spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINEA, space: 6 } } }),

  H1('1. Resumen ejecutivo'),
  P('Se construyó una solución que estima, para cada visita de un cliente a la tienda, la probabilidad de que compre en la categoría y la probabilidad de que compre cada una de sus 5 marcas. Además, mide cuánto responde la compra al precio. La solución se validó en los últimos seis meses de datos, que no se usaron para construirla.'),
  kpis([
    ['0.448', 'Gini fuera de tiempo del modelo de propensión (IC 95 %: 0.406 a 0.488)'],
    ['51.4 %', 'de compra en el 20 % de visitas mejor puntuadas, frente a 25.2 % al azar'],
    ['−3.3', 'elasticidad de corto plazo de la compra al precio medio de la categoría'],
    ['78.5 %', 'de las compras son de la marca que el cliente ya prefería'],
  ]),
  espacio(),
  caja('Recomendaciones', [
    'Usar el modelo de propensión, de solo 4 variables, para priorizar acciones comerciales con cupos de 20 % o más de las visitas.',
    'No bajar el precio general: aumenta las compras, pero reduce el margen. Probar un aumento moderado con un diseño controlado, empezando por la marca 5, la menos sensible a su precio.',
    'No dar descuentos a quienes más probablemente compran: se subsidian compras que ocurrirían igual. Si se ofrecen, deben dirigirse a visitas de baja propensión en los segmentos sensibles al precio, dentro de un piloto con grupo de control.',
  ]),

  H1('2. Objetivos'),
  tabla([
    ['Tipo', 'Objetivo', 'Cómo se mide'],
    ['Negocio', 'Anticipar qué clientes comprarán, y qué producto, para dirigir acciones comerciales', 'Tasa de compra y captura en el cupo, frente al azar y a una regla simple'],
    ['Negocio', 'Entender cómo responde la demanda al precio para decidir precios y promociones', 'Elasticidad por segmento y por marca, con intervalos de confianza'],
    ['Negocio', 'Traducir los modelos en decisiones con valor económico medible', 'Margen incremental y KPIs por área, medidos con grupo de control'],
    ['Técnico', 'Un modelo sin fuga de información, estable en el tiempo e interpretable', 'Validación temporal, PSI, SHAP y prueba fuera de tiempo'],
    ['Técnico', 'Una solución reproducible y operable', 'Notebook que se ejecuta de principio a fin y script de puntuación'],
  ], [1100, 4500, 4038]),

  H1('3. Datos y calidad'),
  P('El archivo `compras_data.csv` tiene 58,693 visitas de 500 clientes durante 730 días. Cada fila incluye si hubo compra, la marca y la cantidad, el precio y la promoción del día de 5 marcas de una categoría y el perfil del cliente. La tasa de compra es 24.9 %.'),
  tabla([
    ['Revisión', 'Resultado', 'Tratamiento'],
    ['Nulos, duplicados y coherencia entre compra, marca y cantidad', 'Sin problemas', 'Ninguno'],
    ['Precio y promoción', 'Iguales para todos los clientes de un mismo día', 'Se tratan como variables del día; la elasticidad se remuestrea por días'],
    ['`ultima_marca_comprada`', 'Es la marca de la **visita anterior** (100 % de coincidencia), no la de la última compra', 'Se usa con su significado real'],
    ['`ultima_cantidad_comprada`', 'Es un indicador 0/1 de compra en la visita anterior (100 %), no una cantidad (81.2 %)', 'Se renombra como `compro_visita_anterior`'],
    ['Días 728 a 730', '139 visitas y 0 compras; con una tasa de 25 %, la probabilidad es 4 × 10⁻¹⁸', 'Registro incompleto: se excluyen'],
    ['`tamanio_ciudad`', 'El diccionario indica no considerarla', 'Excluida'],
    ['`id_marca` y `cantidad`', 'Son el resultado de la visita', 'Excluidas como predictores (fuga de información)'],
  ], [2900, 3700, 3038]),

  H1('4. Arquitectura de la solución'),
  H2('4.1 Lógica analítica'),
  diagrama('diagrama_logica.png', 17),
  H2('4.2 Despliegue propuesto en la nube'),
  P('El diseño separa el entrenamiento mensual de la puntuación diaria. Puede implementarse con servicios administrados de cualquier proveedor.'),
  diagrama('diagrama_nube.png', 17),
  espacio(),
  tabla([
    ['Componente', 'AWS', 'Azure', 'Google Cloud'],
    ['Almacenamiento', 'S3', 'Data Lake Storage', 'Cloud Storage'],
    ['Variables y orquestación', 'Glue, Step Functions', 'Data Factory', 'Dataflow, Cloud Composer'],
    ['Entrenamiento y registro', 'SageMaker', 'Azure Machine Learning', 'Vertex AI'],
    ['Puntuación', 'Endpoint de SageMaker o Lambda', 'Endpoint administrado', 'Endpoint de Vertex AI'],
    ['Monitoreo', 'CloudWatch y QuickSight', 'Azure Monitor y Power BI', 'Cloud Monitoring y Looker'],
  ], [2300, 2500, 2400, 2438]),
  H2('4.3 Cómo opera'),
  tabla([
    ['Aspecto', 'Decisión', 'Por qué'],
    ['Puntuación', 'Lote nocturno con los precios del día siguiente; API en línea solo si la oferta se muestra en el momento de la visita', 'Hay unas 80 visitas por día: un lote basta para el CRM'],
    ['Latencia en línea', 'Milisegundos por cliente', '4 variables y árboles de 2 niveles; la historia del cliente se precalcula cada noche'],
    ['Reentrenamiento', 'Mensual, o antes si el PSI del score supera 0.25', 'El entrenamiento completo toma unos 2 minutos'],
    ['Versiones', 'Cada modelo se registra con su ficha; reemplaza al vigente solo si no ordena peor en el último mes, evaluado fuera de tiempo', 'Misma lógica de campeón y retador del análisis'],
    ['Datos personales', 'Perfil cifrado y con acceso por roles; las salidas usan el `id`', 'El modelo de propensión no usa género, edad ni ingreso'],
    ['Costo', 'Bajo: sin GPU, una instancia pequeña bajo demanda y almacenamiento de objetos', 'Volumen pequeño y entrenamiento corto'],
  ], [1800, 4400, 3438]),
  H2('4.4 Artefactos operables'),
  P('El notebook guarda en `modelo/modelo_propension.joblib` el modelo de propensión, el de elección de marca, la segmentación y los parámetros de las variables (367 KB). El script `puntuar.py` lo carga, reconstruye las variables desde el historial y devuelve, para la última visita de cada cliente, `p_compra`, `p_marca_1` a `p_marca_5` y el segmento. La última visita puede venir sin resultado, como ocurre con una visita futura. El notebook verifica que el script reproduzca exactamente sus probabilidades en los 500 clientes.'),
  ...CODIGO(['python puntuar.py --historial data/compras_data.csv --salida puntuaciones.csv']),
  espacio(),
  P('En la nube, este mismo script es el paso de puntuación del lote nocturno, y su función `puntuar` es el núcleo de una API en línea.'),

  H1('5. Metodología paso a paso'),
  tabla([
    ['#', 'Paso', 'Qué se hace y por qué'],
    ['1', 'Calidad de datos', 'Se contrasta cada columna con el diccionario y se detectan anomalías (sección 3).'],
    ['2', 'Variables sin fuga', '30 candidatas calculadas solo con visitas anteriores: tasa histórica de compra suavizada, días desde la última compra y visita, marca anterior y preferida, precios, promociones y perfil.'],
    ['3', 'Análisis exploratorio', 'Patrones de tiempo, precio, promociones, historia y perfil (sección 6.1).'],
    ['4', 'Diseño temporal', 'Tres bloques de desarrollo (días 274 a 547), cada uno evaluado con un modelo entrenado con los días anteriores. Los días 548 a 727 (13,331 visitas) se reservan como prueba fuera de tiempo (OOT).'],
    ['5', 'Segmentación', 'K-Means sobre el perfil demográfico estandarizado. El número de grupos se elige por estabilidad bootstrap (ARI).'],
    ['6', 'Selección de variables', 'Criterio experto, concentración (≤ 95 %), estabilidad (PSI ≤ 0.25), IV y Gini por bloque, coherencia de signo y correlación de Spearman (≤ 0.85) con VIF.'],
    ['7', 'Campeón, retadores y ajuste fino', 'Regla simple, logística, LightGBM y XGBoost; estos dos, con sus valores por defecto y con una búsqueda aleatoria de 20 combinaciones de hiperparámetros. En tres conjuntos de variables suman 16 configuraciones. Se elige con `robusto = media − desviación` del Gini y, dentro de una tolerancia de 0.01, el más simple.'],
    ['8', 'Evaluación OOT', 'Gini, precisión media, tasa en el cupo y bootstrap pareado por cliente para los intervalos.'],
    ['9', 'Calibración y sensibilidad', 'Calibración por decil, demanda semanal, validación aleatoria, clientes no vistos, grupos de variables y semillas.'],
    ['10', 'Interpretabilidad y equidad', 'SHAP, odds ratios y comparación por género, edad y segmento.'],
    ['11', 'Elasticidad de precio', 'Logística de respuesta al precio por segmento, con controles de historia, seis especificaciones de robustez, intervalos por remuestreo de días y una prueba de nivel fuera de tiempo.'],
    ['12', 'Elección de marca', 'Regresión multinomial con precios, promociones y lealtad; elasticidades propias y cruzadas; probabilidad de comprar cada marca.'],
    ['13', 'Captura de valor', 'Tabla por cupo, simulación de precios, estrategia de descuentos, KPIs por área y plan de monitoreo.'],
  ], [500, 2200, 6938]),

  H1('6. Resultados'),
  H2('6.1 Análisis exploratorio'),
  ...imagen('tasa_compra_mensual.png', 14, 'Figura 1. La tasa arranca baja con la tienda recién abierta y se estabiliza entre 23 % y 29 % desde el mes 4. En la prueba OOT el precio medio sube y la tasa no cae.'),
  ...imagen('eda_patrones.png', 14, 'Figura 2. La compra baja con el precio y sube con las promociones, pero la señal más fuerte es la historia del cliente.'),
  B('**Historia.** Tras una visita con compra, la tasa es 41.0 %; tras una sin compra, 19.7 %. La tasa de cada cliente se mantiene entre años (correlación de 0.76), y el 10 % de clientes que más compra concentra 32.1 % de las compras.'),
  B('**Marcas.** La marca 5, la más cara, es la más comprada (34.0 %), seguida de la marca 2 (31.0 %). Las marcas 1 y 2 están en promoción en cerca de un tercio de los días; las marcas 3 y 5 casi nunca.'),
  B('**Perfil.** La tasa sube con el ingreso (de 20.1 % a 31.5 % entre quintiles) y con la edad (de 20.0 % a 29.0 %), con diferencias menores que las de historia.'),
  H2('6.2 Segmentación'),
  P('Con 3 segmentos la agrupación es la más estable (ARI de 0.839). La silueta es baja (0.27): los segmentos son un resumen útil, no grupos naturales bien separados.'),
  tabla([
    ['Segmento', 'Clientes', 'Perfil', 'Tasa de compra', 'Elasticidad'],
    ['Jóvenes de menor ingreso', '187', '32 años, ingreso de 102 mil', '21.2 %', '−3.68'],
    ['Adultos de ingreso medio', '206', '37 años, ingreso de 119 mil', '26.5 %', '−4.16'],
    ['Mayores de mayor ingreso', '107', '55 años, ingreso de 160 mil, más educación', '28.8 %', '−0.58'],
  ], [2500, 1000, 3438, 1400, 1300], { derecha: [1, 3, 4] }),
  H2('6.3 Selección de variables'),
  P('De 30 candidatas quedan 8: tasa histórica, días desde la última compra, marca de la visita anterior, días desde la visita anterior, edad, ingreso, ocupación y segmento.'),
  B('**Todas las variables de precio salen.** Diez tienen un PSI de 0.65 a 10.5, porque el nivel de precios cambia por épocas, y las demás no separan a quienes compran. El precio es igual para todos en un día, así que no dice quién compra más. Su efecto se mide aparte, con el modelo de elasticidad.'),
  B('`n_visitas_previas` **es inestable por construcción** (PSI de 8.0): crece con la antigüedad de la tienda.'),
  B('`compro_visita_anterior` **sale por redundancia:** tiene una correlación de 0.988 con la marca de la visita anterior.'),
  H2('6.4 Modelo de propensión'),
  P('Solo podían ser elegidas las configuraciones que respetan la selección de variables. Ganó un **XGBoost ajustado con 4 variables de historia** (800 árboles de 2 niveles, tasa de aprendizaje de 0.03). LightGBM ajustado con las mismas variables queda a 0.003 de puntaje robusto: los dos algoritmos empatan en la práctica.'),
  tabla([
    ['Modelo', 'Variables', 'Gini desarrollo', 'Gini OOT (IC 95 %)', 'Compra en el 20 %'],
    ['Elegido: XGBoost ajustado, historia', '4', '0.485', '0.448 (0.406 a 0.488)', '51.4 %'],
    ['LightGBM ajustado, historia', '4', '0.483', '0.451 (0.410 a 0.491)', '51.3 %'],
    ['LightGBM ajustado, 30 candidatas', '30', '0.475', '0.440 (0.399 a 0.480)', '51.1 %'],
    ['Campeón: logística, 30 candidatas', '30', '0.476', '0.405 (0.360 a 0.449)', '50.0 %'],
    ['Regla: tasa histórica', '1', '0.454', '0.371 (0.320 a 0.418)', '48.4 %'],
    ['Azar', '0', '0', '0', '25.2 %'],
  ], [3238, 1000, 1500, 2300, 1600], { derecha: [1, 2, 3, 4], destacar: [1] }),
  ...imagen('curva_ganancia_oot.png', 11, 'Figura 3. Con el 20 % de las visitas se alcanza el 40.9 % de las compras.'),
  B('**Supera al campeón y a la regla**, con intervalos que excluyen el cero: +0.042 de Gini sobre el campeón y +0.077 sobre la regla. Frente a LightGBM con las mismas 4 variables, la diferencia es −0.003: un empate práctico.'),
  B('**Calibración buena:** predice 25.2 % y ocurre 25.2 %, y el Brier mejora 14 % frente a asignar la misma tasa a todos.'),
  B('**Robusto:** funciona igual con 100 clientes que no vio (Gini 0.390 frente a 0.391), no depende de la semilla (0.448 a 0.449) y empeora si se le agregan las variables de precio (0.431).'),
  B('**Interpretación:** la tasa histórica es la variable dominante. Una desviación más multiplica por 2.04 las chances de comprar.'),
  H2('6.5 Pricing: elasticidad de la compra'),
  ...imagen('elasticidad_segmentos.png', 15, 'Figura 4. Dos segmentos son muy sensibles al precio; los mayores de mayor ingreso casi no lo son.'),
  B('**Elasticidad total de −3.29** (IC por días de −4.75 a −0.74). Es negativa en las seis especificaciones probadas, incluidas las que controlan por trimestre o por mes.'),
  B('**Lo que importa es el precio de la categoría,** sobre todo el de las marcas baratas, no el de la marca habitual del cliente.'),
  B('**Prueba de nivel.** El modelo estimado en desarrollo anticipaba 23.3 % de compra en la prueba OOT, donde el precio fue 2.8 % más alto. Ocurrió 25.2 %. La elasticidad describe la respuesta de corto plazo (en qué día comprar), no la de un cambio sostenido.'),
  H2('6.6 Elección de marca y probabilidad por producto'),
  tabla([
    ['Marca', 'Participación', 'Elasticidad total a su precio', 'Gini OOT combinado', 'Gini OOT regla por marca'],
    ['1 (la más barata)', '9.2 %', '−6.79', '**0.529**', '0.515'],
    ['2', '31.0 %', '−2.44', '**0.627**', '0.560'],
    ['3', '5.7 %', 'No identificable', '0.755', '**0.790**'],
    ['4', '20.0 %', '−2.08', '0.784', '**0.798**'],
    ['5 (la más cara)', '34.0 %', '−0.51', '**0.863**', '0.842'],
  ], [2038, 1500, 2300, 1900, 1900], { derecha: [1, 2, 3, 4] }),
  espacio(),
  P('La marca la decide sobre todo la lealtad: la marca preferida del cliente acierta en 78.5 % de las compras, y el modelo multinomial reduce la log loss de 1.514 a 0.743. La marca 1 le quita clientes sobre todo a la marca 2. La marca 3 casi no cambia de precio, así que su elasticidad no se puede estimar.'),

  H1('7. Captura de valor'),
  H2('7.1 Priorizar visitas'),
  tabla([
    ['Cupo', 'Compra con el modelo', 'Compra con la regla', 'Diferencia (IC 95 %, puntos)', 'Captura de compras'],
    ['5 %', '68.9 %', '69.1 %', '−3.9 a +3.8', '13.7 %'],
    ['10 %', '63.8 %', '62.4 %', '−0.1 a +4.0', '25.4 %'],
    ['20 %', '51.4 %', '48.4 %', '+1.2 a +4.4', '40.9 %'],
    ['30 %', '44.8 %', '43.0 %', '+1.0 a +2.9', '53.4 %'],
    ['50 %', '37.0 %', '34.7 %', '+1.7 a +3.2', '73.4 %'],
  ], [1238, 2000, 2000, 2400, 2000], { derecha: [1, 2, 3, 4], destacar: [3] }),
  H2('7.2 Simular el precio general'),
  P('Con un margen bruto ilustrativo de 30 %, aplicando la elasticidad de cada segmento a las visitas OOT:'),
  tabla([
    ['Cambio de precio', 'Compras', 'Ingreso', 'Margen'],
    ['−5 %', '+14.3 %', '+8.1 %', '−5.2 %'],
    ['−1 %', '+2.7 %', '+1.6 %', '−0.8 %'],
    ['+1 %', '−2.7 %', '−1.6 %', '+0.7 %'],
    ['+5 %', '−12.7 %', '−7.8 %', '+2.4 %'],
  ], [3238, 2100, 2100, 2200], { derecha: [1, 2, 3] }),
  espacio(),
  P('Bajar precios gana volumen pero pierde margen. El aumento de margen con precios más altos viene de los mayores de mayor ingreso. Como la respuesta sostenida al precio parece menor que la de corto plazo, estas cifras son un límite superior de la caída de compras.'),
  H2('7.3 A quién darle un descuento de 5 %'),
  tabla([
    ['Estrategia (20 % de las visitas)', 'Compras incrementales', 'Compras subsidiadas', 'Margen incremental'],
    ['Mayor propensión', '113', '1,473', '−272'],
    ['Mayor aumento de probabilidad', '166', '1,008', '−50'],
    ['Mayor margen incremental', '111', '420', '+37'],
    ['Al azar', '95', '683', '−66'],
  ], [3638, 2000, 2000, 2000], { derecha: [1, 2, 3], destacar: [3] }),
  espacio(),
  P('Solo gana dinero la estrategia que elige visitas de baja propensión (15.7 %) en los segmentos sensibles al precio. La ganancia es pequeña y proviene de una elasticidad estimada, por eso debe validarse con un piloto.'),
  H2('7.4 Impacto por área e indicadores'),
  tabla([
    ['Área', 'Uso', 'Indicador de captura de valor', 'Cómo se mide'],
    ['Marketing y CRM', 'Ofertas personalizadas por visita y por marca', 'Margen incremental por oferta; costo por compra incremental', 'Grupo de control aleatorio sin oferta (10 % de las visitas elegibles)'],
    ['Pricing', 'Nivel de precio y calendario de promociones por marca', 'Margen bruto de la categoría; participación por marca', 'Pruebas de precio por días alternados o tiendas comparables'],
    ['Operaciones e inventario', 'Proyección de demanda total y por marca', 'Error de la proyección semanal; quiebres de stock; merma', 'Comparación con la proyección actual durante 8 semanas'],
    ['Finanzas', 'Presupuesto de descuentos', 'Retorno de la inversión en descuentos', 'Margen incremental ÷ costo del descuento, con grupo de control'],
    ['Ciencia de datos', 'Mantener los modelos vigentes', 'Gini, PSI del score, calibración, elasticidades', 'Monitoreo mensual (sección 8)'],
  ], [1700, 2500, 2700, 2738]),

  H1('8. Monitoreo y cronograma'),
  tabla([
    ['Indicador', 'Frecuencia', 'Acción'],
    ['PSI del score', 'Mensual', '> 0.25: reentrenar'],
    ['Gini del último mes', 'Mensual', '< 0.30: revisar variables'],
    ['Sesgo de la demanda semanal', 'Semanal', '> 10 %: recalibrar'],
    ['Elasticidad por segmento', 'Trimestral', 'Cambio de signo: reestimar'],
    ['Margen del grupo tratado frente al control', 'Por campaña', '< 0: suspender la oferta'],
  ], [4238, 2000, 3400]),
  espacio(),
  tabla([
    ['Semana', 'Fase', 'Entregable'],
    ['1', 'Entendimiento y calidad de datos', 'Diccionario corregido y reglas de calidad'],
    ['2', 'Análisis exploratorio y variables', 'Variables sin fuga y segmentación'],
    ['3 a 4', 'Modelos, elasticidad y elección de marca', 'Modelo elegido, ficha y elasticidades'],
    ['5', 'Despliegue piloto y tablero', 'Puntuación diaria y monitoreo'],
    ['6 a 13', 'Piloto con grupo de control', 'Margen incremental medido y decisión de escalar'],
  ], [1200, 4000, 4438]),

  H1('9. Limitaciones'),
  B('**La elasticidad es de corto plazo** y exagera el efecto de un cambio sostenido. El precio no fue asignado al azar.'),
  B('**Propensión no es efecto causal.** El margen incremental de los descuentos combina dos modelos y debe validarse con un grupo de control.'),
  B('**La elección del modelo no es ciega.** La regla que limita la elección a modelos con variables seleccionadas se definió después de una primera corrida, en la que la regla anterior elegía al campeón (Gini OOT de 0.405). XGBoost se agregó como retador en una revisión posterior, cuando ya se sabía que fuera de tiempo rendía igual que LightGBM; la regla lo eligió por una diferencia de 0.003 que es ruido.'),
  B('**Siempre son los mismos 500 clientes.** La prueba con 100 clientes no vistos es alentadora, pero pequeña.'),
  B('**Equidad.** El modelo ordena peor entre los jóvenes de menor ingreso (Gini 0.351), que reciben 14.3 % de las ofertas.'),
  B('**Sin cantidad.** No se modelan las unidades por compra. La marca 3 no es identificable para pricing.'),
  B('**Valores ilustrativos.** El margen de 30 % y el descuento de 5 % no provienen de la tienda.'),

  H1('10. Reproducibilidad'),
  P('Todo el análisis está en `nb_01_propension_elasticidad.ipynb`. Se ejecuta de principio a fin en unos tres minutos con Python 3.14 y, con `SEMILLA = 42`, reproduce todas las cifras de este documento. Las dependencias, con sus versiones exactas, están en `requirements_purchase-propensity-price-elasticity.txt`.'),
  ...CODIGO([
    'python -m venv venv-purchase-propensity-price-elasticity',
    'venv-purchase-propensity-price-elasticity\\Scripts\\python.exe -m pip install -r requirements_purchase-propensity-price-elasticity.txt',
    '# Copiar compras_data.csv en data/, abrir el notebook con ese kernel y ejecutar todas las celdas',
  ]),
  espacio(),
  P('Librerías: pandas, NumPy, scikit-learn, LightGBM, XGBoost, joblib y Matplotlib.'),
];

const doc = new Document({
  creator: 'Ciencia de datos', title: 'Documentación de la solución: propensión de compra y pricing',
  styles: {
    default: { document: { run: { font: FUENTE, size: 20, color: TINTA } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: FUENTE, size: 44, bold: true, color: TINTA }, paragraph: { spacing: { before: 0, after: 80 }, keepNext: true } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FUENTE, size: 28, bold: true, color: TINTA },
        paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FUENTE, size: 22, bold: true, color: TINTA },
        paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: 'Propensión de compra y pricing · ', size: 16, color: SUAVE, font: FUENTE }),
                 new TextRun({ children: [PageNumber.CURRENT], size: 16, color: SUAVE, font: FUENTE })] })] }) },
    children: contenido,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(SALIDA, buf); console.log('Escrito:', SALIDA); });
