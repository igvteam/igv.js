/**
 * Created by turner on 2/24/14.
 */
var igv = (function (igv) {


    var coverageColor;
    var mismatchColor = "rgb(255, 0, 0)";
    var alignmentColor = "rgb(185, 185, 185)";
    var negStrandColor = "rgb(150, 150, 230)";
    var posStrandColor = "rgb(230, 150, 150)";
    var deletionColor = "black";
    var skippedColor = "rgb(150, 170, 170)";
    var expandedHeight = 14;

    igv.BAMTrack = function (config) {

        var coverageTrackHeightPercentage, alignmentTrackHeightPercentage;

        this.url = config.url;
        this.featureSource = new igv.BamSource(this.url);
        this.label = config.label || "";
        this.id = config.id || this.label;
        this.height = 400;
        this.alignmentRowHeight = expandedHeight;

        // divide the canvas into a coverage track region and an alignment track region
        coverageTrackHeightPercentage = 0.15;
        alignmentTrackHeightPercentage = 1.0 - coverageTrackHeightPercentage;

        this.coverageTrackHeight = coverageTrackHeightPercentage * this.height;
        this.alignmentTrackHeight = alignmentTrackHeightPercentage * this.height;

    };

    igv.BAMTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, width, height, continuation, task) {

        // Don't try to draw alignments for windows > 10kb
        if (bpEnd - bpStart > 30000) {

            canvas.fillText("Zoom in to see alignments", 600, 20);
            continuation();
            return;
        }

        var coverageTrackHeight = this.coverageTrackHeight,
            alignmentRowHeight = this.alignmentRowHeight,
            chr = refFrame.chr;

        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (alignmentManager, task) {

            if (alignmentManager) {

                console.log(chr, igv.numberFormatter(bpStart), igv.numberFormatter(bpEnd), " BAM");

                igv.sequenceSource.getSequence(chr, bpStart, bpEnd, function (refSeq) {

                    var coverageMap = alignmentManager.coverageMap,
                        bp,
                        x,
                        y,
                        w,
                        h,
                        base,
                        mismatch,
                        i,
                        len,
                        item,
                        acc;

                    if (refSeq) {
                        refSeq = refSeq.toUpperCase();

                    }

                    // coverage track
                    canvas.setProperties({ fillStyle: alignmentColor });
                    canvas.setProperties({ strokeStyle: alignmentColor });
                    for (i = 0, len = coverageMap.coverage.length; i < len; i++) {

                        item = coverageMap.coverage[i];
                        if (!item) continue;

                        bp = (coverageMap.bpStart + i);
                        if (bp < bpStart) continue;
                        if (bp > bpEnd) break;

                        x = refFrame.toPixels(bp - bpStart);

                        coverageColor = alignmentColor;
                        canvas.setProperties({   fillStyle: coverageColor });
                        canvas.setProperties({ strokeStyle: coverageColor });

                        h = (item.total / coverageMap.maximum) * coverageTrackHeight;
                        y = coverageTrackHeight - h;

                        if (refFrame.bpPerPixel > 1) {

                            canvas.strokeLine(x, y, x, y + h);
                        } else {

                            canvas.fillRect(x, y, 1.0 / refFrame.bpPerPixel, h);

                            if ((1.0 / refFrame.bpPerPixel) > 4.0) {
                                canvas.strokeLine(x, y, x, y + h, { strokeStyle: igv.greyScale(255) });
                            }

                        }

                    }

                    // coverage mismatch coloring
                    if (refSeq) {
                        for (i = 0, len = coverageMap.coverage.length; i < len; i++) {

                            item = coverageMap.coverage[i];
                            if (!item) continue;

                            bp = (coverageMap.bpStart + i);
                            if (bp < bpStart) continue;
                            if (bp > bpEnd) break;

                            base = refSeq[i + coverageMap.bpStart - bpStart];

                            if (item.isMismatch(base)) {

                                x = refFrame.toPixels(bp - bpStart);
                                w = Math.max(1, 1.0 / refFrame.bpPerPixel);

                                acc = 0.0;
                                coverageMap.coverage[i].mismatchPercentages(base).forEach(function(fraction, index, fractions) {

                                    if (fraction.percent < 0.001) {
                                        return;
                                    }

                                    h = fraction.percent * (item.total / coverageMap.maximum) * coverageTrackHeight;
                                    y = (coverageTrackHeight - h) - acc;
                                    acc += h;

                                    canvas.setProperties({ fillStyle: igv.nucleotideColors[ fraction.base ] });
                                    canvas.fillRect(x, y, w, h);

                                 });


                            }
                        }
                    }

                    // alignment track
                    alignmentManager.genomicInterval.packedAlignments.forEach(function renderAlignmentRow(alignmentRow, packedAlignmentIndex, packedAlignments) {

                        alignmentRow.forEach(function renderAlignment(alignment) {

                            var rectX,
                                rectY,
                                rectHeight,
                                rectEndX,
                                rectInsetY = 1,
                                arrowHeadWidth = alignmentRowHeight / 2,
                                lineY,
                                blocks = alignment.blocks,
                                len = alignment.blocks.length,
                                strand = alignment.strand,
                                blocksBBoxLength = igv.alignmentBlocksBBoxLength(alignment);

                            if ((alignment.start + blocksBBoxLength) < bpStart) return;
                            if (alignment.start > bpEnd) return;

                            rectX = refFrame.toPixels(alignment.start - bpStart);
                            rectEndX = refFrame.toPixels((alignment.start + blocksBBoxLength) - bpStart);

                            rectY = (alignmentRowHeight * packedAlignmentIndex) + coverageTrackHeight;
                            rectHeight = alignmentRowHeight;

                            rectY += rectInsetY;
                            rectHeight -= 2 * rectInsetY;

                            lineY = rectY + rectHeight / 2;

                            if (blocks.length > 0) {
                                // todo -- set color based on gap type (deletion or skipped)
                                canvas.strokeLine(rectX, lineY, rectEndX, lineY, {strokeStyle: skippedColor});
                            }

                            canvas.setProperties({fillStyle: alignmentColor});

                            blocks.forEach(function renderAlignmentBlocks(block, blockIndex) {

                                var refOffset = block.start - bpStart,
                                    blockRectX = refFrame.toPixels(refOffset),
                                    blockEndX = refFrame.toPixels((block.start + block.len) - bpStart),
                                    blockRectWidth = Math.max(1, blockEndX - blockRectX),
                                    blockSeq = block.seq.toUpperCase(),
                                    blockQual = block.qual,
                                    refChar,
                                    readChar,
                                    readQual,
                                    basePixelPosition,
                                    basePixelWidth,
                                    baseColor,
                                    i;


                                if (strand && blockIndex === len - 1) {

                                    x = [rectX, rectEndX, rectEndX + arrowHeadWidth, rectEndX, rectX];
                                    y = [rectY, rectY, rectY + rectHeight / 2, rectY + rectHeight, rectY + rectHeight];
                                    canvas.fillPolygon(x, y);
                                } else if (!strand && blockIndex === 0) {

                                    var x = [ blockRectX - arrowHeadWidth, blockRectX, blockEndX, blockEndX, blockRectX];
                                    var y = [ rectY + rectHeight / 2, rectY, rectY, rectY + rectHeight, rectY + rectHeight]
                                    canvas.fillPolygon(x, y);
                                } else {
                                    canvas.fillRect(blockRectX, rectY, blockRectWidth, rectHeight);
                                }

                                // Only do mismatch coloring if a refseq exists to do the comparison
                                if (refSeq && blockSeq !== "*") {

                                    for (i = 0, len = blockSeq.length; i < len; i++) {

                                        readChar = blockSeq.charAt(i);
                                        refChar = refSeq.charAt(refOffset + i);

                                        if (readChar === "=") {
                                            readChar = refChar;
                                        }

                                        if (readChar === "X" || refChar !== readChar) {

                                            if (blockQual && blockQual.length > i) {
                                                readQual = blockQual.charCodeAt(i);
                                                baseColor = shadedBaseColor(readQual, readChar);
                                            }
                                            else {
                                                baseColor = igv.nucleotideColors[readChar];
                                            }
                                            if (!baseColor) baseColor = "gray";

                                            basePixelPosition = refFrame.toPixels((block.start + i) - bpStart);
                                            basePixelWidth = Math.max(1, refFrame.toPixels(1));

                                            canvas.fillRect(basePixelPosition, rectY, basePixelWidth, rectHeight, { fillStyle: baseColor });

                                        }
                                    }

                                } // if (refSeq)

                            });
                        });

                    });


                    continuation();

                });

            } else {
                continuation();
            }

        });
    };

    igv.BAMTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    function shadedBaseColor(qual, nucleotide) {

        var color,
            alpha,
            minQ = 5,   //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MIN),
            maxQ = 20,  //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MAX);
            foregroundColor = igv.nucleotideColorComponents[nucleotide],
            backgroundColor = [255, 255, 255];   // White

        if (!foregroundColor) return "grey";

        if (qual < minQ) {
            alpha = 0.1;
        } else {
            alpha = Math.max(0.1, Math.min(1.0, 0.1 + 0.9 * (qual - minQ) / (maxQ - minQ)));
        }
        // Round alpha to nearest 0.1
        alpha = Math.round(alpha * 10) / 10.0;

        if (alpha >= 1) {
            return igv.nucleotideColors[nucleotide];
        }
        color = igv.getCompositeColor(backgroundColor, foregroundColor, alpha);
        return color;
    }

    return igv;

})(igv || {});
