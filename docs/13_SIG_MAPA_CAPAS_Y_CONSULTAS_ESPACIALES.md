# 13 — SIG, mapa, capas y consultas espaciales

**Proyecto:** AtlasHabita

## 1. Objetivo SIG

El componente SIG permite que el usuario razone espacialmente. No basta con calcular un ranking: el usuario debe ver distribución territorial, patrones regionales, zonas comparables, accesibilidad y capas temáticas.

## 2. Componentes espaciales

| Componente | Uso |
|---|---|
| Geometrías municipales | Mapa base y agregación de indicadores. |
| Geometrías provinciales/CCAA | Filtros, zoom inicial y agregaciones. |
| Secciones censales | Análisis fino cuando el dato lo permita. |
| Puntos de interés | Servicios, competencia, educación, sanidad, transporte. |
| Capas de calor | Representar densidad o intensidad. |
| Leyendas | Interpretación visual del dato. |

## 3. Capas de mapa recomendadas

| Capa | Tipo | Finalidad |
|---|---|---|
| Score global | Coroplético | Mostrar encaje territorial del perfil activo. |
| Alquiler | Coroplético | Comparar coste de vivienda. |
| Renta | Coroplético | Contexto socioeconómico. |
| Conectividad | Coroplético | Viabilidad de teletrabajo. |
| Servicios básicos | Coroplético/POI | Familias y vida diaria. |
| Transporte | POI/red/agregado | Accesibilidad. |
| Turismo | Coroplético | Modo negocio. |
| Competencia comercial | POI/agregado | Modo emprendedor. |
| Entorno natural | Coroplético | Calidad de vida. |

## 4. Operaciones espaciales necesarias

| Operación | Uso en el proyecto |
|---|---|
| `contains` | Asignar POIs a municipios o secciones. |
| `intersects` | Detectar elementos que cruzan un territorio. |
| `within` | Verificar si un punto está dentro de un polígono. |
| `distance` | Calcular cercanía a estación, hospital o servicio. |
| `buffer` | Crear área de influencia alrededor de un punto o ruta. |
| `spatial join` | Agregar puntos o datos a territorios. |
| `simplify` | Reducir complejidad de geometrías para frontend. |
| `centroid` | Ubicar etiquetas o puntos representativos. |

## 5. Raster vs vectorial en el proyecto

El modelo vectorial debe usarse para límites administrativos, secciones censales, carreteras, estaciones, hospitales, colegios y negocios. Es adecuado porque representa entidades discretas con geometría explícita.

El modelo ráster o una aproximación por teselas puede usarse para mapas de calor, densidad, accesibilidad continua, clima o intensidad ambiental. En el MVP se puede evitar ráster pesado usando agregados por municipio o hexágonos, pero la documentación debe reconocer su utilidad.

## 6. Consultas espaciales de ejemplo

### Municipios con hospital dentro o cerca

```sql
SELECT m.codigo, m.nombre, COUNT(h.id) AS hospitales
FROM municipios m
LEFT JOIN hospitales h
  ON ST_Contains(m.geom, h.geom)
GROUP BY m.codigo, m.nombre;
```

### Municipios a menos de 10 km de una estación

```sql
SELECT DISTINCT m.codigo, m.nombre
FROM municipios m
JOIN estaciones e
  ON ST_DWithin(m.geom::geography, e.geom::geography, 10000);
```

### Agregación de POIs por municipio

```sql
SELECT m.codigo, p.tipo, COUNT(*) AS total
FROM municipios m
JOIN pois p
  ON ST_Contains(m.geom, p.geom)
GROUP BY m.codigo, p.tipo;
```

## 7. Requisitos de UX del mapa

1. El mapa debe tener una capa principal clara.
2. La leyenda debe explicar unidad y rango.
3. Los tooltips deben mostrar nombre, score e indicador seleccionado.
4. El usuario debe poder hacer zoom sin perder contexto.
5. El ranking y el mapa deben sincronizar selección.
6. Los colores no deben ser el único mecanismo de significado.
7. La ficha debe abrirse desde mapa o ranking.

## 8. Riesgos SIG

| Riesgo | Mitigación |
|---|---|
| Geometrías muy pesadas | Simplificar y usar niveles de detalle. |
| Operaciones espaciales lentas | Precalcular agregados. |
| CRS inconsistentes | Normalizar CRS en ingesta. |
| POIs mal ubicados | Validar coordenadas y fuente. |
| Mapa sobrecargado | Capas activables y leyenda simple. |
