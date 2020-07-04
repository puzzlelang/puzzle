var dsl = require('./dsl.js');

dsl.lang = {
		delimeter: ";",
		commands: {
			test: "$obj",
			add: "${ofName}",
			delete: "${ofName}",
			"define": "$objectFamily"
		},
		$: {
			obj: ["$set"],
			"{ofName}":  ["$set"],
			objectFamily:  ["$set"],
			set:  ["{name}", "$set", "$and", "$with"],
			"{with}": ["{name}"],
			and: ["$set"]
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

dsl.parse("define objectFamily set users ;test obj set name test and set 22 and set 44")