import { ChartRenderer } from "./ChartRenderer";

export class ChartInteraction {
    private readonly zoomIntensity: number = 0.1;
    private readonly scrollIntensity: number = 30;
    private readonly throttleInterval: number = 50;
    private _canvas: HTMLCanvasElement;
    private _chartRenderer: ChartRenderer;
    private _lastMousePosition: { x: number | null; y: number | null } = { x: null, y: null };
    private _dragging: boolean = false;
    private _dragStartX: number = 0;
    private _dragOffsetX: number = 0;
    private _lastExecutionTime: number = 0;

    constructor(canvas: HTMLCanvasElement, chartRenderer: ChartRenderer) {
        this._canvas = canvas;
        this._chartRenderer = chartRenderer;
        this.resizeCanvas();
        window.onload = () => this.resizeCanvas();
        window.onresize = () => this.resizeCanvas();
        this.attachEventHandlers();
    }

    private attachEventHandlers() {
        this._canvas.addEventListener('resize', this.resizeCanvas);
        this._canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this._canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this._canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this._canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this._canvas.addEventListener('wheel', this.handleWheel.bind(this));
    }

    private resizeCanvas(): void {
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight - 50;
        this._chartRenderer.render();
    }

    private handleZoom(deltaY: number): number {
        const barWidth = this._chartRenderer.barWidth;
        const zoomFactor = deltaY < 0 ? 1 + this.zoomIntensity : 1 - this.zoomIntensity;
        const newWidth = barWidth * zoomFactor;

        return Math.max(5, Math.min(67, newWidth));
    }

    private handleScroll(deltaX: number): number {
        const currentOffsetX = this._chartRenderer.offsetX;
        const maxOffsetX = this._chartRenderer.barLength * this._chartRenderer.barWidth - this._canvas.width;

        return deltaX < 0
            ? Math.max(0, currentOffsetX - this.scrollIntensity)
            : Math.min(currentOffsetX + this.scrollIntensity, maxOffsetX);
    }

    private handleWheel(event: WheelEvent): void {

        const now = Date.now();
        if (now - this._lastExecutionTime < this.throttleInterval) return;

        event.preventDefault();
        if (event.shiftKey) {
            this._chartRenderer.barWidth = this.handleZoom(event.deltaY);
        } else {
            this._chartRenderer.offsetX = this.handleScroll(event.deltaX);
        }

        this._lastExecutionTime = now;
        window.requestAnimationFrame(() => this._chartRenderer.render());
    }

    private handleMouseDown = (event: MouseEvent) => {
        const rect = this._canvas.getBoundingClientRect();
        const scaleX = this._canvas.width / rect.width;
        const mouseX = (event.clientX - rect.left) * scaleX;

        this._dragging = true;
        this._dragStartX = mouseX;
        this._dragOffsetX = this._chartRenderer.offsetX;
        this._canvas.style.cursor = 'grabbing';
    };

    private handleMouseMove = (event: MouseEvent) => {
        const rect = this._canvas.getBoundingClientRect();
        const scaleX = this._canvas.width / rect.width;
        const scaleY = this._canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        this._lastMousePosition.x = x;
        this._lastMousePosition.y = y;

        if (this._dragging) {
            const dx = x - this._dragStartX;
            const newOffsetX = this._dragOffsetX - dx;
            const maxOffsetX = this._chartRenderer.barLength * this._chartRenderer.barWidth - this._canvas.width;
            this._chartRenderer.offsetX = Math.max(0, Math.min(newOffsetX, maxOffsetX));
        }

        window.requestAnimationFrame(() => this._chartRenderer.render(x, y));
    }

    private handleMouseUp = () => {
        this._dragging = false;
        this._canvas.style.cursor = 'default';
    };

    private handleMouseLeave = () => {
        this._dragging = false;
        this._lastMousePosition.x = null;
        this._lastMousePosition.y = null;
        this._chartRenderer.render();
    }
}
