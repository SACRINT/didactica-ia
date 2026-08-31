import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// ─── Lazy SQL client ────────────────────────────────────────────────────────
// Instantiated on first call at runtime, not at build time.
// Prevents Vercel build failures when DATABASE_URL is missing during static analysis.
let _client: NeonQueryFunction<false, false> | null = null;

export function sql(): NeonQueryFunction<false, false> {
  if (!_client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _client = neon(process.env.DATABASE_URL);
  }
  return _client;
}

// ─── Teacher queries ────────────────────────────────────────────────────────

export async function getTeacherByEmail(email: string) {
  const rows = await sql()`
    SELECT id, name, email, school_name, municipality, subsystem, cct,
           custom_api_key, custom_api_provider, role, created_at,
           profile_completed, school_locked
    FROM teachers
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] || null;
}



export async function updateTeacherKey(teacherId: string, customApiKey: string | null, customApiProvider: string | null) {
  const rows = await sql()`
    UPDATE teachers
    SET
      custom_api_key = ${customApiKey},
      custom_api_provider = ${customApiProvider}
    WHERE id = ${teacherId}::uuid
    RETURNING id, email, custom_api_provider
  `;
  return rows[0];
}

export async function createTeacher(data: {
  name: string;
  email: string;
  schoolName?: string;
  municipality?: string;
  subsystem?: string;
}) {
  const rows = await sql()`
    INSERT INTO teachers (name, email, school_name, municipality, subsystem)
    VALUES (${data.name}, ${data.email}, ${data.schoolName || null}, ${data.municipality || null}, ${data.subsystem || null})
    RETURNING id, name, email, school_name, municipality, subsystem, created_at
  `;
  return rows[0];
}

export async function upsertTeacher(data: {
  name: string;
  email: string;
}) {
  const rows = await sql()`
    INSERT INTO teachers (name, email)
    VALUES (${data.name}, ${data.email})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, email, school_name, municipality, subsystem, created_at
  `;
  return rows[0];
}

export async function updateTeacherProfile(teacherId: string, data: {
  schoolName?: string;
  municipality?: string;
  subsystem?: string;
}) {
  const rows = await sql()`
    UPDATE teachers
    SET
      school_name = COALESCE(${data.schoolName || null}, school_name),
      municipality = COALESCE(${data.municipality || null}, municipality),
      subsystem = COALESCE(${data.subsystem || null}, subsystem)
    WHERE id = ${teacherId}::uuid
    RETURNING *
  `;
  return rows[0];
}

// ─── Planning queries ───────────────────────────────────────────────────────

export async function getPlanningsByTeacher(teacherId: string) {
  return sql()`
    SELECT id, teacher_id, uac_name, semester, component, curriculum_name,
           status, created_at, updated_at
    FROM plannings
    WHERE teacher_id = ${teacherId}::uuid
    ORDER BY created_at DESC
  `;
}

export async function getPlanningById(id: string, teacherId: string) {
  const rows = await sql()`
    SELECT *
    FROM plannings
    WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createPlanning(data: {
  teacherId: string;
  uacName: string;
  semester: number;
  component: string;
  curriculumName?: string;
  paecContext?: string;
  extractedData?: object;
}) {
  const rows = await sql()`
    INSERT INTO plannings (
      teacher_id, uac_name, semester, component,
      curriculum_name, paec_context, extracted_data, status
    )
    VALUES (
      ${data.teacherId}::uuid,
      ${data.uacName},
      ${data.semester},
      ${data.component},
      ${data.curriculumName || null},
      ${data.paecContext || null},
      ${data.extractedData ? JSON.stringify(data.extractedData) : null},
      'draft'
    )
    RETURNING *
  `;
  return rows[0];
}

export async function updatePlanningContent(
  id: string,
  teacherId: string,
  contentJson: object
) {
  const rows = await sql()`
    UPDATE plannings
    SET
      content_json = ${JSON.stringify(contentJson)},
      status = 'generated',
      updated_at = NOW()
    WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
    RETURNING *
  `;
  return rows[0];
}

export async function markPlanningDownloaded(id: string, teacherId: string) {
  await sql()`
    UPDATE plannings
    SET status = 'downloaded', updated_at = NOW()
    WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
  `;
}

export async function deletePlanning(id: string, teacherId: string) {
  await sql()`
    DELETE FROM plannings
    WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
  `;
}

// ─── PDF uploads ─────────────────────────────────────────────────────────────

export async function savePdfUpload(data: {
  teacherId: string;
  planningId?: string;
  filename: string;
  blobUrl: string;
  parsedOk: boolean;
}) {
  const rows = await sql()`
    INSERT INTO uploaded_pdfs (teacher_id, planning_id, filename, blob_url, parsed_ok)
    VALUES (
      ${data.teacherId}::uuid,
      ${data.planningId ? data.planningId : null},
      ${data.filename},
      ${data.blobUrl},
      ${data.parsedOk}
    )
    RETURNING *
  `;
  return rows[0];
}

// ─── Programs Catalog queries ────────────────────────────────────────────────

// ─── Programs Catalog queries ────────────────────────────────────────────────

export interface ProgramCatalogItem {
  id?: string;
  uac_name: string;
  semester: number;
  component: string;
  curriculum_name?: string | null;
  year?: number;
  total_hours: number;
  learning_outcome: string;
  activities: any;
  evidences: any;
  contenidos_formativos?: any;
  subsystem?: string;
  model_type?: string;
  created_at?: string;
}

export async function getProgramsCatalog(semester?: number, component?: string, subsystem?: string) {
  const client = sql();
  const normalizedSubsystem = (subsystem && subsystem !== 'all' && subsystem !== 'todos') ? subsystem.toLowerCase() : null;
  const normalizedComponent = (component && component !== 'all' && component !== 'todos') ? component : null;
  const sem = (semester !== undefined && !isNaN(semester)) ? semester : null;

  return client`
    SELECT id, uac_name, semester, component, curriculum_name, year, total_hours, 
           learning_outcome, activities, evidences, contenidos_formativos, subsystem, model_type, created_at
    FROM programs_catalog
    WHERE (${sem}::int IS NULL OR semester = ${sem})
      AND (${normalizedComponent}::text IS NULL OR component = ${normalizedComponent})
      AND (${normalizedSubsystem}::text IS NULL OR subsystem = ${normalizedSubsystem} OR subsystem = 'all' OR subsystem IS NULL)
    ORDER BY semester ASC, component ASC, uac_name ASC
  `;
}

export async function getProgramsCatalogForPaec(semesters: number[], subsystem?: string) {
  const client = sql();
  if (subsystem && subsystem !== 'all') {
    return client`
      SELECT uac_name, semester, component, subsystem, model_type
      FROM programs_catalog
      WHERE semester = ANY(${semesters}) AND (subsystem = ${subsystem.toLowerCase()} OR subsystem = 'all' OR subsystem IS NULL)
      ORDER BY semester, uac_name ASC
    `;
  }
  return client`
    SELECT uac_name, semester, component, subsystem, model_type
    FROM programs_catalog
    WHERE semester = ANY(${semesters})
    ORDER BY semester, uac_name ASC
  `;
}

export async function createProgramCatalogItem(data: ProgramCatalogItem) {
  const rows = await sql()`
    INSERT INTO programs_catalog (
      uac_name, semester, component, curriculum_name, year, total_hours,
      learning_outcome, activities, evidences, contenidos_formativos, subsystem, model_type
    ) VALUES (
      ${data.uac_name.trim()},
      ${data.semester},
      ${data.component},
      ${data.curriculum_name || null},
      ${data.year || 2026},
      ${data.total_hours},
      ${data.learning_outcome},
      ${JSON.stringify(data.activities || [])}::jsonb,
      ${JSON.stringify(data.evidences || [])}::jsonb,
      ${data.contenidos_formativos ? JSON.stringify(data.contenidos_formativos) : null}::jsonb,
      ${(data.subsystem || 'bge').toLowerCase()},
      ${data.model_type || (data.semester >= 5 ? 'progresiones' : 'propositos_contenidos')}
    )
    ON CONFLICT (uac_name, semester, component, subsystem)
    DO UPDATE SET
      curriculum_name = EXCLUDED.curriculum_name,
      year = EXCLUDED.year,
      total_hours = EXCLUDED.total_hours,
      learning_outcome = EXCLUDED.learning_outcome,
      activities = EXCLUDED.activities,
      evidences = EXCLUDED.evidences,
      contenidos_formativos = EXCLUDED.contenidos_formativos,
      model_type = EXCLUDED.model_type
    RETURNING *
  `;
  return rows[0];
}

export async function updateProgramCatalogItem(id: string, data: Partial<ProgramCatalogItem>) {
  const existing = await sql()`SELECT * FROM programs_catalog WHERE id = ${id}::uuid LIMIT 1`;
  if (existing.length === 0) return null;

  const current = existing[0];
  const uac_name = data.uac_name !== undefined ? data.uac_name.trim() : current.uac_name;
  const semester = data.semester !== undefined ? data.semester : current.semester;
  const component = data.component !== undefined ? data.component : current.component;
  const curriculum_name = data.curriculum_name !== undefined ? data.curriculum_name : current.curriculum_name;
  const year = data.year !== undefined ? data.year : current.year;
  const total_hours = data.total_hours !== undefined ? data.total_hours : current.total_hours;
  const learning_outcome = data.learning_outcome !== undefined ? data.learning_outcome : current.learning_outcome;
  const activities = data.activities !== undefined ? JSON.stringify(data.activities) : JSON.stringify(current.activities);
  const evidences = data.evidences !== undefined ? JSON.stringify(data.evidences) : JSON.stringify(current.evidences);
  const contenidos_formativos = data.contenidos_formativos !== undefined ? JSON.stringify(data.contenidos_formativos) : (current.contenidos_formativos ? JSON.stringify(current.contenidos_formativos) : null);
  const subsystem = data.subsystem !== undefined ? data.subsystem.toLowerCase() : current.subsystem;
  const model_type = data.model_type !== undefined ? data.model_type : current.model_type;

  const rows = await sql()`
    UPDATE programs_catalog SET
      uac_name = ${uac_name},
      semester = ${semester},
      component = ${component},
      curriculum_name = ${curriculum_name},
      year = ${year},
      total_hours = ${total_hours},
      learning_outcome = ${learning_outcome},
      activities = ${activities}::jsonb,
      evidences = ${evidences}::jsonb,
      contenidos_formativos = ${contenidos_formativos ? contenidos_formativos : null}::jsonb,
      subsystem = ${subsystem},
      model_type = ${model_type}
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  return rows[0];
}

export async function deleteProgramCatalogItem(id: string) {
  const rows = await sql()`
    DELETE FROM programs_catalog WHERE id = ${id}::uuid RETURNING id, uac_name
  `;
  return rows[0];
}


// ─── Planning Extras queries ──────────────────────────────────────────────────

export async function getPlanningExtras(planningId: string, teacherId: string) {
  return sql()`
    SELECT pe.id, pe.planning_id, pe.type, pe.title, pe.key_index, pe.content_text, pe.created_at
    FROM planning_extras pe
    JOIN plannings p ON pe.planning_id = p.id
    WHERE pe.planning_id = ${planningId}::uuid AND p.teacher_id = ${teacherId}::uuid
    ORDER BY pe.created_at ASC
  `;
}

export async function getPlanningExtraById(id: string, teacherId: string) {
  const rows = await sql()`
    SELECT pe.id, pe.planning_id, pe.type, pe.title, pe.key_index, pe.content_text, pe.created_at
    FROM planning_extras pe
    JOIN plannings p ON pe.planning_id = p.id
    WHERE pe.id = ${id}::uuid AND p.teacher_id = ${teacherId}::uuid
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createPlanningExtra(
  data: {
    planningId: string;
    type: 'rubric' | 'checklist' | 'material' | 'lesson_plan';
    title: string;
    keyIndex: number | null;
    contentText: string;
  },
  teacherId: string
) {
  // First verify planning ownership
  const pRows = await sql()`
    SELECT id FROM plannings
    WHERE id = ${data.planningId}::uuid AND teacher_id = ${teacherId}::uuid
    LIMIT 1
  `;
  if (pRows.length === 0) {
    throw new Error('Planeación no encontrada o no autorizada');
  }

  const rows = await sql()`
    INSERT INTO planning_extras (planning_id, type, title, key_index, content_text)
    VALUES (
      ${data.planningId}::uuid,
      ${data.type},
      ${data.title},
      ${data.keyIndex},
      ${data.contentText}
    )
    RETURNING id, planning_id, type, title, key_index, content_text, created_at
  `;
  return rows[0];
}

export async function deletePlanningExtra(id: string, teacherId: string) {
  await sql()`
    DELETE FROM planning_extras
    WHERE id = ${id}::uuid AND planning_id IN (
      SELECT id FROM plannings WHERE teacher_id = ${teacherId}::uuid
    )
  `;
}

// ─── PAEC Projects queries ──────────────────────────────────────────────────

export async function getPaecProjectsByTeacher(teacherId: string) {
  return sql()`
    SELECT id, teacher_id, project_name, problem_statement, cycle_type, current_step, status, created_at, updated_at
    FROM paec_projects
    WHERE teacher_id = ${teacherId}::uuid
    ORDER BY created_at DESC
  `;
}

export async function getPaecProjectById(id: string, teacherId: string) {
  const rows = await sql()`
    SELECT *
    FROM paec_projects
    WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createPaecProject(data: {
  teacherId: string;
  projectName: string;
  problemStatement: string;
  cycleType: string;
  communityContext: object;
  schoolContext: object;
}) {
  const rows = await sql()`
    INSERT INTO paec_projects (
      teacher_id, project_name, problem_statement, cycle_type,
      community_context, school_context, current_step, status
    )
    VALUES (
      ${data.teacherId}::uuid,
      ${data.projectName},
      ${data.problemStatement},
      ${data.cycleType},
      ${JSON.stringify(data.communityContext)}::jsonb,
      ${JSON.stringify(data.schoolContext)}::jsonb,
      1,
      'draft'
    )
    RETURNING *
  `;
  return rows[0];
}

export async function updatePaecProjectStep(
  id: string,
  teacherId: string,
  step: number,
  fieldName: string,
  stepData: object
) {
  const status = step === 6 ? 'completed' : 'draft';
  const dataStr = JSON.stringify(stepData);

  let rows;
  if (fieldName === 'fase1_diagnostico') {
    rows = await sql()`
      UPDATE paec_projects
      SET fase1_diagnostico = ${dataStr}::jsonb, current_step = ${step}, status = ${status}, updated_at = NOW()
      WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
      RETURNING *
    `;
  } else if (fieldName === 'fase2_justificacion') {
    rows = await sql()`
      UPDATE paec_projects
      SET fase2_justificacion = ${dataStr}::jsonb, current_step = ${step}, status = ${status}, updated_at = NOW()
      WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
      RETURNING *
    `;
  } else if (fieldName === 'fase2_mapeo') {
    rows = await sql()`
      UPDATE paec_projects
      SET fase2_mapeo = ${dataStr}::jsonb, current_step = ${step}, status = ${status}, updated_at = NOW()
      WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
      RETURNING *
    `;
  } else if (fieldName === 'fase2_cronograma') {
    rows = await sql()`
      UPDATE paec_projects
      SET fase2_cronograma = ${dataStr}::jsonb, current_step = ${step}, status = ${status}, updated_at = NOW()
      WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
      RETURNING *
    `;
  } else if (fieldName === 'fase2_plan_operativo') {
    rows = await sql()`
      UPDATE paec_projects
      SET fase2_plan_operativo = ${dataStr}::jsonb, current_step = ${step}, status = ${status}, updated_at = NOW()
      WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
      RETURNING *
    `;
  } else if (fieldName === 'fase2_anexos') {
    rows = await sql()`
      UPDATE paec_projects
      SET fase2_anexos = ${dataStr}::jsonb, current_step = ${step}, status = ${status}, updated_at = NOW()
      WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
      RETURNING *
    `;
  } else {
    throw new Error('Campo de paso no válido');
  }
  return rows[0];
}

export async function deletePaecProject(id: string, teacherId: string) {
  await sql()`
    DELETE FROM paec_projects
    WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
  `;
}



