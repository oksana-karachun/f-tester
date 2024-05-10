class Bar {
    constructor(dateTime, open, high, low, close, tickVolume, timeOffset) {
        this.dateTime = dateTime;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.tickVolume = tickVolume;
        this.timeOffset = timeOffset;
    }
    draw(ctx, x, yScale, yMax, maxWidth, color) {
        const candleWidth = maxWidth * 0.6;
        this.xStart = x;
        this.width = candleWidth;
        const pixelForHigh = (yMax - this.high) * yScale;
        const pixelForLow = (yMax - this.low) * yScale;
        const pixelForOpen = (yMax - this.open) * yScale;
        const pixelForClose = (yMax - this.close) * yScale;
        ctx.fillStyle = color;
        ctx.fillRect(this.xStart, Math.min(pixelForOpen, pixelForClose), candleWidth, Math.abs(pixelForClose - pixelForOpen));
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, pixelForHigh);
        ctx.lineTo(x + candleWidth / 2, Math.min(pixelForOpen, pixelForClose));
        ctx.moveTo(x + candleWidth / 2, pixelForLow);
        ctx.lineTo(x + candleWidth / 2, Math.max(pixelForOpen, pixelForClose));
        ctx.strokeStyle = color;
        ctx.stroke();
    }
    isHovering(overX) {
        return overX >= this.xStart && overX <= this.xStart + this.width;
    }
}
class DataLoader {
    constructor(baseUrl, broker, symbol, timeframe, start, end, useMessagePack = false) {
        this.baseUrl = baseUrl;
        this.broker = broker;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.start = start;
        this.end = end;
        this.useMessagePack = useMessagePack;
    }
    async loadData() {
        const url = `${this.baseUrl}?Broker=${encodeURIComponent(this.broker)}&Symbol=${encodeURIComponent(this.symbol)}&Timeframe=${this.timeframe}&Start=${this.start}&End=${this.end}&UseMessagePack=${this.useMessagePack}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error("Failed to load data:", error);
            throw error;
        }
    }
}
class Chart {
    constructor(canvasId, broker, symbol, timeframe, start, end) {
        this.bars = [];
        this.offsetX = 0;
        this.barWidth = 15;
        this.lastMouseX = null;
        this.lastMouseY = null;
        this.hoveredBar = null;
        this.handleWheel = (event) => {
            event.preventDefault();
            const zoomIntensity = 0.1;
            const scrollIntensity = 30;
            if (event.shiftKey) {
                let newWidth = this.barWidth;
                if (event.deltaY < 0) {
                    newWidth *= 1 + zoomIntensity;
                }
                else {
                    newWidth *= 1 - zoomIntensity;
                }
                this.barWidth = Math.max(2, Math.min(67, newWidth));
            }
            else {
                if (event.deltaX < 0) {
                    this.offsetX = Math.max(0, this.offsetX - scrollIntensity);
                }
                else if (event.deltaX > 0) {
                    this.offsetX = Math.min(this.offsetX + scrollIntensity, this.bars.length * this.barWidth - this.canvas.width);
                }
            }
            window.requestAnimationFrame(() => this.draw());
        };
        this.handleMouseMove = (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            this.lastMouseX = x;
            this.lastMouseY = y;
            window.requestAnimationFrame(() => this.draw(x, y));
        };
        this.handleMouseLeave = () => {
            this.lastMouseX = null;
            this.lastMouseY = null;
            this.draw();
        };
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.dataLoader = new DataLoader('https://beta.forextester.com/data/api/Metadata/bars/chunked', broker, symbol, timeframe, start, end);
        this.visibleBars = Math.floor(this.canvas.width / this.barWidth);
        this.resizeCanvas();
        window.onload = () => this.resizeCanvas();
        window.onresize = () => this.resizeCanvas();
        this.loadAndDraw();
        this.addEventListeners();
    }
    async loadAndDraw() {
        const chunks = await this.dataLoader.loadData();
        const globalStartTime = Math.min(...chunks.map(chunk => chunk.ChunkStart));
        this.bars = chunks.flatMap(chunk => chunk.Bars.map(barData => {
            const absoluteTime = chunk.ChunkStart + barData.Time;
            return new Bar(new Date(absoluteTime * 1000), barData.Open, barData.High, barData.Low, barData.Close, barData.TickVolume, absoluteTime - globalStartTime);
        }));
        this.draw();
    }
    draw(mouseX = this.lastMouseX, mouseY = this.lastMouseY) {
        this.clearCanvas();
        this.drawGrid();
        this.drawBars();
        this.drawPriceScale();
        if (mouseX !== null && mouseY !== null) {
            this.drawCrosshair(mouseX, mouseY);
            this.hoveredBar = this.bars.find(bar => bar.isHovering(mouseX));
            if (this.hoveredBar) {
                this.displayVolume(this.hoveredBar);
            }
        }
        else {
            this.hoveredBar = null;
        }
    }
    displayVolume(bar) {
        const volumeText = `Vol: ${bar.tickVolume.toLocaleString()}`;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(volumeText, 10, this.canvas.height - 100);
    }
    drawPriceScale() {
        const yMax = Math.max(...this.bars.map(bar => bar.high));
        const yMin = Math.min(...this.bars.map(bar => bar.low));
        const range = yMax - yMin;
        const scaleSteps = 5;
        const stepValue = range / scaleSteps;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Arial';
        for (let i = 0; i <= scaleSteps; i++) {
            const price = yMin + i * stepValue;
            const y = this.canvas.height - ((price - yMin) / range) * this.canvas.height;
            this.ctx.fillText(price.toFixed(4), 5, y);
            this.ctx.beginPath();
            this.ctx.moveTo(40, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.strokeStyle = '#666';
            this.ctx.stroke();
        }
    }
    clearCanvas() {
        this.ctx.fillStyle = '#131722';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    drawGrid() {
        this.ctx.strokeStyle = Chart.GRID_COLOR;
        this.ctx.lineWidth = 1;
        this.drawLines(this.canvas.width, 100, true);
        this.drawLines(this.canvas.height, 50, false);
    }
    drawLines(limit, spacing, isVertical) {
        for (let pos = 0; pos <= limit; pos += spacing) {
            this.ctx.beginPath();
            if (isVertical) {
                this.ctx.moveTo(pos, 0);
                this.ctx.lineTo(pos, this.canvas.height);
            }
            else {
                this.ctx.moveTo(0, pos);
                this.ctx.lineTo(this.canvas.width, pos);
            }
            this.ctx.stroke();
        }
    }
    drawBars() {
        const yMax = Math.max(...this.bars.map(bar => bar.high));
        const yMin = Math.min(...this.bars.map(bar => bar.low));
        const yRange = yMax - yMin;
        const yScale = this.canvas.height / yRange;
        const totalBars = this.bars.length;
        const availableWidth = this.canvas.width;
        const totalBarSpace = totalBars * this.barWidth;
        const maxOffsetX = Math.max(0, totalBarSpace - availableWidth);
        this.offsetX = Math.max(0, Math.min(this.offsetX, maxOffsetX));
        const startIndex = Math.floor(this.offsetX / this.barWidth);
        const endIndex = Math.min(totalBars, startIndex + Math.floor(availableWidth / this.barWidth));
        for (let i = startIndex; i < endIndex; i++) {
            const bar = this.bars[i];
            const xPosition = (i - startIndex) * this.barWidth - (this.offsetX % this.barWidth);
            const color = bar.close > bar.open ? 'green' : 'red';
            bar.draw(this.ctx, xPosition, yScale, yMax, this.barWidth, color);
        }
    }
    drawCrosshair(x, y) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = Chart.CROSSHAIR_COLOR;
        this.ctx.setLineDash([5, 5]);
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    addEventListeners() {
        this.canvas.addEventListener('resize', this.resizeCanvas);
        this.canvas.addEventListener('wheel', this.handleWheel);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    }
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.draw();
    }
}
Chart.GRID_COLOR = '#2B2B43';
Chart.CROSSHAIR_COLOR = '#FFFFFF';
const chart = new Chart('chartCanvas', 'Advanced', 'EURUSD', 1, 57674, 59113);
//# sourceMappingURL=index.js.map