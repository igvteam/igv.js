import {buildOptions, isDataURL} from "../util/igvUtils.js"
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import BWReader from "../bigwig/bwReader.js"
import Chromosome from "./chromosome.js"

class Cytoband {
    constructor(start, end, name, typestain) {
        this.start = start
        this.end = end
        this.name = name
        this.stain = 0

        // Set the type, either p, n, or c
        if (typestain === 'acen') {
            this.type = 'c'
        } else {
            this.type = typestain.charAt(1)
            if (this.type === 'p') {
                this.stain = parseInt(typestain.substring(4))
            }
        }
    }
}

export {Cytoband}
