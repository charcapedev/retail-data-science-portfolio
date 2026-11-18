import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

LOGICA = """Visitas (58,554) ──► Variables sin fuga (30 candidatas: historia, precio, perfil)
                                  │
         ┌────────────────────────┼─────────────────────────────┐
         ▼                        ▼                             ▼
Segmentación K-Means      Selección de variables        Variables de precio y lealtad
(3 segmentos)             (8 de 30)                             │
         │                        ▼                             ▼
         │          Modelo de propensión            Modelo de elección de marca
         │          P(compra) · XGBoost             P(marca | compra) · multinomial
         ▼                        └──────────────┬──────────────┘
Elasticidad por segmento                         ▼
(logística de respuesta)    P(compra de la marca j) = P(compra) × P(j | compra)
         └──────────────────┬────────────────────┘
                            ▼
    Decisiones: priorizar visitas · fijar precios · elegir a quién dar descuentos"""

NUBE = """Punto de venta, CRM y precios ──► Data lake (archivos crudos por día)
                                        │
                                        ▼
                Proceso diario de variables (historia, precio, segmento)
             ┌──────────────────────────┴───────────────────────────┐
             ▼                                                      ▼
  Entrenamiento mensual                                 Puntuación diaria o en línea
  (reentrena, compara con el vigente,                   (API para la app o la caja,
   registra versión y ficha)                             lote nocturno para el CRM)
             └──────────────► Registro de modelos ◄─────────────────┘
                                        │
                                        ▼
        Tablero de monitoreo: PSI, Gini, calibración y grupo de control"""

for nombre, texto in [('diagrama_logica.png', LOGICA), ('diagrama_nube.png', NUBE)]:
    lineas = texto.split('\n')
    ancho = max(len(l) for l in lineas)
    fig = plt.figure(figsize=(ancho * 0.0815 + 0.3, len(lineas) * 0.2 + 0.2))
    fig.patch.set_facecolor('#f4f3ef')
    fig.text(0.015, 0.5, texto, family='DejaVu Sans Mono', fontsize=9, va='center', ha='left', color='#22211f', linespacing=1.35)
    fig.savefig(nombre, dpi=200, facecolor=fig.get_facecolor())
    plt.close(fig)
    print(nombre)
