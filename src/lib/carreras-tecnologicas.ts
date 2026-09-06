/**
 * Catálogo Oficial de Carreras Técnicas y Módulos Profesionales
 * Bachilleratos Tecnológicos · DBEPA Puebla
 * Ciclo Escolar 2026-2027
 */

export interface SubmoduloCarrera {
  nombre: string;
  abreviatura: string;
  horasSemanales: number;
}

export interface ModuloCarrera {
  nombre: string; // "Módulo I", "Módulo II", etc.
  semestre: number; // 2, 3, 4, 5, 6
  horasSemanales: number;
  submodulos: SubmoduloCarrera[];
}

export interface CarreraTecnica {
  id: string;
  nombre: string;
  tipoPrograma: "nuevo" | "anterior"; // nuevo = Acuerdos 09/08/23 y 09/05/24 (Tercera edición 2024); anterior = Acuerdo 653
  acuerdo: string;
  edicion: string;
  horasTotales: number;
  modulos: ModuloCarrera[];
}

/**
 * Catálogo de UACs Propedéuticas Oficiales para 5.º Semestre en Bachilleratos Tecnológicos (3 hrs semanales)
 */
export const CATALOGO_PROPEDUTICAS_5TO: { nombre: string; area: string; horas: number }[] = [
  // Económico-Administrativa
  { nombre: "Derecho y Sociedad I", area: "Económico-Administrativa", horas: 3 },
  { nombre: "Introducción a la Economía", area: "Económico-Administrativa", horas: 3 },
  { nombre: "Introducción a la Administración", area: "Económico-Administrativa", horas: 3 },
  // Físico-Matemática
  { nombre: "Temas de Física", area: "Físico-Matemática", horas: 3 },
  { nombre: "Dibujo Técnico", area: "Físico-Matemática", horas: 3 },
  { nombre: "Matemáticas Aplicadas", area: "Físico-Matemática", horas: 3 },
  // Químico-Biológica
  { nombre: "Bioquímica", area: "Químico-Biológica", horas: 3 },
  { nombre: "Biología Contemporánea", area: "Químico-Biológica", horas: 3 },
  { nombre: "Ciencias de la Salud I", area: "Químico-Biológica", horas: 3 },
  // Humanidades y Ciencias Sociales
  { nombre: "Sociología", area: "Humanidades y Ciencias Sociales", horas: 3 },
  { nombre: "Antropología", area: "Humanidades y Ciencias Sociales", horas: 3 },
  { nombre: "Psicología", area: "Humanidades y Ciencias Sociales", horas: 3 },
];

