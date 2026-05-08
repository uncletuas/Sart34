import type { ConfigService } from "@nestjs/config";
import { AiService } from "./ai.service";

describe("AiService", () => {
  const service = new AiService(
    { aiGeneration: { create: jest.fn() } } as never,
    { assertMembership: jest.fn() } as never,
    { get: jest.fn((key: string, fallback?: string) => (key === "OPENAI_API_KEY" ? undefined : fallback)) } as unknown as ConfigService
  );

  it("flags risky ad claims for human review", () => {
    const review = service.scanPolicy({
      copy: "Guaranteed profit from this crypto investment with instant success."
    });

    expect(review.level).toBe("BLOCKED");
    expect(review.requiresHumanReview).toBe(true);
    expect(review.warnings.length).toBeGreaterThanOrEqual(3);
  });

  it("allows ordinary campaign copy", () => {
    const review = service.scanPolicy({
      copy: "Request inspection details for this property today."
    });

    expect(review.level).toBe("LOW");
    expect(review.requiresHumanReview).toBe(false);
  });
});
