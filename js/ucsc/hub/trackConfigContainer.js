class TrackConfigContainer {
        constructor(name, label, priority, defaultOpen) {
            this.name = name;
            this.priority = priority;
            this.label = label;
            this.defaultOpen = defaultOpen;
            this.tracks = [];
            this.children = [];
        }

        isEmpty() {
            return this.tracks.length === 0 &&
                (!this.children || this.children.length === 0 || this.children.every(child => child.isEmpty()));
        }

        map(callback) {
            this.tracks.forEach(callback);
            this.children.forEach(child => child.map(callback));
        }

        findTracks(filter) {
            const found = [];
            this._find(found, filter);
            return found;
        }

        _find(found, filter) {
            this.tracks.forEach(track => {
                if (filter(track)) {
                    found.push(track);
                }
            });
            this.children.forEach(child => child._find(found, filter));
        }

        countTracks() {
            return this.tracks.length + this.children.reduce((count, child) => count + child.countTracks(), 0);
        }

        countSelectedTracks() {
            const selectedCount = this.tracks.filter(track => track.visible).length;
            return selectedCount + this.children.reduce((count, child) => count + child.countSelectedTracks(), 0);
        }

        trim() {
            this.children = this.children.filter(child => !child.isEmpty());
            this.children.forEach(child => child.trim());
        }

        setTrackVisibility(loadedTrackPaths) {
            this.tracks.forEach(track => {
                track.visible = loadedTrackPaths.has(track.url);
            });
            this.children.forEach(child => child.setTrackVisibility(loadedTrackPaths));
        }
    }

    export default TrackConfigContainer;