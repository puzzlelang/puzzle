var dsl = require('./dsl.js');

dsl.lang = {
		delimeter: ";",
		assignmentOperator: "=",
		commands: {
			test: "$obj",
			add: "${ofName}",
			delete: "${ofName}",
			define: "$objectFamily"
		},
		$: {
			obj: ["$set"],
			"{ofName}":  ["$set"],
			objectFamily:  ["$set", "$width"],
			set: {
				follow: ["{name}", "$set", "$and", "$with", "$key"],
				method: function(r)
				{
					console.log('set('+r+')');
				}
			},
			"width": {
				follow: ["{name}", "$and"],
				method: function(p){
					console.log('width('+JSON.stringify(p)+')');
				}
			},
			and: ["$set", "$width"]
		}
	};


dsl.api = 
{
	chain: [],

	object: function()
	{
		console.log('object().')
		this.chain.push('object().');
		return this;
	},

	obj: function()
	{
		console.log('obj().')
		this.chain.push('obj().');
		return this;
	},

	test: function()
	{
		console.log('test().')
		this.chain.push('test().');
		return this;
	},

	set: function(param){
		console.log('set('+param+')')
		this.chain.push('set('+param+')');
		return this;
	},

	define: function(param)
	{
		console.log('define('+param+')')
		this.chain.push('define('+param+')');
		return this;
	},

	objectFamily: function(param)
	{
		console.log('objectFamily()')
		this.chain.push('objectFamily()');
		return this;
	},

	add: function(){
		console.log('add()')
		this.chain.push('add()');
		return this;
	},

	
	w: function(param)
	{
		console.log('api w', param)
		this.chain.push('w('+param+')');
		return this;
	},

	exec: function()
	{
		console.log("EXEC", this.chain);
		return this;
	}
}

//dsl.parse("set objectFamily w test")

//dsl.parse("add object set test set 22 ")

dsl.parse("define objectFamily width name=type and width pluralName=types;")