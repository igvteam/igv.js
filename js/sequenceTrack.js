var igv = (function (igv) {

    igv.SequenceTrack = function (description) {
        this.label = "";
        this.id = "sequence";
        this.height = this.preferredHeight;    // The preferred height
        this.disableButtons =  true;
        this.order = description.order;
    }

    igv.SequenceTrack.prototype.preferredHeight = 15;

    igv.SequenceTrack.prototype.draw = function (canvas, refFrame, tileStart, tileEnd, width, height, continuation) {

        var chr = refFrame.chr;

        if (refFrame.bpPerPixel > 1) {
            continuation();
        }
        else {

            igv.sequenceSource.getSequence(chr, tileStart, tileEnd, function (sequence) {

                console.log(chr, igv.numberFormatter(tileStart), igv.numberFormatter(tileEnd), " SEQ");

                if (sequence) {


                    var len = sequence.length;
                    var w = 1 / refFrame.bpPerPixel;

                    var y = height / 2;
                    for (var pos = tileStart; pos <= tileEnd; pos++) {

                        var offset = pos - tileStart;
                        if (offset < len) {
//                            var b = sequence.charAt(offset);
                            var b = sequence[ offset ];
                            var p0 = Math.floor(offset * w);
                            var p1 = Math.floor((offset + 1) * w);
                            var pc = Math.round((p0 + p1) / 2);
                            var c = igv.nucleotideColors[ b ];

                            if (!c) c = "gray";

                            if (refFrame.bpPerPixel > 1 / 10) {

                                canvas.fillRect(p0, 0, p1 - p0, 10, {fillStyle: c});
                            }
                            else {

                                canvas.strokeText(b, pc, y, {strokeStyle: c, font: 'normal 10px Arial', textAlign: 'center'});
                            }
                        }
                    }
                }

                continuation();
            });

        }
    }

    igv.SequenceTrack.prototype.drawLabel = function (ctx) {

    }

    return igv;
})
    (igv || {});



