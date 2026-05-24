// Vault-Tec Master File Database & Compiler - Canvas Mouse Interaction Handler

export class InteractionHandler {
    constructor(store, spatialView) {
        this.store = store;
        this.spatialView = spatialView;
        this.canvas = null;
    }

    setup(canvas) {
        this.canvas = canvas;
        if (!canvas) return;

        canvas.addEventListener('mousedown', (e) => {
            const { spatialRecords, offsetX, offsetY } = this.store.getState();
            if (spatialRecords.length === 0) return;
            
            this.store.update({
                isPanning: true,
                startPanX: e.clientX - offsetX,
                startPanY: e.clientY - offsetY
            });
            canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());

        canvas.addEventListener('wheel', (e) => this.onWheel(e));

        canvas.addEventListener('click', (e) => this.onClick(e));
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
                this.canvas.style.cursor = 'grab';
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

        newScale = Math.max(0.00005, Math.min(1.0, newScale));

        const newOffsetX = mouseX - worldPt.x * newScale;
        const newOffsetY = mouseY - (-worldPt.y) * newScale;

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
}
