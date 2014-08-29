/**
 * Created by turner on 2/17/14.
 */
function runSEGFeatureSourceTests() {

    asyncTest("SEGFeatureSource features for chromosome", 3, function () {

        var url = "../assets/hg19/heart.SLC25A3.wig";

        var segFeatureSource = new igv.SEGFeatureSource(url);
        ok(segFeatureSource, "wigFeatureSource should be non null");

        var enumerateSamplesForChromosome = function (chr, features, sampleList) {

            var accumulateSamples = function (item, index, array) {

                this.array.push({ sample:this.sample, chr:this.chr, sampleData:item });

                var ss = igv.numberFormatter(item.start);
                var ee = igv.numberFormatter(item.end);
//                console.log(index + " sample " + this.sample  + " chr " + this.chr + " start " + ss + " end " + ee + " value " + item.value);
            };

            var echoSample = function (item, index, array) {

                var ss = igv.numberFormatter(item.start);
                var ee = igv.numberFormatter(item.end);

                console.log("sample " + this.sample  + " chr " + this.chr + " start " + ss + " end " + ee + " value " + item.value);
            };

            var sampleItems;
            var sampleName;

            for (var fkey in features) {

                if (fkey === "minimum" || fkey === "maximum") {
                    continue;
                }

                if (features.hasOwnProperty(fkey)) {

                    sampleName = fkey;

                    sampleItems = features[ sampleName ];

                    // s is a chromosome name, a key for the sampleItems dictionary
                    for (var chrKey in sampleItems) {

                        if (sampleItems.hasOwnProperty(chrKey)) {

                            if (chr !== chrKey) {
                                continue;
                            }

//                            sampleItems[ chrKey ].forEach(echoSample, { sample: sampleName, chr: chrKey });
                            sampleItems[ chrKey ].forEach(accumulateSamples, { array: sampleList, sample: sampleName, chr: chrKey });

                        }

                    }

                }

            }

            start();
        };

        var renderSampleListForChromosome = function (chr, features) {

            var echoSampleListItem = function (item, index, array) {

                var ss = igv.numberFormatter(item.sampleData.start);
                var ee = igv.numberFormatter(item.sampleData.end);

                console.log("sample " + item.sample  + " chr " + item.chr + " start " + ss + " end " + ee + " value " + item.sampleData.value);
            };

            ok(chr);
            ok(features);

            var sampleList = [];
            enumerateSamplesForChromosome(chr.substr(3), features, sampleList);

            sampleList.forEach(echoSampleListItem);

        };

        var chr = "chr1";
        var bpStart = 0;
        var bpEnd = 2400000;

        segFeatureSource.getFeatures(chr, bpStart, bpEnd, renderSampleListForChromosome);
    });

    test("Valid SEG File Test", 3, function() {

        var isValidHeader = function(line) {

            var i,
                success = 1,
                matches = "Sample	Chromosome	Start.bp	End.bp	Num.Markers	Log2.Ratio".match(/\S+/g);

            var lineTokens = line.match(/\S+/g);
            if (lineTokens === null) {
                return !success;
            }

            if (6 !== lineTokens.length) {
                return !success;
            }

            for (i=0; i < lineTokens.length; i++) {
                if (lineTokens[ i ] !== matches[ i ]) {
                    success = !success;
                    console.log("FAIL " + lineTokens[ i ]);
                    break;
                }
            }

            return success;
        };

        var lines = [];
        lines.push("Sample	Chromosome	Start.bp	End.bp	Num.Markers	Log2.Ratio");
//        lines.push("Sample	Chromosome	Start.bp	End.End	Num.Markers	Log2.Ratio");
        lines.push("BRISK_p_STY37_Mapping250K_Sty_A09_147618	1	742429	48252112	4423	-0.037056");
        lines.push("BRISK_p_STY37_Mapping250K_Sty_A09_147618	1	48258759	103282846	4692	-0.020776");
        lines.push("BRISK_p_STY37_Mapping250K_Sty_A09_147618	1	103299593	197357867	5732	-0.029222");

        //
        ok(!isValidHeader(""), "Do not accept a blank line");

        //
        ok(!isValidHeader("a b c"), "Must be 6 words");

        //
        ok(isValidHeader(lines.shift()));
    });

}
