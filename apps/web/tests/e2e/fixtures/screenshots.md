# Capturas esperadas para E2E

Este documento describe las capturas de pantalla de referencia usadas en las pruebas Playwright. No contiene imágenes binarias para evitar deriva con el sistema de diseño; sirve como especificación ejecutable para el equipo.

Todas las capturas se toman en viewport `Desktop Chrome` (1280×720) según `apps/web/playwright.config.ts`. Los nombres de fichero siguen el patrón `<spec>-<step>.png` y se generan en `apps/web/test-results/` únicamente cuando el test falla (ver `screenshot: 'only-on-failure'`).

---

## Captura A · Dashboard principal (home.spec.ts)

**Objetivo:** demostrar que la ruta `/` renderiza la estructura base del producto.

| Zona                | Qué debe aparecer                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Sidebar izquierda   | Logo "AtlasHabita", navegación con `Mapa`, `Ranking`, `Ficha`, `Comparador`, `Fuentes`.        |
| Topbar              | Breadcrumb del análisis activo, selector de perfil y botón primario `Nuevo análisis`.          |
| Mapa                | `canvas` MapLibre o `region` con `aria-label=Mapa` mostrando al menos un polígono coroplético. |
| Panel de tendencias | Mínimo una tarjeta con título, indicador y delta visible.                                      |
| Estado              | Sin mensajes de error; si no hay backend, leyenda `Modo demo`.                                 |

Criterios de aceptación automáticos implementados en `home.spec.ts`:

1. El título principal (`h1`) es visible.
2. La marca `AtlasHabita` aparece en la cabecera.
3. Cada enlace/zona de navegación está presente.
4. El botón `Nuevo análisis` está visible y habilitado.
5. Existe un mapa renderizado (role `region` con nombre, label o `canvas`).
6. Existe al menos una tarjeta de tendencias (`region` con nombre, texto `tendencias` o un `article`).

---

## Captura B · Cambio de perfil (profile-flow.spec.ts)

**Objetivo:** confirmar que los controles visibles permiten cambiar el perfil activo y que la _ranking card_ se actualiza.

| Paso          | Qué se espera                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carga inicial | Se muestra el perfil por defecto y la ranking card con resultados ordenados.                                                                            |
| Interacción   | Cambio de perfil mediante `combobox`, `radiogroup` o `button` con el nombre del perfil destino (`Familia`, `Estudiante`, `Emprendedor`, `Teletrabajo`). |
| Resultado     | El contenido textual de la ranking card cambia respecto al estado inicial.                                                                              |

Criterios:

- El test **no** valida valores concretos de ranking (eso corresponde a los tests de dominio).
- El test sí valida que el DOM de la tarjeta se actualice dentro de 8 s tras el cambio.
- Si el flujo necesita backend real, se activa con `E2E_BACKEND=1` o `E2E_PROFILE_FLOW=1`.

---

## Captura C · Ficha territorial (fase 6)

**Objetivo:** documentar que al seleccionar un territorio en el ranking o el mapa, la ficha muestra indicadores, explicación y fuentes.

| Zona        | Qué debe aparecer                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Cabecera    | Nombre del territorio, tipo (`Municipio`), provincia y CCAA.                                     |
| Indicadores | Lista con etiqueta, valor, unidad, periodo y badge de calidad.                                   |
| Explicación | Resumen en lenguaje natural con al menos tres factores positivos y las penalizaciones aplicadas. |
| Fuentes     | Cada indicador enlaza con su `DataSource`, periodo y licencia.                                   |

Pendiente de especificación detallada hasta que exista la UI (milestone M5–M6).

---

## Captura D · Inspector de fuentes (fase 6)

**Objetivo:** confirmar que el inspector muestra título, licencia, periodo, fecha de ingesta y estado de calidad.

---

## Convenciones

- **Idioma:** todas las etiquetas visibles están en español.
- **Accesibilidad:** contraste mínimo AA y elementos interactivos operables con teclado.
- **Datos sensibles:** ninguna captura contiene PII; si un test usa datos reales, se anonimizan previamente.
- **Limpieza:** los artefactos de `test-results/` y `playwright-report/` no se commitean (`.gitignore`).

---

## Referencias

- [`apps/web/playwright.config.ts`](../../../playwright.config.ts)
- [`docs/testing.md`](../../../../docs/testing.md)
- [`docs/16_FRONTEND_UX_UI_Y_FLUJOS.md`](../../../../docs/16_FRONTEND_UX_UI_Y_FLUJOS.md)
