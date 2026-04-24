# 14 — Motor de recomendación y Data Mining

**Proyecto:** AtlasHabita

## 1. Objetivo

El motor de recomendación transforma indicadores territoriales en rankings explicables. La prioridad del MVP es la explicabilidad, no la sofisticación opaca. El usuario debe comprender por qué una zona aparece recomendada.

## 2. Modelo de scoring inicial

El score global se calcula como suma ponderada de sub-scores normalizados:

```text
score(t, p) = Σ peso(p, i) × normalizado(valor(t, i))
```

Donde:

- `t` es el territorio.
- `p` es el perfil de decisión.
- `i` es el indicador.
- `peso(p, i)` es el peso del indicador para el perfil.
- `normalizado(valor(t, i))` transforma el indicador a escala común.

## 3. Normalización

| Tipo de indicador | Dirección | Normalización |
|---|---|---|
| Renta | Mayor puede ser mejor para capacidad económica | min-max o percentil. |
| Alquiler | Menor suele ser mejor | normalización invertida. |
| Conectividad | Mayor es mejor | min-max o umbral. |
| Servicios | Mayor es mejor hasta saturación | log o clipping. |
| Competencia | Depende del negocio | penalización si excesiva. |
| Turismo | Mayor es mejor para algunos negocios | percentil. |
| Contaminación | Menor es mejor | invertida. |

## 4. Perfiles iniciales

| Perfil | Variables prioritarias | Variables penalizadoras |
|---|---|---|
| Estudiante | Alquiler bajo, transporte, servicios, ocio, conectividad. | Coste alto, aislamiento. |
| Familia | Educación, sanidad, seguridad, servicios, estabilidad. | Falta de servicios, coste excesivo. |
| Teletrabajo | Fibra/5G, vivienda, entorno, servicios, movilidad ocasional. | Mala conectividad, aislamiento extremo. |
| Emprendedor | Demanda, turismo, renta, movilidad, competencia equilibrada. | Competencia excesiva, baja demanda. |
| General | Balance entre vivienda, servicios, movilidad y renta. | Datos faltantes críticos. |

## 5. Explicabilidad

Cada resultado debe incluir:

```json
{
  "territory": "Sevilla",
  "profile": "student",
  "score": 82.4,
  "explanation": {
    "positive": [
      "Buena disponibilidad de transporte",
      "Alta oferta de servicios cotidianos",
      "Conectividad elevada"
    ],
    "negative": [
      "Alquiler por encima de la media",
      "Mayor presión turística en algunas zonas"
    ],
    "contributions": [
      {"factor": "transport", "weight": 0.25, "normalized": 0.91, "impact": 22.75},
      {"factor": "rent", "weight": 0.30, "normalized": 0.62, "impact": 18.60}
    ]
  }
}
```

## 6. Tratamiento de nulos

Un dato nulo puede tratarse de tres formas:

1. Excluir el indicador del cálculo y reescalar pesos.
2. Imputar con media territorial superior y marcar incertidumbre.
3. Penalizar si el indicador es crítico.

La decisión debe depender del perfil y del tipo de indicador. Para conectividad en teletrabajo, un nulo puede ser crítico. Para turismo en perfil familia, puede ser irrelevante.

## 7. Evaluación del motor

El motor debe evaluarse con:

- Pruebas de coherencia: si sube un indicador positivo, el score no debe bajar.
- Pruebas de sensibilidad: cambios razonables de pesos producen cambios comprensibles.
- Casos manuales: comparar ciudades conocidas y revisar si la explicación tiene sentido.
- Detección de outliers: revisar territorios con scores extremos.
- Análisis de cobertura: porcentaje de territorios con score confiable.

## 8. Posible evolución avanzada

Tras el MVP, se pueden estudiar:

- Clustering de municipios por estilo de vida.
- Reglas de asociación entre variables territoriales.
- Modelos de aprendizaje supervisado si se dispone de etiquetas externas.
- Recomendación híbrida basada en preferencias de usuarios.
- Simulación de escenarios: subida de alquiler, mejora de conectividad, nuevas estaciones.

## 9. Criterio de aceptación

El motor es aceptable si produce rankings reproducibles, explicaciones comprensibles, contribuciones numéricas y advertencias de datos faltantes. Un ranking sin explicación no cumple la especificación.
