import { ChartData } from "./ChartData";
import { Bar } from "../models/Bar";

export class ChartRenderer {
    private static readonly CROSSHAIR_COLOR = '#FFFFFF';
    private static readonly GRID_COLOR = '#2B2B43';
    private static readonly CANVAS_BACKGROUND_COLOR = '#131722';
    private static readonly SCALE_COLOR = '#666';
    private static readonly TEXT_COLOR = '#FFFFFF';
    private static readonly TEXT_FONT = '12px Arial';
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private chartData: ChartData;
    private hoveredBar: Bar | null = null;
    private barWidth: number = 15;
    private offsetX: number = 0;

    constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, chartData: ChartData) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.chartData = chartData;
    }

    public getBarWidth(): number {
        return this.barWidth;
    }

    public setBarWidth(barWidth: number): void {
        this.barWidth = barWidth;
    }

    public getOffsetX(): number {
        return this.offsetX;
    }

    public setOffsetX(offsetX: number): void {
        this.offsetX = offsetX;
    }

    public getBarLength(): number {
        return this.chartData.getBars().length;
    }

    public render(mouseX?: number, mouseY?: number) {
        this.clearCanvas();
        this.drawGrid();
        this.drawBars();
        this.drawPriceScale();
        this.drawTimeFrame();

        if (mouseX !== undefined && mouseY !== undefined) {
            this.drawCrosshair(mouseX, mouseY);
            this.hoveredBar = this.chartData.getBars().find(bar => bar.isHovering(mouseX));
            this.hoveredBar && this.displayBarInfo(this.hoveredBar);
        } else {
            this.hoveredBar = null;
        }
    }

    private clearCanvas() {
        this.ctx.fillStyle = ChartRenderer.CANVAS_BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawGrid() {
        const gridSpacingX = 100;
        const gridSpacingY = 50;

        this.ctx.strokeStyle = ChartRenderer.GRID_COLOR;
        this.ctx.lineWidth = 1;
        this.drawLines(this.canvas.width, gridSpacingX, true);
        this.drawLines(this.canvas.height, gridSpacingY, false);
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
        const bars = this.chartData.getBars();
        const yMax = Math.max(...bars.map(bar => bar.high));
        const yMin = Math.min(...bars.map(bar => bar.low));
        const yRange = yMax - yMin;
        const yScale = this.canvas.height / yRange;
        const totalBars = bars.length;
        const availableWidth = this.canvas.width;

        const totalBarSpace = totalBars * this.barWidth;
        const maxOffsetX = Math.max(0, totalBarSpace - availableWidth);
        this.offsetX = Math.max(0, Math.min(this.offsetX, maxOffsetX));

        const startIndex = Math.floor(this.offsetX / this.barWidth);
        const endIndex = Math.min(totalBars, startIndex + Math.floor(availableWidth / this.barWidth));

        for (let i = startIndex; i < endIndex; i++) {
            const bar = bars[i];
            const xPosition = (i - startIndex) * this.barWidth - (this.offsetX % this.barWidth);
            const color = bar.close > bar.open ? 'green' : 'red';
            bar.draw(this.ctx, xPosition, yScale, yMax, this.barWidth, color);
        }
    }

    private drawTimeFrame() {
        const bars = this.chartData.getBars();
        const barSpacing = Math.max(this.barWidth, 1);
        const skipTicks = Math.floor(150 / barSpacing);
        const startIndex = Math.floor(this.offsetX / this.barWidth);
        const endIndex = Math.min(bars.length, startIndex + Math.floor(this.canvas.width / this.barWidth));

        this.ctx.fillStyle = ChartRenderer.TEXT_COLOR;
        this.ctx.font = ChartRenderer.TEXT_FONT;
        this.ctx.textAlign = 'center';

        for (let i = startIndex; i < endIndex; i += skipTicks) {
            const bar = bars[i];
            const xPosition = (i - startIndex) * this.barWidth - (this.offsetX % this.barWidth) + this.barWidth / 2;
            const date = new Date(bar.dateTime);
            const formattedTime = `${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`;

            this.ctx.fillText(formattedTime, xPosition, this.canvas.height - 10);
        }
    }

    private drawCrosshair(x: number, y: number) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = ChartRenderer.CROSSHAIR_COLOR;
        this.ctx.setLineDash([5, 5]);
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    private drawPriceScale() {
        const bars = this.chartData.getBars();
        const yMax = Math.max(...bars.map(bar => bar.high));
        const yMin = Math.min(...bars.map(bar => bar.low));
        const range = yMax - yMin;
        const scaleSteps = 5;
        const stepValue = range / scaleSteps;

        this.ctx.fillStyle = ChartRenderer.TEXT_COLOR;
        this.ctx.font = ChartRenderer.TEXT_FONT;

        for (let i = 0; i <= scaleSteps; i++) {
            const price = yMin + i * stepValue;
            const y = this.canvas.height - ((price - yMin) / range) * this.canvas.height;

            this.ctx.fillText(price.toFixed(4), 30, y);

            this.ctx.beginPath();
            this.ctx.moveTo(70, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.strokeStyle = ChartRenderer.SCALE_COLOR;
            this.ctx.stroke();
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
            this.ctx.fillStyle = ChartRenderer.TEXT_COLOR;
            this.ctx.fillText(text, xPosition, this.canvas.height - 50);
            xPosition += this.ctx.measureText(text).width + (index < barDetails.length - 1 ? spacing : 0);
        });
    }

    public displayMessage(message: string): void {
        this.ctx.fillStyle = ChartRenderer.TEXT_COLOR;
        this.ctx.font = ChartRenderer.TEXT_FONT;
        this.ctx.fillText(message, this.canvas.width / 2 - this.ctx.measureText(message).width / 2, this.canvas.height / 2);
    }
}

