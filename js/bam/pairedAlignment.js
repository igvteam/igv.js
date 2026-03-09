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
        return this.firstAlignment.firstOfPairStrand
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

    getGroupValue({option, tag}) {
        switch (option) {
            case "strand":
                return this.firstAlignment.strand + (this.secondAlignment ? this.secondAlignment.strand : '')
            case "FIRST_IN_PAIR_STRAND":
                return this.firstAlignment.isFirstOfPair() ? this.firstAlignment.strand : (this.secondAlignment ? this.secondAlignment.strand : '')
            case "START":
                return this.start
            case "INSERT_SIZE":
                return this.fragmentLength
            case "MATE_CHR":
                return undefined
            case "MQ":
                return this.firstAlignment.mq
            case "ALIGNED_READ_LENGTH":
                return this.end - this.start
            case "TAG":
                return this.getTag(tag)
            case 'PHASE':
                return this.getTag("HP")
            default:
                return
        }
    }
}

export default PairedAlignment
