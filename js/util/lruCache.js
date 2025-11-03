class LRU {
    constructor(max = 10) {
        this.max = max
        this.map = new Map()
    }

    get(key) {
        let item = this.map.get(key)
        if (item) {
            // refresh key
            this.map.delete(key)
            this.map.set(key, item)
        }
        return item
    }

    set(key, val) {
        // If key exists, delete it to refresh its position later
        if (this.map.has(key)) {
            this.map.delete(key)
        }
        // If cache is full, evict the oldest item
        else if (this.map.size === this.max) {
            this.map.delete(this.first())
        }
        this.map.set(key, val)
    }

    has(key) {
        return this.map.has(key)
    }

    clear() {
        this.map.clear()
    }

    first() {
        return this.map.keys().next().value
    }
}

//ref https://stackoverflow.com/questions/996505/lru-cache-implementation-in-javascript

export default LRU
