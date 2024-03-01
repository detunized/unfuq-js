// Don't split inside for loops

function foo() {
    void 0;
    var a = void 0;
    if (window.foo === void 0)
        return;
}

//---

function foo() {
    undefined;
    var a = undefined;
    if (window.foo === undefined)
        return;
}
