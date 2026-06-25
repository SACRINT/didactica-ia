'use client';

import { useState } from 'react';
import type { ExtractedPdfData, TeacherContext } from '@/types/planning';

interface Props {
  extractedData: ExtractedPdfData;
  onNext: (ctx: TeacherContext) => void;
  onBack: () => void;
}

const REGIONS = [
  'Sierra Norte',
  'Sierra Negra / Nororiente',
  'Mixteca',
  'Valle de Tehuacán',
  'Angelópolis',
  'Centro (Puebla Capital)',
  'Otra región',
];

export default function StepContext({ extractedData, onNext, onBack }: Props) {
  const [form, setForm] = useState<TeacherContext>({
    teacherName: '',
    schoolName: '',
    municipality: '',
    region: '',
    subsystem: 'bge',
    groupInfo: '',
    paecProblem: '',
    studentContext: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.teacherName.trim()) e.teacherName = 'Requerido';
    if (!form.schoolName.trim()) e.schoolName = 'Requerido';
    if (!form.municipality.trim()) e.municipality = 'Requerido';
    if (!form.paecProblem.trim())
      e.paecProblem = 'La problemática PAEC es requerida para contextualizar las actividades';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onNext(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <h2 className="card-title">Paso 3: Contexto escolar y PAEC</h2>
        <p className="card-subtitle">
          Esta información personaliza las actividades al contexto real de tus estudiantes y su
          comunidad. Es el hilo conductor de toda la planeación.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Plantel data */}
          <div className="section-card">
            <div className="section-card-header">
              <span style={{ fontSize: '18px' }}>🏫</span>
              <span className="section-card-title">Datos del plantel</span>
            </div>
            <div className="section-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div className="form-group">
                  <label className="form-label form-label-required">Nombre del(a) docente</label>
                  <input
                    className="form-input"
                    placeholder="Ej: Dra. María López Hernández"
                    value={form.teacherName}
                    onChange={e => setForm({ ...form, teacherName: e.target.value })}
                  />
                  {errors.teacherName && <span className="form-error">{errors.teacherName}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label form-label-required">Nombre del plantel</label>
                    <input
                      className="form-input"
                      placeholder="Ej: CBTa No. 5 / EMSAD 03"
                      value={form.schoolName}
                      onChange={e => setForm({ ...form, schoolName: e.target.value })}
                    />
                    {errors.schoolName && <span className="form-error">{errors.schoolName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label form-label-required">Municipio</label>
                    <input
                      className="form-input"
                      placeholder="Ej: Izúcar de Matamoros"
                      value={form.municipality}
                      onChange={e => setForm({ ...form, municipality: e.target.value })}
                    />
                    {errors.municipality && <span className="form-error">{errors.municipality}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Región</label>
                    <select
                      className="form-select"
                      value={form.region}
                      onChange={e => setForm({ ...form, region: e.target.value })}
                    >
                      <option value="">Selecciona una región</option>
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subsistema / Modalidad</label>
                    <select
                      className="form-select"
                      value={form.subsystem}
                      onChange={e => setForm({ ...form, subsystem: e.target.value as TeacherContext['subsystem'] })}
                    >
                      <option value="bge">Bachillerato General Estatal (BGE)</option>
                      <option value="digital">Bachillerato Digital</option>
                      <option value="emsad">EMSAD</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Grupos y número de estudiantes</label>
                  <input
                    className="form-input"
                    placeholder="Ej: 3°A (32 estudiantes), 3°B (30 estudiantes)"
                    value={form.groupInfo}
                    onChange={e => setForm({ ...form, groupInfo: e.target.value })}
                  />
                </div>

              </div>
            </div>
          </div>

          {/* PAEC context */}
          <div className="section-card">
            <div className="section-card-header">
              <span style={{ fontSize: '18px' }}>🌎</span>
              <span className="section-card-title">Contexto PAEC y comunidad</span>
            </div>
            <div className="section-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div className="form-group">
                  <label className="form-label form-label-required">
                    Problemática comunitaria detectada en el PAEC
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Describe la problemática social, ambiental o de salud que afecta a la comunidad. Ej: 'Alta incidencia de diabetes y obesidad en la población adulta del municipio, relacionada con malos hábitos alimenticios y automedicación sin prescripción médica.'"
                    value={form.paecProblem}
                    onChange={e => setForm({ ...form, paecProblem: e.target.value })}
                  />
                  {errors.paecProblem && <span className="form-error">{errors.paecProblem}</span>}
                  <span className="form-hint">
                    Esta problemática será el hilo conductor de TODAS las actividades didácticas.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Caracterización de los estudiantes</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Ej: 32 estudiantes de comunidades rurales, con acceso limitado a internet. Algunos hablan náhuatl. Tienen celular pero no computadora. Trabajan en negocios familiares del sector salud (farmacias)."
                    value={form.studentContext}
                    onChange={e => setForm({ ...form, studentContext: e.target.value })}
                  />
                  <span className="form-hint">
                    ¿Qué recursos tienen? ¿Zona rural o urbana? ¿Acceso a tecnología? ¿Lengua indígena?
                  </span>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Atrás</button>
        <button type="submit" className="btn btn-amber">
          Generar planeación →
        </button>
      </div>
    </form>
  );
}
