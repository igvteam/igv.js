// Assigns a row # to each feature.  If the feature does not fit in any row and #rows == maxRows no
// row number is assigned.
function pack(featureList, maxRows) {

    maxRows = maxRows || Number.MAX_SAFE_INTEGER
    const rows = []
    featureList.sort(function (a, b) {
        return a.start - b.start
    })
    rows.push(-1000)

    for (let feature of featureList) {
        let r = 0
        const len = Math.min(rows.length, maxRows)
        for (r = 0; r < len; r++) {
            if (feature.start >= rows[r]) {
                feature.row = r
                rows[r] = feature.end
                break
            }
        }
        feature.row = r
        rows[r] = feature.end
    }
}

export default pack

