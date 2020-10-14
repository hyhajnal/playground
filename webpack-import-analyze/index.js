const num = Math.random();

if (num > .5) {
    import('./moduleA').then(val => {
        console.log(val);
    })
} else {
    import('./moduleB').then(val => {
        console.log(val);
    })
}
