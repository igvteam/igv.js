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

    popupData(genomicLocation, hiddenTags, showTags) {

        let nameValues = this.firstAlignment.popupData(genomicLocation, hiddenTags, showTags)

        if (this.secondAlignment) {
            nameValues.push("-------------------------------")
            nameValues = nameValues.concat(this.secondAlignment.popupData(genomicLocation, hiddenTags, showTags))
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

    getGroupValue({option, tag}) {
        switch (option) {
            case "strand":
                return this.isNegativeStrand() ? '-' : '+'
            case "FIRST_IN_PAIR_STRAND":
                if (this.isPaired()) {
                    if (this.isFirstOfPair()) {
                        return this.isNegativeStrand() ? '-' : '+'
                    } else if (this.isSecondOfPair()) {
                        return this.isNegativeStrand() ? '+' : '-'
                    } else {
                        return
                    }
                } else {
                    return
                }
            case "START":
                return this.start
            case "INSERT_SIZE":
                return this.fragmentLength
            case "MATE_CHR":
                return this.mate ? this.mate.chr : undefined
            case "MQ":
                return this.mq
            case "ALIGNED_READ_LENGTH":
                return this.lengthOnRef
            case "TAG": {
                return this.tags()[tag]
            }
            case 'PHASE':
                return this.tags()["HP"]
            case 'READ_ORDER':
                if (this.isPaired() && this.isFirstOfPair()) {
                    return "FIRST"
                } else if (this.isPaired() && this.isSecondOfPair()) {
                    return "SECOND"
                } else {
                    return ""
                }


            default:
                return
        }
    }
}

export default PairedAlignment
