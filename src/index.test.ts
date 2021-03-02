test("Sanity test that index.ts doesn't blow up", () => {
    expect(() => {
        require("./index");
    }).not.toThrow();
});
