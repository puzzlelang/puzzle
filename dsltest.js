var dsl = require('./dsl.js');

dsl.lang = {
    delimeter: ";",
    assignmentOperator: "=",
    commands: {
        add: {
            follow: ["$objectFamily"],
            method: function() {

            }
        },
        delete: "${ofName}",
        get: "${ofName}",
        update: "${ofName}",
        define: "$objectFamily"
    },
    $: {
        obj: {
            follow: ["$set"],
            method: function() {

            }
        },
        "{ofName}": {
            follow: ["$set"],
            method: function() {

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



//dsl.parse("set objectFamily w test")

//dsl.parse("add object set test set 22 ")

//dsl.parse("define objectFamily width name=type and width pluralName=types;")

dsl.parse("add objectFamily object set sg exec")