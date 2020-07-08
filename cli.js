#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const luke = require('./dsl.js');
const fs = require('fs');

program
    .command('run <type>')
    .description('Run your app')
    .action(function(type, args) {
        var code = fs.readFileSync(type, 'utf8');
        luke.parse(code);
    });

program
    .description('Run your app')
    .action(function(type, args) {

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

                    luke.parse(content.input)
                    input();
                });
        }
        input();
    });

program.parse(process.argv);