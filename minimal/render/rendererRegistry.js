import { WigRenderer } from './wigRenderer.js'
import { GeneRenderer } from './geneRenderer.js'

/**
 * Registry for mapping track types to renderers
 */
export class RendererRegistry {
    static renderers = new Map([
        ['wig', WigRenderer],
        ['gene', GeneRenderer],
        ['refseq', GeneRenderer],
        ['feature', GeneRenderer]
    ])

    /**
     * Get renderer for a track type
     */
    static get(type) {
        const renderer = this.renderers.get(type)
        if (!renderer) {
            throw new Error(`No renderer found for track type: ${type}`)
        }
        return renderer
    }

    /**
     * Register a custom renderer
     */
    static register(type, renderer) {
        this.renderers.set(type, renderer)
    }
}