export const CARRERAS_TECNOLOGICAS: CarreraTecnica[] = [
  // ── 1. CONTABILIDAD (NUEVO PROGRAMA 2024) ──────────────────────────
  {
    id: "contabilidad",
    nombre: "Contabilidad",
    tipoPrograma: "nuevo",
    acuerdo: "09/05/24",
    edicion: "Tercera edición 2024",
    horasTotales: 1200,
    modulos: [
      {
        nombre: "Módulo I. Registra información financiera de una entidad económica",
        semestre: 2,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Registra operaciones contables", abreviatura: "REG-CONT", horasSemanales: 12 },
          { nombre: "Formula información financiera", abreviatura: "FORM-INF", horasSemanales: 5 }
        ]
      },
      {
        nombre: "Módulo II. Registra costos y nómina de una entidad económica",
        semestre: 3,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Elabora contabilidad de costos", abreviatura: "CONT-COST", horasSemanales: 11 },
          { nombre: "Realiza nómina de forma electrónica", abreviatura: "NOM-ELEC", horasSemanales: 6 }
        ]
      },
      {
        nombre: "Módulo III. Realiza operaciones tributarias de personas físicas y morales",
        semestre: 4,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Determina contribuciones fiscales de personas físicas", abreviatura: "FISC-FIS", horasSemanales: 10 },
          { nombre: "Determina contribuciones fiscales de personas morales", abreviatura: "FISC-MOR", horasSemanales: 7 }
        ]
      },
      {
        nombre: "Módulo IV. Auxilia en actividades de auditoría",
        semestre: 5,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Verifica operaciones contables", abreviatura: "VERIF-CONT", horasSemanales: 7 },
          { nombre: "Asiste en el cierre de auditoría", abreviatura: "ASIST-AUD", horasSemanales: 5 }
        ]
      },
      {
        nombre: "Módulo V. Asiste en el análisis y planeación financiera",
        semestre: 6,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Colabora en el análisis financiero de una entidad económica", abreviatura: "ANAL-FIN", horasSemanales: 6 },
          { nombre: "Contribuye en la planeación financiera de una entidad económica", abreviatura: "PLAN-FIN", horasSemanales: 6 }
        ]
      }
    ]
  },

  // ── 2. CONTABILIDAD (PROGRAMA ANTERIOR - ACUERDO 653) ──────────────
  {
    id: "contabilidad-anterior",
    nombre: "Contabilidad (Plan Anterior)",
    tipoPrograma: "anterior",
    acuerdo: "Acuerdo 653",
    edicion: "Edición 2017/2019",
    horasTotales: 1200,
    modulos: [
      {
        nombre: "Módulo I. Registra operaciones contables de empresas comerciales y de servicios",
        semestre: 2,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Registra información contable de diversas entidades económicas", abreviatura: "REG-INF-C", horasSemanales: 12 },
          { nombre: "Formula estados financieros de las empresas", abreviatura: "EDO-FIN", horasSemanales: 5 }
        ]
      },
      {
        nombre: "Módulo II. Opera los procesos contables dentro de un sistema electrónico",
        semestre: 3,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Registra información contable en forma electrónica", abreviatura: "CONT-ELEC", horasSemanales: 11 },
          { nombre: "Registra información de los recursos materiales y financieros", abreviatura: "REC-MAT-F", horasSemanales: 6 }
        ]
      },
      {
        nombre: "Módulo III. Registra operaciones contables de una entidad fabril",
        semestre: 4,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Registra información contable de diversas entidades fabriles", abreviatura: "CONT-FAB", horasSemanales: 11 },
          { nombre: "Genera nóminas en forma electrónica", abreviatura: "GEN-NOM", horasSemanales: 6 }
        ]
      },
      {
        nombre: "Módulo IV. Determina las contribuciones fiscales de personas físicas y morales",
        semestre: 5,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Genera información fiscal de las personas físicas", abreviatura: "INF-FISC-F", horasSemanales: 7 },
          { nombre: "Genera información fiscal de las personas morales", abreviatura: "INF-FISC-M", horasSemanales: 5 }
        ]
      },
      {
        nombre: "Módulo V. Asiste en actividades de auditoría de una entidad económica",
        semestre: 6,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Verifica que la información contable corresponda a las políticas", abreviatura: "VERIF-POL", horasSemanales: 6 },
          { nombre: "Controla cuentas por cobrar y por pagar de la entidad económica", abreviatura: "CTA-COB-P", horasSemanales: 6 }
        ]
      }
    ]
  },

  // ── 3. PROGRAMACIÓN (NUEVO PROGRAMA 2024) ──────────────────────────
  {
    id: "programacion",
    nombre: "Programación",
    tipoPrograma: "nuevo",
    acuerdo: "09/05/24",
    edicion: "Tercera edición 2024",
    horasTotales: 1200,
    modulos: [
      {
        nombre: "Módulo I. Desarrolla software de sistemas informáticos",
        semestre: 2,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Diseña software de sistemas informáticos", abreviatura: "DIS-SW", horasSemanales: 5 },
          { nombre: "Codifica software de sistemas informáticos", abreviatura: "COD-SW", horasSemanales: 7 },
          { nombre: "Implementa software de sistemas informáticos", abreviatura: "IMP-SW", horasSemanales: 5 }
        ]
      },
      {
        nombre: "Módulo II. Desarrolla software con herramientas orientadas a la productividad",
        semestre: 3,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Emplea frameworks para el desarrollo de software", abreviatura: "FRAMEWORKS", horasSemanales: 9 },
          { nombre: "Aplica metodologías ágiles para el desarrollo de software", abreviatura: "METOD-AGIL", horasSemanales: 8 }
        ]
      },
      {
        nombre: "Módulo III. Administra bases de datos en un sistema de información",
        semestre: 4,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Implementa Base de Datos Relacionales en un sistema de información", abreviatura: "BD-REL", horasSemanales: 9 },
          { nombre: "Implementa Base de Datos no Relacionales en un sistema de información", abreviatura: "BD-NOREL", horasSemanales: 8 }
        ]
      },
      {
        nombre: "Módulo IV. Desarrolla aplicaciones web en un sistema de información",
        semestre: 5,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Construye aplicaciones web", abreviatura: "CONST-WEB", horasSemanales: 6 },
          { nombre: "Implementa aplicaciones web", abreviatura: "IMP-WEB", horasSemanales: 6 }
        ]
      },
      {
        nombre: "Módulo V. Desarrolla aplicaciones móviles multiplataforma",
        semestre: 6,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Diseña aplicaciones móviles multiplataforma", abreviatura: "DIS-MOVIL", horasSemanales: 6 },
          { nombre: "Implementa aplicaciones móviles multiplataforma", abreviatura: "IMP-MOVIL", horasSemanales: 6 }
        ]
      }
    ]
  },

  // ── 4. OFIMÁTICA (NUEVO PROGRAMA 2024) ─────────────────────────────
  {
    id: "ofimatica",
    nombre: "Ofimática",
    tipoPrograma: "nuevo",
    acuerdo: "09/05/24",
    edicion: "Tercera edición 2024",
    horasTotales: 1200,
    modulos: [
      {
        nombre: "Módulo I. Gestiona equipo de cómputo para el uso de aplicaciones informáticas",
        semestre: 2,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Instala sistemas operativos en equipo de cómputo", abreviatura: "INST-SO", horasSemanales: 6 },
          { nombre: "Administra sistemas operativos en equipo de cómputo", abreviatura: "ADM-SO", horasSemanales: 5 },
          { nombre: "Implementa conectividad en equipo de cómputo", abreviatura: "IMP-CONECT", horasSemanales: 6 }
        ]
      },
      {
        nombre: "Módulo II. Procesa información utilizando herramientas informáticas",
        semestre: 3,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Procesa información utilizando procesadores de texto", abreviatura: "PROC-TEXT", horasSemanales: 6 },
          { nombre: "Procesa datos utilizando herramientas de hojas de cálculo", abreviatura: "HOJAS-CALC", horasSemanales: 6 },
          { nombre: "Elabora presentaciones utilizando herramientas multimedia", abreviatura: "PRES-MULT", horasSemanales: 5 }
        ]
      },
      {
        nombre: "Módulo III. Gestiona información para ordenar y salvaguardar documentos",
        semestre: 4,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Gestiona correo electrónico para ordenar y salvaguardar documentos", abreviatura: "CORREO-E", horasSemanales: 5 },
          { nombre: "Administra archivos utilizando herramientas ofimáticas", abreviatura: "ADM-ARCH", horasSemanales: 6 },
          { nombre: "Auxilia en procesos de auditoría utilizando herramientas tecnológicas", abreviatura: "AUD-OFIM", horasSemanales: 6 }
        ]
      },
      {
        nombre: "Módulo IV. Optimiza procesos utilizando herramientas tecnológicas",
        semestre: 5,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Automatiza procesos combinando herramientas tecnológicas", abreviatura: "AUT-PROC", horasSemanales: 4 },
          { nombre: "Automatiza procesos implementando scripting", abreviatura: "SCRIPTING", horasSemanales: 4 },
          { nombre: "Optimiza procesos utilizando hosting e inteligencia artificial generativa", abreviatura: "IA-HOSTING", horasSemanales: 4 }
        ]
      },
      {
        nombre: "Módulo V. Gestiona información para la toma de decisiones",
        semestre: 6,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Implementa bases de datos para organizar información", abreviatura: "BD-OFIM", horasSemanales: 6 },
          { nombre: "Gestiona datos en una base de datos", abreviatura: "GEST-DATOS", horasSemanales: 6 }
        ]
      }
    ]
  },

  // ── 5. ADMINISTRACIÓN DE RECURSOS HUMANOS (NUEVO PROGRAMA 2024) ────
  {
    id: "administracion-recursos-humanos",
    nombre: "Administración de Recursos Humanos",
    tipoPrograma: "nuevo",
    acuerdo: "09/05/24",
    edicion: "Tercera edición 2024",
    horasTotales: 1200,
    modulos: [
      {
        nombre: "Módulo I. Gestiona trámites administrativos del área de recursos humanos",
        semestre: 2,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Ejecuta procedimientos administrativos del área de recursos humanos", abreviatura: "PROC-ADM-RH", horasSemanales: 10 },
          { nombre: "Gestiona documentación del área de recursos humanos", abreviatura: "DOC-RH", horasSemanales: 7 }
        ]
      },
      {
        nombre: "Módulo II. Integra el talento humano en la organización",
        semestre: 3,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Gestiona el proceso de reclutamiento, selección y admisión del talento humano", abreviatura: "RECL-TAL", horasSemanales: 9 },
          { nombre: "Gestiona los procesos de inducción del talento humano", abreviatura: "INDUC-TAL", horasSemanales: 8 }
        ]
      },
      {
        nombre: "Módulo III. Implementa plan de desarrollo del talento humano",
        semestre: 4,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Gestiona los procesos de capacitación para el desarrollo del talento humano", abreviatura: "CAPAC-TAL", horasSemanales: 9 },
          { nombre: "Promueve condiciones de trabajo seguras e higiénicas", abreviatura: "SEG-HIG-TR", horasSemanales: 8 }
        ]
      },
      {
        nombre: "Módulo IV. Evalúa el desempeño del talento humano",
        semestre: 5,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Gestiona la aplicación de la evaluación del desempeño humano", abreviatura: "EVAL-DESEMP", horasSemanales: 6 },
          { nombre: "Mide el desempeño del talento humano", abreviatura: "MED-DESEMP", horasSemanales: 6 }
        ]
      },
      {
        nombre: "Módulo V. Determina remuneraciones del talento humano",
        semestre: 6,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Auxilia en el cálculo de la nómina ordinaria", abreviatura: "NOM-ORD", horasSemanales: 6 },
          { nombre: "Auxilia en el cálculo de la nómina extraordinaria", abreviatura: "NOM-EXTRA", horasSemanales: 6 }
        ]
      }
    ]
  },

  // ── 6. SOPORTE Y MANTENIMIENTO DE EQUIPO DE CÓMPUTO ────────────────
  {
    id: "soporte-mantenimiento-computo",
    nombre: "Soporte y Mantenimiento de Equipo de Cómputo",
    tipoPrograma: "anterior",
    acuerdo: "Acuerdo 653",
    edicion: "Edición 2017/2019",
    horasTotales: 1200,
    modulos: [
      {
        nombre: "Módulo I. Ensambla, configura e instala hardware y software en el equipo de cómputo",
        semestre: 2,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Ensambla e instala controladores y dispositivos periféricos", abreviatura: "ENS-PERIF", horasSemanales: 10 },
          { nombre: "Instala y configura software", abreviatura: "INST-CONF-SW", horasSemanales: 7 }
        ]
      },
      {
        nombre: "Módulo II. Mantiene hardware y software en el equipo de cómputo",
        semestre: 3,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Realiza mantenimiento preventivo", abreviatura: "MANT-PREV", horasSemanales: 7 },
          { nombre: "Realiza mantenimiento correctivo", abreviatura: "MANT-CORR", horasSemanales: 10 }
        ]
      },
      {
        nombre: "Módulo III. Proporciona soporte técnico presencial o a distancia en software y hardware",
        semestre: 4,
        horasSemanales: 17,
        submodulos: [
          { nombre: "Brinda soporte técnico de manera presencial", abreviatura: "SOP-PRES", horasSemanales: 6 },
          { nombre: "Brinda soporte técnico a distancia", abreviatura: "SOP-DIST", horasSemanales: 11 }
        ]
      },
      {
        nombre: "Módulo IV. Diseña e instala redes de computadoras",
        semestre: 5,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Clasifica los elementos básicos de la red LAN", abreviatura: "ELEM-LAN", horasSemanales: 5 },
          { nombre: "Diseña la red LAN", abreviatura: "DIS-LAN", horasSemanales: 7 }
        ]
      },
      {
        nombre: "Módulo V. Opera y administra redes de computadoras",
        semestre: 6,
        horasSemanales: 12,
        submodulos: [
          { nombre: "Instala una red LAN", abreviatura: "INST-LAN", horasSemanales: 6 },
          { nombre: "Opera una red LAN", abreviatura: "OPERA-LAN", horasSemanales: 6 }
        ]
      }
    ]
  }
];

