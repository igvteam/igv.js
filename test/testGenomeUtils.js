import "./utils/mockObjects.js"
import GenomeUtils from "../js/genome/genome.js"
import {assert} from 'chai';

suite("testGenomeUtils", function () {

    test("agument default genome list 1", async function () {

        this.timeout(100000);
        const config = {
            genomeList: require.resolve("./data/genomes/altGenomes.json")
        }

        await GenomeUtils.initializeGenomes(config);
        assert.ok(GenomeUtils.KNOWN_GENOMES["_sacCer3"]);
        assert.ok(GenomeUtils.KNOWN_GENOMES["sacCer3"]);

    })

    test("agument default genome list 2", async function () {

        this.timeout(100000);
        GenomeUtils.KNOWN_GENOMES = undefined;   // reset

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

        await GenomeUtils.initializeGenomes(config);
        assert.ok(GenomeUtils.KNOWN_GENOMES["_sacCer3"]);
        assert.ok(GenomeUtils.KNOWN_GENOMES["sacCer3"]);

    })

    test("replace default genome list", async function () {

        this.timeout(100000);
        GenomeUtils.KNOWN_GENOMES = undefined;   // reset

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

        await GenomeUtils.initializeGenomes(config);
        assert.ok(GenomeUtils.KNOWN_GENOMES["_sacCer3"]);
        assert.isUndefined(GenomeUtils.KNOWN_GENOMES["sacCer3"]);

    })

})