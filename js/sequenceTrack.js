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

"use strict";

var igv = (function (igv) {

    let SequenceTrack;

    if (!igv.trackFactory) {
        igv.trackFactory = {};
    }

    igv.trackFactory["sequence"] = function (config, browser) {

        if (!SequenceTrack) {
            defineClass();
        }

        return new SequenceTrack(config, browser);
    }


    function defineClass() {

        SequenceTrack = function (config, browser) {

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
                    obj.aminoA = self.translationDict[st];
                    threeFrame[fNum].push(obj);
                    obj = null;
                    idx += 3;
                }
            });

            return threeFrame;
        };

        SequenceTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

            const browser = this.browser;

            return new Promise(function (fulfill, reject) {
                if (bpPerPixel && bpPerPixel > 1) {
                    fulfill(null);
                } else {
                    browser.genome.sequence.getSequence(chr, bpStart, bpEnd).then(fulfill).catch(reject);
                }
            });
        };

        SequenceTrack.prototype.draw = function (options) {

            var self = this,
                sequence = options.features,
                ctx = options.context,
                bpPerPixel = options.bpPerPixel,
                bpStart = options.bpStart,
                pixelWidth = options.pixelWidth,
                bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
                len, w, y, pos, offset, b, p0, p1, pc, c, h;
            var transSeq, aaS;

            if (sequence) {

                len = sequence.length;
                w = 1 / bpPerPixel;

                h = 15; //Separate sequence height from view height.
                for (pos = bpStart; pos <= bpEnd; pos++) {

                    offset = pos - bpStart;
                    if (offset < len) {
                        b = sequence[offset];

                        if (this.reversed) {
                            b = this.complement[b.toUpperCase()];
                        }

                        p0 = Math.floor(offset * w);
                        p1 = Math.floor((offset + 1) * w);
                        pc = Math.round((p0 + p1) / 2);

                        if (this.color) {
                            c = this.color;
                        }
                        else if ("dna" === this.sequenceType) {
                            c = igv.nucleotideColors[b];
                        }
                        else {
                            c = "rgb(0, 0, 150)";
                        }

                        if (!c) c = "gray";

                        if (bpPerPixel > 1 / 10) {
                            igv.graphics.fillRect(ctx, p0, 5, p1 - p0, h - 5, {fillStyle: c});
                        }
                        else {
                            igv.graphics.strokeText(ctx, b, pc - (ctx.measureText(b).width / 2), h, {strokeStyle: c});
                        }
                    }
                }
                if (this.frameTranslate) {

                    if (this.reversed) {
                        transSeq = sequence.split('').map(function (cv) {
                            return self.complement[cv];
                        });
                        transSeq = transSeq.join('');
                    } else {
                        transSeq = sequence;
                    }

                    y = h;
                    this.translateSequence(transSeq).forEach(function (arr, i) {
                        var fNum = i;
                        var h = 25;
                        y = (i === 0) ? y + 10 : y + 30; //Little less room at first.
                        arr.forEach(function (cv, idx) {
                            var xSeed = (idx + fNum) + (2 * idx);
                            if (idx % 2 === 0) {
                                c = 'rgb(160,160,160)';
                            } else {
                                c = 'rgb(224,224,224)';
                            }
                            p0 = Math.floor(xSeed * w);
                            p1 = Math.floor((xSeed + 3) * w);
                            pc = Math.round((p0 + p1) / 2);
                            if (cv.aminoA.indexOf('STOP') > -1) {
                                c = 'rgb(255, 0, 0)';
                                aaS = 'STOP'; //Color blind accessible
                            } else {
                                aaS = cv.aminoA;
                            }
                            if (cv.aminoA === 'M') {
                                c = 'rgb(0, 153, 0)';
                                aaS = 'START'; //Color blind accessible
                            }
                            ctx.fillRect(p0, y, p1 - p0, h);
                            igv.graphics.fillRect(ctx, p0, y, p1 - p0, h, {fillStyle: c});
                            if (bpPerPixel <= 1 / 10) {
                                igv.graphics.strokeText(ctx, aaS, pc - (ctx.measureText(aaS).width / 2), y + 15); //centers text in rect
                            }

                        });
                    });
                }
            }

        };

        SequenceTrack.prototype.supportsWholeGenome = function () {
            return false;
        }

        SequenceTrack.prototype.computePixelHeight = function (ignore) {
            return this.height;
        }
    }

    return igv;
})
(igv || {});