/**
 * Obtener lista de carreras del nuevo programa (Acuerdo 09/08/23 y 09/05/24)
 */
export function getCarrerasNuevas(): CarreraTecnica[] {
  return CARRERAS_TECNOLOGICAS.filter(c => c.tipoPrograma === "nuevo");
}

/**
 * Obtener lista de carreras del programa anterior (Acuerdo 653)
 */
export function getCarrerasAnteriores(): CarreraTecnica[] {
  return CARRERAS_TECNOLOGICAS.filter(c => c.tipoPrograma === "anterior");
}

/**
 * Obtener módulos de una carrera por semestre
 */
export function getModulosPorSemestre(
  carreraId: string,
  semestre: number,
  versionPrograma?: "nuevo" | "anterior"
): ModuloCarrera | undefined {
  let carrera = CARRERAS_TECNOLOGICAS.find(c => c.id === carreraId);

  // Si se busca "contabilidad" con version anterior, buscar la variante anterior si existe
  if (versionPrograma === "anterior" && carrera?.tipoPrograma === "nuevo") {
    const varianteAnterior = CARRERAS_TECNOLOGICAS.find(
      c => c.id === `${carreraId}-anterior` || (c.nombre.toLowerCase().includes(carreraId.toLowerCase()) && c.tipoPrograma === "anterior")
    );
    if (varianteAnterior) carrera = varianteAnterior;
  } else if (versionPrograma === "nuevo" && carrera?.tipoPrograma === "anterior") {
    const varianteNueva = CARRERAS_TECNOLOGICAS.find(
      c => c.id === carreraId.replace("-anterior", "") && c.tipoPrograma === "nuevo"
    );
    if (varianteNueva) carrera = varianteNueva;
  }

  if (!carrera) {
    // Fallback inteligente: buscar por prefijo
    carrera = CARRERAS_TECNOLOGICAS.find(c => c.id.startsWith(carreraId) || carreraId.startsWith(c.id));
  }

  return carrera?.modulos.find(m => m.semestre === semestre);
}
