#!/usr/bin/env python3
"""
Vault-Tec Master File Database & Compiler - Python ESM to BESM Compiler
Converts standard Bethesda Master Files (.esm, .esp, .esl) to the high-performance
Binary Elder Scrolls Master format (.besm, .besp, .besl) with flat row arrays and O(1) indexing.
Uses the custom .bschema specifications to determine exact row structures dynamically.
"""

import os
import sys
import zlib
import struct
import argparse
import hashlib

# Graceful import of the custom .bschema parser
try:
    from bschema import BinarySchemaParser
except ImportError:
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from bschema import BinarySchemaParser




class BlobPool:
    """Simulates the JS BlobPoolBuilder for compiling arbitrary binary blocks into a unified pool."""
    def __init__(self):
        self.data = bytearray()

    def write(self, b: bytes) -> int:
        start = len(self.data)
        self.data.extend(b)
        return start

    def write_byte(self, val: int) -> int:
        return self.write(bytes([val]))

    def write_uint32(self, val: int) -> int:
        return self.write(struct.pack('<I', val))

    def to_bytes(self) -> bytes:
        return bytes(self.data)


def compress_deflate_raw(data: bytes) -> bytes:
    """Raw deflate compression at level 9 for maximum ratio.
    Decompression speed is NOT affected by the compression level used."""
    compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
    compressed = compressor.compress(data)
    compressed += compressor.flush()
    return compressed


def get_tag_int(tag: str) -> int:
    """Pack a 4-char string tag into a little-endian uint32 integer."""
    padded = (tag + "    ")[:4]
    b = padded.encode('ascii', errors='replace')
    return struct.unpack('<I', b)[0]


def get_sub_data_fast(data_block: bytes, tag_int: int) -> bytes:
    """Iterate through the Bethesda record body subrecords and extract the matching tag's data."""
    offset = 0
    db_len = len(data_block)
    while offset + 6 <= db_len:
        current_tag = struct.unpack_from('<I', data_block, offset)[0]
        sub_size = struct.unpack_from('<H', data_block, offset + 4)[0]
        if offset + 6 + sub_size > db_len:
            break
        if current_tag == tag_int:
            return data_block[offset + 6 : offset + 6 + sub_size]
        offset += 6 + sub_size
    return None


# extract_remainder_bytes removed.
# BlobOffset in flat rows now points directly into the decompressed
# Reconstruction Block, eliminating all duplicate unmapped subrecord storage.


