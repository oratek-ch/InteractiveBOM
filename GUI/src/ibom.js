/* DOM manipulation and misc code */


var Split = require('../vender/split.js')
var globalData = require('./global.js')
var render = require('./render.js')
var pcb = require('./pcb.js')
var pcbdata = require('./pcbdata.js')

//TODO:  GLOBAL VARIABLE REFACTOR
var filter = "";
function getFilter(input) {
  return filter;
}

function setFilter(input) {
  filter = input.toLowerCase();
  populateBomTable();
}

function dbg(html) {
  dbgdiv.innerHTML = html;
}

function setDarkMode(value) {
  if (value) {
    topmostdiv.classList.add("dark");
  } else {
    topmostdiv.classList.remove("dark");
  }
  globalData.writeStorage("darkmode", value);
  render.redrawCanvas(allcanvas.front);
  render.redrawCanvas(allcanvas.back);
}


function createCheckboxChangeHandler(checkbox, bomentry) {
  return function () {
    if (bomentry.checkboxes.get(checkbox)) {
      bomentry.checkboxes.set(checkbox, false);
      globalData.writeStorage("checkbox" + "_" + checkbox.toLowerCase() + "_" + bomentry.reference, "false");
    }
    else {
      bomentry.checkboxes.set(checkbox, true);
      globalData.writeStorage("checkbox" + "_" + checkbox.toLowerCase() + "_" + bomentry.reference, "true");
    }

  }
}

function createClickHandler(bomentry) {
  return function () {
    // alert('Row clicked ' + bomentry.value);
    const Http = new XMLHttpRequest();
    const url = `https://cors-anywhere.herokuapp.com/https://api.element14.com/catalog/products?callInfo.responseDataFormat=JSON&term=manuPartNum:${bomentry.value}&storeInfo.id=fr.farnell.com&callInfo.apiKey=v4hqtkwq6j9rasxcqfwrz5c2&resultsSettings.responseGroup=small`;
    Http.open("GET", url);
    // Http.setRequestHeader('Access-Control-Allow-Origin', '*');
    Http.onreadystatechange = (e) => {
      // In local files, status is 0 upon success in Mozilla Firefox
      if (Http.readyState === XMLHttpRequest.DONE) {
        var status = Http.status;
        if (status === 0 || (status >= 200 && status < 400)) {
          // The request has been completed successfully
          console.log(Http.responseText);
          const res = JSON.parse(Http.responseText).manufacturerPartNumberSearchReturn;
          if (res.numberOfResults == 0) {
            alert(`Couldn't find reference ${bomentry.value} on fr.farnell.com website!`);
          } else {
            const p = res.products[0];
            var win = window.open(`https://fr.farnell.com/${p.sku}`, '_blank');
            if (win) {
              win.focus();
            }
          }
        } else {
          // Oh no! There has been an error with the request!
        }
      }
    };
    Http.send();
  }
}

function createRowHighlightHandler(rowid, refs) {
  return function () {
    if (globalData.getCurrentHighlightedRowId()) {
      if (globalData.getCurrentHighlightedRowId() == rowid) {
        return;
      }
      document.getElementById(globalData.getCurrentHighlightedRowId()).classList.remove("highlighted");
    }
    document.getElementById(rowid).classList.add("highlighted");
    globalData.setCurrentHighlightedRowId(rowid);
    globalData.setHighlightedRefs(refs);
    // If highlighted then a special color will be used for the part.
    render.drawHighlights(IsCheckboxClicked(globalData.getCurrentHighlightedRowId(), "placed"));
  }
}

