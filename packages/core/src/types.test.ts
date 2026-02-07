import { describe, it, expect } from "vitest";
import {
  resolveDynamicValue,
  getByPath,
  setByPath,
  addByPath,
  removeByPath,
  applySpecStreamPatch,
  compileSpecStream,
  createSpecStreamCompiler,
} from "./types";

describe("getByPath", () => {
  it("gets nested values with JSON pointer paths", () => {
    const data = { user: { name: "John", scores: [10, 20, 30] } };

    expect(getByPath(data, "/user/name")).toBe("John");
    expect(getByPath(data, "/user/scores/0")).toBe(10);
    expect(getByPath(data, "/user/scores/1")).toBe(20);
  });

  it("returns root object for empty or root path", () => {
    const data = { value: 42 };

    expect(getByPath(data, "/")).toBe(data);
    expect(getByPath(data, "")).toBe(data);
  });

  it("returns undefined for missing paths", () => {
    const data = { user: { name: "John" } };

    expect(getByPath(data, "/user/missing")).toBeUndefined();
    expect(getByPath(data, "/nonexistent/path")).toBeUndefined();
  });

  it("handles paths without leading slash", () => {
    const data = { user: { name: "John" } };

    expect(getByPath(data, "user/name")).toBe("John");
  });

  it("returns undefined when traversing through non-object", () => {
    const data = { value: "string" };

    expect(getByPath(data, "/value/nested")).toBeUndefined();
  });

  it("handles null values in path", () => {
    const data = { user: null };

    expect(getByPath(data, "/user/name")).toBeUndefined();
  });
});

describe("setByPath", () => {
  it("sets value at existing path", () => {
    const data: Record<string, unknown> = { user: { name: "John" } };

    setByPath(data, "/user/name", "Alice");

    expect((data.user as Record<string, unknown>).name).toBe("Alice");
  });

  it("creates intermediate objects for deep paths", () => {
    const data: Record<string, unknown> = {};

    setByPath(data, "/a/b/c", "deep");

    expect(
      ((data.a as Record<string, unknown>).b as Record<string, unknown>).c,
    ).toBe("deep");
  });

  it("handles paths without leading slash", () => {
    const data: Record<string, unknown> = {};

    setByPath(data, "user/name", "John");

    expect((data.user as Record<string, unknown>).name).toBe("John");
  });

  it("overwrites existing values", () => {
    const data: Record<string, unknown> = { count: 5 };

    setByPath(data, "/count", 10);

    expect(data.count).toBe(10);
  });

  it("handles array-like paths", () => {
    const data: Record<string, unknown> = { items: {} };

    setByPath(data, "/items/0", "first");

    expect((data.items as Record<string, unknown>)["0"]).toBe("first");
  });
});

describe("resolveDynamicValue", () => {
  it("resolves literal string values", () => {
    expect(resolveDynamicValue("hello", {})).toBe("hello");
  });

  it("resolves literal number values", () => {
    expect(resolveDynamicValue(42, {})).toBe(42);
  });

  it("resolves literal boolean values", () => {
    expect(resolveDynamicValue(true, {})).toBe(true);
    expect(resolveDynamicValue(false, {})).toBe(false);
  });

  it("resolves path references", () => {
    const data = { user: { name: "Alice" } };

    expect(resolveDynamicValue({ path: "/user/name" }, data)).toBe("Alice");
  });

  it("returns undefined for missing path references", () => {
    const data = { user: { name: "Alice" } };

    expect(resolveDynamicValue({ path: "/missing" }, data)).toBeUndefined();
  });

  it("returns undefined for null value", () => {
    expect(resolveDynamicValue(null as unknown as string, {})).toBeUndefined();
  });

  it("returns undefined for undefined value", () => {
    expect(
      resolveDynamicValue(undefined as unknown as string, {}),
    ).toBeUndefined();
  });
});

// =============================================================================
// JSON Pointer (RFC 6901) escaping
// =============================================================================

