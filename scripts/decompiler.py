#!/usr/bin/env python3
"""
Vault-Tec Master File Database & Compiler - Python BESM to ESM Decompiler
Restores standard Bethesda Master Files (.esm, .esp, .esl) from the high-performance
Binary Elder Scrolls Master format (.besm, .besp, .besl) with 1:1 binary accuracy.
Also supports extracting the self-describing embedded database schema (.bschema) directly from binary.
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


def decompress_deflate_raw(data: bytes) -> bytes:
    """JS decompressDeflateRaw equivalent using Python zlib raw inflate (-15 wbits)."""
    decompressor = zlib.decompressobj(-15)
    decompressed = decompressor.decompress(data)
    decompressed += decompressor.flush()
    return decompressed


def parse_reconstruction(b_rc: bytes) -> list:
    """JS parseReconstruction equivalent: parses the records chronology map from uncompressed bytes."""
    loaded_records = []
    if len(b_rc) < 4:
        return loaded_records
    count = struct.unpack_from('<I', b_rc, 0)[0]
    off = 4
    for i in range(count):
        if off + 32 > len(b_rc):
            break
        sig = b_rc[off:off+4].decode('ascii', errors='replace')
        head = b_rc[off+4:off+28]
        body_len = struct.unpack_from('<I', b_rc, off + 28)[0]
        flags = struct.unpack_from('<I', b_rc, off + 12)[0]
        fID = struct.unpack_from('<I', b_rc, off + 16)[0]
        
        if off + 32 + body_len > len(b_rc):
            break
            
        loaded_records.append({
            'type': sig,
            'flags': flags,
            'fID': fID,
            'bodyLen': body_len,
            'headerBytes': head,
            'bodyOffset': off + 32
        })
        off += 32 + body_len
    return loaded_records


def main():
    parser = argparse.ArgumentParser(
        description="Vault-Tec Bethesda Master Decompiler - BESM to ESM Converter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python decompiler.py Skyrim.besm Skyrim.esm
  python decompiler.py Fallout4.besp Fallout4.esp --extract-schema extracted.bschema
        """
    )
    parser.add_argument("input_file", help="Path to the input BESM file (.besm, .besp, .besl)")
    parser.add_argument("output_file", nargs="?", help="Path to the output Bethesda master (.esm, .esp, .esl)")
    parser.add_argument("--extract-schema", help="Path to extract the self-contained database .bschema specification to")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"Error: Input file '{args.input_file}' not found.")
        sys.exit(1)
        
    print(f"[*] Reading '{args.input_file}'...")
    with open(args.input_file, "rb") as f:
        besm_bytes = f.read()
        
    print(f"[+] Loaded {len(besm_bytes)} bytes.")
    
    if len(besm_bytes) < 108:
        print("Error: Corrupt file - Header is too short.")
        sys.exit(1)
        
    # Check signature
    sig = besm_bytes[0:4].decode('ascii', errors='replace')
    if sig not in ('BESM', 'BES\0', 'BES '):
        print(f"Error: Corrupt file signature '{sig}'. Must be BESM.")
        sys.exit(1)
        
    ver = struct.unpack_from('<I', besm_bytes, 4)[0]
    sec_count = struct.unpack_from('<I', besm_bytes, 8)[0]
    print(f"[+] Format version: {ver}, Sectors: {sec_count}")
    
    # Read main section offsets
    b_off, b_cs, b_us = struct.unpack_from('<QQQ', besm_bytes, 12)
    bs_off, bs_cs, bs_us = struct.unpack_from('<QQQ', besm_bytes, 36)
    sc_off, sc_cs, sc_us = struct.unpack_from('<QQQ', besm_bytes, 60)
    rc_off, rc_cs, rc_us = struct.unpack_from('<QQQ', besm_bytes, 84)
    
    # Extract & Decompress schema text if present or requested
    schema_text = ""
    if sc_cs > 0:
        print("[*] Extracting embedded schema block...")
        try:
            sc_comp = besm_bytes[sc_off : sc_off + sc_cs]
            sc_decomp = decompress_deflate_raw(sc_comp)
            schema_text = sc_decomp.decode('utf-8', errors='replace')
            print(f"[+] Embedded schema extracted successfully ({sc_us} uncompressed bytes).")
        except Exception as e:
            print(f"[-] Warning: Failed to extract embedded schema: {e}")
            
    if args.extract_schema:
        if not schema_text:
            print("Error: No embedded schema was found in the input BESM file.")
            sys.exit(1)
        print(f"[*] Saving extracted schema layout to '{args.extract_schema}'...")
        with open(args.extract_schema, "w", encoding="utf-8") as sf:
            sf.write(schema_text)
        print("[✔] Schema extraction complete.")
        
        # If no output file was specified, exit early (skip full reassembly)
        if not args.output_file:
            sys.exit(0)
            
    # Decompress reconstruction chronology block
    print("[*] Decompressing Reconstruction chronology map...")
    try:
        rc_comp = besm_bytes[rc_off : rc_off + rc_cs]
        rc_decomp = decompress_deflate_raw(rc_comp)
    except Exception as e:
        print(f"Error: Decompressing Reconstruction block failed: {e}")
        sys.exit(1)
        
    # Parse reconstruction record data
    print("[*] Parsing chronology map and record metadata...")
    loaded_records = parse_reconstruction(rc_decomp)
    print(f"[+] Parsed {len(loaded_records)} records from chronology map.")
    
    # Stitched ESM bytes
    print("[*] Reassembling Bethesda master file...")
    esm_builder = bytearray()
    for r in loaded_records:
        esm_builder.extend(r['headerBytes'])
        if r['bodyLen'] > 0:
            esm_builder.extend(rc_decomp[r['bodyOffset'] : r['bodyOffset'] + r['bodyLen']])
            
    final_esm = bytes(esm_builder)
    
    # Write the compiled file to disk
    output_path = args.output_file
    if not output_path:
        base_name, ext = os.path.splitext(args.input_file)
        ext_lower = ext.lower()
        target_ext = ".esm"
        if ext_lower == ".besp":
            target_ext = ".esp"
        elif ext_lower == ".besl":
            target_ext = ".esl"
        output_path = base_name + target_ext
        
    print(f"[*] Saving reconstructed output to '{output_path}'...")
    with open(output_path, "wb") as out_f:
        out_f.write(final_esm)
        
    rebuilt_md5 = hashlib.md5(final_esm).hexdigest().upper()
    print(f"[+] Reconstruction complete! Saved {len(final_esm)} bytes.")
    print(f"[✔] Rebuilt MD5 Checksum: {rebuilt_md5}")
    print("[✔] Finished decompiling.")


if __name__ == "__main__":
    main()
