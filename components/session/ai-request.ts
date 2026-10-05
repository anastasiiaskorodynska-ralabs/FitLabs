// POSTs to one of the /api AI routes; errors come back as a code for Session.ai.errors.
export async function postAi<T = unknown>(
  url: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; code: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, code: (data as { error?: string }).error ?? "failed" };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, code: "network" };
  }
}
