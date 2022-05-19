#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');

const puzzle = require('./puzzle.js');
const fs = require('fs');

const npmview = require('npmview');
const pjson = require('./package.json');

program
    .command('run <type>')
    .description('Run your app')
    .action(function(type, args) {
        puzzle.init();
        try {
            var code = fs.readFileSync(type, 'utf8');
            puzzle.parse(code);
        } catch(e){
            var code = type
            puzzle.parse(code);
        }
    });

program
    .description('Run your app')
    .action(function(type, args) {

        npmview(pjson.name, function(err, version, moduleInfo) {
            if (version > pjson.version) console.log('There is a newer version of puzzle available. Run "npm i puzzle-lang -g" to install it.');
        });

        if (args) {
            try {
                if (args[0] == "include") {
                    var code = fs.readFileSync(args[1], 'utf8');
                    puzzle.parse(code);
                }
            } catch (e) {
                console.log('Error including file', e);
            }
        }

        function input() {
            inquirer
                .prompt([{
                    name: 'input',
                    message: '>',
                }, ])
                .then(content => {

                    if (content.input == 'exit') {
                        console.log('Bye');
                        process.exit(0);
                    }

                    puzzle.parse(content.input)
                    input();

                }).catch(e => {
                    console.log(e)
                });
        }

        puzzle.init();
        input();

    });

program.parse(process.argv);

process
    .on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', err => {
        console.error(err, 'Uncaught Exception thrown');
    });