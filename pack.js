#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');

const puzzle = require('./puzzle.js');
const fs = require('fs');

program
    .command('pack <type>')
    .description('Package your app')
    .action(function(type, args) {
        puzzle.init();
        console.log(type)
        var code = fs.readFileSync(type, 'utf8');
        
        var parts = {}; //code.split(this.lang.delimeter);

        var litStart = ['(', '{', '"', "'"];
        var litEnd = [')', '}', '"', "'"];


        partsCounter = 0;
        var litActive = null;
        var litActiveCounter = 0;

        code.split('').forEach(function(t) {

            if (/^\s+$/.test(t) && !litActive) partsCounter++;

            if (!parts[partsCounter]) parts[partsCounter] = [];

            if (!litStart.includes(t)) {
                parts[partsCounter].push(t)

                if (litActive && t == litEnd[litActive.litIdx]) {
                    litActiveCounter--;
                    if (litActiveCounter == 0) {
                        partsCounter++;
                        if (!parts[partsCounter]) parts[partsCounter] = [];
                        litActive = null;
                    }
                }
            } else if (litActive && litStart.includes(t) && t == litEnd[litActive.litIdx]) {
                litActiveCounter--;
                parts[partsCounter].push(t)
                if (litActiveCounter == 0) {
                    partsCounter++;
                    if (!parts[partsCounter]) parts[partsCounter] = [];
                    litActive = null;
                }
            } else if (!litActive) {
                partsCounter++;
                if (!parts[partsCounter]) parts[partsCounter] = [];
                parts[partsCounter].push(t)
                litActive = {
                    token: t,
                    litIdx: litStart.indexOf(t)
                };
                litActiveCounter++;
            } else {
                if (litActive && t == litActive.token) litActiveCounter++;
                parts[partsCounter].push(t)
            }

        });

        console.log(parts)

    });

program.parse(process.argv);

process
    .on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', err => {
        console.error(err, 'Uncaught Exception thrown');
    });