const fs = require('fs');
const https = require('https');
const npm = require("npm");
const pjson = require('./package.json');

var dsl = require('./dsl.js');

if (typeof module !== 'undefined' && module.exports) {
    environment = "node";
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./localStorage');
}

var useSyntax = global.luke.useSyntax;


var lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    vars: {},
    currentNamespace: "default",
    static: {
        execStatement: function() {

            if (lang.context[lang.context.importNamespace]) {
                try {
                    lang.context[lang.context.importNamespace] = require(lang.context.importUrl);
                } catch (e) {
                    console.log('Import Error:', e)
                }
            }

            if (lang.context['unUseNamespace']) {
                if (global.luke.moduleStorage.get('_' + lang.context['unUseNamespace'])) {
                    global.luke.moduleStorage.remove('_' + lang.context['unUseNamespace']);
                    console.log(lang.context['unUseNamespace'], 'unused');
                }
            }

            if (lang.context['useNamespace']) {

                try {

                    var fileName = lang.context['useNamespace'];
                    var extention = fileName.split(".")[fileName.split(".").length - 1];

                    if (fileName.indexOf('https://') == 0) {

                        https.get(fileName, (resp) => {
                            var data = '';

                            resp.on('data', (chunk) => {
                                data += chunk;
                            });

                            resp.on('end', () => {

                                if (lang.context['_' + lang.context['useNamespace'] + 'permanent']) {
                                    if (!localStorage.getItem('_' + lang.context['useNamespace'])) localStorage.setItem('_' + lang.context['useNamespace'], data)
                                }

                                useSyntax(lang, eval(data));
                            });

                        }).on("error", (err) => {
                            console.log("Error: " + err.message);
                        });

                    } else if (fileName.indexOf('$catalog/') == 0) {
                        var name = fileName.split('/')[1];
                        var file = require('node_modules/luke-lang/luke-catalog/modules/' + name);
                        useSyntax(lang, file);
                    } else if (extention.toLowerCase() == "json") {
                        var syntax = fs.readFileSync(fileName, 'utf8');
                        useSyntax(lang, JSON.parse(syntax));
                    } else if (extention.toLowerCase() == "js") {
                        if (fileName.charAt(0) != '/') fileName = './' + fileName;
                        var file = require(fileName);
                        useSyntax(lang, file);
                    } else console.log('unsupported file type')


                } catch (e) {
                    console.log('Use Error', e);
                }
            }
        }
    },
    "$": {
        default: {
            ns: {
                manual: "Sets a namespace. Valid until another namespace is set",
                follow: ["{namespace}"],
                method: function(ns) {
                    lang.currentNamespace = ns;
                    console.log('Set namespace', ns)
                }
            },
            var: {
                manual: "Sets a variable",
                follow: ["{key,value}"],
                method: function(data) {
                    global.luke.vars[data.key] = data.value;
                    console.log('vars', global.luke.vars)
                }
            },
            version: {
                manual: "See the installed version of luke",
                follow: [],
                method: function(data) {
                    console.log('luke version: ', pjson.version)
                }
            },
            use: {
                follow: ["$permanent", "{file}"],
                method: function(ns) {
                    lang.context['useNamespace'] = ns;
                }
            },
            unuse: {
                follow: ["{file}"],
                method: function(ns) {
                    lang.context['unUseNamespace'] = ns;
                }
            },
            permanent: {
                follow: ["{file}"],
                method: function(file) {
                    lang.context['useNamespace'] = file;
                    lang.context['_' + file + 'permanent'] = true;
                    console.log('permanent', file)
                }
            },
            print: {
                follow: ["{text}"],
                method: function(text) {
                    console.log(text)
                }
            },
            list: {
                follow: ["{param}"],
                method: function(param) {
                    switch (param) {
                        case 'modules':
                            console.log(Object.keys(lang['$']).join(', '));
                            break;
                        case 'commands':
                            Object.keys(lang['$']).forEach((ns) => {
                                console.log('namespace:', ns, '\n');
                                Object.keys(lang['$'][ns]).forEach(c => {
                                    var man = "";
                                    if (lang['$'][ns][c].manual) man = ' (' + lang['$'][ns][c].manual + ')';
                                    console.log('  ', c, man)
                                    lang['$'][ns][c].follow.forEach(f => {
                                        console.log('\t...', f)
                                    })
                                    console.log('\n')
                                })
                            })
                            break;
                    }
                }
            },
            download: {
                follow: ["{param}"],
                method: function(param) {
                    https.get(param, (resp) => {
                        var data = '';

                        resp.on('data', (chunk) => {
                            data += chunk;
                        });

                        resp.on('end', () => {
                            var fileName = param.split('/')[param.split('/').length - 1];
                            fs.writeFileSync(fileName, data)
                            console.log(fileName, 'downloaded');
                        });

                    }).on("error", (err) => {
                        console.log("Error: " + err.message);
                    });
                }
            },
            install: {
                follow: ["{param}"],
                method: function(param) {
                    npm.load({
                        loaded: false
                    }, function(err) {
                        npm.commands.install([param], function(er, data) {
                            console.log(er, data);
                        });
                        npm.on("log", function(message) {
                            console.log(message);
                        });
                    });
                }
            },
        }

    }

}

module.exports = lang;