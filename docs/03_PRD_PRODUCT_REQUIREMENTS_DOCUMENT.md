# PRD — AtlasHabita

**Producto:** AtlasHabita  
**Documento:** Product Requirements Document, edición narrativa y granular  
**Versión:** 1.0 — edición ampliada con narrativa granular, UX premium y criterios de aceptación restrictivos  
**Fecha:** 2026-04-24  
**Estado:** Documento base de producto listo para transformar en épicas, historias de usuario, tickets técnicos y plan de entrega incremental.  
**Ámbito:** Aplicación web nacional para recomendar zonas de España donde vivir, estudiar, teletrabajar o emprender mediante un mapa interactivo, un motor de recomendación explicable y un Knowledge Graph RDF construido con datos abiertos.

---

## 1. Visión de producto

AtlasHabita nace como una aplicación para convertir datos públicos territoriales en decisiones comprensibles para personas reales. La pregunta central no es técnica, aunque el sistema tenga una base técnica exigente. La pregunta central es humana: **¿dónde me conviene vivir, estudiar, teletrabajar o abrir un negocio en España según lo que valoro?** La aplicación debe responder a esa pregunta de manera clara, visual, razonada y trazable. No debe limitarse a mostrar capas en un mapa; debe interpretar datos, combinarlos y traducirlos a una experiencia orientativa que reduzca la incertidumbre del usuario.

La experiencia ideal se parece a hablar con un asesor territorial objetivo. El usuario no quiere abrir portales de estadísticas, comparar hojas CSV, entender nomenclaturas administrativas ni buscar manualmente hospitales, estaciones, precios de alquiler, cobertura de fibra, renta, colegios o contaminación. El usuario quiere expresar sus prioridades, explorar el territorio y recibir recomendaciones explicadas. AtlasHabita debe permitir exactamente eso: introducir un perfil, ver el mapa de oportunidades, comparar zonas, entender los motivos y comprobar de dónde sale cada dato.

El producto se apoya en RDF porque el dominio territorial es un grafo natural. Un municipio pertenece a una provincia, una provincia pertenece a una comunidad autónoma, una sección censal pertenece a un municipio, un hospital se ubica en una zona, una estación conecta territorios, un indicador tiene un periodo, una fuente, una unidad y una metodología. RDF permite representar esas relaciones de forma explícita, consultarlas con SPARQL y conservar procedencia mediante named graphs. RDFLib aporta la capa Python para construir, consultar, serializar, validar y mantener ese grafo.

El mapa es la interfaz principal porque el problema es espacial. Sin embargo, el producto no debe convertirse en un SIG profesional difícil de usar. El mapa debe funcionar como un lienzo de decisión: colores simples, capas activables, tarjetas explicativas, ranking lateral, comparación de zonas y un lenguaje cercano. La aplicación debe sentirse premium porque ayuda en decisiones importantes: mudarse, estudiar, teletrabajar, invertir tiempo o abrir un negocio.

---

## 2. Tesis de producto

La tesis de AtlasHabita es que una decisión territorial mejora cuando el usuario puede combinar tres cosas en una única experiencia: **mapa, recomendación y explicación**. El mapa aporta intuición espacial. La recomendación reduce la complejidad de comparar miles de municipios y secciones censales. La explicación genera confianza porque muestra por qué una zona aparece arriba o abajo en el ranking.

La segunda tesis es que los datos abiertos públicos tienen valor latente, pero rara vez están presentados desde el punto de vista de una decisión personal. El INE publica indicadores demográficos y de renta; el CNIG publica límites geográficos; MIVAU ofrece referencia de alquiler; MITECO y otros organismos publican servicios, calidad ambiental y datos de reto demográfico; el Ministerio de Transportes mantiene el Punto de Acceso Nacional de transporte; Renfe publica conjuntos de datos ferroviarios; Dataestur expone información turística; la DGT publica microdatos de accidentes; OpenStreetMap proporciona puntos de interés; y datos.gob.es ofrece un catálogo semántico y API para descubrir datasets. El producto no compite con esos portales. Los convierte en una experiencia coherente.

La tercera tesis es que la aplicación debe ser útil incluso cuando los datos no sean perfectos. Por eso el producto debe comunicar incertidumbre, frescura y cobertura. Una recomendación sin trazabilidad es frágil; una recomendación con fuentes, fecha de actualización, calidad del dato y explicación se vuelve defendible. El usuario debe poder ver una puntuación, pero también debe poder abrir la ficha de una zona y comprobar qué variables han pesado, qué datos faltan, cuándo se actualizaron y qué fuente los respalda.

---

## 3. Problema que resuelve

Elegir una zona en España exige comparar variables dispersas y de naturaleza distinta. El precio del alquiler no vive en el mismo portal que la renta. La renta no vive en el mismo formato que los límites municipales. Los hospitales y colegios tienen catálogos distintos. El transporte puede aparecer como GTFS, API, CSV o datos de catálogo. La contaminación, el clima, las coberturas de banda ancha y los puntos de interés tienen granularidades y frecuencias de actualización diferentes. El resultado es que el usuario termina recurriendo a intuiciones, rankings genéricos, opiniones o búsquedas manuales.

El problema no es únicamente la falta de datos. Es la **fragmentación semántica**. Cada fuente habla su propio idioma: códigos territoriales, nombres, fechas, unidades, escalas, licencias, periodicidades y formatos. Para una persona normal, el coste de integrar todo eso es demasiado alto. Para un proyecto de bases de datos, en cambio, esa fragmentación es una oportunidad excelente: permite demostrar modelado semántico, integración heterogénea, normalización, trazabilidad, validación y consulta declarativa.

AtlasHabita convierte el problema en un producto. El sistema ingiere datos públicos, los normaliza en un modelo común, calcula indicadores comparables, construye un grafo RDF, valida la calidad del grafo, expone una API y presenta una interfaz visual. La interfaz final oculta la complejidad y permite resolver preguntas como: “¿qué municipios son buenos para teletrabajar con alquiler moderado?”, “¿qué zonas son adecuadas para familias con colegios y hospitales cerca?”, “¿dónde abrir una cafetería con turismo y competencia controlada?” o “¿qué ciudades tienen buen transporte y coste de vida razonable para estudiantes?”.

---

## 4. Producto en una frase

**AtlasHabita es un recomendador semántico con mapa interactivo que ayuda a comparar zonas de España para vivir, estudiar, teletrabajar o emprender, explicando cada recomendación con datos públicos trazables y un Knowledge Graph RDF.**

---

## 5. Principios de producto

El primer principio es la **claridad radical**. El usuario no debe sentirse dentro de un panel estadístico intimidante. Cada pantalla debe contestar una pregunta concreta. La pantalla inicial debe preguntar qué busca el usuario. El mapa debe mostrar una capa principal a la vez. El ranking debe explicar por qué una zona aparece en determinada posición. Las fichas territoriales deben traducir indicadores técnicos a lenguaje cotidiano sin perder rigor.

El segundo principio es la **explicabilidad antes que la magia**. La aplicación puede tener un score global, pero ese score nunca debe aparecer como una cifra misteriosa. Todo resultado debe poder abrirse y descomponerse en factores. Si un municipio tiene 84/100 para teletrabajo, el usuario debe ver cuánto aportan fibra, alquiler, servicios, conexión, calidad ambiental y entorno natural. Si falta un dato, el producto debe mostrarlo como ausencia explícita, no esconderlo.

El tercer principio es la **trazabilidad por defecto**. Cada indicador visible debe poder vincularse a una fuente, un periodo, una fecha de ingesta, una licencia y una transformación. La trazabilidad no debe estar escondida en una memoria técnica; debe aparecer en la propia interfaz mediante un inspector de fuente. Esto es especialmente importante porque el producto integra datos públicos de muchas procedencias y granularidades.

El cuarto principio es la **utilidad orientativa**. El sistema no decide por el usuario. Ayuda a explorar. La aplicación debe evitar lenguaje determinista como “esta es la mejor ciudad para ti” y preferir formulaciones como “esta zona encaja mejor con las prioridades seleccionadas”. El producto debe permitir cambiar pesos, excluir variables, comparar alternativas y exportar un informe.

El quinto principio es la **arquitectura visible en el dominio**. El código debe gritar AtlasHabita, no “controllers”, “utils” y “helpers”. Los módulos deben llamarse `territories`, `indicators`, `recommendations`, `datasets`, `provenance`, `quality`, `mobility`, `housing`, `environment` y `business_opportunity`. La arquitectura debe reflejar el lenguaje del producto y del dominio.

---

## 6. Usuarios objetivo

### 6.1 Estudiante universitario

El estudiante universitario busca una ciudad o zona donde estudiar con un equilibrio entre alquiler, transporte, servicios, vida cotidiana y conectividad. Su decisión suele estar condicionada por el presupuesto y por la accesibilidad a universidades, estaciones, bibliotecas, supermercados, gimnasios y ocio. En muchos casos, el estudiante no conoce bien la ciudad a la que se muda y depende de opiniones dispersas o de búsquedas en portales inmobiliarios.

AtlasHabita le aporta una experiencia guiada. El estudiante puede seleccionar el perfil “Estudiante”, indicar si prioriza bajo alquiler, transporte público, ambiente urbano, conectividad o servicios, y obtener un ranking nacional, autonómico o provincial. La aplicación debe mostrar zonas recomendadas y explicar con frases naturales por qué aparecen: “esta zona tiene alquiler más moderado que la media provincial, buena conectividad, estaciones cercanas y alta densidad de servicios cotidianos”.

El éxito para este usuario se mide por la capacidad de reducir exploración manual. La persona debe poder pasar de una pregunta amplia a una lista razonada de zonas candidatas en pocos minutos. La experiencia debe permitir guardar favoritos y comparar hasta tres zonas antes de tomar una decisión.