function entryMatches(part) {
  // check refs
  if (part.reference.toLowerCase().indexOf(getFilter()) >= 0) {
    return true;
  }
  // check value
  if (part.value.toLowerCase().indexOf(getFilter()) >= 0) {
    return true;
  }
  // check footprint
  if (part.package.toLowerCase().indexOf(getFilter()) >= 0) {
    return true;
  }

  // Check the displayed attributes
  var additionalAttributes = globalData.getAdditionalAttributes().split(',');
  additionalAttributes = additionalAttributes.filter(function (e) { return e });
  for (var x of additionalAttributes) {
    // remove beginning and trailing whitespace
    x = x.trim()
    if (part.attributes.has(x)) {
      if (part.attributes.get(x).indexOf(getFilter()) >= 0) {
        return true;
      }
    }
  }

  return false;
}


function highlightFilter(s) {
  if (!getFilter()) {
    return s;
  }
  var parts = s.toLowerCase().split(getFilter());
  if (parts.length == 1) {
    return s;
  }
  var r = "";
  var pos = 0;
  for (var i in parts) {
    if (i > 0) {
      r += '<mark class="highlight">' +
        s.substring(pos, pos + getFilter().length) +
        '</mark>';
      pos += getFilter().length;
    }
    r += s.substring(pos, pos + parts[i].length);
    pos += parts[i].length;
  }
  return r;
}

function createColumnHeader(name, cls, comparator) {
  var th = document.createElement("TH");
  th.innerHTML = name;
  th.classList.add(cls);
  th.style.cursor = "pointer";
  var span = document.createElement("SPAN");
  span.classList.add("sortmark");
  span.classList.add("none");
  th.appendChild(span);
  th.onclick = function () {
    if (globalData.getCurrentSortColumn() && this !== globalData.getCurrentSortColumn()) {
      // Currently sorted by another column
      globalData.getCurrentSortColumn().childNodes[1].classList.remove(globalData.getCurrentSortOrder());
      globalData.getCurrentSortColumn().childNodes[1].classList.add("none");
      globalData.setCurrentSortColumn(null);
      globalData.setCurrentSortOrder(null);
    }

    if (globalData.getCurrentSortColumn() && this === globalData.getCurrentSortColumn()) {
      // Already sorted by this column
      if (globalData.getCurrentSortOrder() == "asc") {
        // Sort by this column, descending order
        globalData.setBomSortFunction(function (a, b) {
          return -comparator(a, b);
        });
        globalData.getCurrentSortColumn().childNodes[1].classList.remove("asc");
        globalData.getCurrentSortColumn().childNodes[1].classList.add("desc");
        globalData.setCurrentSortOrder("desc");
      }
      else {
        // Unsort
        globalData.setBomSortFunction(null);
        globalData.getCurrentSortColumn().childNodes[1].classList.remove("desc");
        globalData.getCurrentSortColumn().childNodes[1].classList.add("none");
        globalData.setCurrentSortColumn(null);
        globalData.setCurrentSortOrder(null);
      }
    }
    else {
      // Sort by this column, ascending order
      globalData.setBomSortFunction(comparator);
      globalData.setCurrentSortColumn(this);
      globalData.getCurrentSortColumn().childNodes[1].classList.remove("none");
      globalData.getCurrentSortColumn().childNodes[1].classList.add("asc");
      globalData.setCurrentSortOrder("asc");
    }
    populateBomBody();
  }
  return th;
}

// Describes how to sort checkboxes
function CheckboxCompare(stringName) {
  return (partA, partB) => {
    if (partA.checkboxes.get(stringName) && !partB.checkboxes.get(stringName)) {
      return 1;
    }
    else if (!partA.checkboxes.get(stringName) && partB.checkboxes.get(stringName)) {
      return -1;
    }
    else {
      return 0;
    }
  }
}

// Describes hoe to sort by attributes
function AttributeCompare(stringName) {
  return (partA, partB) => {
    if (partA.attributes.get(stringName) != partB.attributes.get(stringName)) return partA.attributes.get(stringName) > partB.attributes.get(stringName) ? 1 : -1;
    else return 0;
  }
}



