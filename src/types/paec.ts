export type CycleType = 'A' | 'B' | 'annual';
export type PaecStatus = 'draft' | 'completed';

export interface CommunityContext {
  location?: string;
  demographics?: string;
  economy?: string;
  traditions?: string;
  security?: string;
  environment?: string;
}

export interface SchoolContext {
  enrollment?: string;
  teacherCount?: string;
  indicators?: string;
  previousPrograms?: string;
  facilities?: string;
  activeLaboralUacs?: string[];
  activeFfeUacs?: string[];
  groupsConfig?: string;
  groupsCount?: string;
}

export interface TableRow2Cols {
  col1: string;
  col2: string;
}

export interface FODARow {
  aspect: string;
  analysis: string;
}

export interface Fase1Diagnostico {
  tabla1: TableRow2Cols[]; // Aspecto | Descripción (Comunidad)
  tabla2: TableRow2Cols[]; // Aspecto | Descripción (Educación)
  tabla3: FODARow[];        // Aspecto | Análisis Estratégico FODA
  tabla4: TableRow2Cols[]; // Etapa | Descripción del Proceso
}

export interface ProjectPurpose {
  educativo: string;
  social: string;
  funcional: string;
}

export interface ProjectScope {
  metas: string[];
  participantes: string[];
  recursos: string[];
}

export interface Fase2Justificacion {
  projectName: string;
  introduction: string;
  pilares: string[];
  proposito: ProjectPurpose;
  alcance: ProjectScope;
}

export interface MapeoRow {
  semester: number;
  uacName: string;
  topic: string;
  linking: string;
}

export interface CronogramaRow {
  phase: string;
  objective: string;
  macroActivities: string;
  semesterInvolved: string;
}

export interface PlanOperativoRow {
  phase: string;
  activity: string;
  uac: string;
  progression: string;
  strategy: string;
  week: string;
  responsibles: string;
}

export interface PlanOperativoData {
  semestreA: PlanOperativoRow[];
  semestreB: PlanOperativoRow[];
}

export interface AnexosData {
  anexo1: string; // Minuta
  anexo2: string; // Seguimiento
  anexo3: string; // Reporte mensual
  anexo4: string; // Cuestionario comunidad
  anexo5: string; // Autoevaluación
  anexo6: string; // Informe final
}

export interface PaecProject {
  id: string;
  teacherId: string;
  projectName: string;
  problemStatement: string;
  cycleType: CycleType;
  currentStep: number;
  
  communityContext: CommunityContext;
  schoolContext: SchoolContext;
  
  fase1Diagnostico: Fase1Diagnostico | null;
  fase2Justificacion: Fase2Justificacion | null;
  fase2Mapeo: MapeoRow[] | null;
  fase2Cronograma: CronogramaRow[] | null;
  fase2PlanOperativo: PlanOperativoData | null;
  fase2Anexos: AnexosData | null;
  
  status: PaecStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaecInput {
  projectName: string;
  problemStatement: string;
  cycleType: CycleType;
  communityContext: CommunityContext;
  schoolContext: SchoolContext;
}