### 6.2 Teletrabajador

El teletrabajador puede elegir residencia con más libertad, pero necesita condiciones mínimas: conectividad digital, servicios básicos, entorno agradable, acceso razonable a transporte, coste de vida sostenible y calidad ambiental. Su problema no es solo encontrar lugares bonitos; es evitar mudarse a una zona que parece atractiva pero tiene mala conexión, pocos servicios o acceso sanitario insuficiente.

AtlasHabita debe ofrecer un perfil de teletrabajo con variables de fibra, cobertura, alquiler, renta, tiempo de acceso a hospital, acceso a autovía o estación, calidad del aire y entorno natural. El mapa debe permitir descubrir municipios medianos o pequeños que suelen quedar fuera de rankings convencionales. Para este usuario, el producto puede tener un enorme valor si revela zonas con buena conectividad y buena calidad de vida que no son obvias.

La recomendación debe penalizar carencias críticas. Por ejemplo, un municipio con gran entorno natural pero mala conectividad digital no debe aparecer arriba en el perfil de teletrabajo. El producto debe mostrar esa penalización de manera transparente para que el usuario entienda el intercambio.

### 6.3 Familia

Una familia suele valorar colegios, centros sanitarios, farmacias, seguridad vial, zonas verdes, accesibilidad y coste de vivienda. Su decisión es compleja porque combina calidad de vida, servicios públicos y presupuesto. Además, las familias suelen necesitar comparar zonas dentro de un radio razonable respecto a trabajo, familiares o redes de apoyo.

AtlasHabita debe permitir activar el perfil “Familia” y seleccionar prioridades como colegios, hospitales, farmacias, alquiler asumible, baja siniestralidad, zonas verdes y transporte. El producto debe presentar las zonas recomendadas con una explicación equilibrada. Por ejemplo, “este municipio puntúa alto en servicios educativos y sanitarios, pero el alquiler está por encima de la media provincial”.

Para este usuario, la confianza es crítica. La aplicación debe enseñar de dónde salen los datos sanitarios, educativos y de alquiler, y debe mostrar la fecha de actualización. La recomendación familiar debe ser especialmente conservadora ante datos faltantes: si una zona no tiene datos suficientes de seguridad vial o servicios, el producto no debe inflar artificialmente su score.

### 6.4 Emprendedor local

El emprendedor busca abrir un negocio y necesita interpretar demanda potencial, competencia, turismo, población, renta, movilidad y coste. Puede querer abrir una cafetería, un gimnasio, una tienda de alimentación, un coworking o un pequeño comercio. Su problema es que el análisis de localización suele requerir datos caros o conocimiento experto.

AtlasHabita debe ofrecer un modo “Abrir negocio” que convierta una idea de negocio en criterios territoriales. Para una cafetería, el sistema debe valorar población, turismo, estaciones, oficinas o actividad cercana, renta, competencia hostelera y alquiler. Para un gimnasio, debe valorar población objetivo, renta, competencia, transporte y densidad urbana. Para un comercio de proximidad, debe valorar servicios cotidianos, población, renta y puntos de atracción.

Este modo debe tratar la recomendación como una hipótesis, no como una promesa de éxito. La interfaz debe hablar de “oportunidad relativa” y mostrar claramente los factores de demanda, competencia y coste. Un emprendedor debe poder entender por qué una zona se considera atractiva y qué riesgos aparecen.

### 6.5 Analista, periodista de datos o estudiante de informática

Este usuario no solo quiere usar la aplicación, sino entender cómo funciona. Puede interesarse por las fuentes, la calidad del dato, las consultas SPARQL, la ontología, los indicadores y la reproducibilidad. Para la asignatura universitaria, este perfil es importante porque permite demostrar profundidad técnica.

AtlasHabita debe incluir una capa de transparencia: inspector RDF, exportación de resultados en JSON-LD/Turtle, consulta SPARQL predefinida, metadatos DCAT, validación SHACL y panel de salud de ingestas. No todo esto debe aparecer en el flujo principal del usuario común, pero sí debe estar disponible como modo avanzado o sección técnica.

---

## 7. Jobs To Be Done

El usuario que quiere vivir en otra zona necesita transformar una intención vaga en una lista de lugares comparables. El job no es “ver un mapa”, sino “identificar candidatos razonables y entender sus ventajas y desventajas”. AtlasHabita debe permitir empezar con una intención amplia, elegir perfil, seleccionar restricciones y obtener recomendaciones ordenadas.

El usuario que teletrabaja necesita encontrar equilibrio entre conectividad, coste y calidad de vida. El job no es “saber la cobertura de fibra”, sino “evitar zonas inviables para trabajar desde casa y descubrir alternativas atractivas”. El sistema debe combinar cobertura, servicios, entorno y vivienda.

El usuario que abre un negocio necesita estimar oportunidad territorial. El job no es “contar cafeterías”, sino “encontrar zonas donde haya suficiente demanda potencial sin competencia excesiva y con accesibilidad aceptable”. La app debe combinar datos de población, turismo, movilidad, renta, POIs y competencia.

El usuario técnico necesita verificar reproducibilidad. El job no es “leer documentación”, sino “poder demostrar que cada número visible procede de una fuente y de una transformación controlada”. El producto debe tener trazabilidad, versiones de ingesta, quality gates y exportación.

---

## 8. Experiencia de usuario general

La experiencia empieza con una pantalla limpia que pregunta: **“¿Qué quieres encontrar?”**. Deben aparecer cuatro modos principales: “Dónde vivir”, “Dónde teletrabajar”, “Dónde estudiar” y “Dónde abrir un negocio”. Cada modo inicia un asistente de pocas preguntas. El asistente no debe pedir veinte parámetros al principio; debe comenzar con defaults razonables y permitir ajustar pesos después.

Tras seleccionar un modo, el usuario llega a una vista de mapa nacional. A la izquierda o derecha aparece un panel con filtros y ranking. El mapa muestra una capa coroplética o puntos según el nivel de zoom. A nivel nacional se colorean municipios; a nivel urbano se pueden mostrar secciones censales o clusters de puntos de interés. La interacción debe ser fluida: pasar el ratón muestra una tarjeta corta; hacer clic abre una ficha de zona; seleccionar varias zonas permite compararlas.

El ranking debe ser tan importante como el mapa. Muchas personas prefieren leer una lista ordenada antes que explorar visualmente. Cada resultado del ranking debe mostrar nombre, provincia, score, resumen de motivos y badges. Un ejemplo de tarjeta sería: “León — 82/100 para teletrabajo — alquiler moderado, buena conectividad, servicios completos, estación ferroviaria, calidad ambiental aceptable”. El usuario puede pulsar “ver explicación” para abrir el desglose.

La ficha de zona debe tener narrativa. No debe ser una tabla fría. Debe comenzar con un resumen: “Esta zona encaja especialmente bien con teletrabajo porque combina conectividad digital, coste de vivienda moderado y acceso a servicios básicos. Su principal punto débil es la menor oferta de transporte interurbano frente a capitales mayores.” Después aparecen indicadores, mapa local, fuentes y comparación con medias provincial, autonómica y nacional.

---

## 9. ¿Debe ser un mapa?

Sí, debe tener un mapa, pero el mapa no debe ser el producto completo. El producto debe ser una **herramienta de decisión territorial** donde el mapa actúa como interfaz principal. Esta distinción es clave. Un mapa sin recomendación obliga al usuario a interpretar capas. Una recomendación sin mapa pierde contexto espacial. AtlasHabita necesita ambas cosas.

El mapa debe resolver tres funciones. Primero, debe permitir orientación: ver dónde están las zonas recomendadas. Segundo, debe permitir comparación: entender patrones territoriales como coste, renta, conectividad o servicios. Tercero, debe permitir inspección: hacer clic en una zona y ver su ficha. La aplicación debe evitar convertir el mapa en un panel técnico lleno de capas simultáneas. Cada perfil debe activar automáticamente las capas relevantes y permitir ajustes progresivos.

En el MVP, el mapa debe funcionar por municipio. Esta decisión reduce complejidad y permite cubrir toda España desde el principio. En una segunda fase, las capitales de provincia y municipios grandes pueden incorporar secciones censales. La granularidad debe aumentar donde haya datos suficientemente buenos, no de forma indiscriminada. La promesa nacional se cumple con municipios; la precisión urbana se mejora con secciones censales.

---

## 10. Módulos funcionales principales

### 10.1 Asistente de perfil

El asistente de perfil traduce la intención del usuario en pesos y restricciones. Su objetivo no es recopilar datos personales sensibles, sino entender prioridades. Debe preguntar de forma simple: propósito, zona geográfica de búsqueda, presupuesto relativo, importancia de transporte, servicios, conectividad, entorno, coste y seguridad. El asistente debe generar un `RecommendationProfile` que el backend pueda usar de forma determinista.

La experiencia debe ser reversible. El usuario puede empezar con el perfil “Teletrabajo”, ver resultados y luego ajustar un peso en un slider. Cada ajuste debe recalcular el ranking y actualizar el mapa. El sistema debe guardar el estado de la consulta en la URL para poder compartirla.

**Definition of Done.** El asistente se considera completo cuando un usuario puede crear un perfil sin leer documentación, cuando todos los pesos tienen valores por defecto, cuando el perfil generado se serializa en JSON estable, cuando la URL reproduce la búsqueda, cuando los cambios actualizan mapa y ranking sin recargar la página completa, y cuando el backend registra los parámetros usados para reproducibilidad.

### 10.2 Mapa interactivo nacional

