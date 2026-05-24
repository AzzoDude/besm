# Binary Elder Scrolls (BES) Format Specification

BES is an optimized, read-aligned, binary database file format designed to replace or alternate with the traditional sequential Bethesda Master (`.esm` / `.esp` / `.esl`) file structure. 

👉 **[Live Web Viewer & Compiler](https://azzodude.github.io/bes/)** | **[Buy Me A Coffee](https://buymeacoffee.com/azzodude)** (Broke student, please help buy dinner!)

By reorganizing records into structured, fixed-size data blocks and isolating variable-length data, BES enables constant-time $O(1)$ random access to any record field directly from disk or memory mapping.

---

## File Extensions

When compiling Bethesda plugin files to the BES format, a `B` prefix is added to the original file extension:
* `.esm` (Master File) ➔ **`.besm`** (Binary Elder Scrolls Master)
* `.esp` (Plugin File) ➔ **`.besp`** (Binary Elder Scrolls Plugin)
* `.esl` (Light Master File) ➔ **`.besl`** (Binary Elder Scrolls Light Master)

---

## High-Level Binary Layout

A compiled BES file is structured into five distinct segments:

```mermaid
graph TD
    classDef header fill:#1a365d,stroke:#2b6cb0,stroke-width:2px,color:#fff;
    classDef directory fill:#22543d,stroke:#2f855a,stroke-width:2px,color:#fff;
    classDef arrays fill:#744210,stroke:#975a16,stroke-width:2px,color:#fff;
    classDef strings fill:#2c5282,stroke:#3182ce,stroke-width:2px,color:#fff;
    classDef blobs fill:#553c9a,stroke:#6b46c1,stroke-width:2px,color:#fff;

    Header["**Header Segment (24 Bytes)**<br>• Magic Signature: BESM / BES\0 / BES<br>• Version & NumTypes<br>• StringTableOffset & BlobPoolOffset"]:::header
    Directory["**Record Type Directory**<br>• NumTypes entries (16B each)<br>• Signature: e.g., WEAP, ARMO, CELL<br>• RecordCount & RowSize<br>• Row Array DataOffset"]:::directory
    Arrays["**Flat Row Arrays (Fixed-Width Columns)**<br>• WEAP: [FormID (4B)][Flags (4B)][Stats...]<br>• ARMO: [FormID (4B)][Flags (4B)][Stats...]<br>• CELL: [FormID (4B)][Flags (4B)][Grid...]"]:::arrays
    Strings["**String Table**<br>• Concat Null-terminated UTF-8 text<br>• Offset referenced by Flat Row cells<br>• e.g., 'Steel Dagger\0', 'Iron Sword\0'"]:::strings
    Blobs["**Blob Pool (Binary Heap)**<br>• dynamic length subrecords<br>• size-prefixed: [Size (4B)][Payload Bytes]"]:::blobs

    Header --> Directory
    Directory --> Arrays
    Arrays --> Strings
    Arrays --> Blobs
```

---

## Segment Specifications

### 1. File Header (24 bytes)

The header resides at byte offset `0x00` and contains global directory markers:

| Offset | Size (Bytes) | Data Type | Field Name | Description |
| :--- | :--- | :--- | :--- | :--- |
| `0x00` | 4 | `char[4]` | `Magic` | Magic identifier signature; must be `"BES\0"`, `"BES "` or `"BESM"` |
| `0x04` | 4 | `uint32` | `Version` | File format version number |
| `0x08` | 4 | `uint32` | `NumTypes` | Total number of compiled record types |
| `0x0C` | 4 | `uint32` | `StringTableOffset` | Absolute byte offset to the String Table |
| `0x10` | 4 | `uint32` | `BlobPoolOffset` | Absolute byte offset to the Blob Pool |
| `0x14` | 4 | `uint32` | `Reserved` | Reserved bytes (padding/alignment) |

---

### 2. Record Type Directory

Immediately following the file header, this directory contains `NumTypes` entries. Each entry describes where a specific record type (e.g. `WEAP`, `ARMO`, `CELL`) begins in the flat row arrays:

| Offset | Size (Bytes) | Data Type | Field Name | Description |
| :--- | :--- | :--- | :--- | :--- |
| `0x00` | 4 | `char[4]` | `Signature` | 4-character record signature (e.g., `"WEAP"`) |
| `0x04` | 4 | `uint32` | `RecordCount` | Total number of records of this type |
| `0x08` | 4 | `uint32` | `RowSize` | Fixed width (in bytes) of a single record row |
| `0x0C` | 4 | `uint32` | `DataOffset` | Absolute byte offset to the start of this type's Flat Row Array |

---

### 3. Flat Row Arrays

These blocks contain contiguous arrays of records. For a given record type, every record occupies exactly `RowSize` bytes. 

The binary fields inside a row are aligned based on the compiled schema configuration (e.g., `DATA` stats or FormIDs):

* **FormID**: 4-byte unsigned integer (`uint32`) containing the unique ID.
* **Flags**: 4-byte unsigned integer (`uint32`) containing the record header flags.
* **Numeric Fields**: Stored as native floats (`float32`) or integers (`uint32`/`uint16`) aligned to the row.
* **String Offsets**: Stored as `uint32` indexes pointing to the relative byte offset within the String Table.
* **Blob Offsets**: Stored as `uint32` indexes pointing to the start of the unmapped subrecords in the Blob Pool.

---

### 4. String Table

A single contiguous block of null-terminated UTF-8 strings.
* Any text property (like EditorIDs or item Names) is replaced in the row array by a 4-byte offset.
* Looking up a string is done by seeking to `StringTableOffset + OffsetIndex` and reading until the null terminator (`\0`).

---

### 5. Blob Pool

A binary heap containing unparsed subrecords.
* Used to preserve complex, unmapped, or variable-length data structures (like custom script instances, package lists, or geometry data).
* Allows the Reconstruction Engine to perform perfect 1:1 rebuilding back to the original `.esm` format.

---

## Constant-Time Address Seeking

Because each record type's rows are uniform in size, any specific field column $C$ for a record at index $r$ can be addressed instantly without reading preceding records:

$$\text{Absolute Seek Address} = \text{DataOffset} + (r \times \text{RowSize}) + \text{ColumnOffset}$$

<p align="center">
  <img src="assets/astronaut-meme-always-has-been.webp" alt="Wait, it's all constant-time? Always has been." width="500">
</p>

