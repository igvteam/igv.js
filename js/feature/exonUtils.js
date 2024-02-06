function getExonPhase(exon) {
    return (3 - exon.readingFrame) % 3
}

function getEonStart(exon) {
    return exon.cdStart || exon.start
}

function getExonEnd(exon) {
    return exon.cdEnd || exon.end
}

function constructTriplet(chr, strand, phase, leftExon, exon, rightExon) {

    let stringA
    let stringB
    let ss
    let ee
    if ('+' === strand) {

        [ ss, ee ] = [ getExonEnd(leftExon) - (3 - phase), getExonEnd(leftExon)]
        stringA = this.browser.genome.getSequenceSync(chr, ss, ee);

        [ ss, ee ] = [ getEonStart(exon) - phase, getEonStart(exon)];
        stringB = this.browser.genome.getSequenceSync(chr, ss, ee);

    } else {

        [ ss, ee ] = [ getExonEnd(exon), getExonEnd(exon) + phase]
        stringA = this.browser.genome.getSequenceSync(chr, ss, ee);

        [ ss, ee ] = [ getEonStart(rightExon), getEonStart(rightExon) + (3 - phase)];
        stringB = this.browser.genome.getSequenceSync(chr, ss, ee);
    }
    const str = stringA + stringB
    console.log(`${ str }`)
    return str
}

export { getExonPhase, getEonStart, getExonEnd, constructTriplet }
