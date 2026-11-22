# Exoplanetas IA — Aplicación web

Interfaz gráfica para usar el servicio de IA [exoplanetas-api](https://github.com/lgabs5888/exoplanetas-api). Permite clasificar estrellas a partir de su curva de luz, revisar el historial, ver las métricas del modelo y reentrenarlo.

Proyecto final de **Taller de Sistemas Inteligentes**:

| Repositorio | Contenido |
|---|---|
| [exoplanetas-ia](https://github.com/lgabs5888/exoplanetas-ia) | Notebooks de entrenamiento y evaluación (CRISP-ML(Q)) |
| [exoplanetas-api](https://github.com/lgabs5888/exoplanetas-api) | Servicio de IA con API REST |
| **exoplanetas-web** (este) | Aplicación web cliente |

## Funciones y endpoints que consume

| Pestaña | Qué hace | Endpoints |
|---|---|---|
| **Predecir** | Sube un CSV, o usa uno de ejemplo, y muestra el resultado, la probabilidad y la curva de luz de cada estrella | `POST /predicciones/archivo`, `GET /predicciones/{id}` |
| **Historial** | Tabla paginada de predicciones previas, con filtro "solo con planeta". Al hacer clic se ven los datos enviados graficados | `GET /predicciones`, `GET /predicciones/{id}` |
| **Métricas del modelo** | AP, recall, precisión y F1, matrices de confusión (validación cruzada, prueba y uso real) y versiones con opción de activar | `GET /modelo/metricas`, `GET /modelo/versiones`, `PUT /modelo/versiones/{id}/activar` |
| **Entrenamiento** | Envía un archivo de entrenamiento, solicita el reentrenamiento y sigue su avance | `POST /entrenamiento/archivos`, `GET /entrenamiento/archivos`, `POST /modelo/reentrenar`, `GET /modelo/versiones/{id}` |
| Cabecera | Estado de la conexión y versión activa del modelo | `GET /salud` |

El endpoint `POST /predicciones` (JSON) también está en el cliente de la API (`js/api.js`), para integraciones.

## Tecnología

HTML, CSS y JavaScript sin frameworks ni dependencias:
- `index.html`: estructura y pestañas.
- `js/api.js`: una función por endpoint de la API.
- `js/app.js`: lógica de cada pestaña.
- `js/graficos.js`: curva de luz y matriz de confusión en SVG.
- `ejemplos/`: estrellas reales del conjunto de prueba de Kepler para la demostración.

## Ejecución

1. Levanta la API (ver [exoplanetas-api](https://github.com/lgabs5888/exoplanetas-api)) en `http://localhost:8000`.
2. Sirve esta carpeta con cualquier servidor estático:

```bash
git clone https://github.com/lgabs5888/exoplanetas-web.git
cd exoplanetas-web
python -m http.server 5500
```

3. Abre `http://localhost:5500`. La URL de la API se puede cambiar en la cabecera de la página y se recuerda en el navegador.

> No abras `index.html` con doble clic (`file://`): el navegador bloquea la carga de los archivos de ejemplo. Usa el servidor del paso 2.

## Archivos de ejemplo

| Archivo | Contenido |
|---|---|
| `ejemplos/estrella_con_planeta.csv` | 1 estrella con exoplaneta confirmado (sin LABEL) |
| `ejemplos/estrella_sin_planeta.csv` | 1 estrella sin exoplaneta (sin LABEL) |
| `ejemplos/lote_10_estrellas.csv` | 10 estrellas con LABEL: 3 con planeta y 7 sin planeta |
| `ejemplos/entrenamiento_reducido.csv` | Archivo de entrenamiento para probar el reentrenamiento: las 37 estrellas con planeta y 400 sin planeta de `exoTrain.csv` |

Para reentrenar con el conjunto completo, descarga `exoTrain.csv` de [Kaggle](https://www.kaggle.com/datasets/keplersmachines/kepler-labelled-time-series-data) y envíalo desde la pestaña **Entrenamiento**.
