module.exports = {
	LocalStorage: function() {
		return {
			data: {},
			_keys: [],
			setItem: function(key, value) {
				this.data[key] = value;
				this._keys.push(key);
			},
			getItem: function(key) {
				return this.data[key];
			},
			removeItem: function(key) {
				var self = this;
				delete this.data[key];
				this._keys.forEach((k,i) => {
					if(key == k) self._keys.splice(i,1);
				})
			}
		}
	}
}