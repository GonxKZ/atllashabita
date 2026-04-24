# AtlasHabita — Paquete de documentación técnica y de producto

**Versión:** 1.0  
**Fecha:** 2026-04-24  
**Formato:** Markdown modular  
**Nombre anterior:** ViveEspaña RDF  
**Nombre recomendado de trabajo:** AtlasHabita

Este paquete contiene la documentación separada en ficheros independientes para que el proyecto pueda estudiarse, implementarse, defenderse y evolucionar sin depender de documentos monolíticos. La documentación está orientada a un proyecto académico de Complementos de Bases de Datos y a una implementación realista de software: aplicación web geoespacial, Knowledge Graph RDF, motor de recomendación, ingesta ETL/ELT, validación semántica, interfaz de mapa y trazabilidad de fuentes.

## Estructura

```text
AtlasHabita_Documentacion_MD_Completa/
└── docs/
    ├── 00_INDICE_GENERAL.md
    ├── 01_NOMBRES_DEL_PROYECTO.md
    ├── 02_CONTEXTO_ACADEMICO_Y_OBJETIVOS.md
    ├── 03_PRD_PRODUCT_REQUIREMENTS_DOCUMENT.md
    ├── 04_SRS_SOFTWARE_REQUIREMENTS_SPECIFICATION.md
    ├── 05_REQUISITOS_FUNCIONALES.md
    ├── 06_REQUISITOS_NO_FUNCIONALES.md
    ├── 07_REGLAS_DE_NEGOCIO_Y_CRITERIOS_ACEPTACION.md
    ├── 08_CASOS_DE_USO_E_HISTORIAS_DE_USUARIO.md
    ├── 09_MODELO_CONCEPTUAL_DEL_DOMINIO.md
    ├── 10_ARQUITECTURA_DE_SOFTWARE.md
    ├── 11_MODELO_DE_DATOS_RDF_Y_ONTOLOGIA.md
    ├── 12_INGESTA_ETL_ELT_Y_CALIDAD_DE_DATOS.md
    ├── 13_SIG_MAPA_CAPAS_Y_CONSULTAS_ESPACIALES.md
    ├── 14_MOTOR_DE_RECOMENDACION_Y_DATA_MINING.md
    ├── 15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md
    ├── 16_FRONTEND_UX_UI_Y_FLUJOS.md
    ├── 17_SEGURIDAD_PRIVACIDAD_Y_CUMPLIMIENTO.md
    ├── 18_PLAN_DE_PRUEBAS_VALIDACION_Y_CALIDAD.md
    ├── 19_PLAN_DE_IMPLEMENTACION_Y_ENTREGA.md
    ├── 20_OPERACION_MANTENIMIENTO_Y_OBSERVABILIDAD.md
    ├── 21_TRAZABILIDAD_REQUISITOS_MODULOS_PRUEBAS.md
    ├── 22_MEMORIA_ACADEMICA_Y_DEFENSA.md
    └── 23_GLOSARIO.md
```

## Cómo leerlo

Para entender el producto, empieza por `02`, `03`, `05` y `08`. Para implementar, usa `04`, `10`, `11`, `12`, `15` y `18`. Para preparar la defensa académica, usa `02`, `13`, `14`, `21` y `22`.

## Decisión de naming

Los documentos usan **AtlasHabita** como nombre recomendado, manteniendo la equivalencia con el nombre anterior **ViveEspaña RDF**. El fichero `01_NOMBRES_DEL_PROYECTO.md` contiene alternativas y una matriz de decisión.
