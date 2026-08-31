'use client';

import { useState } from 'react';
import { BookOpen, ClipboardList, Presentation, HelpCircle, Package, Loader2, Download } from 'lucide-react';

interface BundleGeneratorProps {
  planningId: string;
  uacName: string;
}

const BUNDLE_TYPES = [
  { type: 'guia', label: 'Guía del Alumno', icon: BookOpen, desc: 'Hoja de trabajo imprimible con ejercicios NEM' },
  { type: 'instrumento', label: 'Instrumento Evaluación', icon: ClipboardList, desc: 'Lista de cotejo y coevaluación fotocopiable' },
  { type: 'diapositivas', label: 'Guion de Diapositivas', icon: Presentation, desc: 'Estructura de láminas para proyectar en clase' },
  { type: 'quiz', label: 'Quiz Diagnóstico', icon: HelpCircle, desc: '5-10 reactivos de opción múltiple' },
];

export function BundleGenerator({ planningId, uacName }: BundleGeneratorProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const handleGenerate = async (type: string) => {
    setGenerating(type);
    setError('');
    try {
      const res = await fetch('/api/bundles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planningId, type }),
      });
      if (!res.ok) throw new Error('Error al generar');
      const data = await res.json();
      setResults(prev => ({ ...prev, [type]: data.result }));
    } catch (err) {
      setError('Error al generar el material. Intenta de nuevo.');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating('full');
    setError('');
    try {
      const res = await fetch('/api/bundles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planningId, type: 'full' }),
      });
      if (!res.ok) throw new Error('Error al generar bundle completo');
      const data = await res.json();
      setResults({
        guia: data.bundle.guiaEstudiante,
        instrumento: data.bundle.instrumentoEvaluacion,
        diapositivas: data.bundle.guionDiapositivas,
        quiz: data.bundle.quiz,
      });
    } catch (err) {
      setError('Error al generar el bundle completo.');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = (type: string, content: string) => {
    const labels: Record<string, string> = {
      guia: 'Guia_Alumno',
      instrumento: 'Instrumento_Evaluacion',
      diapositivas: 'Guion_Diapositivas',
      quiz: 'Quiz_Diagnostico',
    };
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${labels[type]}_${uacName.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Bundles Didácticos de Aula</h3>
          </div>
          <button
            onClick={handleGenerateAll}
            disabled={generating === 'full'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {generating === 'full' ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
            {generating === 'full' ? 'Generando 4 materiales...' : 'Generar Todo (1-Click)'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        {BUNDLE_TYPES.map(({ type, label, icon: Icon, desc }) => (
          <div key={type} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {results[type] && (
                  <button
                    onClick={() => handleDownload(type, results[type])}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Descargar"
                  >
                    <Download size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleGenerate(type)}
                  disabled={generating === type || generating === 'full'}
                  className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors disabled:opacity-50"
                >
                  {generating === type ? <Loader2 size={12} className="animate-spin" /> : results[type] ? 'Regenerar' : 'Generar'}
                </button>
              </div>
            </div>
            {results[type] && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 max-h-20 overflow-hidden">
                {results[type].substring(0, 150)}...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
