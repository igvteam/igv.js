function runAlignmentContainerTests() {


    test("AlignmentContainer test", 3, function () {

        var container = new igv.AlignmentContainer("1", 0, 100),
            i,
            seq = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            qual = [];

        for (i = 0; i < 50; i++) {
            qual[i] = 32;
        }
        // Simulate alignments
        for (i = 0; i < 1000; i++) {
            container.addAlignment({
                start: 0,
                strand: "pos",
                blocks: [{start: 0, len: 50, seq: seq, qual: qual}]
            });
        }
        for (i = 0; i < 500; i++) {
            container.addAlignment({
                start: 50,
                strand: "pos",
                blocks: [{start: 50, len: 50, seq: seq, qual: qual}]
            });
        }
        container.finish();

        equal(container.downsampledIntervals.length, 2);
        equal(container.downsampledIntervals[0].count, 900);
        equal(container.downsampledIntervals[1].count, 400);

    });

}




