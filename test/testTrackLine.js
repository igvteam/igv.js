import FeatureFileReader from '../js/feature/featureFileReader.js';
import {assert} from 'chai';
import {setup} from "./util/setup.js";

suite("testTrackLine", function () {

    setup();

    const browser = {
        genome: {
            getChromosomeName: function (chr) {
                return chr.startsWith("chr") ? chr : "chr" + chr;
            }
        }
    }

    test("WigTrack trackLine", async function () {


        const featureReader = new FeatureFileReader({
                format: 'bedgraph',
                url: require.resolve('./data/wig/bedgraph-example-uscs.bedgraph')
            });

        //track type=bedGraph name="BedGraph Format" description="BedGraph format" visibility=full color=200,100,0 altColor=0,100,200 priority=20
        const header = await featureReader.readHeader();
        assert.equal(header.description, "BedGraph format");
        assert.equal(header.visibility, "full");
        assert.equal(header.name, "BedGraph Format");
        assert.equal(header.color, "200,100,0");
        assert.equal(header.altColor, "0,100,200");
        assert.equal(header.priority, "20");
        

    })
})
