import PairedAlignment from "./pairedAlignment.js"
import BamAlignmentRow from "./bamAlignmentRow.js"

function canBePaired(alignment) {
    return alignment.isPaired() &&
        alignment.mate &&
        alignment.isMateMapped() &&
        alignment.chr === alignment.mate.chr &&
        (alignment.isFirstOfPair() || alignment.isSecondOfPair()) && !(alignment.isSecondary() || alignment.isSupplementary());
}


function pairAlignments(rows) {

    const pairCache = {};
    const result = [];

    for (let row of rows) {
        for (let alignment of row.alignments) {
            if (canBePaired(alignment)) {
                let pairedAlignment = pairCache[alignment.readName];
                if (pairedAlignment) {
                    pairedAlignment.setSecondAlignment(alignment);
                    pairCache[alignment.readName] = undefined;   // Don't need to track this anymore.
                } else {
                    pairedAlignment = new PairedAlignment(alignment);
                    pairCache[alignment.readName] = pairedAlignment;
                    result.push(pairedAlignment);
                }
            } else {
                result.push(alignment);
            }
        }
    }
    return result;
}

function unpairAlignments(rows) {
    const result = [];
    for (let row of rows) {
        for (let alignment of row.alignments) {
            if (alignment instanceof PairedAlignment) {
                if (alignment.firstAlignment) result.push(alignment.firstAlignment);  // shouldn't need the null test
                if (alignment.secondAlignment) result.push(alignment.secondAlignment);
            } else {
                result.push(alignment);
            }
        }
    }
    return result;
}

function packAlignmentRows(alignments, start, end, showSoftClips) {

    if (!alignments) {
        return undefined;
    } else if (alignments.length === 0) {
        return [];
    } else {

        alignments.sort(function (a, b) {
            return showSoftClips ? a.scStart - b.scStart : a.start - b.start;
        });
        // bucketStart = Math.max(start, alignments[0].start);
        const firstAlignment = alignments[0];
        let bucketStart = Math.max(start, showSoftClips ? firstAlignment.scStart : firstAlignment.start);
        let nextStart = bucketStart;

        const bucketList = [];
        for(let alignment of alignments) {
            //var buckListIndex = Math.max(0, alignment.start - bucketStart);
            const s = showSoftClips ? alignment.scStart : alignment.start;
            const buckListIndex = Math.max(0, s - bucketStart);
            if (bucketList[buckListIndex] === undefined) {
                bucketList[buckListIndex] = [];
            }
            bucketList[buckListIndex].push(alignment);
        }

        let allocatedCount = 0;
        let lastAllocatedCount = 0;
        const packedAlignmentRows = [];
        const alignmentSpace = 2;
        try {
            while (allocatedCount < alignments.length) {
                const alignmentRow = new BamAlignmentRow();
                while (nextStart <= end) {
                    let bucket = undefined;
                    let index;
                    while (!bucket && nextStart <= end) {
                        index = nextStart - bucketStart;
                        if (bucketList[index] === undefined) {
                            ++nextStart;                     // No alignments at this index
                        } else {
                            bucket = bucketList[index];
                        }
                    } // while (bucket)
                    if (!bucket) {
                        break;
                    }
                    const alignment = bucket.pop();
                    if (0 === bucket.length) {
                        bucketList[index] = undefined;
                    }

                    alignmentRow.alignments.push(alignment);
                    nextStart = showSoftClips ?
                        alignment.scStart + alignment.scLengthOnRef + alignmentSpace :
                        alignment.start + alignment.lengthOnRef + alignmentSpace;
                    ++allocatedCount;
                } // while (nextStart)

                if (alignmentRow.alignments.length > 0) {
                    packedAlignmentRows.push(alignmentRow);
                }

                nextStart = bucketStart;
                if (allocatedCount === lastAllocatedCount) break;   // Protect from infinite loops
                lastAllocatedCount = allocatedCount;
            } // while (allocatedCount)
        } catch (e) {
            console.error(e);
            throw e;
        }

        return packedAlignmentRows;
    }
}

export {canBePaired, pairAlignments, unpairAlignments, packAlignmentRows}