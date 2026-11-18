# Portafolio de proyectos de ciencia de datos para retail

Proyectos aplicados a decisiones típicas del retail: quién va a comprar, cuánto responde la demanda al precio y a quién conviene darle un descuento.

Cada proyecto parte de una pregunta de negocio y termina en una recomendación, con sus supuestos y limitaciones a la vista.

## Proyectos

| Proyecto | Pregunta de negocio | Enfoque | Hallazgo |
|---|---|---|---|
| [Propensión de compra y elasticidad de precio](purchase-propensity-price-elasticity/README.md) | ¿Qué visitas terminarán en compra, de qué marca, cuánto responde la compra al precio y a quién conviene darle un descuento? | Selección de variables, validación temporal, LightGBM y XGBoost con ajuste fino, segmentación, elección de marca multinomial y elasticidades por segmento y por marca | Un XGBoost de 4 variables de historia logra un Gini de 0.448 fuera de tiempo y 51.4 % de compra con un cupo de 20 %, frente a 25.2 % al azar. La marca más barata es muy sensible a su precio (−6.8) y la premium casi no lo es (−0.5) |

## Criterios de trabajo

- **Primero la decisión de negocio,** y después el modelo.
- **Validación acorde al uso real,** sin información que no existiría al momento de decidir.
- **Comparación contra alternativas simples** antes de aceptar más complejidad.
- **Resultados reproducibles,** con semillas y versiones de librerías definidas.
- **Limitaciones explícitas,** incluidas las que debilitan el resultado.

## Organización del repositorio

```
retail-data-science-portfolio/
└── purchase-propensity-price-elasticity/   Propensión de compra y elasticidad de precio
```

Cada proyecto tiene sus propias dependencias. Los datos y los entornos virtuales no se versionan, y las instrucciones para obtener los datos están en el README de cada proyecto.
