import "./utils/mockObjects.js"
import FeatureFileReader from '../js/feature/featureFileReader.js';
import {assert} from 'chai';

suite("testTrackLine", function () {

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

    test("Column headers", async function () {

        const featureReader = new FeatureFileReader({
            format: 'bedpe',
            url: require.resolve('./data/bedpe/hiccups_loops.bedpe')
        });

        //chr1	x1	x2	chr2	y1	y2	name	score	strand1	strand2	color	observed	expectedBL	expectedDonut	expectedH	expectedV	fdrBL	fdrDonut	fdrH	fdrV	numCollapsed	centroid1	centroid2	radius
        const header = await featureReader.readHeader();
        assert.ok(header.columnNames);
        assert.equal(header.columnNames.length, 24);
        assert.equal(header.columnNames[3], "chr2");

    })
})
