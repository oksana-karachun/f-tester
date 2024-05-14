import { ChartData } from "./ChartData";
import { Bar } from "../models/Bar";

export class ChartRenderer {
    private static readonly CROSSHAIR_COLOR = '#FFFFFF';
    private static readonly GRID_COLOR = '#2B2B43';
    private static readonly CANVAS_BACKGROUND_COLOR = '#131722';
    private static readonly SCALE_COLOR = '#666';
    private static readonly TEXT_COLOR = '#FFFFFF';
    private static readonly TEXT_FONT = '12px Arial';
    private _ctx: CanvasRenderingContext2D;
    private _canvas: HTMLCanvasElement;
    private _chartData: ChartData;
    private _hoveredBar: Bar | null = null;
    private _barWidth: number = 15;
    private _offsetX: number = 0;

    constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, chartData: ChartData) {
        this._ctx = ctx;
        this._canvas = canvas;
        this._chartData = chartData;
    }


    get barWidth(): number {
        return this._barWidth;
    }

    set barWidth(barWidth: number) {
        this._barWidth = barWidth;
    }

    get offsetX(): number {
        return this._offsetX;
    }

    set offsetX(offsetX: number) {
        this._offsetX = offsetX;
    }

    get barLength(): number {
        return this._chartData.bars.length;
    }

    public render(mouseX?: number, mouseY?: number) {
        this.clearCanvas();
        this.drawGrid();
        this.drawBars();
        this.drawPriceScale();
        this.drawTimeFrame();

        if (mouseX !== undefined && mouseY !== undefined) {
            this.drawCrosshair(mouseX, mouseY);
            this._hoveredBar = this._chartData.bars.find(bar => bar.isHovering(mouseX));
            this._hoveredBar && this.displayBarInfo(this._hoveredBar);
        } else {
            this._hoveredBar = null;
        }
    }

    private clearCanvas() {
        this._ctx.fillStyle = ChartRenderer.CANVAS_BACKGROUND_COLOR;
        this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
    }

    private drawGrid() {
        const gridSpacingX = 100;
        const gridSpacingY = 50;

        this._ctx.strokeStyle = ChartRenderer.GRID_COLOR;
        this._ctx.lineWidth = 1;
        this.drawLines(this._canvas.width, gridSpacingX, true);
        this.drawLines(this._canvas.height, gridSpacingY, false);
    }

    private drawLines(limit: number, spacing: number, isVertical: boolean) {
        for (let pos = 0; pos <= limit; pos += spacing) {
            this._ctx.beginPath();
            if (isVertical) {
                this._ctx.moveTo(pos, 0);
                this._ctx.lineTo(pos, this._canvas.height);
            } else {
                this._ctx.moveTo(0, pos);
                this._ctx.lineTo(this._canvas.width, pos);
            }
            this._ctx.stroke();
        }
    }

    private drawBars() {
        const bars = this._chartData.bars;
        const yMax = Math.max(...bars.map(bar => bar.high));
        const yMin = Math.min(...bars.map(bar => bar.low));
        const yRange = yMax - yMin;
        const yScale = this._canvas.height / yRange;
        const totalBars = bars.length;
        const availableWidth = this._canvas.width;

        const totalBarSpace = totalBars * this._barWidth;
        const maxOffsetX = Math.max(0, totalBarSpace - availableWidth);
        this._offsetX = Math.max(0, Math.min(this._offsetX, maxOffsetX));

        const startIndex = Math.floor(this._offsetX / this._barWidth);
        const endIndex = Math.min(totalBars, startIndex + Math.floor(availableWidth / this._barWidth));

        for (let i = startIndex; i < endIndex; i++) {
            const bar = bars[i];
            const xPosition = (i - startIndex) * this._barWidth - (this._offsetX % this._barWidth);
            const color = bar.close > bar.open ? 'green' : 'red';
            bar.draw(this._ctx, xPosition, yScale, yMax, this._barWidth, color);
        }
    }

    private drawTimeFrame() {
        const bars = this._chartData.bars;
        const barSpacing = Math.max(this._barWidth, 1);
        const skipTicks = Math.floor(150 / barSpacing);
        const startIndex = Math.floor(this._offsetX / this._barWidth);
        const endIndex = Math.min(bars.length, startIndex + Math.floor(this._canvas.width / this._barWidth));

        this._ctx.fillStyle = ChartRenderer.TEXT_COLOR;
        this._ctx.font = ChartRenderer.TEXT_FONT;
        this._ctx.textAlign = 'center';

        for (let i = startIndex; i < endIndex; i += skipTicks) {
            const bar = bars[i];
            const xPosition = (i - startIndex) * this._barWidth - (this._offsetX % this._barWidth) + this._barWidth / 2;
            const date = new Date(bar.dateTime);
            const formattedTime = `${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`;

            this._ctx.fillText(formattedTime, xPosition, this._canvas.height - 10);
        }
    }

    private drawCrosshair(x: number, y: number) {
        this._ctx.beginPath();
        this._ctx.strokeStyle = ChartRenderer.CROSSHAIR_COLOR;
        this._ctx.setLineDash([5, 5]);
        this._ctx.moveTo(x, 0);
        this._ctx.lineTo(x, this._canvas.height);
        this._ctx.moveTo(0, y);
        this._ctx.lineTo(this._canvas.width, y);
        this._ctx.stroke();
        this._ctx.setLineDash([]);
    }

    private drawPriceScale() {
        const bars = this._chartData.bars;
        const yMax = Math.max(...bars.map(bar => bar.high));
        const yMin = Math.min(...bars.map(bar => bar.low));
        const range = yMax - yMin;
        const scaleSteps = 5;
        const stepValue = range / scaleSteps;

        this._ctx.fillStyle = ChartRenderer.TEXT_COLOR;
        this._ctx.font = ChartRenderer.TEXT_FONT;

        for (let i = 0; i <= scaleSteps; i++) {
            const price = yMin + i * stepValue;
            const y = this._canvas.height - ((price - yMin) / range) * this._canvas.height;

            this._ctx.fillText(price.toFixed(4), 30, y);

            this._ctx.beginPath();
            this._ctx.moveTo(70, y);
            this._ctx.lineTo(this._canvas.width, y);
            this._ctx.strokeStyle = ChartRenderer.SCALE_COLOR;
            this._ctx.stroke();
        }
    }

    private displayBarInfo(bar: Bar) {
        const barDetails = [
            `Vol: ${bar.tickVolume.toLocaleString()}`,
            `Date: ${bar.dateTime.toLocaleString()}`,
            `Price: ${bar.close.toLocaleString()}`
        ];

        const edgePadding = 200;
        const totalTextWidth = barDetails.reduce((totalWidth, text) => totalWidth + this._ctx.measureText(text).width, 0);
        const remainingSpace = this._canvas.width - totalTextWidth - edgePadding * 2;
        const spacing = remainingSpace / (barDetails.length - 1);

        let xPosition = edgePadding;
        barDetails.forEach((text, index) => {
            this._ctx.fillStyle = ChartRenderer.TEXT_COLOR;
            this._ctx.fillText(text, xPosition, this._canvas.height - 50);
            xPosition += this._ctx.measureText(text).width + (index < barDetails.length - 1 ? spacing : 0);
        });
    }

    public displayMessage(message: string): void {
        this._ctx.fillStyle = ChartRenderer.TEXT_COLOR;
        this._ctx.font = ChartRenderer.TEXT_FONT;
        this._ctx.fillText(message, this._canvas.width / 2 - this._ctx.measureText(message).width / 2, this._canvas.height / 2);
    }
}

