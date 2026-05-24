#!/usr/bin/env python3
"""
Vault-Tec Master File Database & Compiler - Custom Binary Schema Parser (.bschema)
Parses highly optimized, cache-aligned binary specifications describing
file headers, record structures, alignment rules, and fast offset maps.
Supports comma-separated sector definitions, base templates, and dot-notation paths.
"""

import os
import re
import sys
import json


class BinarySchemaParser:
    """Parses .bschema definition files containing custom record shapes, headers, and alignments."""
    
    def __init__(self):
        self.headers = {}
        self.bases = {}
        self.record_types = {}

    def parse_file(self, file_path: str):
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Schema file not found: {file_path}")
            
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        return self.parse_string(content)

    def parse_string(self, content: str):
        self.headers = {}
        self.bases = {}
        self.record_types = {}
        
        # Remove single-line comments
        lines = []
        for line in content.splitlines():
            line_clean = re.sub(r'//.*$', '', line).strip()
            if line_clean:
                lines.append(line_clean)
                
        # Reconstruction block scanner
        current_block_type = None  # "base", "header", "sector", "struct"
        current_block_names = []
        current_columns = []
        block_meta = {}
        
        for line in lines:
            # Match: base BaseRecord {
            # Match: header HEADER {
            # Match: sector WEAP : align(32) extends BaseRecord {
            # Match: sector AACT, ACHR, ACTI extends EmptyRecord
            block_match = re.match(
                r'^(base|struct|header|sector)\s+([a-zA-Z0-9_]+(?:\s*,\s*[a-zA-Z0-9_]+)*)(?:\s*:\s*align\((\d+)\))?(?:\s+extends\s+([a-zA-Z_0-9]+))?\s*\{?$',
                line,
                re.IGNORECASE
            )
            if block_match:
                # Save previous block
                self._save_current_block(current_block_type, current_block_names, block_meta, current_columns)
                
                # Start new block
                current_block_type = block_match.group(1).lower()
                raw_names = block_match.group(2)
                current_block_names = [n.strip().upper() for n in raw_names.split(',') if n.strip()]
                
                alignment = int(block_match.group(3)) if block_match.group(3) else None
                extends_class = block_match.group(4)
                
                block_meta = {
                    "alignment": alignment,
                    "extends": extends_class
                }
                current_columns = []
                continue
                
            # Check for closed block bracket
            if line == '}':
                self._save_current_block(current_block_type, current_block_names, block_meta, current_columns)
                current_block_type = None
                current_block_names = []
                current_columns = []
                continue
                
            # Parse field declarations inside active block
            if current_block_names:
                # Format: FieldName : Type @ Mapping
                # e.g., FormID : UInt32 @ HEADER.12
                # e.g., Value  : UInt32 @ DATA.0
                field_match = re.match(r'^([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\s*@\s*([a-zA-Z0-9_\.\(\)]+)$', line)
                if field_match:
                    name = field_match.group(1).strip()
                    datatype = field_match.group(2).strip()
                    mapping = field_match.group(3).strip()
                    
                    current_columns.append({
                        "name": name,
                        "type": datatype,
                        "mapping": mapping
                    })
                else:
                    # Match digit-only assignments (legacy/header fields)
                    field_match_legacy = re.match(r'^([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\s*@\s*(\d+)$', line)
                    if field_match_legacy:
                        name = field_match_legacy.group(1).strip()
                        datatype = field_match_legacy.group(2).strip()
                        offset = int(field_match_legacy.group(3))
                        current_columns.append({
                            "name": name,
                            "type": datatype,
                            "offset": offset
                        })
                        
        # Save last block in case brackets were omitted
        self._save_current_block(current_block_type, current_block_names, block_meta, current_columns)
        
        return {
            "header": self.headers,
            "sectors": self.record_types
        }

    def _save_current_block(self, block_type, block_names, meta, columns):
        if not block_names:
            return
            
        # Resolve inheritance for ALL types (base and sectors)
        extends_class = meta.get("extends")
        all_columns = []
        if extends_class:
            extends_class_upper = extends_class.upper()
            if extends_class_upper in self.bases:
                all_columns.extend(self.bases[extends_class_upper])
        all_columns.extend(columns)
        
        if block_type == "base":
            for block_name in block_names:
                self.bases[block_name] = all_columns
            return
            
        if block_type == "header":
            for block_name in block_names:
                self.headers = {
                    "name": block_name,
                    "fields": all_columns
                }
            return
            
        # Handle sectors
        for block_name in block_names:
            # Calculate alignment and offsets
            row_size = 0
            compiled_columns = []
            
            for col in all_columns:
                type_lower = col["type"].lower()
                size = 4
                if "int16" in type_lower or "short" in type_lower:
                    size = 2
                elif "int8" in type_lower or "byte" in type_lower or "char" in type_lower:
                    size = 1
                elif "int64" in type_lower or "long" in type_lower or "double" in type_lower:
                    size = 8
                    
                # Setup mapped tags from dot-notation
                src_tag = ""
                src_offset = ""
                mapping = col.get("mapping", "")
                
                if "HEADER." in mapping or "HEADER:" in mapping:
                    src_tag = "HeaderFormID" if "12" in mapping else "HeaderFlags"
                    src_offset = "0"
                elif "." in mapping:
                    parts = mapping.split(".")
                    src_tag = parts[0].strip()
                    src_offset = parts[1].strip()
                elif "BlobOffset" in mapping:
                    src_tag = "BlobOffset"
                    src_offset = "0"
                else:
                    src_tag = "DATA"
                    src_offset = "0"
                    
                compiled_columns.append({
                    "name": col["name"],
                    "type": col["type"],
                    "offset": row_size,
                    "srcTag": src_tag,
                    "srcOffset": src_offset
                })
                row_size += size
                
            # Align row size if explicit alignment is declared
            align_to = meta.get("alignment")
            if align_to:
                remainder = row_size % align_to
                if remainder != 0:
                    row_size += (align_to - remainder)
                    
            self.record_types[block_name] = {
                "recordType": block_name,
                "rowSize": row_size,
                "alignment": align_to or 4,
                "columns": compiled_columns
            }


def main():
    if len(sys.argv) < 2:
        print("Usage: python bschema.py <path_to_schema.bschema>")
        sys.exit(1)
        
    parser = BinarySchemaParser()
    try:
        schema = parser.parse_file(sys.argv[1])
        print(json.dumps(schema, indent=2))
    except Exception as e:
        print(f"Error parsing schema: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
