function runTrackLineTests() {


    const browser = {
        genome: {
            getChromosomeName: function (chr) {
                return chr.startsWith("chr") ? chr : "chr" + chr;
            }
        }
    }

    QUnit.test("WigTrack trackLine", function (assert) {

        var done = assert.async();

        const wigTrack = igv.trackFactory["wig"]({
                format: 'bedgraph',
                url: 'data/wig/bedgraph-example-uscs.bedgraph'
            },
            browser);

        //track type=bedGraph name="BedGraph Format" description="BedGraph format" visibility=full color=200,100,0 altColor=0,100,200 priority=20
        wigTrack.postInit()
            .then(function (ignore) {
                assert.ok(wigTrack);
                assert.equal("EXPANDED", wigTrack.displayMode);
                assert.equal("rgb(200,100,0)", wigTrack.color);
                assert.equal("rgb(0,100,200)", wigTrack.altColor);
                assertEqual("BedGraph Format", wigTrack.name);
                done();
            })

            .catch(function (error) {
                console.log(error);
            });

    });

}