describe("JSON Pointer escaping (RFC 6901)", () => {
  it("getByPath unescapes ~1 to /", () => {
    const data = { "a/b": { c: 42 } };
    expect(getByPath(data, "/a~1b/c")).toBe(42);
  });

  it("getByPath unescapes ~0 to ~", () => {
    const data = { "a~b": 99 };
    expect(getByPath(data, "/a~0b")).toBe(99);
  });

  it("getByPath handles combined ~0 and ~1 escaping", () => {
    const data = { "a~/b": "found" };
    expect(getByPath(data, "/a~0~1b")).toBe("found");
  });

  it("setByPath unescapes ~1 to / in keys", () => {
    const data: Record<string, unknown> = {};
    setByPath(data, "/a~1b", "value");
    expect(data["a/b"]).toBe("value");
  });

  it("setByPath unescapes ~0 to ~ in keys", () => {
    const data: Record<string, unknown> = {};
    setByPath(data, "/a~0b", "value");
    expect(data["a~b"]).toBe("value");
  });

  it("getByPath reads array elements properly", () => {
    const data = { items: [10, 20, 30] };
    expect(getByPath(data, "/items/0")).toBe(10);
    expect(getByPath(data, "/items/2")).toBe(30);
  });
});

// =============================================================================
// addByPath (RFC 6902 "add" semantics)
// =============================================================================

describe("addByPath", () => {
  it("adds a property to an object", () => {
    const data: Record<string, unknown> = { a: 1 };
    addByPath(data, "/b", 2);
    expect(data.b).toBe(2);
  });

  it("replaces an existing object property (add semantics)", () => {
    const data: Record<string, unknown> = { a: 1 };
    addByPath(data, "/a", 99);
    expect(data.a).toBe(99);
  });

  it("inserts into an array at a specific index", () => {
    const data: Record<string, unknown> = { arr: [1, 2, 3] };
    addByPath(data, "/arr/1", 99);
    expect(data.arr).toEqual([1, 99, 2, 3]);
  });

  it("appends to an array with - (end-of-array)", () => {
    const data: Record<string, unknown> = { arr: [1, 2] };
    addByPath(data, "/arr/-", 3);
    expect(data.arr).toEqual([1, 2, 3]);
  });

  it("inserts at index 0 of an array", () => {
    const data: Record<string, unknown> = { arr: ["b", "c"] };
    addByPath(data, "/arr/0", "a");
    expect(data.arr).toEqual(["a", "b", "c"]);
  });

  it("creates intermediate objects", () => {
    const data: Record<string, unknown> = {};
    addByPath(data, "/x/y/z", "deep");
    expect(
      ((data.x as Record<string, unknown>).y as Record<string, unknown>).z,
    ).toBe("deep");
  });
});

// =============================================================================
// removeByPath (RFC 6902 "remove" semantics)
// =============================================================================

describe("removeByPath", () => {
  it("deletes an object property", () => {
    const data: Record<string, unknown> = { a: 1, b: 2 };
    removeByPath(data, "/a");
    expect(data).toEqual({ b: 2 });
    expect("a" in data).toBe(false);
  });

  it("removes an element from an array by index", () => {
    const data: Record<string, unknown> = { arr: [1, 2, 3] };
    removeByPath(data, "/arr/1");
    expect(data.arr).toEqual([1, 3]);
  });

  it("removes nested properties", () => {
    const data: Record<string, unknown> = { user: { name: "John", age: 30 } };
    removeByPath(data, "/user/age");
    expect(data.user).toEqual({ name: "John" });
  });

  it("is a no-op for non-existent paths", () => {
    const data: Record<string, unknown> = { a: 1 };
    removeByPath(data, "/b/c/d");
    expect(data).toEqual({ a: 1 });
  });
});

// =============================================================================
// applySpecStreamPatch - RFC 6902 operations
// =============================================================================

