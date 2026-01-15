class RateLimiter {
  private limits: Map<string, { count: number; lastReset: number }> = new Map();
  private WINDOW = 60000; // 1 minute
  private MAX_MESSAGES = 100; // Example limit

  check(ip: string): { allowed: boolean } {
    const now = Date.now();
    let entry = this.limits.get(ip);
    if (!entry || now - entry.lastReset > this.WINDOW) {
      entry = { count: 0, lastReset: now };
    }
    entry.count++;
    this.limits.set(ip, entry);
    return { allowed: entry.count <= this.MAX_MESSAGES };
  }
}
export const socketRateLimiter = new RateLimiter();