import * as argon2 from "argon2";

// argon2id with conservative defaults. Tuned for ~50-150ms per hash on a
// modern server - slow enough to frustrate brute force, fast enough for
// interactive logins. If hardware changes, revisit these.
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

export const passwordService = {
  async hash(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    return argon2.hash(password, OPTIONS);
  },

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // argon2.verify throws on malformed hashes; treat as invalid credentials
      return false;
    }
  },
};