El mapa es la superficie principal de exploración. Debe mostrar municipios coloreados por score o por indicador seleccionado. Debe soportar zoom, búsqueda por municipio, selección múltiple, tarjetas emergentes, leyenda clara, control de capas y modo de comparación. A nivel bajo de zoom se recomienda representar municipios mediante geometrías simplificadas o tiles vectoriales para mantener rendimiento. A nivel alto de zoom se pueden mostrar puntos de interés agregados o clusters.

El mapa debe priorizar legibilidad. La paleta de color debe ser perceptualmente clara y accesible. La leyenda debe explicar qué significa cada color. Los valores faltantes deben tener un estilo propio, no confundirse con puntuaciones bajas. La interfaz debe evitar que el usuario interprete ausencia de dato como mal resultado.

**Definition of Done.** El mapa se considera listo cuando puede renderizar España a nivel municipal con tiempos aceptables, cuando el usuario puede buscar un municipio y centrarlo, cuando el color del municipio coincide con el score o indicador activo, cuando el hover muestra nombre y valor principal, cuando el click abre ficha, cuando los datos faltantes se representan de forma diferenciada, cuando la atribución cartográfica y de datos aparece visible, y cuando la navegación funciona en escritorio y portátil sin bloqueos.

### 10.3 Ranking de zonas

El ranking convierte el mapa en una lista accionable. Debe mostrar las mejores zonas según el perfil activo y permitir ordenar, filtrar, comparar y guardar. Cada elemento debe incluir score, etiquetas de fortalezas, alertas de debilidad y un botón de explicación. El ranking no debe ser una tabla densa; debe ser una lista de tarjetas legibles.

Cada tarjeta debe mostrar una microexplicación generada por reglas. Por ejemplo: “Destaca en conectividad y servicios, con alquiler moderado frente a la media provincial. Penaliza por menor oferta ferroviaria.” Estas frases deben salir de datos estructurados, no de texto inventado. El sistema debe saber qué factores superan o quedan por debajo de umbrales.

**Definition of Done.** El ranking se considera completo cuando cada resultado puede justificarse con factores positivos y negativos, cuando los filtros no generan incoherencias con el mapa, cuando la paginación o virtualización soporta miles de municipios, cuando el usuario puede comparar al menos tres zonas, y cuando cada tarjeta enlaza a su ficha con el mismo estado de perfil.

### 10.4 Ficha de zona

La ficha de zona es el lugar donde la aplicación gana confianza. Debe combinar narrativa, indicadores, comparación, mapa local, fuentes y calidad de datos. Debe comenzar con un resumen escrito en lenguaje natural. Después debe mostrar bloques como vivienda, economía, servicios, movilidad, conectividad, ambiente, turismo, seguridad vial y puntos de interés.

La ficha debe permitir comparar el valor de la zona con la media provincial, autonómica y nacional cuando exista dato comparable. Esto ayuda a contextualizar. Un alquiler de 750 euros no significa lo mismo en una capital grande que en un municipio pequeño. Un tiempo de acceso a hospital de 25 minutos puede ser bueno o malo dependiendo del entorno territorial.

**Definition of Done.** La ficha está terminada cuando cada indicador visible tiene unidad, periodo, fuente y fecha de actualización, cuando el resumen textual coincide con los datos, cuando se muestran datos faltantes sin ocultarlos, cuando existe comparación territorial, cuando la ficha se puede compartir mediante URL, y cuando el usuario puede exportar un informe breve en PDF o Markdown en fases posteriores.

### 10.5 Comparador de zonas

El comparador permite seleccionar entre dos y cuatro zonas y ver diferencias lado a lado. Debe mostrar scores por perfil, indicadores clave, fortalezas, debilidades y fuentes. El objetivo es ayudar al usuario a tomar decisiones entre alternativas razonables.

El comparador debe evitar sobrecarga. No debe enseñar cincuenta indicadores por defecto. Debe mostrar primero los indicadores más relevantes para el perfil activo y ofrecer un modo avanzado para abrir el resto. La comparación debe destacar automáticamente diferencias significativas, no solo valores absolutos.

**Definition of Done.** El comparador está listo cuando permite comparar hasta cuatro zonas, cuando usa el mismo perfil activo que el ranking, cuando diferencia valores faltantes de valores negativos, cuando destaca diferencias relevantes, cuando las unidades son homogéneas y cuando cada celda puede abrir su fuente.

### 10.6 Recomendador explicable

El recomendador calcula un score por zona según el perfil. La explicación debe ser una entidad de producto de primer nivel. Cada recomendación debe incluir score total, sub-scores, factores positivos, factores negativos, datos faltantes, penalizaciones y fuente de cada indicador. La explicación debe ser entendible por un usuario no técnico.

La lógica de explicación debe ser determinista. Si el score sube por conectividad, la explicación debe mencionar conectividad. Si baja por alquiler alto, debe mencionarlo. Si faltan datos de turismo, debe indicar que el score de negocio tiene menor confianza. Esto evita la sensación de caja negra.

**Definition of Done.** El recomendador está completo cuando los scores son reproducibles, cuando las explicaciones se generan desde contribuciones reales del score, cuando los cambios de pesos alteran de forma coherente el ranking, cuando los datos faltantes aplican una política documentada, cuando existen tests de regresión para perfiles principales, y cuando cada explicación incluye nivel de confianza.

### 10.7 Inspector de fuentes y procedencia

El inspector de fuentes permite ver de dónde viene cada dato. Debe mostrar nombre de la fuente, organismo, URL, licencia, fecha de descarga, fecha de publicación si está disponible, transformación aplicada, grafo RDF de origen y calidad de validación. Este módulo es esencial para una aplicación basada en datos públicos y RDF.

El inspector puede tener dos niveles. El nivel simple muestra información comprensible: “Fuente: INE, Atlas de Distribución de Renta de los Hogares, periodo 2023, descargado el día X”. El nivel avanzado muestra URIs, named graph, triples, consulta SPARQL o shape SHACL asociada.

**Definition of Done.** El inspector está terminado cuando cualquier indicador visible permite abrir su fuente, cuando la fuente incluye URL y fecha de ingesta, cuando el sistema conserva el named graph de procedencia, cuando las transformaciones tienen identificador versionado, y cuando existe una vista avanzada para exportar JSON-LD o Turtle de una zona.

### 10.8 Panel de calidad de datos

El panel de calidad debe medir la salud del sistema: cobertura por indicador, frescura, errores de validación, datasets descargados, datasets fallidos, número de triples, número de municipios cubiertos y nivel de completitud por perfil. Este panel está pensado para el equipo técnico, pero puede tener una versión pública simplificada.

La calidad debe influir en el producto. Si un perfil depende mucho de un indicador con baja cobertura, la aplicación debe comunicar menor confianza. Si una fuente falla, el sistema debe seguir funcionando con la última versión válida y mostrar la fecha de los datos.

**Definition of Done.** El panel está completo cuando muestra cobertura, frescura y errores por fuente, cuando se actualiza tras cada ingesta, cuando bloquea publicación si fallan quality gates críticos, cuando permite comparar versiones de ingesta y cuando expone métricas para observabilidad.

### 10.9 Modo “Dónde vivir”

Este modo combina vivienda, renta, servicios, transporte, calidad ambiental, seguridad y puntos de interés. Debe ser el perfil más general y servir como puerta de entrada. El usuario puede ajustar si prefiere coste bajo, transporte, servicios, zonas verdes, entorno tranquilo o ciudad con actividad.

El resultado debe evitar simplificaciones excesivas. Un municipio barato pero sin servicios no debe aparecer como ideal salvo que el usuario priorice fuertemente bajo coste. Una zona con mucha actividad pero alquiler muy alto debe aparecer con advertencia. El perfil debe balancear adecuadamente ventajas y costes.

**Definition of Done.** El modo está completo cuando calcula score de residencia para todos los municipios con datos mínimos, cuando permite ajustar pesos, cuando muestra explicaciones de fortalezas y debilidades, cuando incluye comparación con medias territoriales y cuando los datos faltantes reducen confianza.

### 10.10 Modo “Dónde teletrabajar”

Este modo prioriza conectividad digital, coste de vivienda, servicios básicos, acceso sanitario, accesibilidad territorial, calidad ambiental y entorno natural. Debe descubrir zonas atractivas fuera de grandes capitales sin ocultar limitaciones.

El perfil debe tratar conectividad como requisito crítico. Si no hay datos suficientes de banda ancha o si la cobertura es baja, el score debe penalizarse de forma clara. La aplicación debe explicar que la recomendación depende de cobertura agregada y que el usuario debería verificar dirección concreta en fases avanzadas si se incorpora integración con mapas de banda ancha.

**Definition of Done.** El modo está completo cuando combina conectividad, alquiler, servicios y entorno, cuando los municipios con mala conectividad no aparecen arriba salvo por configuración explícita, cuando se muestra advertencia por cobertura agregada, y cuando la explicación diferencia entre conectividad fija y móvil si hay datos.

### 10.11 Modo “Dónde estudiar”

Este modo está orientado a estudiantes y debe priorizar alquiler, transporte, conectividad, servicios, bibliotecas, gimnasios, supermercados, vida urbana y proximidad a nodos educativos cuando existan datos. En MVP puede funcionar a nivel municipal; en fases posteriores puede incorporar universidades y centros de formación superior.

El modo debe ser práctico. No basta con decir que Madrid o Barcelona tienen muchos servicios; debe encontrar equilibrio entre oportunidades y coste. Las ciudades universitarias medianas pueden aparecer bien si combinan alquiler razonable, transporte, servicios y vida estudiantil.

**Definition of Done.** El modo está completo cuando ofrece ranking nacional y por comunidad, cuando incorpora coste, movilidad y servicios, cuando permite filtrar por presupuesto relativo, y cuando las explicaciones no favorecen automáticamente a grandes ciudades solo por tamaño.

### 10.12 Modo “Abrir negocio”

