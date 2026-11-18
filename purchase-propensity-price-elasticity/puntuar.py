"""Puntúa la próxima visita de cada cliente con los modelos entrenados en el notebook.

Uso:
    python puntuar.py --historial data/compras_data.csv --salida puntuaciones.csv

El historial tiene el formato de compras_data.csv. La última fila de cada cliente es la visita
que se quiere puntuar, con los precios y promociones de ese día. Sus columnas de resultado
(incidencia_compra, id_marca, cantidad) pueden venir vacías, porque las variables solo usan
visitas anteriores.

Salida: una fila por cliente con la probabilidad de compra (p_compra), la probabilidad de comprar
cada marca (p_marca_1 a p_marca_5) y su segmento.
"""
import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

MARCAS = range(1, 6)
PRECIOS = [f'precio_marca_{m}' for m in MARCAS]
PROMOS = [f'promo_marca_{m}' for m in MARCAS]
CUOTAS = [f'cuota_marca_{m}' for m in MARCAS]
DEMO = ['genero', 'estado_civil', 'edad', 'nivel_educacion', 'ingreso_anual', 'ocupacion']
RESULTADO = ['incidencia_compra', 'id_marca', 'cantidad']
REQUERIDAS = ['id', 'dia_visita'] + RESULTADO + PRECIOS + PROMOS + DEMO
MODELO_POR_DEFECTO = Path(__file__).with_name('modelo') / 'modelo_propension.joblib'


def construir_variables(historial, prior, suavizado, dias_max):
    """Variables de cada visita calculadas solo con las visitas anteriores del cliente."""
    d = historial.sort_values(['id', 'dia_visita'], kind='stable').reset_index(drop=True)
    d[RESULTADO] = d[RESULTADO].fillna(0)
    g = d.groupby('id')
    # Se recalculan desde el historial; en el archivo original equivalen a ultima_marca_comprada
    # (marca de la visita anterior) y ultima_cantidad_comprada (0/1 de compra en la visita anterior)
    d['ultima_marca_comprada'] = g['id_marca'].shift().fillna(0).astype(int)
    d['compro_visita_anterior'] = g['incidencia_compra'].shift().fillna(0).astype(int)
    d['n_visitas_previas'] = g.cumcount()
    d['compras_previas'] = g['incidencia_compra'].cumsum() - d['incidencia_compra']
    d['tasa_historica'] = (d['compras_previas'] + suavizado * prior) / (d['n_visitas_previas'] + suavizado)
    d['dias_desde_visita'] = g['dia_visita'].diff().fillna(0)
    dia_compra = d['dia_visita'].where(d['incidencia_compra'] == 1)
    ultima = dia_compra.groupby(d['id']).transform(lambda s: s.ffill().shift())
    d['dias_desde_compra'] = (d['dia_visita'] - ultima).fillna(dias_max).clip(upper=dias_max)
    # Cuota histórica de cada marca en las compras anteriores (lealtad)
    conteo = np.column_stack([(d['id_marca'] == m).astype(int).groupby(d['id']).cumsum() - (d['id_marca'] == m).astype(int)
                              for m in MARCAS])
    total = conteo.sum(axis=1, keepdims=True)
    d[CUOTAS] = np.where(total > 0, conteo / np.maximum(total, 1), 1 / len(MARCAS))
    return d


def puntuar(historial, artefactos):
    """Devuelve las probabilidades de la última visita de cada cliente."""
    faltan = [c for c in REQUERIDAS if c not in historial.columns]
    if faltan:
        raise ValueError(f'Faltan columnas en el historial: {faltan}')
    d = construir_variables(historial, artefactos['prior'], artefactos['suavizado'], artefactos['dias_max'])
    ultima = d.groupby('id').tail(1)
    p_compra = artefactos['propension'].predict_proba(ultima[artefactos['vars_propension']])[:, 1]
    p_eleccion = artefactos['marca'].predict_proba(ultima[artefactos['vars_marca']])
    etiqueta = artefactos['kmeans'].predict(artefactos['escalador_segmento'].transform(ultima[DEMO]))
    segmento = [artefactos['nombres'][artefactos['orden_segmentos'][int(k)]] for k in etiqueta]
    salida = pd.DataFrame({'id': ultima['id'].to_numpy(), 'dia_visita': ultima['dia_visita'].to_numpy(),
                           'segmento': segmento, 'p_compra': p_compra})
    for m in MARCAS:
        salida[f'p_marca_{m}'] = p_compra * p_eleccion[:, m - 1]
    return salida


def main():
    parser = argparse.ArgumentParser(description='Puntúa la próxima visita de cada cliente.')
    parser.add_argument('--historial', required=True, help='CSV con el formato de compras_data.csv')
    parser.add_argument('--salida', required=True, help='CSV de salida con las probabilidades')
    parser.add_argument('--modelo', default=str(MODELO_POR_DEFECTO), help='Archivo .joblib generado por el notebook')
    args = parser.parse_args()

    artefactos = joblib.load(args.modelo)
    historial = pd.read_csv(args.historial)
    resultado = puntuar(historial, artefactos)
    resultado.to_csv(args.salida, index=False)
    print(f'Modelo versión {artefactos["version"]}, entrenado hasta el día {artefactos["entrenado_hasta_dia"]}')
    print(f'{len(resultado):,} clientes puntuados | p_compra media {resultado["p_compra"].mean():.1%} | salida: {args.salida}')


if __name__ == '__main__':
    main()
