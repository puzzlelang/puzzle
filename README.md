# puzzle

![Node.js Package](https://github.com/puzzlelang/puzzle/workflows/Node.js%20Package/badge.svg)

![puzzle](http://puzzlelang.org/puzzle-invert.png "Puzzle logo")

puzzle as an abstract, extendable programming language and platform that allows custom syntax for domain specific solutions.

***Important:*** The puzzle project is in early stage and under development. It's not yet production ready. If you'd like to contribute to the code or the module ecosystem, feel free to open a PR.

# Example


```puzzle
// Output something
print 'Welcome future puzzle developer!';

// Include a thrid party module (local or remote)
use 'https://url.com/module.js';

// stora a variable
var name 'Test';
```

# Get started

puzzle runs on JavaScript Engines and can be used on Node, Browsers and via it's CLI.

## Interactive Shell (CLI)

```shell
$ npm i puzzlelang --global
```

```shell
$ puzzle
$ print "Hello World!"
"Hello World"
```

## Run a File

```shell
$ npm i puzzlelang --global
```

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
npm i puzzlelang --save
```

```javascript
puzzle.parse('print "Hello, I am embedded"')
```

> Browsers

```html
<script src="https://cdn.jsdelivr.net/gh/puzzlelang/puzzle/puzzle.browser.js">
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

puzzle is open source and released under the MIT License.

[ See the license ](https://github.com/puzzlelang/puzzle/blob/master/LICENSE)

Copyright (c) 2020 - present, Marco Boelling
