'use client';

import React, { useState } from 'react';

interface DeletePaecButtonProps {
  id: string;
}

export default function DeletePaecButton({ id }: DeletePaecButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto PAEC-PEC? Esta acción borrará todas las fases generadas y no se puede deshacer.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/paec/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar el proyecto');
        setIsDeleting(false);
      }
    } catch (err) {
      console.error('Failed to delete PAEC project:', err);
      alert('Ocurrió un error al intentar eliminar el proyecto.');
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="btn btn-danger btn-sm"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        backgroundColor: '#dc3545',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 600,
        opacity: isDeleting ? 0.7 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <span>🗑️</span> {isDeleting ? 'Borrando...' : 'Borrar'}
    </button>
  );
}
