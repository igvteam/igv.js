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
        trackDiv.className = 'igv-minimal-track'
        trackDiv.style.display = 'flex'
        trackDiv.style.borderBottom = '1px solid #ccc'
        trackDiv.style.marginBottom = '2px'

        // Create label
        const label = this.createLabel(viewModel.name)
        trackDiv.appendChild(label)

        // Create canvas for track data
        const canvasWidth = this.container.clientWidth - 100 // Reserve space for label
        const canvas = createCanvas(canvasWidth, viewModel.height)
        canvas.style.flexGrow = '1'
        trackDiv.appendChild(canvas)

        this.container.appendChild(trackDiv)

        const ui = { element: trackDiv, canvas, label }
        this.trackUIs.push(ui)
        return ui
    }

    /**
     * Create label element
     */
    createLabel(text) {
        const label = document.createElement('div')
        label.className = 'igv-minimal-track-label'
        label.textContent = text
        label.style.width = '100px'
        label.style.padding = '5px'
        label.style.fontSize = '11px'
        label.style.overflow = 'hidden'
        label.style.textOverflow = 'ellipsis'
        label.style.whiteSpace = 'nowrap'
        label.style.borderRight = '1px solid #ddd'
        label.style.display = 'flex'
        label.style.alignItems = 'center'
        label.title = text // Show full text on hover
        return label
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
        return this.container.clientWidth - 100 // Label width
    }
}

