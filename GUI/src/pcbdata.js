var roboteq155v7 = require('../roboteq155v7.json');

var source = JSON.parse(localStorage.getItem('KiCad_HTML_BOM__#source'));
if (!source) {
  localStorage.setItem('KiCad_HTML_BOM__#source', JSON.stringify(roboteq155v7))
  source = JSON.parse(localStorage.getItem('KiCad_HTML_BOM__#source'));
}
console.log('source', source);
//
var pcb = {};

if (source) {
  pcb = source
}
module.exports = pcb;
