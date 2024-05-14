import { DataLoader } from "../services/DataLoader";
import { ChartData } from "./ChartData";
import { ChartInteraction } from "./ChartInteraction";
import { ChartRenderer } from "./ChartRenderer";
import { UIController } from "../utils/UIController";

export class MainChart {
    private _renderer: ChartRenderer;
    private _dataController: ChartData;
    private _eventManager: ChartInteraction;
    private _uiController: UIController;
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    private _symbol: string = 'EURUSD';

    constructor(canvasId: string, dataLoader: DataLoader) {
        this._canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this._ctx = this._canvas.getContext('2d')!;
        this._dataController = new ChartData(dataLoader);
        this._renderer = new ChartRenderer(this._ctx, this._canvas, this._dataController);
        this._eventManager = new ChartInteraction(this._canvas, this._renderer);
        this._uiController = new UIController();
    }

    async initialize(): Promise<void> {
        await this.loadAndDraw();
    }

    public async changeMarket(_symbol: string) {
        if (_symbol !== this._symbol) {
            this._symbol = _symbol;
            await this.loadAndDraw();
        }
    }

    private async loadAndDraw(): Promise<void> {
        let timeoutId: number = window.setTimeout(() => {
            this._renderer.displayMessage("Loading data...");
        }, 100);

        try {
            await this._dataController.loadData(this._symbol);
            window.clearTimeout(timeoutId);
            this.render();
        } catch (error) {
            console.error("Data loading failed:", error);
            this._renderer.displayMessage("Failed to load data.");
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    private render(): void {
        this._renderer.render();
    }
}