import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(process.env.DATABASE_URL);

// ─── Teacher queries ───────────────────────────────────────────────────────

export async function getTeacherByEmail(email: string) {
  const rows = await sql`
    SELECT id, name, email, school_name, municipality, subsystem, created_at
    FROM teachers
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createTeacher(data: {
  name: string;
  email: string;
  schoolName?: string;
  municipality?: string;
  subsystem?: string;
}) {
  const rows = await sql`
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
  const rows = await sql`
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
  const rows = await sql`
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
  return sql`
    SELECT id, teacher_id, uac_name, semester, component, curriculum_name,
           status, created_at, updated_at
    FROM plannings
    WHERE teacher_id = ${teacherId}::uuid
    ORDER BY created_at DESC
  `;
}

export async function getPlanningById(id: string, teacherId: string) {
  const rows = await sql`
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
  const rows = await sql`
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
  const rows = await sql`
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
  await sql`
    UPDATE plannings
    SET status = 'downloaded', updated_at = NOW()
    WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
  `;
}

export async function deletePlanning(id: string, teacherId: string) {
  await sql`
    DELETE FROM plannings
    WHERE id = ${id}::uuid AND teacher_id = ${teacherId}::uuid
  `;
}

// ─── PDF uploads ────────────────────────────────────────────────────────────

export async function savePdfUpload(data: {
  teacherId: string;
  planningId?: string;
  filename: string;
  blobUrl: string;
  parsedOk: boolean;
}) {
  const rows = await sql`
    INSERT INTO uploaded_pdfs (teacher_id, planning_id, filename, blob_url, parsed_ok)
    VALUES (
      ${data.teacherId}::uuid,
      ${data.planningId ? `${data.planningId}::uuid` : null},
      ${data.filename},
      ${data.blobUrl},
      ${data.parsedOk}
    )
    RETURNING *
  `;
  return rows[0];
}
