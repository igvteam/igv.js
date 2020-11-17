class GenericMapDatasource {

    constructor(config) {

        this.isJSON = config.isJSON || false

        if (config.genomeId) this.genomeId = config.genomeId
        if (config.dataSetPathPrefix) this.dataSetPathPrefix = config.dataSetPathPrefix
        if (config.urlPrefix) this.urlPrefix = config.urlPrefix
        if (config.dataSetPath) this.path = config.dataSetPath

        this.addIndexColumn = config.addIndexColumn || false

        this.columnDictionary = {};

        for (let column of config.columns) this.columnDictionary[ column ] = column

        if (config.hiddenColumns || config.titles) {

            this.columnDefs = []
            const keys = Object.keys(this.columnDictionary)

            if (config.hiddenColumns) {
                for (let column of config.hiddenColumns) {
                    this.columnDefs.push({ visible: false, searchable: false, targets: keys.indexOf(column) })
                }
            }

            if (config.titles) {
                for (let [ column, title ] of Object.entries(config.titles)) {
                    this.columnDictionary[ column ] = title
                    this.columnDefs.push({ title, targets: keys.indexOf(column) })
                }
            }

        } else {
            this.columnDefs = undefined
        }

        if (config.parser) this.parser = config.parser
        if (config.trackLoader) this.selectionHandler = config.trackLoader
        if (config.tracks) this.tracks = config.tracks
    }

    tableColumnDictionary() {
        return this.columnDictionary
    }

    async tableData() {

        if (this.tracks) {
            return this.tracks
        } else {

            let response = undefined;

            try {
                response = await fetch(this.path);
            } catch (e) {
                console.error(e)
                return undefined;
            }

            if (response) {

                if (true === this.isJSON) {
                    const obj = await response.json();
                    return this.parser(obj, this.columnDictionary, this.addIndexColumn);
                } else {
                    const str = await response.text();
                    return this.parser(str, this.columnDictionary, this.addIndexColumn);
                }
            }

        }

    }

    tableSelectionHandler(selectionList) {
        if (this.selectionHandler) {
            return this.selectionHandler(selectionList)
        } else {
            return selectionList
        }
    };

}

export default GenericMapDatasource
