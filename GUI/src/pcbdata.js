var roboteq155v7 = require('../roboteq155v7.json');
var secumain93V7 = require('../secumain93v7.json');
var roboteqv9162 = require('../roboteqv9162.json');

var source = localStorage.getItem('KiCad_HTML_BOM__#source');
if (!source) {
    localStorage.setItem('KiCad_HTML_BOM__#source', "roboteq155v7")
    source = localStorage.getItem('KiCad_HTML_BOM__#source');
}
console.log('source', source);

var pcb = {};
switch (source) {
    case "roboteq155v7":
        pcb = roboteq155v7;
        break;
    case "secumain93v7":
        pcb = secumain93V7;
        break;
    case "roboteqv9162":
        pcb = roboteqv9162;
        break;
    default:
        break;
}
module.exports = pcb;