function populateBomHeader() {
  while (bomhead.firstChild) {
    bomhead.removeChild(bomhead.firstChild);
  }

  var tr = document.createElement("TR");
  var th = document.createElement("TH");
  th.classList.add("numCol");
  tr.appendChild(th);


  var additionalCheckboxes = globalData.getBomCheckboxes().split(",");
  additionalCheckboxes = additionalCheckboxes.filter(function (e) { return e });
  globalData.setCheckboxes(additionalCheckboxes);
  for (var x2 of additionalCheckboxes) {
    // remove beginning and trailing whitespace
    x2 = x2.trim()
    if (x2) {
      tr.appendChild(createColumnHeader(x2, "Checkboxes", CheckboxCompare(x2)));
    }
  }

  tr.appendChild(createColumnHeader("References", "References", (partA, partB) => {
    if (partA.reference != partB.reference) return partA.reference > partB.reference ? 1 : -1;
    else return 0;
  }));

  tr.appendChild(createColumnHeader("Value", "Value", (partA, partB) => {
    if (partA.value != partB.value) return partA.value > partB.value ? 1 : -1;
    else return 0;
  }));

  tr.appendChild(createColumnHeader("Footprint", "Footprint", (partA, partB) => {
    if (partA.package != partB.package) return partA.package > partB.package ? 1 : -1;
    else return 0;
  }));

  var additionalAttributes = globalData.getAdditionalAttributes().split(',');
  // Remove null, "", undefined, and 0 values
  additionalAttributes = additionalAttributes.filter(function (e) { return e });
  for (var x of additionalAttributes) {
    // remove beginning and trailing whitespace
    x = x.trim()
    if (x) {
      tr.appendChild(createColumnHeader(x, "Attributes", AttributeCompare(x)));
    }
  }

  if (globalData.getCombineValues()) {
    //XXX: This comparison function is using positive and negative implicit
    tr.appendChild(createColumnHeader("Quantity", "Quantity", (partA, partB) => {
      return partA.quantity - partB.quantity;
    }));
  }

  bomhead.appendChild(tr);

}

////////////////////////////////////////////////////////////////////////////////
// Filter functions are defined here. These let the application filter
// elements out of the complete bom.
//
// The filtering function should return true if the part should be filtered out
// otherwise it returns false
////////////////////////////////////////////////////////////////////////////////
function GetBOMForSideOfBoard(location) {
  var result = pcb.GetBOM();
  switch (location) {
    case 'F':
      result = pcb.filterBOMTable(result, filterBOM_Front);
      break;
    case 'B':
      result = pcb.filterBOMTable(result, filterBOM_Back);
      break;
    default:
      break;
  }
  return result;
}

function filterBOM_Front(part) {
  var result = true;
  if (part.location == "F") {
    result = false;
  }
  return result;
}

function filterBOM_Back(part) {
  var result = true;
  if (part.location == "B") {
    result = false;
  }
  return result;
}

function filterBOM_ByAttribute(part) {
  var result = false;
  var splitFilterString = globalData.getRemoveBOMEntries().split(',');
  // Remove null, "", undefined, and 0 values
  splitFilterString = splitFilterString.filter(function (e) { return e });

  if (splitFilterString.length > 0) {
    for (var i of splitFilterString) {
      // removing beginning and trailing whitespace
      i = i.trim()
      if (part.attributes.has(i)) {
        // Id the value is an empty string then dont filter out the entry.
        // if the value is anything then filter out the bom entry
        if (part.attributes.get(i) != "") {
          result = true;
        }
      }
    }
  }

  return result;
}
////////////////////////////////////////////////////////////////////////////////

function GenerateBOMTable() {
  // Get bom table with elements for the side of board the user has selected
  var bomtableTemp = GetBOMForSideOfBoard(globalData.getCanvasLayout());

  // Apply attribute filter to board
  bomtableTemp = pcb.filterBOMTable(bomtableTemp, filterBOM_ByAttribute);

  // If the parts are displayed one per line (not combined values), then the the bom table needs to be flattened.
  // By default the data in the json file is combined
  bomtable = globalData.getCombineValues() ? pcb.GetBOMCombinedValues(bomtableTemp) : bomtableTemp;

  return bomtable;
}

