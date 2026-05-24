// Vault-Tec Master File Database & Compiler - Architecture Animation Loop
export class HowViewAnim {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.particles = [];
        
        this.state = {
            recordCount: 0,
            maxRecords: 100000,
            strings: 0,
            blobs: 0,
            size: 0,
            loopProgress: 0,
            isVerifying: false,
            showVerifyCheck: false
        };

        this.colors = {
            bg: "#0b0b0b",
            esm: "#ff5555",
            gear: "#00f0ff",
            string: "#bd93f9",
            blob: "#8be9fd",
            table: "#50fa7b",
            header: "#ff79c6"
        };
    }

    init() {
        this.canvas = document.getElementById('howCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        // Handle resizing
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Start animation loop
        this.loop();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    spawnParticle(type) {
        if (!this.canvas) return;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        let color = this.colors.table;
        let targetY = 70; // Tables block Y offset
        if (type === "string") {
            color = this.colors.string;
            targetY = 100;
        } else if (type === "blob") {
            color = this.colors.blob;
            targetY = 130;
        }
        
        this.particles.push({
            x: 60,
            y: height / 2,
            targetX: width / 2,
            targetY: height / 2,
            stage: 1, // 1 = to gear, 2 = to final destination
            color: color,
            type: type,
            finalTargetX: width - 110,
            finalTargetY: targetY,
            speed: 3 + Math.random() * 3,
            size: 2 + Math.random() * 2
        });
    }

    update() {
        if (!this.canvas) return;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        const isTabActive = document.getElementById('how-it-works-view')?.classList.contains('active');
        if (!isTabActive) {
            // Pause logic to save CPU
            return;
        }

        // Loop telemetry counters (takes ~8 seconds for full cycle)
        if (this.state.isVerifying) {
            this.state.loopProgress += 0.02;
            if (this.state.loopProgress >= 1) {
                this.state.isVerifying = false;
                this.state.showVerifyCheck = true;
                this.state.loopProgress = 0;
            }
        } else if (this.state.showVerifyCheck) {
            this.state.loopProgress += 0.01;
            if (this.state.loopProgress >= 1) {
                this.state.showVerifyCheck = false;
                this.state.recordCount = 0;
                this.state.strings = 0;
                this.state.blobs = 0;
                this.state.size = 0;
                this.state.loopProgress = 0;
            }
        } else {
            this.state.recordCount += 920;
            if (this.state.recordCount >= this.state.maxRecords) {
                this.state.recordCount = this.state.maxRecords;
                this.state.isVerifying = true;
                this.state.loopProgress = 0;
            }
            
            this.state.strings = Math.floor(this.state.recordCount * 0.74);
            this.state.blobs = Math.floor(this.state.recordCount * 0.12);
            this.state.size = (this.state.recordCount * 0.00038).toFixed(1);
            
            // Randomly spawn particles during processing
            if (Math.random() < 0.4) this.spawnParticle("table");
            if (Math.random() < 0.3) this.spawnParticle("string");
            if (Math.random() < 0.1) this.spawnParticle("blob");
        }

        // Update DOM Telemetry Elements
        const elStatus = document.getElementById('anim-status');
        const elRecords = document.getElementById('anim-records');
        const elStrings = document.getElementById('anim-strings');
        const elBlobs = document.getElementById('anim-blobs');
        const elSize = document.getElementById('anim-size');
        
        if (elStatus) {
            if (this.state.showVerifyCheck) {
                elStatus.innerHTML = "<span style='color:#50fa7b;'>✔ 1:1 MD5 MATCH VERIFIED</span>";
            } else if (this.state.isVerifying) {
                elStatus.innerHTML = "<span style='color:#8be9fd;'>VERIFYING INTEGRITY...</span>";
            } else {
                elStatus.innerHTML = "<span style='color:#ffb86c;'>COMPILING SECTORS</span>";
            }
        }
        if (elRecords) elRecords.textContent = `${this.state.recordCount.toLocaleString()} / 100,000`;
        if (elStrings) elStrings.textContent = this.state.strings.toLocaleString();
        if (elBlobs) elBlobs.textContent = this.state.blobs.toLocaleString();
        if (elSize) elSize.textContent = `${this.state.size} MB`;

        // Update particle positions
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            if (p.stage === 1) {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < p.speed) {
                    p.stage = 2;
                    p.x = p.targetX;
                    p.y = p.targetY;
                    p.targetX = p.finalTargetX;
                    p.targetY = p.finalTargetY;
                } else {
                    p.x += (dx / dist) * p.speed;
                    p.y += (dy / dist) * p.speed;
                }
            } else {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < p.speed) {
                    this.particles.splice(i, 1);
                } else {
                    p.x += (dx / dist) * p.speed;
                    p.y += (dy / dist) * p.speed;
                }
            }
        }
    }

    draw() {
        if (!this.canvas) return;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        this.ctx.clearRect(0, 0, width, height);
        
        // Draw grid backdrop
        this.ctx.strokeStyle = "rgba(255,255,255,0.02)";
        this.ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 15) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        for (let y = 0; y < height; y += 15) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Draw ESM Source Box (Left)
        this.ctx.fillStyle = "#1e1e1e";
        this.ctx.strokeStyle = this.state.showVerifyCheck ? this.colors.table : this.colors.esm;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(20, height / 2 - 30, 80, 60, 4);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.font = "bold 10px Consolas, monospace";
        this.ctx.fillStyle = "#fff";
        this.ctx.textAlign = "center";
        this.ctx.fillText("BETHESDA", 60, height / 2 - 10);
        this.ctx.fillText("ESM File", 60, height / 2 + 5);
        this.ctx.font = "8px Consolas, monospace";
        this.ctx.fillStyle = "#888";
        this.ctx.fillText("Raw Tree", 60, height / 2 + 18);

        // Draw Walk Tree Node / Pipeline (Center)
        const centerX = width / 2;
        const centerY = height / 2;
        this.ctx.strokeStyle = this.colors.gear;
        this.ctx.fillStyle = "#1e1e1e";
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 32, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw gear teeth/lines
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        const rotationAngle = (this.state.isVerifying || this.state.showVerifyCheck) ? 0 : (Date.now() / 300) % (Math.PI * 2);
        this.ctx.rotate(rotationAngle);
        this.ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
        for (let i = 0; i < 8; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, -32);
            this.ctx.lineTo(0, -38);
            this.ctx.stroke();
            this.ctx.rotate(Math.PI / 4);
        }
        this.ctx.restore();

        this.ctx.font = "bold 9px Consolas, monospace";
        this.ctx.fillStyle = this.colors.gear;
        this.ctx.fillText("WALK TREE", centerX, centerY - 6);
        this.ctx.fillStyle = "#ccc";
        this.ctx.font = "8px Consolas, monospace";
        this.ctx.fillText("100K Rows", centerX, centerY + 6);
        this.ctx.fillStyle = "#888";
        this.ctx.fillText("Multi-Core", centerX, centerY + 16);

        // Draw BESM Target Storage blocks (Right)
        const rightX = width - 150;
        
        // Block 1: Subsectors Tables
        this.ctx.fillStyle = "#1e1e1e";
        this.ctx.strokeStyle = this.colors.table;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.roundRect(rightX, 55, 110, 24, 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = "#fff";
        this.ctx.textAlign = "left";
        this.ctx.font = "9px Consolas, monospace";
        this.ctx.fillText("Flat Tables", rightX + 8, 70);
        
        // Block 2: String Table
        this.ctx.fillStyle = "#1e1e1e";
        this.ctx.strokeStyle = this.colors.string;
        this.ctx.beginPath();
        this.ctx.roundRect(rightX, 85, 110, 24, 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText("String Table", rightX + 8, 100);

        // Block 3: Blob Pool
        this.ctx.fillStyle = "#1e1e1e";
        this.ctx.strokeStyle = this.colors.blob;
        this.ctx.beginPath();
        this.ctx.roundRect(rightX, 115, 110, 24, 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText("Blob Heap Pool", rightX + 8, 130);

        // Draw connections / flow lines
        this.ctx.strokeStyle = "rgba(255,255,255,0.06)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(100, centerY);
        this.ctx.lineTo(centerX - 32, centerY);
        
        this.ctx.moveTo(centerX + 32, centerY);
        this.ctx.lineTo(rightX, 67);
        this.ctx.moveTo(centerX + 32, centerY);
        this.ctx.lineTo(rightX, 97);
        this.ctx.moveTo(centerX + 32, centerY);
        this.ctx.lineTo(rightX, 127);
        this.ctx.stroke();

        // Draw particles
        for (const p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // Reset shadow
        }
    }

    loop() {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}
