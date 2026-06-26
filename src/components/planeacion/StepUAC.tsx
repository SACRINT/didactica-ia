'use client';

import { useState, useEffect } from 'react';
import type { ExtractedPdfData } from '@/types/planning';

interface UACSelection {
  uacName: string;
  semester: number;
  component: string;
  curriculumName?: string;
}

interface Props {
  onNext: (data: UACSelection, initialData?: ExtractedPdfData) => void;
}

// Formación Laboral is NOT available in semester 1 or 2
const SEMESTERS_WITHOUT_LABORAL = [1, 2];

export default function StepUAC({ onNext }: Props) {
  const [form, setForm] = useState<UACSelection>({
    uacName: '',
    semester: 3,
    component: 'laboral',
    curriculumName: '',
  });

  const [catalogPrograms, setCatalogPrograms] = useState<any[]>([]);
  const [selectedCatalogUac, setSelectedCatalogUac] = useState<any>(null);
  const [isManualInput, setIsManualInput] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isLaboralDisabled = SEMESTERS_WITHOUT_LABORAL.includes(form.semester);

  // Fetch programs from catalog when semester or component changes
  useEffect(() => {
    const fetchPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const res = await fetch(`/api/programs?semester=${form.semester}&component=${form.component}`);
        const data = await res.json();
        
        if (data.programs) {
          setCatalogPrograms(data.programs);
          
          if (data.programs.length > 0) {
            // Auto-select the first program from catalog
            const first = data.programs[0];
            setSelectedCatalogUac(first);
            setForm(prev => ({
              ...prev,
              uacName: first.uac_name,
              curriculumName: first.curriculum_name || '',
            }));
            setIsManualInput(false);
          } else {
            // If no catalog programs, default to manual input
            setSelectedCatalogUac(null);
            setForm(prev => ({
              ...prev,
              uacName: '',
              curriculumName: '',
            }));
            setIsManualInput(true);
          }
        }
      } catch (err) {
        console.error('Error fetching catalog programs:', err);
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, [form.semester, form.component]);

  // When semester changes, auto-switch to 'fundamental' if laboral is not available
  const handleSemesterChange = (newSemester: number) => {
    const nextComponent =
      SEMESTERS_WITHOUT_LABORAL.includes(newSemester) && form.component === 'laboral'
        ? 'fundamental'
        : form.component;
    setForm({ ...form, semester: newSemester, component: nextComponent });
  };

  const handleUacSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'manual') {
      setIsManualInput(true);
      setSelectedCatalogUac(null);
      setForm(prev => ({ ...prev, uacName: '', curriculumName: '' }));
    } else {
      setIsManualInput(false);
      const selected = catalogPrograms.find(p => p.id === val);
      if (selected) {
        setSelectedCatalogUac(selected);
        setForm(prev => ({
          ...prev,
          uacName: selected.uac_name,
          curriculumName: selected.curriculum_name || '',
        }));
      }
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.uacName.trim()) e.uacName = 'El nombre de la UAC es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isManualInput || !selectedCatalogUac) {
      onNext(form);
    } else {
      // Pass catalog details as pre-filled extractedData
      const initialData: ExtractedPdfData = {
        uacName: selectedCatalogUac.uac_name,
        learningOutcome: selectedCatalogUac.learning_outcome,
        totalHours: selectedCatalogUac.total_hours,
        activities: selectedCatalogUac.activities,
        evidences: selectedCatalogUac.evidences,
        parseConfidence: 'high',
      };
      onNext(form, initialData);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Paso 1: Datos de la UAC</h2>
      <p className="card-subtitle">
        Ingresa los datos básicos de la Unidad de Aprendizaje Curricular que vas a planear.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label-required">Semestre</label>
              <select
                className="form-select"
                value={form.semester}
                onChange={e => handleSemesterChange(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map(s => (
                  <option key={s} value={s}>{s}° Semestre</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label form-label-required">Componente curricular</label>
              <select
                className="form-select"
                value={form.component}
                onChange={e => setForm({ ...form, component: e.target.value })}
              >
                <option value="fundamental">Currículum Fundamental</option>
                <option value="ampliado">Currículum Ampliado</option>
                <option
                  value="laboral"
                  disabled={isLaboralDisabled}
                  style={isLaboralDisabled ? { color: '#aaa' } : {}}
                >
                  Formación Laboral{isLaboralDisabled ? ' (3°-6° sem.)' : ''}
                </option>
              </select>
              {isLaboralDisabled && (
                <span className="form-hint" style={{ color: 'var(--c-amber)', fontWeight: 500 }}>
                  ⚠️ Formación Laboral no aplica para 1° y 2° semestre.
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Nombre de la UAC</label>
            
            {loadingPrograms ? (
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                <div className="spinner spinner-dark" style={{ width: '16px', height: '16px' }} />
                <span>Cargando programas del catálogo...</span>
              </div>
            ) : catalogPrograms.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select
                  className="form-select"
                  value={isManualInput ? 'manual' : (selectedCatalogUac?.id || '')}
                  onChange={handleUacSelectChange}
                >
                  {catalogPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.uac_name} {p.curriculum_name ? `(${p.curriculum_name})` : ''}
                    </option>
                  ))}
                  <option value="manual">➕ Agregar otra UAC (capturar manualmente / subir PDF)</option>
                </select>

                {isManualInput && (
                  <input
                    className="form-input animate-fade-in"
                    placeholder="Escribe el nombre de la UAC..."
                    value={form.uacName}
                    onChange={e => setForm({ ...form, uacName: e.target.value })}
                    required
                  />
                )}
              </div>
            ) : (
              <input
                className="form-input"
                placeholder="Escribe el nombre de la UAC..."
                value={form.uacName}
                onChange={e => setForm({ ...form, uacName: e.target.value })}
                required
              />
            )}
            
            {errors.uacName && <span className="form-error">{errors.uacName}</span>}
            <span className="form-hint">
              Selecciona una UAC del catálogo oficial o escribe el nombre exacto como aparece en tu programa de estudios.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre del currículo / especialidad</label>
            <input
              className="form-input"
              placeholder={isManualInput ? "Ej: Área de la Salud, Turismo, Administración..." : ""}
              value={form.curriculumName || ''}
              onChange={e => setForm({ ...form, curriculumName: e.target.value })}
              disabled={!isManualInput}
              style={!isManualInput ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : {}}
            />
            <span className="form-hint">
              El nombre de la especialidad o currículo al que pertenece esta UAC (se autocompleta con el catálogo).
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button type="submit" className="btn btn-primary">
              Continuar →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
