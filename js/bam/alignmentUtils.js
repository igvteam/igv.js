import PairedAlignment from "./pairedAlignment.js"
import BamAlignmentRow from "./bamAlignmentRow.js"

const alignmentSpace = 2

function canBePaired(alignment) {
    return alignment.isPaired() &&
        alignment.mate &&
        alignment.isMateMapped() &&
        alignment.chr === alignment.mate.chr &&
        (alignment.isFirstOfPair() || alignment.isSecondOfPair()) && !(alignment.isSecondary() || alignment.isSupplementary())
}


function pairAlignments(rows) {

    const pairCache = {}
    const result = []

    for (let row of rows) {
        for (let alignment of row.alignments) {
            if (canBePaired(alignment)) {
                let pairedAlignment = pairCache[alignment.readName]
                if (pairedAlignment) {
                    pairedAlignment.setSecondAlignment(alignment)
                    pairCache[alignment.readName] = undefined   // Don't need to track this anymore.
                } else {
                    pairedAlignment = new PairedAlignment(alignment)
                    pairCache[alignment.readName] = pairedAlignment
                    result.push(pairedAlignment)
                }
            } else {
                result.push(alignment)
            }
        }
    }
    return result
}

function unpairAlignments(rows) {
    const result = []
    for (let row of rows) {
        for (let alignment of row.alignments) {
            if (alignment instanceof PairedAlignment) {
                if (alignment.firstAlignment) result.push(alignment.firstAlignment)  // shouldn't need the null test
                if (alignment.secondAlignment) result.push(alignment.secondAlignment)
            } else {
                result.push(alignment)
            }
        }
    }
    return result
}

function packAlignmentRows(alignments, start, end, showSoftClips) {

    //console.log(`packAlignmentRows ${start} ${end}`)
    //const t0 = Date.now()

    if (!alignments) {
        return undefined
    } else if (alignments.length === 0) {
        return []
    } else {
        alignments.sort(function (a, b) {
            return showSoftClips ? a.scStart - b.scStart : a.start - b.start
        })

        const packedAlignmentRows = []
        let alignmentRow
        let nextStart = 0
        let nextIDX = 0
        const allocated = new Set()
        const startNewRow = () => {
            alignmentRow = new BamAlignmentRow()
            packedAlignmentRows.push(alignmentRow)
            nextStart = 0
            nextIDX = 0
            allocated.clear()
        }
        startNewRow()

        while (alignments.length > 0) {
            if (nextIDX >= 0 && nextIDX < alignments.length) {
                const alignment = alignments[nextIDX]
                allocated.add(alignment)
                alignmentRow.alignments.push(alignment)
                nextStart = showSoftClips ?
                    alignment.scStart + alignment.scLengthOnRef + alignmentSpace :
                    alignment.start + alignment.lengthOnRef + alignmentSpace
                nextIDX = binarySearch(alignments, (a) => (showSoftClips ? a.scStart : a.start) > nextStart, nextIDX)
            } else {
                // Remove allocated alignments and start new row
                alignments = alignments.filter(a => !allocated.has(a))
                startNewRow()
            }
        }
        //console.log(`Done in ${Date.now() - t0} ms`)
        return packedAlignmentRows
    }
}


/**
 * Return 0 <= i <= array.length such that !pred(array[i - 1]) && pred(array[i]).
 *
 * returns an index 0 ≤ i ≤ array.length such that the given predicate is false for array[i - 1] and true for array[i]* *
 */
function binarySearch(array, pred, min) {
    let lo = min - 1, hi = array.length
    while (1 + lo < hi) {
        const mi = lo + ((hi - lo) >> 1)
        if (pred(array[mi])) {
            hi = mi
        } else {
            lo = mi
        }
    }
    return hi
}


export {canBePaired, pairAlignments, unpairAlignments, packAlignmentRows}