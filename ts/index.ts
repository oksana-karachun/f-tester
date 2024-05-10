interface BarData {
    Time: number;
    Open: number;
    High: number;
    Low: number;
    Close: number;
    TickVolume: number;
}

class Bar {
    private xStart: number;
    private width: number;

    constructor(
        public dateTime: Date,
        public open: number,
        public high: number,
        public low: number,
        public close: number,
        public tickVolume: number,
        public timeOffset: number
    ) {}

    draw(ctx: CanvasRenderingContext2D, x: number, yScale: number, yMax: number, maxWidth: number, color: string): void {
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

    isHovering(overX: number): boolean {
        return overX >= this.xStart && overX <= this.xStart + this.width;
    }
}

interface Chunk {
    ChunkStart: number;
    Bars: BarData[];
}

interface ChunkData extends Array<Chunk> {}

class DataLoader {
    constructor(private baseUrl: string, private broker: string, private symbol: string, private timeframe: number, private start: number, private end: number, private useMessagePack: boolean = false) {}

    public async loadData(): Promise<ChunkData> {
        const url = `${this.baseUrl}?Broker=${encodeURIComponent(this.broker)}&Symbol=${encodeURIComponent(this.symbol)}&Timeframe=${this.timeframe}&Start=${this.start}&End=${this.end}&UseMessagePack=${this.useMessagePack}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    }
}

class Chart {
    private bars: Bar[] = [];
    private dataLoader: DataLoader;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private offsetX: number = 0;
    private barWidth: number = 15;
    private visibleBars: number;
    private lastMouseX: number | null = null;
    private lastMouseY: number | null = null;
    private static readonly GRID_COLOR: string = '#2B2B43';
    private static readonly CROSSHAIR_COLOR: string = '#FFFFFF';
    private hoveredBar: Bar | null = null;

    constructor(canvasId: string, broker: string, symbol: string, timeframe: number, start: number, end: number) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.dataLoader = new DataLoader('https://beta.forextester.com/data/api/Metadata/bars/chunked', broker, symbol, timeframe, start, end);
        this.visibleBars = Math.floor(this.canvas.width / this.barWidth);
        this.initialize();
    }

    private async initialize(): Promise<void> {
        this.resizeCanvas();
        window.onload = () => this.resizeCanvas();
        window.onresize = () => this.resizeCanvas();
        await this.loadAndDraw();
        this.addEventListeners();
    }

    private async loadAndDraw(): Promise<void> {
        try {
            const chunks: ChunkData = await this.dataLoader.loadData();
            this.processData(chunks);
            this.draw();
        } catch (error) {
            console.error("Data loading failed:", error);
        }
    }

    private processData(chunks: ChunkData): void {
        const globalStartTime = Math.min(...chunks.map(chunk => chunk.ChunkStart));
        this.bars = chunks.flatMap(chunk => chunk.Bars.map(barData => new Bar(
            new Date(chunk.ChunkStart + barData.Time * 1000),
            barData.Open,
            barData.High,
            barData.Low,
            barData.Close,
            barData.TickVolume,
            chunk.ChunkStart + barData.Time - globalStartTime
        )));
    }

    private draw(mouseX = this.lastMouseX, mouseY = this.lastMouseY) {
        this.clearCanvas();
        this.drawGrid();
        this.drawBars();
        this.drawPriceScale();
        this.drawTimeFrame();

        if (mouseX !== null && mouseY !== null) {
            this.drawCrosshair(mouseX, mouseY);
            this.hoveredBar = this.bars.find(bar => bar.isHovering(mouseX));
            if (this.hoveredBar) {
                this.displayVolume(this.hoveredBar);
            }
        } else {
            this.hoveredBar = null;
        }
    }

    private displayVolume(bar: Bar) {
        const volumeText = `Vol: ${bar.tickVolume.toLocaleString()}`;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(volumeText, 100, this.canvas.height - 50);
    }

    private drawPriceScale() {
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

            this.ctx.fillText(price.toFixed(4), 30, y);

            this.ctx.beginPath();
            this.ctx.moveTo(70, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.strokeStyle = '#666';
            this.ctx.stroke();
        }
    }

    private clearCanvas() {
        this.ctx.fillStyle = '#131722';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawGrid() {
        this.ctx.strokeStyle = Chart.GRID_COLOR;
        this.ctx.lineWidth = 1;
        this.drawLines(this.canvas.width, 100, true);
        this.drawLines(this.canvas.height, 50, false);
    }

    private drawLines(limit: number, spacing: number, isVertical: boolean) {
        for (let pos = 0; pos <= limit; pos += spacing) {
            this.ctx.beginPath();
            if (isVertical) {
                this.ctx.moveTo(pos, 0);
                this.ctx.lineTo(pos, this.canvas.height);
            } else {
                this.ctx.moveTo(0, pos);
                this.ctx.lineTo(this.canvas.width, pos);
            }
            this.ctx.stroke();
        }
    }

    private drawBars() {
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

    private drawTimeFrame() {
        const barSpacing = Math.max(this.barWidth, 1);
        const skipTicks = Math.floor(150 / barSpacing);
        const startIndex = Math.floor(this.offsetX / this.barWidth);
        const endIndex = Math.min(this.bars.length, startIndex + Math.floor(this.canvas.width / this.barWidth));

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';

        for (let i = startIndex; i < endIndex; i += skipTicks) {
            const bar = this.bars[i];
            const xPosition = (i - startIndex) * this.barWidth - (this.offsetX % this.barWidth) + this.barWidth / 2;
            const date = new Date(bar.dateTime);
            const formattedTime = `${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`;

            this.ctx.fillText(formattedTime, xPosition, this.canvas.height - 10);
        }
    }

    private drawCrosshair(x: number, y: number) {
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

    private addEventListeners() {
        this.canvas.addEventListener('resize', this.resizeCanvas);
        this.canvas.addEventListener('wheel', this.handleWheel);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    }

    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.draw()
    }

    private handleWheel = (() => {
        let lastExecutionTime = 0;
        const throttleInterval = 50;
        const zoomIntensity = 0.1;
        const scrollIntensity = 30;

        const handleZoom = (deltaY: number, width: number) => {
            const newWidth = deltaY < 0 ? width * (1 + zoomIntensity) : width * (1 - zoomIntensity);
            return Math.max(5, Math.min(67, newWidth));
        };

        const handleScroll = (deltaX: number, offsetX: number, totalWidth: number, canvasWidth: number) => {
            if (deltaX < 0) {
                return Math.max(0, offsetX - scrollIntensity);
            } else if (deltaX > 0) {
                return Math.min(offsetX + scrollIntensity, totalWidth - canvasWidth);
            }
            return offsetX;
        };

        return (event: WheelEvent) => {
            const now = Date.now();
            if (now - lastExecutionTime < throttleInterval) return;

            event.preventDefault();
            if (event.shiftKey) {
                this.barWidth = handleZoom(event.deltaY, this.barWidth);
            } else {
                this.offsetX = handleScroll(event.deltaX, this.offsetX, this.bars.length * this.barWidth, this.canvas.width);
            }

            lastExecutionTime = now;
            window.requestAnimationFrame(() => this.draw());
        };
    })();

    private handleMouseMove = (event: MouseEvent) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        this.lastMouseX = x;
        this.lastMouseY = y;

        window.requestAnimationFrame(() => this.draw(x, y));
    }

    private handleMouseLeave = () => {
        this.lastMouseX = null;
        this.lastMouseY = null;
        this.draw();
    }
}

const chart = new Chart('chartCanvas', 'Advanced', 'EURUSD', 1, 57674, 59113);