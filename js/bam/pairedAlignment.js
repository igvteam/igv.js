import orientationTypes from "./orientationTypes.js"

class PairedAlignment {

    constructor(firstAlignment) {

        this.paired = true
        this.firstAlignment = firstAlignment
        this.chr = firstAlignment.chr
        this.readName = firstAlignment.readName

        if (firstAlignment.start < firstAlignment.mate.position) {
            this.start = firstAlignment.start
            this.scStart = firstAlignment.scStart
            this.connectingStart = firstAlignment.start + firstAlignment.lengthOnRef
            this.connectingEnd = firstAlignment.mate.position
        } else {
            this.start = firstAlignment.mate.position
            this.scStart = this.start
            this.connectingStart = firstAlignment.mate.position
            this.connectingEnd = firstAlignment.start
        }

        this.end = Math.max(firstAlignment.mate.position, firstAlignment.start + firstAlignment.lengthOnRef)  // Approximate
        this.lengthOnRef = this.end - this.start

        let scEnd = Math.max(this.end, firstAlignment.scStart + firstAlignment.scLengthOnRef)
        this.scLengthOnRef = scEnd - this.scStart

    }

    setSecondAlignment(secondAlignment) {

        // TODO -- check the chrs are equal,  error otherwise
        this.secondAlignment = secondAlignment
        const firstAlignment = this.firstAlignment

        if (secondAlignment.start > firstAlignment.start) {
            this.connectingEnd = secondAlignment.start
        } else {
            this.connectingStart = secondAlignment.start + secondAlignment.lengthOnRef
        }

        this.start = Math.min(firstAlignment.start, secondAlignment.start)
        this.end = Math.max(firstAlignment.start + firstAlignment.lengthOnRef, secondAlignment.start + secondAlignment.lengthOnRef)
        this.lengthOnRef = this.end - this.start

        this.scStart = Math.min(firstAlignment.scStart, secondAlignment.scStart)
        const scEnd = Math.max(firstAlignment.scStart + firstAlignment.scLengthOnRef, secondAlignment.scStart + secondAlignment.scLengthOnRef)
        this.scLengthOnRef = scEnd - this.scStart

    }

    containsLocation(genomicLocation, showSoftClips) {
        const s = showSoftClips ? this.scStart : this.start
        const l = showSoftClips ? this.scLengthOnRef : this.lengthOnRef
        return (genomicLocation >= s && genomicLocation <= (s + l))
    }

    alignmentContaining(genomicLocation, showSoftClips) {
        if (this.firstAlignment.containsLocation(genomicLocation, showSoftClips)) {
            return this.firstAlignment
        } else if (this.secondAlignment && this.secondAlignment.containsLocation(genomicLocation, showSoftClips)) {
            return this.secondAlignment
        } else {
            return undefined
        }
    }

    async popupData(genomicLocation, hiddenTags, showTags) {

        let nameValues = await this.firstAlignment.popupData(genomicLocation, hiddenTags, showTags)

        if (this.secondAlignment) {
            nameValues.push("-------------------------------")
            nameValues = nameValues.concat(await this.secondAlignment.popupData(genomicLocation, hiddenTags, showTags))
        }
        return nameValues
    }

    isPaired() {
        return true // By definition
    }

    isMateMapped() {
        return true // By definition
    }

    isProperPair() {
        return this.firstAlignment.isProperPair()
    }

    get fragmentLength() {
        return Math.abs(this.firstAlignment.fragmentLength)
    }

    get firstOfPairStrand() {
        return this.firstAlignment.isFirstOfPair() ? this.firstAlignment.strand :
            (this.secondAlignment && this.setSecondAlignment.isFirstOfPair()) ? this.secondAlignment.strand : ""
    }

    get pairOrientation() {
        return this.firstAlignment.pairOrientation
    }

    hasTag(str) {
        return this.firstAlignment.hasTag(str) || (this.secondAlignment && this.secondAlignment.hasTag(str))
    }

    getTag(tagName) {
        const firstTag = this.firstAlignment.getTag(tagName)
        const secondTag = this.secondAlignment ? this.secondAlignment.getTag(tagName) : undefined
        if (firstTag !== undefined && secondTag !== undefined && firstTag !== secondTag) {
            return `${firstTag} / ${secondTag}`
        }
        return firstTag !== undefined ? firstTag : secondTag
    }

    getAlignmentAtGenomicLocation(genomicLocation) {
        if (this.firstAlignment.containsLocation(genomicLocation)) {
            return this.firstAlignment
        } else if (this.secondAlignment && this.secondAlignment.containsLocation(genomicLocation)) {
            return this.secondAlignment
        } else {
            return undefined
        }
    }

    getGroupValue(groupBy, expectedPairOrientation) {

        let tag, chr, pos
        if (groupBy.startsWith("tag:")) {
            tag = groupBy.substring(4)
            groupBy = "tag"
        } else if (groupBy.startsWith("base:") || groupBy.startsWith("insertion:")) {
            const tokens = groupBy.split(":")
            if (tokens.length === 3) {
                groupBy = tokens[0]
                chr = tokens[1]
                pos = Number.parseInt(tokens[2].replaceAll(",", "")) - 1
            }
        }

        switch (groupBy) {

            case 'strand':
                return this.firstAlignment.strand + (this.secondAlignment ? this.secondAlignment.strand : '')
            case 'firstOfPairStrand':
                return this.firstOfPairStrand
            case 'mateChr':
                return ''
            case 'pairOrientation':
                return orientationTypes[expectedPairOrientation][this.pairOrientation] || ""
            case 'chimeric':
                return this.hasTag('SA') ? "chimeric" : ""
            case 'supplementary':
                return this.firstAlignment.isSupplementary() ||
                (this.secondAlignment && this.secondAlignment.isSupplementary()) ? "supplementary" : ""
            case 'readOrder':
                    return ""
            case 'phase':
                return this.getTag('HP') || ""
            case 'tag':
                return this.getTag(tag) || ""
            case 'base':
                if (chr && pos) {
                    const alignment = this.getAlignmentAtGenomicLocation(pos)
                    if (alignment) {
                        const baseAtPos = alignment.readBaseAt(pos)
                        if (baseAtPos) {
                            return baseAtPos
                        } else {
                            return "GAP"
                        }
                    }
                }
                return ""
            case 'insertion':
                if (chr && pos) {
                    const alignment = this.getAlignmentAtGenomicLocation(pos)
                    if (alignment) {
                        const insertion = alignment.insertionAtGenomicLocation(pos)
                        return insertion ? alignment.seq.substring(insertion.seqOffset, insertion.seqOffset + insertion.len) : ""
                    }
                }
                return ""

            default:
                return ""
        }
    }

}

export default PairedAlignment
