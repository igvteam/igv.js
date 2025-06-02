import {BGZip, igvxhr, StringUtils} from 'igv-utils'
import Chromosome from "./chromosome.js"
import {buildOptions, isDataURL} from "../util/igvUtils.js"
import SequenceInterval from "./sequenceInterval.js"

const splitLines = StringUtils.splitLines

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed'])

class NonIndexedFasta {

    #chromosomeNames
    chromosomes = new Map()
    sequences = new Map()

    constructor(reference) {

        this.fastaURL = reference.fastaURL
        this.withCredentials = reference.withCredentials


        // Build a track-like config object from the referenceObject
        const config = {}
        for (let key in reference) {
            if (reference.hasOwnProperty(key) && !reservedProperties.has(key)) {
                config[key] = reference[key]
            }
        }
        this.config = config
    }


    async init() {
        return this.loadAll()
    }

    getSequenceRecord(chr) {
        return this.chromosomes.get(chr)
    }

    get chromosomeNames() {
        if (!this.#chromosomeNames) {
            this.#chromosomeNames = Array.from(this.chromosomes.keys())
        }
        return this.#chromosomeNames
    }

    getFirstChromosomeName() {
        return this.chromosomeNames[0]
    }

    async getSequence(chr, start, end) {

        if (this.sequences.size === 0) {
            await this.loadAll()
        }

        if (!this.sequences.has(chr)) {
            return undefined
        }

        let seqSlice = this.sequences.get(chr).find(ss => ss.contains(start, end))
        if (!seqSlice) {
            seqSlice = this.sequences.get(chr).find(ss => ss.overlaps(start, end))
            if (!seqSlice) {
                return undefined
            }
        }

        start -= seqSlice.offset
        end -= seqSlice.offset

        let prefix = ""
        if (start < 0) {
            for (let i = start; i < Math.min(end, 0); i++) {
                prefix += "*"
            }
        }

        if (end <= 0) {
            return prefix
        }

        const seq = seqSlice.sequence
        const seqEnd = Math.min(end, seq.length)
        return prefix + seq.substring(start, seqEnd)
    }

    async loadAll() {


        const pushChromosome = (current, order) => {
            const length = current.length || (current.offset + current.seq.length)
            if (!chrNameSet.has(current.chr)) {
                this.sequences.set(current.chr, [])
                this.chromosomes.set(current.chr, new Chromosome(current.chr, order, length))
                chrNameSet.add(current.chr)
            } else {
                const c = this.chromosomes.get(current.chr)
                c.bpLength = Math.max(c.bpLength, length)
            }
            this.sequences.get(current.chr).push(new SequenceSlice(current.offset, current.seq))
        }

        let data
        if (isDataURL(this.fastaURL)) {
            let bytes = BGZip.decodeDataURI(this.fastaURL)
            data = ""
            for (let b of bytes) {
                data += String.fromCharCode(b)
            }
        } else {
            data = await igvxhr.load(this.fastaURL, buildOptions(this.config))
        }

        const chrNameSet = new Set()
        const lines = splitLines(data)
        let order = 0
        let current = {}
        for (let nextLine of lines) {
            if (nextLine.startsWith("#") || nextLine.length === 0) {
                // skip
            } else if (nextLine.startsWith(">")) {
                // Start the next sequence
                if (current.seq && current.seq.length > 0) {
                    pushChromosome(current, order++)
                }
                current.seq = ""

                const parts = nextLine.substr(1).split(/\s+/)


                // Check for @len= token, which is a non-standard extension supporting igv-reports.
                if (nextLine.includes("@len=")) {
                    const nameParts = parts[0].split(':')
                    current.chr = nameParts[0]
                    if (nameParts.length > 1 && nameParts[1].indexOf('-') > 0) {

                        const locusParts = nameParts[1].split('-')
                        if (locusParts.length === 2 &&
                            /^[0-9]+$/.test(locusParts[0]) &&
                            /^[0-9]+$/.test(locusParts[1])) {
                        }
                        const from = Number.parseInt(locusParts[0])
                        const to = Number.parseInt(locusParts[1])
                        current.offset = from - 1

                        // Check for chromosome length token
                        if (parts.length > 1 && parts[1].startsWith("@len=")) {
                            try {
                                current.length = parseInt(parts[1].trim().substring(5))
                            } catch (e) {
                                current.length = undefined
                                console.error(`Error parsing sequence length for ${nextLine}`)
                            }
                        } else {
                            current.length = undefined
                        }
                    }
                } else {
                    // No special tokens, a standard FASTA header
                    current.chr = parts[0]
                    current.offset = 0
                }

            } else {
                // Not a header or comment, so it must be sequence data
                current.seq += nextLine
            }
        }

        // Handle the last sequence
        if (current.seq && current.seq.length > 0) {
            pushChromosome(current, order)
        }

    }

    /**
     * Return the first cached interval containing the specified region, or undefined if no interval is found.
     *
     * @param chr
     * @param start
     * @param end
     * @returns a SequenceInterval or undefined
     */
    getSequenceInterval(chr, start, end) {

        const slices = this.sequences.get(chr)
        if (!slices) return undefined

        for (let sequenceSlice of slices) {
            const seq = sequenceSlice.sequence
            const seqStart = sequenceSlice.offset
            const seqEnd = seqStart + seq.length

            if (seqStart <= start && seqEnd >= end) {
                return new SequenceInterval(chr, seqStart, seqEnd, seq)
            }
        }
        return undefined

    }
}


class SequenceSlice {

    constructor(offset, sequence) {
        this.offset = offset
        this.sequence = sequence
    }

    contains(start, end) {
        return this.offset <= start && this.end >= end
    }

    overlaps(start, end) {
        return this.offset < end && this.end > start
    }

    get end() {
        return this.offset + this.sequence.length
    }

}


export default NonIndexedFasta
