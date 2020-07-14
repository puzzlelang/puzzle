const fs = require('fs');
const https = require('https');
var npm = require("npm");

var useSyntax = function(lang, jsObject) {

    var _defaultSyntax = lang['$'].default;

    Object.assign(lang, jsObject)
    console.log(Object.keys(jsObject['$'])[0], 'can now be used using: ns', Object.keys(jsObject['$'])[0]);

    lang['$'].default = _defaultSyntax;

    //    console.log('lang', lang);
};

var lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
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
                        if(fileName.charAt(0) != '/') fileName = './' + fileName;
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
            use: {
                follow: ["{file}"],
                method: function(ns) {
                    lang.context['useNamespace'] = ns;
                    console.log(ns)
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