import "./utils/mockObjects.js"
import GenomeUtils from "../js/genome/genomeUtils.js"
import {LoadError} from "../js/util/loadFailure.js"
import {assert} from 'chai'

suite("testGenomeUtils", function () {

    test("agument default genome list 1", async function () {

        this.timeout(100000)
        const config = {
            genomeList: "test/data/genomes/altGenomes.json"
        }

        await GenomeUtils.initializeGenomes(config)
        assert.ok(GenomeUtils.KNOWN_GENOMES["_sacCer3"])
        assert.ok(GenomeUtils.KNOWN_GENOMES["sacCer3"])

    })

    test("agument default genome list 2", async function () {

        this.timeout(100000)
        GenomeUtils.KNOWN_GENOMES = undefined   // reset

        const config = {
            genomeList: [
                {
                    "id": "_dm6",
                    "name": "D. melanogaster (dm6)",
                    "fastaURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/dm6/dm6.fa",
                    "indexURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/dm6/dm6.fa.fai",
                    "cytobandURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/dm6/cytoBandIdeo.txt.gz",
                    "tracks": [
                        {
                            "name": "Refseq Genes",
                            "format": "refgene",
                            "url": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/dm6/ncbiRefSeq.txt.gz",
                            "indexed": false,
                            "order": 1000000,
                            "removable": false,
                            "visibilityWindow": -1
                        }
                    ]
                },
                {
                    "id": "_sacCer3",
                    "name": "S. cerevisiae (sacCer3)",
                    "fastaURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/sacCer3/sacCer3.fa",
                    "indexURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/sacCer3/sacCer3.fa.fai",
                    "tracks": [
                        {
                            "name": "Ensembl Genes",
                            "type": "annotation",
                            "format": "ensgene",
                            "displayMode": "EXPANDED",
                            "url": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/sacCer3/ensGene.txt.gz",
                            "indexed": false
                        }
                    ]
                }
            ]
        }

        await GenomeUtils.initializeGenomes(config)
        assert.ok(GenomeUtils.KNOWN_GENOMES["_sacCer3"])
        assert.ok(GenomeUtils.KNOWN_GENOMES["sacCer3"])

    })

    test("replace default genome list", async function () {

        this.timeout(100000)
        GenomeUtils.KNOWN_GENOMES = undefined   // reset

        const config = {
            loadDefaultGenomes: false,
            genomeList: [
                {
                    "id": "_dm6",
                    "name": "D. melanogaster (dm6)",
                    "fastaURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/dm6/dm6.fa",
                    "indexURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/dm6/dm6.fa.fai",
                    "cytobandURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/dm6/cytoBandIdeo.txt.gz",
                    "tracks": [
                        {
                            "name": "Refseq Genes",
                            "format": "refgene",
                            "url": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/dm6/ncbiRefSeq.txt.gz",
                            "indexed": false,
                            "order": 1000000,
                            "removable": false,
                            "visibilityWindow": -1
                        }
                    ]
                },
                {
                    "id": "_sacCer3",
                    "name": "S. cerevisiae (sacCer3)",
                    "fastaURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/sacCer3/sacCer3.fa",
                    "indexURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/sacCer3/sacCer3.fa.fai",
                    "tracks": [
                        {
                            "name": "Ensembl Genes",
                            "type": "annotation",
                            "format": "ensgene",
                            "displayMode": "EXPANDED",
                            "url": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.genomes/sacCer3/ensGene.txt.gz",
                            "indexed": false
                        }
                    ]
                }
            ]
        }

        await GenomeUtils.initializeGenomes(config)
        assert.ok(GenomeUtils.KNOWN_GENOMES["_sacCer3"])
        assert.isUndefined(GenomeUtils.KNOWN_GENOMES["sacCer3"])

    })


    test("genome url", function () {
        assert.isTrue(GenomeUtils.isGenomeURL("https://igv.org/genomes/sacCer3.json"))
        assert.isTrue(GenomeUtils.isGenomeURL("https://igv.org/genomes/sacCer3.json?token=abc"))
        assert.isTrue(GenomeUtils.isGenomeURL("genomes/sacCer3.json"))
        assert.isFalse(GenomeUtils.isGenomeURL("sacCer3"))
        assert.isFalse(GenomeUtils.isGenomeURL("https://igv.org/genomes/sacCer3.fa"))
        assert.isFalse(GenomeUtils.isGenomeURL({fastaURL: "sacCer3.json"}))
    })

    test("expand genome url", async function () {

        this.timeout(100000)
        GenomeUtils.KNOWN_GENOMES = undefined   // reset
        await GenomeUtils.initializeGenomes({loadDefaultGenomes: false})

        const reference = await GenomeUtils.expandReference("test/data/genomes/sacCer3.json")
        assert.equal(reference.id, "sacCer3")
        assert.ok(reference.fastaURL)
        assert.equal(reference.tracks.length, 1)
    })

    test("expand genome list url", async function () {

        this.timeout(100000)
        GenomeUtils.KNOWN_GENOMES = undefined   // reset
        await GenomeUtils.initializeGenomes({loadDefaultGenomes: false})

        // A genome list is not a genome definition
        const url = "test/data/genomes/altGenomes.json"
        try {
            await GenomeUtils.expandReference(url)
            assert.fail("Expected an error")
        } catch (error) {
            assert.instanceOf(error.cause, LoadError)
            assert.equal(error.cause.kind, "genome")
            assert.equal(error.cause.url, url)
        }
    })

    test("expand missing genome url", async function () {

        this.timeout(100000)
        GenomeUtils.KNOWN_GENOMES = undefined   // reset
        await GenomeUtils.initializeGenomes({loadDefaultGenomes: false})

        const url = "test/data/genomes/noSuchGenome.json"
        try {
            await GenomeUtils.expandReference(url)
            assert.fail("Expected an error")
        } catch (error) {
            assert.instanceOf(error.cause, LoadError)
            assert.equal(error.cause.kind, "genome")
            assert.equal(error.cause.url, url)
        }
    })

})
