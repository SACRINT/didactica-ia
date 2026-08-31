'use client';

import { useState, useEffect } from 'react';
import type { GeneratedPlanningContent } from '@/types/planning';
import type { PlanningEditor } from '@/components/planeacion/PlanningEditor';

interface PlanningEditorWrapperProps {
  planningId: string;
  content: GeneratedPlanningContent;
}

export function PlanningEditorWrapper({ planningId, content }: PlanningEditorWrapperProps) {
  const [EditorComponent, setEditorComponent] = useState<typeof PlanningEditor | null>(null);

  useEffect(() => {
    import('@/components/planeacion/PlanningEditor').then(mod => {
      setEditorComponent(() => mod.PlanningEditor);
    });
  }, []);

  if (!EditorComponent) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-8 text-center">
        <div className="animate-pulse text-gray-400">Cargando editor...</div>
      </div>
    );
  }

  return <EditorComponent planningId={planningId} content={content} />;
}