Este modo debe estimar oportunidad relativa por tipo de negocio. En MVP se deben soportar al menos cafetería, gimnasio, comercio de proximidad y coworking. Cada negocio tiene pesos distintos. Una cafetería se beneficia de turismo, movilidad, población y actividad; un gimnasio se beneficia de población objetivo, renta, densidad y competencia moderada; un coworking se beneficia de conectividad, renta, población profesional y transporte.

El modo de negocio debe distinguir demanda, competencia y coste. El usuario debe ver tres sub-scores separados. Una zona con mucha demanda pero muchísima competencia debe aparecer como oportunidad media, no como recomendación ciega. Una zona con poca competencia pero baja demanda tampoco debe aparecer arriba.

**Definition of Done.** El modo está completo cuando soporta tipos de negocio configurables, cuando calcula demanda, competencia y coste por separado, cuando usa POIs o empresas sectoriales como aproximación de competencia, cuando explica riesgos, y cuando evita prometer rentabilidad.

### 10.13 Exportación de informe

La exportación permite convertir una búsqueda o comparación en un documento compartible. En MVP puede bastar con exportar Markdown o JSON; en fases posteriores puede generarse PDF. El informe debe incluir perfil, pesos, ranking, zonas seleccionadas, explicación, fuentes principales y fecha.

Esta funcionalidad es útil para estudiantes, trabajos universitarios, decisiones familiares y análisis preliminares de negocio. También demuestra reproducibilidad del sistema.

**Definition of Done.** La exportación está completa cuando el informe reproduce los resultados visibles, cuando incluye fecha y versión de datos, cuando lista fuentes principales, cuando no pierde unidades ni contexto, y cuando puede generarse de forma determinista desde una URL o payload de consulta.

---

## 11. Requisitos de interfaz premium

La interfaz debe sentirse ligera, segura y elegante. La pantalla inicial debe usar lenguaje humano, no jerga técnica. El usuario debe ver cuatro caminos claros y una opción de búsqueda directa. El diseño debe usar mucho espacio en blanco, jerarquía tipográfica clara, iconografía consistente, tarjetas legibles y microinteracciones suaves. El mapa debe ocupar el centro visual, pero no debe robar claridad al ranking.

El producto debe tener un modo “simple” y un modo “avanzado”. El modo simple muestra recomendaciones, explicaciones y fuentes básicas. El modo avanzado abre pesos, indicadores, consultas, RDF, validación y detalles de ingesta. Esta separación evita que el usuario común se sienta abrumado y permite que el proyecto luzca profundidad técnica ante profesores o evaluadores.

La interfaz debe cuidar los estados vacíos. Cuando no haya resultados por filtros demasiado estrictos, no debe aparecer una pantalla muerta. Debe explicar qué filtro está bloqueando resultados y proponer relajar restricciones. Cuando falten datos, debe explicarlo. Cuando una fuente esté desactualizada, debe mostrar la fecha. Los errores deben ser orientativos y accionables.

La accesibilidad debe formar parte de la calidad. Los colores del mapa no pueden ser el único canal de información. Las tarjetas deben contener valores textuales. La navegación por teclado debe permitir usar buscador, filtros y ranking. Las leyendas deben ser legibles. Las tablas deben tener encabezados claros. La interfaz debe aspirar a cumplir WCAG 2.2 AA en las partes principales.

---

## 12. Modelo de scoring desde producto

El score debe ser comprensible. Cada perfil se compone de dimensiones. Cada dimensión se compone de indicadores. Cada indicador se normaliza en una escala común de 0 a 100. El score final es una combinación ponderada de dimensiones. El producto debe permitir ver esta jerarquía.

Para residencia, las dimensiones mínimas son asequibilidad, servicios, movilidad, conectividad, ambiente, seguridad y contexto socioeconómico. Para teletrabajo, las dimensiones mínimas son conectividad, vivienda, servicios, ambiente, accesibilidad y tranquilidad. Para familia, las dimensiones mínimas son educación, salud, vivienda, seguridad, zonas verdes y movilidad. Para negocio, las dimensiones mínimas son demanda, competencia, coste, movilidad y contexto económico.

El tratamiento de datos faltantes es una decisión de producto. El sistema no debe sustituir silenciosamente datos ausentes por cero ni por media sin indicarlo. Debe aplicar una política explícita: si falta un indicador no crítico, se imputa de forma conservadora y se reduce confianza; si falta un indicador crítico, se penaliza o se marca como no evaluable para ese perfil. La explicación debe incluirlo.

---

## 13. Métricas de éxito

La métrica norte del producto es el porcentaje de usuarios que llegan desde una intención inicial hasta una selección comparada de zonas. En un contexto universitario, esta métrica puede demostrarse mediante pruebas de usuario o escenarios de demo. El producto tiene éxito si un usuario puede generar una recomendación útil sin conocer las fuentes ni la terminología administrativa.

Las métricas de utilidad incluyen tiempo hasta primer resultado, porcentaje de resultados con explicación completa, porcentaje de indicadores con fuente trazable, número de zonas comparadas por sesión y ratio de búsquedas que terminan en exportación o guardado de favoritos. Estas métricas no son solo de negocio; ayudan a evaluar si la interfaz reduce complejidad.

Las métricas de calidad de datos incluyen cobertura municipal por indicador, frescura media por fuente, porcentaje de municipios con datos mínimos para cada perfil, errores SHACL críticos, número de triples válidos, número de fuentes con ingesta reproducible y tiempo total de pipeline. Para una demo universitaria, estas métricas deben aparecer en el panel técnico.

Las métricas de rendimiento incluyen tiempo de carga inicial, tiempo de actualización de ranking tras cambiar un peso, tiempo de consulta de ficha, tiempo de renderizado de mapa y tamaño de payload. El objetivo no es solo que funcione, sino que se sienta fluido.

---

## 14. Alcance MVP

El MVP debe cubrir toda España a nivel municipal. Esta decisión permite entregar una aplicación nacional útil sin resolver desde el primer día toda la complejidad de secciones censales, geometrías urbanas y puntos de interés exhaustivos. El MVP debe tener mapa nacional, ranking, perfiles básicos, fichas de municipio, comparación, fuentes y panel técnico mínimo.

Los perfiles MVP serán “Dónde vivir”, “Teletrabajo”, “Familia” y “Abrir negocio”. El modo estudiante puede entrar en MVP si el equipo avanza rápido, pero no debe bloquear la entrega principal. Los datos mínimos serán límites municipales, población, renta, alquiler, cobertura digital agregada, servicios básicos, hospitales, colegios, transporte principal, calidad ambiental agregada, turismo y POIs agregados.

La granularidad por sección censal debe considerarse fase dos. Debe aplicarse primero a capitales de provincia y municipios grandes, especialmente para renta y alquiler. La razón es que la sección censal aporta mucha precisión, pero también multiplica el coste de procesamiento, visualización y explicación.

---

## 15. Roadmap de producto

La primera entrega debe construir la base de datos territorial, la ingesta reproducible, el grafo RDF y una interfaz simple con mapa y ranking. Esta entrega debe demostrar que la arquitectura funciona de extremo a extremo: descarga, normalización, RDF, scoring, API y UI.

La segunda entrega debe profundizar en explicabilidad, comparación y fuentes. En esta fase se añaden el inspector de procedencia, el panel de calidad de datos, las fichas mejoradas y la exportación de informe. Esta fase convierte una demo funcional en un producto confiable.

La tercera entrega debe añadir granularidad urbana. Aquí entran secciones censales en ciudades grandes, POIs más detallados, mapas de calor y filtros espaciales. Esta fase permite que la aplicación no solo compare municipios, sino zonas dentro de ciudades.

La cuarta entrega debe profesionalizar el modo negocio. Se incorporan tipos de negocio configurables, estimación de competencia, demanda turística, movilidad, puntos de interés y comparativas sectoriales. Esta fase puede convertir el producto en una herramienta valiosa para emprendedores.

La quinta entrega debe enfocarse en escalabilidad y producción: tiles vectoriales, caché avanzada, observabilidad, CI/CD, quality gates, persistencia robusta y despliegue. En esta fase el sistema deja de ser proyecto universitario y se acerca a producto production-ready.

---

## 16. Dataset strategy desde producto

El producto debe apoyarse en fuentes oficiales y en fuentes comunitarias consolidadas. Las fuentes oficiales aportan legitimidad, cobertura nacional y estabilidad institucional. Las fuentes comunitarias como OpenStreetMap aportan riqueza de puntos de interés que muchas fuentes oficiales no ofrecen de forma homogénea.

La estrategia de ingesta debe distinguir entre datos base, indicadores y enriquecimiento. Los datos base son límites, códigos territoriales y geometrías. Sin ellos no hay producto. Los indicadores son renta, alquiler, conectividad, servicios, transporte, ambiente, turismo y siniestralidad. El enriquecimiento incluye Wikidata, GeoNames y OpenStreetMap para mejorar nombres, URIs, categorías y POIs.

La app debe evitar depender de un único dataset para todo. La robustez surge de combinar fuentes. Si una fuente no tiene cobertura completa, el sistema debe mostrarlo y usar el resto. Si una fuente requiere clave API, como AEMET OpenData, el script debe soportar variable de entorno y fallback a no ejecutar esa fuente sin romper el pipeline completo.

---

## 17. Fuentes principales de datos del producto

La capa territorial base se construye con límites municipales, provinciales y autonómicos del CNIG/IGN, secciones censales del INE mediante OGC API Features y códigos oficiales del INE. Esta capa define la columna vertebral del sistema. Cada indicador debe poder unirse a esta base mediante códigos de municipio, provincia, comunidad o sección censal.

