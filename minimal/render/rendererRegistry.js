import { WigRenderer } from './wigRenderer.js'
import { GeneRenderer } from './geneRenderer.js'
import { SequenceRenderer } from './sequenceRenderer.js'
import { IdeogramRenderer } from './ideogramRenderer.js'

/**
 * Registry for mapping track types to renderers
 */
export class RendererRegistry {
    static renderers = new Map([
        ['ideogram', IdeogramRenderer],
        ['wig', WigRenderer],
        ['gene', GeneRenderer],
        ['refseq', GeneRenderer],
        ['feature', GeneRenderer],
        ['sequence', SequenceRenderer]
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

