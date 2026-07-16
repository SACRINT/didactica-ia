'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function DeletePipsButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    await fetch(`/api/pips/${id}`, { method: 'DELETE' });
    startTransition(() => router.refresh());
  }

  if (confirm) {
    return (
      <span style={{ display: 'inline-flex', gap: 4 }}>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="btn btn-sm"
          style={{ background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {pending ? '…' : 'Sí, borrar'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="btn btn-sm btn-secondary"
          style={{ cursor: 'pointer' }}
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="btn btn-sm"
      style={{ background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', cursor: 'pointer' }}
    >
      Eliminar
    </button>
  );
}
