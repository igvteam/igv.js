import "./utils/mockObjects.js"
import Genome from "../src/igvCore/genome/genome.js"
import {updateReference} from "../src/igvCore/genome/updateReference.js"
import {assert} from 'chai'
import {shortenChromsomeName} from "../src/igvCore/rulerTrack.js"


suite("testGenome", function () {

    test("Genome coordinates", async function () {

        this.timeout(200000)

        const reference = {
            "id": "b37_1kg",
            "name": "Human (1kg, b37+decoy)",
            "fastaURL": "https://storage.googleapis.com/genomics-public-data/references/Homo_sapiens_assembly19_1000genomes_decoy/Homo_sapiens_assembly19_1000genomes_decoy.fasta",
            "indexURL": "https://storage.googleapis.com/genomics-public-data/references/Homo_sapiens_assembly19_1000genomes_decoy/Homo_sapiens_assembly19_1000genomes_decoy.fasta.fai",
            "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/database/cytoBand.txt.gz",
            wholeGenomeView: true
        }

        const genome = await Genome.createGenome(reference)
        assert.ok(genome)
        assert.equal(86, genome.chromosomeNames.length)
        assert.equal(genome.getCumulativeOffset("2"), 249250621)

    })

    // test("2bit genome with chromSizes", async function() {
    //
    //     this.timeout(400000)
    //
    //     const reference = {
    //         id: "GCF_000364345.1",
    //         format: "2bit",
    //         twoBitURL: "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/364/345/GCF_000364345.1/GCF_000364345.1.2bit",
    //         chromSizesURL: "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/364/345/GCF_000364345.1/GCF_000364345.1.chrom.sizes.txt"
    //     }
    //
    //     const genome = await Genome.createGenome(reference)
    //     assert.ok(genome.chromosomes.size > 0)
    //     assert.ok(genome.chromosomeNames.length > 0)
    //
    // })


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

})
