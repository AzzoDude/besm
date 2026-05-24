(() => {
  // docs/js/state.js
  var Store = class {
    constructor() {
      this.state = {
        loadedFileMode: "",
        // "raw" | "besm" | "csv"
        originalFileName: "",
        rawFileBytes: null,
        csvHeaders: [],
        csvRows: [],
        filteredCsvRows: [],
        csvPage: 0,
        stringCache: {},
        schemas: {},
        loadedRecords: [],
        subsectors: {},
        activeSubsectorType: "",
        filteredSubsectorRows: [],
        rawSectorBytesCache: {},
        dbPage: 0,
        chronoPage: 0,
        stringsPage: 0,
        decompRc: null,
        pageSize: 200,
        numCols: /* @__PURE__ */ new Set(["weight", "value", "damage", "armorrating", "x", "y", "z", "rotx", "roty", "rotz", "size"]),
        monoCols: /* @__PURE__ */ new Set(["formid", "baseformid", "cellformid", "worldspaceformid", "flags", "enchantment", "baseid", "cellid"]),
        // 2D Spatial View State
        activeViewMode: "default",
        // "default" | "spatial"
        spatialRecords: [],
        selectedSpatialRecord: null,
        activeCellFilter: null,
        // {cx, cy}
        // Canvas viewport
        scale: 5e-3,
        offsetX: 0,
        offsetY: 0,
        isPanning: false,
        startPanX: 0,
        startPanY: 0,
        hoverSpatialRecord: null,
        filteredChronoRows: [],
        filteredStrings: []
      };
      this.subscribers = /* @__PURE__ */ new Set();
    }
    getState() {
      return this.state;
    }
    update(updates) {
      this.state = { ...this.state, ...updates };
      this.notify(updates);
    }
    subscribe(callback) {
      this.subscribers.add(callback);
      return () => this.subscribers.delete(callback);
    }
    notify(updates) {
      for (const callback of this.subscribers) {
        callback(this.state, updates);
      }
    }
  };

  // docs/js/helpers.js
  async function readStreamToBytes(stream) {
    const reader = stream.getReader();
    const chunks = [];
    let totalLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
  async function decompressDeflateRaw(compressedBytes) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressedBytes);
        controller.close();
      }
    }).pipeThrough(new DecompressionStream("deflate-raw"));
    return readStreamToBytes(stream);
  }
  async function compressDeflateRaw(bytes) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      }
    }).pipeThrough(new CompressionStream("deflate-raw"));
    return readStreamToBytes(stream);
  }
  function md5(bytes) {
    let k = [], i = 0;
    for (; i < 64; ) {
      k[i] = Math.floor(Math.abs(Math.sin(++i)) * 4294967296);
    }
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    let len = bytes.length;
    let blockCount = (len + 8 >> 6) + 1;
    let totalLen = blockCount << 6;
    let pad = new Uint8Array(totalLen);
    pad.set(bytes);
    pad[len] = 128;
    let view = new DataView(pad.buffer);
    let bits = len * 8;
    view.setUint32(totalLen - 8, bits & 4294967295, true);
    view.setUint32(totalLen - 4, Math.floor(bits / 4294967296), true);
    function rol(num, cnt) {
      return num << cnt | num >>> 32 - cnt;
    }
    for (let off = 0; off < totalLen; off += 64) {
      let w = [];
      for (let j = 0; j < 16; j++) {
        w[j] = view.getUint32(off + j * 4, true);
      }
      let olda = a, oldb = b, oldc = c, oldd = d;
      a = rol(a + (b & c | ~b & d) + w[0] + k[0], 7) + b;
      d = rol(d + (a & b | ~a & c) + w[1] + k[1], 12) + a;
      c = rol(c + (d & a | ~d & b) + w[2] + k[2], 17) + d;
      b = rol(b + (c & d | ~c & a) + w[3] + k[3], 22) + c;
      a = rol(a + (b & c | ~b & d) + w[4] + k[4], 7) + b;
      d = rol(d + (a & b | ~a & c) + w[5] + k[5], 12) + a;
      c = rol(c + (d & a | ~d & b) + w[6] + k[6], 17) + d;
      b = rol(b + (c & d | ~c & a) + w[7] + k[7], 22) + c;
      a = rol(a + (b & c | ~b & d) + w[8] + k[8], 7) + b;
      d = rol(d + (a & b | ~a & c) + w[9] + k[9], 12) + a;
      c = rol(c + (d & a | ~d & b) + w[10] + k[10], 17) + d;
      b = rol(b + (c & d | ~c & a) + w[11] + k[11], 22) + c;
      a = rol(a + (b & c | ~b & d) + w[12] + k[12], 7) + b;
      d = rol(d + (a & b | ~a & c) + w[13] + k[13], 12) + a;
      c = rol(c + (d & a | ~d & b) + w[14] + k[14], 17) + d;
      b = rol(b + (c & d | ~c & a) + w[15] + k[15], 22) + c;
      a = rol(a + (b & d | c & ~d) + w[1] + k[16], 5) + b;
      d = rol(d + (a & c | b & ~c) + w[6] + k[17], 9) + a;
      c = rol(c + (d & b | a & ~b) + w[11] + k[18], 14) + d;
      b = rol(b + (c & a | d & ~a) + w[0] + k[19], 20) + c;
      a = rol(a + (b & d | c & ~d) + w[5] + k[20], 5) + b;
      d = rol(d + (a & c | b & ~c) + w[10] + k[21], 9) + a;
      c = rol(c + (d & b | a & ~b) + w[15] + k[22], 14) + d;
      b = rol(b + (c & a | d & ~a) + w[4] + k[23], 20) + c;
      a = rol(a + (b & d | c & ~d) + w[9] + k[24], 5) + b;
      d = rol(d + (a & c | b & ~c) + w[14] + k[25], 9) + a;
      c = rol(c + (d & b | a & ~b) + w[3] + k[26], 14) + d;
      b = rol(b + (c & a | d & ~a) + w[8] + k[27], 20) + c;
      a = rol(a + (b & d | c & ~d) + w[13] + k[28], 5) + b;
      d = rol(d + (a & c | b & ~c) + w[2] + k[29], 9) + a;
      c = rol(c + (d & b | a & ~b) + w[7] + k[30], 14) + d;
      b = rol(b + (c & a | d & ~a) + w[12] + k[31], 20) + c;
      a = rol(a + (b ^ c ^ d) + w[5] + k[32], 4) + b;
      d = rol(d + (a ^ b ^ c) + w[8] + k[33], 11) + a;
      c = rol(c + (d ^ a ^ b) + w[11] + k[34], 16) + d;
      b = rol(b + (c ^ d ^ a) + w[14] + k[35], 23) + c;
      a = rol(a + (b ^ c ^ d) + w[1] + k[36], 4) + b;
      d = rol(d + (a ^ b ^ c) + w[4] + k[37], 11) + a;
      c = rol(c + (d ^ a ^ b) + w[7] + k[38], 16) + d;
      b = rol(b + (c ^ d ^ a) + w[10] + k[39], 23) + c;
      a = rol(a + (b ^ c ^ d) + w[13] + k[40], 4) + b;
      d = rol(d + (a ^ b ^ c) + w[0] + k[41], 11) + a;
      c = rol(c + (d ^ a ^ b) + w[3] + k[42], 16) + d;
      b = rol(b + (c ^ d ^ a) + w[6] + k[43], 23) + c;
      a = rol(a + (b ^ c ^ d) + w[9] + k[44], 4) + b;
      d = rol(d + (a ^ b ^ c) + w[12] + k[45], 11) + a;
      c = rol(c + (d ^ a ^ b) + w[15] + k[46], 16) + d;
      b = rol(b + (c ^ d ^ a) + w[2] + k[47], 23) + c;
      a = rol(a + (c ^ (b | ~d)) + w[0] + k[48], 6) + b;
      d = rol(d + (b ^ (a | ~c)) + w[7] + k[49], 10) + a;
      c = rol(c + (a ^ (d | ~b)) + w[14] + k[50], 15) + d;
      b = rol(b + (d ^ (c | ~a)) + w[5] + k[51], 21) + c;
      a = rol(a + (c ^ (b | ~d)) + w[12] + k[52], 6) + b;
      d = rol(d + (b ^ (a | ~c)) + w[3] + k[53], 10) + a;
      c = rol(c + (a ^ (d | ~b)) + w[10] + k[54], 15) + d;
      b = rol(b + (d ^ (c | ~a)) + w[1] + k[55], 21) + c;
      a = rol(a + (c ^ (b | ~d)) + w[8] + k[56], 6) + b;
      d = rol(d + (b ^ (a | ~c)) + w[15] + k[57], 10) + a;
      c = rol(c + (a ^ (d | ~b)) + w[6] + k[58], 15) + d;
      b = rol(b + (d ^ (c | ~a)) + w[13] + k[59], 21) + c;
      a = rol(a + (c ^ (b | ~d)) + w[4] + k[60], 6) + b;
      d = rol(d + (b ^ (a | ~c)) + w[11] + k[61], 10) + a;
      c = rol(c + (a ^ (d | ~b)) + w[2] + k[62], 15) + d;
      b = rol(b + (d ^ (c | ~a)) + w[9] + k[63], 21) + c;
      a = a + olda | 0;
      b = b + oldb | 0;
      c = c + oldc | 0;
      d = d + oldd | 0;
    }
    function hex(n) {
      let s = "", j = 0;
      for (; j < 4; j++) {
        const byteVal = n >> j * 8 & 255;
        s += (byteVal >>> 4).toString(16) + (byteVal & 15).toString(16);
      }
      return s;
    }
    return hex(a) + hex(b) + hex(c) + hex(d);
  }
  var BlobPoolBuilder = class {
    constructor() {
      this.chunks = [];
      this.length = 0;
    }
    write(bytes) {
      this.chunks.push(bytes);
      const start = this.length;
      this.length += bytes.length;
      return start;
    }
    writeByte(b) {
      return this.write(new Uint8Array([b]));
    }
    writeUint32(val) {
      const buf = new Uint8Array(4);
      new DataView(buf.buffer).setUint32(0, val, true);
      return this.write(buf);
    }
    toArray() {
      const out = new Uint8Array(this.length);
      let off = 0;
      for (const chunk of this.chunks) {
        out.set(chunk, off);
        off += chunk.length;
      }
      return out;
    }
  };
  function getTagInt(tag) {
    const padded = (tag + "    ").substring(0, 4);
    const bytes = new TextEncoder().encode(padded);
    return bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24;
  }
  function getSubDataFast(dataBlock, tagInt) {
    let offset = 0;
    const view = new DataView(dataBlock.buffer, dataBlock.byteOffset, dataBlock.byteLength);
    while (offset + 6 <= dataBlock.length) {
      const currentTag = view.getUint32(offset, true);
      const subSize = view.getUint16(offset + 4, true);
      if (offset + 6 + subSize > dataBlock.length) break;
      if (currentTag === tagInt) {
        return dataBlock.slice(offset + 6, offset + 6 + subSize);
      }
      offset += 6 + subSize;
    }
    return null;
  }
  function getRecordLabel(formID, stringCache = {}) {
    if (!formID) return "None";
    return "0x" + formID.toString(16).toUpperCase().padStart(8, "0");
  }
  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // docs/js/ui/grid_view.js
  function decodeRecordFlags(val) {
    const flags = [];
    if (val & 8) flags.push("Deleted");
    if (val & 64) flags.push("Constant");
    if (val & 512) flags.push("Ignored");
    if (val & 262144) flags.push("Compressed");
    if (val & 524288) flags.push("Persistent");
    if (val & 1048576) flags.push("Initially Disabled");
    if (val & 8388608) flags.push("Cast Shadows");
    return flags.length > 0 ? flags.join(", ") : "None";
  }
  var GridView = class {
    constructor(store, uiController) {
      this.store = store;
      this.uiController = uiController;
    }
    render() {
      const state = this.store.getState();
      const { activeSubsectorType, schemas, dbPage, pageSize, filteredSubsectorRows, selectedSpatialRecord, stringCache, numCols, monoCols } = state;
      const sectorCache = state.rawSectorBytesCache ? state.rawSectorBytesCache[activeSubsectorType] : null;
      const rowSize = sectorCache ? sectorCache.rowSize : 12;
      const schema = schemas[activeSubsectorType] || {
        rowSize,
        columns: [
          { name: "FormID", type: "int", offset: 0 },
          { name: "Flags", type: "int", offset: 4 },
          { name: "BlobOffset", type: "int", offset: 8 }
        ]
      };
      const start = dbPage * pageSize;
      const end = Math.min(start + pageSize, filteredSubsectorRows.length);
      const cols = schema.columns.map((c) => c.name);
      document.getElementById("db-headers").innerHTML = `<tr><th>EditorID</th><th>Name</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
      const tbody = document.getElementById("db-body");
      if (!tbody) return;
      if (filteredSubsectorRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${cols.length + 2}">No records match</td></tr>`;
      } else {
        tbody.innerHTML = filteredSubsectorRows.slice(start, end).map((r, i) => {
          const cache = stringCache[r.FormID] || { edid: "", name: "" };
          const globalIdx = start + i;
          const isSelected = selectedSpatialRecord && selectedSpatialRecord.FormID === r.FormID;
          const clsSelected = isSelected ? 'class="row-selected"' : "";
          return `<tr ${clsSelected} id="db-row-${globalIdx}" onclick="selectGridRow(${globalIdx})" style="cursor: pointer;">
                    <td class="mono">${escapeHtml(cache.edid)}</td>
                    <td>${escapeHtml(cache.name)}</td>
                    ${cols.map((c) => {
            const val = r[c];
            const cls = numCols.has(c.toLowerCase()) ? "num" : monoCols.has(c.toLowerCase()) ? "mono" : "";
            let titleAttr = "";
            let displayVal = escapeHtml(monoCols.has(c.toLowerCase()) ? getRecordLabel(val, stringCache) : val);
            if (c === "Flags") {
              const decoded = decodeRecordFlags(val);
              titleAttr = `title="Active Flags: ${decoded}"`;
              displayVal = `0x${val.toString(16).toUpperCase().padStart(8, "0")} <span style="color: #888; font-size: 9px; font-weight: normal; margin-left: 4px;">(${decoded})</span>`;
            }
            return `<td class="${cls}" ${titleAttr}>${displayVal}</td>`;
          }).join("")}
                </tr>`;
        }).join("");
      }
      const pageInfo = document.getElementById("db-page-info");
      if (pageInfo) {
        pageInfo.innerText = `Showing ${filteredSubsectorRows.length > 0 ? start + 1 : 0}-${end} of ${filteredSubsectorRows.length}`;
      }
      const btnPrev = document.getElementById("db-prev-btn");
      if (btnPrev) btnPrev.disabled = dbPage === 0;
      const btnNext = document.getElementById("db-next-btn");
      if (btnNext) btnNext.disabled = end >= filteredSubsectorRows.length;
    }
    selectRow(globalIdx) {
      const { filteredSubsectorRows } = this.store.getState();
      const record = filteredSubsectorRows[globalIdx];
      if (!record) return;
      document.querySelectorAll("#db-body tr").forEach((tr) => tr.classList.remove("row-selected"));
      const rowEl = document.getElementById(`db-row-${globalIdx}`);
      if (rowEl) rowEl.classList.add("row-selected");
      this.store.update({ selectedSpatialRecord: record });
      if (this.uiController.spatialView) {
        this.uiController.spatialView.inspectRecord(record);
      }
    }
  };

  // docs/js/ui/csv_view.js
  var CsvView = class {
    constructor(store) {
      this.store = store;
    }
    load(file) {
      this.store.update({ loadedFileMode: "csv" });
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);
        if (lines.length === 0) {
          document.getElementById("status").innerText = "Empty CSV file";
          return;
        }
        const csvHeaders = this.parseLine(lines[0]);
        const csvRows = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            csvRows.push(this.parseLine(lines[i]));
          }
        }
        this.store.update({
          csvHeaders,
          csvRows,
          csvPage: 0
        });
        this.filterAndRender();
        document.getElementById("status").innerText = `Loaded CSV: ${csvRows.length} rows`;
      };
      reader.readAsText(file);
    }
    parseLine(line) {
      const result = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    }
    filterAndRender() {
      const { csvRows } = this.store.getState();
      const q = document.getElementById("searchBox").value.toLowerCase().trim();
      const filteredCsvRows = q ? csvRows.filter(
        (row) => row.some((cell) => String(cell).toLowerCase().includes(q))
      ) : csvRows;
      this.store.update({ filteredCsvRows });
      this.render();
    }
    render() {
      const { csvHeaders, filteredCsvRows, csvPage, pageSize } = this.store.getState();
      const start = csvPage * pageSize;
      const end = Math.min(start + pageSize, filteredCsvRows.length);
      const headers = csvHeaders;
      document.getElementById("db-headers").innerHTML = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
      const tbody = document.getElementById("db-body");
      if (!tbody) return;
      if (filteredCsvRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${headers.length}">No records match</td></tr>`;
      } else {
        tbody.innerHTML = filteredCsvRows.slice(start, end).map((row) => {
          return `<tr>
                    ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
                </tr>`;
        }).join("");
      }
      const pageInfo = document.getElementById("db-page-info");
      if (pageInfo) {
        pageInfo.innerText = `Showing ${filteredCsvRows.length > 0 ? start + 1 : 0}-${end} of ${filteredCsvRows.length}`;
      }
      const btnPrev = document.getElementById("db-prev-btn");
      if (btnPrev) btnPrev.disabled = csvPage === 0;
      const btnNext = document.getElementById("db-next-btn");
      if (btnNext) btnNext.disabled = end >= filteredCsvRows.length;
    }
  };

  // docs/js/record_types.js
  var recordTypeNames = {
    "AACT": "Action",
    "ACHR": "Actor Reference",
    "ACTI": "Activator",
    "ADDN": "Addon Node",
    "ALCH": "Potion",
    "AMMO": "Ammo",
    "ANIO": "Animation Object",
    "APPA": "Apparatus (probably unused)",
    "ARMA": "Armor Addon (Model)",
    "ARMO": "Armor",
    "ARTO": "Art Object",
    "ASPC": "Acoustic Space",
    "ASTP": "Association Type",
    "AVIF": "Actor Values/Perk Tree Graphics",
    "BOOK": "Book",
    "BPTD": "Body Part Data",
    "CAMS": "Camera Shot",
    "CELL": "Cell",
    "CLAS": "Class",
    "CLFM": "Color",
    "CLMT": "Climate",
    "COBJ": "Constructible Object (recipes)",
    "COLL": "Collision Layer",
    "CONT": "Container",
    "CPTH": "Camera Path",
    "CSTY": "Combat Style",
    "DEBR": "Debris",
    "DIAL": "Dialog Topic",
    "DLBR": "Dialog Branch",
    "DLVW": "Dialog View",
    "DOBJ": "Default Object Manager",
    "DOOR": "Door",
    "DUAL": "Dual Cast Data (possibly unused)",
    "ECZN": "Encounter Zone",
    "EFSH": "Effect Shader",
    "ENCH": "Enchantment",
    "EQUP": "Equip Slot (flag-type values)",
    "EXPL": "Explosion",
    "EYES": "Eyes",
    "FACT": "Faction",
    "FLOR": "Flora",
    "FLST": "Form List (non-leveled list)",
    "FSTP": "Footstep",
    "FSTS": "Footstep Set",
    "FURN": "Furniture",
    "GLOB": "Global Variable",
    "GMST": "Game Setting",
    "GRAS": "Grass",
    "GRUP": "Form Group",
    "HAZD": "Hazard",
    "HDPT": "Head Part",
    "IDLE": "Idle Animation",
    "IDLM": "Idle Marker",
    "IMAD": "Image Space Modifier",
    "IMGS": "Image Space",
    "INFO": "Dialog Topic Info",
    "INGR": "Ingredient",
    "IPCT": "Impact Data",
    "IPDS": "Impact Data Set",
    "KEYM": "Key",
    "KYWD": "Keyword",
    "LAND": "Landscape",
    "LCRT": "Location Reference Type",
    "LCTN": "Location",
    "LGTM": "Lighting Template",
    "LIGH": "Light",
    "LSCR": "Load Screen",
    "LTEX": "Land Texture",
    "LVLI": "Leveled Item",
    "LVLN": "Leveled Actor",
    "LVSP": "Leveled Spell",
    "MATO": "Material Object",
    "MATT": "Material Type",
    "MESG": "Message",
    "MGEF": "Magic Effect",
    "MISC": "Misc. Object",
    "MOVT": "Movement Type",
    "MSTT": "Movable Static",
    "MUSC": "Music Type",
    "MUST": "Music Track",
    "NAVI": "Navigation (master data)",
    "NAVM": "NavMesh",
    "NOTE": "Note",
    "NPC_": "Actor (NPC, Creature)",
    "OTFT": "Outfit",
    "PACK": "AI Package",
    "PERK": "Perk",
    "PGRE": "Placed grenade",
    "PHZD": "Placed hazard",
    "PROJ": "Projectile",
    "QUST": "Quest",
    "RACE": "Race / Creature type",
    "REFR": "Object Reference",
    "REGN": "Region (Audio/Weather)",
    "RELA": "Relationship",
    "REVB": "Reverb Parameters",
    "RFCT": "Visual Effect",
    "SCEN": "Scene",
    "SCRL": "Scroll",
    "SHOU": "Shout",
    "SLGM": "Soul Gem",
    "SMBN": "Story Manager Branch Node",
    "SMEN": "Story Manager Event Node",
    "SMQN": "Story Manager Quest Node",
    "SNCT": "Sound Category",
    "SNDR": "Sound Reference",
    "SOPM": "Sound Output Model",
    "SOUN": "Sound",
    "SPEL": "Spell",
    "SPGD": "Shader Particle Geometry",
    "STAT": "Static",
    "TACT": "Talking Activator",
    "TES4": "Plugin info / Header",
    "TREE": "Tree",
    "TXST": "Texture Set",
    "VTYP": "Voice Type",
    "WATR": "Water Type",
    "WEAP": "Weapon",
    "WOOP": "Word Of Power",
    "WRLD": "Worldspace",
    "WTHR": "Weather"
  };
  var baseFallout4SchemaStr = `[REFR]
  FormID:UInt32:HeaderFormID:0
  BaseID:UInt32:NAME:0
  X:Float:DATA:0
  Y:Float:DATA:4
  Z:Float:DATA:8
  RotX:Float:DATA:12
  RotY:Float:DATA:16
  RotZ:Float:DATA:20
  CellID:UInt32:CELL:0
  Flags:UInt32:HeaderFlags:0
  BlobOffset:UInt32:BlobOffset:0

[WEAP]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DNAM:0
  Speed:Float:DNAM:4
  CritMult:Float:CRDT:0
  AmmoID:UInt32:AMMO:0
  MinRange:Float:DNAM:12
  MaxRange:Float:DNAM:16
  BaseDmg:UInt32:DNAM:20
  Enchantment:UInt32:EITM:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[ARMO]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DNAM:4
  Value:UInt32:DNAM:0
  Enchantment:UInt32:EITM:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[ENCH]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  FirstEffect:UInt32:EFID:0
  Magnitude:Float:EFIT:0
  Duration:UInt32:EFIT:8
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[ALCH]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:ENIT:4
  Value:UInt32:ENIT:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[BOOK]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:4
  Value:UInt32:DATA:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[MISC]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:4
  Value:UInt32:DATA:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[KEYM]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:4
  Value:UInt32:DATA:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[AMMO]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:8
  Value:UInt32:DATA:4
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[NPC_]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[LVLI]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  ChanceNone:UInt32:LVLD:0
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[STAT]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  ModelOffset:UInt32:MODL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[COBJ]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  CreatedCount:UInt32:DATA:0
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[OMOD]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[FLOR]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[FURN]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[PERK]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[QUST]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[FACT]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0`;
  var baseSkyrimSchemaStr = `[REFR]
  FormID:UInt32:HeaderFormID:0
  BaseID:UInt32:NAME:0
  X:Float:DATA:0
  Y:Float:DATA:4
  Z:Float:DATA:8
  RotX:Float:DATA:12
  RotY:Float:DATA:16
  RotZ:Float:DATA:20
  CellID:UInt32:CELL:0
  Flags:UInt32:HeaderFlags:0
  BlobOffset:UInt32:BlobOffset:0

[WEAP]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:4
  Value:UInt32:DATA:0
  Damage:UInt32:DATA:8
  Enchantment:UInt32:EITM:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[ARMO]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:4
  Value:UInt32:DATA:0
  Enchantment:UInt32:EITM:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[ENCH]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  FirstEffect:UInt32:EFID:0
  Magnitude:Float:EFIT:0
  Duration:UInt32:EFIT:8
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[ALCH]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:ENIT:4
  Value:UInt32:ENIT:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[BOOK]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:8
  Value:UInt32:DATA:4
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[MISC]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:4
  Value:UInt32:DATA:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[KEYM]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:4
  Value:UInt32:DATA:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[AMMO]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  Weight:Float:DATA:8
  Value:UInt32:DATA:4
  Damage:UInt32:DATA:12
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[NPC_]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[LVLI]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  ChanceNone:UInt32:LVLD:0
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[STAT]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  ModelOffset:UInt32:MODL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[COBJ]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  CreatedCount:UInt32:DATA:0
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[FLOR]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[FURN]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[PERK]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[QUST]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0

[FACT]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  NameOffset:UInt32:FULL:StringIndex
  EdidOffset:UInt32:EDID:StringIndex
  BlobOffset:UInt32:BlobOffset:0`;
  var allSigs = Object.keys(recordTypeNames);
  function buildFullSchema(baseStr) {
    let output = baseStr;
    const definedSigs = /* @__PURE__ */ new Set();
    const regex = /\[([A-Z_0-9]{4})\]/gi;
    let match;
    while ((match = regex.exec(baseStr)) !== null) {
      definedSigs.add(match[1].toUpperCase());
    }
    for (const sig of allSigs) {
      if (!definedSigs.has(sig)) {
        output += `

[${sig}]
  FormID:UInt32:HeaderFormID:0
  Flags:UInt32:HeaderFlags:0
  BlobOffset:UInt32:BlobOffset:0`;
      }
    }
    return output;
  }
  var fallout4SchemaStr = buildFullSchema(baseFallout4SchemaStr);
  var skyrimSchemaStr = buildFullSchema(baseSkyrimSchemaStr);

  // docs/js/ui/chrono_view.js
  var ChronoView = class {
    constructor(store) {
      this.store = store;
    }
    filterAndRender() {
      const { loadedRecords, stringCache } = this.store.getState();
      const q = document.getElementById("searchBox").value.toLowerCase().trim();
      const filteredChronoRows = q ? loadedRecords.filter((r) => {
        const cache = stringCache[r.fID] || { edid: "", name: "" };
        return r.type.toLowerCase().includes(q) || cache.edid.toLowerCase().includes(q) || cache.name.toLowerCase().includes(q) || ("0x" + r.fID.toString(16)).includes(q);
      }) : loadedRecords;
      this.store.update({ filteredChronoRows });
      this.render();
    }
    render() {
      const { chronoPage, pageSize, filteredChronoRows, stringCache } = this.store.getState();
      const start = chronoPage * pageSize;
      const end = Math.min(start + pageSize, filteredChronoRows.length);
      const tbody = document.getElementById("chrono-body");
      if (!tbody) return;
      if (filteredChronoRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No matches</td></tr>';
      } else {
        tbody.innerHTML = filteredChronoRows.slice(start, end).map((r, i) => {
          const cache = stringCache[r.fID] || { edid: "", name: "" };
          const desc = recordTypeNames[r.type] || "Unknown";
          return `<tr>
                    <td class="num">${start + i + 1}</td>
                    <td><span class="badge" title="${desc}">${r.type}</span></td>
                    <td class="mono">${r.type === "GRUP" ? "N/A" : "0x" + r.fID.toString(16).toUpperCase().padStart(8, "0")}</td>
                    <td class="mono" style="color:#a8ffb2;">${escapeHtml(cache.edid)}</td>
                    <td>${escapeHtml(cache.name)}</td>
                    <td class="mono">0x${r.flags.toString(16).toUpperCase()}</td>
                    <td class="num">${r.bodyLen}</td>
                </tr>`;
        }).join("");
      }
      const pageInfo = document.getElementById("chrono-page-info");
      if (pageInfo) {
        pageInfo.innerText = `Showing ${filteredChronoRows.length > 0 ? start + 1 : 0}-${end} of ${filteredChronoRows.length}`;
      }
      const btnPrev = document.getElementById("chrono-prev-btn");
      if (btnPrev) btnPrev.disabled = chronoPage === 0;
      const btnNext = document.getElementById("chrono-next-btn");
      if (btnNext) btnNext.disabled = end >= filteredChronoRows.length;
    }
  };

  // docs/js/ui/strings_view.js
  var StringsView = class {
    constructor(store) {
      this.store = store;
    }
    filterAndRender() {
      const { stringCache } = this.store.getState();
      const list = Object.keys(stringCache).map((fID) => ({
        fID: parseInt(fID),
        edid: stringCache[fID].edid,
        name: stringCache[fID].name
      }));
      const q = document.getElementById("searchBox").value.toLowerCase().trim();
      const filteredStrings = q ? list.filter(
        (s) => s.edid.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || ("0x" + s.fID.toString(16)).includes(q)
      ) : list;
      this.store.update({ filteredStrings });
      this.render();
    }
    render() {
      const { stringsPage, pageSize, filteredStrings } = this.store.getState();
      const start = stringsPage * pageSize;
      const end = Math.min(start + pageSize, filteredStrings.length);
      const tbody = document.getElementById("strings-body");
      if (!tbody) return;
      if (filteredStrings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No matches</td></tr>';
      } else {
        tbody.innerHTML = filteredStrings.slice(start, end).map((s) => {
          return `<tr>
                    <td class="mono">0x${s.fID.toString(16).toUpperCase().padStart(8, "0")}</td>
                    <td class="mono" style="color:#a8ffb2;">${escapeHtml(s.edid)}</td>
                    <td>${escapeHtml(s.name)}</td>
                </tr>`;
        }).join("");
      }
      const pageInfo = document.getElementById("strings-page-info");
      if (pageInfo) {
        pageInfo.innerText = `Showing ${filteredStrings.length > 0 ? start + 1 : 0}-${end} of ${filteredStrings.length}`;
      }
      const btnPrev = document.getElementById("strings-prev-btn");
      if (btnPrev) btnPrev.disabled = stringsPage === 0;
      const btnNext = document.getElementById("strings-next-btn");
      if (btnNext) btnNext.disabled = end >= filteredStrings.length;
    }
  };

  // docs/js/schema.js
  function formatSchemaForTextarea(schemaStr) {
    if (schemaStr.includes("[") && schemaStr.includes("]")) {
      return schemaStr.trim();
    }
    return schemaStr.split(";").map((s) => {
      const cleaned = s.trim();
      if (!cleaned) return "";
      const parts = cleaned.split("|");
      if (parts.length < 2) return cleaned;
      const header = parts[0].trim();
      const cols = parts[1].split(",").map((c) => "  " + c.trim()).join("\n");
      return `[${header}]
${cols}`;
    }).filter((s) => s).join("\n\n");
  }
  function parseSchema(schemaStr) {
    const list = {};
    if (schemaStr.includes("[") && schemaStr.includes("]")) {
      const regex = /\[([A-Z_0-9]{4})\:?(\d*)\]([^\[]*)/gi;
      let match;
      while ((match = regex.exec(schemaStr)) !== null) {
        const sig = match[1].trim();
        const explicitRowSize = match[2] ? parseInt(match[2]) : null;
        const blockText = match[3];
        const s = { recordType: sig, rowSize: explicitRowSize || 0, columns: [] };
        const items = blockText.split(/[\n,\r;]+/);
        let currentOffset = 0;
        for (const item of items) {
          const cleaned = item.trim();
          if (!cleaned) continue;
          const cp = cleaned.split(":");
          if (cp.length === 4) {
            const name = cp[0].trim();
            const type = cp[1].trim();
            const srcTag = cp[2].trim();
            const srcOffset = cp[3].trim();
            const typeLower = type.toLowerCase();
            let size = 4;
            if (typeLower === "uint16" || typeLower === "int16" || typeLower === "short") {
              size = 2;
            } else if (typeLower === "uint8" || typeLower === "int8" || typeLower === "byte" || typeLower === "char") {
              size = 1;
            }
            s.columns.push({
              name,
              type,
              offset: currentOffset,
              srcTag,
              srcOffset
            });
            currentOffset += size;
          } else if (cp.length >= 5) {
            const name = cp[0].trim();
            const type = cp[1].trim();
            const offset = parseInt(cp[2]);
            const srcTag = cp[3].trim();
            const srcOffset = cp[4].trim();
            s.columns.push({
              name,
              type,
              offset,
              srcTag,
              srcOffset
            });
            const typeLower = type.toLowerCase();
            let size = 4;
            if (typeLower === "uint16" || typeLower === "int16" || typeLower === "short") {
              size = 2;
            } else if (typeLower === "uint8" || typeLower === "int8" || typeLower === "byte" || typeLower === "char") {
              size = 1;
            }
            currentOffset = offset + size;
          }
        }
        if (!s.rowSize) {
          s.rowSize = currentOffset;
        }
        list[sig] = s;
      }
    } else {
      for (const t of schemaStr.split(";")) {
        const cleaned = t.trim();
        if (!cleaned) continue;
        const p = cleaned.split("|"), h = p[0].split(":");
        const s = { recordType: h[0].trim(), rowSize: parseInt(h[1]), columns: [] };
        if (p[1]) {
          for (const c of p[1].split(",")) {
            const cp = c.trim().split(":");
            if (cp.length >= 5) {
              s.columns.push({
                name: cp[0].trim(),
                type: cp[1].trim(),
                offset: parseInt(cp[2]),
                srcTag: cp[3].trim(),
                srcOffset: cp[4].trim()
              });
            }
          }
        }
        list[h[0].trim()] = s;
      }
    }
    return list;
  }
  function parseSchemaForCompile(schemaStr) {
    const list = {};
    if (schemaStr.includes("[") && schemaStr.includes("]")) {
      const regex = /\[([A-Z_0-9]{4})\:?(\d*)\]([^\[]*)/gi;
      let match;
      while ((match = regex.exec(schemaStr)) !== null) {
        const sig = match[1].trim();
        const explicitRowSize = match[2] ? parseInt(match[2]) : null;
        const blockText = match[3];
        const s = { recordType: sig, rowSize: explicitRowSize || 0, columns: [] };
        const items = blockText.split(/[\n,\r;]+/);
        let currentOffset = 0;
        for (const item of items) {
          const cleaned = item.trim();
          if (!cleaned) continue;
          const cp = cleaned.split(":");
          if (cp.length === 4) {
            const name = cp[0].trim();
            const type = cp[1].trim();
            const tag = cp[2].trim();
            const srcOffset = cp[3].trim();
            let tagInt = 0;
            if (tag.length > 0 && tag !== "HeaderFormID" && tag !== "HeaderFlags" && tag !== "BlobOffset" && tag !== "StringIndex") {
              tagInt = getTagInt(tag);
            }
            const typeLower = type.toLowerCase();
            let size = 4;
            if (typeLower === "uint16" || typeLower === "int16" || typeLower === "short") {
              size = 2;
            } else if (typeLower === "uint8" || typeLower === "int8" || typeLower === "byte" || typeLower === "char") {
              size = 1;
            }
            s.columns.push({
              name,
              type,
              offset: currentOffset,
              srcTag: tag,
              srcTagInt: tagInt,
              srcOffset
            });
            currentOffset += size;
          } else if (cp.length >= 5) {
            const name = cp[0].trim();
            const type = cp[1].trim();
            const offset = parseInt(cp[2]);
            const tag = cp[3].trim();
            const srcOffset = cp[4].trim();
            let tagInt = 0;
            if (tag.length > 0 && tag !== "HeaderFormID" && tag !== "HeaderFlags" && tag !== "BlobOffset" && tag !== "StringIndex") {
              tagInt = getTagInt(tag);
            }
            s.columns.push({
              name,
              type,
              offset,
              srcTag: tag,
              srcTagInt: tagInt,
              srcOffset
            });
            const typeLower = type.toLowerCase();
            let size = 4;
            if (typeLower === "uint16" || typeLower === "int16" || typeLower === "short") {
              size = 2;
            } else if (typeLower === "uint8" || typeLower === "int8" || typeLower === "byte" || typeLower === "char") {
              size = 1;
            }
            currentOffset = offset + size;
          }
        }
        if (!s.rowSize) {
          s.rowSize = currentOffset;
        }
        list[sig] = s;
      }
    } else {
      for (const t of schemaStr.split(";")) {
        const cleaned = t.trim();
        if (!cleaned) continue;
        const p = cleaned.split("|"), h = p[0].split(":");
        const s = { recordType: h[0].trim(), rowSize: parseInt(h[1]), columns: [] };
        if (p[1]) {
          for (const c of p[1].split(",")) {
            const cp = c.trim().split(":");
            if (cp.length >= 5) {
              const name = cp[0].trim();
              const type = cp[1].trim();
              const offset = parseInt(cp[2]);
              const tag = cp[3].trim();
              const srcOffset = cp[4].trim();
              let tagInt = 0;
              if (tag.length > 0 && tag !== "HeaderFormID" && tag !== "HeaderFlags" && tag !== "BlobOffset" && tag !== "StringIndex") {
                tagInt = getTagInt(tag);
              }
              s.columns.push({
                name,
                type,
                offset,
                srcTag: tag,
                srcTagInt: tagInt,
                srcOffset
              });
            }
          }
        }
        list[h[0].trim()] = s;
      }
    }
    return list;
  }
  function formatAndComputeSchemaText(schemaStr) {
    const parsed = parseSchema(schemaStr);
    let output = "";
    for (const [sig, s] of Object.entries(parsed)) {
      output += `[${sig}:${s.rowSize}]
`;
      for (const col of s.columns) {
        output += `  ${col.name}:${col.type}:${col.offset}:${col.srcTag}:${col.srcOffset}
`;
      }
      output += "\n";
    }
    return output.trim();
  }
  function highlightSchemaText(text) {
    let html = escapeHtml(text);
    html = html.replace(
      /([a-zA-Z0-9_]+)\s*\:\s*(UInt[0-9]+|Float|Int[0-9]+|short|byte|char|int)\s*\:\s*(\d+)\s*\:\s*([a-zA-Z0-9_]+)\s*\:\s*([a-zA-Z0-9_]+)/gi,
      '<span class="hl-col">$1</span>:<span class="hl-type">$2</span>:<span class="hl-num">$3</span>:<span class="hl-tag">$4</span>:<span class="hl-num">$5</span>'
    );
    html = html.replace(
      /(?<!span class="hl-col">)(?<!:)([a-zA-Z0-9_]+)\s*\:\s*(UInt[0-9]+|Float|Int[0-9]+|short|byte|char|int)\s*\:\s*([a-zA-Z0-9_]+)\s*\:\s*([a-zA-Z0-9_]+)/gi,
      '<span class="hl-col">$1</span>:<span class="hl-type">$2</span>:<span class="hl-tag">$3</span>:<span class="hl-num">$4</span>'
    );
    html = html.replace(/\[([A-Z_0-9]{4})(?:(\s*\:\s*)(\d+))?\]/gi, (m, sig, sep, num) => {
      let res = `<span class="hl-pipe">[</span><span class="hl-sig">${sig}</span>`;
      if (sep && num) {
        res += `${sep}<span class="hl-num">${num}</span>`;
      }
      res += `<span class="hl-pipe">]</span>`;
      return res;
    });
    html = html.replace(
      /([A-Z_0-9]{4})(\s*\:\s*)(\d+)(\s*\|)/gi,
      '<span class="hl-sig">$1</span>$2<span class="hl-num">$3</span><span class="hl-pipe">$4</span>'
    );
    html = html.replace(/,/g, '<span class="hl-comma">,</span>');
    html = html.replace(/;/g, '<span class="hl-semi">;</span>');
    return html;
  }

  // docs/js/ui/schema_view.js
  var SchemaView = class {
    constructor(store, uiController) {
      this.store = store;
      this.uiController = uiController;
    }
    loadPreset(preset) {
      const textarea = document.getElementById("schemaTextarea");
      if (!textarea) return;
      if (preset === "skyrim") {
        textarea.value = formatSchemaForTextarea(skyrimSchemaStr);
      } else if (preset === "fallout4") {
        textarea.value = formatSchemaForTextarea(fallout4SchemaStr);
      }
      const schemas = parseSchema(textarea.value);
      this.store.update({ schemas });
      this.updateHighlight();
      const gameSelect = document.getElementById("gamePresetSelect");
      if (gameSelect) gameSelect.value = preset;
      const schemaSelect = document.getElementById("schemaPresetSelect");
      if (schemaSelect) schemaSelect.value = preset;
    }
    syncScroll() {
      const textarea = document.getElementById("schemaTextarea");
      const backdrop = document.getElementById("schemaHighlightBackdrop");
      if (textarea && backdrop) {
        backdrop.scrollTop = textarea.scrollTop;
        backdrop.scrollLeft = textarea.scrollLeft;
      }
    }
    updateHighlight() {
      const textarea = document.getElementById("schemaTextarea");
      const backdrop = document.getElementById("schemaHighlightBackdrop");
      if (textarea && backdrop) {
        backdrop.innerHTML = highlightSchemaText(textarea.value);
      }
    }
    applyCustomSchema() {
      const val = document.getElementById("schemaTextarea").value;
      const { rawSectorBytesCache } = this.store.getState();
      try {
        const schemas = parseSchema(val);
        this.store.update({ schemas });
        this.updateHighlight();
        if (Object.keys(rawSectorBytesCache).length > 0) {
          this.parseAllSubsectorsFromCache();
          this.uiController.filterAndRenderDb();
          document.getElementById("status").innerText = "Schema applied to active data successfully.";
        } else {
          document.getElementById("status").innerText = "Schema applied successfully. Load a file to view.";
        }
      } catch (err) {
        console.error(err);
        document.getElementById("status").innerText = "Failed to apply schema: " + err.message;
      }
    }
    formatInEditor() {
      const textarea = document.getElementById("schemaTextarea");
      if (textarea) {
        const currentText = textarea.value;
        try {
          const formatted = formatAndComputeSchemaText(currentText);
          textarea.value = formatted;
          this.updateHighlight();
          document.getElementById("status").innerText = "Schema calculated and formatted successfully.";
        } catch (err) {
          document.getElementById("status").innerText = "Format error: " + err.message;
        }
      }
    }
    parseAllSubsectorsFromCache() {
      const { rawSectorBytesCache, schemas } = this.store.getState();
      const subsectors = {};
      for (const [sig, cache] of Object.entries(rawSectorBytesCache)) {
        const schema = schemas[sig] || { rowSize: cache.rowSize, columns: [
          { name: "FormID", type: "int", offset: 0 },
          { name: "Flags", type: "int", offset: 4 },
          { name: "BlobOffset", type: "int", offset: 8 }
        ] };
        const secView = new DataView(cache.rawSec.buffer, cache.rawSec.byteOffset, cache.rawSec.byteLength);
        const items = [];
        for (let r = 0; r < cache.rowCount; r++) {
          const rOff = r * schema.rowSize;
          const item = {};
          for (const col of schema.columns) {
            if (rOff + col.offset + 4 <= cache.rawSec.length) {
              if (col.type.toLowerCase() === "float") {
                item[col.name] = secView.getFloat32(rOff + col.offset, true);
              } else {
                item[col.name] = secView.getUint32(rOff + col.offset, true);
              }
            } else {
              item[col.name] = 0;
            }
          }
          items.push(item);
        }
        subsectors[sig] = items;
      }
      this.store.update({ subsectors });
    }
  };

  // docs/js/compiler/record_decoder.js
  var fullTagInt = getTagInt("FULL");
  var edidTagInt = getTagInt("EDID");
  async function decodeRecord(r, bytes, schema, isLocalized, saveStr, stringCacheMap, blobPool) {
    const rawBody = bytes.slice(r.bodyOffset, r.bodyOffset + r.bodyLen);
    let dataBlock = rawBody;
    if (r.flags & 262144) {
      try {
        dataBlock = await decompressDeflateRaw(rawBody.slice(6));
      } catch (err) {
        console.error("Decompression failed for record", r.type, err);
      }
    }
    let edidStr = "";
    let fullStr = "";
    const edidData = getSubDataFast(dataBlock, edidTagInt);
    if (edidData) {
      const termIdx = edidData.indexOf(0);
      edidStr = new TextDecoder().decode(termIdx >= 0 ? edidData.slice(0, termIdx) : edidData);
    }
    const fullData = getSubDataFast(dataBlock, fullTagInt);
    if (fullData) {
      if (isLocalized && fullData.length === 4) {
        const strId = new DataView(fullData.buffer, fullData.byteOffset, fullData.byteLength).getUint32(0, true);
        fullStr = `[LocalString: ${strId}]`;
      } else {
        const termIdx = fullData.indexOf(0);
        fullStr = new TextDecoder().decode(termIdx >= 0 ? fullData.slice(0, termIdx) : fullData);
      }
    }
    if (edidStr || fullStr) {
      stringCacheMap.set(r.fID, fullStr + "|" + edidStr);
    }
    const row = new Uint8Array(schema.rowSize);
    const rView = new DataView(row.buffer);
    for (const col of schema.columns) {
      let val = 0;
      if (col.srcTag === "HeaderFormID") {
        val = r.fID;
      } else if (col.srcTag === "HeaderFlags") {
        val = r.flags;
      } else if (col.srcTag === "BlobOffset") {
        val = 0;
      } else if (col.srcOffset === "StringIndex") {
        if (col.srcTag === "EDID") {
          val = saveStr(edidStr);
        } else if (col.srcTag === "FULL") {
          val = saveStr(fullStr);
        } else {
          const subData = getSubDataFast(dataBlock, col.srcTagInt);
          if (subData) {
            let valStr = "";
            if (isLocalized && subData.length === 4 && (col.srcTag === "FULL" || col.srcTag === "DESC" || col.srcTag === "ITXT")) {
              const strId = new DataView(subData.buffer, subData.byteOffset, subData.byteLength).getUint32(0, true);
              valStr = `[LocalString: ${strId}]`;
            } else {
              const termIdx = subData.indexOf(0);
              valStr = new TextDecoder().decode(termIdx >= 0 ? subData.slice(0, termIdx) : subData);
            }
            val = saveStr(valStr);
          }
        }
      } else {
        const subData = getSubDataFast(dataBlock, col.srcTagInt);
        if (subData) {
          const sOff = parseInt(col.srcOffset);
          if (sOff < subData.length) {
            const dv = new DataView(subData.buffer, subData.byteOffset, subData.byteLength);
            if (col.type === "Float") {
              if (sOff + 4 <= subData.length) {
                val = dv.getFloat32(sOff, true);
              }
            } else {
              if (sOff + 4 <= subData.length) {
                val = dv.getUint32(sOff, true);
              } else if (sOff + 2 <= subData.length) {
                val = dv.getUint16(sOff, true);
              } else if (sOff + 1 <= subData.length) {
                val = dv.getUint8(sOff);
              }
            }
          }
        }
      }
      if (col.offset + 4 <= schema.rowSize) {
        if (col.type === "Float") {
          rView.setFloat32(col.offset, val, true);
        } else {
          rView.setUint32(col.offset, val, true);
        }
      }
    }
    const remainderOffset = extractRemainderBytes(dataBlock, schema, blobPool);
    for (const col of schema.columns) {
      if (col.srcTag === "BlobOffset" && col.offset + 4 <= schema.rowSize) {
        rView.setUint32(col.offset, remainderOffset, true);
      }
    }
    return row;
  }
  function extractRemainderBytes(dataBlock, schema, blobPool) {
    const trackedTags = /* @__PURE__ */ new Set();
    for (const col of schema.columns) {
      if (col.srcTagInt) trackedTags.add(col.srcTagInt);
    }
    const blobBuilder = new BlobPoolBuilder();
    let bOff = 0;
    const subView = new DataView(dataBlock.buffer, dataBlock.byteOffset, dataBlock.byteLength);
    while (bOff + 6 <= dataBlock.length) {
      const subTag = subView.getUint32(bOff, true);
      const subSize = subView.getUint16(bOff + 4, true);
      if (bOff + 6 + subSize > dataBlock.length) break;
      if (!trackedTags.has(subTag) && subTag !== fullTagInt && subTag !== edidTagInt) {
        blobBuilder.write(dataBlock.slice(bOff, bOff + 6 + subSize));
      }
      bOff += 6 + subSize;
    }
    const remainderBytes = blobBuilder.toArray();
    if (remainderBytes.length > 0) {
      return blobPool.write(remainderBytes);
    }
    return 0;
  }

  // docs/js/compiler/string_table.js
  function parseStringTable(bStr) {
    const stringCache = {};
    if (bStr.byteLength < 4) return stringCache;
    const view = new DataView(bStr.buffer, bStr.byteOffset, bStr.byteLength);
    const count = view.getUint32(0, true);
    const idxs = [];
    for (let i = 0; i < count; i++) {
      const off = 4 + i * 10;
      if (off + 10 > bStr.byteLength) break;
      idxs.push({
        fID: view.getUint32(off, true),
        sOffset: view.getUint32(off + 4, true),
        sLength: view.getUint16(off + 8, true)
      });
    }
    const heap = 4 + count * 10;
    const dec = new TextDecoder();
    for (const idx of idxs) {
      if (heap + idx.sOffset + idx.sLength > bStr.byteLength) continue;
      const val = dec.decode(bStr.subarray(heap + idx.sOffset, heap + idx.sOffset + idx.sLength));
      const pipe = val.indexOf("|");
      if (pipe >= 0) {
        stringCache[idx.fID] = {
          name: val.substring(0, pipe),
          edid: val.substring(pipe + 1)
        };
      }
    }
    return stringCache;
  }
  function buildStringTable(stringCacheMap) {
    const stringTableBuilder = new BlobPoolBuilder();
    stringTableBuilder.writeUint32(stringCacheMap.size);
    const strDataBuilder = new BlobPoolBuilder();
    const enc = new TextEncoder();
    for (const [fID, val] of stringCacheMap.entries()) {
      const encodedVal = enc.encode(val);
      const sOff = strDataBuilder.write(encodedVal);
      const item = new Uint8Array(10);
      const view = new DataView(item.buffer);
      view.setUint32(0, fID, true);
      view.setUint32(4, sOff, true);
      view.setUint16(8, encodedVal.length, true);
      stringTableBuilder.write(item);
    }
    const rawBS = new Uint8Array(stringTableBuilder.length + strDataBuilder.length);
    rawBS.set(stringTableBuilder.toArray(), 0);
    rawBS.set(strDataBuilder.toArray(), stringTableBuilder.length);
    return rawBS;
  }

  // docs/js/compiler/reconstruction.js
  function parseReconstruction(bRc) {
    const loadedRecords = [];
    if (bRc.byteLength < 4) return loadedRecords;
    const view = new DataView(bRc.buffer, bRc.byteOffset, bRc.byteLength);
    const count = view.getUint32(0, true);
    let off = 4;
    for (let i = 0; i < count; i++) {
      if (off + 32 > bRc.byteLength) break;
      const sig = String.fromCharCode(bRc[off], bRc[off + 1], bRc[off + 2], bRc[off + 3]);
      const head = bRc.slice(off + 4, off + 28);
      const bodyLen = view.getUint32(off + 28, true);
      const flags = view.getUint32(off + 12, true);
      const fID = view.getUint32(off + 16, true);
      if (off + 32 + bodyLen > bRc.byteLength) break;
      loadedRecords.push({ type: sig, flags, fID, bodyLen, headerBytes: head, bodyOffset: off + 32 });
      off += 32 + bodyLen;
    }
    return loadedRecords;
  }
  function buildReconstruction(loadedRecords, bytes) {
    const chronoBuilder = new BlobPoolBuilder();
    const enc = new TextEncoder();
    chronoBuilder.writeUint32(loadedRecords.length);
    for (const r of loadedRecords) {
      chronoBuilder.write(enc.encode((r.type + "    ").substring(0, 4)));
      chronoBuilder.write(r.headerBytes);
      chronoBuilder.writeUint32(r.bodyLen);
      if (r.bodyLen > 0) {
        chronoBuilder.write(bytes.subarray(r.bodyOffset, r.bodyOffset + r.bodyLen));
      }
    }
    return chronoBuilder.toArray();
  }

  // docs/js/compiler.js
  async function compileEsmToBesm(bytes, gamePreset, activeSchemaStr) {
    const schemas = parseSchemaForCompile(activeSchemaStr);
    const textStringCache = /* @__PURE__ */ new Map();
    const sectorRows = /* @__PURE__ */ new Map();
    const blobPool = new BlobPoolBuilder();
    const stringCacheMap = /* @__PURE__ */ new Map();
    const loadedRecords = [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const headerSig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (headerSig !== "TES4") {
      throw new Error("Invalid file header: Must start with TES4");
    }
    const headerFlags = view.getUint32(8, true);
    const isLocalized = (headerFlags & 128) !== 0;
    function saveStr(str) {
      if (!str) return 0;
      if (textStringCache.has(str)) return textStringCache.get(str);
      const encoded = new TextEncoder().encode(str);
      const zeroTerm = new Uint8Array(encoded.length + 1);
      zeroTerm.set(encoded);
      const sOff = blobPool.write(zeroTerm);
      textStringCache.set(str, sOff);
      return sOff;
    }
    let offset = 0;
    while (offset < bytes.length) {
      if (offset + 24 > bytes.length) break;
      const recType = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      if (recType === "GRUP") {
        const hBytes2 = bytes.slice(offset, offset + 24);
        loadedRecords.push({ type: "GRUP", flags: 0, fID: 0, bodyLen: 0, headerBytes: hBytes2, bodyOffset: offset + 24 });
        offset += 24;
        continue;
      }
      const bodyLen = view.getUint32(offset + 4, true);
      const totalSize = 24 + bodyLen;
      if (offset + totalSize > bytes.length) break;
      const fID = view.getUint32(offset + 12, true);
      const flags = view.getUint32(offset + 8, true);
      const hBytes = bytes.slice(offset, offset + 24);
      const r = { type: recType, flags, fID, bodyLen, headerBytes: hBytes, bodyOffset: offset + 24 };
      loadedRecords.push(r);
      const schema = schemas[recType];
      if (schema) {
        const row = await decodeRecord(r, bytes, schema, isLocalized, saveStr, stringCacheMap, blobPool);
        if (!sectorRows.has(recType)) {
          sectorRows.set(recType, []);
        }
        sectorRows.get(recType).push(row);
      }
      offset += totalSize;
    }
    const outBuilder = new BlobPoolBuilder();
    const enc = new TextEncoder();
    outBuilder.write(enc.encode("BESM"));
    outBuilder.writeUint32(1);
    outBuilder.writeUint32(sectorRows.size);
    outBuilder.write(new Uint8Array(96));
    const headStart = 12 + 96;
    for (let i = 0; i < sectorRows.size; i++) {
      outBuilder.write(new Uint8Array(40));
    }
    const infos = [];
    for (const [recType, rows] of sectorRows.entries()) {
      const schema = schemas[recType];
      const rawSectorBytes = new Uint8Array(rows.length * schema.rowSize);
      let sOff = 0;
      for (const row of rows) {
        rawSectorBytes.set(row, sOff);
        sOff += row.length;
      }
      const comp = await compressDeflateRaw(rawSectorBytes);
      const offsetInFile = outBuilder.length;
      outBuilder.write(comp);
      infos.push({
        recType,
        rowSize: schema.rowSize,
        rowCount: rows.length,
        offset: offsetInFile,
        compSize: comp.length,
        uncompSize: rawSectorBytes.length
      });
    }
    const rawB = blobPool.toArray();
    const compB = await compressDeflateRaw(rawB);
    const bOff = outBuilder.length;
    outBuilder.write(compB);
    const rawBS = buildStringTable(stringCacheMap);
    const compBS = await compressDeflateRaw(rawBS);
    const bsOff = outBuilder.length;
    outBuilder.write(compBS);
    const rawSC = enc.encode(activeSchemaStr);
    const compSC = await compressDeflateRaw(rawSC);
    const scOff = outBuilder.length;
    outBuilder.write(compSC);
    const rawRC = buildReconstruction(loadedRecords, bytes);
    const compRC = await compressDeflateRaw(rawRC);
    const rcOff = outBuilder.length;
    outBuilder.write(compRC);
    const finalBytes = outBuilder.toArray();
    const finalView = new DataView(finalBytes.buffer);
    finalView.setBigUint64(12, BigInt(bOff), true);
    finalView.setBigUint64(20, BigInt(compB.length), true);
    finalView.setBigUint64(28, BigInt(rawB.length), true);
    finalView.setBigUint64(36, BigInt(bsOff), true);
    finalView.setBigUint64(44, BigInt(compBS.length), true);
    finalView.setBigUint64(52, BigInt(rawBS.length), true);
    finalView.setBigUint64(60, BigInt(scOff), true);
    finalView.setBigUint64(68, BigInt(compSC.length), true);
    finalView.setBigUint64(76, BigInt(rawSC.length), true);
    finalView.setBigUint64(84, BigInt(rcOff), true);
    finalView.setBigUint64(92, BigInt(compRC.length), true);
    finalView.setBigUint64(100, BigInt(rawRC.length), true);
    let sPos = headStart;
    for (const info of infos) {
      const paddedType = (info.recType + "    ").substring(0, 4);
      finalBytes.set(enc.encode(paddedType), sPos);
      finalView.setUint32(sPos + 4, info.rowSize, true);
      finalView.setUint32(sPos + 8, info.rowCount, true);
      finalView.setBigUint64(sPos + 12, BigInt(info.offset), true);
      finalView.setBigUint64(sPos + 20, BigInt(info.compSize), true);
      finalView.setBigUint64(sPos + 28, BigInt(info.uncompSize), true);
      finalView.setUint32(sPos + 36, 0, true);
      sPos += 40;
    }
    return { finalBytes, loadedRecords };
  }

  // docs/js/ui/file_loader.js
  var FileLoader = class {
    constructor(store, uiController) {
      this.store = store;
      this.uiController = uiController;
    }
    loadRaw(file) {
      this.store.update({ loadedFileMode: "raw" });
      const reader = new FileReader();
      reader.onload = (evt) => {
        const rawFileBytes = new Uint8Array(evt.target.result);
        this.store.update({ rawFileBytes });
        const presetSelect = document.getElementById("gamePresetSelect");
        const compileBtn = document.getElementById("compileBtn");
        presetSelect.style.display = "inline-block";
        compileBtn.style.display = "inline-block";
        const nameLower = file.name.toLowerCase();
        if (nameLower.includes("skyrim") || nameLower.includes("ccbg")) {
          presetSelect.value = "skyrim";
        } else {
          presetSelect.value = "fallout4";
        }
        const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        const targetExt = ext === ".esp" ? ".besp" : ext === ".esl" ? ".besl" : ".besm";
        compileBtn.textContent = "Compile to " + targetExt.toUpperCase();
        const fileMd5 = md5(rawFileBytes).toUpperCase();
        document.getElementById("status").innerText = "Loaded raw file. MD5: " + fileMd5 + ". Select preset & compile.";
      };
      reader.readAsArrayBuffer(file);
    }
    async loadBinary(file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        await this.loadBinaryBytes(evt.target.result);
      };
      reader.readAsArrayBuffer(file);
    }
    async loadBinaryBytes(buf) {
      this.store.update({
        loadedFileMode: "besm",
        rawSectorBytesCache: {}
      });
      document.getElementById("rebuildBtn").style.display = "inline-block";
      document.getElementById("subsectorSelect").style.display = "inline-block";
      document.getElementById("gamePresetSelect").style.display = "none";
      document.getElementById("compileBtn").style.display = "none";
      try {
        const view = new DataView(buf);
        const bytes = new Uint8Array(buf);
        const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
        if (sig !== "BESM" && sig !== "BES\0" && sig !== "BES ") {
          document.getElementById("status").innerText = "Corrupt file header";
          return;
        }
        const ver = view.getUint32(4, true);
        const secCount = view.getUint32(8, true);
        const bOff = Number(view.getBigUint64(12, true));
        const bCS = Number(view.getBigUint64(20, true));
        const bUS = Number(view.getBigUint64(28, true));
        const bsOff = Number(view.getBigUint64(36, true));
        const bsCS = Number(view.getBigUint64(44, true));
        const bsUS = Number(view.getBigUint64(52, true));
        const scOff = Number(view.getBigUint64(60, true));
        const scCS = Number(view.getBigUint64(68, true));
        const scUS = Number(view.getBigUint64(76, true));
        const rcOff = Number(view.getBigUint64(84, true));
        const rcCS = Number(view.getBigUint64(92, true));
        const rcUS = Number(view.getBigUint64(100, true));
        const bPool = await decompressDeflateRaw(bytes.slice(bOff, bOff + bCS));
        const stringCache = parseStringTable(await decompressDeflateRaw(bytes.slice(bsOff, bsOff + bsCS)));
        this.store.update({ stringCache });
        let schemas = this.store.getState().schemas;
        if (scOff > 0) {
          const schemaStr = new TextDecoder().decode(await decompressDeflateRaw(bytes.slice(scOff, scOff + scCS)));
          schemas = parseSchema(schemaStr);
          this.store.update({ schemas });
          const textarea = document.getElementById("schemaTextarea");
          if (textarea) {
            textarea.value = formatSchemaForTextarea(schemaStr);
            this.uiController.schema.updateHighlight();
          }
        }
        let decompRc = null;
        let loadedRecords = [];
        if (rcOff > 0) {
          decompRc = await decompressDeflateRaw(bytes.slice(rcOff, rcOff + rcCS));
          loadedRecords = parseReconstruction(decompRc);
          this.store.update({ decompRc, loadedRecords });
        }
        const sStart = 12 + 96;
        const select = document.getElementById("subsectorSelect");
        select.innerHTML = "";
        const subsectors = {};
        const rawSectorBytesCache = {};
        const optionsList = [];
        for (let i = 0; i < secCount; i++) {
          const off = sStart + i * 40;
          const sig2 = String.fromCharCode(...bytes.slice(off, off + 4)).trim();
          const rowSize = view.getUint32(off + 4, true);
          const rowCount = view.getUint32(off + 8, true);
          const sOffset = Number(view.getBigUint64(off + 12, true));
          const sCompSize = Number(view.getBigUint64(off + 20, true));
          const rawSec = await decompressDeflateRaw(bytes.slice(sOffset, sOffset + sCompSize));
          rawSectorBytesCache[sig2] = { rawSec, rowSize, rowCount };
          const schema = schemas[sig2] || { rowSize, columns: [
            { name: "FormID", type: "int", offset: 0 },
            { name: "Flags", type: "int", offset: 4 },
            { name: "BlobOffset", type: "int", offset: 8 }
          ] };
          const secView = new DataView(rawSec.buffer, rawSec.byteOffset, rawSec.byteLength);
          const items = [];
          for (let r = 0; r < rowCount; r++) {
            const rOff = r * schema.rowSize;
            const item = {};
            for (const col of schema.columns) {
              if (rOff + col.offset + 4 <= rawSec.length) {
                if (col.type.toLowerCase() === "float") {
                  item[col.name] = secView.getFloat32(rOff + col.offset, true);
                } else {
                  item[col.name] = secView.getUint32(rOff + col.offset, true);
                }
              } else {
                item[col.name] = 0;
              }
            }
            items.push(item);
          }
          subsectors[sig2] = items;
          optionsList.push({ sig: sig2, rowCount });
        }
        optionsList.sort((a, b) => a.sig.localeCompare(b.sig));
        for (const optInfo of optionsList) {
          const opt = document.createElement("option");
          opt.value = optInfo.sig;
          opt.textContent = optInfo.sig + " (" + optInfo.rowCount + ")";
          select.appendChild(opt);
        }
        let activeSubsectorType = "";
        if (secCount > 0 && optionsList.length > 0) {
          select.value = optionsList[0].sig;
          activeSubsectorType = select.value;
        }
        this.store.update({
          subsectors,
          rawSectorBytesCache,
          activeSubsectorType,
          dbPage: 0,
          chronoPage: 0,
          stringsPage: 0
        });
        this.uiController.filterAndRenderDb();
        this.uiController.filterAndRenderChrono();
        this.uiController.filterAndRenderStrings();
        document.getElementById("status").innerText = "Loaded binary file";
        if (this.store.getState().activeViewMode === "spatial" && this.uiController.spatialView) {
          this.uiController.spatialView.zoomToFit();
        }
      } catch (err) {
        console.error(err);
        document.getElementById("status").innerText = "Parse error: " + err.message;
      }
    }
  };

  // docs/js/ui/event_binder.js
  var EventBinder = class {
    constructor(store, uiController) {
      this.store = store;
      this.ui = uiController;
    }
    bind() {
      document.getElementById("fileInput").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.store.update({ originalFileName: file.name });
        const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        document.getElementById("status").innerText = "Loading " + file.name + "...";
        document.getElementById("subsectorSelect").style.display = "none";
        document.getElementById("rebuildBtn").style.display = "none";
        document.getElementById("gamePresetSelect").style.display = "none";
        document.getElementById("compileBtn").style.display = "none";
        if (ext === ".csv") {
          this.ui.csv.load(file);
        } else if (ext === ".besm" || ext === ".besp" || ext === ".besl") {
          await this.ui.loader.loadBinary(file);
        } else if (ext === ".esm" || ext === ".esp" || ext === ".esl") {
          this.ui.loader.loadRaw(file);
        } else {
          document.getElementById("status").innerText = "Unsupported file type";
        }
      });
      document.getElementById("gamePresetSelect").addEventListener("change", (e) => {
        this.ui.schema.loadPreset(e.target.value);
      });
      document.getElementById("compileBtn").addEventListener("click", async () => {
        const { rawFileBytes, originalFileName } = this.store.getState();
        if (!rawFileBytes) return;
        const preset = document.getElementById("gamePresetSelect").value;
        const activeSchemaStr = document.getElementById("schemaTextarea").value;
        document.getElementById("status").innerText = "Compiling to binary format...";
        try {
          const { finalBytes } = await compileEsmToBesm(rawFileBytes, preset, activeSchemaStr);
          const ext = originalFileName.substring(originalFileName.lastIndexOf(".")).toLowerCase();
          const targetExt = ext === ".esp" ? ".besp" : ext === ".esl" ? ".besl" : ".besm";
          const outName = originalFileName.substring(0, originalFileName.lastIndexOf(".")) + targetExt;
          const blob = new Blob([finalBytes], { type: "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = outName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          document.getElementById("status").innerText = "Compiled & downloaded " + outName;
          this.store.update({ originalFileName: outName });
          await this.ui.loader.loadBinaryBytes(finalBytes.buffer);
        } catch (err) {
          console.error(err);
          document.getElementById("status").innerText = "Compilation failed: " + err.message;
        }
      });
      document.getElementById("subsectorSelect").addEventListener("change", (e) => {
        this.store.update({
          activeSubsectorType: e.target.value,
          dbPage: 0
        });
        this.ui.filterAndRenderDb();
      });
      document.getElementById("searchBox").addEventListener("input", () => {
        this.store.update({
          dbPage: 0,
          chronoPage: 0,
          stringsPage: 0,
          csvPage: 0
        });
        const { loadedFileMode } = this.store.getState();
        if (loadedFileMode === "csv") {
          this.ui.csv.filterAndRender();
        } else {
          this.ui.filterAndRenderDb();
          this.ui.chrono.filterAndRender();
          this.ui.strings.filterAndRender();
        }
      });
      document.getElementById("rebuildBtn").addEventListener("click", () => {
        this.ui.rebuildMasterFile();
      });
    }
  };

  // docs/js/ui.js
  var UIController = class {
    constructor(store) {
      this.store = store;
      this.spatialView = null;
      this.grid = new GridView(store, this);
      this.csv = new CsvView(store);
      this.chrono = new ChronoView(store);
      this.strings = new StringsView(store);
      this.schema = new SchemaView(store, this);
      this.loader = new FileLoader(store, this);
      this.binder = new EventBinder(store, this);
    }
    setSpatialView(spatialView) {
      this.spatialView = spatialView;
    }
    init() {
      this.binder.bind();
      this.schema.loadPreset("skyrim");
      this.store.subscribe((state, updates) => {
        if (updates.activeViewMode !== void 0) {
          this.updateViewModeActiveState(state.activeViewMode);
        }
      });
    }
    // Grid rows filtering & database pagination orchestration
    filterAndRenderDb() {
      const { loadedFileMode, activeSubsectorType, subsectors, activeCellFilter } = this.store.getState();
      if (loadedFileMode === "csv" || !activeSubsectorType || !subsectors[activeSubsectorType]) return;
      let rows = subsectors[activeSubsectorType];
      if (activeCellFilter) {
        rows = rows.filter((r) => {
          if (r.X === void 0 || r.Y === void 0) return false;
          const cx = Math.floor(r.X / 4096);
          const cy = Math.floor(r.Y / 4096);
          return cx === activeCellFilter.cx && cy === activeCellFilter.cy;
        });
      }
      const q = document.getElementById("searchBox").value.toLowerCase().trim();
      const filteredSubsectorRows = q ? rows.filter(
        (r) => Object.keys(r).some(
          (k) => this.getRecordLabelStr(r[k]).toLowerCase().includes(q) || String(r[k]).toLowerCase().includes(q)
        )
      ) : rows;
      this.store.update({ filteredSubsectorRows });
      this.extractSpatialList();
      this.grid.render();
      this.updateViewModeToolbarVisibility();
    }
    extractSpatialList() {
      const { activeSubsectorType, subsectors, activeViewMode } = this.store.getState();
      const allRows = subsectors[activeSubsectorType] || [];
      const q = document.getElementById("searchBox").value.toLowerCase().trim();
      const matched = q ? allRows.filter(
        (r) => Object.keys(r).some(
          (k) => this.getRecordLabelStr(r[k]).toLowerCase().includes(q) || String(r[k]).toLowerCase().includes(q)
        )
      ) : allRows;
      const spatialRecords = matched.filter((r) => r.X !== void 0 && r.Y !== void 0);
      this.store.update({ spatialRecords });
      const badge = document.getElementById("spatial-count-badge");
      if (badge) {
        badge.textContent = `${spatialRecords.length} Objects`;
      }
      if (activeViewMode === "spatial" && this.spatialView) {
        this.spatialView.renderCellMatrixTable();
        this.spatialView.drawMap();
      }
    }
    getRecordLabelStr(val) {
      return val && this.store.getState().stringCache[val] ? this.store.getState().stringCache[val].edid || `0x${val.toString(16).toUpperCase()}` : String(val);
    }
    renderDbPage() {
      this.grid.render();
    }
    selectGridRow(globalIdx) {
      this.grid.selectRow(globalIdx);
    }
    changeDbPage(dir) {
      const { loadedFileMode, csvPage, dbPage } = this.store.getState();
      if (loadedFileMode === "csv") {
        this.store.update({ csvPage: csvPage + dir });
        this.csv.render();
      } else {
        this.store.update({ dbPage: dbPage + dir });
        this.grid.render();
      }
    }
    changeChronoPage(dir) {
      const { chronoPage } = this.store.getState();
      this.store.update({ chronoPage: chronoPage + dir });
      this.chrono.render();
    }
    changeStringsPage(dir) {
      const { stringsPage } = this.store.getState();
      this.store.update({ stringsPage: stringsPage + dir });
      this.strings.render();
    }
    filterAndRenderChrono() {
      this.chrono.filterAndRender();
    }
    filterAndRenderStrings() {
      this.strings.filterAndRender();
    }
    // Tabs Manager
    switchTab(tabId) {
      document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
      const tabMap = {
        "database-view": 0,
        "chronology-view": 1,
        "schema-view": 2,
        "strings-view": 3,
        "how-it-works-view": 4
      };
      const targetIdx = tabMap[tabId];
      if (targetIdx !== void 0 && tabBtns[targetIdx]) {
        tabBtns[targetIdx].classList.add("active");
      }
      const targetPanel = document.getElementById(tabId);
      if (targetPanel) targetPanel.classList.add("active");
      const { activeViewMode } = this.store.getState();
      if (tabId === "database-view" && activeViewMode === "spatial") {
        setTimeout(() => {
          if (this.spatialView) {
            this.spatialView.resizeCanvas();
            this.spatialView.drawMap();
          }
        }, 50);
      }
    }
    // View Modes
    setViewMode(mode) {
      this.store.update({ activeViewMode: mode });
      const defaultGrid = document.getElementById("default-grid-container");
      const spatialGrid = document.getElementById("spatial-grid-container");
      const dbFooter = document.getElementById("db-footer");
      if (mode === "default") {
        defaultGrid.style.display = "block";
        spatialGrid.style.display = "none";
        dbFooter.style.display = "flex";
      } else {
        defaultGrid.style.display = "none";
        spatialGrid.style.display = "flex";
        dbFooter.style.display = "none";
        setTimeout(() => {
          if (this.spatialView) {
            this.spatialView.resizeCanvas();
            const { selectedSpatialRecord } = this.store.getState();
            if (selectedSpatialRecord && selectedSpatialRecord.X !== void 0 && selectedSpatialRecord.Y !== void 0) {
              const canvas = this.spatialView.canvas;
              const scale = 0.05;
              const offsetX = canvas.width / 2 - selectedSpatialRecord.X * scale;
              const offsetY = canvas.height / 2 - -selectedSpatialRecord.Y * scale;
              this.store.update({ scale, offsetX, offsetY });
            } else {
              this.spatialView.zoomToFit();
            }
            this.spatialView.renderCellMatrixTable();
            this.spatialView.drawMap();
          }
        }, 50);
      }
    }
    updateViewModeActiveState(mode) {
      const btnDefault = document.getElementById("view-btn-default");
      const btnSpatial = document.getElementById("view-btn-spatial");
      if (btnDefault) btnDefault.classList.toggle("active", mode === "default");
      if (btnSpatial) btnSpatial.classList.toggle("active", mode === "spatial");
    }
    subsectorHasSpatialData() {
      const { loadedFileMode, activeSubsectorType, subsectors, schemas } = this.store.getState();
      if (loadedFileMode === "csv") return false;
      if (!activeSubsectorType || !subsectors[activeSubsectorType]) return false;
      const schema = schemas[activeSubsectorType];
      if (!schema) return false;
      return schema.columns.some((c) => c.name === "X") && schema.columns.some((c) => c.name === "Y");
    }
    updateViewModeToolbarVisibility() {
      const toolbar = document.getElementById("viewModeBar");
      if (!toolbar) return;
      if (this.subsectorHasSpatialData()) {
        toolbar.style.display = "flex";
      } else {
        toolbar.style.display = "none";
        this.setViewMode("default");
      }
    }
    // Schema Actions Delegation
    loadSchemaPreset(preset) {
      this.schema.loadPreset(preset);
    }
    syncEditorScroll() {
      this.schema.syncScroll();
    }
    updateSchemaHighlight() {
      this.schema.updateHighlight();
    }
    applyCustomSchema() {
      this.schema.applyCustomSchema();
    }
    formatSchemaInEditor() {
      this.schema.formatInEditor();
    }
    // Reconstruct Master File
    rebuildMasterFile() {
      const { decompRc, loadedRecords, originalFileName, rawFileBytes } = this.store.getState();
      if (!decompRc || loadedRecords.length === 0) return;
      try {
        const total = loadedRecords.reduce((acc, r) => acc + 24 + r.bodyLen, 0);
        const outBytes = new Uint8Array(total);
        let off = 0;
        for (const r of loadedRecords) {
          outBytes.set(r.headerBytes, off);
          off += 24;
          if (r.bodyLen > 0) {
            outBytes.set(decompRc.subarray(r.bodyOffset, r.bodyOffset + r.bodyLen), off);
            off += r.bodyLen;
          }
        }
        let ext = ".esm";
        if (originalFileName.toLowerCase().endsWith(".besp")) ext = ".esp";
        else if (originalFileName.toLowerCase().endsWith(".besl")) ext = ".esl";
        const outName = originalFileName.replace(/\.bes[m|p|l]$/i, "") + ext;
        const blob = new Blob([outBytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = outName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        const rebuiltMd5 = md5(outBytes).toUpperCase();
        if (rawFileBytes) {
          const originalMd5 = md5(rawFileBytes).toUpperCase();
          if (originalMd5 === rebuiltMd5) {
            document.getElementById("status").innerHTML = "Rebuilt & saved " + outName + "<br><span style='color: #a8ffb2; font-weight: bold;'>\u2714 1:1 MD5 MATCH: " + rebuiltMd5 + "</span>";
          } else {
            document.getElementById("status").innerHTML = "Rebuilt & saved " + outName + "<br><span style='color: #ff8b8b; font-weight: bold;'>\u2718 MD5 MISMATCH!<br>Original: " + originalMd5 + "<br>Rebuilt: " + rebuiltMd5 + "</span>";
          }
        } else {
          document.getElementById("status").innerHTML = "Rebuilt & saved " + outName + "<br><span style='color: #e2e2e2; font-weight: bold;'>Rebuilt MD5: " + rebuiltMd5 + "</span>";
        }
      } catch (err) {
        console.error(err);
        document.getElementById("status").innerText = "Rebuild failed: " + err.message;
      }
    }
  };

  // docs/js/spatial/canvas_renderer.js
  var CanvasRenderer = class {
    constructor(store, coordConverter) {
      this.store = store;
      this.coordConverter = coordConverter;
    }
    drawMap(canvas, ctx) {
      if (!canvas || !ctx) return;
      const state = this.store.getState();
      const { spatialRecords, activeCellFilter, selectedSpatialRecord, hoverSpatialRecord, isPanning, scale, stringCache } = state;
      ctx.fillStyle = "#151515";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (spatialRecords.length === 0) return;
      const cellSize = 4096;
      const tl = this.coordConverter.screenToWorld(0, 0);
      const br = this.coordConverter.screenToWorld(canvas.width, canvas.height);
      const minCellX = Math.floor(tl.x / cellSize);
      const maxCellX = Math.ceil(br.x / cellSize);
      const minCellY = Math.floor(br.y / cellSize);
      const maxCellY = Math.ceil(tl.y / cellSize);
      ctx.lineWidth = 1;
      ctx.font = "9px monospace";
      for (let cx = minCellX; cx <= maxCellX; cx++) {
        const wx = cx * cellSize;
        const sPt = this.coordConverter.worldToScreen(wx, 0);
        ctx.strokeStyle = cx === 0 ? "rgba(0, 240, 255, 0.4)" : "#262626";
        ctx.beginPath();
        ctx.moveTo(sPt.x, 0);
        ctx.lineTo(sPt.x, canvas.height);
        ctx.stroke();
        if (scale > 2e-3) {
          ctx.fillStyle = "#666";
          ctx.fillText(cx, sPt.x + 3, canvas.height - 6);
        }
      }
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const wy = cy * cellSize;
        const sPt = this.coordConverter.worldToScreen(0, wy);
        ctx.strokeStyle = cy === 0 ? "rgba(0, 240, 255, 0.4)" : "#262626";
        ctx.beginPath();
        ctx.moveTo(0, sPt.y);
        ctx.lineTo(canvas.width, sPt.y);
        ctx.stroke();
        if (scale > 2e-3) {
          ctx.fillStyle = "#666";
          ctx.fillText(cy, 6, sPt.y - 3);
        }
      }
      if (activeCellFilter) {
        const cx = activeCellFilter.cx;
        const cy = activeCellFilter.cy;
        const tlPt = this.coordConverter.worldToScreen(cx * cellSize, (cy + 1) * cellSize);
        const brPt = this.coordConverter.worldToScreen((cx + 1) * cellSize, cy * cellSize);
        const w = brPt.x - tlPt.x;
        const h = brPt.y - tlPt.y;
        ctx.fillStyle = "rgba(255, 184, 108, 0.06)";
        ctx.strokeStyle = "#ffb86c";
        ctx.lineWidth = 1.5;
        ctx.fillRect(tlPt.x, tlPt.y, w, h);
        ctx.strokeRect(tlPt.x, tlPt.y, w, h);
      }
      for (const r of spatialRecords) {
        const sPt = this.coordConverter.worldToScreen(r.X, r.Y);
        if (sPt.x < -10 || sPt.x > canvas.width + 10 || sPt.y < -10 || sPt.y > canvas.height + 10) continue;
        const isSelected = selectedSpatialRecord && selectedSpatialRecord.FormID === r.FormID;
        const isHovered = hoverSpatialRecord && hoverSpatialRecord.FormID === r.FormID;
        let radius = 2.5;
        if (scale > 0.01) radius = 3.5;
        if (scale > 0.1) radius = 5.5;
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(sPt.x, sPt.y, radius + 4 + Math.sin(Date.now() / 150) * 1.5, 0, 2 * Math.PI);
          ctx.strokeStyle = "#ffb86c";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(sPt.x, sPt.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = "#ffb86c";
          ctx.fill();
        } else if (isHovered) {
          ctx.beginPath();
          ctx.arc(sPt.x, sPt.y, radius + 2, 0, 2 * Math.PI);
          ctx.strokeStyle = "#00f0ff";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(sPt.x, sPt.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(sPt.x, sPt.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = "#00f0ff";
          ctx.fill();
        }
      }
      if (hoverSpatialRecord && !isPanning) {
        const cache = stringCache[hoverSpatialRecord.FormID] || { edid: "", name: "" };
        const sPt = this.coordConverter.worldToScreen(hoverSpatialRecord.X, hoverSpatialRecord.Y);
        const lines = [
          `FormID: 0x${hoverSpatialRecord.FormID.toString(16).toUpperCase().padStart(8, "0")}`,
          `EDID: ${cache.edid || "N/A"}`,
          `Name: ${cache.name || "N/A"}`,
          `Coords: (${Math.round(hoverSpatialRecord.X)}, ${Math.round(hoverSpatialRecord.Y)}, ${Math.round(hoverSpatialRecord.Z || 0)})`
        ];
        ctx.font = "10px monospace";
        let maxW = 0;
        for (const l of lines) {
          maxW = Math.max(maxW, ctx.measureText(l).width);
        }
        const boxW = maxW + 16;
        const boxH = lines.length * 13 + 8;
        let tx = sPt.x + 10;
        let ty = sPt.y - boxH / 2;
        if (tx + boxW > canvas.width) tx = sPt.x - boxW - 10;
        if (ty < 5) ty = 5;
        if (ty + boxH > canvas.height - 5) ty = canvas.height - boxH - 5;
        ctx.fillStyle = "#1a1a1a";
        ctx.strokeStyle = "#3d3d3d";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(tx, ty, boxW, boxH);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#e0e0e0";
        let ly = ty + 12;
        for (const l of lines) {
          ctx.fillText(l, tx + 8, ly);
          ly += 13;
        }
      }
    }
  };

  // docs/js/spatial/cell_matrix.js
  var CellMatrix = class {
    constructor(store) {
      this.store = store;
    }
    render(container) {
      if (!container) return;
      const { spatialRecords, activeCellFilter } = this.store.getState();
      if (spatialRecords.length === 0) {
        container.innerHTML = `<div style="color: #888; padding: 10px; text-align: center;">No spatial records loaded</div>`;
        return;
      }
      const cells = {};
      let minCx = Infinity, maxCx = -Infinity;
      let minCy = Infinity, maxCy = -Infinity;
      for (const r of spatialRecords) {
        const cx = Math.floor(r.X / 4096);
        const cy = Math.floor(r.Y / 4096);
        if (cx < minCx) minCx = cx;
        if (cx > maxCx) maxCx = cx;
        if (cy < minCy) minCy = cy;
        if (cy > maxCy) maxCy = cy;
        const key = `${cx},${cy}`;
        cells[key] = (cells[key] || 0) + 1;
      }
      if (minCx === Infinity) {
        container.innerHTML = `<div style="color: #888; padding: 10px; text-align: center;">No valid spatial cells</div>`;
        return;
      }
      let maxCount = 0;
      for (const cnt of Object.values(cells)) {
        if (cnt > maxCount) maxCount = cnt;
      }
      const maxDim = 16;
      let startCx = minCx, endCx = maxCx;
      let startCy = minCy, endCy = maxCy;
      const spanCx = maxCx - minCx + 1;
      const spanCy = maxCy - minCy + 1;
      let isCropped = false;
      let centerCx = Math.floor((minCx + maxCx) / 2);
      let centerCy = Math.floor((minCy + maxCy) / 2);
      if (spanCx > maxDim || spanCy > maxDim) {
        isCropped = true;
        let peakCx = centerCx, peakCy = centerCy, peakVal = 0;
        for (const [k, count] of Object.entries(cells)) {
          if (count > peakVal) {
            peakVal = count;
            const pts = k.split(",");
            peakCx = parseInt(pts[0]);
            peakCy = parseInt(pts[1]);
          }
        }
        centerCx = peakCx;
        centerCy = peakCy;
        startCx = Math.max(minCx, centerCx - Math.floor(maxDim / 2));
        endCx = Math.min(maxCx, startCx + maxDim - 1);
        if (endCx - startCx < maxDim - 1) startCx = Math.max(minCx, endCx - maxDim + 1);
        startCy = Math.max(minCy, centerCy - Math.floor(maxDim / 2));
        endCy = Math.min(maxCy, startCy + maxDim - 1);
        if (endCy - startCy < maxDim - 1) startCy = Math.max(minCy, endCy - maxDim + 1);
      }
      let html = `<table class="cell-matrix-table">`;
      html += `<thead><tr><th>Y\\X</th>`;
      for (let cx = startCx; cx <= endCx; cx++) {
        html += `<th>${cx}</th>`;
      }
      html += `</tr></thead><tbody>`;
      for (let cy = endCy; cy >= startCy; cy--) {
        html += `<tr><th>${cy}</th>`;
        for (let cx = startCx; cx <= endCx; cx++) {
          const key = `${cx},${cy}`;
          const count = cells[key] || 0;
          let style = "";
          let cls = "";
          let txt = "";
          if (count > 0) {
            const opacity = Math.min(1, 0.2 + Math.log(count) / Math.log(maxCount) * 0.8);
            style = `style="background-color: rgba(0, 240, 255, ${opacity});"`;
            txt = count;
          } else {
            cls = "empty-cell";
          }
          const isActive = activeCellFilter && activeCellFilter.cx === cx && activeCellFilter.cy === cy;
          if (isActive) cls += " cell-active";
          html += `<td class="${cls}" ${style} data-cx="${cx}" data-cy="${cy}" title="Cell (${cx}, ${cy})
Count: ${count}" onclick="toggleCellFilter(${cx}, ${cy})">${txt}</td>`;
        }
        html += `</tr>`;
      }
      html += `</tbody></table>`;
      if (isCropped) {
        html = `<div style="color: #ffb86c; font-size: 9px; margin-bottom: 4px; text-align: center;">Heatmap cropped to 16x16 center around (${centerCx}, ${centerCy})</div>` + html;
      }
      container.innerHTML = html;
    }
  };

  // docs/js/spatial/inspector.js
  var RecordInspector = class {
    constructor(store) {
      this.store = store;
    }
    render(container, record) {
      if (!container) return;
      if (!record) {
        container.innerHTML = `<div style="color: #888; padding: 10px; text-align: center;">Select an object on the map to inspect its data fields</div>`;
        return;
      }
      const state = this.store.getState();
      const { stringCache, monoCols } = state;
      const cache = stringCache[record.FormID] || { edid: "", name: "" };
      let html = `<table class="inspector-table">`;
      html += `<tr><td class="inspector-label">FormID</td><td class="inspector-value highlight">0x${record.FormID.toString(16).toUpperCase().padStart(8, "0")}</td></tr>`;
      html += `<tr><td class="inspector-label">EditorID</td><td class="inspector-value">${escapeHtml(cache.edid || "N/A")}</td></tr>`;
      html += `<tr><td class="inspector-label">FullName</td><td class="inspector-value">${escapeHtml(cache.name || "N/A")}</td></tr>`;
      for (const [key, val] of Object.entries(record)) {
        if (key === "FormID") continue;
        const isNum = typeof val === "number";
        const isFormIDCol = monoCols.has(key.toLowerCase());
        const displayVal = isFormIDCol ? getRecordLabel(val, stringCache) : val;
        html += `<tr>
                <td class="inspector-label">${escapeHtml(key)}</td>
                <td class="inspector-value ${isFormIDCol ? "highlight" : isNum ? "numeric" : ""}">${escapeHtml(displayVal)}</td>
            </tr>`;
      }
      html += `</table>`;
      container.innerHTML = html;
    }
  };

  // docs/js/spatial/interaction_handler.js
  var InteractionHandler = class {
    constructor(store, spatialView) {
      this.store = store;
      this.spatialView = spatialView;
      this.canvas = null;
    }
    setup(canvas) {
      this.canvas = canvas;
      if (!canvas) return;
      canvas.addEventListener("mousedown", (e) => {
        const { spatialRecords, offsetX, offsetY } = this.store.getState();
        if (spatialRecords.length === 0) return;
        this.store.update({
          isPanning: true,
          startPanX: e.clientX - offsetX,
          startPanY: e.clientY - offsetY
        });
        canvas.style.cursor = "grabbing";
      });
      window.addEventListener("mousemove", (e) => this.onMouseMove(e));
      window.addEventListener("mouseup", () => this.onMouseUp());
      canvas.addEventListener("wheel", (e) => this.onWheel(e));
      canvas.addEventListener("click", (e) => this.onClick(e));
    }
    onMouseMove(e) {
      const { spatialRecords, isPanning, startPanX, startPanY, scale, hoverSpatialRecord } = this.store.getState();
      if (spatialRecords.length === 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      if (isPanning) {
        this.store.update({
          offsetX: e.clientX - startPanX,
          offsetY: e.clientY - startPanY
        });
      } else {
        const worldPt = this.spatialView.screenToWorld(mouseX, mouseY);
        const closest = this.spatialView.findClosestRecord(worldPt.x, worldPt.y, 10 / scale);
        if (closest !== hoverSpatialRecord) {
          this.store.update({ hoverSpatialRecord: closest });
        }
      }
    }
    onMouseUp() {
      if (this.store.getState().isPanning) {
        this.store.update({ isPanning: false });
        if (this.canvas) {
          this.canvas.style.cursor = "grab";
        }
      }
    }
    onWheel(e) {
      const { spatialRecords, scale } = this.store.getState();
      if (spatialRecords.length === 0) return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPt = this.spatialView.screenToWorld(mouseX, mouseY);
      let newScale = scale;
      const zoomFactor = 1.15;
      if (e.deltaY < 0) {
        newScale *= zoomFactor;
      } else {
        newScale /= zoomFactor;
      }
      newScale = Math.max(5e-5, Math.min(1, newScale));
      const newOffsetX = mouseX - worldPt.x * newScale;
      const newOffsetY = mouseY - -worldPt.y * newScale;
      this.store.update({
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      });
    }
    onClick(e) {
      const { spatialRecords, isPanning, scale } = this.store.getState();
      if (spatialRecords.length === 0 || isPanning) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPt = this.spatialView.screenToWorld(mouseX, mouseY);
      const clicked = this.spatialView.findClosestRecord(worldPt.x, worldPt.y, 12 / scale);
      if (clicked) {
        this.spatialView.selectSpatialObject(clicked);
      }
    }
  };

  // docs/js/spatial_view.js
  var SpatialView = class {
    constructor(store, uiController) {
      this.store = store;
      this.uiController = uiController;
      this.canvas = null;
      this.ctx = null;
      this.renderer = new CanvasRenderer(store, this);
      this.matrix = new CellMatrix(store);
      this.inspector = new RecordInspector(store);
      this.interaction = new InteractionHandler(store, this);
      this.handleResize = this.resizeCanvas.bind(this);
    }
    init() {
      this.canvas = document.getElementById("spatial-canvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");
      this.interaction.setup(this.canvas);
      this.setupSpatialControls();
      this.resizeCanvas();
      window.addEventListener("resize", this.handleResize);
      this.store.subscribe((state, updates) => {
        if (state.activeViewMode === "spatial") {
          const needsDraw = updates.spatialRecords || updates.selectedSpatialRecord !== void 0 || updates.activeCellFilter !== void 0 || updates.scale !== void 0 || updates.offsetX !== void 0 || updates.offsetY !== void 0 || updates.hoverSpatialRecord !== void 0;
          if (needsDraw) {
            this.drawMap();
          }
          if (updates.spatialRecords || updates.activeCellFilter !== void 0) {
            this.renderCellMatrixTable();
          }
          if (updates.selectedSpatialRecord !== void 0) {
            this.inspectRecord(state.selectedSpatialRecord);
          }
        }
      });
    }
    setupSpatialControls() {
      document.getElementById("btn-fit").addEventListener("click", () => this.zoomToFit());
      document.getElementById("btn-zin").addEventListener("click", () => this.adjustZoom(1.3));
      document.getElementById("btn-zout").addEventListener("click", () => this.adjustZoom(1 / 1.3));
      document.getElementById("btn-clear-cell").addEventListener("click", () => this.clearCellFilter());
    }
    adjustZoom(factor) {
      const canvas = this.canvas;
      if (!canvas) return;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const worldPt = this.screenToWorld(cx, cy);
      let newScale = this.store.getState().scale * factor;
      newScale = Math.max(5e-5, Math.min(1, newScale));
      const newOffsetX = cx - worldPt.x * newScale;
      const newOffsetY = cy - -worldPt.y * newScale;
      this.store.update({
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      });
    }
    resizeCanvas() {
      const canvas = this.canvas;
      if (!canvas) return;
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      this.drawMap();
    }
    screenToWorld(sx, sy) {
      const { offsetX, offsetY, scale } = this.store.getState();
      return {
        x: (sx - offsetX) / scale,
        y: -(sy - offsetY) / scale
      };
    }
    worldToScreen(wx, wy) {
      const { offsetX, offsetY, scale } = this.store.getState();
      return {
        x: wx * scale + offsetX,
        y: -wy * scale + offsetY
      };
    }
    findClosestRecord(wx, wy, threshold) {
      const { spatialRecords } = this.store.getState();
      let closest = null;
      let minDist = threshold;
      for (const r of spatialRecords) {
        const dist = Math.hypot(r.X - wx, r.Y - wy);
        if (dist < minDist) {
          minDist = dist;
          closest = r;
        }
      }
      return closest;
    }
    zoomToFit() {
      const canvas = this.canvas;
      const { spatialRecords } = this.store.getState();
      if (!canvas || spatialRecords.length === 0) return;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const r of spatialRecords) {
        if (r.X < minX) minX = r.X;
        if (r.X > maxX) maxX = r.X;
        if (r.Y < minY) minY = r.Y;
        if (r.Y > maxY) maxY = r.Y;
      }
      if (minX === Infinity) return;
      const width = canvas.width;
      const height = canvas.height;
      const spanX = Math.max(1e3, maxX - minX);
      const spanY = Math.max(1e3, maxY - minY);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      let newScale = Math.min(width / spanX, height / spanY) * 0.85;
      newScale = Math.max(5e-5, Math.min(1, newScale));
      const newOffsetX = width / 2 - centerX * newScale;
      const newOffsetY = height / 2 - -centerY * newScale;
      this.store.update({
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      });
    }
    drawMap() {
      this.renderer.drawMap(this.canvas, this.ctx);
    }
    inspectRecord(record) {
      const container = document.getElementById("inspector-content");
      this.inspector.render(container, record);
    }
    renderCellMatrixTable() {
      const container = document.getElementById("cell-matrix-container");
      this.matrix.render(container);
    }
    selectSpatialObject(record) {
      const { filteredSubsectorRows, pageSize } = this.store.getState();
      this.store.update({ selectedSpatialRecord: record });
      const index = filteredSubsectorRows.findIndex((r) => r.FormID === record.FormID);
      if (index >= 0) {
        const page = Math.floor(index / pageSize);
        this.store.update({ dbPage: page });
        this.uiController.renderDbPage();
        setTimeout(() => {
          const targetRow = document.getElementById(`db-row-${index}`);
          if (targetRow) {
            targetRow.scrollIntoView({ block: "nearest" });
            document.querySelectorAll("#db-body tr").forEach((tr) => tr.classList.remove("row-selected"));
            targetRow.classList.add("row-selected");
          }
        }, 10);
      }
      const cx = Math.floor(record.X / 4096);
      const cy = Math.floor(record.Y / 4096);
      document.querySelectorAll(".cell-matrix-table td").forEach((td) => td.classList.remove("cell-active"));
      const cellEl = document.querySelector(`.cell-matrix-table td[data-cx="${cx}"][data-cy="${cy}"]`);
      if (cellEl) {
        cellEl.classList.add("cell-active");
        cellEl.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
    toggleCellFilter(cx, cy) {
      const { activeCellFilter } = this.store.getState();
      if (activeCellFilter && activeCellFilter.cx === cx && activeCellFilter.cy === cy) {
        this.clearCellFilter();
        return;
      }
      this.store.update({
        activeCellFilter: { cx, cy },
        dbPage: 0
      });
      const btnClear = document.getElementById("btn-clear-cell");
      if (btnClear) btnClear.style.display = "inline-block";
      document.querySelectorAll(".cell-matrix-table td").forEach((td) => td.classList.remove("cell-active"));
      const tdEl = document.querySelector(`.cell-matrix-table td[data-cx="${cx}"][data-cy="${cy}"]`);
      if (tdEl) tdEl.classList.add("cell-active");
      this.uiController.filterAndRenderDb();
      const cellSize = 4096;
      const canvas = this.canvas;
      if (canvas) {
        const scaleVal = canvas.height / (cellSize * 2.5);
        const finalScale = Math.max(5e-5, Math.min(1, scaleVal));
        this.store.update({
          scale: finalScale,
          offsetX: canvas.width / 2 - (cx + 0.5) * cellSize * finalScale,
          offsetY: canvas.height / 2 - -(cy + 0.5) * cellSize * finalScale
        });
      }
    }
    clearCellFilter() {
      this.store.update({
        activeCellFilter: null,
        dbPage: 0
      });
      const btnClear = document.getElementById("btn-clear-cell");
      if (btnClear) btnClear.style.display = "none";
      document.querySelectorAll(".cell-matrix-table td").forEach((td) => td.classList.remove("cell-active"));
      this.uiController.filterAndRenderDb();
      this.zoomToFit();
    }
  };

  // docs/js/app.js
  function initApp() {
    const store = new Store();
    const uiController = new UIController(store);
    const spatialView = new SpatialView(store, uiController);
    uiController.setSpatialView(spatialView);
    uiController.init();
    spatialView.init();
    window.switchTab = (tabId) => uiController.switchTab(tabId);
    window.setViewMode = (mode) => uiController.setViewMode(mode);
    window.changeDbPage = (dir) => uiController.changeDbPage(dir);
    window.changeChronoPage = (dir) => uiController.changeChronoPage(dir);
    window.changeStringsPage = (dir) => uiController.changeStringsPage(dir);
    window.loadSchemaPreset = (preset) => uiController.loadSchemaPreset(preset);
    window.applyCustomSchema = () => uiController.applyCustomSchema();
    window.formatSchemaInEditor = () => uiController.formatSchemaInEditor();
    window.updateSchemaHighlight = () => uiController.updateSchemaHighlight();
    window.syncEditorScroll = () => uiController.syncEditorScroll();
    window.selectGridRow = (globalIdx) => uiController.selectGridRow(globalIdx);
    window.toggleCellFilter = (cx, cy) => spatialView.toggleCellFilter(cx, cy);
    window.showMemBlock = (blockId) => {
      document.querySelectorAll(".mem-block").forEach((el) => el.classList.remove("active"));
      document.querySelectorAll(".mem-detail").forEach((el) => el.style.display = "none");
      const btn = document.getElementById("mem-btn-" + blockId);
      if (btn) btn.classList.add("active");
      const detail = document.getElementById("mem-detail-" + blockId);
      if (detail) detail.style.display = "block";
    };
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