def decode_record(r: dict, bytes_data: bytes, schema: dict, is_localized: bool,
                  save_str_fn, string_cache_map: dict, blob_pool: BlobPool,
                  blob_rc_offset: int = 0) -> bytes:
    """Extract hot fields into a fixed-width binary row.
    blob_rc_offset: pre-computed byte offset of this record's body within the
    decompressed Reconstruction Block. Stored as BlobOffset so unmapped
    subrecords can be read on-demand without a separate blob pool copy.
    """
    raw_body = bytes_data[r['bodyOffset'] : r['bodyOffset'] + r['bodyLen']]
    data_block = raw_body

    if r['flags'] & 0x00040000:  # Compressed record body
        try:
            data_block = zlib.decompress(raw_body[6:], -zlib.MAX_WBITS)
        except Exception as err:
            print(f"Decompression failed for record {r['type']}: {err}")
            data_block = raw_body

    edid_tag_int = get_tag_int("EDID")
    full_tag_int = get_tag_int("FULL")

    edid_str = ""
    full_str = ""

    edid_data = get_sub_data_fast(data_block, edid_tag_int)
    if edid_data is not None:
        term_idx = edid_data.find(b'\x00')
        edid_bytes = edid_data[:term_idx] if term_idx >= 0 else edid_data
        edid_str = edid_bytes.decode('utf-8', errors='replace')

    full_data = get_sub_data_fast(data_block, full_tag_int)
    if full_data is not None:
        if is_localized and len(full_data) == 4:
            str_id = struct.unpack('<I', full_data)[0]
            full_str = f"[LocalString: {str_id}]"
        else:
            term_idx = full_data.find(b'\x00')
            full_bytes = full_data[:term_idx] if term_idx >= 0 else full_data
            full_str = full_bytes.decode('utf-8', errors='replace')

    if edid_str or full_str:
        string_cache_map[r['fID']] = full_str + "|" + edid_str

    row = bytearray(schema['rowSize'])

    for col in schema['columns']:
        val = 0.0 if col['type'] == "Float" else 0
        if col['srcTag'] == "HeaderFormID":
            val = r['fID']
        elif col['srcTag'] == "HeaderFlags":
            val = r['flags']
        elif col['srcTag'] == "BlobOffset":
            val = blob_rc_offset  # Points into decompressed Reconstruction Block
        elif col['srcOffset'] == "StringIndex":
            if col['srcTag'] == "EDID":
                val = save_str_fn(edid_str)
            elif col['srcTag'] == "FULL":
                val = save_str_fn(full_str)
            else:
                sub_data = get_sub_data_fast(data_block, col['srcTagInt'])
                if sub_data is not None:
                    val_str = ""
                    if is_localized and len(sub_data) == 4 and col['srcTag'] in ("FULL", "DESC", "ITXT"):
                        str_id = struct.unpack('<I', sub_data)[0]
                        val_str = f"[LocalString: {str_id}]"
                    else:
                        term_idx = sub_data.find(b'\x00')
                        val_bytes = sub_data[:term_idx] if term_idx >= 0 else sub_data
                        val_str = val_bytes.decode('utf-8', errors='replace')
                    val = save_str_fn(val_str)
        else:
            sub_data = get_sub_data_fast(data_block, col['srcTagInt'])
            if sub_data is not None:
                try:
                    s_off = int(col['srcOffset'])
                except ValueError:
                    s_off = 0
                if s_off < len(sub_data):
                    if col['type'] == "Float":
                        if s_off + 4 <= len(sub_data):
                            val = struct.unpack_from('<f', sub_data, s_off)[0]
                    else:
                        if s_off + 4 <= len(sub_data):
                            val = struct.unpack_from('<I', sub_data, s_off)[0]
                        elif s_off + 2 <= len(sub_data):
                            val = struct.unpack_from('<H', sub_data, s_off)[0]
                        elif s_off + 1 <= len(sub_data):
                            val = sub_data[s_off]

        if col['offset'] + 4 <= schema['rowSize']:
            if col['type'] == "Float":
                struct.pack_into('<f', row, col['offset'], float(val))
            else:
                struct.pack_into('<I', row, col['offset'], int(val))

    return bytes(row)


def build_string_table(string_cache_map: dict) -> bytes:
    """JS buildStringTable equivalent: serializes string labels into custom indexes and a heap pool."""
    string_table_builder = bytearray()
    string_table_builder.extend(struct.pack('<I', len(string_cache_map)))
    
    str_data_builder = bytearray()
    
    for fID, val in string_cache_map.items():
        encoded_val = val.encode('utf-8', errors='replace')
        s_off = len(str_data_builder)
        str_data_builder.extend(encoded_val)
        
        # 10 bytes: Form ID (uint32), Offset (uint32), Length (uint16)
        item = struct.pack('<IIH', fID, s_off, len(encoded_val))
        string_table_builder.extend(item)
        
    return bytes(string_table_builder + str_data_builder)


def build_reconstruction(loaded_records: list, bytes_data: bytes):
    """Build the Reconstruction Block and return (block_bytes, fid_to_body_offset).

    fid_to_body_offset maps each record's FormID to the byte position of its
    body data within the *decompressed* reconstruction block. This offset is
    stored as BlobOffset in each flat row, replacing the old separate blob pool
    for unmapped subrecords and eliminating all duplicate storage.
    """
    chrono_builder = bytearray()
    chrono_builder.extend(struct.pack('<I', len(loaded_records)))
    fid_to_body_offset = {}

    for r in loaded_records:
        sig_padded = (r['type'] + "    ")[:4].encode('ascii', errors='replace')
        chrono_builder.extend(sig_padded)           # 4 B  signature
        chrono_builder.extend(r['headerBytes'])     # 24 B header
        chrono_builder.extend(struct.pack('<I', r['bodyLen']))  # 4 B body length
        body_start = len(chrono_builder)
        if r['bodyLen'] > 0:
            chrono_builder.extend(bytes_data[r['bodyOffset'] : r['bodyOffset'] + r['bodyLen']])
        # Track where this record's body bytes land in the RC block
        if r['fID'] != 0 and r['type'] != 'GRUP':
            fid_to_body_offset[r['fID']] = body_start

    return bytes(chrono_builder), fid_to_body_offset


