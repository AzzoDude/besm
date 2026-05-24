// Vault-Tec Master File Database & Compiler - Application Entrypoint / Bootstrapper

import { Store } from './state.js';
import { UIController } from './ui.js';
import { SpatialView } from './spatial_view.js';

function initApp() {
    const store = new Store();
    const uiController = new UIController(store);
    const spatialView = new SpatialView(store, uiController);

    uiController.setSpatialView(spatialView);

    // Initialize modules
    uiController.init();
    spatialView.init();

    // Bind window-level event handlers to maintain backward-compatibility with inline HTML events
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
        document.querySelectorAll('.mem-block').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.mem-detail').forEach(el => el.style.display = 'none');
        
        const btn = document.getElementById('mem-btn-' + blockId);
        if (btn) btn.classList.add('active');
        
        const detail = document.getElementById('mem-detail-' + blockId);
        if (detail) detail.style.display = 'block';
    };
}

// Support execution regardless of whether DOMContentLoaded has already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
