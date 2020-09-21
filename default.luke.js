var environment = 'browser';
if ((typeof process !== 'undefined') && ((process.release || {}).name === 'node')) {
    environment = "node";
    const dependencies = require('./dependencies.js');
    fs = dependencies.fs;
    fetch = dependencies.fetch;
    npm = dependencies.npm;
    pjson = require('./package.json');
} else {
    global = window;

    fs = {
        readFile: function(url, encoding, cb) {
            if (url.indexOf('ls://') == 0)
                return cb(localStorage.getItem(url))

            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                if (cb) cb(event.target.result);
            });
            reader.readAsDataURL(url);
        },
        writeFile: function(url, data, cb) {
            cb(localStorage.setItem('ls://' + url, data))
        }
    }
}

var lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    vars: {},
    currentNamespace: "default",
    static: {
        execStatement: function(done) {

            if (lang.context[lang.context.importNamespace]) {
                if (environment != 'node') return global.luke.output('feature not available in this environment')
                try {
                    lang.context[lang.context.importNamespace] = require(lang.context.importUrl);
                } catch (e) {
                    global.luke.output('Import Error:', e)
                }
                if (done) done();
            }

            if (lang.context['unUseNamespace']) {
                if (global.luke.moduleStorage.get('_' + lang.context['unUseNamespace'])) {
                    global.luke.moduleStorage.remove('_' + lang.context['unUseNamespace']);
                    global.luke.output(lang.context['unUseNamespace'], 'unused');
                }
            }

            if (lang.context['useNamespace']) {

                try {
                    var fileName = lang.context['useNamespace'];
                    var extention = fileName.split(".")[fileName.split(".").length - 1];

                    if (fileName.indexOf('https://') == 0) {

                        fetch(fileName)
                            .then(res => res.text())
                            .then(data => {
                                if (lang.context['_' + lang.context['useNamespace'] + 'permanent']) {
                                    if (!localStorage.getItem('_' + lang.context['useNamespace'])) localStorage.setItem('_' + lang.context['useNamespace'], data)
                                }

                                if (environment == 'node') {
                                    var syntax = new Function("module = {}; " + data + " return syntax;")();
                                    global.luke.useSyntax(syntax);
                                } else {
                                    var syntax = new Function("module = {}; " + data + " return syntax;")();
                                    global.luke.useSyntax(syntax);
                                }
                                if (done) done();
                            });

                    } else if (extention.toLowerCase() == "js") {
                        if (environment != 'node') return global.luke.output('feature not available in this environment')

                        if (fileName.charAt(0) != '/') fileName = './' + fileName;
                        var file = require(fileName);
                        global.luke.useSyntax(file);
                        if (done) done();
                    } else {
                        global.luke.output('unsupported file type');
                        if (done) done();
                    }


                } catch (e) {
                    global.luke.output('Use Error', e);
                    if (done) done();
                }
            } else if (lang.context['includeNamespace']) {

                function includeScript(code) {
                    global.luke.parse(code);
                }

                var fileName = lang.context['includeNamespace'];
                var extention = fileName.split(".")[fileName.split(".").length - 1];

                if (fileName.indexOf('https://') == 0) {

                    fetch(fileName)
                        .then(res => res.text())
                        .then(data => {
                            includeScript(data);
                            if (done) done();
                        });

                } else if (extention.toLowerCase() == "luke") {
                    if (fileName.charAt(0) != '/') fileName = './' + fileName;
                    fs.readFile(fileName, function(err, data) {
                        if (err) return global.luke.output('Error reading file');
                        file = data;
                    });
                    includeScript(file)
                    if (done) done();
                } else {
                    global.luke.output('unsupported file type');
                    if (done) done();
                }
            } else if (done) done();
        }
    },
    "$": {
        default: {
            include: {
                manual: "include a luke file",
                follow: ["{file}"],
                method: function(ctx, file) {

                    lang.context['includeNamespace'] = global.luke.getRawStatement(file);

                }
            },
            ns: {
                manual: "Sets a namespace. Valid until another namespace is set",
                follow: ["{namespace}"],
                method: function(ctx, ns) {
                    lang.currentNamespace = ns;

                }
            },
            var: {
                manual: "Sets a variable",
                follow: ["{key,value}"],
                method: function(ctx, data) {
                    global.luke.vars[data.key] = data.value;

                }
            },
            func: {
                manual: "Sets a function",
                follow: ["{key,params,body}"],
                method: function(ctx, data) {
                    global.luke.funcs[data.key] = { params: data.params, body: data.body };

                    console.log('fs', global.luke.funcs);
                }
            },
            if: {
                follow: ["{condition}", "$then"],
                method: function(ctx, condition) {
                    lang.context.if = condition;
                }
            },
            then: {
                follow: ["{statement}", "$else"],
                method: function(ctx, statement) {
                    if (lang.context.if) {
                        lang.context.if = lang.context.if.replace(/AND/g, '&&').replace(/OR/g, '||')
                        if (eval(lang.context.if)) {
                            lang.context.conditionMet = true;
                            global.luke.parse(global.luke.getRawStatement(statement));
                        }
                    }
                }
            },
            else: {
                follow: ["{statement}"],
                method: function(ctx, statement) {
                    if (lang.context.if && !lang.context.conditionMet) {
                        global.luke.parse(global.luke.getRawStatement(statement));
                    }
                }
            },
            while: {
                follow: ["{condition}", "$do"],
                    lang.context.while = condition;
                }
            },
            for: {
                follow: ["{condition}", "$do"],
                method: function(ctx, condition) {
                    lang.context.for = condition;
                }
            },
            do: {
                follow: ["{statement}"],
                method: function(ctx, statement) {
                    //new Function("module = {}; " + data + " return syntax;")();
                    if (lang.context.while) {
                        lang.context.while = lang.context.while.replace(/AND/g, '&&').replace(/OR/g, '||')
                        new Function("while(" + global.luke.getRawStatement(lang.context.while)+"){ luke.parse('" + global.luke.getRawStatement(statement) + "') };")()
                    } else if (lang.context.for) {
                        lang.context.for = lang.context.for.replace(/AND/g, '&&').replace(/OR/g, '||');
                        new Function("for(" + global.luke.getRawStatement(lang.context.for) + "){ luke.parse('var i '+i+'; " + global.luke.getRawStatement(statement) + "') };")()
                    }
                }
            },
            version: {
                manual: "See the installed version of luke",
                follow: [],
                method: function(ctx, data) {
                    global.luke.output('luke version: ', pjson.version)
                }
            },
            use: {
                follow: ["$permanent", "{file}"],
                method: function(ctx, ns) {
                    lang.context['useNamespace'] = global.luke.getRawStatement(ns);

                }
            },
            unuse: {
                follow: ["{file}"],
                method: function(ctx, ns) {
                    lang.context['unUseNamespace'] = ns;
                }
            },
            permanent: {
                follow: ["{file}"],
                method: function(ctx, file) {
                    lang.context['useNamespace'] = global.luke.getRawStatement(file);
                    lang.context['_' + file + 'permanent'] = true;
                }
            },
            print: {
                follow: ["{text}"],
                method: function(ctx, text) {
                    global.luke.output(global.luke.getRawStatement(text))
                }
            },
            list: {
                follow: ["{param}"],
                method: function(ctx, param) {
                    switch (param) {
                        case 'modules':
                            global.luke.output(Object.keys(lang['$']).join(', '));
                            break;
                        case 'commands':
                            Object.keys(lang['$']).forEach((ns) => {
                                global.luke.output('namespace:', ns, '\n');
                                Object.keys(lang['$'][ns]).forEach(c => {
                                    var man = "";
                                    if (lang['$'][ns][c].manual) man = ' (' + lang['$'][ns][c].manual + ')';
                                    var seq = "";
                                    lang['$'][ns][c].follow.forEach(f => {
                                        seq += f + " ";
                                    })
                                    global.luke.output('  ', c, seq, '\t', man)
                                    global.luke.output('\n')
                                })
                            })
                            break;
                    }
                }
            },
            download: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (environment != 'node') return global.luke.output('download not available in this environment')

                    fetch(param)
                        .then(res => res.text())
                        .then(data => {

                            var fileName = param.split('/')[param.split('/').length - 1];
                            fs.writeFile(fileName, data, function(err, data) {
                                global.luke.output(fileName, 'downloaded');
                            })
                        });

                }
            },
            install: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (!npm) return global.luke.output('npm not available in this environment');

                    npm.load({
                        loaded: false
                    }, function(err) {
                        npm.commands.install([param], function(er, data) {
                            global.luke.output(er, data);
                        });
                        npm.on("log", function(message) {
                            global.luke.output(message);
                        });
                    });
                }
            },
        }

    }

}

module.exports = lang;