def main():
    parser = argparse.ArgumentParser(
        description="Vault-Tec Bethesda Master Compiler - ESM to BESM Converter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python compiler.py Skyrim.esm Skyrim.besm --game skyrim
  python compiler.py Fallout4.esm Fallout4.besm --game fallout4
  python compiler.py MyMod.esp MyMod.besp --schema custom.bschema
        """
    )
    parser.add_argument("input_file", help="Path to the input Bethesda master (.esm, .esp, .esl)")
    parser.add_argument("output_file", nargs="?", help="Path to the output BESM file (.besm, .besp, .besl)")
    parser.add_argument("--game", choices=["skyrim", "fallout4"], help="Target game preset layout")
    parser.add_argument("--schema", help="Path to a custom .bschema file overriding the preset")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"Error: Input file '{args.input_file}' not found.")
        sys.exit(1)
        
    print(f"[*] Reading '{args.input_file}'...")
    with open(args.input_file, "rb") as f:
        bytes_data = f.read()
        
    original_md5 = hashlib.md5(bytes_data).hexdigest().upper()
    print(f"[+] Load complete. Size: {len(bytes_data)} bytes. MD5: {original_md5}")
    
    if len(bytes_data) < 24:
        print("Error: Input file is too short to be a valid Bethesda master file.")
        sys.exit(1)
        
    # Check TES4 validation
    header_sig = bytes_data[0:4].decode('ascii', errors='replace')
    if header_sig != "TES4":
        print("Error: Invalid file header signature. Must start with TES4.")
        sys.exit(1)
        
    # Extract header flags to determine ifLocalized string table lookup is used
    header_flags = struct.unpack_from('<I', bytes_data, 8)[0]
    is_localized = (header_flags & 0x00000080) != 0
    print(f"[+] Header flag localized: {is_localized}")
    
    # 1. Parse chronological records flatlist
    print("[*] Chronologically analyzing records & groups...")
    offset = 0
    loaded_records = []
    discovered_sigs = set()
    
    while offset < len(bytes_data):
        if offset + 24 > len(bytes_data):
            break
            
        sig_bytes = bytes_data[offset : offset + 4]
        try:
            sig = sig_bytes.decode('ascii', errors='replace')
        except Exception:
            sig = sig_bytes.hex()
            
        if sig == "GRUP":
            h_bytes = bytes_data[offset : offset + 24]
            loaded_records.append({
                'type': 'GRUP',
                'flags': 0,
                'fID': 0,
                'bodyLen': 0,
                'headerBytes': h_bytes,
                'bodyOffset': offset + 24
            })
            offset += 24
            continue
            
        body_len = struct.unpack_from('<I', bytes_data, offset + 4)[0]
        total_size = 24 + body_len
        if offset + total_size > len(bytes_data):
            break
            
        flags = struct.unpack_from('<I', bytes_data, offset + 8)[0]
        fID = struct.unpack_from('<I', bytes_data, offset + 12)[0]
        h_bytes = bytes_data[offset : offset + 24]
        
        loaded_records.append({
            'type': sig,
            'flags': flags,
            'fID': fID,
            'bodyLen': body_len,
            'headerBytes': h_bytes,
            'bodyOffset': offset + 24
        })
        discovered_sigs.add(sig)
        offset += total_size
        
    print(f"[+] Discovered {len(loaded_records)} records/groups ({len(discovered_sigs)} unique record types).")
    
    # 2. Select / Load active schema using BinarySchemaParser
    parser = BinarySchemaParser()
    schema_file = args.schema
    active_schema_str = ""
    
    if not schema_file:
        game = args.game
        if not game:
            fname_lower = os.path.basename(args.input_file).lower()
            if "skyrim" in fname_lower or "ccbg" in fname_lower:
                game = "skyrim"
            else:
                game = "fallout4"
        print(f"[+] Using default game preset: {game.upper()}")
        
        # Try loading from the local bschemas directory
        scripts_dir = os.path.dirname(os.path.abspath(__file__))
        schema_file = os.path.join(scripts_dir, "..", "bschemas", f"{game}.bschema")
        if not os.path.exists(schema_file):
            schema_file = os.path.join("bschemas", f"{game}.bschema")
            
    if os.path.exists(schema_file):
        print(f"[*] Loading and parsing schema from file: '{schema_file}'...")
        try:
            parsed_data = parser.parse_file(schema_file)
            schemas = parsed_data["sectors"]
            with open(schema_file, "r", encoding="utf-8") as sf:
                active_schema_str = sf.read()
        except Exception as e:
            print(f"Error parsing schema file: {e}")
            sys.exit(1)
    else:
        print(f"Error: Schema file not found: '{schema_file}'")
        print("  Place a .bschema file in the bschemas/ directory or pass --schema <path>.")
        sys.exit(1)
            
    # Populate missing discovered signatures using the EmptyRecord base template dynamically
    for sig in sorted(list(discovered_sigs)):
        if sig == "GRUP":
            continue
        if sig not in schemas:
            empty_cols = parser.bases.get("EMPTYRECORD", [])
            if not empty_cols:
                empty_cols = [
                    {"name": "FormID", "type": "UInt32", "offset": 0, "srcTag": "HeaderFormID", "srcOffset": "0"},
                    {"name": "Flags", "type": "UInt32", "offset": 4, "srcTag": "HeaderFlags", "srcOffset": "0"},
                    {"name": "BlobOffset", "type": "UInt32", "offset": 8, "srcTag": "BlobOffset", "srcOffset": "0"}
                ]
            schemas[sig] = {
                "recordType": sig,
                "rowSize": 12,
                "alignment": 4,
                "columns": [dict(c) for c in empty_cols]
            }
            
    # Map tag strings to fast-lookup little-endian integers
    for rec_type, schema in schemas.items():
        for col in schema['columns']:
            tag = col['srcTag']
            tag_int = 0
            if tag and tag not in ("HeaderFormID", "HeaderFlags", "BlobOffset", "StringIndex"):
                tag_int = get_tag_int(tag)
            col['srcTagInt'] = tag_int
            
    # 3. Build Reconstruction Block first so we know each record's body offset
    print("[*] Building Reconstruction chronology map...")
    raw_rc, fid_to_body_offset = build_reconstruction(loaded_records, bytes_data)

    # 4. Process individual records into database sector rows
    print("[*] Decoding individual records and filling string pool...")
    text_string_cache = {}
    blob_pool = BlobPool()  # now only stores deduplicated strings
    string_cache_map = {}
    sector_rows = {}  # Maintains insertion order

    def save_str_fn(s: str) -> int:
        if not s:
            return 0
        if s in text_string_cache:
            return text_string_cache[s]
        encoded = s.encode('utf-8', errors='replace')
        zero_term = encoded + b'\x00'
        s_off = blob_pool.write(zero_term)
        text_string_cache[s] = s_off
        return s_off

    for r in loaded_records:
        rec_type = r['type']
        if rec_type == "GRUP":
            continue
        schema = schemas.get(rec_type)
        if schema:
            blob_rc_offset = fid_to_body_offset.get(r['fID'], 0)
            row_bytes = decode_record(r, bytes_data, schema, is_localized,
                                      save_str_fn, string_cache_map, blob_pool, blob_rc_offset)
            if rec_type not in sector_rows:
                sector_rows[rec_type] = []
            sector_rows[rec_type].append(row_bytes)
            
    # 5. Construct the output binary structure
    print("[*] Assembling compiled binary blocks...")
    out_builder = BlobPool()

    # Header signatures
    out_builder.write(b"BESM")
    out_builder.write_uint32(1)  # format version
    out_builder.write_uint32(len(sector_rows))  # sector count

    # Placeholder space for main offset pointers (4 sections * 24 bytes = 96 bytes)
    out_builder.write(bytes(96))

    head_start = 12 + 96

    # Placeholder space for subsector headers (40 bytes per subsector)
    out_builder.write(bytes(40 * len(sector_rows)))

    # Compress and append subsector row blocks
    infos = []
    for rec_type, rows in sector_rows.items():
        schema = schemas[rec_type]
        raw_sector_bytes = b"".join(rows)
        comp = compress_deflate_raw(raw_sector_bytes)
        offset_in_file = len(out_builder.data)
        out_builder.write(comp)
        infos.append({
            'recType': rec_type,
            'rowSize': schema['rowSize'],
            'rowCount': len(rows),
            'offset': offset_in_file,
            'compSize': len(comp),
            'uncompSize': len(raw_sector_bytes)
        })

    # Compress & append String Pool (strings only — no unmapped subrecord data)
    raw_b = blob_pool.to_bytes()
    comp_b = compress_deflate_raw(raw_b)
    b_off = len(out_builder.data)
    out_builder.write(comp_b)

    # Compress & append String Table
    raw_bs = build_string_table(string_cache_map)
    comp_bs = compress_deflate_raw(raw_bs)
    bs_off = len(out_builder.data)
    out_builder.write(comp_bs)

    # Compress & append Schema strings
    raw_sc = active_schema_str.encode('utf-8', errors='replace')
    comp_sc = compress_deflate_raw(raw_sc)
    sc_off = len(out_builder.data)
    out_builder.write(comp_sc)

    # Compress & append Reconstruction Block (already built above)
    comp_rc = compress_deflate_raw(raw_rc)
    rc_off = len(out_builder.data)
    out_builder.write(comp_rc)
    
    # Pack headers in the out_builder buffer dynamically
    final_bytes = out_builder.data
    
    # Main sections: offset (uint64), compressed size (uint64), uncompressed size (uint64)
    # Blob Pool at 12
    struct.pack_into('<QQQ', final_bytes, 12, b_off, len(comp_b), len(raw_b))
    # String Table at 36
    struct.pack_into('<QQQ', final_bytes, 36, bs_off, len(comp_bs), len(raw_bs))
    # Schema strings at 60
    struct.pack_into('<QQQ', final_bytes, 60, sc_off, len(comp_sc), len(raw_sc))
    # Reconstruction block at 84
    struct.pack_into('<QQQ', final_bytes, 84, rc_off, len(comp_rc), len(raw_rc))
    
    # Subsector descriptors
    s_pos = head_start
    for info in infos:
        padded_type = (info['recType'] + "    ")[:4].encode('ascii')
        # Subsector header struct (40 bytes): 
        # signature (4s), rowSize (I), rowCount (I), offset (Q), compSize (Q), uncompSize (Q), padding (I, 0)
        struct.pack_into(
            '<4sIIQQQI', 
            final_bytes, 
            s_pos, 
            padded_type, 
            info['rowSize'], 
            info['rowCount'], 
            info['offset'], 
            info['compSize'], 
            info['uncompSize'], 
            0
        )
        s_pos += 40
        
    # Write the compiled file to disk
    output_path = args.output_file
    if not output_path:
        base_name, ext = os.path.splitext(args.input_file)
        ext_lower = ext.lower()
        target_ext = ".besm"
        if ext_lower == ".esp":
            target_ext = ".besp"
        elif ext_lower == ".esl":
            target_ext = ".besl"
        output_path = base_name + target_ext
        
    print(f"[*] Saving compiled output to '{output_path}'...")
    with open(output_path, "wb") as out_f:
        out_f.write(final_bytes)
        
    print(f"[+] Compilation complete! Saved {len(final_bytes)} bytes.")
    print("[✔] Finished compiling.")


if __name__ == "__main__":
    main()
