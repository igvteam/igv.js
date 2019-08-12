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

import IGVGraphics from "./igv-canvas";
import {nucleotideColors} from "./util/colorPalletes";

const SequenceTrack = function (config, browser) {

    this.type = "sequence";

    this.browser = browser;

    this.removable = false;

    this.config = config;
    this.name = "";
    this.id = "sequence";
    this.sequenceType = config.sequenceType || "dna";             //   dna | rna | prot
    this.height = 25;
    this.disableButtons = false;
    this.order = config.order || -Number.MAX_VALUE;
    this.ignoreTrackMenu = false;

    this.removable = false;
    this.reversed = false;
    this.frameTranslate = false;
    this.complement = {'A': 'T', 'C': 'G', 'G': 'C', 'T': 'A'};
    this.translationDict = {
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
    };
};

SequenceTrack.prototype.menuItemList = function () {
    var self = this;

    return [
        {
            name: self.reversed ? "Forward" : "Reverse",
            click: function () {
                self.reversed = !self.reversed;
                self.trackView.repaintViews();
            }
        },
        {
            name: self.frameTranslate ? "Close Translation" : "Three-frame Translate",
            click: function () {
                self.frameTranslate = !self.frameTranslate;
                if (self.frameTranslate) {
                    self.trackView.viewports.forEach(function (vp) {
                        vp.setContentHeight(115);
                    })
                    self.trackView.setTrackHeight(115);
                } else {
                    self.trackView.viewports.forEach(function (vp) {
                        vp.setContentHeight(25);
                    })
                    self.trackView.setTrackHeight(25);
                }
                self.trackView.repaintViews()

            }
        }
    ];
};

SequenceTrack.prototype.translateSequence = function (seq) {
    var threeFrame = [[], [], []];
    var self = this;

    [0, 1, 2].forEach(function (fNum) {
        var idx = fNum;
        var obj, st;

        while ((seq.length - idx) >= 3) {
            obj = {};
            st = seq.slice(idx, idx + 3);

            if (self.reversed) {
                st = st.split('').reverse().join('');
            }

            obj.codons = st;
            obj.aminoA = self.translationDict[st.toUpperCase()];
            threeFrame[fNum].push(obj);
            obj = null;
            idx += 3;
        }
    });

    return threeFrame;
};

SequenceTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

    const browser = this.browser;


    if (bpPerPixel && bpPerPixel > 1) {
        return Promise.resolve(null);
    } else {
        return browser.genome.sequence.getSequence(chr, bpStart, bpEnd)
            .then(function (sequence) {
                return {
                    bpStart: bpStart,
                    sequence: sequence
                }
            });
    }

};

SequenceTrack.prototype.draw = function (options) {

    const self = this;
    const ctx = options.context;

    if (options.features) {

        const sequence = options.features.sequence;
        const sequenceBpStart = options.features.bpStart;
        const bpEnd = 1 + options.bpStart + (options.pixelWidth * options.bpPerPixel);

        let height = 15;
        for (let bp = sequenceBpStart; bp <= bpEnd; bp++) {

            let seqOffsetBp = Math.floor(bp - sequenceBpStart);

            if (seqOffsetBp < sequence.length) {
                let letter = sequence[seqOffsetBp];

                if (this.reversed) {
                    letter = this.complement[letter.toUpperCase()];
                }

                let offsetBP = bp - options.bpStart;
                let aPixel = offsetBP / options.bpPerPixel;
                let bPixel = (offsetBP + 1) / options.bpPerPixel;

                let color = fillColor.call(this, letter);


                if (options.bpPerPixel > 1 / 10) {
                    IGVGraphics.fillRect(ctx, aPixel, 5, bPixel - aPixel, height - 5, {fillStyle: color});
                } else {
                    let xPixel = 0.5 * (aPixel + bPixel - ctx.measureText(letter).width);
                    IGVGraphics.strokeText(ctx, letter, xPixel, height, {strokeStyle: color});
                }
            }
        }

        if (this.frameTranslate) {

            let transSeq;
            if (this.reversed) {
                transSeq = sequence.split('').map(function (cv) {
                    return self.complement[cv];
                });
                transSeq = transSeq.join('');
            } else {
                transSeq = sequence;
            }

            let y = height;
            let translatedSequence = this.translateSequence(transSeq);
            for (let arr of translatedSequence) {

                let i = translatedSequence.indexOf(arr);
                let fNum = i;
                let h = 25;

                y = (i === 0) ? y + 10 : y + 30; //Little less room at first.

                for (let cv of arr) {

                    let aaS;
                    let idx = arr.indexOf(cv);
                    let xSeed = (idx + fNum) + (2 * idx);
                    let color = 0 === idx % 2 ? 'rgb(160,160,160)' : 'rgb(224,224,224)';

                    let p0 = Math.floor(xSeed / options.bpPerPixel);
                    let p1 = Math.floor((xSeed + 3) / options.bpPerPixel);
                    let pc = Math.round((p0 + p1) / 2);

                    if (cv.aminoA.indexOf('STOP') > -1) {
                        color = 'rgb(255, 0, 0)';
                        aaS = 'STOP'; //Color blind accessible
                    } else {
                        aaS = cv.aminoA;
                    }

                    if (cv.aminoA === 'M') {
                        color = 'rgb(0, 153, 0)';
                        aaS = 'START'; //Color blind accessible
                    }

                    IGVGraphics.fillRect(ctx, p0, y, p1 - p0, h, {fillStyle: color});

                    if (options.bpPerPixel <= 1 / 10) {
                        IGVGraphics.strokeText(ctx, aaS, pc - (ctx.measureText(aaS).width / 2), y + 15);
                    }

                }

            }

        }

    }

};

function fillColor(index) {

    if (this.color) {
        return this.color;
    } else if ("dna" === this.sequenceType) {
        return nucleotideColors[index] || 'gray';
    } else {
        return 'rgb(0, 0, 150)';
    }

}

SequenceTrack.prototype.supportsWholeGenome = function () {
    return false;
};

SequenceTrack.prototype.computePixelHeight = function (ignore) {
    return this.height;
}

export default SequenceTrack;


