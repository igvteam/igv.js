import { createCanvas } from './canvas.js'

/**
 * Manages DOM creation and layout for tracks
 */
export class UIManager {
    constructor(container) {
        if (!container || !(container instanceof HTMLElement)) {
            throw new Error('Container must be a valid HTML element')
        }
        this.container = container
        this.trackUIs = []
        
        // Add base styling
        this.container.style.fontFamily = 'Arial, sans-serif'
        this.container.style.fontSize = '12px'
    }

    /**
     * Create UI elements for a track
     */
    createTrackUI(viewModel) {
        const trackDiv = document.createElement('div')
        trackDiv.style.display = 'block'
        trackDiv.style.borderBottom = '1px solid #ccc'
        trackDiv.style.marginBottom = '2px'

        // Create canvas for track data (full width, no label)
        const canvasWidth = this.container.clientWidth
        const canvas = createCanvas(canvasWidth, viewModel.height)
        trackDiv.appendChild(canvas)

        this.container.appendChild(trackDiv)

        const ui = { element: trackDiv, canvas }
        this.trackUIs.push(ui)
        return ui
    }


    /**
     * Remove all track UIs
     */
    cleanup() {
        this.container.innerHTML = ''
        this.trackUIs = []
    }

    /**
     * Get the available width for track rendering
     */
    getAvailableWidth() {
        return this.container.clientWidth // Full width, no label space needed
    }
}

