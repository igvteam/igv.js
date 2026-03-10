function createRegionKey(chr, start, end) {
    return `${chr}-${start}-${end}`
}

function parseRegionKey(regionKey) {
    let regionParts = regionKey.split('-')
    let ee = parseInt(regionParts.pop())
    let ss = parseInt(regionParts.pop())
    let chr = regionParts.join('-')

    return {chr, start: ss, end: ee, locus: `${chr}:${ss}-${ee}`, bedRecord: `${chr}\t${ss}\t${ee}`}
}

export {createRegionKey, parseRegionKey}