La capa socioeconómica se apoya en INE y su API JSON para series estadísticas, además del Atlas de Distribución de Renta de los Hogares para renta por municipios, distritos y secciones censales. Esta capa ayuda a contextualizar nivel económico, población y estructura demográfica.

La capa de vivienda se apoya en el Sistema Estatal de Referencia del Precio del Alquiler de Vivienda de MIVAU/SERPAVI y, cuando sea viable, en tablas o recursos asociados a mapas de referencia. La aplicación debe tratar esta fuente con cuidado porque el acceso puede estar orientado a consulta interactiva o a explotaciones concretas. El pipeline debe tener adaptador específico y fallback manual documentado.

La capa de servicios se apoya en MITECO Reto Demográfico, Catálogo Nacional de Hospitales, Registro Estatal de Centros Docentes, farmacias y servicios agregados cuando estén disponibles. Esta capa es esencial para perfiles de familia, residencia y teletrabajo.

La capa de movilidad se apoya en el Punto de Acceso Nacional de Transporte Multimodal, Renfe Data y, para movilidad cotidiana, Open Data Movilidad del Ministerio de Transportes. En MVP se puede comenzar con estaciones, GTFS disponibles y agregados de accesibilidad.

La capa ambiental se apoya en MITECO para calidad del aire, AEMET OpenData para meteorología y SIOSE para ocupación del suelo. En MVP conviene agregar datos por municipio o zona cercana, no exponer series horarias completas al usuario final.

La capa de puntos de interés se apoya en OpenStreetMap mediante Geofabrik o Overpass. El producto debe extraer categorías útiles y agregarlas por municipio o sección censal. No es necesario transformar todo OpenStreetMap España a RDF en MVP; sí es necesario conservar atribución y licencia.

La capa de turismo se apoya en Dataestur. Esta fuente permite estimar demanda turística para el modo negocio y para zonas donde la población residente no explica toda la actividad económica.

La capa de seguridad vial se apoya en DGT y sus microdatos de accidentes con víctimas. En MVP se recomienda usar agregados por municipio, provincia o tipo de vía según la granularidad disponible y fiable.

La capa semántica y de enriquecimiento se apoya en datos.gob.es, Wikidata y GeoNames. datos.gob.es ayuda a descubrir y documentar datasets; Wikidata y GeoNames ayudan a enlazar entidades territoriales con URIs externas.

---

## 18. Criterios de aceptación del producto completo

El producto se acepta cuando una persona puede abrir la aplicación, elegir un perfil, obtener un ranking nacional, ver el mapa, abrir una ficha, comparar zonas y entender de dónde salen los datos. La experiencia debe completarse sin conocimiento técnico. Si el usuario necesita entender RDF para usar el producto, la interfaz ha fallado.

El producto se acepta técnicamente cuando cada indicador visible tiene fuente, periodo, unidad, fecha de ingesta y transformación. Cada zona debe tener identificador estable. Cada resultado debe ser reproducible a partir de perfil, versión de datos y versión de scoring. Cada pipeline debe guardar logs y artefactos. Cada fuente crítica debe tener tests de contrato. Cada shape SHACL crítica debe pasar antes de publicar el grafo.

El producto se acepta académicamente cuando demuestra uso real de RDFLib, creación de triples, named graphs, consultas SPARQL, integración de fuentes heterogéneas, validación SHACL, procedencia PROV-O, vocabularios estándar, API y aplicación visual. La memoria del proyecto debe poder explicar por qué RDF aporta valor frente a una base de datos relacional simple: relaciones explícitas, interoperabilidad semántica, procedencia, consultas sobre grafos y enlace con Linked Open Data.

---

## 19. Definition of Done global del PRD

Una funcionalidad no se considera terminada solo porque “se ve en pantalla”. Para AtlasHabita, una funcionalidad está terminada cuando satisface cinco capas: valor de usuario, corrección de datos, trazabilidad, calidad técnica y experiencia visual.

La capa de valor de usuario exige que la funcionalidad resuelva una tarea concreta. La capa de corrección exige que los datos estén normalizados y tengan unidades coherentes. La capa de trazabilidad exige fuente y fecha. La capa técnica exige tests, código limpio, separación de responsabilidades y rendimiento aceptable. La capa visual exige que el usuario entienda el resultado sin leer documentación.

Toda feature que muestre datos debe tener estados de carga, error, vacío, parcial y desactualizado. Toda feature que calcule scores debe tener tests de regresión. Toda feature que consuma una fuente externa debe tener caché, reintento controlado y fallback a última versión válida. Toda feature que aparezca en mapa debe tener representación accesible también fuera del color.

---

## 20. Riesgos de producto

El primer riesgo es intentar abarcar demasiado desde el principio. España tiene miles de municipios, muchas fuentes y granularidades diferentes. La mitigación es construir MVP municipal, limitar indicadores iniciales y dejar secciones censales para una fase posterior.

El segundo riesgo es convertir la app en un dashboard técnico. La mitigación es diseñar desde perfiles, no desde datasets. El usuario no debe elegir “capa INE ADRH”; debe elegir “quiero alquiler moderado y buenos servicios”.

El tercer riesgo es sobreprometer precisión. La mitigación es comunicar que el producto es orientativo, mostrar confianza, fuentes y límites. Esto no reduce valor; lo aumenta porque la aplicación se vuelve honesta.

El cuarto riesgo es que algunos datasets no tengan descarga automática estable. La mitigación es diseñar adaptadores por fuente, usar datos.gob.es para descubrimiento cuando aplique, soportar variables de entorno, registrar manual fallback y cachear snapshots versionados.

El quinto riesgo es rendimiento cartográfico. La mitigación es preagregar, usar geometrías simplificadas, tiles vectoriales en fases avanzadas y payloads compactos para el frontend.

---

## 21. Experiencia de demo recomendada

La demo ideal comienza con el perfil de teletrabajo. El presentador abre la app, selecciona “Teletrabajar”, prioriza fibra, alquiler moderado y naturaleza, y lanza la búsqueda nacional. El mapa se colorea por score y el ranking muestra municipios recomendados. Se abre una ficha y se explica el desglose: conectividad, alquiler, servicios, hospital, autovía, entorno y calidad ambiental. Luego se cambia el peso de alquiler o transporte y se ve cómo el ranking cambia.

La segunda parte de la demo muestra el modo negocio. Se selecciona “cafetería” y se filtra por una provincia o comunidad. El sistema muestra demanda, competencia y coste. Se abre una zona con alta oportunidad, se visualizan puntos de interés y se explica que la recomendación no promete rentabilidad, sino oportunidad relativa basada en datos.

La tercera parte enseña el modo técnico. Se abre el inspector de fuentes de un indicador de renta, se ve el named graph, la fuente INE, la fecha de ingesta y la validación. Luego se muestra una consulta SPARQL predefinida y el panel de calidad. Esta parte demuestra que el producto no es solo UI: hay arquitectura semántica real.

---

## 22. Referencias oficiales usadas para diseñar el producto

Las fuentes oficiales y técnicas que sustentan el planteamiento del producto son: RDFLib para construcción y consulta RDF en Python; W3C DCAT para catálogos de datos; W3C SHACL para validación de grafos; W3C PROV-O para procedencia; OGC GeoSPARQL para datos geoespaciales semánticos; datos.gob.es para API y SPARQL del catálogo semántico; INE para API JSON, renta y secciones censales; CNIG/IGN para límites administrativos; MIVAU/SERPAVI para alquiler; MITECO para servicios, reto demográfico y calidad del aire; AEMET OpenData para meteorología; NAP y Renfe Data para transporte; DGT para accidentes; Dataestur para turismo; OpenStreetMap/Geofabrik para puntos de interés; Catastro INSPIRE para cartografía catastral; SIOSE para ocupación del suelo; Wikidata y GeoNames para enriquecimiento semántico.

Los enlaces concretos se detallan en el SRS, donde cada fuente tiene estrategia de ingesta, entidad objetivo, granularidad, periodicidad y uso dentro del sistema.


---

## 23. Arquitectura de información de la interfaz

La aplicación debe organizarse alrededor de una navegación extremadamente simple. El usuario no debe ver una lista de datasets ni una colección de gráficos desconectados. Debe ver caminos de decisión. La arquitectura de información recomendada tiene cinco áreas principales: inicio, explorador, ficha de zona, comparador y transparencia. Inicio sirve para elegir intención. Explorador combina mapa, ranking y filtros. Ficha de zona explica un territorio. Comparador enfrenta alternativas. Transparencia muestra fuentes, calidad y metodología.

La pantalla de inicio debe tener una propuesta de valor directa, cuatro tarjetas de perfil y un buscador territorial. Las tarjetas no deben describirse con lenguaje técnico. “Dónde vivir” debe decir algo como “encuentra zonas equilibradas por coste, servicios y movilidad”. “Teletrabajar” debe hablar de conectividad, coste y calidad de vida. “Familia” debe hablar de colegios, salud, seguridad y entorno. “Abrir negocio” debe hablar de demanda, competencia y coste. El objetivo es que el usuario se reconozca inmediatamente.

El explorador debe dividirse en tres zonas visuales. El mapa ocupa el espacio principal. El panel lateral contiene ranking y controles del perfil. La parte superior contiene buscador, filtros geográficos y selector de capa. Esta organización permite pasar de una visión nacional a una decisión concreta sin cambiar de pantalla. El mapa y el ranking deben estar sincronizados: seleccionar un resultado centra el mapa; seleccionar un municipio en el mapa resalta la tarjeta del ranking.

La ficha de zona debe tener una estructura narrativa. Primero aparece el veredicto: una explicación breve del encaje con el perfil activo. Después aparecen sub-scores, indicadores, mapa local, comparación territorial, fuentes y advertencias. Esta jerarquía evita que el usuario vea una tabla antes de entender el mensaje principal. El usuario avanzado puede abrir detalles, pero el usuario normal debe entender lo esencial en los primeros segundos.

