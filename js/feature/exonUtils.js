import {translationDict} from "../sequenceTrack.js"

function getExonPhase(exon) {
    return (3 - exon.readingFrame) % 3
}

function getEonStart(exon) {
    return exon.cdStart || exon.start
}

function getExonEnd(exon) {
    return exon.cdEnd || exon.end
}

function getAminoAcidLetterWithExonGap(chr, strand, phase, phaseExtentStart, phaseExtentEnd, remainder, leftExon, exon, riteExon) {

    let ss
    let ee
    let stringA = ''
    let stringB = ''
    let triplet = ''

    const aminoAcidLetters = { left: '', rite: '' }
    if ('+' === strand) {
        stringB = this.browser.genome.getSequenceSync(chr, phaseExtentStart, phaseExtentEnd);

        if (undefined === stringB) {
            return undefined
        }

        [ ss, ee ] = [ getExonEnd(leftExon) - (3 - phase), getExonEnd(leftExon)];
        stringA = this.browser.genome.getSequenceSync(chr, ss, ee);

        if (undefined === stringA) {
            return undefined
        }

        triplet = stringA + stringB
        aminoAcidLetters.left = { triplet, aminoAcidLetter: translationDict[ triplet ]}

        if (remainder) {
            stringA = this.browser.genome.getSequenceSync(chr, remainder.start, remainder.end)

            if (undefined === stringA) {
                return undefined
            }

            const ritePhase = getExonPhase(riteExon)
            const riteStart = getEonStart(riteExon)
            stringB = this.browser.genome.getSequenceSync(chr, riteStart, riteStart + ritePhase)

            if (undefined === stringB) {
                return undefined
            }

            triplet = stringA + stringB
            aminoAcidLetters.rite = { triplet, aminoAcidLetter: translationDict[ triplet ] }
        } else {
            aminoAcidLetters.rite = undefined
        }


    } else {
        stringA = this.browser.genome.getSequenceSync(chr, phaseExtentStart, phaseExtentEnd);

        if (undefined === stringA) {
            return undefined
        }

        [ ss, ee ] = [ getEonStart(riteExon), getEonStart(riteExon) + (3 - phase)];
        stringB = this.browser.genome.getSequenceSync(chr, ss, ee);

        if (undefined === stringB) {
            return undefined
        }

        triplet = stringA + stringB;
        triplet = triplet.split('').reverse().join('')
        aminoAcidLetters.rite = { triplet, aminoAcidLetter: translationDict[ triplet ] }

        if (remainder) {
            stringA = this.browser.genome.getSequenceSync(chr, remainder.start, remainder.end)

            if (undefined === stringA) {
                return undefined
            }

            const leftPhase = getExonPhase(leftExon)
            const leftEnd = getExonEnd(leftExon)
            stringB = this.browser.genome.getSequenceSync(chr, leftEnd - leftPhase, leftEnd)

            if (undefined === stringB) {
                return undefined
            }

            triplet = stringA + stringB
            triplet = triplet.split('').reverse().join('')
            aminoAcidLetters.left = { triplet, aminoAcidLetter: translationDict[ triplet ] }

        }
    }

    const left = `left( triplet: ${ aminoAcidLetters.left.triplet }, letter ${ aminoAcidLetters.left.aminoAcidLetter } )`
    const rite = aminoAcidLetters.rite ? `rite( triplet: ${ aminoAcidLetters.rite.triplet }, letter ${ aminoAcidLetters.rite.aminoAcidLetter })` : 'rite( NO REMAINDER)'
    console.log(`amino-acids: ${ left } ${ rite }`)
    return aminoAcidLetters
}

export { getExonPhase, getEonStart, getExonEnd, getAminoAcidLetterWithExonGap }
