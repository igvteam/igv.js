/**
 * ClinVar utilities for searching and retrieving ClinVar variation information
 */

/**
 * Get the ClinVar URL for the given HGVS notation
 * @param {string} hgvsNotation - The HGVS notation string to search for
 * @return {Promise<string|null>} The ClinVar variation URL, or null if not found or error occurs
 */
async function getClinVarURL(hgvsNotation) {
    try {
        const encodedHgvs = encodeURIComponent(hgvsNotation)
        const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?` +
            `db=clinvar&term=${encodedHgvs}&retmode=json`

        const response = await fetch(esearchUrl)

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`)
            return null
        }

        // Parse JSON response to get the first ClinVar accession
        const json = await response.json()
        const esearchResult = json.esearchresult

        if (esearchResult.count > 0) {
            const uid = esearchResult.idlist[0]
            return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${uid}/`
        } else {
            return null
        }

    } catch (e) {
        console.error("Error fetching ClinVar URL", e)
        return null
    }
}

export const ClinVar = {
    getClinVarURL
}
