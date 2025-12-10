const q = require("../index");

// Simple random email generator
function randomEmail() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let part = "";
    for (let i = 0; i < 8; i++) part += chars[Math.floor(Math.random() * chars.length)];
    return `${part}@example.com`;
}

(async () => {
    // 1. Calculate the theoretical optimal parameters
    const { bits, k } = q.calculate({
        expected: 1_000_000,
        fpr: 0.001
    });

    console.log("=== Q U E   D E M O ===");
    console.log(`Optimal size: ${(bits / 8 / 1024).toFixed(2)} KB`);
    console.log(`Optimal hash count: ${k}`);
    console.log("\n");

    // 2. Create instance
    const que = new q({
        file: "./demo/auth.que",
        expected: 1_000_000,
        fpr: 0.001,
        attributes: ["email", "password"],
        chunk: 8 * 1024 * 1024 // 8 MB chunks
    });

    await que.load();

    // 3. Prepare batch of payloads
    const additions = [
        { email: "admin@example.com", password: "root123" },
        { email: "user@example.com", password: "pass" }
    ];

    for (let i = 0; i < 10; i++) {
        additions.push({ email: randomEmail(), password: "password" });
    }

    // 4a. Atomic additions (normal)
    console.log("Adding elements atomically...");
    let startAdd = Date.now();
    for (const payload of additions) {
        await que.add(payload);
        console.log(`   ✔ Added: ${payload.email}`);
    }
    let endAdd = Date.now();
    const atomicAvg = (endAdd - startAdd) / additions.length;
    console.log(`Done in ${endAdd - startAdd}ms`);
    console.log(`Average atomic addition time: ${atomicAvg.toFixed(3)}ms\n`);

    // 4b. Dangerous batch addition
    console.log("Adding elements in dangerous batch mode...");
    // regenerate payloads for fair test
    const batchAdditions = additions.map(p => ({ ...p }));
    startAdd = Date.now();
    await que.add(batchAdditions, { dangerously: true });
    endAdd = Date.now();
    const batchAvg = (endAdd - startAdd) / batchAdditions.length;
    console.log(`Done in ${endAdd - startAdd}ms`);
    console.log(`Average dangerous batch addition time: ${batchAvg.toFixed(3)}ms\n`);

    // 5. Testing — includes true positives, false positives, and guaranteed negatives
    console.log("Testing membership...");
    const tests = [
        { email: "admin@example.com", password: "root123" }, // true
        { email: "user@example.com", password: "pass" }, // true
        { email: additions[5].email, password: "password" }, // random true
        { email: "admin@example.com", password: "wrong" }, // false
        { email: "nobody@example.com", password: "123" } // guaranteed false
    ];

    const startTest = Date.now();
    for (const payload of tests) {
        const result = await que.est_ce(payload);
        console.log(
            `   ? Test: ${payload.email.padEnd(20)} -> ${result ? "Possibly in set" : "Definitely not"}`
        );
    }
    const endTest = Date.now();
    console.log(`Testing took ${endTest - startTest}ms`);
    console.log(`Average lookup time: ${((endTest - startTest) / tests.length).toFixed(3)}ms\n`);

    // 6. Show theoretical filter behavior for fun
    console.log("Filter properties:");
    console.log(`   Expected FPR: 0.1%`);
    console.log(`   Bits per entry: ${(bits / 1_000_000).toFixed(2)}`);
    console.log(`   File size: ~${(bits / 8 / 1024 / 1024).toFixed(2)} MB`);

    await que.close();
    console.log("\nCompleted cleanly.");
})();
