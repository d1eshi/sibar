export interface EarlyAccessLeadInput {
  email: string;
  xHandle?: string | null;
}

export interface EarlyAccessResult {
  ok: true;
}

export async function requestEarlyAccessLead(input: EarlyAccessLeadInput): Promise<EarlyAccessResult> {
  const response = await fetch("/api/early-access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      x_handle: input.xHandle || null,
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Could not join early access.");
  }

  return payload;
}
