/**
 * Update deprecated fasta & index urls in the reference object.
 */

const isString = (x) => {
    return (x && typeof x === "string") || x instanceof String
}

/**
 * Replaces deprecated s3 fasta URLs with twoBitURLs.  The purpose here is to rescue references from saved sessions
 * that contain pointers to deprectated IGV s3 buckets.  These buckets will eventually be deleted
 *
 * @param reference
 */
function updateReference(reference) {

    if (!(requiresUpdate(reference) && updates[reference.id])) {
        return
    }

    const updatedReference = updates[reference.id]
    if (updatedReference) {
        delete reference.fastaURL
        if (reference.indexURL) delete reference.indexURL
        reference.twoBitURL = updatedReference.twoBitURL
        if (updatedReference.twoBitBptURL) reference.twoBitBptURL = updatedReference.twoBitBptURL
        if (updatedReference.chromSizesURL) reference.chromSizesURL = updatedReference.chromSizesURL
    }
}

function requiresUpdate(reference) {
    return isString(reference.fastaURL) &&
        (reference.fastaURL.startsWith("https://igv.org") ||
            ["igv.org.genomes", "igv.broadinstitute.org", "igv.genepattern.org", "igvdata.broadinstitute.org",
                "igv-genepattern-org"].some(bucket => reference.fastaURL.includes(bucket)))
}

const updates = {
    "hs1": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hs1/bigZips/hs1.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hs1/bigZips/hs1.2bit.bpt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hs1/bigZips/hs1.chrom.sizes.txt"
    },
    "hg38": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.chrom.sizes"
    },
    "hg19": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.chrom.sizes"
    },
    "hg18": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/bigZips/hg18.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/bigZips/hg18.chrom.sizes"
    },
    "mm39": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm39/bigZips/mm39.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm39/bigZips/mm39.chrom.sizes"
    },
    "mm10": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm10/bigZips/mm10.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm10/bigZips/mm10.chrom.sizes"
    },
    "mm9": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm9/bigZips/mm9.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/mm9/bigZips/mm9.chrom.sizes"
    },
    "rn7": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/GCF_015227675.2.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/GCF_015227675.2.2bit.bpt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/015/227/675/GCF_015227675.2/GCF_015227675.2.chrom.sizes.txt"
    },
    "rn6": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/GCF_000001895.5.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/GCF_000001895.5.2bit.bpt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/895/GCF_000001895.5/GCF_000001895.5.chrom.sizes.txt"
    },
    "gorGor6": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor6/bigZips/gorGor6.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor6/bigZips/gorGor6.chrom.sizes"
    },
    "gorGor4": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor4/bigZips/gorGor4.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/gorGor4/bigZips/gorGor4.chrom.sizes"
    },
    "panTro6": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro6/bigZips/panTro6.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro6/bigZips/panTro6.chrom.sizes"
    },
    "panTro5": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro5/bigZips/panTro5.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro5/bigZips/panTro5.chrom.sizes"
    },
    "panTro4": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro4/bigZips/panTro4.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panTro4/bigZips/panTro4.chrom.sizes"
    },
    "macFas5": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/macFas5/bigZips/macFas5.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/macFas5/bigZips/macFas5.chrom.sizes"
    },
    "panPan2": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panPan2/bigZips/panPan2.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/panPan2/bigZips/panPan2.chrom.sizes"
    },
    "canFam6": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam6/bigZips/canFam6.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam6/bigZips/canFam6.chrom.sizes"
    },
    "canFam5": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam5/bigZips/canFam5.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam5/bigZips/canFam5.chrom.sizes"
    },
    "canFam4": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam4/bigZips/canFam4.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam4/bigZips/canFam4.chrom.sizes"
    },
    "canFam3": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam3/bigZips/canFam3.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/canFam3/bigZips/canFam3.chrom.sizes"
    },
    "bosTau9": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau9/bigZips/bosTau9.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau9/bigZips/bosTau9.chrom.sizes"
    },
    "bosTau8": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau8/bigZips/bosTau8.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/bosTau8/bigZips/bosTau8.chrom.sizes"
    },
    "susScr11": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/susScr11/bigZips/susScr11.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/susScr11/bigZips/susScr11.chrom.sizes"
    },
    "galGal6": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/galGal6/bigZips/galGal6.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/galGal6/bigZips/galGal6.chrom.sizes"
    },
    "danRer11": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer11/bigZips/danRer11.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer11/bigZips/danRer11.chrom.sizes"
    },
    "danRer10": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer10/bigZips/danRer10.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/danRer10/bigZips/danRer10.chrom.sizes"
    },
    "ce11": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/ce11/bigZips/ce11.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/ce11/bigZips/ce11.chrom.sizes"
    },
    "dm6": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm6/bigZips/dm6.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm6/bigZips/dm6.chrom.sizes"
    },
    "dm3": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm3/bigZips/dm3.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/dm3/bigZips/dm3.chrom.sizes"
    },
    "sacCer3": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/GCF_000146045.2.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/GCF_000146045.2.2bit.bpt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/146/045/GCF_000146045.2/GCF_000146045.2.chrom.sizes.txt"
    },
    "GCF_000002945.1": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/GCF_000002945.1.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/GCF_000002945.1.2bit.bpt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/002/945/GCF_000002945.1/GCF_000002945.1.chrom.sizes.txt"
    },
    "GCF_009858895.2": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/GCF_009858895.2.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/GCF_009858895.2.2bit.bpt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/009/858/895/GCF_009858895.2/GCF_009858895.2.chrom.sizes.txt"
    },
    "tair10": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/GCF_000001735.3.2bit",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/001/735/GCF_000001735.3/GCF_000001735.3.chrom.sizes.txt"
    },
    "GCA_000022165.1": {
        "twoBitURL": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/GCA_000022165.1.2bit",
        "twoBitBptURL": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/GCA_000022165.1.2bit.bpt",
        "chromSizesURL": "https://hgdownload.soe.ucsc.edu/hubs/GCA/000/022/165/GCA_000022165.1/GCA_000022165.1.chrom.sizes.txt"
    }
}

export {updateReference}

