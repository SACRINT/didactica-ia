const fs = require('fs');

const uacs = JSON.parse(fs.readFileSync('C:\\Users\\samue\\.gemini\\antigravity\\brain\\ed37a3e5-9696-4fbc-8cdc-fecebfd91fe5\\scratch\\uacs_list.json', 'utf8'));

console.log('--- REVISIÓN DE UACS EXISTENTES EN DB ---');
console.log('Total UACs en DB:', uacs.length);

const compCount = {};
uacs.forEach(u => {
  compCount[u.component] = (compCount[u.component] ? compCount[u.component] : 0) + 1;
});
console.log('Por componente en DB actual:\n', JSON.stringify(compCount, null, 2));

const semComp = {};
uacs.forEach(u => {
  const k = 'Semestre ' + u.semester + ' - ' + u.component;
  semComp[k] = (semComp[k] ? semComp[k] : 0) + 1;
});
console.log('\nPor Semestre y Componente en DB actual:\n', JSON.stringify(semComp, null, 2));
