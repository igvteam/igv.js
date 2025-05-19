import BPTree from "./bpTree.js"


export default class ChromTree {

    nameToId = new Map()
    idToName = new Map()

    constructor(path, config, startOffset, loader) {
        this.path = path
        this.config = config
        this.startOffset = startOffset

        this.bpTree = new BPTree(path, config, startOffset, 'BPChromTree', loader)
    }

    async init() {
        return this.bpTree.init()
    }

    getItemCount() {
        return this.bpTree.getItemCount()
    }

    /**
     * Return the chromosome ID for the given name. This is the internal chromosome ID for the parent BB file only.
     * @param {string} chr - The chromosome name.
     * @returns {number|null} - The chromosome ID or null if not found.
     */
    async getIdForName(chr) {
        if (this.nameToId.has(chr)) {
            return this.nameToId.get(chr)
        } else {
            try {
                const result = await this.bpTree.search(chr)
                if (result) {
                    const id = result.id
                    this.nameToId.set(chr, id)
                    return id
                } else {
                    return
                }
            } catch (error) {
                throw new Error(error)
            }
        }
    }

    /**
     * Return the chromosome name for the given ID. This is a potentially expensive operation as it involves
     * walking the tree until the leaf item for the given name is found. Currently it is used in only 2
     * situations:
     * (1) decoding features from a bigbed search-by-name query
     * (2) decoding bigwig data from the whole genome view
     * @param {number} id
     * @return {string|null}
     */
    async getNameForId(id) {
        if (this.idToName.has(id)) {
            return this.idToName.get(id)
        } else {
            const name = await this.searchForName(id)
            if (name !== null) {
                this.idToName.set(id, name)
                return name
            }
        }
        return null
    }

    /**
     * Perform a reverse search by traversing the tree starting at the given offset. This is potentially expensive
     * as it traverses the tree to find the name corresponding to the given ID.  It shoud not be used for large trees.
     *
     * @param {number} id - The ID to search for.
     * @returns {string|null} - The name corresponding to the ID, or null if not found.
     */
    async searchForName(id) {

        const reverseSearch = async (offset, id) => {

            const node = await this.bpTree.readTreeNode(offset)

            let found = null

            if (node.type === 1) {
                // Leaf node
                for (const item of node.items) {
                    const key = item.key
                    const itemId = item.value.id
                    if (itemId === id) {
                        found = key
                    }
                    // Cache the name and ID for future lookups
                    this.nameToId.set(key, itemId)
                    this.idToName.set(id, itemId)
                }
                return found
            } else {
                // Non-leaf node
                for (const item of node.items) {
                    found = await reverseSearch.call(this, item.offset, id)
                    if (found !== null) {
                        break
                    }
                }
            }
            return found
        }

        try {
            return reverseSearch.call(this, this.startOffset + 32, id)
        } catch (error) {
            throw new Error(error)
        }
    }

    /**
     * Return an estimated length of the genome, which might be the actual length if the number of contigs is small.
     * This is only used for calculating a default feature visibility window.
     *
     * @return {number}
     */
    async estimateGenomeSize() {
        try {
            const runningTotal = {total: 0, count: 0}
            await this.accumulateSize(this.startOffset + 32, runningTotal, 10000)
            const itemCount = this.getItemCount()
            return (itemCount / runningTotal.count) * runningTotal.total

        } catch (error) {
            console.error("Error estimating genome size", error)
            return -1
        }
    }

    async accumulateSize(offset, runningTotal, maxCount) {

        const node = await this.bpTree.readTreeNode(offset)

        if (node.type === 1) {
            // Leaf node
            for (const item of node.items) {
                const value = item.value
                runningTotal.total += value.size
                runningTotal.count += 1
            }
        } else {
            // Non-leaf node.  Items are visited in random order to avoid biasing the estimate
            const shuffledItems = node.items.slice().sort(() => Math.random() - 0.5)
            for (const item of shuffledItems) {
                await this.accumulateSize(item.offset, runningTotal, maxCount)
                if (runningTotal.count > maxCount) {
                    break
                }
            }
        }
        return runningTotal
    }

}