//TODO: This should be rewritten to interact with json using the tags instead of
//      having all of the elements hardcoded.
function populateBomBody() {
  while (bom.firstChild) {
    bom.removeChild(bom.firstChild);
  }
  globalData.setHighlightHandlers([]);
  globalData.setCurrentHighlightedRowId(null);
  var first = true;

  bomtable = GenerateBOMTable();

  if (globalData.getBomSortFunction()) {
    bomtable = bomtable.slice().sort(globalData.getBomSortFunction());
  }
  for (var i in bomtable) {
    var bomentry = bomtable[i];
    var references = bomentry.reference;

    // remove entries that do not match filter
    if (getFilter() != "") {
      if (!entryMatches(bomentry)) {
        continue;
      }
    }


    // Hide placed parts option is set
    if (globalData.getHidePlacedParts()) {
      // Remove entries that have been placed. Check the placed parameter
      if (globalData.readStorage("checkbox" + "_" + "placed" + "_" + bomentry.reference) == "true") {
        continue;
      }
    }


    var tr = document.createElement("TR");
    var td = document.createElement("TD");
    var rownum = +i + 1;
    tr.id = "bomrow" + rownum;
    td.textContent = rownum;
    tr.appendChild(td);

    // Checkboxes
    var additionalCheckboxes = globalData.getBomCheckboxes().split(",");
    for (var checkbox of additionalCheckboxes) {
      checkbox = checkbox.trim();
      if (checkbox) {
        td = document.createElement("TD");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.onchange = createCheckboxChangeHandler(checkbox, bomentry);
        // read the value in from local storage

        if (globalData.readStorage("checkbox" + "_" + checkbox.toLowerCase() + "_" + bomentry.reference) == "true") {
          bomentry.checkboxes.set(checkbox, true)
        }
        else {
          bomentry.checkboxes.set(checkbox, false)
        }
        console.log(typeof (bomentry.checkboxes.get(checkbox)))
        if (bomentry.checkboxes.get(checkbox)) {
          input.checked = true;
        }
        else {
          input.checked = false;
        }

        td.appendChild(input);
        tr.appendChild(td);
      }
    }

    //INFO: The lines below add the control the columns on the bom table
    // References
    td = document.createElement("TD");
    td.innerHTML = highlightFilter(bomentry.value);
    td.onclick = createClickHandler(bomentry);
    tr.appendChild(td);
    // Value
    td = document.createElement("TD");
    td.innerHTML = highlightFilter(bomentry.value);
    td.onclick = createClickHandler(bomentry);
    tr.appendChild(td);
    // Footprint
    td = document.createElement("TD");
    td.innerHTML = highlightFilter(bomentry.package);
    td.onclick = createClickHandler(bomentry);
    tr.appendChild(td);

    // Attributes
    var additionalAttributes = globalData.getAdditionalAttributes().split(',');
    for (var x of additionalAttributes) {
      x = x.trim()
      if (x) {
        td = document.createElement("TD");
        td.innerHTML = highlightFilter(pcb.getAttributeValue(bomentry, x.toLowerCase()));
        tr.appendChild(td);
      }
    }

    if (globalData.getCombineValues()) {

      td = document.createElement("TD");
      td.textContent = bomentry.quantity;
      tr.appendChild(td);
    }
    bom.appendChild(tr);


    bom.appendChild(tr);
    var handler = createRowHighlightHandler(tr.id, references);
    tr.onmousemove = handler;
    globalData.pushHighlightHandlers({
      id: tr.id,
      handler: handler,
      refs: references
    });
    if (getFilter() && first) {
      handler();
      first = false;
    }
  }
}

