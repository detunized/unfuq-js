function foo() {
    return a(), b(), c();
}

//---

function foo() {
    a();
    b();
    return c();
}
