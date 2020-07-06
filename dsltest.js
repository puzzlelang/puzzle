var dsl = require('./dsl.js');

dsl.lang = {
    delimeter: ";",
    assignmentOperator: "=",
    commands: {
        add: {
            follow: ["${ofName}"],
            method: function(p) {
            	console.log('add('+p+')');
            }
        },
        define: {
        	follow: ["$objectFamily"],
        	method: function()
        	{
        		console.log('define');
        	}
        }
    },
    $: {
        obj: {
            follow: ["$set"],
            method: function() {

            }
        },
        "{ofName}": {
            follow: ["$set"],
            method: function(p) {
            	console.log('ofname('+p+')');
            }
        },
        objectFamily: {
            follow: ["$set", "$width", "${ofName}"],
            method: function(p) {
                console.log('objectFamily(' + p + ')');
            }
        },
        set: {
            follow: ["{name}", "$set", "$and", "$with", "$key", "$exec"],
            method: function(r) {
                console.log('set(' + r + ')');
            }
        },
        "width": {
            follow: ["{name}", "$and"],
            method: function(p) {
                console.log('width(' + JSON.stringify(p) + ')');
            }
        },
        and: {
            follow: ["$set", "$width"],
            method: function() {

            }
        },
        exec: {
            follow: [],
            method: function() {
                console.log('exec');
            }
        }
    }
};

dsl.api.template = function()
{
	console.log('tmpls');
}


//dsl.parse("set objectFamily w test")

dsl.parse("add object set test set 22 ")

//dsl.parse("define objectFamily width name=type and width pluralName=types;")

dsl.parse("define objectFamily template set sg exec")