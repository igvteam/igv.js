import TabixBufferedLineReader from "../js/util/tabixBufferedLineReader.js";
import "./utils/mockObjects.js"
import {assert} from 'chai';

suite("testBufferedLineReader", function () {

    test("long lines", async function () {

        const config ={
            url: require.resolve("./data/gcnv/gcnv_large.bed.gz"),
            indexURL: require.resolve("./data/gcnv/gcnv_large.bed.gz.tbi"),
            format: 'gcnv',
            bgzip: true
        };

        const reader = new TabixBufferedLineReader(config, 1000);
        const headerLine = await reader.nextLine();
        const columnCount = headerLine.split("\t").length;

        let lineCount = 0;
        let line;
        while((line = await reader.nextLine())) {
            const tokens = line.split("\t");
            assert.equal(tokens.length, columnCount);
            lineCount++;
        }
        assert.equal(lineCount, 2);

    })

})

