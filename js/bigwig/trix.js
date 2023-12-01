// This is a port of trix-js from the GMOD repository:  https://github.com/GMOD/trix-js,
// developed by Colin Diesh, Robert Buels, and Matt Morgan.   The purpose of the port is to (1) remove dependencies
// on Node classes and objects, such as "Buffer",  and (2) re-write in javascript to run in the browser without
// any further transformations.   Modifications by myself, James Robinson
//
// A copy of the license for the GMOD trix-js distribution on which this is based may be downloaded
// from:  https://raw.githubusercontent.com/GMOD/trix-js/ma

import {igvxhr} from "../../node_modules/igv-utils/src/index.js"


// this is the number of hex characters to use for the address in ixixx, see
// https://github.com/GMOD/ixixx-js/blob/master/src/index.ts#L182
const ADDRESS_SIZE = 10

export default class Trix {

    ixFile  // URL to the ix file
    ixxFile  // URL to the ixx file
    bufferCache = new Map()

    constructor(ixxFile, ixFile) {
        this.ixFile = ixFile
        this.ixxFile = ixxFile
    }

    /**
     * @param searchString
     * @param opts
     * @returns {Promise<Map<any, any>|undefined|*[]>}
     */
    async search(searchString, opts) {

        const searchWords = searchString.split(' ')

        // we only support a single search term
        const searchWord = searchWords[0].toLowerCase()
        const str = await this._getBuffer(searchWord, opts)
        if (!str) {
            return undefined
        }

        const lines = str
            .slice(0, str.lastIndexOf('\n'))
            .split('\n')
            .filter(f => !!f)

        const matches = []
        for (let line of lines) {
            const word = line.split(' ')[0]
            const match = word.startsWith(searchWord)
            if (match) {
                matches.push(line)
            }
            // we are done scanning if we are lexicographically greater than the search string
            if (word.slice(0, searchWord.length) > searchWord) {
                break
            }
        }

        if(matches.length === 0) {
            return undefined
        } else {
            const results = new Map()
            for(let m of matches) {
                const [term, ...parts] = m.split(' ')
                results.set(term, parts.map(p => p.split(',')[0]))
            }
            return results
        }
    }

    async getIndex(opts) {
        if (!this.index) {
            this.index = await this._readIndex()
        }
        return this.index
    }

    async _readIndex(opts) {

        const file = await igvxhr.loadString(this.ixxFile)

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

    async _getBuffer(searchWord, opts) {

        let start = 0
        let end = 65536
        const indexes = await this.getIndex(opts)
        for (let i = 0; i < indexes.length; i++) {
            const [key, value] = indexes[i]
            const trimmedEnd = Math.min(key.length, searchWord.length)
            const trimmedKey = key.slice(0, trimmedEnd)
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

        if(this.bufferCache.has(start)) {
            return this.bufferCache.get(start)
        } else {
            const buffer = await igvxhr.loadString(this.ixFile, {range: {start, size: len}})
            this.bufferCache.set(start, buffer)
            return buffer
        }

    }
}