function highlightPreviousRow() {
  if (!globalData.getCurrentHighlightedRowId()) {
    globalData.getHighlightHandlers()[globalData.getHighlightHandlers().length - 1].handler();
  } else {
    if (globalData.getHighlightHandlers().length > 1 &&
      globalData.getHighlightHandlers()[0].id == globalData.getCurrentHighlightedRowId()) {
      globalData.getHighlightHandlers()[globalData.getHighlightHandlers().length - 1].handler();
    } else {
      for (var i = 0; i < globalData.getHighlightHandlers().length - 1; i++) {
        if (globalData.getHighlightHandlers()[i + 1].id == globalData.getCurrentHighlightedRowId()) {
          globalData.getHighlightHandlers()[i].handler();
          break;
        }
      }
    }
  }
  render.smoothScrollToRow(globalData.getCurrentHighlightedRowId());
}

function highlightNextRow() {
  if (!globalData.getCurrentHighlightedRowId()) {
    globalData.getHighlightHandlers()[0].handler();
  } else {
    if (globalData.getHighlightHandlers().length > 1 &&
      globalData.getHighlightHandlers()[globalData.getHighlightHandlers().length - 1].id == globalData.getCurrentHighlightedRowId()) {
      globalData.getHighlightHandlers()[0].handler();
    } else {
      for (var i = 1; i < globalData.getHighlightHandlers().length; i++) {
        if (globalData.getHighlightHandlers()[i - 1].id == globalData.getCurrentHighlightedRowId()) {
          globalData.getHighlightHandlers()[i].handler();
          break;
        }
      }
    }
  }
  smoothScrollToRow(globalData.getCurrentHighlightedRowId());
}

function populateBomTable() {
  populateBomHeader();
  populateBomBody();
}

function modulesClicked(references) {
  var lastClickedIndex = references.indexOf(globalData.getLastClickedRef());
  var ref = references[(lastClickedIndex + 1) % references.length];
  for (var handler of globalData.getHighlightHandlers()) {
    if (handler.refs.indexOf(ref) >= 0) {
      globalData.setLastClickedRef(ref);
      handler.handler();
      smoothScrollToRow(globalData.getCurrentHighlightedRowId());
      break;
    }
  }
}

function silkscreenVisible(visible) {
  if (visible) {
    allcanvas.front.silk.style.display = "";
    allcanvas.back.silk.style.display = "";
    globalData.writeStorage("silkscreenVisible", true);
  } else {
    allcanvas.front.silk.style.display = "none";
    allcanvas.back.silk.style.display = "none";
    globalData.writeStorage("silkscreenVisible", false);
  }
}

function changeCanvasLayout(layout) {
  document.getElementById("fl-btn").classList.remove("depressed");
  document.getElementById("fb-btn").classList.remove("depressed");
  document.getElementById("bl-btn").classList.remove("depressed");
  switch (layout) {
    case 'F':
      document.getElementById("fl-btn").classList.add("depressed");
      if (globalData.getBomLayout() != "BOM") {
        globalData.collapseCanvasSplit(1);
      }
      break;
    case 'B':
      document.getElementById("bl-btn").classList.add("depressed");
      if (globalData.getBomLayout() != "BOM") {
        globalData.collapseCanvasSplit(0);
      }
      break;
    default:
      document.getElementById("fb-btn").classList.add("depressed");
      if (globalData.getBomLayout() != "BOM") {
        globalData.setSizesCanvasSplit([50, 50]);
      }
  }
  globalData.setCanvasLayout(layout);
  globalData.writeStorage("canvaslayout", layout);
  render.resizeAll();
  populateBomTable();
}

function createSelectSourceHandler() {
  return function () {
    var x = document.getElementById("files").value;
    localStorage.setItem("KiCad_HTML_BOM__#source", x);
    location = location;
  }
}

