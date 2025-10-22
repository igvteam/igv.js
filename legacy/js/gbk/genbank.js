import SequenceInterval from "../genome/sequenceInterval.js"
import Chromosome from "../genome/chromosome.js"

/**
 * Represents a Genbank file, which combines both annotations (features) and sequence.   The format combines both
 * sequence and annotations.
 *
 * Implements the Genome interface
 */
class Genbank {

    constructor({chr, locus, accession, aliases, features, sequence}) {
        this.chr = chr
        this.locus = locus
        this.accession = accession
        this.aliases = aliases
        this.features = features
        this.sequence = sequence
        this.bpLength = sequence.length
    }


    toJSON() {
        return {
            gbkURL: this.url
        }
    }


    // Genome interface follows

    getSequenceRecord(chr) {
        //chr, 0, sequenceRecord.bpLength
        return {chr: this.chr, bpLength: this.bpLength}
    }

    get chromosomeNames() {
        return [this.chr]
    }

    getFirstChromosomeName() {
        return this.chr
    }

    get id() {
        return this.accession
    }
    get name() {
        return this.locus
    }

    get initialLocus() {
        return this.chr
    }

    // Genome interface follows
    get description() {
        return this.locus
    }

    get infoURL() {
        return this.url
    }

    showWholeGenomeView() {
        return false
    }

    getHomeChromosomeName() {
        return this.chr
    }

    getChromosomeName(chr) {
        return chr
    }

    getChromosomeDisplayName(str) {
        return this.chr
    }

    getChromosome(chr) {
        if (chr === this.chr) {
            return {
                name: this.chr,
                bpLength: this.bpLength
            }
        }
    }

    async loadChromosome(chr) {
        return this.getChromosome(chr)
    }

    async getAliasRecord(chr) {
        return undefined
    }

    getCytobands(chr) {
        return []
    }

    getChromosomes() {
        return [this.getChromosome(this.chr)]
    }

    get wgChromosomeNames() {
        return undefined
    }

    /**
     * Return the genome coordinate in kb for the give chromosome and position.
     * NOTE: This might return undefined if the chr is filtered from whole genome view.
     */
    getGenomeCoordinate(chr, bp) {
        if (chr === this.chr)
            return bp
    }

    /**
     * Return the chromosome and coordinate in bp for the given genome coordinate
     */
    getChromosomeCoordinate(genomeCoordinate) {
        return {chr: this.chr, position: genomeCoordinate}
    }


    /**
     * Return the offset in genome coordinates (kb) of the start of the given chromosome
     * NOTE:  This might return undefined if the chromosome is filtered from whole genome view.
     */
    getCumulativeOffset(chr) {
        return 0
    }

    /**
     * Return the nominal genome length, this is the length of the main chromosomes (no scaffolds, etc).
     */
    getGenomeLength() {
        return this.bpLength
    }


    async getSequence(chr, start, end) {
        if (chr === this.chr) {
            return this.sequence.substring(start, end)
        } else {
            return undefined
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
        if (chr === this.chr) {
            return new SequenceInterval(this.chr, 0, this.sequence.length, this.sequence)
        } else {
            return undefined
        }
    }
}

export default Genbank