// Brackets are added when needed

function foo() {
    if (true)
        return a(), b(), c();
}

//---

function foo() {
    if (true) {
        a();
        b();
        return c();
    }
}
