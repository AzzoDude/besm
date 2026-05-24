// Vault-Tec Master File Database & Compiler - Observable Store (State Management)

export class Store {
    constructor() {
        this.state = {
            loadedFileMode: "", // "raw" | "besm" | "csv"
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

            numCols: new Set(['weight', 'value', 'damage', 'armorrating', 'x', 'y', 'z', 'rotx', 'roty', 'rotz', 'size']),
            monoCols: new Set(['formid', 'baseformid', 'cellformid', 'worldspaceformid', 'flags', 'enchantment', 'baseid', 'cellid']),

            // 2D Spatial View State
            activeViewMode: "default", // "default" | "spatial"
            spatialRecords: [],
            selectedSpatialRecord: null,
            activeCellFilter: null, // {cx, cy}

            // Canvas viewport
            scale: 0.005,
            offsetX: 0,
            offsetY: 0,
            isPanning: false,
            startPanX: 0,
            startPanY: 0,
            hoverSpatialRecord: null,

            filteredChronoRows: [],
            filteredStrings: []
        };
        this.subscribers = new Set();
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
}
