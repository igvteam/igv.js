// This is a port of trix-js from the GMOD repository:  https://github.com/GMOD/trix-js,
// developed by Colin Diesh, Robert Buels, and Matt Morgan.   The purpose of the port is to (1) remove dependencies
// on Node classes and objects, such as "Buffer",  and (2) re-write in javascript to run in the browser without
// any further transformations.   Modifications done by myself, James Robinson
//
// A copy of the license for the GMOD trix-js distribution on which this is based may be downloaded
// from:  https://raw.githubusercontent.com/GMOD/trix-js/main/LICENSE


import {isgzipped, ungzip} from "../../node_modules/igv-utils/src/bgzf.js"

const CHUNK_SIZE = 65536

// this is the number of hex characters to use for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

// https://stackoverflow.com/a/9229821/2129219
//function uniqBy<T>(a: T[], key: (elt: T) => string) {
function uniqBy(a, key) {
    const seen = new Set()
    return a.filter(item => {
        const k = key(item)
        return seen.has(k) ? false : seen.add(k)
    })
}

export default class Trix {

    ixFile  //ixFile: GenericFilehandle
    ixxFile // ixxFile: GenericFilehandle
    maxResults  //number

    constructor(
        ixxFile,
        ixFile,
        maxResults = 20,
    ) {
        this.ixFile = ixFile
        this.ixxFile = ixxFile
        this.maxResults = maxResults
    }

    //async search(searchString: string, opts?: { signal?: AbortSignal }) {
    async search(searchString, opts) {

        let resultArr = []                    //as [string, string][]
        const searchWords = searchString.split(' ')

        // we only search one word at a time
        const searchWord = searchWords[0].toLowerCase()
        const res = await this._getBuffer(searchWord, opts)
        if (!res) {
            return []
        }

        let {end, buffer} = res
        let done = false
        while (!done) {
            let foundSomething = false
            const str =  arrayBufferToString(buffer)  // buffer.toString()

            // slice to lastIndexOf('\n') to make sure we get complete records
            // since the buffer fetch could get halfway into a record
            const lines = str
                .slice(0, str.lastIndexOf('\n'))
                .split('\n')
                .filter(f => !!f)

            const hits = lines
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                .filter(line => {
                    const word = line.split(' ')[0]
                    const match = word.startsWith(searchWord)
                    if (!foundSomething && match) {
                        foundSomething = true
                    }

                    // we are done scanning if we are lexicographically greater than the
                    // search string
                    if (word.slice(0, searchWord.length) > searchWord) {
                        done = true
                    }
                    return match
                })
                .map(line => {
                    const [term, ...parts] = line.split(' ')
                    return parts.map(elt => [term, elt.split(',')[0]])
                })
                .flat()          //as [string, string][]

            // if we are not done, and we haven't filled up maxResults with hits yet,
            // then refetch
            if (resultArr.length + hits.length < this.maxResults && !done) {
                // eslint-disable-next-line no-await-in-loop
                // const res2 = await this.ixFile.read(
                //     Buffer.alloc(CHUNK_SIZE),
                //     0,
                //     CHUNK_SIZE,
                //     end,
                //     opts,
                // )

                const res2= await fetch(this.ixFile, {
                    cache: "no-cache",
                    headers: {
                        "Range": `bytes=${end}-${end + CHUNK_SIZE}`
                    }
                })
                let buffer2 = await res2.arrayBuffer()

                // early break if empty response
                if (!res2.byteLength) {
                    resultArr = resultArr.concat(hits)
                    break
                }
                buffer = concatBuffers(buffer, buffer2) //  Buffer.concat([buffer, buffer2])
                end += CHUNK_SIZE
            }

                // if we have filled up the hits, or we are detected to be done via the
            // filtering, then return
            else if (resultArr.length + hits.length >= this.maxResults || done) {
                resultArr = resultArr.concat(hits)
                break
            }
        }

        // deduplicate results based on the detail column (resultArr[1])
        return uniqBy(resultArr, elt => elt[1]).slice(0, this.maxResults)
    }

    //private async getIndex(opts?: { signal?: AbortSignal }) {
    async getIndex(opts) {
        // const file = await this.ixxFile.readFile({
        //     encoding: 'utf8',
        //     ...opts,
        // })

        const res = await fetch(this.ixxFile)
        const file = await res.text()

        return file
            .split('\n')
            .filter(f => !!f)
            .map(line => {
                const p = line.length - ADDRESS_SIZE
                const prefix = line.slice(0, p)
                const posStr = line.slice(p)
                const pos = Number.parseInt(posStr, 16)
                return [prefix, pos]          //as [string, number]
            })
    }

    async _getBuffer(
        searchWord,       //: string,
        opts  //?: { signal?: AbortSignal },
    ) {
        let start = 0
        let end = 65536
        const indexes = await this.getIndex(opts)
        for (let i = 0; i < indexes.length; i++) {
            const [key, value] = indexes[i]
            const trimmedKey = key.slice(0, searchWord.length)
            if (trimmedKey < searchWord) {
                start = value
                end = value + 65536
            }
        }

        // Return the buffer and its end position in the file.
        const len = end - start
        if (len < 0) {
            return undefined
        }
       // const res = await this.ixFile.read(Buffer.alloc(len), 0, len, start, opts)
        const res = await fetch(this.ixFile, {
            cache: "no-cache",
            headers: {
                "Range": `bytes=${start}-${start + len}`
            }
        })
        const buffer = await res.arrayBuffer()
      return {
            buffer,
            end,
        }
    }
}

/*
read(
    buf: Buffer,
    offset: number,
    length: number,
    position: number,
    opts?: FilehandleOptions,
  )
 */

// TODO -- move these to some shared utility file
function arrayBufferToString(arraybuffer) {

    let plain
    if (isgzipped(arraybuffer)) {
        plain = ungzip(arraybuffer)
    } else {
        plain = new Uint8Array(arraybuffer)
    }

    if ('TextDecoder' in getGlobalObject()) {
        return new TextDecoder().decode(plain)
    } else {
        return decodeUTF8(plain)
    }
}

function concatBuffers(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}

function getGlobalObject() {
    if (typeof self !== 'undefined') {
        return self
    }
    if (typeof global !== 'undefined') {
        return global
    } else {
        return window
    }
}
