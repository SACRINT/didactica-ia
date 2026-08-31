import { Node, mergeAttributes } from '@tiptap/core';

// ── BloqueApertura ────────────────────────────────────────────────────────
export const BloqueApertura = Node.create({
  name: 'bloqueApertura',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      titulo: { default: 'Apertura' },
      duracion: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloque="apertura"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-bloque': 'apertura', class: 'bloque-apertura' }), 0];
  },
});

// ── BloqueDesarrollo ──────────────────────────────────────────────────────
export const BloqueDesarrollo = Node.create({
  name: 'bloqueDesarrollo',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      titulo: { default: 'Desarrollo' },
      duracion: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloque="desarrollo"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-bloque': 'desarrollo', class: 'bloque-desarrollo' }), 0];
  },
});

// ── BloqueCierre ──────────────────────────────────────────────────────────
export const BloqueCierre = Node.create({
  name: 'bloqueCierre',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      titulo: { default: 'Cierre' },
      duracion: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloque="cierre"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-bloque': 'cierre', class: 'bloque-cierre' }), 0];
  },
});

// ── BloqueRubrica ─────────────────────────────────────────────────────────
export const BloqueRubrica = Node.create({
  name: 'bloqueRubrica',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      titulo: { default: 'Rúbrica de Evaluación' },
      tipo: { default: 'analitica' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloque="rubrica"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-bloque': 'rubrica', class: 'bloque-rubrica' }), 0];
  },
});

// ── BloqueProposito ───────────────────────────────────────────────────────
export const BloqueProposito = Node.create({
  name: 'bloqueProposito',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      titulo: { default: 'Propósito Formativo' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloque="proposito"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-bloque': 'proposito', class: 'bloque-proposito' }), 0];
  },
});

// ── BloqueActividad ───────────────────────────────────────────────────────
export const BloqueActividad = Node.create({
  name: 'bloqueActividad',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      nombre: { default: 'Actividad Clave' },
      horas: { default: '' },
      corte: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloque="actividad"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-bloque': 'actividad', class: 'bloque-actividad' }), 0];
  },
});

// ── BloqueSeccion ─────────────────────────────────────────────────────────
export const BloqueSeccion = Node.create({
  name: 'bloqueSeccion',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      numero: { default: 'I' },
      titulo: { default: 'Sección' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bloque="seccion"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-bloque': 'seccion', class: 'bloque-seccion' }), 0];
  },
});
