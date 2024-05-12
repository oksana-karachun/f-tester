import { ChartRenderer } from "./ChartRenderer";

export class ChartInteraction {
    private canvas: HTMLCanvasElement;
    private chartRenderer: ChartRenderer;
    private readonly zoomIntensity: number = 0.1;
    private readonly scrollIntensity: number = 30;
    private readonly throttleInterval: number = 50;
    private lastMousePosition: { x: number | null; y: number | null } = { x: null, y: null };
    private dragging: boolean = false;
    private dragStartX: number = 0;
    private dragOffsetX: number = 0;
    private lastExecutionTime: number = 0;

    constructor(canvas: HTMLCanvasElement, chartRenderer: ChartRenderer) {
        this.canvas = canvas;
        this.chartRenderer = chartRenderer;
        this.resizeCanvas();
        window.onload = () => this.resizeCanvas();
        window.onresize = () => this.resizeCanvas();
        this.attachEventHandlers();
    }

    private attachEventHandlers() {
        this.canvas.addEventListener('resize', this.resizeCanvas);
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    }

    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 50;
        this.chartRenderer.render();
    }

    private handleZoom(deltaY: number): number {
        const newWidth = deltaY < 0 ? this.chartRenderer.getBarWidth() * (1 + this.zoomIntensity) : this.chartRenderer.getBarWidth() * (1 - this.zoomIntensity);
        return Math.max(5, Math.min(67, newWidth));
    }

    private handleScroll(deltaX: number): number {
        if (deltaX < 0) {
            return Math.max(0, this.chartRenderer.getOffsetX() - this.scrollIntensity);
        } else if (deltaX > 0) {
            return Math.min(this.chartRenderer.getOffsetX() + this.scrollIntensity, this.chartRenderer.getBarLength() * this.chartRenderer.getBarWidth() - this.canvas.width);
        }
        return this.chartRenderer.getOffsetX();
    }

    public handleWheel(event: WheelEvent): void {

        const now = Date.now();
        if (now - this.lastExecutionTime < this.throttleInterval) return;

        event.preventDefault();
        if (event.shiftKey) {
            this.chartRenderer.setBarWidth(this.handleZoom(event.deltaY))
        } else {
            this.chartRenderer.setOffsetX(this.handleScroll(event.deltaX));
        }

        this.lastExecutionTime = now;
        window.requestAnimationFrame(() => this.chartRenderer.render());
    }

    private handleMouseDown = (event: MouseEvent) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const mouseX = (event.clientX - rect.left) * scaleX;

        this.dragging = true;
        this.dragStartX = mouseX;
        this.dragOffsetX = this.chartRenderer.getOffsetX();
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
            this.chartRenderer.setOffsetX(Math.max(0, Math.min(newOffsetX, this.chartRenderer.getBarLength() * this.chartRenderer.getBarWidth() - this.canvas.width)));
        }

        window.requestAnimationFrame(() => this.chartRenderer.render(x, y));
    }

    private handleMouseUp = () => {
        this.dragging = false;
        this.canvas.style.cursor = 'default';
    };

    private handleMouseLeave = () => {
        this.dragging = false;
        this.lastMousePosition.x = null;
        this.lastMousePosition.y = null;
        this.chartRenderer.render();
    }
}
