/**
 * Create a table with an optional row click handler *
 *
 * @param tableConfig {
 *     headers: column headers (strings)
 *     rows: row data (array of arrays, 1 for ecah row)
 *     rowClickHandler:  Optional click handler for a row.  Supplied function will receive a row's data as an array
 * }
 * @returns {HTMLTableElement}
 */
function createTable(tableConfig) {

    const table = document.createElement("table")
    table.classList.add("igv-ui-table")
    table.id = "variant_table"

    const thead = document.createElement('thead')
    table.appendChild(thead)
    const headerRow = thead.insertRow(0)

    const headers = tableConfig.headers
    for (let j = 0; j < headers.length; j++) {
        var cell = document.createElement("th")
        headerRow.appendChild(cell)
        cell.innerHTML = headers[j]
    }

    const tbody = document.createElement('tbody')
    table.appendChild(tbody)
    const tableRows = tableConfig.rows
    for (let rowData of tableRows) {

        const row = document.createElement("tr")
        tbody.appendChild(row)

        for (let j = 0; j < headers.length; j++) {
            var value = rowData[j]
            cell = document.createElement("td")
            row.appendChild(cell)
            cell.innerHTML = value
        }

        if (tableConfig.rowClickHandler) {
            row.onclick = (event) => {
                tableConfig.rowClickHandler(rowData)
            }
        }
    }

    return table

}

export {createTable}