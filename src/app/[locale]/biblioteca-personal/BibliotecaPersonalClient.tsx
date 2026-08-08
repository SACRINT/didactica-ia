'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, File, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';

interface Doc {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export function BibliotecaPersonalClient() {
  const t = useTranslations();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/biblioteca-personal');
      if (!res.ok) throw new Error('Error al cargar documentos');
      const data = await res.json();
      setDocs(data.docs);
    } catch (error) {
      toast.error('Error al cargar la biblioteca');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Reset input
    e.target.value = '';

    if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
      toast.error('Solo se permiten archivos PDF o TXT');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede exceder los 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    const toastId = toast.loading('Subiendo y analizando documento...');
    try {
      const res = await fetch('/api/biblioteca-personal', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al subir');
      }

      toast.success('Documento guardado y analizado con éxito', { id: toastId });
      fetchDocs();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento de tu biblioteca?')) return;

    try {
      const res = await fetch('/api/biblioteca-personal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Error al eliminar');

      toast.success('Documento eliminado');
      fetchDocs();
    } catch (error: any) {
      toast.error('Error al eliminar');
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Biblioteca Documental Personal</h1>
        <p className="text-slate-600 mt-2">
          Sube tus diagnósticos de grupo, FODA, y lineamientos escolares. La Inteligencia Artificial de DidactecaIA leerá estos documentos y los tomará en cuenta automáticamente al generar tus planeaciones, PAEC, y proyectos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 shadow-sm h-fit bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">Subir Documento</h3>
            <p className="text-sm text-slate-500 mt-1">Formatos soportados: PDF, TXT (Max 10MB)</p>
          </div>
          <div className="p-6">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Upload className="h-10 w-10 text-slate-400 mb-4" />
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <button 
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center font-medium transition-colors"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                    </>
                  ) : (
                    'Seleccionar Archivo'
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              Esta información es privada y solo se usará para personalizar tus propias creaciones.
            </p>
          </div>
        </div>

        <div className="md:col-span-2 shadow-sm bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">Mis Documentos</h3>
            <p className="text-sm text-slate-500 mt-1">
              Estos documentos forman parte de tu contexto educativo personal.
            </p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 rounded-lg border border-slate-100">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">Tu biblioteca está vacía</h3>
                <p className="text-slate-500 mt-1 text-sm">
                  Sube documentos para que la IA comprenda mejor tu contexto escolar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <File className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-slate-900 truncate max-w-[250px] sm:max-w-[400px]">
                          {doc.file_name}
                        </h4>
                        <div className="flex text-xs text-slate-500 gap-3 mt-1">
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          <span>{formatSize(doc.file_size)}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