function populateFileSelector() {
  // var newSelect = document.getElementById("files");
  // newSelect.onchange = createSelectSourceHandler();

  const fileSelector = document.getElementById('files');
  fileSelector.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file.type) {
      console.log('Error: The File.type property does not appear to be supported on this browser.');
      return;
    }
    if (!file.name.match(".json$", "i")) {
      console.log('Error: The selected file does not appear to be an JSON file.');
      return;
    } else {
      console.log('This is a JSON file');
    }
    const reader = new FileReader();
    reader.addEventListener('load', event => {
      console.log(event);
      let src = event.target.result;
      src = src.replace("var pcbdata =","");
      src = eval('(' + src + ')');
      src = JSON.stringify(src)

      // src = src.replace(/\n/g,"").replace(/\t/g,"")
      // src = JSON.stringify(src)
      // src = src.replace(/\\\//g,"").replace("var pcbdata =","");
      // src = eval('(' + src + ')');
      localStorage.setItem("KiCad_HTML_BOM__#source", src);
      location = location;
    });
    reader.readAsText(file);
  });
}

function populateMetadata() {
  var metadata = pcb.GetMetadata();

  if (metadata.revision == "") {
    document.getElementById("title").innerHTML = metadata.title;
    document.getElementById("revision").innerHTML = "";
  }
  else {
    document.getElementById("title").innerHTML = metadata.title;
    document.getElementById("revision").innerHTML = "Revision: " + metadata.revision;
  }


  document.getElementById("company").innerHTML = metadata.company;
  document.getElementById("filedate").innerHTML = metadata.date;
  if (metadata.title != "") {
    document.title = metadata.title + " BOM";
  }
}

function changeBomLayout(layout) {
  document.getElementById("bom-btn").classList.remove("depressed");
  document.getElementById("lr-btn").classList.remove("depressed");
  document.getElementById("tb-btn").classList.remove("depressed");
  switch (layout) {
    case 'BOM':
      document.getElementById("bom-btn").classList.add("depressed");
      if (globalData.getBomSplit()) {
        globalData.destroyBomSplit();
        globalData.setBomSplit(null);
        globalData.destroyCanvasSplit();
        globalData.setCanvasSplit(null);
      }
      document.getElementById("frontcanvas").style.display = "none";
      document.getElementById("backcanvas").style.display = "none";
      document.getElementById("bot").style.height = "";
      break;
    case 'TB':
      document.getElementById("tb-btn").classList.add("depressed");
      document.getElementById("frontcanvas").style.display = "";
      document.getElementById("backcanvas").style.display = "";
      document.getElementById("bot").style.height = "calc(100% - 80px)";
      document.getElementById("bomdiv").classList.remove("split-horizontal");
      document.getElementById("canvasdiv").classList.remove("split-horizontal");
      document.getElementById("frontcanvas").classList.add("split-horizontal");
      document.getElementById("backcanvas").classList.add("split-horizontal");
      if (globalData.getBomSplit()) {
        globalData.destroyBomSplit();
        globalData.setBomSplit(null);
        globalData.destroyCanvasSplit();
        globalData.setCanvasSplit(null);
      }
      globalData.setBomSplit(Split(['#bomdiv', '#canvasdiv'], {
        sizes: [50, 50],
        onDragEnd: render.resizeAll,
        direction: "vertical",
        gutterSize: 5
      }));
      globalData.setCanvasSplit(Split(['#frontcanvas', '#backcanvas'], {
        sizes: [50, 50],
        gutterSize: 5,
        onDragEnd: render.resizeAll
      }));
      break;
    case 'LR':
      document.getElementById("lr-btn").classList.add("depressed");
      document.getElementById("frontcanvas").style.display = "";
      document.getElementById("backcanvas").style.display = "";
      document.getElementById("bot").style.height = "calc(100% - 80px)";
      document.getElementById("bomdiv").classList.add("split-horizontal");
      document.getElementById("canvasdiv").classList.add("split-horizontal");
      document.getElementById("frontcanvas").classList.remove("split-horizontal");
      document.getElementById("backcanvas").classList.remove("split-horizontal");
      if (globalData.getBomSplit()) {
        globalData.destroyBomSplit();
        globalData.setBomSplit(null);
        globalData.destroyCanvasSplit();
        globalData.setCanvasSplit(null);
      }
      globalData.setBomSplit(Split(['#bomdiv', '#canvasdiv'], {
        sizes: [50, 50],
        onDragEnd: render.resizeAll,
        gutterSize: 5
      }));
      globalData.setCanvasSplit(Split(['#frontcanvas', '#backcanvas'], {
        sizes: [50, 50],
        gutterSize: 5,
        direction: "vertical",
        onDragEnd: render.resizeAll
      }));
  }
  globalData.setBomLayout(layout);
  globalData.writeStorage("bomlayout", layout);
  changeCanvasLayout(globalData.getCanvasLayout());
}

