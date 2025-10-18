/**
 * Immutable track configuration
 */
export class TrackConfig {
    constructor({type, url, name, color, height, graphType, indexed, ...options}) {
        this.type = type
        this.url = url
        this.name = name || this.inferNameFromUrl(url)
        this.color = color || 'rgb(150, 150, 150)'
        this.height = height || 50
        this.graphType = graphType || 'bar'
        this.indexed = indexed !== undefined ? indexed : true
        this.options = options
        Object.freeze(this)
    }

    inferNameFromUrl(url) {
        if (!url) return 'Track'
        if (typeof url !== 'string') return 'Track'
        
        // Extract filename from URL
        const parts = url.split('/')
        const filename = parts[parts.length - 1]
        return filename.split('?')[0] // Remove query parameters
    }
}