describe("applySpecStreamPatch", () => {
  describe("add operation", () => {
    it("adds a new object property", () => {
      const obj: Record<string, unknown> = {};
      applySpecStreamPatch(obj, { op: "add", path: "/name", value: "Alice" });
      expect(obj.name).toBe("Alice");
    });

    it("adds nested properties creating intermediates", () => {
      const obj: Record<string, unknown> = {};
      applySpecStreamPatch(obj, {
        op: "add",
        path: "/user/name",
        value: "Bob",
      });
      expect((obj.user as Record<string, unknown>).name).toBe("Bob");
    });

    it("inserts into array at index", () => {
      const obj: Record<string, unknown> = { items: [1, 3] };
      applySpecStreamPatch(obj, { op: "add", path: "/items/1", value: 2 });
      expect(obj.items).toEqual([1, 2, 3]);
    });

    it("appends to array with -", () => {
      const obj: Record<string, unknown> = { items: [1, 2] };
      applySpecStreamPatch(obj, { op: "add", path: "/items/-", value: 3 });
      expect(obj.items).toEqual([1, 2, 3]);
    });
  });

  describe("remove operation", () => {
    it("removes an object property", () => {
      const obj: Record<string, unknown> = { name: "Alice", age: 30 };
      applySpecStreamPatch(obj, { op: "remove", path: "/age" });
      expect(obj).toEqual({ name: "Alice" });
      expect("age" in obj).toBe(false);
    });

    it("removes from array by index", () => {
      const obj: Record<string, unknown> = { items: ["a", "b", "c"] };
      applySpecStreamPatch(obj, { op: "remove", path: "/items/1" });
      expect(obj.items).toEqual(["a", "c"]);
    });
  });

  describe("replace operation", () => {
    it("replaces an existing value", () => {
      const obj: Record<string, unknown> = { name: "Alice" };
      applySpecStreamPatch(obj, {
        op: "replace",
        path: "/name",
        value: "Bob",
      });
      expect(obj.name).toBe("Bob");
    });

    it("replaces nested values", () => {
      const obj: Record<string, unknown> = { user: { name: "Alice" } };
      applySpecStreamPatch(obj, {
        op: "replace",
        path: "/user/name",
        value: "Bob",
      });
      expect((obj.user as Record<string, unknown>).name).toBe("Bob");
    });
  });

  describe("move operation", () => {
    it("moves a value from one path to another", () => {
      const obj: Record<string, unknown> = { a: 1, b: 2 };
      applySpecStreamPatch(obj, { op: "move", path: "/c", from: "/a" });
      expect(obj).toEqual({ b: 2, c: 1 });
      expect("a" in obj).toBe(false);
    });

    it("moves nested values", () => {
      const obj: Record<string, unknown> = {
        source: { val: 42 },
        target: {},
      };
      applySpecStreamPatch(obj, {
        op: "move",
        path: "/target/val",
        from: "/source/val",
      });
      expect((obj.target as Record<string, unknown>).val).toBe(42);
      expect("val" in (obj.source as Record<string, unknown>)).toBe(false);
    });

    it("is a no-op if from is missing", () => {
      const obj: Record<string, unknown> = { a: 1 };
      applySpecStreamPatch(obj, { op: "move", path: "/b" });
      expect(obj).toEqual({ a: 1 });
    });
  });

  describe("copy operation", () => {
    it("copies a value from one path to another", () => {
      const obj: Record<string, unknown> = { a: 1 };
      applySpecStreamPatch(obj, { op: "copy", path: "/b", from: "/a" });
      expect(obj).toEqual({ a: 1, b: 1 });
    });

    it("copies complex values", () => {
      const obj: Record<string, unknown> = {
        source: { nested: { value: 42 } },
      };
      applySpecStreamPatch(obj, {
        op: "copy",
        path: "/dest",
        from: "/source/nested",
      });
      expect(obj.dest).toEqual({ value: 42 });
      // Source should still exist
      expect((obj.source as Record<string, unknown>).nested).toEqual({
        value: 42,
      });
    });

    it("is a no-op if from is missing", () => {
      const obj: Record<string, unknown> = { a: 1 };
      applySpecStreamPatch(obj, { op: "copy", path: "/b" });
      expect(obj).toEqual({ a: 1 });
    });
  });

  describe("test operation", () => {
    it("succeeds when values match", () => {
      const obj: Record<string, unknown> = { name: "Alice" };
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/name",
          value: "Alice",
        }),
      ).not.toThrow();
    });

    it("succeeds for matching objects", () => {
      const obj: Record<string, unknown> = { user: { name: "Alice", age: 30 } };
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/user",
          value: { name: "Alice", age: 30 },
        }),
      ).not.toThrow();
    });

    it("succeeds for matching arrays", () => {
      const obj: Record<string, unknown> = { items: [1, 2, 3] };
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/items",
          value: [1, 2, 3],
        }),
      ).not.toThrow();
    });

    it("throws when values do not match", () => {
      const obj: Record<string, unknown> = { name: "Alice" };
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/name",
          value: "Bob",
        }),
      ).toThrow('Test operation failed: value at "/name" does not match');
    });

    it("throws when path does not exist", () => {
      const obj: Record<string, unknown> = {};
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/missing",
          value: "anything",
        }),
      ).toThrow();
    });
  });
});

