/**
 * A data/feature source helper class for managing chromosome aliasing.  Maps reference sequence names to aliases
 * used by the feature source (e.g. chr20 -> 20).
 */
class ChromAliasManager {

    chrAliasTable = new Map()

    /**
     * @param sequenceNames - Sequence names defined by the data source (e.g. bam or feature file)
     * @param genome        - Reference genome object.
     */
    constructor(sequenceNames, genome) {
        this.sequenceNames = new Set(sequenceNames)
        this.genome = genome
    }

    async getAliasName(chr) {
        if (!this.genome) {
            return chr   // A no-op manager, used in testing.
        }

        if (!this.chrAliasTable.has(chr)) {
            const aliasRecord = await this.genome.getAliasRecord(chr)
            if (!aliasRecord) {
                this.chrAliasTable.set(chr, undefined)  // No know alias, record to prevent searching again
            } else {
                let alias
                const aliases = Object.keys(aliasRecord)
                    .filter(k => k !== "start" && k !== "end")
                    .map(k => aliasRecord[k])
                    .filter(a => this.sequenceNames.has(a))
                if (aliases.length > 0) {
                    alias = aliases[0]
                }

                this.chrAliasTable.set(chr, alias)  // alias may be undefined => no alias exists. Setting prevents repeated attempts
            }
        }

        return this.chrAliasTable.get(chr)
    }
}

export default ChromAliasManager
