function runBAMIndexTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    // asyncTest("blocksForRange", function () {
    //
    //     var refID = 14,
    //         beg = 24375199,
    //         end = 24378544,
    //         url =  dataURL + 'bam/gstt1_sample.bam',
    //         indexPath = url + ".bai",
    //         config;
    //
    //     config = {
    //         type: 'bam',
    //         url: url
    //
    //     };
    //
    //     igv.loadBamIndex(indexPath, config).then(function (bamIndex) {
    //
    //         chunks = bamIndex.blocksForRange(refID, beg, end);
    //
    //         ok(chunks, "chunks are non-null");
    //         equal(chunks.length, 1, "chunks.length is correct");
    //
    //         var chunk = chunks[0];
    //         equal(0, chunk.maxv.offset, "chunk.maxv.offset");
    //         equal(60872, chunk.maxv.block, "chunk.maxv.block");
    //
    //         start();
    //
    //     });
    // });

    asyncTest("loadIndex", function() {

        var url = "http://1000genomes.s3.amazonaws.com/phase3/data/HG01879/alignment/HG01879.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam.bai";


        igv.loadBamIndex(url, {}, false).then(function (bamIndex){

            ok(bamIndex);

            start();
        });

    })


}



