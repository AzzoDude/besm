// Record Type Names and Preset Schemas mapping definitions

export const recordTypeNames = {
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

const baseFallout4SchemaStr = `[REFR]
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

const baseSkyrimSchemaStr = `[REFR]
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

const allSigs = Object.keys(recordTypeNames);

function buildFullSchema(baseStr) {
    let output = baseStr;
    const definedSigs = new Set();
    const regex = /\[([A-Z_0-9]{4})\]/gi;
    let match;
    while ((match = regex.exec(baseStr)) !== null) {
        definedSigs.add(match[1].toUpperCase());
    }
    
    for (const sig of allSigs) {
        if (!definedSigs.has(sig)) {
            output += `\n\n[${sig}]\n  FormID:UInt32:HeaderFormID:0\n  Flags:UInt32:HeaderFlags:0\n  BlobOffset:UInt32:BlobOffset:0`;
        }
    }
    return output;
}

export const fallout4SchemaStr = buildFullSchema(baseFallout4SchemaStr);
export const skyrimSchemaStr = buildFullSchema(baseSkyrimSchemaStr);

