import { Bar } from '../models/Bar';
import { ChunkData } from '../models/ChartDataTypes';
import { DataLoader } from '../services/DataLoader';

export class Chart {
    private bars: Bar[] = [];
    private dataLoader: DataLoader;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private offsetX: number = 0;
    private barWidth: number = 15;
    private visibleBars: number;
    private lastMousePosition: { x: number | null; y: number | null } = { x: null, y: null };
    private static readonly GRID_COLOR: string = '#2B2B43';
    private static readonly CROSSHAIR_COLOR: string = '#FFFFFF';
    private hoveredBar: Bar | null = null;
    private symbol: string = 'EURUSD';
    private dragging: boolean = false;
    private dragStartX: number = 0;
    private dragOffsetX: number = 0;
    private lastExecutionTime: number = 0;
    private readonly throttleInterval: number = 50;
    private readonly zoomIntensity: number = 0.1;
    private readonly scrollIntensity: number = 30;

    constructor(canvasId: string, broker: string, symbol: string, timeframe: number, start: number, end: number) {
        if (this.isSmallScreen()) {
            alert("The mobile version of this page is not available. Please access this page from a desktop.");
            const messageDiv = document.createElement('div');
            messageDiv.className = 'warning';
            messageDiv.textContent = 'The mobile version of this page is not available. Please access this page from a desktop.';

            document.body.appendChild(messageDiv);
            return;
        }

        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.dataLoader = new DataLoader({broker, symbol, timeframe, start, end});
        this.visibleBars = Math.floor(this.canvas.width / this.barWidth);
        this.handleWheel = this.handleWheel.bind(this);
        this.initialize();
    }

    private async initialize(): Promise<void> {
        this.resizeCanvas();
        window.onload = () => this.resizeCanvas();
        window.onresize = () => this.resizeCanvas();
        await this.loadAndDraw();
        this.addEventListeners();
    }

    public async changeMarket(newSymbol: string) {
        if (newSymbol !== this.symbol) {
            this.symbol = newSymbol;
            await this.loadAndDraw();
        }
    }

    private isSmallScreen() {
        return window.innerWidth < 800 || window.innerHeight < 600;
    }

    private async loadAndDraw(): Promise<void> {
        let timeoutId: number = window.setTimeout(() => {
            this.displayLoadingMessage("Loading data...");
        }, 1000);

        try {
            const chunks: ChunkData = await this.dataLoader.loadData(this.symbol);
            window.clearTimeout(timeoutId);
            this.processData(chunks);
            this.draw();
        } catch (error) {
            console.error("Data loading failed:", error);
            this.displayLoadingMessage("Failed to load data.");
        } finally {
            window.clearTimeout(timeoutId);
            this.clearLoadingMessage();
        }
    }

    private displayLoadingMessage(message: string): void {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(message, this.canvas.width / 2 - this.ctx.measureText(message).width / 2, this.canvas.height / 2);
    }

    private clearLoadingMessage(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.draw();
    }

    private processData(chunks: ChunkData): void {
        const globalStartTime = Math.min(...chunks.map((chunk: { ChunkStart: any; }) => chunk.ChunkStart));
        this.bars = chunks.flatMap((chunk: { Bars: any[]; ChunkStart: any; }) => chunk.Bars.map(barData => new Bar(
            new Date((chunk.ChunkStart + barData.Time) * 1000),
            barData.Open,
            barData.High,
            barData.Low,
            barData.Close,
            barData.TickVolume,
            chunk.ChunkStart + barData.Time - globalStartTime
        )));
    }

    private draw(mouseX?: number, mouseY?: number) {
        this.clearCanvas();
        this.drawGrid();
        this.drawBars();
        this.drawPriceScale();
        this.drawTimeFrame();

        if (mouseX !== null && mouseY !== null) {
            this.drawCrosshair(mouseX, mouseY);
            this.hoveredBar = this.bars.find(bar => bar.isHovering(mouseX));
            if (this.hoveredBar) {
                this.displayBarInfo(this.hoveredBar);
            }
        } else {
            this.hoveredBar = null;
        }
    }

    private displayBarInfo(bar: Bar) {
        const barDetails = [
            `Vol: ${bar.tickVolume.toLocaleString()}`,
            `Date: ${bar.dateTime.toLocaleString()}`,
            `Price: ${bar.close.toLocaleString()}`
        ];

        const edgePadding = 200;
        const totalTextWidth = barDetails.reduce((totalWidth, text) => totalWidth + this.ctx.measureText(text).width, 0);
        const remainingSpace = this.canvas.width - totalTextWidth - edgePadding * 2;
        const spacing = remainingSpace / (barDetails.length - 1);

        let xPosition = edgePadding;
        barDetails.forEach((text, index) => {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText(text, xPosition, this.canvas.height - 50);
            xPosition += this.ctx.measureText(text).width + (index < barDetails.length - 1 ? spacing : 0);
        });
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
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);

    }

    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 50;
        this.draw()
    }

    private handleZoom(deltaY: number): number {
        const newWidth = deltaY < 0 ? this.barWidth * (1 + this.zoomIntensity) : this.barWidth * (1 - this.zoomIntensity);
        return Math.max(5, Math.min(67, newWidth));
    }

    private handleScroll(deltaX: number): number {
        if (deltaX < 0) {
            return Math.max(0, this.offsetX - this.scrollIntensity);
        } else if (deltaX > 0) {
            return Math.min(this.offsetX + this.scrollIntensity, this.bars.length * this.barWidth - this.canvas.width);
        }
        return this.offsetX;
    }

    public handleWheel(event: WheelEvent): void {

        const now = Date.now();
        if (now - this.lastExecutionTime < this.throttleInterval) return;

        event.preventDefault();
        if (event.shiftKey) {
            this.barWidth = this.handleZoom(event.deltaY);
        } else {
            this.offsetX = this.handleScroll(event.deltaX);
        }

        this.lastExecutionTime = now;
        window.requestAnimationFrame(() => this.draw());
    }

    private handleMouseDown = (event: MouseEvent) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const mouseX = (event.clientX - rect.left) * scaleX;

        this.dragging = true;
        this.dragStartX = mouseX;
        this.dragOffsetX = this.offsetX;
        this.canvas.style.cursor = 'grabbing';
    };

    private handleMouseMove = (event: MouseEvent) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        this.lastMousePosition.x = x;
        this.lastMousePosition.y = y;

        if (this.dragging) {
            const dx = x - this.dragStartX;
            const newOffsetX = this.dragOffsetX - dx;
            this.offsetX = Math.max(0, Math.min(newOffsetX, this.bars.length * this.barWidth - this.canvas.width));
        }

        window.requestAnimationFrame(() => this.draw(x, y));
    }

    private handleMouseUp = () => {
        this.dragging = false;
        this.canvas.style.cursor = 'default';
    };

    private handleMouseLeave = () => {
        this.dragging = false;
        this.lastMousePosition.x = null;
        this.lastMousePosition.y = null;
        this.draw();
    }
}