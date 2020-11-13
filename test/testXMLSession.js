import "./utils/mockObjects.js"
import {assert} from 'chai';
import igvxhr from "../js/igvxhr.js";
import XMLSession from "../js/session/igvXmlSession"

suite("testXMLSession", function () {

    const knownGenomes = {
        "hg19": {}
    }

    test("merge track session", async function () {

        const sessionPath = require.resolve("./data/session/session-merged.xml");
        const xmlString = await igvxhr.loadString(sessionPath, {});
        const sessionObject = new XMLSession(xmlString, knownGenomes);

        assert.ok(sessionObject);
        assert.equal(sessionObject.genome, "hg19");
        assert.equal(sessionObject.locus, "chr8:128746315-128755680");

        // This session defines a single, merged track with 3 subtracks
        assert.equal(sessionObject.tracks.length, 1);

        //<Track altColor="0,0,178" color="0,0,178" name="Overlay" autoScale="false" renderer="BAR_CHART" >
        //    <DataRange baseline="0.0" drawBaseline="true" flipAxis="false" maximum="72.72" minimum="0.0" type="LINEAR"/>
        const mergedTrack = sessionObject.tracks[0];
        assert.equal(mergedTrack.name, "Overlay");
        assert.equal(mergedTrack.type, "merged");
        assert.equal(mergedTrack.color, "rgb(0,0,178)");
        assert.equal(mergedTrack.altColor, "rgb(0,0,178)");
        assert.equal(mergedTrack.autoscale, false);
        assert.equal(mergedTrack.min, 0);
        assert.equal(mergedTrack.max, 72.72);
        assert.equal(mergedTrack.tracks.length, 3);

        const firstTrack = mergedTrack.tracks[0];
        assert.equal(firstTrack.normalize, false);
        assert.equal(firstTrack.windowFunction, "mean");
    })


})