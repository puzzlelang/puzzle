var dsl = require('./dsl.js');

dsl.lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    $: {
        use: {
            follow: ["{namespace}", "$from"],
            method: function(ns) {
                dsl.lang.context['importNamespace'] = ns;
                console.log(ns)
            }
        },
        import: {
            follow: ["{namespace}", "$from"],
            method: function(ns) {
                dsl.lang.context['importNamespace'] = ns;
                console.log(ns)
            }
        },
        from: {
            follow: ["{url}"],
            method: function(url) {
                dsl.lang.context['importUrl'] = url;
                console.log(url)
            }
        },
        define: {
            follow: ["$objectFamily"],
            method: function() {
                console.log('define');
            }
        },
        add: {
            follow: ["{name}", "$width"],
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
        }
    }
};

dsl.api.object = function(p) {
    console.log('object', p);
}

//dsl.parse("set objectFamily w test")

//dsl.parse('add object width s and {sdg}')

dsl.parse('import objy from @spootechnologies/objy;')

//dsl.parse('define objectFamily width {sdg} and af and set d')

//dsl.parse('update object 33 set name=test and set type=33')

//dsl.parse("define objectFamily width name=type and width pluralName=types;")

//dsl.parse("define objectFamily template set sg exec")