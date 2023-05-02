class LRU {
    constructor(max = 10) {
        this.max = max;
        this.map = new Map();
    }

    get(key) {
        let item = this.map.get(key);
        if (item) {
            // refresh key
            this.map.delete(key);
            this.map.set(key, item);
        }
        return item;
    }

    set(key, val) {
        // refresh key
        if (this.map.has(key)) this.map.delete(key);
        // evict oldest
        else if (this.map.size === this.max) {
            this.map.delete(this.first());
        }
        this.map.set(key, val);
    }

    has(key) {
        return this.map.has(key);
    }

    clear() {
        this.map.clear();
    }

    first() {
        return this.map.keys().next().value;
    }
}

//ref https://stackoverflow.com/questions/996505/lru-cache-implementation-in-javascript

export default LRU
