export interface BarData {
    Time: number;
    Open: number;
    High: number;
    Low: number;
    Close: number;
    TickVolume: number;
}

export class Bar {
    private _xStart: number = 0;
    private _width: number = 0;

    constructor(
        public dateTime: Date,
        public open: number,
        public high: number,
        public low: number,
        public close: number,
        public tickVolume: number,
        public timeOffset: number
    ) {}

    public draw(ctx: CanvasRenderingContext2D, x: number, yScale: number, yMax: number, maxWidth: number, color: string): void {
        const candleWidth = maxWidth * 0.6;
        this._xStart = x;
        this._width = candleWidth;

        const pixelForHigh = (yMax - this.high) * yScale;
        const pixelForLow = (yMax - this.low) * yScale;
        const pixelForOpen = (yMax - this.open) * yScale;
        const pixelForClose = (yMax - this.close) * yScale;

        ctx.fillStyle = color;
        ctx.fillRect(this._xStart, Math.min(pixelForOpen, pixelForClose), candleWidth, Math.abs(pixelForClose - pixelForOpen));

        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, pixelForHigh);
        ctx.lineTo(x + candleWidth / 2, Math.min(pixelForOpen, pixelForClose));
        ctx.moveTo(x + candleWidth / 2, pixelForLow);
        ctx.lineTo(x + candleWidth / 2, Math.max(pixelForOpen, pixelForClose));
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    isHovering(overX: number): boolean {
        return overX >= this._xStart && overX <= this._xStart + this._width;
    }
}