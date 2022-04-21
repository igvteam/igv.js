/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import IGVGraphics from "./igv-canvas.js"
import {Alert} from '../node_modules/igv-ui/dist/igv-ui.js'
import {isSecureContext} from "./util/igvUtils.js"
import {reverseComplementSequence} from "./util/sequenceUtils.js"

const defaultSequenceTrackOrder = Number.MIN_SAFE_INTEGER

const translationDict = {
    'TTT': 'F',
    'TTC': 'F',
    'TTA': 'L',
    'TTG': 'L',
    'CTT': 'L',
    'CTC': 'L',
    'CTA': 'L',
    'CTG': 'L',
    'ATT': 'I',
    'ATC': 'I',
    'ATA': 'I',
    'ATG': 'M',
    'GTT': 'V',
    'GTC': 'V',
    'GTA': 'V',
    'GTG': 'V',
    'TCT': 'S',
    'TCC': 'S',
    'TCA': 'S',
    'TCG': 'S',
    'CCT': 'P',
    'CCC': 'P',
    'CCA': 'P',
    'CCG': 'P',
    'ACT': 'T',
    'ACC': 'T',
    'ACA': 'T',
    'ACG': 'T',
    'GCT': 'A',
    'GCC': 'A',
    'GCA': 'A',
    'GCG': 'A',
    'TAT': 'Y',
    'TAC': 'Y',
    'TAA': 'STOP',
    'TAG': 'STOP',
    'CAT': 'H',
    'CAC': 'H',
    'CAA': 'Q',
    'CAG': 'Q',
    'AAT': 'N',
    'AAC': 'N',
    'AAA': 'K',
    'AAG': 'K',
    'GAT': 'D',
    'GAC': 'D',
    'GAA': 'E',
    'GAG': 'E',
    'TGT': 'C',
    'TGC': 'C',
    'TGA': 'STOP',
    'TGG': 'W',
    'CGT': 'R',
    'CGC': 'R',
    'CGA': 'R',
    'CGG': 'R',
    'AGT': 'S',
    'AGC': 'S',
    'AGA': 'R',
    'AGG': 'R',
    'GGT': 'G',
    'GGC': 'G',
    'GGA': 'G',
    'GGG': 'G'
}

const complement = {}
const t1 = ['A', 'G', 'C', 'T', 'Y', 'R', 'W', 'S', 'K', 'M', 'D', 'V', 'H', 'B', 'N', 'X']
const t2 = ['T', 'C', 'G', 'A', 'R', 'Y', 'W', 'S', 'M', 'K', 'H', 'B', 'D', 'V', 'N', 'X']
for (let i = 0; i < t1.length; i++) {
    complement[t1[i]] = t2[i]
    complement[t1[i].toLowerCase()] = t2[i].toLowerCase()
}

const DEFAULT_HEIGHT = 25
const TRANSLATED_HEIGHT = 115
const SEQUENCE_HEIGHT = 15
const FRAME_HEIGHT = 25
const FRAME_BORDER = 5

class SequenceTrack {

    constructor(config, browser) {

        this.type = "sequence"
        this.browser = browser
        this.removable = false
        this.config = config
        this.name = "Sequence"
        this.id = "sequence"
        this.sequenceType = config.sequenceType || "dna"             //   dna | rna | prot
        this.disableButtons = false
        this.order = config.order || defaultSequenceTrackOrder
        this.ignoreTrackMenu = false

        this.reversed = config.reversed === true
        this.frameTranslate = config.frameTranslate === true
        this.height = this.frameTranslate ? TRANSLATED_HEIGHT : DEFAULT_HEIGHT

    }

    menuItemList() {
        return [
            {
                name: this.reversed ? "Forward" : "Reverse",
                click: () => {
                    this.reversed = !this.reversed
                    this.trackView.repaintViews()
                }
            },
            {
                name: this.frameTranslate ? "Close Translation" : "Three-frame Translate",
                click: () => {
                    this.frameTranslate = !this.frameTranslate
                    if (this.frameTranslate) {
                        for (let vp of this.trackView.viewports) {
                            vp.setContentHeight(TRANSLATED_HEIGHT)
                        }
                        this.trackView.setTrackHeight(TRANSLATED_HEIGHT)
                    } else {
                        for (let vp of this.trackView.viewports) {
                            vp.setContentHeight(DEFAULT_HEIGHT)
                        }
                        this.trackView.setTrackHeight(DEFAULT_HEIGHT)
                    }
                    this.trackView.repaintViews()

                }
            }
        ]
    }


    contextMenuItemList(clickState) {
        const viewport = clickState.viewport
        if (viewport.referenceFrame.bpPerPixel <= 1) {
            const pixelWidth = viewport.getWidth()
            const bpWindow = pixelWidth * viewport.referenceFrame.bpPerPixel
            const chr = viewport.referenceFrame.chr
            const start = Math.floor(viewport.referenceFrame.start)
            const end = Math.ceil(start + bpWindow)
            const items = [
                {
                    label: this.reversed ? 'View visible sequence (reversed)...' : 'View visible sequence...',
                    click: async () => {
                        let seq = await this.browser.genome.sequence.getSequence(chr, start, end)
                        if (this.reversed) {
                            seq = reverseComplementSequence(seq)
                        }
                        Alert.presentAlert(seq)
                    }
                }
            ]
            if (isSecureContext()) {
                items.push({
                    label: 'Copy visible sequence',
                    click: async () => {
                        let seq = await this.browser.genome.sequence.getSequence(chr, start, end)
                        if (this.reversed) {
                            seq = reverseComplementSequence(seq)
                        }
                        try {
                            await navigator.clipboard.writeText(seq)
                        } catch (e) {
                            console.error(e)
                            Alert.presentAlert(`error copying sequence to clipboard ${e}`)
                        }
                    }

                })
            }
            items.push('<hr/>')

            return items
        } else {
            return undefined
        }
    }