El comparador debe estar diseñado como una mesa de decisión. Cada columna es una zona y cada fila es una dimensión relevante. Las diferencias relevantes deben destacarse mediante texto y no solo color. Si una zona gana claramente en alquiler, debe decir “mejor coste relativo”. Si otra gana en transporte, debe decir “mejor conectividad interurbana”. El comparador debe ayudar a decidir, no simplemente mostrar números.

La sección de transparencia debe convertir el rigor técnico en confianza. Debe mostrar qué fuentes alimentan el sistema, cuándo se actualizaron, qué cobertura tienen, cuántos errores se detectaron y qué indicadores dependen de ellas. Esta sección es también una pieza clave para la presentación universitaria porque demuestra que el producto tiene una base reproducible.

---

## 24. Pantallas detalladas

### 24.1 Pantalla de inicio

La pantalla de inicio debe cargar rápido y mostrar la esencia del producto. Debe incluir un titular, un subtítulo, cuatro perfiles principales, un buscador y una breve nota de transparencia. El titular debe comunicar utilidad, no tecnología. Una frase adecuada sería: “Encuentra zonas de España que encajan con tu forma de vivir, estudiar, trabajar o emprender”. El subtítulo puede mencionar que las recomendaciones se basan en datos públicos y explicaciones trazables.

La pantalla debe evitar mostrar demasiados indicadores de entrada. El usuario todavía no está preparado para ajustar pesos. Primero debe elegir un camino. Debe existir una opción de “Explorar mapa directamente” para usuarios curiosos, pero no debe ser la opción dominante. La intención principal es guiar.

El estado de carga inicial debe ser elegante. Si la API tarda, se muestra un skeleton con las tarjetas de perfiles. Si la API no responde, se muestra un mensaje accionable: “No se pudo cargar la configuración de perfiles. Reintentar.” No debe aparecer una traza técnica en la interfaz de usuario.

### 24.2 Asistente de perfil

El asistente debe tener pocas preguntas y permitir saltar. Para “Teletrabajo”, las preguntas esenciales son: zona de búsqueda, presupuesto relativo, importancia de conectividad, importancia de servicios y preferencia por entorno natural o urbano. Para “Familia”, las preguntas son: colegios, salud, seguridad, coste y transporte. Para “Negocio”, las preguntas son: tipo de negocio, ámbito geográfico, tolerancia a competencia, importancia de turismo y presupuesto aproximado.

Cada pregunta debe tener defaults. El usuario no debe quedar bloqueado por no saber contestar. El asistente produce una configuración visible que luego se puede editar. Esta transparencia es importante porque el usuario debe comprender que los resultados dependen de sus prioridades.

### 24.3 Explorador de mapa

El explorador debe tener una primera carga con resultados ya útiles. Si el usuario viene del perfil “Teletrabajo”, el mapa debe abrir directamente coloreado por score de teletrabajo. El panel lateral debe mostrar los mejores municipios. La leyenda debe explicar el score. Los filtros deben estar disponibles, pero no ocupar toda la pantalla.

El mapa debe tener tres modos: score, indicador y comparación. El modo score colorea por perfil. El modo indicador permite ver una variable concreta, como alquiler o cobertura de fibra. El modo comparación resalta zonas seleccionadas. El usuario debe saber en todo momento qué está viendo.

El hover debe ser breve: nombre, provincia, score y dos badges. El click abre tarjeta expandida. La ficha completa se abre en panel o ruta dedicada. Este patrón evita que cada movimiento del usuario dispare una carga pesada.

### 24.4 Ficha territorial

La ficha territorial debe responder a cuatro preguntas: qué tal encaja esta zona, por qué, qué riesgos tiene y de dónde salen los datos. El primer bloque debe ser una explicación. El segundo debe ser un desglose de dimensiones. El tercero debe comparar con medias territoriales. El cuarto debe mostrar fuentes. El quinto puede mostrar vista RDF avanzada.

La ficha debe permitir cambiar perfil sin salir. Un mismo municipio puede ser excelente para teletrabajo y mediocre para abrir una cafetería. Esta comparación por perfil ayuda al usuario a entender que no existen lugares “buenos” universalmente, sino lugares adecuados a objetivos.

### 24.5 Panel de fuentes

El panel de fuentes debe estar disponible desde cualquier indicador. Al hacer clic en una fuente, debe aparecer organismo, dataset, fecha, licencia, URL, método de transformación y calidad. En modo avanzado debe aparecer named graph, URI del indicador y una consulta SPARQL reproducible. Esta conexión entre producto y RDF es una parte clave del valor académico.

---

## 25. Microcopy y tono de producto

El lenguaje debe ser claro, sereno y orientativo. La aplicación no debe hablar como una administración ni como un paper. Debe hablar como un asesor experto que simplifica sin perder rigor. En lugar de “indicador compuesto de accesibilidad territorial”, puede decir “acceso a servicios y transporte”. En lugar de “dato ausente”, puede decir “no hay dato suficiente para esta variable”. En modo avanzado sí se puede mostrar terminología técnica.

El producto debe evitar promesas absolutas. No debe decir “mejor municipio de España”. Debe decir “mejor encaje según tus prioridades”. No debe decir “abre tu cafetería aquí”. Debe decir “zona con oportunidad relativa alta para cafetería según demanda, competencia y coste”. Este tono protege la confianza y evita sobreinterpretar datos.

Los mensajes de error deben ser humanos. Si una fuente falló, el usuario no necesita ver un stack trace. Debe ver “los datos de turismo no están disponibles en esta versión; el ranking se ha calculado con menor confianza”. El equipo técnico sí debe poder abrir logs.

---

## 26. Historias de usuario representativas

Como teletrabajador, quiero encontrar municipios con buena conexión, alquiler moderado y servicios básicos para poder mudarme sin revisar manualmente decenas de fuentes. La historia se acepta cuando puedo elegir perfil de teletrabajo, establecer presupuesto, ver ranking, abrir una ficha y comprobar conectividad, alquiler, servicios y fuentes.

Como familia, quiero comparar tres municipios por colegios, salud, seguridad y coste para decidir cuáles visitar. La historia se acepta cuando puedo seleccionar tres zonas, abrir el comparador, ver diferencias relevantes, identificar carencias y exportar un resumen.

Como emprendedor, quiero evaluar zonas para abrir una cafetería según demanda, competencia y coste para priorizar ubicaciones candidatas. La historia se acepta cuando puedo elegir “cafetería”, ver demanda/competencia/coste por separado, abrir explicación y comprobar qué POIs o indicadores se han usado.

Como evaluador técnico, quiero verificar que un indicador visible procede de una fuente oficial y de un named graph para comprobar que el proyecto usa RDF de forma real. La historia se acepta cuando puedo abrir el inspector, ver fuente, URI, grafo, fecha de ingesta, shape de validación y exportar RDF.

---

## 27. Matriz de aceptación por épica

La épica de ingesta se acepta cuando las fuentes críticas del MVP se descargan o se detectan mediante adaptadores, cuando los recursos se cachean, cuando se crean snapshots crudos y cuando el pipeline produce contratos normalizados. No basta con que un notebook descargue un CSV. Debe haber CLI, manifiesto, logs, errores controlados y tests de contrato.

La épica de grafo RDF se acepta cuando existen named graphs por fuente, URIs estables, ontología propia mínima, metadatos DCAT, procedencia PROV-O, shapes SHACL y consultas SPARQL demostrables. No se acepta una exportación RDF superficial sin uso real en la aplicación.

La épica de recomendación se acepta cuando los perfiles generan scores reproducibles, los scores tienen contribuciones, las contribuciones producen explicaciones y los cambios de pesos modifican resultados de forma coherente. No se acepta un ranking hardcodeado.

La épica de mapa se acepta cuando el mapa es usable, rápido, accesible y sincronizado con ranking. No se acepta un mapa que solo pinte puntos sin interacción ni leyenda.

La épica de transparencia se acepta cuando cualquier valor visible puede rastrearse hasta fuente, periodo y transformación. No se acepta mostrar datos sin procedencia.

---

## 28. Criterios de excelencia para la presentación universitaria

La presentación debe demostrar tres capas. Primero, la capa de usuario: una persona usa la aplicación y entiende una recomendación. Segundo, la capa de datos: se explica cómo se ingieren fuentes heterogéneas, se normalizan y se calculan indicadores. Tercero, la capa semántica: se enseña RDFLib, named graphs, SPARQL, SHACL y procedencia.

El momento más fuerte de la demo debe ser abrir una recomendación y bajar desde la tarjeta visual hasta el triple RDF. Por ejemplo, se muestra “Municipio X tiene score alto por renta y conectividad”, luego se abre la contribución, luego la fuente, luego el named graph y finalmente una consulta SPARQL que recupera ese indicador. Esta continuidad entre interfaz premium y base semántica convierte el proyecto en algo muy superior a un dashboard.

La memoria debe incluir capturas, arquitectura, modelo RDF, consultas, shapes, pipeline, datasets, limitaciones y decisiones de diseño. Las limitaciones deben tratarse con madurez: no todos los datos tienen la misma granularidad, no todas las fuentes tienen API perfecta y algunos indicadores son aproximaciones. Esa honestidad aumenta la calidad percibida.

---

## 29. Capa definitiva de producto: de mapa a sistema de decisión

La versión madura de AtlasHabita debe entenderse como un sistema de decisión territorial, no como un visor cartográfico. Un visor cartográfico deja al usuario solo ante una colección de capas. AtlasHabita debe hacer el trabajo difícil por él: interpretar variables, reducir complejidad, ordenar alternativas y explicar compromisos. El mapa es la superficie visual porque la decisión es espacial, pero la experiencia completa se compone de intención, recomendación, explicación, comparación y trazabilidad. Esta distinción es fundamental para que la aplicación no se convierta en una demo técnica sino en un producto útil.

