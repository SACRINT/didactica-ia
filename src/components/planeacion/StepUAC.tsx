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

function cleanSocioemotionalName(name: string, semester: number): string {
  let clean = name.replace(/^Ámbito de la Formación Socioemocional:\s*/i, '');
  const romans = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
  const roman = romans[semester] || '';
  if (roman && !clean.endsWith(` ${roman}`)) {
    clean = `${clean} ${roman}`;
  }
  return clean;
}

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
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  const isLaboralDisabled = SEMESTERS_WITHOUT_LABORAL.includes(form.semester);
  const isFfeDisabled = form.semester < 5;

  // Extract unique specialties from catalog programs when in Formación Laboral mode
  const specialties = form.component === 'laboral'
    ? Array.from(new Set(catalogPrograms.map(p => p.curriculum_name).filter(Boolean))).sort() as string[]
    : [];

  // Filter UACs by the selected specialty
  const filteredUacs = form.component === 'laboral'
    ? catalogPrograms.filter(p => p.curriculum_name === selectedSpecialty)
    : catalogPrograms;

  // Fetch programs from catalog when semester or component changes
  useEffect(() => {
    const fetchPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const res = await fetch(`/api/programs?semester=${form.semester}&component=${form.component}`);
        const data = await res.json();
        
        if (data.programs) {
          let filteredPrograms = data.programs;
          if (form.component === 'ampliado') {
            if (form.semester === 1 || form.semester === 2) {
              // Only allow Artísticas/Culturales and Físicas/Deportivas in 1st & 2nd semesters
              filteredPrograms = data.programs.filter((p: any) => 
                p.uac_name.includes('Artísticas y Culturales') || 
                p.uac_name.includes('Físicas y Deportivas')
              );
            } else {
              // Semesters 3-6: Only allow the other 3
              filteredPrograms = data.programs.filter((p: any) => 
                !p.uac_name.includes('Artísticas y Culturales') && 
                !p.uac_name.includes('Físicas y Deportivas')
              );
            }
          }

          setCatalogPrograms(filteredPrograms);
          
          if (filteredPrograms.length > 0) {
            if (form.component === 'laboral') {
              // Extract unique specialties
              const specs = Array.from(
                new Set(filteredPrograms.map((p: any) => p.curriculum_name).filter(Boolean))
              ).sort() as string[];
              
              if (specs.length > 0) {
                const initialSpec = specs[0];
                setSelectedSpecialty(initialSpec);
                
                // Filter UACs by that specialty
                const filtered = filteredPrograms.filter((p: any) => p.curriculum_name === initialSpec);
                if (filtered.length > 0) {
                  const first = filtered[0];
                  setSelectedCatalogUac(first);
                  setForm(prev => ({
                    ...prev,
                    uacName: first.uac_name,
                    curriculumName: first.curriculum_name || '',
                  }));
                  setIsManualInput(false);
                }
              } else {
                setSelectedSpecialty('');
                setSelectedCatalogUac(null);
                setForm(prev => ({ ...prev, uacName: '', curriculumName: '' }));
                setIsManualInput(true);
              }
            } else {
              // For other components, select first UAC directly
              const first = filteredPrograms[0];
              setSelectedCatalogUac(first);
              setForm(prev => ({
                ...prev,
                uacName: form.component === 'ampliado' ? cleanSocioemotionalName(first.uac_name, form.semester) : first.uac_name,
                curriculumName: first.curriculum_name || '',
              }));
              setIsManualInput(false);
              setSelectedSpecialty('');
            }
          } else {
            setSelectedCatalogUac(null);
            setForm(prev => ({
              ...prev,
              uacName: '',
              curriculumName: '',
            }));
            setIsManualInput(true);
            setSelectedSpecialty('');
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
    let nextComponent = form.component;
    if (SEMESTERS_WITHOUT_LABORAL.includes(newSemester) && form.component === 'laboral') {
      nextComponent = 'fundamental';
    } else if (newSemester < 5 && form.component === 'ext_optativo') {
      nextComponent = 'fundamental';
    }
    
    setForm(prev => {
      let updatedUacName = prev.uacName;
      if (prev.component === 'ampliado' && selectedCatalogUac) {
        updatedUacName = cleanSocioemotionalName(selectedCatalogUac.uac_name, newSemester);
      }
      return {
        ...prev,
        semester: newSemester,
        component: nextComponent,
        uacName: updatedUacName
      };
    });
  };

  const handleSpecialtyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'manual_specialty') {
      setIsManualInput(true);
      setSelectedSpecialty('');
      setSelectedCatalogUac(null);
      setForm(prev => ({ ...prev, uacName: '', curriculumName: '' }));
    } else {
      setIsManualInput(false);
      setSelectedSpecialty(val);
      // Find UACs for this specialty
      const uacsForSpec = catalogPrograms.filter(p => p.curriculum_name === val);
      if (uacsForSpec.length > 0) {
        const first = uacsForSpec[0];
        setSelectedCatalogUac(first);
        setForm(prev => ({
          ...prev,
          uacName: first.uac_name,
          curriculumName: first.curriculum_name || '',
        }));
      }
    }
  };

  const handleUacSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'manual') {
      setIsManualInput(true);
      setSelectedCatalogUac(null);
      setForm(prev => ({
        ...prev,
        uacName: '',
        curriculumName: form.component === 'laboral' ? selectedSpecialty : '',
      }));
    } else {
      setIsManualInput(false);
      const selected = catalogPrograms.find(p => p.id === val);
      if (selected) {
        setSelectedCatalogUac(selected);
        setForm(prev => ({
          ...prev,
          uacName: form.component === 'ampliado' ? cleanSocioemotionalName(selected.uac_name, form.semester) : selected.uac_name,
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
        year: selectedCatalogUac.year,
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
                <option value="ext_obligatorio">F. Fundamental Extendida Obligatoria (FFEO)</option>
                <option
                  value="ext_optativo"
                  disabled={isFfeDisabled}
                  style={isFfeDisabled ? { color: '#aaa' } : {}}
                >
                  F. Fundamental Extendida (FFE){isFfeDisabled ? ' (5°-6° sem.)' : ''}
                </option>
                <option value="ampliado">Currículum Ampliado</option>
                <option
                  value="laboral"
                  disabled={isLaboralDisabled}
                  style={isLaboralDisabled ? { color: '#aaa' } : {}}
                >
                  Formación Laboral{isLaboralDisabled ? ' (3°-6° sem.)' : ''}
                </option>
              </select>
              {isLaboralDisabled && form.component === 'laboral' && (
                <span className="form-hint" style={{ color: 'var(--c-amber)', fontWeight: 500 }}>
                  ⚠️ Formación Laboral no aplica para 1° y 2° semestre.
                </span>
              )}
              {isFfeDisabled && form.component === 'ext_optativo' && (
                <span className="form-hint" style={{ color: 'var(--c-amber)', fontWeight: 500 }}>
                  ⚠️ F. Fundamental Extendida (FFE) no aplica para semestres anteriores a 5º.
                </span>
              )}
            </div>
          </div>

          {form.component === 'laboral' && !loadingPrograms && catalogPrograms.length > 0 && (
            <div className="form-group animate-fade-in">
              <label className="form-label form-label-required">Especialidad / Capacitación</label>
              <select
                className="form-select"
                value={isManualInput && selectedSpecialty === '' ? 'manual_specialty' : selectedSpecialty}
                onChange={handleSpecialtyChange}
              >
                {specialties.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
                <option value="manual_specialty">➕ Otra especialidad (capturar manualmente)</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label form-label-required">Nombre de la UAC</label>
            
            {loadingPrograms ? (
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                <div className="spinner spinner-dark" style={{ width: '16px', height: '16px' }} />
                <span>Cargando UACs del catálogo...</span>
              </div>
            ) : catalogPrograms.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select
                  className="form-select"
                  value={isManualInput ? 'manual' : (selectedCatalogUac?.id || '')}
                  onChange={handleUacSelectChange}
                >
                  {(form.component === 'laboral' ? filteredUacs : catalogPrograms).map((p) => {
                    const displayName = form.component === 'ampliado'
                      ? cleanSocioemotionalName(p.uac_name, form.semester)
                      : p.uac_name;
                    const suffix = form.component === 'laboral'
                      ? ''
                      : form.component === 'ampliado'
                        ? '' // Hide (MCC FORMACION SOCIOEMOCIONAL)
                        : p.curriculum_name ? ` (${p.curriculum_name})` : '';
                    return (
                      <option key={p.id} value={p.id}>
                        {displayName}{suffix} ({p.year})
                      </option>
                    );
                  })}
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
