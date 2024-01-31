import "./utils/mockObjects.js"
import FeatureFileReader from "../js/feature/featureFileReader.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import Genome from "../js/genome/genome.js"
import {decodeGenePredExt} from "../js/feature/decode/ucsc.js"

const reference = {
    "id": "hg38",
    "name": "Human (GRCh38/hg38)",
    "fastaURL": "https://igv-genepattern-org.s3.amazonaws.com/genomes/seq/hg38/hg38.fa",
    "indexURL": "https://igv-genepattern-org.s3.amazonaws.com/genomes/seq/hg38/hg38.fa.fai",
}


suite("testGenePredExt", function () {


    test("Plus strand gene", async function () {

        this.timeout(200000)

        const genome = await Genome.createGenome(reference)

        const config = {
            format: "refgene",
            url: "test/data/bed/myc.refgene",
        }
        const reader = new FeatureFileReader(config);
        const features = await reader.readFeatures("chr8", 0, Number.MAX_SAFE_INTEGER);
        const myc = features[0]
        assert.equal('+', myc.strand)
        assert.equal(0, myc.exons[0].readingFrame)
        assert.equal(0, myc.exons[1].readingFrame)
        assert.equal(1, myc.exons[2].readingFrame)
    })

    test("Minus strand gene", async function () {
        const config = {
            format: "refgene",
            url: "test/data/bed/muc1.refgene",
        }
        const reader = new FeatureFileReader(config);
        const features = await reader.readFeatures("chr8", 0, Number.MAX_SAFE_INTEGER);
        const muc1 = features[0]
        assert.equal('-', muc1.strand)
        assert.equal(0, muc1.exons[0].readingFrame)
        assert.equal(0, muc1.exons[1].readingFrame)
        assert.equal(0, muc1.exons[2].readingFrame)
        assert.equal(0, muc1.exons[3].readingFrame)
        assert.equal(1, muc1.exons[4].readingFrame)


    })


})

