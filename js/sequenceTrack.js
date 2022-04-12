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
import {appleCrayonRGBA} from "./util/colorPalletes.js"

const TRACK_HEIGHT_FRAME_TRANSLATE = 115
const TRACK_HEIGHT = 16

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

class SequenceTrack {

    constructor(config, browser) {

        this.type = "sequence"
        this.browser = browser
        this.removable = false
        this.config = config
        this.name = "Sequence"
        this.id = "sequence"
        this.sequenceType = config.sequenceType || "dna"             //   dna | rna | prot
        // this.height = 25
        this.height = TRACK_HEIGHT
        this.disableButtons = false
        this.order = config.order || defaultSequenceTrackOrder
        this.ignoreTrackMenu = false

        this.reversed = false
        this.frameTranslate = false

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
                            vp.setContentHeight(TRACK_HEIGHT_FRAME_TRANSLATE)
                        }
                        this.trackView.setTrackHeight(TRACK_HEIGHT_FRAME_TRANSLATE)
                    } else {
                        for (let vp of this.trackView.viewports) {
                            vp.setContentHeight(TRACK_HEIGHT)
                        }
                        this.trackView.setTrackHeight(TRACK_HEIGHT)
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
        // IGVGraphics.fillRect(ctx, 0, 0, ctx.canvas.width, ctx.canvas.height, { fillStyle: appleCrayonRGBA('grape', 0.5) })

        if (options.features) {

            const sequence = options.features.sequence
            const sequenceBpStart = options.features.bpStart
            const bpEnd = 1 + options.bpStart + (options.pixelWidth * options.bpPerPixel)

            const dimen = TRACK_HEIGHT
            const featureHeight = Math.floor(0.75 * dimen)
            const y = Math.floor((dimen - featureHeight)/2)

            for (let bp = sequenceBpStart; bp <= bpEnd; bp++) {

                const seqOffsetBp = Math.floor(bp - sequenceBpStart)

                if (seqOffsetBp < sequence.length) {
                    let letter = sequence[seqOffsetBp]

                    if (this.reversed) {
                        letter = complement[letter] || ""
                    }

                    const offsetBP = bp - options.bpStart
                    const xStart = offsetBP / options.bpPerPixel
                    const xEnd = (offsetBP + 1) / options.bpPerPixel

                    const color = this.fillColor(letter)

                    if (options.bpPerPixel > 1 / 10) {
                        IGVGraphics.fillRect(ctx, xStart, y, xEnd - xStart, featureHeight, {fillStyle: color})
                    } else {
                        const xPixel = 0.5 * (xStart + xEnd - ctx.measureText(letter).width)
                        IGVGraphics.strokeText(ctx, letter, xPixel, featureHeight, {strokeStyle: color})
                    }
                }
            }

            if (this.frameTranslate) {

                let transSeq
                if (this.reversed) {
                    transSeq = sequence.split('').map(function (cv) {
                        return complement[cv]
                    })
                    transSeq = transSeq.join('')
                } else {
                    transSeq = sequence
                }

                let y = dimen
                let translatedSequence = this.translateSequence(transSeq)
                for (let arr of translatedSequence) {

                    let i = translatedSequence.indexOf(arr)
                    let fNum = i
                    let h = 25

                    y = (i === 0) ? y + 10 : y + 30 //Little less room at first.

                    for (let cv of arr) {

                        let aaS
                        let idx = arr.indexOf(cv)
                        let xSeed = (idx + fNum) + (2 * idx)
                        let color = 0 === idx % 2 ? 'rgb(160,160,160)' : 'rgb(224,224,224)'

                        let p0 = Math.floor(xSeed / options.bpPerPixel)
                        console.log(`p0 ${ p0 }`)

                        let p1 = Math.floor((xSeed + 3) / options.bpPerPixel)
                        let pc = Math.round((p0 + p1) / 2)

                        if (cv.aminoA.indexOf('STOP') > -1) {
                            color = 'rgb(255, 0, 0)'
                            aaS = 'STOP' //Color blind accessible
                        } else {
                            aaS = cv.aminoA
                        }

                        if (cv.aminoA === 'M') {
                            color = 'rgb(0, 153, 0)'
                            aaS = 'START' //Color blind accessible
                        }

                        IGVGraphics.fillRect(ctx, p0, y, p1 - p0, h, {fillStyle: color})

                        if (options.bpPerPixel <= 1 / 10) {
                            IGVGraphics.strokeText(ctx, aaS, pc - (ctx.measureText(aaS).width / 2), y + 15)
                        }
                    }
                }
            }
        }
    }

    get supportsWholeGenome() {
        return false
    }

    computePixelHeight(ignore) {
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
}

export {defaultSequenceTrackOrder}

export default SequenceTrack


