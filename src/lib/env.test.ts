import { describe, expect, it } from "vitest";
import { bacaEnv } from "@/lib/env";

describe("bacaEnv", () => {
  it("mengembalikan nilai saat kedua variabel terisi", () => {
    const env = bacaEnv({ DATABASE_URL: "postgresql://x", SESSION_SECRET: "rahasia" });
    expect(env.DATABASE_URL).toBe("postgresql://x");
    expect(env.SESSION_SECRET).toBe("rahasia");
  });

  it("gagal bila DATABASE_URL kosong", () => {
    expect(() => bacaEnv({ DATABASE_URL: "", SESSION_SECRET: "rahasia" })).toThrow(
      /DATABASE_URL tidak boleh kosong/,
    );
    expect(() => bacaEnv({ SESSION_SECRET: "rahasia" })).toThrow(/DATABASE_URL/);
  });

  it("gagal bila SESSION_SECRET kosong", () => {
    expect(() => bacaEnv({ DATABASE_URL: "postgresql://x" })).toThrow(/SESSION_SECRET/);
  });
});
