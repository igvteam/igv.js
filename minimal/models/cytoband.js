/**
 * Immutable representation of a cytoband (chromosome band)
 */
export class Cytoband {
    constructor(start, end, name, typestain) {
        this.start = start
        this.end = end
        this.name = name
        this.stain = 0

        // Set the type, either p, n, or c
        if (typestain === 'acen') {
            this.type = 'c'  // centromere
        } else {
            this.type = typestain.charAt(1)
            if (this.type === 'p') {
                // Extract stain value from format like "gpos25" -> 25
                this.stain = parseInt(typestain.substring(4))
            }
        }
        
        // Make immutable
        Object.freeze(this)
    }
}