// =============================================================================
// compileSpecStream
// =============================================================================

describe("compileSpecStream", () => {
  it("compiles a series of add patches", () => {
    const stream = `{"op":"add","path":"/name","value":"Alice"}
{"op":"add","path":"/age","value":30}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("handles remove operations", () => {
    const stream = `{"op":"add","path":"/a","value":1}
{"op":"add","path":"/b","value":2}
{"op":"remove","path":"/a"}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ b: 2 });
    expect("a" in result).toBe(false);
  });

  it("handles replace operations", () => {
    const stream = `{"op":"add","path":"/name","value":"Alice"}
{"op":"replace","path":"/name","value":"Bob"}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ name: "Bob" });
  });

  it("handles move operations", () => {
    const stream = `{"op":"add","path":"/old","value":"data"}
{"op":"move","path":"/new","from":"/old"}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ new: "data" });
  });

  it("handles copy operations", () => {
    const stream = `{"op":"add","path":"/original","value":"data"}
{"op":"copy","path":"/duplicate","from":"/original"}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ original: "data", duplicate: "data" });
  });

  it("skips empty lines", () => {
    const stream = `{"op":"add","path":"/a","value":1}

{"op":"add","path":"/b","value":2}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("uses initial value", () => {
    const stream = `{"op":"add","path":"/b","value":2}`;
    const result = compileSpecStream(stream, { a: 1 });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

// =============================================================================
// createSpecStreamCompiler
// =============================================================================

describe("createSpecStreamCompiler", () => {
  it("processes chunks incrementally", () => {
    const compiler = createSpecStreamCompiler();
    const { result, newPatches } = compiler.push(
      '{"op":"add","path":"/name","value":"Alice"}\n',
    );
    expect(newPatches).toHaveLength(1);
    expect(result).toEqual({ name: "Alice" });
  });

  it("handles partial lines across chunks", () => {
    const compiler = createSpecStreamCompiler();

    // First chunk is incomplete
    const r1 = compiler.push('{"op":"add","path":"/na');
    expect(r1.newPatches).toHaveLength(0);

    // Complete the line
    const r2 = compiler.push('me","value":"Alice"}\n');
    expect(r2.newPatches).toHaveLength(1);
    expect(r2.result).toEqual({ name: "Alice" });
  });

  it("processes remaining buffer on getResult", () => {
    const compiler = createSpecStreamCompiler();
    compiler.push('{"op":"add","path":"/name","value":"Alice"}');
    // No newline, so not processed yet
    const result = compiler.getResult();
    expect(result).toEqual({ name: "Alice" });
  });

  it("resets to clean state", () => {
    const compiler = createSpecStreamCompiler();
    compiler.push('{"op":"add","path":"/name","value":"Alice"}\n');
    compiler.reset();
    const result = compiler.getResult();
    expect(result).toEqual({});
  });

  it("tracks all applied patches", () => {
    const compiler = createSpecStreamCompiler();
    compiler.push('{"op":"add","path":"/a","value":1}\n');
    compiler.push('{"op":"add","path":"/b","value":2}\n');
    const patches = compiler.getPatches();
    expect(patches).toHaveLength(2);
    expect(patches[0]!.op).toBe("add");
    expect(patches[1]!.op).toBe("add");
  });

  it("handles all RFC 6902 operations", () => {
    const compiler = createSpecStreamCompiler();
    compiler.push('{"op":"add","path":"/x","value":1}\n');
    compiler.push('{"op":"add","path":"/y","value":2}\n');
    compiler.push('{"op":"move","path":"/z","from":"/x"}\n');
    compiler.push('{"op":"copy","path":"/w","from":"/y"}\n');
    compiler.push('{"op":"remove","path":"/y"}\n');
    const result = compiler.getResult();
    expect(result).toEqual({ z: 1, w: 2 });
  });
});
