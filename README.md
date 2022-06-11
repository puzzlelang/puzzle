# PUZZLE

![puzzle](https://github.com/puzzlelang/puzzlelang.github.io/blob/master/assets/puzzle.png?raw=true "Puzzle logo")

PUZZLE as an abstract, extendable programming language.

***Important:*** The puzzle project is in early stage and under development. It's not yet production ready. If you'd like to contribute to the code or the module ecosystem, feel free to open a PR.

# Example


```puzzle
// Output something
print 'Welcome future puzzle developer!';

// Include a thrid party module (local or remote)
use 'https://url.com/module.js';

// stora a variable
set name Test;
```

# Get started

PUZZLE runs on JavaScript Engines and can be used on Node, Browsers and via it's CLI.

## Install

```shell
$ npm i puzzlelang --global
```

## Interactive Shell (CLI)


```shell
$ puzzle
$ print "Hello World!"
"Hello World"
```

## Run a File


```javascript
// hello.puzzle
print "I am a puzzle file"
```


```shell
$ puzzle run hello.puzzle
"I am a puzzle file"
```


## Embedded (JavaScript)

puzzle scripts can also be run inside JavaScript

> Node

```javascript
puzzle.parse('print "Hello, I am embedded"')
```

> Browsers

```html
<script src="https://cdn.jsdelivr.net/npm/puzzlelang@latest/puzzle.browser.js">
```

```javascript
// For Node.js
const puzzle = require('puzzlelang');

// For browsers:
<script src="puzzle.js"/>
<script type="text/x-puzzle">
  print "hello from the browser!";
</script>
```


# Contribute

You are welcome to contribute to the puzzle language and ecosystem. Make sure you familiarize yourself with the [Contribution Guidelines](.github/CONTRIBUTE.md) before opening a PR or Issue.

# License

PUZZLE is open source and released under the MIT License.

[ See the license ](https://github.com/puzzlelang/puzzle/blob/master/LICENSE)

Copyright (c) M. Boelling