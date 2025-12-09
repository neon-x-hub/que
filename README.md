# **que**

![Que Banner](/docs/banner.jpg)


[que](https://www.npmjs.com/package/que) | ![npm](https://img.shields.io/npm/v/que.svg)

## **Introduction**

`que` is a high-performance, disk-backed membership engine designed for applications that demand extremely fast lookups with minimal memory usage. Instead of keeping the entire structure in RAM, `que` stores its bit-array on disk and loads only one chunk at a time—allowing it to scale gracefully to tens or hundreds of millions of entries on ordinary hardware.

The design is filter-agnostic: although the initial implementation uses a probabilistic bit-vector (Bloom-style), the architecture is intentionally structured to support multiple filter types in future versions. Chunks, deterministic hashing, partial bit updates, and file-backed persistence are all part of the core foundation that makes `que` suitable for authentication systems, large verification workloads, and environments where reducing database traffic is a priority.

---

## **Rewritten Features**

* **Disk-backed storage with constant memory usage**
  Only one chunk is ever held in memory, allowing the filter to grow extremely large without increasing RAM consumption.

* **Chunked architecture for scalable performance**
  Efficient loading and flushing of fixed-size chunks minimizes disk I/O and enables high-throughput workloads.

* **Filter-agnostic core**
  The engine is not tied to a specific algorithm. The current release uses a fast probabilistic bit-vector implementation, but the design supports adding more filter types later.

* **Deterministic hashing pipeline**
  Reliable and stable hashing over user-defined attributes (email, password, username, etc.) ensures consistent membership checks.

* **Atomic and batch additions**
  Add items one-by-one or in batches, both backed by chunk-aware bit operations.

* **Fast lookup operations**
  Operations perform only the minimum required chunk loads; no need to traverse the full dataset.

* **Lightweight on-disk format**
  `.que` files store configuration, chunk metadata, and the compact bit-payload in a clean, predictable structure.

* **Configurable expected size and false-positive rate**
  The system automatically computes optimal bit-array size and hashing settings based on desired performance.

* **Deterministic, language-agnostic payload serialization**
  Ensures that the same set of attributes always produces the same hash output.

---

## **Benchmarks**

Benchmarks for a filter configured with:

* **1,000,000 expected elements**
* **0.001 false-positive rate**
* **Atomic operations (single read/write per call)**

Measured on a standard SSD:

| Operation | Average Time |
| --------- | ------------ |
| Addition  | ~0.92 ms     |
| Lookup    | ~0.80 ms     |

For testing benchmarks on your device, run:

```bash
npm run demo
```

---

## **Installation**

Install via npm:

```bash
npm install que
```

---

## **Example Usage: Simple Authentication Check**

This example demonstrates how to use `que` as a fast, disk-backed membership engine to verify whether a user credential pair *may* exist—without hitting the database every time.

```js
const Que = require("que");

(async () => {
    // Create or load the filter
    const que = new Que({
        file: "./auth.que",
        expected: 1_000_000,
        fpr: 0.001,
        attributes: ["email", "password"], // different order results in different filters!!
        chunk: 8 * 1024 * 1024
    });

    await que.load();

    // Adding user credentials (e.g., after a successful signup)
    await que.add({
        email: "alice@example.com",
        password: "supersecret"
    });

    // Later, checking if a pair *may* exist
    //  p(maybe | item ∉ set) = fpr
    const maybe = await que.test({
        email: "alice@example.com",
        password: "supersecret"
    });

    if (maybe) {
        // Credentials may exist — verify with database.
        // ...
    } else {
        console.log("Credentials definitely do not exist.");
        // Return feedback to user immediatly!
        // ...
    }

    await que.close();
})();
```

---

## **API Reference**

### **Constructor**

```js
new Que(options)
```

#### **Options**

| Field              | Type       | Description                                                            |
| ------------------ | ---------- | ---------------------------------------------------------------------- |
| `file`             | `string`   | Path to the `.que` file for persistent storage.                        |
| `expected`         | `number`   | Estimated number of items to be stored. Used to size the bit-array.    |
| `fpr`              | `number`   | Target false-positive rate (e.g., `0.001`).                            |
| `attributes`       | `string[]` | Keys extracted from each payload for hashing.                          |
| `chunk`            | `number`   | Size in bytes for each memory-loaded chunk. Controls memory footprint. |

---

### **Methods**

#### **`await que.load()`**

Initializes the internal file structures, loads metadata, and prepares chunk management.
Must be called before any operation unless auto-loaded by the constructor.

---

#### **`await que.add(payload)`**

Adds an item to the filter.
All relevant bits are set across the necessary chunks.

Example:

```js
await que.add({ email: "john@example.com", password: "123" });
```

---

#### **`await que.test(payload)`**

Checks whether an item may exist.
Returns:

* `true` — the item may exist
* `false` — the item definitely does not exist

```js
const exists = await que.test({ email: "john@example.com", password: "123" });
```

---

#### **`await que.est_ce(payload)`**

Alias for `test()`.
Useful for stylistic or domain-specific naming.

 +It is Yoda spelling of the french `Est-ce que...` so why not

---

#### **`await que.save()`**

Forces a flush of all in-memory chunks to disk.

Usually unnecessary because writes are flushed automatically.

---

#### **`await que.close()`**

Finalizes writes, flushes buffers, and releases file descriptors.

---

### **Static Methods**

#### **`Que.calculate({ expected, fpr })`**

Computes the optimal number of bits and hash functions for the given settings.

Returns an object:

```js
{
    bits: <number>,
    k: <number>
}
```

Example:

```js
const { bits, k } = Que.calculate({ expected: 1_000_000, fpr: 0.001 });
```

---

## **Contribution**

If you’re interested in contributing, you are more than welcome to open a pull request.


Contributions of any kind (code, bug fixes, or documentation updates) are highly appreciated and will be reviewed carefully.

---

## **License**

Que is released under the [MIT License](LICENSE). You are free to use, modify, and distribute it in your projects.


Thank you for exploring!