    translateSequence(seq) {

        const threeFrame = [[], [], []]

        for (let fNum of [0, 1, 2]) {
            let idx = fNum

            while ((seq.length - idx) >= 3) {
                let st = seq.slice(idx, idx + 3)
                if (this.reversed) {
                    st = st.split('').reverse().join('')
                }

                const aa = translationDict[st.toUpperCase()] || ""
                threeFrame[fNum].push({
                    codons: st,
                    aminoA: aa
                })
                idx += 3
            }
        }

        return threeFrame
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        start = Math.floor(start)
        end = Math.floor(end)
        if (bpPerPixel && bpPerPixel > 1) {
            return null
        } else {
            const sequence = await this.browser.genome.sequence.getSequence(chr, start, end)
            return {
                bpStart: start,
                sequence: sequence
            }
        }
    }

    draw(options) {

        const ctx = options.context

        if (options.features) {

            let sequence = options.features.sequence

            if (this.reversed) {
                sequence = sequence.split('').map(function (cv) {
                    return complement[cv]
                }).join('')
            }

            const sequenceBpStart = options.features.bpStart  // genomic position at start of sequence
            const bpEnd = 1 + options.bpStart + (options.pixelWidth * options.bpPerPixel)

            for (let bp = Math.floor(options.bpStart); bp <= bpEnd; bp++) {

                const seqIdx = Math.floor(bp - sequenceBpStart)

                if (seqIdx >= 0 && seqIdx < sequence.length) {
                    const baseLetter = sequence[seqIdx]
                    const offsetBP = bp - options.bpStart
                    const aPixel = offsetBP / options.bpPerPixel
                    const pixelWidth = 1 / options.bpPerPixel
                    const color = this.fillColor(baseLetter)

                    if (options.bpPerPixel > 1 / 10) {
                        IGVGraphics.fillRect(ctx, aPixel, 5, pixelWidth, SEQUENCE_HEIGHT - 5, {fillStyle: color})
                    } else {
                        let textPixel = aPixel + 0.5 * (pixelWidth - ctx.measureText(baseLetter).width)
                        IGVGraphics.strokeText(ctx, baseLetter, textPixel, SEQUENCE_HEIGHT, {strokeStyle: color})
                    }
                }
            }

            if (this.frameTranslate) {

                let y = SEQUENCE_HEIGHT + 2 * FRAME_BORDER
                const translatedSequence = this.translateSequence(sequence)

                for (let fNum = 0; fNum < translatedSequence.length; fNum++) {    // == 3, 1 for each frame

                    const aaSequence = translatedSequence[fNum]  // AA sequence for this frame

                    for (let idx = 0; idx < aaSequence.length; idx++) {

                        let color = 0 === idx % 2 ? 'rgb(160,160,160)' : 'rgb(224,224,224)'
                        const cv = aaSequence[idx]

                        const bpPos = sequenceBpStart + fNum + (idx * 3)
                        const bpOffset = bpPos - options.bpStart
                        const p0 = Math.floor(bpOffset / options.bpPerPixel)
                        const p1 = Math.floor((bpOffset + 3) / options.bpPerPixel)
                        const pc = Math.round((p0 + p1) / 2)

                        if (p1 < 0) {
                            continue   // off left edge
                        } else if (p0 > options.pixelWidth) {
                            break      // off right edge
                        }

                        let aaLabel = cv.aminoA
                        if (cv.aminoA.indexOf('STOP') > -1) {
                            color = 'rgb(255, 0, 0)'
                            aaLabel = 'STOP' //Color blind accessible
                        } else if (cv.aminoA === 'M') {
                            color = 'rgb(0, 153, 0)'
                            aaLabel = 'START' //Color blind accessible
                        }

                        IGVGraphics.fillRect(ctx, p0, y, p1 - p0, FRAME_HEIGHT, {fillStyle: color})

                        if (options.bpPerPixel <= 1 / 10) {
                            IGVGraphics.strokeText(ctx, aaLabel, pc - (ctx.measureText(aaLabel).width / 2), y + 15)
                        }
                    }
                    y += (FRAME_HEIGHT + FRAME_BORDER)
                }
            }
        }
    }

    get supportsWholeGenome() {
        return false
    }

    computePixelHeight(ignore) {
        this.height = this.frameTranslate ? TRANSLATED_HEIGHT : DEFAULT_HEIGHT
        return this.height
    }

    fillColor(index) {

        if (this.color) {
            return this.color
        } else if ("dna" === this.sequenceType) {
            return this.browser.nucleotideColors[index] || 'gray'
        } else {
            return 'rgb(0, 0, 150)'
        }
    }

    /**
     * Return the current state of the track.  Used to create sessions and bookmarks.
     *
     * @returns {*|{}}
     */
    getState() {
        const config = {
            type: "sequence"
        }
        if (this.order !== defaultSequenceTrackOrder) {
            config.order = this.order
        }
        if (this.reversed) {
            config.revealed = true
        }
        return config
    }

}

export {defaultSequenceTrackOrder}

export default SequenceTrack


