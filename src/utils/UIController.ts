export class UIController {
    private canvas: HTMLCanvasElement;

    constructor(canvas?: HTMLCanvasElement) {
        this.canvas = canvas;
        this.handleScreenSizeChange();
    }

    private isSmallScreen() {
        return window.innerWidth < 800 || window.innerHeight < 600;
    }

    private handleScreenSizeChange(): void {
        if (this.isSmallScreen()) {
            alert("The mobile version of this page is not available. Please access this page from a desktop.");

            const messageDiv = document.createElement('div');

            messageDiv.className = 'warning';
            messageDiv.textContent = 'The mobile version of this page is not available. Please access this page from a desktop.';
            document.body.appendChild(messageDiv);

            return;
        }
    }
}