function focusInputField(input) {
  input.scrollIntoView(false);
  input.focus();
  input.select();
}

function focusFilterField() {
  focusInputField(document.getElementById("filter"));
}

function toggleBomCheckbox(bomrowid, checkboxnum) {
  if (!bomrowid || checkboxnum > globalData.getCheckboxes().length) {
    return;
  }
  var bomrow = document.getElementById(bomrowid);
  var checkbox = bomrow.childNodes[checkboxnum].childNodes[0];
  checkbox.checked = !checkbox.checked;
  checkbox.indeterminate = false;
  checkbox.onchange();
}

function IsCheckboxClicked(bomrowid, checkboxname) {
  var checkboxnum = 0;
  while (checkboxnum < globalData.getCheckboxes().length && globalData.getCheckboxes()[checkboxnum].toLowerCase() != checkboxname.toLowerCase()) {
    checkboxnum++;
  }
  if (!bomrowid || checkboxnum >= globalData.getCheckboxes().length) {
    return;
  }
  var bomrow = document.getElementById(bomrowid);
  var checkbox = bomrow.childNodes[checkboxnum + 1].childNodes[0];
  return checkbox.checked;

}

function removeGutterNode(node) {
  for (var i = 0; i < node.childNodes.length; i++) {
    if (node.childNodes[i].classList &&
      node.childNodes[i].classList.contains("gutter")) {
      node.removeChild(node.childNodes[i]);
      break;
    }
  }
}

function cleanGutters() {
  removeGutterNode(document.getElementById("bot"));
  removeGutterNode(document.getElementById("canvasdiv"));
}

function setBomCheckboxes(value) {
  globalData.setBomCheckboxes(value);
  globalData.writeStorage("bomCheckboxes", value);
  populateBomTable();
}

function setRemoveBOMEntries(value) {
  globalData.setRemoveBOMEntries(value);
  globalData.writeStorage("removeBOMEntries", value);
  populateBomTable();
}

function setAdditionalAttributes(value) {
  globalData.setAdditionalAttributes(value);
  globalData.writeStorage("additionalAttributes", value);
  populateBomTable();
}

// XXX: None of this seems to be working.
document.onkeydown = function (e) {
  switch (e.key) {
    case "n":
      if (document.activeElement.type == "text") {
        return;
      }
      if (globalData.getCurrentHighlightedRowId() !== null) {
        // XXX: Why was the following line in the software
        //checkBomCheckbox(globalData.getCurrentHighlightedRowId(), "placed");
        highlightNextRow();
        e.preventDefault();
      }
      break;
    case "ArrowUp":
      highlightPreviousRow();
      e.preventDefault();
      break;
    case "ArrowDown":
      highlightNextRow();
      e.preventDefault();
      break;
    default:
      break;
  }
  if (e.altKey) {
    switch (e.key) {
      case "f":
        focusFilterField();
        e.preventDefault();
        break;
      case "z":
        changeBomLayout("BOM");
        e.preventDefault();
        break;
      case "x":
        changeBomLayout("LR");
        e.preventDefault();
        break;
      case "c":
        changeBomLayout("TB");
        e.preventDefault();
        break;
      case "v":
        changeCanvasLayout("F");
        e.preventDefault();
        break;
      case "b":
        changeCanvasLayout("FB");
        e.preventDefault();
        break;
      case "n":
        changeCanvasLayout("B");
        e.preventDefault();
        break;
      default:
        break;
    }
    if (e.key >= '1' && e.key <= '9') {
      // TODO: This might be able to be removed
      //toggleBomCheckbox(currentHighlightedRowId, parseInt(e.key));
    }
  }
}

