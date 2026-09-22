import "./utils/mockObjects.js"
import Genome from "../js/genome/genome.js"
import {updateReference} from "../js/genome/updateReference.js"
import {assert} from 'chai'
import {shortenChromsomeName} from "../js/rulerTrack.js"


suite("testGenome", function () {

    test("Shorten name", function() {
        const names = ["chr1", "chromosome_1"]
        const expected = ["1", "chromosome_1"]

        for(let i=0; i<names.length; i++) {
            const shortened = shortenChromsomeName(names[i])
            assert.equal(shortened, expected[i])
        }
    })

    test("update reference", function() {

        const reference = {
            "id": "hg18",
            "name": "Human (hg18)",
            "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta",
            "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta.fai",
            "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/cytoBandIdeo.txt.gz",
            "tracks": [
                {
                    "name": "Refseq Genes",
                    "format": "refgene",
                    "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/refGene.txt.gz",
                    "indexed": false,
                    "visibilityWindow": -1,
                    "order": 1000000,
                    "searchable": true
                }
            ],
            "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY"
        }

        updateReference(reference)
        assert.isNotOk(reference.fastaURL)
        assert.isNotOk(reference.indexURL)
        assert.isOk(reference.twoBitURL)
        assert.isOk(reference.chromSizesURL)


    })

    test("chrom sizes failure is optional when the sequence names the chromosomes", async function () {

        const genome = await Genome.createGenome({
            id: "foo",
            twoBitURL: "test/data/twobit/foo.2bit",
            chromSizesURL: "test/data/twobit/missing.chrom.sizes"
        })

        assert.deepEqual(genome.chromosomeNames, ["chr1"])
        assert.equal(genome.initialLocus, "chr1")
        assert.equal(genome.loadFailures.length, 1)
        assert.equal(genome.loadFailures[0].kind, "chromSizes")
    })

    test("chrom sizes failure is fatal when nothing else names the chromosomes", async function () {

        let error
        try {
            await Genome.createGenome({
                id: "GCF_000002655.1",
                twoBitURL: "test/data/twobit/GCF_000002655.1.2bit",
                twoBitBptURL: "test/data/twobit/GCF_000002655.1.2bit.bpt",
                chromSizesURL: "test/data/twobit/missing.chrom.sizes"
            })
        } catch (e) {
            error = e
        }
        assert.equal(error?.path, "test/data/twobit/missing.chrom.sizes")
    })

    test("a cytoband failure leaves out only that chromosome, and is reported once", async function () {

        const reported = []
        const browser = {reportLoadFailure: (kind, url, error) => reported.push({kind, url, error})}
        const genome = await Genome.createGenome({
            id: "foo",
            twoBitURL: "test/data/twobit/foo.2bit",
            cytobandURL: "test/data/cytobands/foo.cytoband.txt"
        }, browser)

        const cytobands = [{start: 0, end: 10, name: "p1"}]
        const requests = []
        genome.cytobandSource = {
            getCytobands: async chr => {
                requests.push(chr)
                if (chr === "chr2" || chr === "chr3") throw Error(`${chr} failed`)
                return cytobands
            }
        }

        assert.isUndefined(await genome.getCytobands("chr2"))
        assert.isUndefined(await genome.getCytobands("chr3"))
        assert.equal(await genome.getCytobands("chr1"), cytobands)
        assert.isUndefined(await genome.getCytobands("chr2"))   // Not requested again

        assert.deepEqual(requests, ["chr2", "chr3", "chr1"])
        assert.equal(reported.length, 1)
        assert.equal(reported[0].kind, "cytobands")
        assert.equal(reported[0].url, "test/data/cytobands/foo.cytoband.txt")
    })

})
