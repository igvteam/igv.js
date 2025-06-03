const genomeConfig = {
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
}