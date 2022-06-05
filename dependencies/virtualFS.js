module.exports = {
	files: {},

	writeFile: function(fileName, data, cb) {
		console.log('args', arguments)
		this.files[fileName] = data;
		if(cb) cb(false, data); 
	},
	unlinkSync: function(fileName) {
		delete this.files[fileName]
	},
	unlink: function(fileName, cb) {
		var oldFile = this.files[fileName]+'';
		delete this.files[fileName];
		if(cb) cb(false, oldFile); 
	},
	readFile: function(fileName, cb) {
		if(cb) cb(false, this.files[fileName]); 
	},
	readFileSync: function(fileName) {
		return this.files[fileName]; 
	},
	mkdir: function(dirName, cb) {

	},
	rmdir: function(dirName, cb) {

	},
	readdir: function(dirName, cb) {

	}
}