La primera pantalla debe responder a una pregunta humana: “¿qué estás intentando decidir?”. El usuario no debe empezar eligiendo datasets, capas o columnas. Debe empezar eligiendo un objetivo. Si elige teletrabajar, el sistema debe activar reglas, pesos y advertencias propias de teletrabajo. Si elige familia, debe priorizar educación, salud, coste y seguridad. Si elige emprender, debe cambiar por completo el marco mental y hablar de demanda, competencia y coste. El mismo municipio puede aparecer con distinta valoración según la intención, y esta variabilidad debe ser visible para el usuario.

El producto debe evitar que el usuario confunda score con verdad absoluta. El score es una representación calculada de sus prioridades, no una sentencia. Por eso cada recomendación debe estar acompañada de una explicación corta, una explicación ampliada y una confianza de datos. Una zona con score alto pero datos incompletos debe mostrarse de forma distinta a una zona con score alto y cobertura de datos excelente. Esta transparencia aumenta la credibilidad y convierte el sistema en una herramienta de análisis, no en una caja negra.

La interfaz debe ser suficientemente sencilla para una persona no técnica y suficientemente profunda para un evaluador técnico. En la capa simple, el usuario ve mapa, ranking y razones. En la capa avanzada, puede abrir fuentes, indicadores, named graphs, SPARQL y exportaciones RDF. La calidad del producto está en permitir ambas experiencias sin mezclarlas de forma caótica. La profundidad técnica no debe ensuciar la experiencia principal, pero debe existir y poder demostrarse.

---

## 30. Experiencia premium del mapa

El mapa debe abrir con una composición visual limpia. La vista inicial no debe saturar con todas las capas posibles. Debe mostrar el score del perfil activo por municipio, una leyenda sencilla y un panel lateral con el ranking. La paleta debe comunicar diferencias sin convertir el mapa en una feria de colores. Los valores ausentes deben tener un estilo propio y nunca confundirse con valores bajos. La leyenda debe explicar si el color representa score, indicador bruto, indicador normalizado o diferencia frente a la media.

La interacción principal del mapa debe ser progresiva. Al pasar el cursor sobre una zona, el usuario debe ver una tarjeta mínima con nombre, provincia, score, confianza y dos razones principales. Al hacer clic, debe abrirse una tarjeta lateral con explicación resumida, sub-scores, advertencias y botones de comparar o abrir ficha. Al abrir ficha completa, el usuario debe entrar en una vista más profunda donde el mapa local convive con tablas explicadas, fuentes y exportaciones. Este diseño evita que el mapa tenga demasiada información flotante y mantiene una navegación clara.

El mapa debe tener tres modos principales. El modo “encaje” muestra el score según el perfil. El modo “indicador” muestra una variable concreta, como alquiler, conectividad o renta. El modo “comparación” permite seleccionar varias zonas y ver diferencias. Estos modos deben estar claramente separados para que el usuario sepa qué está mirando. No se debe mezclar score final con variables brutas sin explicarlo, porque eso genera interpretaciones erróneas.

La aplicación debe tener una versión móvil cuidada. En móvil, el mapa debe seguir siendo protagonista, pero el ranking debe aparecer como una hoja inferior deslizable. Los filtros deben convertirse en chips y el panel de capas debe ser compacto. El usuario debe poder explorar, abrir una zona y comparar sin tener que hacer zoom o leer textos diminutos. La experiencia móvil es importante porque muchas decisiones de vivienda o viaje se investigan desde el teléfono.

El mapa también debe respetar atribuciones. Si se usan teselas base o puntos de OpenStreetMap, la atribución debe ser visible. Si se usan límites oficiales, se debe mostrar fuente en el inspector. Si una geometría procede de una versión concreta, la ficha técnica debe conservar esa fecha. El mapa debe ser bonito, pero no debe esconder su procedencia.

---

## 31. Diseño narrativo de la ficha territorial

La ficha territorial debe leerse como un informe breve y no como una tabla interminable. La primera frase debe contar el diagnóstico: “este municipio encaja bien con el perfil de teletrabajo por su conectividad, coste relativo y acceso a servicios, aunque pierde puntos por transporte ferroviario limitado”. Esta frase debe generarse a partir de contribuciones reales del score y no de texto genérico. Si el sistema no puede sostener una afirmación con datos, no debe escribirla.

Después del diagnóstico debe aparecer el desglose por dimensiones. Cada dimensión debe tener una tarjeta con valor normalizado, valor bruto cuando sea útil, comparación con media nacional o provincial, tendencia si existe y fuente. Por ejemplo, conectividad puede mostrar porcentaje de cobertura, fecha de referencia y organismo. Alquiler puede mostrar rango o referencia disponible, nivel territorial y advertencia si el dato es por sección censal, municipio o provincia. Servicios puede mostrar farmacias, centros educativos, hospitales cercanos o tiempo de acceso.

La ficha debe incluir un bloque de “lo mejor”, “lo peor” y “datos a revisar”. “Lo mejor” resume las variables que más aportan al score. “Lo peor” resume penalizaciones. “Datos a revisar” enumera datos ausentes, antiguos o estimados. Este bloque es muy importante porque convierte el producto en una herramienta honesta. Un usuario puede aceptar una recomendación con limitaciones si las limitaciones están claras.

La ficha debe poder cambiar de perfil sin salir. Si el usuario abre un municipio desde teletrabajo, debe poder ver cómo cambia su valoración para familia o negocio. Esta comparación por perfiles enseña que las zonas no son buenas o malas universalmente. Son adecuadas o no adecuadas según objetivos. Esta idea debe formar parte del diseño del producto.

La ficha debe tener una sección avanzada de datos. Allí se muestra la procedencia con fuente, fecha, pipeline, named graph y consulta SPARQL de ejemplo. Esta sección no está pensada para todos los usuarios, pero es esencial para la entrega universitaria y para la credibilidad técnica. El usuario avanzado debe poder bajar desde una frase de explicación hasta el triple RDF que la sustenta.

---

## 32. Flujo completo: vivir

El flujo de vivir comienza preguntando por prioridades. El usuario puede indicar presupuesto, preferencia por ciudad grande o municipio tranquilo, importancia de transporte, servicios, aire, zonas verdes y coste. La interfaz debe ofrecer presets como “equilibrado”, “barato”, “urbano”, “tranquilo” o “servicios cerca”, pero también permitir ajustar pesos. El objetivo es que el usuario no tenga que entender indicadores para configurar una búsqueda útil.

El sistema debe traducir esas preferencias a una consulta reproducible. El presupuesto se convierte en filtros o penalizaciones sobre alquiler. La preferencia urbana se traduce en población, densidad y servicios. La importancia del transporte se traduce en presencia de estaciones, paradas o conectividad regional. La importancia ambiental se traduce en calidad del aire, SIOSE, clima o proxies disponibles. El usuario ve una interfaz simple, pero internamente se genera una configuración formal que puede guardarse y exportarse.

El resultado debe mostrar un ranking que no solo ordena municipios, sino que explica tipos de encaje. Una zona puede aparecer como “muy equilibrada”, otra como “muy asequible pero con menor transporte”, otra como “excelente en servicios pero coste alto”. Estas etiquetas ayudan más que un número aislado. La ficha debe permitir ver la razón exacta y cambiar prioridades para observar cómo se mueve el ranking.

El Definition of Done del flujo de vivir es restrictivo. Debe funcionar con datos reales, no con mocks. Debe tener al menos coste, servicios, conectividad, contexto demográfico y movilidad. Debe mostrar advertencia si falta alquiler. Debe permitir comparar al menos dos zonas. Debe exportar el resultado con parámetros de búsqueda, fecha de datos y fuentes. Debe ser usable sin conocimiento técnico.

---

## 33. Flujo completo: teletrabajo

El flujo de teletrabajo debe ser el más estricto con conectividad. La cobertura digital no es un adorno; es una condición de posibilidad. El sistema debe usar un umbral mínimo configurable y nunca recomendar como excelente una zona con conectividad insuficiente. Si el dato de conectividad no está disponible, la zona puede aparecer con baja confianza o quedar fuera si el usuario activó filtro estricto.

El usuario debe poder elegir si busca aislamiento, equilibrio o cercanía a nodos urbanos. Un teletrabajador puede querer un municipio rural conectado, una ciudad media con servicios o una zona cercana a una capital. Estos tres casos usan datos parecidos, pero pesos distintos. El producto debe permitir esa diferencia mediante presets claros.

El resultado debe explicar la relación entre conectividad, coste y servicios. Una zona barata sin hospital cercano puede ser viable para algunos usuarios, pero no para otros. Una zona con excelente internet y alquiler alto puede seguir siendo atractiva si ofrece transporte y servicios. La explicación debe mostrar compromisos, no solo ganadores.

El DoD del flujo de teletrabajo exige cobertura digital, coste, servicios básicos, accesibilidad y entorno. También exige mostrar la fecha de referencia de conectividad y la fuente. Si la conectividad se obtiene de un dataset anual, el usuario debe verlo. Si se usa cobertura agregada municipal, también debe indicarse. La precisión territorial del dato forma parte de la recomendación.

---

## 34. Flujo completo: familia

El flujo de familia debe priorizar seguridad, salud, educación y coste de vida. La interfaz no debe infantilizar ni dramatizar. Debe presentar datos de forma serena: disponibilidad de centros educativos, farmacias, hospitales o tiempo de acceso, zonas verdes, coste relativo y seguridad vial agregada. Los indicadores sensibles deben tratarse con cuidado, evitando afirmaciones alarmistas.

