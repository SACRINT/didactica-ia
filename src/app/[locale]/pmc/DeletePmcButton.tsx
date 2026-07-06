'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeletePmcButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('¿Seguro que deseas eliminar este PMC? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pmc/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Error al eliminar el PMC');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-sm"
      style={{ backgroundColor: '#dc3545', borderColor: '#dc3545', color: '#fff', opacity: loading ? 0.6 : 1 }}
    >
      {loading ? '...' : '🗑'}
    </button>
  );
}
