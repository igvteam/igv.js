function decodeGtexGWAS(tokens, header) {
    //chrom	chromStart	chromEnd	Strongest SNP-risk allele	Disease/Phenotype	P-value	Odds ratio or beta	PUBMEDID
    //1	1247493	1247494	rs12103-A	Inflammatory bowel disease	8.00E-13	1.1	23128233

    const tokenCount = tokens.length
    if (tokenCount < 7) {
        return null
    }
    const feature = {
        chr: tokens[0],
        start: parseInt(tokens[1]) - 1,
        end: parseInt(tokens[2]),
        'Strongest SNP-risk allele': tokens[3],
        'Disease/Phenotype': tokens[4],
        'P-value': tokens[5],
        'Odds ratio or beta': tokens[6],
    }
    if (tokens.length > 6) {
        feature['PUBMEDID'] = `<a target = "blank" href = "https://www.ncbi.nlm.nih.gov/pubmed/${tokens[7]}">${tokens[7]}</a>`
    }
    return feature
}

export {decodeGtexGWAS}