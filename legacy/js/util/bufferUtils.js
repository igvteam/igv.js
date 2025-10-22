
function concatenateArrayBuffers(arrayBuffers) {

    if (arrayBuffers.length === 1) {
        return arrayBuffers[0]
    }

    let len = 0
    for (const b of arrayBuffers) {
        len += b.byteLength
    }
    const c = new Uint8Array(len)
    let offset = 0
    for (const b of arrayBuffers) {
        c.set(new Uint8Array(b), offset)
        offset += b.byteLength
    }
    return c.buffer
}

export {concatenateArrayBuffers}