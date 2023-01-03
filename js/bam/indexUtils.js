function optimizeChunks(chunks, lowest) {

    if (chunks.length === 0) return chunks

    chunks.sort(function (c0, c1) {

        const dif = c0.minv.block - c1.minv.block
        if (dif !== 0) {
            return dif
        } else {
            return c0.minv.offset - c1.minv.offset
        }
    })

    if(chunks.length <= 1) {
        return chunks
    }

    // console.log("Before trimming " + chunks.length)
    // for (let c of chunks) {
    //     console.log(`${c.minv.block} ${c.minv.offset}  -  ${c.maxv.block} ${c.maxv.offset}`)
    // }

    if (lowest) {
        chunks = chunks.filter(c => c.maxv.isGreaterThan(lowest))
    }

    // console.log("Before merging " + chunks.length)
    // for (let c of chunks) {
    //     console.log(`${c.minv.block} ${c.minv.offset}  -  ${c.maxv.block} ${c.maxv.offset}`)
    // }

    const mergedChunks = []
    let lastChunk
    for (let chunk of chunks) {

        if (!lastChunk) {
            mergedChunks.push(chunk)
            lastChunk = chunk
        } else {
            if (canMerge(lastChunk, chunk)) {
                if (chunk.maxv.isGreaterThan(lastChunk.maxv)) {
                    lastChunk.maxv = chunk.maxv
                }
            } else {
                mergedChunks.push(chunk)
                lastChunk = chunk
            }
        }
    }

    // console.log("After merging " + mergedChunks.length)
    // for (let c of mergedChunks) {
    //     console.log(`${c.minv.block} ${c.minv.offset}  -  ${c.maxv.block} ${c.maxv.offset}`)
    // }

    return mergedChunks
}


/**
 * Merge 2 blocks if the file position gap between them is < 16 kb, and the total size is < ~5 mb
 * @param chunk1
 * @param chunk2
 * @returns {boolean|boolean}
 */
function canMerge(chunk1, chunk2) {
    const gap = chunk2.minv.block - chunk1.maxv.block
    const sizeEstimate = chunk1.maxv.block - chunk1.minv.block
    return gap < 65000 && sizeEstimate < 5000000
}

export {optimizeChunks}