El usuario debe poder configurar edades o necesidades generales. No es lo mismo una familia con niños pequeños que una familia con adolescentes. En un MVP, bastará con indicar prioridad educativa alta, salud alta y coste moderado. En versiones futuras se pueden añadir capas de guarderías, institutos, transporte escolar o equipamientos deportivos.

La ficha para familias debe destacar carencias. Una zona puede tener buen alquiler y entorno, pero carecer de servicios cercanos. Otra puede tener muchos servicios y coste alto. La app debe mostrar estos compromisos con frases claras. La comparación lado a lado será especialmente útil en este perfil, porque las familias suelen seleccionar varias zonas candidatas para visitar.

El DoD del flujo familia exige que educación y salud aparezcan separadas y con fuente. No se aceptan scores familiares que mezclen servicios en un único número sin desglose. La seguridad vial debe ser agregada y contextualizada. Las zonas con datos incompletos deben aparecer con confianza reducida.

---

## 35. Flujo completo: emprender

El flujo de emprender debe empezar por el tipo de negocio. El usuario no puede recibir una recomendación seria si el sistema no sabe si quiere abrir una cafetería, un gimnasio, una academia, una tienda de alimentación, un coworking o un restaurante. Cada tipo de negocio tiene señales distintas. Para una cafetería importan turismo, movilidad, competencia hostelera, renta y actividad. Para un gimnasio importan población objetivo, renta, competencia y accesibilidad. Para un coworking importan conectividad, población profesional, transporte y coste.

La app debe presentar oportunidad como una combinación de demanda, competencia y coste. La demanda agrupa población, turismo, movilidad y atractores. La competencia agrupa POIs o empresas similares. El coste agrupa alquiler u otros proxies. Estos tres bloques deben mostrarse siempre por separado. Si se mezclan en un único score, el emprendedor no sabrá si una zona aparece por tener mucha demanda, poca competencia o simplemente bajo coste.

El lenguaje debe ser prudente. La app no debe prometer éxito. Debe hablar de “oportunidad relativa territorial” o “zona candidata para analizar”. Debe sugerir que la recomendación sirve para priorizar investigación, no para tomar una decisión final sin visitar la zona ni hacer estudio de mercado. Esta prudencia no reduce valor; lo aumenta porque muestra rigor.

El DoD del flujo emprender exige plantillas por tipo de negocio, desglose de demanda/competencia/coste, fuentes visibles, explicación de limitaciones y exportación. También exige que la competencia se calcule con categorías documentadas. Si se usa OpenStreetMap, las etiquetas OSM utilizadas deben estar en documentación.

---

## 36. Modo avanzado para evaluación técnica

El modo avanzado debe ser opcional, pero poderoso. Debe permitir abrir un inspector semántico desde cualquier zona, indicador o score. Este inspector debe mostrar la URI de la entidad, el named graph, las fuentes, los triples principales, las consultas SPARQL relacionadas y la validación SHACL asociada. Para un proyecto de Complementos de Bases de Datos, este modo es el escaparate de la profundidad técnica.

El inspector debe evitar abrumar por defecto. Puede empezar mostrando una vista humana: entidad, tipo, fuente, última actualización y calidad. Después, en pestañas, puede mostrar RDF/Turtle, JSON-LD, consulta SPARQL y reporte SHACL. Esta estructura permite que el evaluador vea el uso real de RDF sin convertir la interfaz general en una herramienta para expertos.

Una demo excelente debe mostrar continuidad. Primero se ve una recomendación en el mapa. Luego se abre la ficha. Luego se ve que el score se debe a conectividad y alquiler. Luego se abre la fuente de conectividad. Luego se ve el named graph y una consulta SPARQL que recupera el indicador. Finalmente se muestra una validación SHACL que garantiza que el indicador tiene valor, unidad, periodo y procedencia. Esa cadena demuestra que el producto no es maquillaje visual.

---

## 37. Sistema de confianza y calidad visible

La confianza debe ser una dimensión de producto. Dos zonas con el mismo score no son equivalentes si una tiene datos completos y recientes y otra tiene datos parciales o antiguos. Por eso cada score debe acompañarse de un indicador de confianza. La confianza puede calcularse con cobertura de indicadores, frescura, granularidad, validación y consistencia. No debe ser un número decorativo; debe afectar a la forma de presentar resultados.

El usuario general debe ver la confianza como etiquetas simples: alta, media, baja. El usuario avanzado debe poder ver la fórmula. Una confianza media puede deberse a alquiler ausente, fuente antigua o indicador calculado por proxy. La app debe explicar la causa. Esto ayuda al usuario a decidir si una recomendación merece exploración adicional.

La calidad de datos también debe aparecer como panel técnico. Este panel muestra fuentes cargadas, fuentes omitidas, errores de ingesta, cobertura territorial, shapes SHACL, distribución de nulos y fecha de última actualización. En la presentación universitaria, este panel es una prueba de madurez. En un producto real, evita que el equipo publique datos rotos sin darse cuenta.

---

## 38. Estrategia de datasets desde el punto de vista de producto

Los datasets no deben presentarse al usuario como una lista técnica. Deben organizarse por preguntas. Para coste se usan alquiler y renta. Para servicios se usan hospitales, farmacias, colegios y POIs. Para movilidad se usan transporte, estaciones y accesibilidad. Para ambiente se usan calidad del aire, clima y ocupación del suelo. Para negocio se usan turismo, población, actividad económica, competencia y movilidad. Esta agrupación hace que la interfaz sea comprensible.

Internamente, cada dataset debe conservar su identidad. Aunque el usuario vea “servicios”, el sistema debe saber si un dato viene de MITECO, Sanidad, Educación, OSM o Catastro. Esta separación es importante porque dos fuentes pueden contradecirse o tener distinta granularidad. La app debe poder priorizar fuentes oficiales cuando existan y usar fuentes colaborativas como complemento, nunca mezclarlas sin etiquetado.

La estrategia de MVP debe ser ambiciosa pero realista. El primer objetivo no es cargar todos los datos existentes, sino tener una cadena completa con fuentes críticas. Municipios, geometrías, población, renta, alquiler, conectividad y servicios bastan para un primer producto útil. Después se añaden OSM, transporte, turismo, ambiente y negocio. Esta progresión reduce riesgo y permite demostrar valor rápido.

---

## 39. Microinteracciones y pulido premium

El producto debe cuidar pequeños detalles. Cuando el usuario cambia un peso, el ranking debe actualizarse con una transición suave y un mensaje que indique qué cambió. Cuando activa un filtro que elimina todos los resultados, la app debe sugerir relajar el filtro más restrictivo. Cuando una fuente falta, el resultado debe mostrar menor confianza sin romper la pantalla. Cuando el usuario exporta, debe recibir un archivo con nombre claro y metadatos.

Las tarjetas deben tener jerarquía visual. El score global es importante, pero no debe monopolizar. Las razones principales deben ocupar un lugar destacado. Los avisos deben ser visibles sin parecer errores fatales. Las fuentes deben estar a un clic. Los chips de filtros deben permitir desactivar restricciones de forma rápida. La interfaz debe hacer fácil lo que el usuario necesita repetir.

El diseño debe evitar tecnicismos en la capa principal. En lugar de “normalización min-max robusta”, debe decir “comparado con otras zonas”. En lugar de “granularidad municipal”, puede decir “dato disponible a nivel de municipio”. En modo avanzado sí se puede mostrar la terminología exacta. Esta doble capa de lenguaje hace que el producto sea accesible y defendible.

---

## 40. Criterios finales de aceptación del producto

El producto se considera aceptado cuando una persona puede completar los cinco flujos principales con datos reales y entender las recomendaciones sin explicación externa. Debe poder usar el asistente, ver mapa, interpretar ranking, abrir ficha, comparar zonas, revisar fuentes y exportar resultados. Si el usuario se queda mirando un mapa sin saber qué significa, el producto no está terminado.

El producto también se considera aceptado cuando un evaluador técnico puede seguir la cadena de datos desde fuente pública hasta interfaz. Debe existir un ejemplo documentado de extremo a extremo: fuente descargada, checksum, normalización, indicador, RDF, named graph, SHACL, score, explicación y UI. Esta cadena debe poder ejecutarse con comandos reproducibles.

La calidad visual forma parte de la aceptación. No basta con que funcione. Debe sentirse cuidado, consistente y confiable. Debe tener estados vacíos, errores, carga, datos parciales, responsive design, accesibilidad básica y microcopy claro. Una aplicación de decisión territorial debe transmitir orden y confianza.

---

## 41. Guion de demo obra de arte

La demo ideal comienza con una necesidad concreta: “quiero encontrar un municipio para teletrabajar en España con buena fibra, alquiler razonable, servicios básicos y entorno tranquilo”. Se abre la app, se selecciona perfil teletrabajo y se elige ámbito nacional. El mapa aparece con score de encaje y el ranking lateral muestra opciones. Se selecciona una zona, se lee la explicación y se observan sub-scores.

Después se cambia un peso, por ejemplo dando más importancia al coste. El ranking se actualiza y se explica el cambio. Esto demuestra que el sistema no está hardcodeado. Luego se abre el comparador entre tres zonas y se ven compromisos: una gana por conectividad, otra por coste, otra por servicios. Se exporta el resultado.

La demo técnica empieza desde una de esas zonas. Se abre el inspector de fuente para conectividad, se ve el dataset, la fecha de ingesta y el named graph. Se ejecuta una consulta SPARQL que recupera el indicador. Luego se muestra una validación SHACL. Finalmente se enseña el `sources.yaml`, los comandos de ingesta y la estructura del repositorio. La presentación termina volviendo al usuario: no era una demo de triples; era una app útil construida con una base semántica sólida.
