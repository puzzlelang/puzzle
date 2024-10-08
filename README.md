![puzzle](https://github.com/puzzlelang/puzzlelang.github.io/blob/master/assets/puzzle.png?raw=true "Puzzle logo")

<div class="cover-main"><!-- _coverpage.md -->
<h1 class="header" style="padding: 0px !important;margin-left:0px;">An <span class="highlight-primary">abstract</span>, fluent programming language on top of JavaScript</h1>

> Comes with ready-to-use features for any purpose

***Important:*** The puzzle project is in early stage and under development. It's not yet production ready. If you'd like to contribute to the code or the module ecosystem, feel free to open a PR.

# Example

```puzzle
every(1000).print('hello world')
```

# Get started

PUZZLE runs in any JavaScript environment, including Node and Browsers.

> Node

```shell
$ npm i puzzlelang --global
```
```javascript
const puzzle = require('puzzlelang');

print('hello')
```

> Browsers

```html
<script src="https://cdn.jsdelivr.net/npm/puzzlelang@latest/puzzle.browser.js">
```
```html
<script type="text/javascript">
  print("hello from the browser!");
</script>
```

# Language Basics

## Print

```javascript
print('hello')
```

## Variables

Variables can be defined either the JavaScript way or using puzzle syntax

```javascript
// with JavaScript
var name = 'Peter';

// with Puzzle
set('name', 'Peter')
print(name)
```

## Persistent Variables

Persistend variables are stored locally

```javascript
set('name', 'Peter').local()
```

## Functions

Like variables, functions can also be defined either the JavaScript way or using puzzle syntax

```javascript
set('sayHello', (name) => {
  print('hello ' + name)
})

// With JavaScript
var sayHello = () => {
  print('hello')
}
```


## Scheduled Functions

Functions can be scheduled

```javascript
// Repeat every X milliseconds
every(2000).run(sayHello)

// Repeat X times
repeat(10).run(sayHello)

// Run after X milliseconds
after(10000).run(sayHello)
```

## Loops

Loops can iteragte over data (arrays)

```javascript
var array = [1,2,3]

loop.over(data).do(it => {
  print(it)
})
```


## Math

```javascript
// min and max
min([1,4,6,7]).as('result')
max([4,7,8,2]).as('result')
```
