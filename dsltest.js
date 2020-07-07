var dsl = require('./dsl.js');

dsl.lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    commands: {
        add: {
            follow: ["{name}", "$width"],
            method: function(p) {
                console.log('add(' + p + ')');
            }
        },
        update: {
            follow: ["${ofName}"],
            method: function(p) {
                console.log('update(' + p + ')');
            }
        },
        define: {
            follow: ["$objectFamily"],
            method: function() {
                console.log('define', dsl.context);
            }
        }
    },
    $: {
    	define: {
            follow: ["$objectFamily"],
            method: function() {
                console.log('define');
            }
        },
    	add: {
            follow: ["{name}","$width"],
            method: function(p) {
                console.log('add(' + p + ')');
            }
        },
        obj: {
            follow: ["$set"],
            method: function() {

            }
        },
        objectFamily: {
            follow: ["$set", "$width", "${ofName}", "{name}"],
            method: function(p) {
                console.log('objectFamily(' + p + ')');
            }
        },
        set: {
            follow: ["{name}", "$set", "$and", "$with", "$exec"],
            method: function(r) {
                //console.log(r);
                console.log('set(' + r + ')');
            }
        },
        "width": {
            follow: ["{name}", "$and"],
            method: function(p) {
                console.log('width(' + p + ')');
            }
        },
        and: {
            follow: ["$set", "$width", "{sf}"],
            method: function(p) {
            	console.log('and', p);
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

dsl.api.object = function(p) {
    console.log('object', p);
}

//dsl.parse("set objectFamily w test")

//dsl.parse('add object width s and {sdg}')

dsl.parse('define objectFamily width {sdg} and af and set d')

//dsl.parse('update object 33 set name=test and set type=33')

//dsl.parse("define objectFamily width name=type and width pluralName=types;")

//dsl.parse("define objectFamily template set sg exec")