//XXX: I would like this to be in the html functions js file. But this function needs to be
//     placed here, otherwise the application rendering becomes very very weird.
window.onload = function (e) {

  // This function makes so that the user data for the pcb is converted to our internal structure
  pcb.OpenPcbData(pcbdata)


  globalData.initStorage();
  cleanGutters();
  render.initRender();
  dbgdiv = document.getElementById("dbg");
  bom = document.getElementById("bombody");
  bomhead = document.getElementById("bomhead");
  globalData.setBomLayout(globalData.readStorage("bomlayout"));
  if (!globalData.getBomLayout()) {
    globalData.setBomLayout("LR");
  }
  globalData.setCanvasLayout(globalData.readStorage("canvaslayout"));
  if (!globalData.getCanvasLayout()) {
    globalData.setCanvasLayout("FB");
  }
  globalData.setSource(globalData.readStorage("source"));
  if (!globalData.getSource()) {
    console.log('IIIIIN', '')
    globalData.setSource("roboteq155v7");
    globalData.writeStorage("source", "roboteq155v7");
  }

  populateFileSelector();
  populateMetadata();
  globalData.setBomCheckboxes(globalData.readStorage("bomCheckboxes"));
  if (globalData.getBomCheckboxes() === null) {
    globalData.setBomCheckboxes("Placed");
  }
  globalData.setRemoveBOMEntries(globalData.readStorage("removeBOMEntries"));
  if (globalData.getRemoveBOMEntries() === null) {
    globalData.setRemoveBOMEntries("");
  }
  globalData.setAdditionalAttributes(globalData.readStorage("additionalAttributes"));
  if (globalData.getAdditionalAttributes() === null) {
    globalData.setAdditionalAttributes("");
  }
  document.getElementById("bomCheckboxes").value = globalData.getBomCheckboxes();
  if (globalData.readStorage("silkscreenVisible") === "false") {
    document.getElementById("silkscreenCheckbox").checked = false;
    silkscreenVisible(false);
  }
  if (globalData.readStorage("redrawOnDrag") === "false") {
    document.getElementById("dragCheckbox").checked = false;
    globalData.setRedrawOnDrag(false);
  }
  if (globalData.readStorage("darkmode") === "true") {
    document.getElementById("darkmodeCheckbox").checked = true;
    setDarkMode(true);
  }
  if (globalData.readStorage("hidePlacedParts") === "true") {
    document.getElementById("hidePlacedParts").checked = true;
    globalData.setHidePlacedParts(true);
  }
  if (globalData.readStorage("highlightpin1") === "true") {
    document.getElementById("highlightpin1Checkbox").checked = true;
    globalData.setHighlightPin1(true);
    render.redrawCanvas(allcanvas.front);
    render.redrawCanvas(allcanvas.back);
  }
  // If this is true then combine parts and display quantity
  if (globalData.readStorage("combineValues") === "true") {
    document.getElementById("combineValues").checked = true;
    globalData.setCombineValues(true);
  }
  boardRotation = globalData.readStorage("boardRotation");
  if (boardRotation === null) {
    boardRotation = 0;
  } else {
    boardRotation = parseInt(boardRotation);
  }
  document.getElementById("boardRotation").value = boardRotation / 5;
  document.getElementById("rotationDegree").textContent = boardRotation;
  //document.getElementById("files").value = globalData.readStorage("source");

  // Triggers render
  changeBomLayout(globalData.getBomLayout());
}

window.onresize = render.resizeAll;
window.matchMedia("print").addListener(render.resizeAll);

module.exports = {
  setDarkMode, silkscreenVisible, changeBomLayout, changeCanvasLayout,
  setBomCheckboxes, populateBomTable, setFilter, getFilter,
  setRemoveBOMEntries, setAdditionalAttributes
}
