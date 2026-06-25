export type PlanningStatus = 'draft' | 'generated' | 'downloaded';

export type Subsystem = 'bge' | 'digital' | 'emsad';

export type CurriculumComponent = 'laboral' | 'fundamental' | 'ampliado';

export interface KeyActivity {
  name: string;
  hours: number;
  order: number;
}

export interface ExtractedPdfData {
  uacName: string;
  learningOutcome: string;
  totalHours: number;
  activities: KeyActivity[];
  evidences: string[];
  rawText?: string;
  parseConfidence: 'high' | 'medium' | 'low' | 'failed';
}

export interface TeacherContext {
  teacherName: string;
  schoolName: string;
  municipality: string;
  region: string;
  subsystem: Subsystem;
  groupInfo: string;
  paecProblem: string;
  studentContext: string;
}

export interface TransversalityItem {
  area: string;
  description: string;
}

export interface ActivityPhase {
  activities: string;
  processes: string;
  materials: string;
}

export interface KeyActivityPlan {
  name: string;
  hours: number;
  methodology: string;
  apertura: ActivityPhase;
  ejecucion: ActivityPhase;
  conclusion: ActivityPhase;
}

export interface EvaluationRow {
  type: string;
  agent: string;
  moment: string;
  evidence: string;
  instrument: string;
  percentage: number;
}

export interface GeneratedPlanningContent {
  // Section I - Admin Data (pre-filled from context)
  sectionI: {
    teacherName: string;
    uacName: string;
    semester: number;
    groups: string;
    schoolYear: string;
    applicationPeriod: string;
    estimatedSessions: string;
    component: string;
    totalHours: number;
    subsystem: string;
  };
  // Section II - Curricular Intent
  sectionII: {
    purpose: string;
    learningOutcomes: string[];
    paecConnection: string;
    activities: KeyActivity[];
  };
  // Section III - Transversality
  sectionIII: {
    fundamentalCurriculum: TransversalityItem[];
    expandedCurriculum: TransversalityItem[];
  };
  // Section IV - Didactic Sequence
  sectionIV: {
    note: string;
    activities: KeyActivityPlan[];
  };
  // Section V - Formative Evaluation
  sectionV: {
    evaluations: EvaluationRow[];
  };
  // Section VI - Resources
  sectionVI: {
    studentMaterials: string[];
    teacherMaterials: string[];
    digital: string[];
    spaces: string[];
    references: string[];
  };
  // Section VII - Signatures (always empty template)
  sectionVII: Record<string, never>;
}

export interface Planning {
  id: string;
  teacherId: string;
  uacName: string;
  semester: number;
  component: CurriculumComponent;
  curriculumName: string;
  paecContext: string;
  extractedData: ExtractedPdfData | null;
  contentJson: GeneratedPlanningContent | null;
  status: PlanningStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanningInput {
  uacName: string;
  semester: number;
  component: CurriculumComponent;
  curriculumName?: string;
  extractedData: ExtractedPdfData;
  context: TeacherContext;
}
