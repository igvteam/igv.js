const knownGenomes = {
    "hs1": {
        "id": "hs1",
        "name": "Human (T2T CHM13-v2.0/hs1)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hs1/bigZips/hs1.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hs1/bigZips/hs1.2bit.bpt",
        "wholeGenomeView": true,
        "cytobandBbURL": "https://hgdownload.soe.ucsc.edu/gbdb/hs1/cytoBandMapped/cytoBandMapped.bb",
        "blatDB": "hub_3671779_hs1",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hs1/bigZips/hs1.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hs1/bigZips/hs1.chrom.sizes.txt",
        "tracks": [
            {
                "id": "ncbiRefSeqAll",
                "name": "RefSeq All",
                "url": "https://hgdownload.soe.ucsc.edu/gbdb/hs1/ncbiRefSeq/ncbiRefSeq.bb",
                "trixURL": "https://hgdownload.soe.ucsc.edu/gbdb/hs1/ncbiRefSeq/ncbiRefSeq.ix",
                "format": "biggenepred",
                "displayMode": "EXPANDED",
                "searchIndex": "name",
                "html": "https://genome.ucsc.edu/cgi-bin/hgTrackUi?db=hs1&g=refSeqComposite",
                "labelField": "geneName2",
                "order": 100000,
                "altColor": "rgb(120,12,12)",
                "color": "rgb(12,12,120)"
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hs1/hub.txt",
            "https://hgdownload.soe.ucsc.edu/gbdb/hs1/hubs/public/hub.txt"
        ]
    },
    "hg38": {
        "id": "hg38",
        "name": "Human (GRCh38/hg38)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/hg38/hg38_alias.tab",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.chrom.sizes",
        "tracks": [
            {
                "id": "refseqSelect",
                "name": "Refseq Select",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/ncbiRefSeqSelect.txt.gz",
                "format": "refgene",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hg38/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/405/GCF_000001405.40/hub.txt"
        ]
    },
    "hg38_1kg": {
        "id": "hg38_1kg",
        "name": "Human (hg38 1kg/GATK)",
        "fastaURL": "https://1000genomes.s3.amazonaws.com/technical/reference/GRCh38_reference_genome/GRCh38_full_analysis_set_plus_decoy_hla.fa",
        "indexURL": "https://1000genomes.s3.amazonaws.com/technical/reference/GRCh38_reference_genome/GRCh38_full_analysis_set_plus_decoy_hla.fa.fai",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/cytoBandIdeo.txt.gz",
        "blatDB": "hg38",
        "ucscID": "hg38",
        "aliasURL": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/hg38/hg38_alias.tab",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.chrom.sizes",
        "tracks": [
            {
                "id": "refseqSelect",
                "name": "Refseq Select",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/ncbiRefSeqSelect.txt.gz",
                "format": "refgene",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hg38/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/405/GCF_000001405.40/hub.txt"
        ]
    },
    "hg19": {
        "id": "hg19",
        "name": "Human (GRCh37/hg19)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/database/cytoBand.txt.gz",
        "aliasURL": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/hg19/hg19_alias.tab",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.chrom.sizes",
        "tracks": [
            {
                "id": "refseqSelect",
                "name": "Refseq Select",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/database/ncbiRefSeqSelect.txt.gz",
                "format": "refgene",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hg19/hub.txt",
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hg19/1kg/hub.txt",
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hg19/platinum_genomes/hub.txt",
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hg19/tutorials/hub.txt"
        ]
    },
    "hg18": {
        "id": "hg18",
        "name": "Human (hg18)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/bigZips/hg18.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/cytoBandIdeo.txt.gz",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/bigZips/hg18.chrom.sizes",
        "tracks": [
            {
                "id": "refGene",
                "name": "RefSeq Genes",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/refGene.txt.gz",
                "format": "refgene",
                "html": "https://genome.ucsc.edu/cgi-bin/hgTrackUi?db=hg18&g=refGene",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hg18/hub.txt",
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/hg18/tumorscape/hub.txt",
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/gbm/hub.txt"
        ]
    },
    "mm39": {
        "id": "mm39",
        "name": "Mouse (GRCm39/mm39)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm39/bigZips/mm39.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm39/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm39/bigZips/mm39.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm39/bigZips/mm39.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/mm39/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/mm39/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/635/GCF_000001635.27/hub.txt"
        ]
    },
    "mm10": {
        "id": "mm10",
        "name": "Mouse (GRCm38/mm10)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm10/bigZips/mm10.2bit",
        "nameSet": "ucsc",
        "wholeGenomeView": true,
        "description": "house mouse (GRCm38.p6 2017)\nMus musculus/GCF_000001635.26_GRCm38.p6 genome assembly",
        "blat": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/635/GCF_000001635.26/dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/001/635/GCF_000001635.26",
        "cytobandBbURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/635/GCF_000001635.26/bbi/GCF_000001635.26_GRCm38.p6.cytoBand.bb",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/635/GCF_000001635.26/GCF_000001635.26.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm10/bigZips/mm10.chrom.sizes",
        "tracks": [
            {
                "id": "ncbiRefSeq",
                "name": "RefSeq All",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/mm10/database/ncbiRefSeq.txt.gz",
                "format": "refgene",
                "color": "rgb(12,12,120)",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/mm10/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/635/GCF_000001635.26/hub.txt"
        ]
    },
    "mm9": {
        "id": "mm9",
        "name": "Mouse (NCBI37/mm9)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm9/bigZips/mm9.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://s3.amazonaws.com/igv.org.genomes/mm9/cytoBandIdeo.txt.gz",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm9/bigZips/mm9.chrom.sizes",
        "tracks": [
            {
                "name": "Refseq Genes",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/mm9/database/refGene.txt.gz",
                "format": "refgene",
                "indexed": false,
                "order": 100000
            }
        ]
    },
    "rn7": {
        "id": "rn7",
        "name": "Rat (rn7) ",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/GCF_015227675.2.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/GCF_015227675.2.2bit.bpt",
        "nameSet": "ucsc",
        "wholeGenomeView": true,
        "description": "Norway rat BN7.2\nRattus norvegicus/GCF_015227675.2_mRatBN7.2 genome assembly",
        "blat": "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/dynablat-01.soe.ucsc.edu 4040 dynamic GCF/015/227/675/GCF_015227675.2",
        "chromAliasBbURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/GCF_015227675.2.chromAlias.bb",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/rn7/database/cytoBandIdeo.txt.gz",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/GCF_015227675.2.chrom.sizes.txt",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq All",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/rn7/database/ncbiRefSeq.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/rn7/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/hub.txt"
        ]
    },
    "rn6": {
        "id": "rn6",
        "name": "Rat (RGCS 6.0/rn6)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/GCF_000001895.5.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/GCF_000001895.5.2bit.bpt",
        "nameSet": "ucsc",
        "wholeGenomeView": true,
        "description": "Norway rat Rnor6.0\nRattus norvegicus/GCF_000001895.5_Rnor_6.0 genome assembly",
        "blat": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/001/895/GCF_000001895.5",
        "chromAliasBbURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/GCF_000001895.5.chromAlias.bb",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/rn6/database/cytoBandIdeo.txt.gz",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/GCF_000001895.5.chrom.sizes.txt",
        "tracks": [
            {
                "id": "ncbiRefSeq",
                "name": "RefSeq All",
                "url": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/bbi/GCF_000001895.5_Rnor_6.0.ncbiRefSeq.bb",
                "trixURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/ixIxx/GCF_000001895.5_Rnor_6.0.ncbiRefSeq.ix",
                "format": "biggenepred",
                "displayMode": "EXPANDED",
                "color": "rgb(12,12,120)",
                "searchIndex": "name",
                "html": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/html/GCF_000001895.5_Rnor_6.0.refSeqComposite",
                "labelField": "geneName2",
                "order": 100000
            }
        ],
        "hubs": [
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/hub.txt"
        ]
    },
    "gorGor6": {
        "id": "gorGor6",
        "name": "Gorilla (Kamilah_GGO_v0/gorGor6) ",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor6/bigZips/gorGor6.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor6/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor6/bigZips/gorGor6.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2A,chr2B,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor6/bigZips/gorGor6.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor6/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/gorGor6/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/008/122/165/GCF_008122165.1/hub.txt"
        ]
    },
    "gorGor4": {
        "id": "gorGor4",
        "name": "Gorilla (gorGor4.1/gorGor4)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor4/bigZips/gorGor4.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor4/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor4/bigZips/gorGor4.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2A,chr2B,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor4/bigZips/gorGor4.chrom.sizes",
        "tracks": [
            {
                "name": "Refseq Genes",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor4/database/refGene.txt.gz",
                "format": "refgene",
                "visibilityWindow": -1,
                "indexed": false,
                "order": 100000
            }
        ]
    },
    "panTro6": {
        "id": "panTro6",
        "name": "Chimp (panTro6) (panTro6)",
        "fastaURL": "https://s3.amazonaws.com/igv.org.genomes/panTro6/panTro6.fa",
        "indexURL": "https://s3.amazonaws.com/igv.org.genomes/panTro6/panTro6.fa.fai",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro6/database/cytoBandIdeo.txt.gz",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro6/bigZips/panTro6.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro6/bigZips/panTro6.chrom.sizes",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro6/bigZips/panTro6.chromAlias.txt",
        "nameSet": "ucsc",
        "chromosomeOrder": "chr1,chr2A,chr2B,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY",
        "tracks": [
            {
                "name": "Refseq Curated",
                "format": "refgene",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro6/database/ncbiRefSeqCurated.txt.gz",
                "order": 1000000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/panTro6/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCA/002/880/755/GCA_002880755.3/hub.txt"
        ]
    },
    "panTro5": {
        "id": "panTro5",
        "name": "Chimp (panTro5)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro5/bigZips/panTro5.2bit",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro5/bigZips/panTro5.chromAlias.txt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro5/bigZips/panTro5.chrom.sizes",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro5/database/cytoBandIdeo.txt.gz",
        "chromosomeOrder": "chr1,chr2A,chr2B,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY",
        "tracks": [
            {
                "name": "Refseq Genes",
                "format": "refgene",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro5/database/ncbiRefSeq.txt.gz",
                "order": 100000,
                "visibilityWindow": 0
            }
        ]
    },
    "panTro4": {
        "id": "panTro4",
        "name": " Chimp (SAC 2.1.4/panTro4)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro4/bigZips/panTro4.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro4/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro4/bigZips/panTro4.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2A,chr2B,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro4/bigZips/panTro4.chrom.sizes",
        "tracks": [
            {
                "name": "Refseq Genes",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro4/database/ncbiRefSeq.txt.gz",
                "format": "refgene",
                "visibilityWindow": -1,
                "order": 100000
            }
        ]
    },
    "macFas5": {
        "id": "macFas5",
        "name": "Macaca fascicularis (macFas5)",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/macFas5/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/macFas5/bigZips/macFas5.chromAlias.txt",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/macFas5/bigZips/macFas5.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/macFas5/bigZips/macFas5.chrom.sizes",
        "tracks": [
            {
                "name": "Refseq Curated Genes",
                "format": "refgene",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/macFas5/database/ncbiRefSeqCurated.txt.gz",
                "order": 1000000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/macFas5/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/364/345/GCA_000364345.1/hub.txt"
        ]
    },
    "panPan2": {
        "id": "panPan2",
        "name": "Bonobo (MPI-EVA panpan1.1/panPan2)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panPan2/bigZips/panPan2.2bit",
        "wholeGenomeView": true,
        "description": "pygmy chimpanzee (Ulindi refseq 2015)\nPan paniscus/GCF_000258655.2_panpan1.1 genome assembly",
        "chromAlias": "https://hgdownload.soe.ucsc.edu/goldenPath/panPan2/bigZips/panPan2.chromAlias.txt",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panPan2/database/cytoBandIdeo.txt.gz",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panPan2/bigZips/panPan2.chrom.sizes",
        "chromosomeOrder": "chr1,chr2A,chr2B,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX",
        "tracks": [
            {
                "id": "ncbiRefSeq",
                "name": "RefSeq All",
                "type": "annotation",
                "format": "refgene",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/panPan2/database/ncbiRefSeq.txt.gz",
                "order": 100000
            }
        ],
        "hubs": [
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/258/655/GCF_000258655.2/hub.txt"
        ]
    },
    "canFam6": {
        "id": "canFam6",
        "name": "Dog (canFam6) ",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam6/database/cytoBandIdeo.txt.gz",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam6/bigZips/canFam6.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam6/bigZips/canFam6.chrom.sizes",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam6/bigZips/canFam6.chromAlias.txt",
        "nameSet": "ucsc",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chr23,chr24,chr25,chr26,chr27,chr28,chr29,chr30,chr31,chr32,chr33,chr34,chr35,chr36,chr37,chr38,chrX",
        "tracks": [
            {
                "name": "Refseq Curated",
                "format": "refgene",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam6/database/ncbiRefSeqCurated.txt.gz",
                "order": 1000000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/canFam6/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/285/GCF_000002285.5/hub.txt"
        ]
    },
    "canFam5": {
        "id": "canFam5",
        "name": "Dog (canFam5) ",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam5/bigZips/canFam5.2bit",
        "nameSet": "ucsc",
        "wholeGenomeView": true,
        "chromAliasBbURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam5/bigZips/canFam5.chromAlias.bb",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam5/database/cytoBandIdeo.txt.gz",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chr23,chr24,chr25,chr26,chr27,chr28,chr29,chr30,chr31,chr32,chr33,chr34,chr35,chr36,chr37,chr38,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam5/bigZips/canFam5.chrom.sizes",
        "tracks": [
            {
                "id": "refgene",
                "name": "RefSeq Genes",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam5/database/refGene.txt.gz",
                "format": "refgene",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/canFam5/hub.txt"
        ]
    },
    "canFam4": {
        "id": "canFam4",
        "name": "Dog (UU_Cfam_GSD_1.0/canFam4)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam4/bigZips/canFam4.2bit",
        "nameSet": "ucsc",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam4/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam4/bigZips/canFam4.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chr23,chr24,chr25,chr26,chr27,chr28,chr29,chr30,chr31,chr32,chr33,chr34,chr35,chr36,chr37,chr38,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam4/bigZips/canFam4.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam4/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/canFam4/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/011/100/685/GCF_011100685.1/hub.txt"
        ]
    },
    "canFam3": {
        "id": "canFam3",
        "name": "Dog (Broad CanFam3.1/canFam3)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam3/bigZips/canFam3.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam3/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam3/bigZips/canFam3.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chr23,chr24,chr25,chr26,chr27,chr28,chr29,chr30,chr31,chr32,chr33,chr34,chr35,chr36,chr37,chr38,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam3/bigZips/canFam3.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam3/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/canFam3/hub.txt"
        ]
    },
    "bosTau9": {
        "id": "bosTau9",
        "name": "Cow (ARS-UCD1.2/bosTau9)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau9/bigZips/bosTau9.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau9/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau9/bigZips/bosTau9.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chr23,chr24,chr25,chr26,chr27,chr28,chr29,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau9/bigZips/bosTau9.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau9/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/bosTau9/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/002/263/795/GCF_002263795.1/hub.txt"
        ]
    },
    "bosTau8": {
        "id": "bosTau8",
        "name": "Cow (UMD_3.1.1/bosTau8)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau8/bigZips/bosTau8.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau8/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau8/bigZips/bosTau8.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chr23,chr24,chr25,chr26,chr27,chr28,chr29,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau8/bigZips/bosTau8.chrom.sizes",
        "tracks": [
            {
                "name": "Refseq Genes",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau8/database/refGene.txt.gz",
                "format": "refgene",
                "indexed": false,
                "order": 100000
            }
        ]
    },
    "susScr11": {
        "id": "susScr11",
        "name": "Pig (SGSC Sscrofa11.1/susScr11)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/susScr11/bigZips/susScr11.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/susScr11/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/susScr11/bigZips/susScr11.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/susScr11/bigZips/susScr11.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/susScr11/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/susScr11/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/003/025/GCF_000003025.6/hub.txt"
        ]
    },
    "galGal6": {
        "id": "galGal6",
        "name": " Chicken (galGal6)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/galGal6/bigZips/galGal6.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/galGal6/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/galGal6/bigZips/galGal6.chromAlias.txt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/galGal6/bigZips/galGal6.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/galGal6/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "displayMode": "EXPANDED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/galGal6/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/315/GCF_000002315.6/hub.txt"
        ]
    },
    "danRer11": {
        "id": "danRer11",
        "name": "Zebrafish (GRCZ11/danRer11)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer11/bigZips/danRer11.2bit",
        "wholeGenomeView": true,
        "blat": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/035/GCF_000002035.6/dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/002/035/GCF_000002035.6",
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer11/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer11/bigZips/danRer11.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chr23,chr24,chr25",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer11/bigZips/danRer11.chrom.sizes",
        "tracks": [
            {
                "id": "ncbiRefSeqCurated",
                "name": "RefSeq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/035/GCF_000002035.6/bbi/GCF_000002035.6_GRCz11.ncbiRefSeqCurated.bb",
                "trixURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/035/GCF_000002035.6/ixIxx/GCF_000002035.6_GRCz11.ncbiRefSeqCurated.ix",
                "format": "biggenepred",
                "displayMode": "EXPANDED",
                "color": "rgb(12,12,120)",
                "searchIndex": "name",
                "html": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/035/GCF_000002035.6/html/GCF_000002035.6_GRCz11.refSeqComposite",
                "labelField": "geneName2",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/danRer11/hub.txt"
        ]
    },
    "danRer10": {
        "id": "danRer10",
        "name": "Zebrafish (GRCZ10/danRer10)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer10/bigZips/danRer10.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer10/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer10/bigZips/danRer10.chromAlias.txt",
        "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chr23,chr24,chr25",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer10/bigZips/danRer10.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer10/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/danRer10/hub.txt"
        ]
    },
    "ce11": {
        "id": "ce11",
        "name": "C. elegans (ce11)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/ce11/bigZips/ce11.2bit",
        "wholeGenomeView": true,
        "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/ce11/database/cytoBandIdeo.txt.gz",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/ce11/bigZips/ce11.chromAlias.txt",
        "chromosomeOrder": "chrI,chrII,chrIII,chrIV,chrV,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/ce11/bigZips/ce11.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/ce11/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/ce11/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/985/GCF_000002985.6/hub.txt"
        ]
    },
    "dm6": {
        "id": "dm6",
        "name": "D. melanogaster (dm6)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm6/bigZips/dm6.2bit",
        "wholeGenomeView": true,
        "aliasURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm6/bigZips/dm6.chromAlias.txt",
        "chromosomeOrder": "chr2L,chr2R,chr3L,chr3R,chr4,chrX,chrY",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm6/bigZips/dm6.chrom.sizes",
        "tracks": [
            {
                "id": "refseqCurated",
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/dm6/database/ncbiRefSeqCurated.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/dm6/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/215/GCF_000001215.4/hub.txt"
        ]
    },
    "dm3": {
        "id": "dm3",
        "name": "D. melanogaster (dm3)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm3/bigZips/dm3.2bit",
        "wholeGenomeView": true,
        "chromosomeOrder": "chr2L,chr2R,chr3L,chr3R,chr4,chrX",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm3/bigZips/dm3.chrom.sizes",
        "tracks": [
            {
                "name": "Refseq Curated",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/dm3/database/refGene.txt.gz",
                "format": "refgene",
                "indexed": false,
                "order": 100000
            }
        ]
    },
    "sacCer3": {
        "id": "sacCer3",
        "name": "S. cerevisiae (sacCer3)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/GCF_000146045.2.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/GCF_000146045.2.2bit.bpt",
        "nameSet": "ucsc",
        "wholeGenomeView": true,
        "description": "baker's yeast S288C (2014)\nSaccharomyces cerevisiae S288C/GCF_000146045.2_R64 genome assembly",
        "blat": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/146/045/GCF_000146045.2",
        "chromAliasBbURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/GCF_000146045.2.chromAlias.bb",
        "cytobandBbURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/bbi/GCF_000146045.2_R64.cytoBand.bb",
        "chromosomeOrder": "chrI,chrII,chrIII,chrIV,chrV,chrVI,chrVII,chrVIII,chrIX,chrX,chrXI,chrXII,chrXIII,chrXIV,chrXV,chrXVI",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/GCF_000146045.2.chrom.sizes.txt",
        "tracks": [
            {
                "id": "refseqAll",
                "name": "Refseq All",
                "url": "https://hgdownload.soe.ucsc.edu/goldenPath/sacCer3/database/ncbiRefSeq.txt.gz",
                "format": "refgene",
                "displayMode": "COLLAPSED",
                "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
                "order": 100000
            }
        ],
        "hubs": [
            "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/hubs/sacCer3/hub.txt",
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/hub.txt"
        ]
    },
    "GCF_000002945.1": {
        "id": "GCF_000002945.1",
        "name": "S. pombe (GCF_000002945.1)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/GCF_000002945.1.2bit",
        "nameSet": "ucsc",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/GCF_000002945.1.chrom.sizes.txt",
        "aliasURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/GCF_000002945.1.chromAlias.txt",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/GCF_000002945.1.2bit.bpt",
        "cytobandBbURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/bbi/GCF_000002945.1_ASM294v2.cytoBand.bb",
        "tracks": [
            {
                "type": "annotation",
                "name": "RefSeq Curated",
                "format": "biggenepred",
                "url": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/bbi/GCF_000002945.1_ASM294v2.ncbiRefSeqCurated.bb",
                "displayMode": "EXPANDED",
                "searchIndex": "name",
                "trixURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/ixIxx/GCF_000002945.1_ASM294v2.ncbiRefSeqCurated.ix",
                "visibilityWindow": -1,
                "order": 100000
            }
        ],
        "hubs": [
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/hub.txt"
        ]
    },
    "GCF_009858895.2": {
        "id": "GCF_009858895.2",
        "name": "SARS-CoV-2 (Jan 2020 COVID-19) (GCF_009858895.2)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/GCF_009858895.2.2bit",
        "nameSet": "ucsc",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/GCF_009858895.2.chrom.sizes.txt",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/GCF_009858895.2.2bit.bpt",
        "description": "SARS-CoV-2 (Jan 2020 COVID-19)\nSevere acute respiratory syndrome coronavirus 2/GCF_009858895.2_ASM985889v3 genome assembly",
        "wholeGenomeView": true,
        "aliasURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/GCF_009858895.2.chromAlias.txt",
        "tracks": [
            {
                "id": "ncbiGene",
                "name": "NCBI Genes",
                "url": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/bbi/GCF_009858895.2_ASM985889v3.ncbiGene.bb",
                "trixURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/ixIxx/GCF_009858895.2_ASM985889v3.ncbiGene.ix",
                "format": "biggenepred",
                "displayMode": "EXPANDED",
                "color": "rgb(0,80,150)",
                "altColor": "rgb(150,80,0)",
                "infoURL": "https://www.ncbi.nlm.nih.gov/gene/?term=$$",
                "searchIndex": "name",
                "html": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/html/GCF_009858895.2_ASM985889v3.ncbiGene",
                "labelField": "geneName2",
                "order": 100000
            }
        ],
        "hubs": [
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/hub.txt"
        ],
        "fromJson": true
    },
    "tair10": {
        "id": "tair10",
        "name": "A. thaliana (TAIR 10)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/GCF_000001735.3.2bit",
        "nameSet": "ucsc",
        "wholeGenomeView": true,
        "aliasURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/GCF_000001735.3.chromAlias.txt",
        "chromosomeOrder": "NC_003070.9,NC_003071.7,NC_003074.8,NC_003075.7,NC_003076.8",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/GCF_000001735.3.chrom.sizes.txt",
        "tracks": [
            {
                "id": "ncbiRefSeq",
                "name": "RefSeq All",
                "url": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/bbi/GCF_000001735.3_TAIR10.ncbiRefSeq.bb",
                "trixURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/ixIxx/GCF_000001735.3_TAIR10.ncbiRefSeq.ix",
                "format": "biggenepred",
                "displayMode": "EXPANDED",
                "color": "rgb(12,12,120)",
                "searchIndex": "name",
                "html": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/html/GCF_000001735.3_TAIR10.refSeqComposite",
                "labelField": "geneName2",
                "order": 100000
            }
        ],
        "hubs": [
            "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/hub.txt"
        ]
    },
    "GCA_000022165.1": {
        "id": "GCA_000022165.1",
        "name": "Salmonella enterica subsp. enterica serovar Typhimurium str. (14028S 2009) (GCA_000022165.1)",
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/GCA_000022165.1.2bit",
        "nameSet": "ucsc",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/GCA_000022165.1.chrom.sizes.txt",
        "locus": "CP001363.1:1623421-1633421",
        "blat": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/dynablat-01.soe.ucsc.edu",
        "chromAliasBbURL": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/GCA_000022165.1.chromAlias.bb",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/GCA_000022165.1.2bit.bpt",
        "description": "Salmonella enterica subsp. enterica serovar Typhimurium str. (14028S 2009)\nSalmonella enterica subsp. enterica serovar Typhimurium str. 14028S/GCA_000022165.1_ASM2216v1 genome assembly",
        "tracks": [
            {
                "id": "ncbiGene",
                "name": "Gene models",
                "format": "biggenepred",
                "url": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/bbi/GCA_000022165.1_ASM2216v1.ncbiGene.bb",
                "displayMode": "EXPANDED",
                "color": "rgb(0,80,150)",
                "altColor": "rgb(150,80,0)",
                "infoURL": "https://www.ncbi.nlm.nih.gov/gene/?term=$$",
                "searchIndex": "name",
                "trixURL": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/ixIxx/GCA_000022165.1_ASM2216v1.ncbiGene.ix",
                "order": 100000,
                "type": "annotation",
                "height": 70,
                "visibilityWindow": 0
            }
        ],
        "hubs": [
            "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/hub.txt"
        ]
    }
}

export { knownGenomes }
